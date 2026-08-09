import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User as UserIcon,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  School,
  Building2,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLogo } from '../contexts/LogoContext';
import { useMenuConfig } from '../lib/hooks/useMenuConfig';
import { MENU_ICON_MAP, MENU_PATH_MAP } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { BROADCAST_CONVERSATION_ID } from '../lib/hooks/useChat';
import { useActiveSchool, useSchoolsList } from '../lib/hooks/useActiveSchool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isItManager, isRevoque, currentSchoolCode } = useAuth();
  const { logoUrl } = useLogo();
  const { menuItems: menuConfig, loading: menuLoading } = useMenuConfig(profile?.role_id);
  const { canSwitchSchool, switchSchool, resetToHomeSchool } = useActiveSchool();
  const { activeId, activeCode } = useSchoolsList();
  const [schoolSwitcherOpen, setSchoolSwitcherOpen] = useState(false);
  const [schools, setSchools] = useState<{ id: string; nom: string; code: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [showNewSchoolForm, setShowNewSchoolForm] = useState(false);
  const [newSchoolSaving, setNewSchoolSaving] = useState(false);
  const [newSchool, setNewSchool] = useState({ nom: '', code: '', adresse: '', telephone: '', email: '' });
  const [newSchoolError, setNewSchoolError] = useState('');

  useEffect(() => {
    if (!user || isRevoque()) return;

    async function loadUnread() {
      const { data: participantRows } = await db
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);
      const convIds = [BROADCAST_CONVERSATION_ID, ...(participantRows ?? []).map((p: { conversation_id: string }) => p.conversation_id)];

      const { data: msgs } = await db
        .from('chat_messages')
        .select('id')
        .in('conversation_id', convIds)
        .neq('sender_id', user!.id);

      if (!msgs || msgs.length === 0) { setChatUnread(0); return; }

      const { data: reads } = await db
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user!.id);

      const readIds = new Set((reads ?? []).map((r: { message_id: string }) => r.message_id));
      const unread = msgs.filter((m: { id: string }) => !readIds.has(m.id)).length;
      setChatUnread(unread);
    }

    loadUnread();

    const channel = supabase
      .channel('layout:chat-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, loadUnread)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_reads' }, loadUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Charger la liste des écoles pour le sélecteur admin
  useEffect(() => {
    if (!canSwitchSchool) return;
    async function loadSchools() {
      setSchoolsLoading(true);
      const { data } = await db.from('ecoles').select('id, nom, code').eq('is_active', true).order('nom');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSchools((data as any[]) || []);
      setSchoolsLoading(false);
    }
    loadSchools();
  }, [canSwitchSchool]);

  const activeSchoolName = schools.find(s => s.id === activeId)?.nom ?? 'C.S_GOLDEN_ACADEMY';
  const displaySchoolCode = activeCode ?? currentSchoolCode ?? 'CSGA';

  async function handleCreateSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSchool.nom.trim() || !newSchool.code.trim()) {
      setNewSchoolError('Nom et code requis');
      return;
    }
    setNewSchoolSaving(true);
    setNewSchoolError('');
    try {
      const { error } = await db.from('ecoles').insert({
        nom: newSchool.nom.trim(),
        code: newSchool.code.trim().toUpperCase(),
        adresse: newSchool.adresse.trim() || null,
        telephone: newSchool.telephone.trim() || null,
        email: newSchool.email.trim() || null,
      });
      if (error) {
        if (error.code === '23505') setNewSchoolError('Ce code existe déjà');
        else setNewSchoolError(error.message);
        setNewSchoolSaving(false);
        return;
      }
      // Rafraîchir la liste
      const { data } = await db.from('ecoles').select('id, nom, code').eq('is_active', true).order('nom');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSchools((data as any[]) || []);
      setNewSchool({ nom: '', code: '', adresse: '', telephone: '', email: '' });
      setShowNewSchoolForm(false);
    } catch (err: any) {
      setNewSchoolError(err.message || 'Erreur');
    } finally {
      setNewSchoolSaving(false);
    }
  }

  const visibleMenuItems = menuConfig
    .filter((item) => {
      if (isRevoque()) return false;
      if (isItManager()) return true;
      return item.is_visible;
    })
    .map((item) => ({
      key: item.menu_key,
      path: MENU_PATH_MAP[item.menu_key] || '/',
      icon: MENU_ICON_MAP[item.menu_key] || LayoutDashboard,
      label: item.label,
    }));

  const isActive = (path: string) => location.pathname === path;

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gradient-to-b from-blue-900 to-blue-800 w-64 shadow-xl`}
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 px-3 pt-2">
            <img
              src={logoUrl}
              alt="JIMPRO"
              className="w-48 object-contain drop-shadow-lg"
            />
          </div>

          {/* Navigation */}
          <ul className="space-y-2">
            {menuLoading ? (
              <li className="px-3 py-3 text-blue-200 text-sm animate-pulse">Chargement...</li>
            ) : (
              visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isChat = item.key === 'chat';
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                        isActive(item.path)
                          ? 'bg-white text-blue-900 shadow-md'
                          : 'text-blue-100 hover:bg-blue-700/50'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" />
                        {isChat && chatUnread > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
                            {chatUnread > 9 ? '9+' : chatUnread}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {isChat && chatUnread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                          {chatUnread > 99 ? '99+' : chatUnread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all overflow-x-hidden ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>

              {/* École active */}
              <div className="relative">
                {canSwitchSchool ? (
                  <button
                    onClick={() => {
                      setSchoolSwitcherOpen(!schoolSwitcherOpen);
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    <School className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700 max-w-[180px] truncate">
                      {activeSchoolName}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 transition-transform ${schoolSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      {displaySchoolCode}
                    </span>
                  </div>
                )}

                {/* Dropdown sélecteur d'école */}
                {canSwitchSchool && schoolSwitcherOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Établissements</p>
                    </div>
                    {schoolsLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-400 animate-pulse">Chargement...</div>
                    ) : schools.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Aucune école</div>
                    ) : (
                      schools.map((s) => {
                        const isActive = s.id === activeId;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              switchSchool(s.id);
                              setSchoolSwitcherOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                              isActive ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <Building2 className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                                {s.nom}
                              </p>
                              <p className="text-xs text-gray-400">{s.code}</p>
                            </div>
                            {isActive && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                    {/* Option : revenir à l'école d'origine */}
                    {activeId && (
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            resetToHomeSchool();
                            setSchoolSwitcherOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm text-gray-500"
                        >
                          <School className="w-4 h-4" />
                          Réinitialiser à mon école
                        </button>
                      </div>
                    )}
                    {/* Bouton : Nouvelle école */}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      {showNewSchoolForm ? (
                        <form onSubmit={handleCreateSchool} className="px-4 py-2 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nouvel établissement</p>
                          <input
                            type="text" placeholder="Nom *" value={newSchool.nom}
                            onChange={e => setNewSchool(p => ({ ...p, nom: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                            autoFocus
                          />
                          <input
                            type="text" placeholder="Code * (ex: CSJ)" value={newSchool.code}
                            onChange={e => setNewSchool(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                            maxLength={10}
                          />
                          <input
                            type="text" placeholder="Adresse" value={newSchool.adresse}
                            onChange={e => setNewSchool(p => ({ ...p, adresse: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text" placeholder="Téléphone" value={newSchool.telephone}
                              onChange={e => setNewSchool(p => ({ ...p, telephone: e.target.value }))}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                            />
                            <input
                              type="email" placeholder="Email" value={newSchool.email}
                              onChange={e => setNewSchool(p => ({ ...p, email: e.target.value }))}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                            />
                          </div>
                          {newSchoolError && <p className="text-xs text-red-500">{newSchoolError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={newSchoolSaving}
                              className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white text-sm rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {newSchoolSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Créer
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowNewSchoolForm(false); setNewSchool({ nom: '', code: '', adresse: '', telephone: '', email: '' }); setNewSchoolError(''); }}
                              className="text-sm text-gray-500 px-2 py-1.5 hover:text-gray-700 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setShowNewSchoolForm(true); setNewSchoolError(''); }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 transition-colors text-left text-sm text-indigo-600"
                        >
                          <Plus className="w-4 h-4" />
                          Nouvel établissement
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setSchoolSwitcherOpen(false);
                }}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.nom} {profile?.prenom}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.role?.nom || 'Utilisateur'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {profile?.nom.charAt(0)}{profile?.prenom.charAt(0)}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <UserIcon className="w-4 h-4" />
                    Mon Profil
                  </Link>
                  <div className="border-t my-2"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Deconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
