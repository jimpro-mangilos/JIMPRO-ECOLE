import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, CreditCard as Edit2, Trash2, Shield, Check, X, AlertCircle, Search, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role_id: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  role?: {
    id: string;
    nom: string;
    description: string;
  };
}

interface Role {
  id: string;
  nom: string;
  description: string;
}

export default function Admin() {
  const { isAdmin, isItManager, session, currentSchoolId } = useAuth();
  const canManageUsers = isAdmin() || isItManager();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    role_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            role:roles(id, nom, description)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('nom'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err: any) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageUsers) return;
    setError('');
    setSuccess('');

    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            nom: formData.nom,
            prenom: formData.prenom,
            role_id: formData.role_id,
            ecole_id: currentSchoolId,
          })
          .eq('id', editingProfile.id);

        if (error) throw error;
        setSuccess('Utilisateur mis à jour avec succès');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              nom: formData.nom,
              prenom: formData.prenom,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user && formData.role_id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role_id: formData.role_id, ecole_id: currentSchoolId })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }

        setSuccess('Utilisateur créé avec succès');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function toggleUserActive(profile: Profile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active, ecole_id: currentSchoolId })
        .eq('id', profile.id);

      if (error) throw error;

      await supabase.from('user_activity_logs').insert({
        user_id: profile.id,
        action: profile.is_active ? 'user_deactivated' : 'user_activated',
        details: {
          email: profile.email,
          nom: profile.nom,
          prenom: profile.prenom,
        },
      });

      setSuccess(`Utilisateur ${profile.is_active ? 'désactivé' : 'activé'} avec succès`);
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  async function callDeleteUser(id: string): Promise<string | null> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: id }),
    });
    if (response.ok) return null;
    let msg = `HTTP ${response.status}`;
    try {
      const result = await response.json();
      msg = result.error || result.message || msg;
    } catch { /* non-JSON body */ }
    return msg;
  }

  async function deleteUser(id: string) {
    if (!canManageUsers) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const errMsg = await callDeleteUser(id);
      if (errMsg) throw new Error(errMsg);
      setSuccess('Utilisateur supprimé avec succès');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  }

  async function handleBulkDelete() {
    if (!canManageUsers) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);

    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${ids.length} utilisateur(s).\n\nCette action est irréversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    setError('');
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const errMsg = await callDeleteUser(id);
        if (errMsg) errors.push(errMsg);
      } catch (err: any) {
        errors.push(err.message || 'Erreur inconnue');
      }
    }

    setBulkDeleting(false);
    setSelectedIds(new Set());

    if (errors.length > 0) {
      const unique = [...new Set(errors)];
      setError(`${errors.length} suppression(s) échouée(s) : ${unique.join(' / ')}`);
    } else {
      setSuccess(`${ids.length} utilisateur(s) supprimé(s) avec succès`);
    }
    loadData();
  }

  function changeUserRole(userId: string, newRoleId: string, userEmail: string) {
    if (!canManageUsers) return;
    supabase
      .from('profiles')
      .update({ role_id: newRoleId, ecole_id: currentSchoolId })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) { setError('Erreur lors du changement de rôle'); return; }
        const newRole = roles.find(r => r.id === newRoleId);
        supabase.from('user_activity_logs').insert({
          user_id: userId,
          action: 'role_changed',
          details: { email: userEmail, new_role: newRole?.nom },
        });
        setSuccess('Rôle modifié avec succès');
        loadData();
      });
  }

  function resetForm() {
    setFormData({ email: '', nom: '', prenom: '', password: '', role_id: '' });
    setEditingProfile(null);
  }

  function openEditModal(profile: Profile) {
    setEditingProfile(profile);
    setFormData({
      email: profile.email,
      nom: profile.nom,
      prenom: profile.prenom,
      password: '',
      role_id: profile.role_id || '',
    });
    setShowModal(true);
  }

  function toggleSelectOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProfiles.length && filteredProfiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfiles.map(p => p.id)));
    }
  }

  const filteredProfiles = profiles.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Administration
          </h1>
          <p className="text-gray-600 mt-1">Gestion des utilisateurs et des rôles</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvel utilisateur
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
      </div>

      {canManageUsers && filteredProfiles.length > 0 && (
        <div className={`mb-3 px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
          selectedIds.size > 0 ? 'bg-red-50 border border-red-200' : 'bg-white shadow-sm border border-gray-100'
        }`}>
          <label className="flex items-center gap-3 cursor-pointer select-none text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={filteredProfiles.length > 0 && selectedIds.size === filteredProfiles.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            {selectedIds.size > 0
              ? `${selectedIds.size} utilisateur(s) sélectionné(s)`
              : 'Tout sélectionner'}
          </label>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {bulkDeleting ? 'Suppression...' : `Supprimer la sélection (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${
              selectedIds.has(profile.id) ? 'ring-2 ring-red-400 bg-red-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {canManageUsers && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(profile.id)}
                    onChange={() => toggleSelectOne(profile.id)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-1 flex-shrink-0"
                  />
                )}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                  {profile.nom.charAt(0)}{profile.prenom.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {profile.nom} {profile.prenom}
                  </h3>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Rôle</label>
                <select
                  value={profile.role_id || ''}
                  onChange={(e) => changeUserRole(profile.id, e.target.value, profile.email)}
                  disabled={!canManageUsers}
                  className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    profile.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profile.is_active ? 'Actif' : 'Inactif'}
                </span>
                <div className="flex items-center gap-2">
                  {canManageUsers && (
                    <button
                      onClick={() => toggleUserActive(profile)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        profile.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {profile.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                  {canManageUsers && (
                    <button
                      onClick={() => openEditModal(profile)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canManageUsers && (
                    <button
                      onClick={() => deleteUser(profile.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {profile.last_login && (
                <p className="text-xs text-gray-500 pt-2">
                  Dernière connexion: {new Date(profile.last_login).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white rounded-t-xl">
              <h2 className="text-xl font-bold">
                {editingProfile ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {!editingProfile && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!editingProfile}
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nom} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingProfile ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
