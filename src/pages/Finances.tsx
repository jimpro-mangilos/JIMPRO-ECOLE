import { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, CheckCircle, ArrowDownCircle, ArrowUpCircle, Trash2, ChevronUp, ChevronDown, ChevronRight, Filter, User, Calendar, CalendarDays, FileDown, LayoutDashboard, Clock, Pencil, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateFinancesReport } from '../utils/pdfGenerator';
import { montantEnLettres } from '../utils/numberToWords';
import { PieChart } from '../components/PieChart';
import { useFinances, STATUT_LABELS, STATUT_COLORS, type Transaction } from '../lib/hooks/useFinances';

// ─── Filters State ────────────────────────────────────────────────────────────
function useFinanceFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'en_attente' | 'approuve' | 'decaisse' | 'encaisse'>('all');
  const [filterComptable, setFilterComptable] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [sortField, setSortField] = useState<'date_transaction' | 'montant_chiffre'>('date_transaction');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif'>('compte_actif');
  return { searchTerm, setSearchTerm, filterStatut, setFilterStatut, filterComptable, setFilterComptable, filterYear, setFilterYear, filterDateDebut, setFilterDateDebut, filterDateFin, setFilterDateFin, sortField, setSortField, sortDir, setSortDir, viewMode, setViewMode };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function Finances() {
  const { isComptable, isItManager } = useAuth();
  const filters = useFinanceFilters();
  const isStrictComptable = isComptable() && !isItManager();
  useEffect(() => { if (isStrictComptable && filters.viewMode === 'general') filters.setViewMode('compte_actif'); }, [isStrictComptable, filters.viewMode]);

  const { transactions, loading, stats, pieData, dateGroups, expandedDates, toggleDate,
    comptableOptions, years, selectedIds, bulkDeleting, actionLoading,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    canApprouverTransaction, canDecaisserEncaisserTransaction,
    canSupprimer, canCreer, canModifier,
    updateStatut, supprimer, createTransaction, editTransaction } = useFinances(filters);

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recette' | 'depense'>('recette');
  const [formData, setFormData] = useState({ montant_chiffre: 0, montant_lettre: '', beneficiaire: '', libelle: '', telephone: '', type_operation: 'recette' });
  const [editModal, setEditModal] = useState<{ open: boolean; transaction: Transaction | null; loading: boolean }>({ open: false, transaction: null, loading: false });
  const [editFormData, setEditFormData] = useState({ montant_chiffre: 0, montant_lettre: '', beneficiaire: '', libelle: '', telephone: '', type_operation: 'recette', date_transaction: '', statut: 'en_attente' });
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split('/');
    return new Date(+parts[2], +parts[1] - 1, +parts[0]).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const groupTotal = (list: Transaction[]) => list.filter(t => t.type_operation === 'recette').reduce((s, t) => s + t.montant_chiffre, 0) - list.filter(t => t.type_operation === 'dépense').reduce((s, t) => s + t.montant_chiffre, 0);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => { e.preventDefault(); if (await createTransaction(formData)) { setShowModal(false); setFormData({ montant_chiffre: 0, montant_lettre: '', beneficiaire: '', libelle: '', telephone: '', type_operation: 'recette' }); } };
  const handleEditSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!editModal.transaction) return; setEditModal(p => ({ ...p, loading: true })); if (await editTransaction(editModal.transaction.id, editFormData)) setEditModal({ open: false, transaction: null, loading: false }); else setEditModal(p => ({ ...p, loading: false })); };
  const openEditModal = (t: Transaction) => { setEditFormData({ montant_chiffre: t.montant_chiffre, montant_lettre: t.montant_lettre || '', beneficiaire: t.beneficiaire, libelle: t.libelle, telephone: t.telephone || '', type_operation: t.type_operation, date_transaction: t.date_transaction ? t.date_transaction.split('T')[0] : '', statut: t.statut || 'en_attente' }); setEditModal({ open: true, transaction: t, loading: false }); };
  const handleMontantBlur = () => { if (formData.montant_chiffre && !formData.montant_lettre) setFormData(p => ({ ...p, montant_lettre: montantEnLettres(p.montant_chiffre) })); };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion Financière</h1>
        {canCreer() && <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-md"><Plus className="w-5 h-5" /> Nouvelle Transaction</button>}
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {(['compte_actif', 'journalier', 'jour_precedent', 'mois', 'mois_precedent', 'general'] as const).map(mode => (
          <button key={mode} onClick={() => filters.setViewMode(mode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.viewMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
            {mode === 'compte_actif' && <User className="w-4 h-4" />}{mode === 'journalier' && <Calendar className="w-4 h-4" />}{mode === 'jour_precedent' && <CalendarDays className="w-4 h-4" />}{mode === 'mois' && <Calendar className="w-4 h-4" />}{mode === 'mois_precedent' && <CalendarDays className="w-4 h-4" />}{mode === 'general' && <LayoutDashboard className="w-4 h-4" />}
            {mode === 'compte_actif' ? 'Compte Actif' : mode === 'journalier' ? "Aujourd'hui" : mode === 'jour_precedent' ? 'Hier' : mode === 'mois' ? 'Ce Mois' : mode === 'mois_precedent' ? 'Mois Précédent' : 'Général'}
          </button>
        ))}
      </div>

      {/* Stats + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ label: 'Recettes', value: `${stats.totalRecettes.toLocaleString('fr-FR')} FC`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' }, { label: 'Dépenses', value: `${stats.totalDepenses.toLocaleString('fr-FR')} FC`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' }, { label: 'Solde', value: `${stats.solde.toLocaleString('fr-FR')} FC`, icon: stats.solde >= 0 ? CheckCircle : Clock, color: stats.solde >= 0 ? 'text-blue-600' : 'text-amber-600', bg: stats.solde >= 0 ? 'bg-blue-50' : 'bg-amber-50' }, { label: 'Transactions', value: String(stats.count), icon: Filter, color: 'text-purple-600', bg: 'bg-purple-50' }].map(c => (
              <div key={c.label} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-gray-500 uppercase">{c.label}</span><div className={`${c.bg} p-2 rounded-lg`}><c.icon className={`w-4 h-4 ${c.color}`} /></div></div>
                <p className="text-lg font-bold text-gray-900">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"><h3 className="text-sm font-semibold text-gray-700 mb-2">Répartition</h3><PieChart data={pieData as any} /></div>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Transactions</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => generateFinancesReport(transactions as any)} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"><FileDown className="w-4 h-4" /> Rapport</button>
            {selectedIds.size > 0 && canSupprimer() && <button onClick={bulkDelete} disabled={bulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 text-sm disabled:opacity-50"><Trash2 className="w-4 h-4" /> Supprimer ({selectedIds.size})</button>}
          </div>
        </div>

        <div className="space-y-3 mb-3">
          <div className="flex items-center gap-2"><Search className="w-4 h-4 text-gray-400" /><input type="text" placeholder="Rechercher..." value={filters.searchTerm} onChange={e => filters.setSearchTerm(e.target.value)} className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={filters.filterStatut} onChange={e => filters.setFilterStatut(e.target.value as any)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="all">Tous statuts</option>{Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select value={filters.filterComptable} onChange={e => filters.setFilterComptable(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="all">Tous intervenants</option>{comptableOptions.map(n => <option key={n} value={n}>{n}</option>)}</select>
            <select value={filters.filterYear} onChange={e => filters.setFilterYear(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="all">Toutes années</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <div className="flex items-center gap-2">
              <button onClick={() => filters.setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">{filters.sortDir === 'asc' ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}</button>
              <select value={filters.sortField} onChange={e => filters.setSortField(e.target.value as any)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="date_transaction">Date</option><option value="montant_chiffre">Montant</option></select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-medium text-gray-700 mb-1">Date début</label><input type="date" value={filters.filterDateDebut} onChange={e => filters.setFilterDateDebut(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex-1"><label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label><input type="date" value={filters.filterDateFin} onChange={e => filters.setFilterDateFin(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>

        {/* Table grouped by date */}
        {dateGroups.map(([dateKey, group]) => {
          const isExpanded = expandedDates.has(dateKey) || expandedDates.has('__first__');
          return (
            <div key={dateKey} className="border border-gray-100 rounded-lg mb-2 overflow-hidden">
              <button onClick={() => toggleDate(dateKey)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3"><ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /><span className="font-semibold text-gray-800">{formatDateLong(dateKey)}</span><span className="text-sm text-gray-500">({group.length})</span></div>
                <span className={`text-sm font-semibold ${groupTotal(group) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{groupTotal(group) >= 0 ? '+' : ''}{groupTotal(group).toLocaleString('fr-FR')} FC</span>
              </button>
              {isExpanded && <table className="w-full"><thead><tr className="border-b border-gray-200 bg-gray-50">
                {canSupprimer() && <th className="px-2 py-1.5"><input type="checkbox" checked={group.length > 0 && group.every(t => selectedIds.has(t.id))} onChange={() => toggleSelectAll(group.map(t => t.id))} className="rounded" /></th>}
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase">Bénéficiaire</th><th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase">Libellé</th><th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase">Montant</th><th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase">Type</th><th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th><th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase">Signataires</th><th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr></thead><tbody className="divide-y divide-gray-50">
                {group.map(t => (
                  <tr key={t.id} className={`border-l-4 ${t.type_operation === 'recette' ? 'border-l-emerald-500' : 'border-l-red-500'} hover:bg-gray-50/50 transition-colors cursor-pointer`} onClick={() => setDetailTransaction(t)}>
                    {canSupprimer() && <td className="px-2 py-1.5"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={(e) => { e.stopPropagation(); toggleSelectOne(t.id); }} className="rounded" /></td>}
                    <td className="px-2 py-1.5"><p className="text-sm font-medium text-gray-900">{t.beneficiaire}</p><p className="text-xs text-gray-400">{t.telephone}</p></td>
                    <td className="px-2 py-1.5 text-sm text-gray-600">{t.libelle}</td>
                    <td className="px-2 py-1.5 text-sm font-semibold text-right"><span className={t.type_operation === 'recette' ? 'text-emerald-600' : 'text-red-600'}>{t.type_operation === 'recette' ? '+' : '-'}{t.montant_chiffre.toLocaleString('fr-FR')} FC</span></td>
                    <td className="px-2 py-1.5 text-center">{t.type_operation === 'recette' ? <ArrowUpCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <ArrowDownCircle className="w-4 h-4 text-red-500 mx-auto" />}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${STATUT_COLORS[t.statut || 'en_attente']}`}>{STATUT_LABELS[t.statut || 'en_attente']}</span></td>
                    <td className="px-2 py-1.5"><div className="text-xs space-y-0.5"><span className="text-gray-500">Ord: </span><span className="text-gray-700">{t.nom_comptable || '—'}</span>{t.nom_approbateur && <><br /><span className="text-blue-500">Appr: </span><span className="text-blue-700">{t.nom_approbateur}</span></>}{((t as any).nom_encaisseur) && <><br /><span className="text-emerald-500">{t.type_operation === 'recette' ? 'Enc:' : 'Déc:'} </span><span className="text-emerald-700">{(t as any).nom_encaisseur}</span></>}</div></td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailTransaction(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Détails"><ChevronRight className="w-3.5 h-3.5" /></button>
                        {canModifier() && <button onClick={(e) => { e.stopPropagation(); openEditModal(t); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>}
                        {t.statut === 'en_attente' && canApprouverTransaction(t.montant_chiffre) && <button onClick={(e) => { e.stopPropagation(); updateStatut(t.id, 'approuve'); }} disabled={actionLoading === t.id + 'approuve'} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Approuver"><CheckCircle className="w-3.5 h-3.5" /></button>}
                        {t.statut === 'approuve' && canDecaisserEncaisserTransaction(t.montant_chiffre) && <button onClick={(e) => { e.stopPropagation(); updateStatut(t.id, t.type_operation === 'recette' ? 'encaisse' : 'decaisse'); }} disabled={actionLoading === t.id + (t.type_operation === 'recette' ? 'encaisse' : 'decaisse')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title={t.type_operation === 'recette' ? 'Encaisser' : 'Décaisser'}>{t.type_operation === 'recette' ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}</button>}
                        {canSupprimer() && <button onClick={(e) => { e.stopPropagation(); supprimer(t.id); }} disabled={actionLoading === t.id + 'delete'} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>}
            </div>
          );
        })}
        {dateGroups.length === 0 && <div className="px-4 py-12 text-center text-gray-400">Aucune transaction trouvée.</div>}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreate}>
              <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Nouvelle Transaction</h2><button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setActiveTab('recette'); setFormData(p => ({ ...p, type_operation: 'recette' })); }} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'recette' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>Recette</button>
                  <button type="button" onClick={() => { setActiveTab('depense'); setFormData(p => ({ ...p, type_operation: 'dépense' })); }} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'depense' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>Dépense</button>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label><input type="number" value={formData.montant_chiffre || ''} onChange={e => setFormData(p => ({ ...p, montant_chiffre: Number(e.target.value) }))} onBlur={handleMontantBlur} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant en lettres</label><input type="text" value={formData.montant_lettre} onChange={e => setFormData(p => ({ ...p, montant_lettre: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire *</label><input type="text" value={formData.beneficiaire} onChange={e => setFormData(p => ({ ...p, beneficiaire: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label><input type="text" value={formData.libelle} onChange={e => setFormData(p => ({ ...p, libelle: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input type="text" value={formData.telephone} onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.transaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal({ open: false, transaction: null, loading: false })}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleEditSubmit}>
              <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Modifier Transaction</h2><button type="button" onClick={() => setEditModal({ open: false, transaction: null, loading: false })} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Montant</label><input type="number" value={editFormData.montant_chiffre} onChange={e => setEditFormData(p => ({ ...p, montant_chiffre: Number(e.target.value) }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={editFormData.type_operation} onChange={e => setEditFormData(p => ({ ...p, type_operation: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"><option value="recette">Recette</option><option value="dépense">Dépense</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire</label><input type="text" value={editFormData.beneficiaire} onChange={e => setEditFormData(p => ({ ...p, beneficiaire: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label><input type="text" value={editFormData.libelle} onChange={e => setEditFormData(p => ({ ...p, libelle: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={editFormData.date_transaction} onChange={e => setEditFormData(p => ({ ...p, date_transaction: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut</label><select value={editFormData.statut} onChange={e => setEditFormData(p => ({ ...p, statut: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">{Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setEditModal({ open: false, transaction: null, loading: false })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={editModal.loading} className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">{editModal.loading ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailTransaction(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Détails transaction</h2><button onClick={() => setDetailTransaction(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Montant</span><p className={`font-bold ${detailTransaction.type_operation === 'recette' ? 'text-emerald-600' : 'text-red-600'}`}>{detailTransaction.montant_chiffre.toLocaleString('fr-FR')} FC</p></div>
                <div><span className="text-gray-500">Type</span><p className="font-semibold">{detailTransaction.type_operation === 'recette' ? '💰 Recette' : '📤 Dépense'}</p></div>
                <div><span className="text-gray-500">Statut</span><span className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${STATUT_COLORS[detailTransaction.statut || 'en_attente']}`}>{STATUT_LABELS[detailTransaction.statut || 'en_attente']}</span></div>
                <div><span className="text-gray-500">Date</span><p className="font-medium">{new Date(detailTransaction.date_transaction).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div><span className="text-gray-500">Bénéficiaire</span><p className="font-medium text-gray-900">{detailTransaction.beneficiaire}</p></div>
                <div><span className="text-gray-500">Téléphone</span><p className="font-medium">{detailTransaction.telephone || '—'}</p></div>
                <div><span className="text-gray-500">Comptable</span><p className="font-medium">{detailTransaction.nom_comptable || '—'}</p></div>
                {detailTransaction.nom_approbateur && <div><span className="text-gray-500">Approbateur</span><p className="font-medium text-blue-600">{detailTransaction.nom_approbateur}</p></div>}
                {(detailTransaction as any).nom_encaisseur && <div><span className="text-gray-500">{detailTransaction.type_operation === 'recette' ? 'Encaisseur' : 'Décaissé par'}</span><p className="font-medium text-emerald-600">{(detailTransaction as any).nom_encaisseur}</p></div>}
              </div>
              <div><span className="text-gray-500">Libellé</span><p className="text-gray-700">{detailTransaction.libelle}</p></div>
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                {canModifier() && <button onClick={(e) => { e.stopPropagation(); openEditModal(detailTransaction); setDetailTransaction(null); }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs hover:bg-amber-200"><Pencil className="w-3.5 h-3.5 inline mr-1" />Modifier</button>}
                {detailTransaction.statut === 'en_attente' && canApprouverTransaction(detailTransaction.montant_chiffre) && <button onClick={() => updateStatut(detailTransaction.id, 'approuve').then(ok => ok && setDetailTransaction(null))} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Approuver</button>}
                {detailTransaction.statut === 'approuve' && canDecaisserEncaisserTransaction(detailTransaction.montant_chiffre) && <button onClick={() => updateStatut(detailTransaction.id, detailTransaction.type_operation === 'recette' ? 'encaisse' : 'decaisse').then(ok => ok && setDetailTransaction(null))} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200">{detailTransaction.type_operation === 'recette' ? <><ArrowUpCircle className="w-3.5 h-3.5 inline mr-1" />Encaisser</> : <><ArrowDownCircle className="w-3.5 h-3.5 inline mr-1" />Décaisser</>}</button>}
                {canSupprimer() && <button onClick={(e) => { e.stopPropagation(); supprimer(detailTransaction.id); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Supprimer</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
