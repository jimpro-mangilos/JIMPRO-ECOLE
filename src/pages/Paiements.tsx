import { useState, useMemo, useRef, useEffect } from 'react';
import { DollarSign, Search, CheckCircle, Clock, Printer, Plus, XCircle, AlertTriangle, Trash2, Calendar, CalendarDays, ChevronRight, ChevronsDownUp, FileDown, RotateCcw, LayoutDashboard, User, ChevronDown, Check, X, Pencil } from 'lucide-react';
import { generateReceipt } from '../utils/receiptGenerator';
import { generatePaiementsReport } from '../utils/pdfGenerator';
import PaymentFormModal from '../components/PaymentFormModal';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { useAuth } from '../contexts/AuthContext';
import { usePaiements, getStatut, type Paiement } from '../lib/hooks/usePaiements';
import { useSections, useOptions, useClasses, useTypesPaiement } from '../lib/hooks/useReferenceData';

// ─── Motif Multi-Select (local component) ────────────────────────────────────
function MotifMultiSelect({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (v: string) => selected.includes(v) ? onChange(selected.filter(x => x !== v)) : onChange([...selected, v]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`px-3 py-2 border rounded-md text-sm flex items-center gap-2 min-w-[160px] ${selected.length > 0 ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700'}`}>
        <span className="truncate">{selected.length === 0 ? 'Tous motifs' : `${selected.length} motif${selected.length > 1 ? 's' : ''}`}</span>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {selected.length > 0 && <span role="button" onClick={e => { e.stopPropagation(); onChange([]); }} className="p-0.5 rounded hover:bg-blue-100"><X className="w-3 h-3 text-blue-500" /></span>}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="sticky top-0 bg-white border-b px-3 py-2 flex items-center justify-between">
            <button type="button" onClick={() => onChange([...options])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Tout sélectionner</button>
            <button type="button" onClick={() => onChange([])} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Tout effacer</button>
          </div>
          {options.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400 italic">Aucun motif</div> : options.map(o => (
            <button key={o} type="button" onClick={() => toggle(o)} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 ${selected.includes(o) ? 'bg-blue-50/50' : ''}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(o) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>{selected.includes(o) && <Check className="w-3 h-3 text-white" />}</span>
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filters State ────────────────────────────────────────────────────────────
function usePaiementFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatut, setFilterStatut] = useState<string[]>([]);
  const [filterMotifs, setFilterMotifs] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterEncaisseur, setFilterEncaisseur] = useState<string[]>([]);
  const [filterSection, setFilterSection] = useState<string[]>([]);
  const [filterOption, setFilterOption] = useState<string[]>([]);
  const [filterClasse, setFilterClasse] = useState<string[]>([]);
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [viewMode, setViewMode] = useState<'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif'>('compte_actif');
  return { searchTerm, setSearchTerm, filterType, setFilterType, filterStatut, setFilterStatut, filterMotifs, setFilterMotifs, filterYear, setFilterYear, filterEncaisseur, setFilterEncaisseur, filterSection, setFilterSection, filterOption, setFilterOption, filterClasse, setFilterClasse, filterDateDebut, setFilterDateDebut, filterDateFin, setFilterDateFin, viewMode, setViewMode };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function Paiements() {
  const { user, userProfile, canCreatePaiement, canAnnulerPaiement, canSupprimerPaiement, isItManager, isAdmin, isComptable, isPromoteur, isCoordonnateur } = useAuth();
  const filters = usePaiementFilters();
  const isStrictComptable = isComptable() && !isItManager();

  // Force view mode for strict comptable
  useEffect(() => {
    if (isStrictComptable && filters.viewMode === 'general') filters.setViewMode('compte_actif');
  }, [isStrictComptable, filters.viewMode]);

  const {
    paiements, typesPaiement, loading, stats, motifOptions,
    dateGroups, expandedDates,
    toggleDate, expandAllDates, collapseAllDates, allExpanded,
    selectedIds, bulkDeleting,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    annulationModal, setAnnulationModal, openAnnulation, closeAnnulation, handleAnnuler,
    encaisser, canEncaisserMontant,
    supprimer, editPaiement, invalidate,
  } = usePaiements(filters);

  const { data: sections = [] } = useSections();
  const { data: options = [] } = useOptions();
  const { data: classes = [] } = useClasses();

  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; paiement: Paiement | null; loading: boolean }>({ open: false, paiement: null, loading: false });
  const [detailPaiement, setDetailPaiement] = useState<Paiement | null>(null);
  const [editFormData, setEditFormData] = useState({ montant_paye: 0, montant_en_lettre: '', motif_libelle: '', mode_paiement: '', date_paiement: '', annee_scolaire: '' });

  const isDateFilterActive = filters.filterDateDebut !== '' || filters.filterDateFin !== '';
  const colCount = isItManager() ? 8 : 7;

  // ─── Print / Edit / Detail handlers ────────────────────────────────────────
  const handlePrintRecu = (paiement: Paiement) => {
    try {
      const typeLabel = typesPaiement.find((t: any) => t.libelle === paiement.type_paiement)?.description || paiement.type_paiement;
      generateReceipt({
        id: paiement.id, nom_eleve: paiement.nom_eleve, matricule: paiement.matricule,
        postnom: paiement.postnom, prenom: paiement.prenom, classe: paiement.classe,
        sexe: paiement.sexe, section: paiement.section, telephone: paiement.telephone,
        option: paiement.option || '', lieu_naissance: paiement.lieu_naissance,
        date_naissance: paiement.date_naissance, responsable: paiement.responsable,
        montant_paye: paiement.montant_paye, montant_en_lettre: paiement.montant_en_lettre,
        mode_paiement: paiement.mode_paiement, date_paiement: paiement.date_paiement,
        date_encaissement: paiement.date_encaissement || paiement.created_at,
        nom_comptable: paiement.nom_comptable, nom_encaisseur: paiement.nom_encaisseur,
        type_paiement: typeLabel, annee_scolaire: paiement.annee_scolaire,
        motif_paiement: paiement.motif_libelle || null,
      }, false);
    } catch (err) { console.error('Erreur impression:', err); alert('Erreur lors de la génération du reçu'); }
  };

  const openEditModal = (p: Paiement) => {
    setEditFormData({ montant_paye: p.montant_paye, montant_en_lettre: p.montant_en_lettre, motif_libelle: p.motif_libelle, mode_paiement: p.mode_paiement, date_paiement: p.date_paiement, annee_scolaire: p.annee_scolaire || '' });
    setEditModal({ open: true, paiement: p, loading: false });
  };

  const handleEditSubmit = async () => {
    if (!editModal.paiement) return;
    setEditModal(prev => ({ ...prev, loading: true }));
    const ok = await editPaiement(editModal.paiement.id, editFormData);
    if (ok) setEditModal({ open: false, paiement: null, loading: false });
    else setEditModal(prev => ({ ...prev, loading: false }));
  };

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split('/');
    return new Date(+parts[2], +parts[1] - 1, +parts[0]).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleBulkPrint = () => {
    if (selectedIds.size === 0) return;
    const toPrint = paiements.filter(p => selectedIds.has(p.id));
    generatePaiementsReport(toPrint as any);
  };

  const handlePrintReport = () => generatePaiementsReport(paiements as any);

  // ─── Derived data for filter dropdowns ─────────────────────────────────────
  const years = useMemo(() => Array.from(new Set(paiements.map(p => new Date(p.date_paiement).getFullYear().toString()))).sort(), [paiements]);
  const encaisseurs = useMemo(() => Array.from(new Set(paiements.map(p => p.nom_encaisseur).filter(Boolean) as string[])).sort(), [paiements]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
        {canCreatePaiement() && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md">
            <Plus className="w-5 h-5" /> Nouveau Paiement
          </button>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {(['compte_actif', 'journalier', 'jour_precedent', 'mois', 'mois_precedent', 'general'] as const).map(mode => (
          <button key={mode} onClick={() => filters.setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.viewMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
            {mode === 'compte_actif' && <User className="w-4 h-4" />}
            {mode === 'journalier' && <Calendar className="w-4 h-4" />}
            {mode === 'jour_precedent' && <CalendarDays className="w-4 h-4" />}
            {mode === 'mois' && <Calendar className="w-4 h-4" />}
            {mode === 'mois_precedent' && <CalendarDays className="w-4 h-4" />}
            {mode === 'general' && <LayoutDashboard className="w-4 h-4" />}
            {mode === 'compte_actif' ? 'Compte Actif' : mode === 'journalier' ? 'Journalier' : mode === 'jour_precedent' ? 'Jour Précédent' : mode === 'mois' ? 'Ce Mois' : mode === 'mois_precedent' ? 'Mois Précédent' : 'Général'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Encaissé', value: `${stats.totalEncaisse.toLocaleString('fr-FR')} FC`, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconTxt: 'text-emerald-600' },
          { label: 'En Attente', value: `${stats.totalEnAttente.toLocaleString('fr-FR')} FC`, icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-orange-50', iconTxt: 'text-amber-600' },
          { label: 'Total Annulé', value: `${stats.totalAnnule.toLocaleString('fr-FR')} FC`, icon: XCircle, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-red-50', iconTxt: 'text-rose-600' },
          { label: 'Total Paiements', value: `${stats.total}`, icon: DollarSign, color: 'sky', bg: 'bg-sky-50', text: 'text-sky-700', iconBg: 'bg-blue-50', iconTxt: 'text-sky-600' },
        ].map(card => (
          <div key={card.label} className={`relative overflow-hidden rounded-xl shadow-sm p-6 border transition-all bg-white border-gray-100`}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-current/5 rounded-full -mr-4 -mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.text}`}>{card.value}</p>
                {isDateFilterActive && <p className="text-[10px] text-gray-500 mt-1 font-medium">Période filtrée</p>}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`w-6 h-6 ${card.iconTxt}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Liste des Paiements</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrintReport} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"><FileDown className="w-4 h-4" /> Rapport</button>
            {selectedIds.size > 0 && (
              <>
                <button onClick={handleBulkPrint} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm"><Printer className="w-4 h-4" /> Imprimer ({selectedIds.size})</button>
                {canSupprimerPaiement() && <button onClick={bulkDelete} disabled={bulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 text-sm disabled:opacity-50"><Trash2 className="w-4 h-4" /> Supprimer ({selectedIds.size})</button>}
              </>
            )}
            <button onClick={expandAllDates} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><ChevronsDownUp className="w-3 h-3" /> Tout déplier</button>
            <button onClick={collapseAllDates} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><RotateCcw className="w-3 h-3" /> Tout replier</button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher (nom, n° reçu, classe)..." value={filters.searchTerm} onChange={e => filters.setSearchTerm(e.target.value)} className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MultiSelectFilter label="Statut" placeholder="Tous" options={['encaisse', 'en_attente', 'annule']} selected={filters.filterStatut} onChange={filters.setFilterStatut} />
            <MultiSelectFilter label="Type" placeholder="Tous" options={typesPaiement.map((t: any) => t.libelle)} selected={filters.filterType} onChange={filters.setFilterType} />
            <MotifMultiSelect options={motifOptions} selected={filters.filterMotifs} onChange={filters.setFilterMotifs} />
            <MultiSelectFilter label="Année" placeholder="Toutes" options={years} selected={filters.filterYear} onChange={filters.setFilterYear} />
            <MultiSelectFilter label="Encaisseur" placeholder="Tous" options={encaisseurs} selected={filters.filterEncaisseur} onChange={filters.setFilterEncaisseur} />
            <MultiSelectFilter label="Section" placeholder="Toutes" options={sections.map((s: any) => s.nom)} selected={filters.filterSection} onChange={filters.setFilterSection} />
            <MultiSelectFilter label="Classe" placeholder="Toutes" options={classes.map((c: any) => c.nom)} selected={filters.filterClasse} onChange={filters.setFilterClasse} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-medium text-gray-700 mb-1">Date début</label><input type="date" value={filters.filterDateDebut} onChange={e => filters.setFilterDateDebut(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex-1"><label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label><input type="date" value={filters.filterDateFin} onChange={e => filters.setFilterDateFin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>
      </div>

      {/* Table grouped by date */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {dateGroups.map(([dateKey, groupPaiements]) => {
          const isExpanded = expandedDates.has(dateKey) || expandedDates.has('__first__');
          const groupTotal = groupPaiements.filter(p => getStatut(p) !== 'annule').reduce((s, p) => s + p.montant_paye, 0);
          return (
            <div key={dateKey} className="border-b border-gray-100 last:border-b-0">
              <button onClick={() => toggleDate(dateKey)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <span className="font-semibold text-gray-800">{formatDateLong(dateKey)}</span>
                  <span className="text-sm text-gray-500">({groupPaiements.length} paiements)</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{groupTotal.toLocaleString('fr-FR')} FC</span>
              </button>
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-200 bg-gray-50">
                      {isItManager() && <th className="px-3 py-2 text-left"><input type="checkbox" checked={groupPaiements.length > 0 && groupPaiements.every(p => selectedIds.has(p.id))} onChange={() => groupPaiements.forEach(p => toggleSelectOne(p.id))} className="rounded" /></th>}
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">N° Reçu</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Élève</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Classe</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type/Motif</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Montant</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {groupPaiements.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          {isItManager() && <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelectOne(p.id)} className="rounded" /></td>}
                          <td className="px-3 py-2 text-sm font-mono text-gray-900">{p.numero_recu}</td>
                          <td className="px-3 py-2"><p className="text-sm font-medium text-gray-900">{p.nom_eleve} {p.prenom}</p><p className="text-xs text-gray-400">{p.matricule}</p></td>
                          <td className="px-3 py-2 text-sm text-gray-600">{p.classe}</td>
                          <td className="px-3 py-2"><p className="text-sm text-gray-800">{p.type_paiement}</p><p className="text-xs text-gray-400">{p.motif_libelle || '—'}</p></td>
                          <td className="px-3 py-2 text-sm font-semibold text-right text-gray-900">{p.montant_paye.toLocaleString('fr-FR')} FC</td>
                          <td className="px-3 py-2 text-center">
                            {getStatut(p) === 'encaisse' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Encaissé</span>
                              : getStatut(p) === 'annule' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Annulé</span>
                                : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> En attente</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handlePrintRecu(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Reçu"><Printer className="w-3.5 h-3.5" /></button>
                              {(canCreatePaiement() || isItManager()) && getStatut(p) !== 'annule' && <button onClick={() => openEditModal(p)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>}
                              {(canEncaisserMontant(p.montant_paye) && getStatut(p) === 'en_attente') && <button onClick={() => encaisser(p.id, p.montant_paye)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Encaisser"><CheckCircle className="w-3.5 h-3.5" /></button>}
                              {canAnnulerPaiement() && getStatut(p) !== 'annule' && <button onClick={() => openAnnulation(p.id)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Annuler"><AlertTriangle className="w-3.5 h-3.5" /></button>}
                              {(canSupprimerPaiement() || isItManager()) && <button onClick={() => supprimer(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {dateGroups.length === 0 && <div className="px-4 py-12 text-center text-gray-400">Aucun paiement trouvé.</div>}
      </div>

      {/* New Payment Modal */}
      {showModal && <PaymentFormModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={() => { invalidate(); setShowModal(false); }} preselectedEleve={undefined} />}

      {/* Annulation Modal */}
      {annulationModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeAnnulation}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Annuler le paiement</h2><button onClick={closeAnnulation} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-6"><label className="block text-sm font-medium text-gray-700 mb-2">Motif d'annulation *</label>
              <textarea value={annulationModal.motif} onChange={e => setAnnulationModal(p => ({ ...p, motif: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="Raison de l'annulation..." />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeAnnulation} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleAnnuler} disabled={annulationModal.loading} className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{annulationModal.loading ? 'En cours...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.paiement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal({ open: false, paiement: null, loading: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Modifier le paiement</h2><button onClick={() => setEditModal({ open: false, paiement: null, loading: false })} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label><input type="number" value={editFormData.montant_paye} onChange={e => setEditFormData(p => ({ ...p, montant_paye: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant en lettres</label><input type="text" value={editFormData.montant_en_lettre} onChange={e => setEditFormData(p => ({ ...p, montant_en_lettre: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Motif</label><input type="text" value={editFormData.motif_libelle} onChange={e => setEditFormData(p => ({ ...p, motif_libelle: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mode</label><input type="text" value={editFormData.mode_paiement} onChange={e => setEditFormData(p => ({ ...p, mode_paiement: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={editFormData.date_paiement} onChange={e => setEditFormData(p => ({ ...p, date_paiement: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire</label><input type="text" value={editFormData.annee_scolaire} onChange={e => setEditFormData(p => ({ ...p, annee_scolaire: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setEditModal({ open: false, paiement: null, loading: false })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleEditSubmit} disabled={editModal.loading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{editModal.loading ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - kept minimal, the full version is in the original but simplified here */}
      {detailPaiement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailPaiement(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Détails du paiement</h2><button onClick={() => setDetailPaiement(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-6 space-y-2 text-sm"><p><strong>Reçu:</strong> {detailPaiement.numero_recu}</p><p><strong>Élève:</strong> {detailPaiement.nom_eleve} {detailPaiement.prenom}</p><p><strong>Montant:</strong> {detailPaiement.montant_paye.toLocaleString('fr-FR')} FC</p><p><strong>Statut:</strong> {getStatut(detailPaiement)}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
