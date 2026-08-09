import { useState, useEffect } from 'react';
import { Archive, Plus, CreditCard as Edit2, Trash2, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Package, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TypeUniforme {
  id: string;
  libelle: string;
  is_active: boolean;
}

interface AnneeScolaire {
  id: string;
  annee: string;
  is_active: boolean;
}

interface Section {
  id: string;
  nom: string;
  is_active: boolean;
}

interface StockUniforme {
  id: string;
  type_uniforme_id: string;
  type_uniforme_libelle: string;
  annee_scolaire: string;
  section: string;
  quantite_stock: number;
  seuil_alerte: number | null;
  notes: string | null;
  nom_comptable: string;
  updated_at: string;
}

type FormMode = 'approvisionner' | 'corriger' | null;

interface StockForm {
  type_uniforme_id: string;
  annee_scolaire: string;
  section: string;
  quantite: string;
  seuil_alerte: string;
  notes: string;
}

function StockUniforms() {
  const { user, userProfile, isAdmin, canManageConfiguration, profile, isItManager, currentSchoolId } = useAuth();
  const canWrite = isAdmin() || profile?.role?.nom === 'secretaire';

  const [stocks, setStocks] = useState<StockUniforme[]>([]);
  const [typesUniforme, setTypesUniforme] = useState<TypeUniforme[]>([]);
  const [anneeScolaires, setAnneeScolaires] = useState<AnneeScolaire[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterArticle, setFilterArticle] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingStock, setEditingStock] = useState<StockUniforme | null>(null);
  const [formData, setFormData] = useState<StockForm>({
    type_uniforme_id: '',
    annee_scolaire: '',
    section: '',
    quantite: '',
    seuil_alerte: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [stocksRes, typesRes, anneesRes, sectionsRes] = await Promise.all([
        supabase
          .from('stock_uniformes')
          .select('*')
          .order('annee_scolaire', { ascending: false })
          .order('section')
          .order('type_uniforme_libelle'),
        supabase.from('types_uniforme').select('id, libelle, is_active').eq('is_active', true).order('ordre'),
        supabase.from('annees_scolaires').select('id, annee, is_active').eq('is_active', true).order('annee', { ascending: false }),
        supabase.from('sections').select('id, nom, is_active').eq('is_active', true).order('ordre'),
      ]);

      if (stocksRes.error) throw stocksRes.error;
      setStocks(stocksRes.data || []);
      setTypesUniforme(typesRes.data || []);
      setAnneeScolaires(anneesRes.data || []);
      setSections(sectionsRes.data || []);
    } catch (err) {
      console.error('Erreur chargement stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const openApprovisionner = () => {
    setEditingStock(null);
    setFormMode('approvisionner');
    setFormData({ type_uniforme_id: '', annee_scolaire: '', section: '', quantite: '', seuil_alerte: '', notes: '' });
    setFormError('');
    setFormSuccess('');
  };

  const openCorrection = (stock: StockUniforme) => {
    setEditingStock(stock);
    setFormMode('corriger');
    setFormData({
      type_uniforme_id: stock.type_uniforme_id,
      annee_scolaire: stock.annee_scolaire,
      section: stock.section || '',
      quantite: String(stock.quantite_stock),
      seuil_alerte: stock.seuil_alerte != null ? String(stock.seuil_alerte) : '',
      notes: stock.notes || '',
    });
    setFormError('');
    setFormSuccess('');
  };

  const cancelForm = () => {
    setFormMode(null);
    setEditingStock(null);
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const quantite = parseInt(formData.quantite);
    if (isNaN(quantite) || quantite < 0) {
      setFormError('La quantité doit être un nombre entier positif ou nul.');
      return;
    }

    const nomComptable = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

    try {
      setSubmitting(true);

      if (formMode === 'corriger' && editingStock) {
        // Correction directe: update absolute value
        const { error } = await supabase
          .from('stock_uniformes')
          .update({
            quantite_stock: quantite,
            seuil_alerte: formData.seuil_alerte ? parseInt(formData.seuil_alerte) : null,
            notes: formData.notes || null,
            nom_comptable: nomComptable,
            comptable_id: user?.id,
            updated_at: new Date().toISOString(),
            ecole_id: currentSchoolId,
          })
          .eq('id', editingStock.id);

        if (error) throw error;
        setFormSuccess('Stock corrigé avec succès.');
      } else {
        // Approvisionnement: upsert — ajoute au stock existant ou crée
        if (!formData.type_uniforme_id || !formData.annee_scolaire || !formData.section) {
          setFormError('Veuillez sélectionner un article, une année scolaire et une section.');
          return;
        }

        const typeUniforme = typesUniforme.find(t => t.id === formData.type_uniforme_id);
        const existingStock = stocks.find(
          s => s.type_uniforme_id === formData.type_uniforme_id
            && s.annee_scolaire === formData.annee_scolaire
            && (s.section || '') === formData.section
        );

        if (existingStock) {
          // Ajouter au stock existant
          const { error } = await supabase
            .from('stock_uniformes')
            .update({
              quantite_stock: existingStock.quantite_stock + quantite,
              seuil_alerte: formData.seuil_alerte ? parseInt(formData.seuil_alerte) : existingStock.seuil_alerte,
              notes: formData.notes || existingStock.notes,
              nom_comptable: nomComptable,
              comptable_id: user?.id,
              updated_at: new Date().toISOString(),
              ecole_id: currentSchoolId,
            })
            .eq('id', existingStock.id);

          if (error) throw error;
          setFormSuccess(`Stock approvisionné pour ${formData.section} : +${quantite} article(s) ajouté(s). Nouveau total : ${existingStock.quantite_stock + quantite}`);
        } else {
          // Créer un nouvel enregistrement de stock
          const { error } = await supabase
            .from('stock_uniformes')
            .insert({
              type_uniforme_id: formData.type_uniforme_id,
              type_uniforme_libelle: typeUniforme?.libelle || '',
              annee_scolaire: formData.annee_scolaire,
              section: formData.section,
              quantite_stock: quantite,
              seuil_alerte: formData.seuil_alerte ? parseInt(formData.seuil_alerte) : null,
              notes: formData.notes || null,
              nom_comptable: nomComptable,
              comptable_id: user?.id,
              ecole_id: currentSchoolId,
            });

          if (error) throw error;
          setFormSuccess(`Stock créé avec ${quantite} article(s) pour ${formData.section} — ${formData.annee_scolaire}.`);
        }
      }

      await loadAll();
      cancelForm();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stock: StockUniforme) => {
    if (!confirm(`Supprimer l'enregistrement de stock pour "${stock.type_uniforme_libelle}" (${stock.annee_scolaire}) ?`)) return;
    try {
      const { error } = await supabase.from('stock_uniformes').delete().eq('id', stock.id);
      if (error) throw error;
      await loadAll();
    } catch (err: any) {
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStocks.length && filteredStocks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStocks.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isItManager()) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${ids.length} enregistrement(s) de stock.\n\nCette action est irréversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('stock_uniformes')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setSelectedIds(new Set());
      await loadAll();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression multiple: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Filter logic
  const filteredStocks = stocks.filter(s => {
    const matchesAnnee = !filterAnnee || s.annee_scolaire === filterAnnee;
    const matchesArticle = !filterArticle || s.type_uniforme_id === filterArticle;
    const matchesSection = !filterSection || (s.section || '') === filterSection;
    const matchesSearch = !searchTerm ||
      s.type_uniforme_libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.annee_scolaire.includes(searchTerm) ||
      (s.section || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAnnee && matchesArticle && matchesSection && matchesSearch;
  });

  // Stats
  const totalArticles = filteredStocks.reduce((sum, s) => sum + s.quantite_stock, 0);
  const ruptures = filteredStocks.filter(s => s.quantite_stock === 0).length;
  const alertes = filteredStocks.filter(
    s => s.seuil_alerte != null && s.quantite_stock > 0 && s.quantite_stock <= s.seuil_alerte
  ).length;

  const getStockBadge = (stock: StockUniforme) => {
    if (stock.quantite_stock === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <XCircle className="w-3.5 h-3.5" />
          Rupture
        </span>
      );
    }
    if (stock.seuil_alerte != null && stock.quantite_stock <= stock.seuil_alerte) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          Stock faible
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3.5 h-3.5" />
        Disponible
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Unique années from existing stocks + active ones for the filter
  const allAnnees = Array.from(new Set([
    ...anneeScolaires.map(a => a.annee),
    ...stocks.map(s => s.annee_scolaire),
  ])).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Archive className="w-8 h-8 text-teal-600" />
            Stock des Uniformes
          </h1>
          <p className="text-gray-500 mt-1">Gérer les quantités disponibles par article, année scolaire et section</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {canWrite && (
            <button
              onClick={openApprovisionner}
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-5 h-5" />
              Approvisionner
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-teal-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Articles en stock</p>
              <p className="text-xl font-bold text-gray-900">{totalArticles}</p>
              <p className="text-xs text-gray-400">{filteredStocks.length} références</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Alertes stock faible</p>
              <p className="text-xl font-bold text-orange-600">{alertes}</p>
              <p className="text-xs text-gray-400">en dessous du seuil</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ruptures de stock</p>
              <p className="text-xl font-bold text-red-600">{ruptures}</p>
              <p className="text-xs text-gray-400">distribution bloquée</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      {formMode && (
        <div className="bg-white rounded-lg shadow-md border border-teal-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-teal-100 p-2 rounded-lg">
              {formMode === 'approvisionner' ? (
                <TrendingUp className="w-5 h-5 text-teal-600" />
              ) : (
                <Edit2 className="w-5 h-5 text-teal-600" />
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              {formMode === 'approvisionner' ? 'Approvisionner le stock' : `Corriger le stock — ${editingStock?.type_uniforme_libelle} (${editingStock?.section || '—'} / ${editingStock?.annee_scolaire})`}
            </h2>
          </div>

          {formError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formMode === 'approvisionner' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Article *</label>
                  <select
                    value={formData.type_uniforme_id}
                    onChange={(e) => setFormData({ ...formData, type_uniforme_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    required
                  >
                    <option value="">Sélectionner un article</option>
                    {typesUniforme.map(t => (
                      <option key={t.id} value={t.id}>{t.libelle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Section *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    required
                  >
                    <option value="">Sélectionner une section</option>
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.nom}>{sec.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Année scolaire *</label>
                  <input
                    type="text"
                    value={formData.annee_scolaire}
                    onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ex: 2025-2026"
                    list="annees-stock-list"
                    required
                  />
                  <datalist id="annees-stock-list">
                    {anneeScolaires.map(a => <option key={a.id} value={a.annee} />)}
                  </datalist>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {formMode === 'approvisionner' ? 'Quantité à ajouter *' : 'Nouvelle quantité en stock *'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: 50"
                required
              />
              {formMode === 'corriger' && (
                <p className="text-xs text-gray-500 mt-1">
                  Stock actuel: <span className="font-semibold text-gray-700">{editingStock?.quantite_stock}</span> — saisissez la valeur réelle corrigée
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Seuil d'alerte (optionnel)</label>
              <input
                type="number"
                min="0"
                value={formData.seuil_alerte}
                onChange={(e) => setFormData({ ...formData, seuil_alerte: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: 5"
              />
              <p className="text-xs text-gray-500 mt-1">Alerte affichée quand le stock atteint ce niveau</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: Livraison fournisseur X, correction inventaire..."
              />
            </div>

            <div className="md:col-span-2 flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : formMode === 'approvisionner' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Edit2 className="w-4 h-4" />
                )}
                {submitting ? 'Enregistrement...' : formMode === 'approvisionner' ? 'Approvisionner' : 'Corriger'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-700"
            />
          </div>
          <select
            value={filterAnnee}
            onChange={(e) => setFilterAnnee(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            <option value="">Toutes les années</option>
            {allAnnees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            <option value="">Toutes les sections</option>
            {sections.map(sec => (
              <option key={sec.id} value={sec.nom}>{sec.nom}</option>
            ))}
          </select>
          <select
            value={filterArticle}
            onChange={(e) => setFilterArticle(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            <option value="">Tous les articles</option>
            {typesUniforme.map(t => (
              <option key={t.id} value={t.id}>{t.libelle}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        {isItManager() && selectedIds.size > 0 && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {selectedIds.size} enregistrement(s) sélectionné(s)
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
        {loading ? (
          <div className="py-16 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-500" />
            Chargement du stock...
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Archive className="w-10 h-10 mx-auto mb-2 opacity-20 text-teal-600" />
            <p className="font-medium">Aucun stock configuré</p>
            {canWrite && (
              <p className="text-sm text-gray-400 mt-1">
                Cliquez sur "Approvisionner" pour ajouter du stock à un article
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isItManager() && (
                    <th className="px-3 py-3.5 text-left">
                      <input
                        type="checkbox"
                        checked={filteredStocks.length > 0 && selectedIds.size === filteredStocks.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        title="Tout sélectionner"
                      />
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Article</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Section</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Année Scolaire</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Statut</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Seuil</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Dernière MAJ</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Par</th>
                  {canWrite && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStocks.map((stock) => (
                  <tr
                    key={stock.id}
                    className={`transition-colors hover:bg-gray-50 ${
                      selectedIds.has(stock.id) ? 'bg-red-50' :
                      stock.quantite_stock === 0 ? 'bg-red-50/40' :
                      stock.seuil_alerte != null && stock.quantite_stock <= stock.seuil_alerte ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    {isItManager() && (
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(stock.id)}
                          onChange={() => toggleSelectOne(stock.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-teal-100 p-1.5 rounded-md">
                          <Package className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <span className="font-medium text-gray-900">{stock.type_uniforme_libelle}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {stock.section ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {stock.section}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{stock.annee_scolaire}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xl font-bold ${
                        stock.quantite_stock === 0 ? 'text-red-600' :
                        stock.seuil_alerte != null && stock.quantite_stock <= stock.seuil_alerte ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {stock.quantite_stock}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">unité(s)</span>
                    </td>
                    <td className="px-5 py-4">{getStockBadge(stock)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {stock.seuil_alerte != null ? `≤ ${stock.seuil_alerte}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatDate(stock.updated_at)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{stock.nom_comptable || '—'}</td>
                    {canWrite && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              // Quick appro for this specific article/year
                              setEditingStock(null);
                              setFormMode('approvisionner');
                              setFormData({
                                type_uniforme_id: stock.type_uniforme_id,
                                annee_scolaire: stock.annee_scolaire,
                                section: stock.section || '',
                                quantite: '',
                                seuil_alerte: stock.seuil_alerte != null ? String(stock.seuil_alerte) : '',
                                notes: '',
                              });
                              setFormError('');
                              setFormSuccess('');
                            }}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Approvisionner cet article"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          {canManageConfiguration() && (
                            <>
                              <button
                                onClick={() => openCorrection(stock)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Corriger le stock"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(stock)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



export default StockUniforms