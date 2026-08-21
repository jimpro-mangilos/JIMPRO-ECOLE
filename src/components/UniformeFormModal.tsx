import { useState, useEffect } from 'react';
import { X, Package, Loader2, AlertTriangle, XCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TAILLES_UNIFORME } from '../lib/constants';
import type { Database } from '../lib/database.types';

type Eleve = Database['public']['Tables']['eleves']['Row'];

interface TypeUniforme {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
  sexe?: string | null;
}

interface StockInfo {
  [key: string]: number;
}

interface AnneeScolaire {
  id: string;
  annee: string;
  is_active: boolean;
}

interface ArticleItem {
  type_uniforme_id: string;
  quantite: string;
  taille: string;
}

interface UniformeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eleve: Eleve;
}

type StockStatus =
  | { type: 'loading' }
  | { type: 'not_configured' }
  | { type: 'rupture'; disponible: number }
  | { type: 'insuffisant'; disponible: number; demande: number }
  | { type: 'ok'; disponible: number }
  | null;

const emptyItem = (): ArticleItem => ({ type_uniforme_id: '', quantite: '1', taille: 'M' });

export default function UniformeFormModal({ isOpen, onClose, onSuccess, eleve }: UniformeFormModalProps) {
  const { user, userProfile, currentSchoolId } = useAuth();
  const [typesUniforme, setTypesUniforme] = useState<TypeUniforme[]>([]);
  const [anneeScolaires, setAnneeScolaires] = useState<AnneeScolaire[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [taillesList, setTaillesList] = useState<string[]>(TAILLES_UNIFORME);
  const [existingArticles, setExistingArticles] = useState<Set<string>>(new Set());

  const [annee, setAnnee] = useState('');
  const [dateDistribution, setDateDistribution] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ArticleItem[]>([emptyItem()]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (annee && isOpen) {
      loadStockForAnnee(annee);
    } else {
      setStockInfo({});
    }
  }, [annee, isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [typesRes, anneesRes, taillesRes] = await Promise.all([
        supabase.from('types_uniforme').select('*').eq('ecole_id', currentSchoolId).eq('is_active', true).order('ordre'),
        supabase.from('annees_scolaires').select('*').eq('ecole_id', currentSchoolId).eq('is_active', true).order('annee', { ascending: false }),
        supabase.from('tailles_uniforme').select('libelle').eq('ecole_id', currentSchoolId).eq('is_active', true).order('ordre'),
      ]);
      if (typesRes.data) {
        // Filtre par sexe : seuls les articles unisexes ou correspondant au sexe de l'élève
        const sexe = eleve.sexe;
        setTypesUniforme(typesRes.data.filter((t: any) => !t.sexe || t.sexe === sexe));
      }
      if (taillesRes.data && taillesRes.data.length) setTaillesList(taillesRes.data.map((t: any) => t.libelle));
      if (anneesRes.data) {
        setAnneeScolaires(anneesRes.data);
        const active = anneesRes.data.find((a: any) => a.is_active);
        if (active && !annee) {
          setAnnee(active.annee);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadStockForAnnee = async (a: string) => {
    if (!a) return;
    setLoadingStock(true);
    try {
      const [stockRes, distRes] = await Promise.all([
        supabase.from('stock_uniformes').select('type_uniforme_id, quantite_stock, taille').eq('ecole_id', currentSchoolId).eq('annee_scolaire', a).eq('section', eleve.section || ''),
        supabase.from('gestion_uniformes').select('type_uniforme_id').eq('ecole_id', currentSchoolId).eq('eleve_id', eleve.id).eq('annee_scolaire', a),
      ]);
      const data = stockRes.data;
      if (stockRes.error) throw stockRes.error;
      setExistingArticles(new Set((distRes.data || []).map((d: any) => d.type_uniforme_id)));
      const map: StockInfo = {};
      (data || []).forEach((s: any) => { map[`${s.type_uniforme_id}:${s.taille || 'M'}`] = s.quantite_stock; });
      setStockInfo(map);

      // Pré-sélectionne un article par type, en choisissant la première taille ayant du stock
      const byType = new Map<string, string>();
      (data || []).forEach((s: any) => {
        if (!byType.has(s.type_uniforme_id)) byType.set(s.type_uniforme_id, s.taille || 'M');
      });
      const availableItems = typesUniforme
        .filter((t) => byType.has(t.id))
        .map((t) => ({ type_uniforme_id: t.id, quantite: '1', taille: byType.get(t.id) || 'M' }));
      setItems(availableItems.length > 0 ? availableItems : [emptyItem()]);
    } catch (err) {
      console.error('Erreur chargement stock:', err);
      setStockInfo({});
    } finally {
      setLoadingStock(false);
    }
  };

  const getItemStockStatus = (item: ArticleItem): StockStatus => {
    if (!item.type_uniforme_id || !annee) return null;
    if (loadingStock) return { type: 'loading' };
    const key = `${item.type_uniforme_id}:${item.taille || 'M'}`;
    const hasEntry = key in stockInfo;
    if (!hasEntry) return { type: 'not_configured' };
    const disponible = stockInfo[key];
    const demande = parseInt(item.quantite) || 0;
    if (disponible === 0) return { type: 'rupture', disponible };
    if (demande > disponible) return { type: 'insuffisant', disponible, demande };
    return { type: 'ok', disponible };
  };

  const selectedIds = items.map((i) => i.type_uniforme_id).filter(Boolean);

  const filledItems = items.filter((i) => i.type_uniforme_id !== '');

  const canSubmit =
    !loadingStock &&
    annee.trim() !== '' &&
    filledItems.length > 0 &&
    filledItems.every((item) => {
      const s = getItemStockStatus(item);
      return s?.type === 'ok';
    });

  const handleAnneeChange = (value: string) => {
    setAnnee(value);
    setItems([emptyItem()]);
  };

  const updateItem = (index: number, patch: Partial<ArticleItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setAnnee('');
    setDateDistribution(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([emptyItem()]);
    setStockInfo({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (filledItems.length === 0 || !annee) {
      alert("Veuillez sélectionner au moins un article et renseigner l'année scolaire");
      return;
    }
    if (!canSubmit) {
      alert('Distribution impossible : stock insuffisant ou non configuré pour un ou plusieurs articles.');
      return;
    }

    try {
      setLoading(true);
      const nomComptable = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

      const rows = filledItems.map((item) => {
        const typeUniforme = typesUniforme.find((t) => t.id === item.type_uniforme_id);
        return {
          eleve_id: eleve.id,
          matricule: eleve.matricule,
          nom_eleve: eleve.nom,
          postnom: eleve.postnom,
          prenom: eleve.prenom,
          section: eleve.section,
          classe: (eleve as any).classe || '',
          type_uniforme_id: item.type_uniforme_id,
          type_uniforme_libelle: typeUniforme?.libelle || '',
          quantite: parseInt(item.quantite),
          taille: item.taille || 'M',
          annee_scolaire: annee,
          notes: notes || null,
          comptable_id: user?.id,
          nom_comptable: nomComptable,
          date_distribution: dateDistribution,
          statut: existingArticles.has(item.type_uniforme_id) ? 'en_attente' : 'valide',
          ecole_id: currentSchoolId,
        };
      });

      const { error } = await supabase.from('gestion_uniformes').insert(rows);
      if (error) throw error;

      alert(
        filledItems.length === 1
          ? 'Distribution de fourniture enregistrée avec succès'
          : `${filledItems.length} distributions enregistrées avec succès`
      );
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert("Erreur lors de l'enregistrement: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderStockIndicator = (item: ArticleItem) => {
    if (!item.type_uniforme_id || !annee) return null;
    const status = getItemStockStatus(item);
    if (!status) return null;
    switch (status.type) {
      case 'loading':
        return (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification...
          </div>
        );
      case 'not_configured':
        return (
          <div className="flex items-center gap-1.5 p-2 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-600 mt-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            Stock non configuré pour la section {eleve.section || '—'}
          </div>
        );
      case 'rupture':
        return (
          <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-1.5">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Rupture de stock — 0 disponible
          </div>
        );
      case 'insuffisant':
        return (
          <div className="flex items-center gap-1.5 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 mt-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Insuffisant — {status.disponible} dispo / {status.demande} demandé(s)
          </div>
        );
      case 'ok':
        return (
          <div className="flex items-center gap-1.5 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 mt-1.5">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {status.disponible} dispo — après distribution : {status.disponible - (parseInt(item.quantite) || 0)} restant(s)
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Distribution de Fournitures</h2>
              <p className="text-sm text-gray-500">
                {eleve.nom} {eleve.postnom} {eleve.prenom} — {eleve.matricule}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-5">
            {/* Common fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Annee Scolaire
                </label>
                {anneeScolaires.length <= 1 ? (
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 font-medium">
                    {annee || 'Aucune annee active'}
                  </div>
                ) : (
                  <select
                    value={annee}
                    onChange={(e) => handleAnneeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {anneeScolaires.map((a) => (
                      <option key={a.id} value={a.annee}>{a.annee}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de distribution *
                </label>
                <input
                  type="date"
                  value={dateDistribution}
                  onChange={(e) => setDateDistribution(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            {/* Articles list */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-teal-900 text-sm">
                  Articles a distribuer
                </h3>
                {filledItems.length > 0 && (
                  <span className="bg-teal-200 text-teal-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {filledItems.length}
                  </span>
                )}
              </div>
              {filledItems.length > 0 && !loadingStock && (
                <p className="text-xs text-teal-700 bg-teal-100 rounded-md px-3 py-1.5">
                  Tous les articles disponibles en stock ont ete pre-selectionnes (1 piece chacun). Vous pouvez retirer ceux qui ne sont pas necessaires.
                </p>
              )}

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg border border-teal-200 p-3">
                    <div className="flex items-start gap-2">
                      {/* Article select */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Type d'article *
                        </label>
                        <select
                          value={item.type_uniforme_id}
                          onChange={(e) => updateItem(index, { type_uniforme_id: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          disabled={!annee}
                        >
                          <option value="">
                            {annee ? 'Sélectionner un article' : "Choisir d'abord l'année"}
                          </option>
                          {typesUniforme.map((type) => {
                            const alreadyUsed =
                              selectedIds.includes(type.id) && item.type_uniforme_id !== type.id;
                            const entries = annee
                              ? Object.entries(stockInfo).filter(([k]) => k.startsWith(`${type.id}:`))
                              : [];
                            const configured = entries.length > 0;
                            const stock = configured ? entries.reduce((sum, [, v]) => sum + v, 0) : null;
                            const stockLabel = annee
                              ? loadingStock
                                ? ''
                                : !configured
                                ? ' — non configuré'
                                : stock === 0
                                ? ' — rupture'
                                : ` — ${stock} dispo`
                              : '';
                            return (
                              <option
                                key={type.id}
                                value={type.id}
                                disabled={alreadyUsed || !configured || stock === 0}
                              >
                                {type.libelle}{stockLabel}
                                {alreadyUsed ? ' (déjà sélectionné)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Taille */}
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Taille
                        </label>
                        <select
                          value={item.taille}
                          onChange={(e) => updateItem(index, { taille: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        >
                          {taillesList.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantité *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantite}
                          onChange={(e) => updateItem(index, { quantite: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                      </div>

                      {/* Remove button */}
                      <div className="pt-5">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Supprimer cet article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Per-item stock indicator */}
                    {renderStockIndicator(item)}

                    {/* Alerte doublon : article déjà distribué → validation requise */}
                    {existingArticles.has(item.type_uniforme_id) && (
                      <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Article déjà distribué à cet élève — cette nouvelle distribution sera soumise à validation.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add article button */}
              <button
                type="button"
                onClick={addItem}
                disabled={!annee}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-teal-300 rounded-lg text-sm text-teal-600 hover:border-teal-500 hover:bg-teal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Ajouter un article
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: Taille L, remplacement..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title={!canSubmit ? 'Stock insuffisant ou non configuré' : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    {filledItems.length > 1
                      ? `Enregistrer ${filledItems.length} distributions`
                      : 'Enregistrer la distribution'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
