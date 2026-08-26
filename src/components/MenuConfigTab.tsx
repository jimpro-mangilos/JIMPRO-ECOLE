import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Wallet,
  Package,
  Briefcase,
  Archive,
  FileText,
  BarChart3,
  Settings,
  Shield,
  MessageCircle,
  UserCog,
  UserCheck,
  BookOpen,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  AlertCircle,
  Check,
} from 'lucide-react';

interface Role {
  id: string;
  nom: string;
  description: string;
}

interface MenuVisibilityItem {
  id: string;
  role_id: string;
  menu_key: string;
  label: string;
  is_visible: boolean;
  ordre: number;
}

const MENU_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'eleves': Users,
  'paiements': DollarSign,
  'finances': Wallet,
  'fournitures-eleves': Package,
  'fournitures-bureau': Briefcase,
  'stock-uniformes': Archive,
  'rapports': FileText,
  'tableau-bord-comptable': BarChart3,
  'configuration': Settings,
  'admin': Shield,
  'chat': MessageCircle,
  'personnel': UserCog,
  'pointage': UserCheck,
  'recouvrement': Wallet,
  'portail-professeur': BookOpen,
  'gestion-cours': BookOpen,
  'gestion-devoirs': FileText,
};

const DEFAULT_MENU_ITEMS = [
  { menu_key: 'dashboard', label: 'Tableau de Bord', ordre: 1 },
  { menu_key: 'eleves', label: 'Eleves', ordre: 2 },
  { menu_key: 'paiements', label: 'Paiements', ordre: 3 },
  { menu_key: 'finances', label: 'Finances', ordre: 4 },
  { menu_key: 'fournitures-eleves', label: 'Fournitures Eleves', ordre: 5 },
  { menu_key: 'fournitures-bureau', label: 'Fournitures Bureau', ordre: 6 },
  { menu_key: 'stock-uniformes', label: 'Stock Uniformes', ordre: 7 },
  { menu_key: 'rapports', label: 'Rapports', ordre: 8 },
  { menu_key: 'tableau-bord-comptable', label: 'TB Comptable', ordre: 9 },
  { menu_key: 'configuration', label: 'Configuration', ordre: 10 },
  { menu_key: 'admin', label: 'Administration', ordre: 11 },
  { menu_key: 'chat', label: 'Messages', ordre: 12 },
  { menu_key: 'personnel', label: 'Personnel', ordre: 13 },
  { menu_key: 'pointage', label: 'Pointage', ordre: 14 },
  { menu_key: 'recouvrement', label: 'Recouvrement', ordre: 15 },
  { menu_key: 'portail-professeur', label: 'Portail Professeur', ordre: 16 },
  { menu_key: 'gestion-cours', label: 'Gestion Cours', ordre: 17 },
  { menu_key: 'gestion-devoirs', label: 'Gestion Devoirs', ordre: 18 },
];

export default function MenuConfigTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuVisibilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadMenuConfig(selectedRoleId);
    }
  }, [selectedRoleId]);

  async function loadRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('id, nom, description')
      .order('nom');

    if (!error && data) {
      const configurableRoles = data.filter(
        (r: any) => r.nom !== 'revoque' && r.nom !== 'it_manager'
      );
      setRoles(configurableRoles);
      if (configurableRoles.length > 0) {
        setSelectedRoleId(configurableRoles[0].id);
      }
    }
    setLoading(false);
  }

  async function loadMenuConfig(roleId: string) {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('menu_visibility')
      .select('*')
      .eq('role_id', roleId)
      .order('ordre', { ascending: true });

    if (!err && data && data.length > 0) {
      setMenuItems(data);
    } else {
      setMenuItems([]);
    }
    setHasChanges(false);
    setLoading(false);
  }

  function toggleVisibility(index: number) {
    setMenuItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_visible: !updated[index].is_visible };
      return updated;
    });
    setHasChanges(true);
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= menuItems.length) return;
    setMenuItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((item, i) => ({ ...item, ordre: i + 1 }));
    });
    setHasChanges(true);
  }

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      moveItem(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, menuItems]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i];
        const { error: updateError } = await supabase
          .from('menu_visibility')
          .update({ is_visible: item.is_visible, ordre: i + 1 })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }
      setSuccess('Configuration du menu sauvegardee avec succes');
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reinitialiser la configuration du menu pour ce role aux valeurs par defaut ?')) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (const defaultItem of DEFAULT_MENU_ITEMS) {
        const existing = menuItems.find((m) => m.menu_key === defaultItem.menu_key);
        if (existing) {
          await supabase
            .from('menu_visibility')
            .update({
              is_visible: true,
              ordre: defaultItem.ordre,
              label: defaultItem.label,
            })
            .eq('id', existing.id);
        }
      }
      setSuccess('Configuration reinitialise aux valeurs par defaut');
      await loadMenuConfig(selectedRoleId);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la reinitialisation');
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Role selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selectionner un role a configurer
        </label>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedRoleId === role.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role.nom.charAt(0).toUpperCase() + role.nom.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
        {selectedRole && (
          <p className="mt-2 text-sm text-gray-500">{selectedRole.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Menu items list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Elements du menu</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reinitialiser
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Aucune configuration trouvee pour ce role.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {menuItems.map((item, index) => {
                  const Icon = MENU_ICON_MAP[item.menu_key] || LayoutDashboard;
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <li
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 px-4 py-2 transition-all ${
                        isDragging ? 'opacity-50 bg-blue-50' : ''
                      } ${isDragOver ? 'border-t-2 border-blue-500' : ''} ${
                        !item.is_visible ? 'bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        item.is_visible
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <span className={`flex-1 font-medium ${
                        item.is_visible ? 'text-gray-900' : 'text-gray-400 line-through'
                      }`}>
                        {item.label}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveItem(index, index - 1)}
                          disabled={index === 0}
                          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Monter"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItem(index, index + 1)}
                          disabled={index === menuItems.length - 1}
                          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Descendre"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => toggleVisibility(index)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_visible
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title={item.is_visible ? 'Masquer' : 'Afficher'}
                      >
                        {item.is_visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Preview sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Apercu du menu
                </h4>
                {selectedRole && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Role : {selectedRole.nom.charAt(0).toUpperCase() + selectedRole.nom.slice(1).replace('_', ' ')}
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-b from-blue-900 to-blue-800 p-3 min-h-[300px]">
                <ul className="space-y-1">
                  {menuItems
                    .filter((item) => item.is_visible)
                    .map((item, idx) => {
                      const Icon = MENU_ICON_MAP[item.menu_key] || LayoutDashboard;
                      return (
                        <li
                          key={item.id}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-all ${
                            idx === 0
                              ? 'bg-white text-blue-900 shadow-sm'
                              : 'text-blue-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium truncate">{item.label}</span>
                        </li>
                      );
                    })}
                  {menuItems.filter((item) => item.is_visible).length === 0 && (
                    <li className="text-blue-200 text-sm text-center py-8 opacity-60">
                      Aucun menu visible
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info box for non-configurable roles */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note :</strong> Les roles "IT Manager" et "Revoque" ne sont pas configurables.
          L'IT Manager voit toujours tous les menus. Le role Revoque n'a acces a aucun menu.
        </p>
      </div>
    </div>
  );
}