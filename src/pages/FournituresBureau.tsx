import { useEffect, useState } from 'react';
import { Plus, Search, Briefcase, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type FournitureBureau = Database['public']['Tables']['gestion_fourniture_bureau']['Row'];

export default function FournituresBureau() {
  const { isReadOnly, isItManager, currentSchoolId } = useAuth();
  const [fournitures, setFournitures] = useState<FournitureBureau[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState({
    article: '',
    beneficiaire: '',
    commentaire: '',
    quantite: 1,
  });

  useEffect(() => {
    loadFournitures();
  }, []);

  const loadFournitures = async () => {
    try {
      const { data, error } = await supabase
        .from('gestion_fourniture_bureau')
        .select('*')
        .order('date_operation', { ascending: false });

      if (error) throw error;
      setFournitures(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('gestion_fourniture_bureau').insert([{ ...formData, ecole_id: currentSchoolId }]);
      if (error) throw error;
      setShowModal(false);
      resetForm();
      loadFournitures();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      article: '',
      beneficiaire: '',
      commentaire: '',
      quantite: 1,
    });
  };

  const totalArticles = fournitures.reduce((acc, f) => acc + f.quantite, 0);

  const filteredFournitures = fournitures.filter((f) =>
    f.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.beneficiaire.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFournitures.length && filteredFournitures.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFournitures.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isItManager()) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${ids.length} distribution(s) de fournitures bureau.\n\nCette action est irréversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('gestion_fourniture_bureau')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setSelectedIds(new Set());
      loadFournitures();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression multiple: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournitures Bureau</h1>
          <p className="text-gray-600 mt-1">Gestion des fournitures de bureau</p>
        </div>
        {!isReadOnly() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Distribution
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Distributions</p>
              <p className="text-xl font-bold text-teal-600 mt-1">{fournitures.length}</p>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg">
              <Briefcase className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Articles Distribués</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{totalArticles}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Types d'Articles</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {new Set(fournitures.map(f => f.article)).size}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par article ou bénéficiaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isItManager() && selectedIds.size > 0 && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {selectedIds.size} distribution(s) sélectionnée(s)
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {bulkDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isItManager() && (
                  <th className="px-3 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={filteredFournitures.length > 0 && selectedIds.size === filteredFournitures.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      title="Tout sélectionner"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Article</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Bénéficiaire</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Quantité</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={isItManager() ? 6 : 5} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
              ) : filteredFournitures.length === 0 ? (
                <tr><td colSpan={isItManager() ? 6 : 5} className="px-6 py-8 text-center text-gray-500">Aucune distribution trouvée</td></tr>
              ) : (
                filteredFournitures.map((f) => (
                  <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(f.id) ? 'bg-red-50' : ''}`}>
                    {isItManager() && (
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(f.id)}
                          onChange={() => toggleSelectOne(f.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{f.article}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{f.beneficiaire}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-sm font-medium bg-teal-100 text-teal-700 rounded-full">
                        {f.quantite}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(f.date_operation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{f.commentaire || '-'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Distribution de Fournitures</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Article *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    placeholder="Ex: Stylos, Cahiers..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bénéficiaire *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.beneficiaire}
                    onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={3}
                    placeholder="Notes supplémentaires..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
