import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, CheckCircle, ArrowDownCircle, ArrowUpCircle, Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronsUpDown, Filter, User, Calendar, CalendarDays, ChevronsDownUp, RotateCcw, FileDown, LayoutDashboard, Clock, Pencil, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { generateFinancesReport } from '../utils/pdfGenerator';
import { montantEnLettres } from '../utils/numberToWords';
import { PieChart } from '../components/PieChart';

type Transaction = Database['public']['Tables']['compte_courant']['Row'];

type SortField = 'date_transaction' | 'montant_chiffre';
type SortDir = 'asc' | 'desc';

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  approuve: 'Approuve',
  decaisse: 'Decaisse',
  encaisse: 'Encaisse',
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  approuve: 'bg-blue-100 text-blue-700',
  decaisse: 'bg-red-100 text-red-700',
  encaisse: 'bg-green-100 text-green-700',
};

export default function Finances() {
  const { isAdmin, isItManager, isComptable, isCoordonnateur, isSecretary, isPromoteur, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'en_attente' | 'approuve' | 'decaisse' | 'encaisse'>('all');
  const [filterComptable, setFilterComptable] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [sortField, setSortField] = useState<SortField>('date_transaction');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recette' | 'depense'>('recette');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['__first__']));
  const [viewMode, setViewMode] = useState<'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif'>('compte_actif');
  const isStrictComptable = isComptable() && !isItManager();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState({
    montant_chiffre: 0,
    montant_lettre: '',
    beneficiaire: '',
    libelle: '',
    telephone: '',
    type_operation: 'recette',
  });
  const [editModal, setEditModal] = useState<{ open: boolean; transaction: Transaction | null; loading: boolean }>({ open: false, transaction: null, loading: false });
  const [editFormData, setEditFormData] = useState({
    montant_chiffre: 0,
    montant_lettre: '',
    beneficiaire: '',
    libelle: '',
    telephone: '',
    type_operation: 'recette',
    date_transaction: '',
    statut: 'en_attente',
  });
  const [pdfConfirmModal, setPdfConfirmModal] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);

  const canApprouver = () => isAdmin() || isItManager() || isCoordonnateur() || isPromoteur();
  const canApprouverTransaction = (montant: number) => {
    if (isItManager() || isPromoteur() || isAdmin()) return true;
    if (isCoordonnateur()) return montant <= 300000;
    return false;
  };
  const canDecaisserEncaisser = () => isItManager() || isComptable() || isPromoteur();
  const canDecaisserTransaction = (montant: number) => {
    if (montant === 0) {
      return isItManager() || isCoordonnateur() || isSecretary();
    }
    return isItManager() || isComptable();
  };
  const canDecaisserEncaisserTransaction = (montant: number) => {
    if (montant === 0) {
      return isItManager() || isPromoteur() || isCoordonnateur() || isSecretary();
    }
    return isItManager() || isComptable() || isPromoteur();
  };
  const canSupprimer = () => isItManager() || isAdmin();
  const canCreerTransaction = () => isItManager() || isAdmin() || isSecretary();
  const canModifier = () => isItManager() || isAdmin();

  const openEditModal = (t: Transaction) => {
    setEditFormData({
      montant_chiffre: t.montant_chiffre,
      montant_lettre: t.montant_lettre || '',
      beneficiaire: t.beneficiaire,
      libelle: t.libelle,
      telephone: t.telephone || '',
      type_operation: t.type_operation,
      date_transaction: t.date_transaction ? t.date_transaction.split('T')[0] : '',
      statut: t.statut || 'en_attente',
    });
    setEditModal({ open: true, transaction: t, loading: false });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.transaction) return;
    setEditModal(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase
        .from('compte_courant')
        .update({
          montant_chiffre: editFormData.montant_chiffre,
          montant_lettre: editFormData.montant_lettre,
          beneficiaire: editFormData.beneficiaire,
          libelle: editFormData.libelle,
          telephone: editFormData.telephone,
          type_operation: editFormData.type_operation as 'recette' | 'dépense',
          date_transaction: editFormData.date_transaction,
          statut: editFormData.statut,
        })
        .eq('id', editModal.transaction.id);
      if (error) throw error;
      await loadTransactions();
      setEditModal({ open: false, transaction: null, loading: false });
    } catch (error) {
      console.error('Erreur modification:', error);
      alert('Erreur lors de la modification');
      setEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  const currentUserFullName = profile ? `${profile.prenom} ${profile.nom}`.trim() : '';

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel('finances-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compte_courant' }, () => {
        loadTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isStrictComptable && viewMode === 'general') {
      setViewMode('compte_actif');
    }
  }, [isStrictComptable, viewMode]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('compte_courant')
        .select('*')
        .order('date_transaction', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatut = async (id: string, newStatut: string) => {
    setActionLoading(id + newStatut);
    try {
      const updateData: Record<string, any> = { statut: newStatut };
      if (newStatut === 'approuve' && currentUserFullName) {
        updateData.nom_approbateur = currentUserFullName;
      }
      if ((newStatut === 'encaisse' || newStatut === 'decaisse') && currentUserFullName) {
        updateData.nom_encaisseur = currentUserFullName;
      }
      const { error } = await (supabase as any)
        .from('compte_courant')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      await loadTransactions();
    } catch (error) {
      console.error('Erreur mise a jour statut:', error);
      alert('Erreur lors de la mise a jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSupprimer = async (id: string) => {
    if (!confirm('Confirmer la suppression de cette transaction ?')) return;
    setActionLoading(id + 'delete');
    try {
      const { error } = await supabase.from('compte_courant').delete().eq('id', id);
      if (error) throw error;
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      await loadTransactions();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Confirmer la suppression de ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''} ?`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('compte_courant').delete().in('id', [...selectedIds]);
      if (error) throw error;
      setSelectedIds(new Set());
      await loadTransactions();
    } catch (error) {
      console.error('Erreur suppression en masse:', error);
      alert('Erreur lors de la suppression en masse');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await (supabase as any).from('compte_courant').insert([{
        ...formData,
        nom_comptable: currentUserFullName || null,
      }]);
      if (error) throw error;
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Erreur:', error);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const resetForm = () => {
    setFormData({
      montant_chiffre: 0,
      montant_lettre: '',
      beneficiaire: '',
      libelle: '',
      telephone: '',
      type_operation: 'recette',
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  const comptableOptions = useMemo(() => {
    const names = [
      ...transactions.map((t) => t.nom_comptable),
      ...transactions.map((t) => t.nom_approbateur),
      ...transactions.map((t) => (t as any).nom_encaisseur),
    ].filter((n): n is string => !!n);
    return Array.from(new Set(names)).sort();
  }, [transactions]);

  const yearOptions = useMemo(() => {
    const years = transactions
      .map((t) => new Date(t.date_transaction).getFullYear())
      .filter((y) => !isNaN(y));
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [transactions]);

  const viewFilteredTransactions = useMemo(() => {
    if (viewMode === 'journalier') {
      const today = new Date().toLocaleDateString('fr-CA');
      return transactions.filter(t => new Date(t.date_transaction).toLocaleDateString('fr-CA') === today);
    }
    if (viewMode === 'jour_precedent') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('fr-CA');
      return transactions.filter(t => new Date(t.date_transaction).toLocaleDateString('fr-CA') === yesterdayStr);
    }
    if (viewMode === 'mois') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return transactions.filter(t => {
        const d = new Date(t.date_transaction);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }
    if (viewMode === 'mois_precedent') {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return transactions.filter(t => {
        const d = new Date(t.date_transaction);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    }
    if (viewMode === 'compte_actif') {
      return transactions.filter(t =>
        t.statut === 'en_attente' || t.statut === 'approuve' || ((t.statut === 'decaisse' || t.statut === 'encaisse') && t.nom_comptable === currentUserFullName)
      );
    }
    return transactions;
  }, [transactions, viewMode, currentUserFullName]);

  const applyFiltersAndSort = (list: Transaction[]) => {
    return list
      .filter((t) => {
        const search = searchTerm.toLowerCase();
        const matchSearch =
          t.beneficiaire.toLowerCase().includes(search) ||
          t.libelle.toLowerCase().includes(search) ||
          (t.nom_comptable || '').toLowerCase().includes(search) ||
          (t.nom_approbateur || '').toLowerCase().includes(search) ||
          ((t as any).nom_encaisseur || '').toLowerCase().includes(search);
        const matchStatut = filterStatut === 'all' || t.statut === filterStatut;
        const matchComptable = filterComptable === 'all' || t.nom_comptable === filterComptable || t.nom_approbateur === filterComptable || (t as any).nom_encaisseur === filterComptable;
        const txDate = new Date(t.date_transaction);
        const matchYear = filterYear === 'all' || txDate.getFullYear() === parseInt(filterYear);
        let matchDateRange = true;
        if (filterDateDebut) {
          const created = new Date(t.created_at).toLocaleDateString('fr-CA');
          if (created < filterDateDebut) matchDateRange = false;
        }
        if (filterDateFin) {
          const created = new Date(t.created_at).toLocaleDateString('fr-CA');
          if (created > filterDateFin) matchDateRange = false;
        }
        return matchSearch && matchStatut && matchComptable && matchYear && matchDateRange;
      })
      .sort((a, b) => {
        let valA: number | string = a[sortField];
        let valB: number | string = b[sortField];
        if (sortField === 'date_transaction') {
          valA = new Date(valA as string).getTime();
          valB = new Date(valB as string).getTime();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  };

  const allFiltered = applyFiltersAndSort(viewFilteredTransactions);
  const recettes = allFiltered.filter((t) => t.type_operation === 'recette');
  const depenses = allFiltered.filter((t) => t.type_operation === 'dépense');

  const totalRecettes = allFiltered
    .filter((t) => t.type_operation === 'recette' && t.statut === 'encaisse')
    .reduce((acc, t) => acc + t.montant_chiffre, 0);
  const totalDepenses = allFiltered
    .filter((t) => t.type_operation === 'dépense' && t.statut === 'decaisse')
    .reduce((acc, t) => acc + t.montant_chiffre, 0);
  const solde = totalRecettes - totalDepenses;
  const totalEnAttente = allFiltered.filter(t => t.statut === 'en_attente').reduce((s, t) => s + t.montant_chiffre, 0);
  const totalApprouves = allFiltered.filter(t => t.statut === 'approuve').reduce((s, t) => s + t.montant_chiffre, 0);

  const pieChartData = useMemo(() => {
    const recettesTotal = allFiltered
      .filter(t => t.type_operation === 'recette')
      .reduce((s, t) => s + t.montant_chiffre, 0);
    const depensesTotal = allFiltered
      .filter(t => t.type_operation === 'dépense')
      .reduce((s, t) => s + t.montant_chiffre, 0);
    return [
      { label: 'Recettes', value: recettesTotal, color: '#10b981' },
      { label: 'Depenses', value: depensesTotal, color: '#ef4444' },
    ];
  }, [allFiltered]);

  const groupByDate = (list: Transaction[]): [string, Transaction[]][] => {
    const groups = new Map<string, Transaction[]>();
    for (const t of list) {
      const key = new Date(t.date_transaction).toLocaleDateString('fr-FR');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries());
  };

  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const expandAll = (list: Transaction[]) => {
    const allDates = new Set(list.map((t) => new Date(t.date_transaction).toLocaleDateString('fr-FR')));
    setExpandedDates(allDates);
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split('/');
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderBlock = (list: Transaction[], type: 'recette' | 'dépense') => {
    const isRecette = type === 'recette';
    const groupTotal = list
      .filter((t) => isRecette ? t.statut === 'encaisse' : t.statut === 'decaisse')
      .reduce((acc, t) => acc + t.montant_chiffre, 0);
    const dateGroups = groupByDate(list);
    const allExpanded = dateGroups.length > 0 && dateGroups.every(([key]) => expandedDates.has(key));

    return (
      <div className={`flex flex-col rounded-xl shadow-sm border-2 overflow-hidden ${isRecette ? 'border-green-200' : 'border-red-200'}`}>
        <div className={`px-5 py-4 ${isRecette ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isRecette ? 'bg-green-500' : 'bg-red-500'}`}>
                {isRecette
                  ? <TrendingUp className="w-5 h-5 text-white" />
                  : <TrendingDown className="w-5 h-5 text-white" />
                }
              </div>
              <div>
                <h2 className="font-bold text-white text-base">
                  {isRecette ? 'Entrees' : 'Depenses'}
                </h2>
                <p className="text-xs text-white/70 mt-0.5">
                  {list.length} transaction{list.length !== 1 ? 's' : ''} &middot; {dateGroups.length} jour{dateGroups.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dateGroups.length > 1 && (
                <button
                  onClick={() => allExpanded ? collapseAll() : expandAll(list)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
                >
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                  {allExpanded ? 'Replier' : 'Deplier'}
                </button>
              )}
              <div className="text-right">
                <p className="text-xs text-white/70">{isRecette ? 'Total encaisse' : 'Total decaisse'}</p>
                <p className="font-bold text-white text-lg mt-0.5">
                  {isRecette ? '+' : '-'}{groupTotal.toLocaleString()} FC
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-y-auto" style={{ maxHeight: '560px' }}>
          {list.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="flex flex-col items-center gap-2">
                {isRecette
                  ? <TrendingUp className="w-8 h-8 text-gray-200" />
                  : <TrendingDown className="w-8 h-8 text-gray-200" />
                }
                <p className="text-sm text-gray-400">Aucune transaction</p>
              </div>
            </div>
          ) : (
            dateGroups.map(([dateKey, items], idx) => {
              const isOpen = expandedDates.has(dateKey) || (idx === 0 && expandedDates.has('__first__'));
              const dayTotal = items.reduce((acc, t) => acc + t.montant_chiffre, 0);

              return (
                <div key={dateKey} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => {
                      if (idx === 0 && expandedDates.has('__first__') && !expandedDates.has(dateKey)) {
                        const next = new Set(expandedDates);
                        next.delete('__first__');
                        setExpandedDates(next);
                      } else {
                        toggleDate(dateKey);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                      <div className={`w-1 h-6 rounded-full ${isRecette ? 'bg-green-400' : 'bg-red-400'}`} />
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700 capitalize">
                        {formatDateLong(dateKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {items.length} op.
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isRecette ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isRecette ? '+' : '-'}{dayTotal.toLocaleString()} FC
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                            {canSupprimer() && (
                              <th className="px-2 py-2 w-8">
                                <input
                                  type="checkbox"
                                  checked={items.length > 0 && items.every(t => selectedIds.has(t.id))}
                                  onChange={() => toggleSelectAll(items.map(t => t.id))}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                            )}
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Beneficiaire</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Libelle</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Statut</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Montant</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Responsable</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((t) => (
                            <tr
                              key={t.id}
                              onClick={() => setDetailTransaction(t)}
                              className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.has(t.id) ? 'bg-blue-50/50' : ''}`}
                            >
                              {canSupprimer() && (
                                <td className="px-2 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(t.id)}
                                    onChange={() => toggleSelect(t.id)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2.5 max-w-[120px]">
                                <div className="text-xs font-medium text-gray-900 truncate" title={t.beneficiaire}>{t.beneficiaire}</div>
                              </td>
                              <td className="px-3 py-2.5 max-w-[160px]">
                                <div className="text-xs text-gray-600 truncate" title={t.libelle}>{t.libelle}</div>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUT_COLORS[t.statut] || 'bg-gray-100 text-gray-600'}`}>
                                  {STATUT_LABELS[t.statut] || t.statut}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`text-xs font-bold ${isRecette ? 'text-green-600' : 'text-red-600'}`}>
                                  {isRecette ? '+' : '-'}{t.montant_chiffre.toLocaleString()} FC
                                </span>
                              </td>
                              <td className="px-3 py-2.5 max-w-[130px]">
                                <div className="space-y-0.5">
                                  {t.nom_comptable && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span className="text-xs text-gray-600 truncate" title={`Createur: ${t.nom_comptable}`}>{t.nom_comptable}</span>
                                    </div>
                                  )}
                                  {t.nom_approbateur && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-blue-400 shrink-0" />
                                      <span className="text-xs text-gray-600 truncate" title={`Approbateur: ${t.nom_approbateur}`}>{t.nom_approbateur}</span>
                                    </div>
                                  )}
                                  {(t as any).nom_encaisseur && (
                                    <div className="flex items-center gap-1">
                                      {t.type_operation === 'recette'
                                        ? <ArrowUpCircle className="w-3 h-3 text-green-500 shrink-0" />
                                        : <ArrowDownCircle className="w-3 h-3 text-red-500 shrink-0" />
                                      }
                                      <span className="text-xs text-gray-600 truncate" title={`${t.type_operation === 'recette' ? 'Encaisseur' : 'Decaisseur'}: ${(t as any).nom_encaisseur}`}>{(t as any).nom_encaisseur}</span>
                                    </div>
                                  )}
                                  {!t.nom_comptable && !t.nom_approbateur && !(t as any).nom_encaisseur && (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  {t.statut === 'en_attente' && canApprouverTransaction(t.montant_chiffre) && (
                                    <button
                                      onClick={() => handleUpdateStatut(t.id, 'approuve')}
                                      disabled={actionLoading === t.id + 'approuve'}
                                      title="Approuver"
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </button>
                                  )}
                                  {t.statut === 'approuve' && !isRecette && canDecaisserTransaction(t.montant_chiffre) && (
                                    <button
                                      onClick={() => handleUpdateStatut(t.id, 'decaisse')}
                                      disabled={actionLoading === t.id + 'decaisse'}
                                      title="Decaisser"
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                                    >
                                      <ArrowDownCircle className="w-3 h-3" />
                                    </button>
                                  )}
                                  {t.statut === 'approuve' && isRecette && canDecaisserEncaisserTransaction(t.montant_chiffre) && (
                                    <button
                                      onClick={() => handleUpdateStatut(t.id, 'encaisse')}
                                      disabled={actionLoading === t.id + 'encaisse'}
                                      title="Encaisser"
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50"
                                    >
                                      <ArrowUpCircle className="w-3 h-3" />
                                    </button>
                                  )}
                                  {canModifier() && (
                                    <button
                                      onClick={() => openEditModal(t)}
                                      title="Modifier"
                                      className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  {canSupprimer() && (
                                    <button
                                      onClick={() => handleSupprimer(t.id)}
                                      disabled={actionLoading === t.id + 'delete'}
                                      title="Supprimer"
                                      className="p-1 rounded-lg bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors disabled:opacity-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
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
            })
          )}
        </div>

        {list.length > 0 && (
          <div className={`px-5 py-2.5 border-t text-xs font-medium ${isRecette ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {list.length} transaction{list.length !== 1 ? 's' : ''} — total {isRecette ? 'encaisse' : 'decaisse'} :&nbsp;
            <span className="font-bold">{isRecette ? '+' : '-'}{groupTotal.toLocaleString()} FC</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion Financiere</h1>
          <p className="text-gray-600 mt-1">Suivi des recettes et depenses</p>
        </div>
        {canCreerTransaction() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Transaction
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setViewMode('compte_actif')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'compte_actif'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Compte Actif
        </button>
        <button
          onClick={() => setViewMode('journalier')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'journalier'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Journalier
        </button>
        <button
          onClick={() => setViewMode('jour_precedent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'jour_precedent'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Jour Precedent
        </button>
        <button
          onClick={() => setViewMode('mois')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'mois'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Mois
        </button>
        <button
          onClick={() => setViewMode('mois_precedent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'mois_precedent'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Mois Precedent
        </button>
        {!isStrictComptable && (
          <button
            onClick={() => setViewMode('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'general'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            General
          </button>
        )}
      </div>

      {/* Stats + Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {/* KPI Cards - modern design */}
        <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-sm p-5 border border-emerald-100/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/40 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Recettes</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{totalRecettes.toLocaleString()} FC</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-white rounded-xl shadow-sm p-5 border border-rose-100/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-100/40 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-xs font-medium text-rose-700 uppercase tracking-wide">Depenses</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{totalDepenses.toLocaleString()} FC</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 to-white rounded-xl shadow-sm p-5 border border-sky-100/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-sky-100/40 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                </div>
                <span className="text-xs font-medium text-sky-700 uppercase tracking-wide">Solde</span>
              </div>
              <p className={`text-lg font-bold ${solde >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                {solde.toLocaleString()} FC
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-sm p-5 border border-amber-100/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/40 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">En attente</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{totalEnAttente.toLocaleString()} FC</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 to-white rounded-xl shadow-sm p-5 border border-cyan-100/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-100/40 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs font-medium text-cyan-700 uppercase tracking-wide">Approuves</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{totalApprouves.toLocaleString()} FC</p>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-4 flex items-center justify-center border border-gray-100">
          <PieChart
            data={pieChartData}
            title="Repartition"
            size={140}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher par beneficiaire, libelle, comptable, encaisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-gray-700 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />

            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value as typeof filterStatut)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="approuve">Approuve</option>
              <option value="decaisse">Decaisse</option>
              <option value="encaisse">Encaisse</option>
            </select>

            <select
              value={filterComptable}
              onChange={(e) => setFilterComptable(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="all">Tous (comptable, approbateur, encaisseur)</option>
              {comptableOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="all">Toutes les annees</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none"
                title="Date debut"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none"
                title="Date fin"
              />
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatut('all');
                setFilterComptable('all');
                setFilterApprobateur('all');
                setFilterYear('all');
                setFilterDateDebut('');
                setFilterDateFin('');
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reinitialiser
            </button>

            <button
              onClick={() => setPdfConfirmModal(true)}
              className="text-sm border border-blue-200 rounded-lg px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              Imprimer PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">Chargement...</div>
      ) : (
        <div>
          {canSupprimer() && selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-red-800">
                {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} selectionnee{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-600 hover:text-gray-800 underline"
              >
                Tout deselectionner
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting ? 'Suppression...' : 'Supprimer la selection'}
              </button>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setActiveTab('recette'); setSelectedIds(new Set()); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'recette'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Entrees ({recettes.length})
            </button>
            <button
              onClick={() => { setActiveTab('depense'); setSelectedIds(new Set()); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'depense'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Depenses ({depenses.length})
            </button>
          </div>

          {activeTab === 'recette' && renderBlock(recettes, 'recette')}
          {activeTab === 'depense' && renderBlock(depenses, 'dépense')}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle Transaction</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'Operation *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="recette"
                      checked={formData.type_operation === 'recette'}
                      onChange={(e) => setFormData({ ...formData, type_operation: e.target.value })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Recette</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="dépense"
                      checked={formData.type_operation === 'dépense'}
                      onChange={(e) => setFormData({ ...formData, type_operation: e.target.value })}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Depense</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FC) *</label>
                  <input
                    type="number"
                    required
                    value={formData.montant_chiffre}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const lettre = isNaN(val) || val <= 0 ? '' : montantEnLettres(val);
                      setFormData({ ...formData, montant_chiffre: val, montant_lettre: lettre });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant en Lettres *</label>
                  <input
                    type="text"
                    required
                    value={formData.montant_lettre}
                    onChange={(e) => setFormData({ ...formData, montant_lettre: e.target.value })}
                    placeholder="Rempli automatiquement"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiaire *</label>
                  <input
                    type="text"
                    required
                    value={formData.beneficiaire}
                    onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telephone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Libelle *</label>
                  <textarea
                    required
                    value={formData.libelle}
                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Modifier la transaction</h3>
              <button onClick={() => setEditModal({ open: false, transaction: null, loading: false })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'operation</label>
                  <select
                    value={editFormData.type_operation}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type_operation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="recette">Recette</option>
                    <option value="dépense">Depense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={editFormData.statut}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, statut: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="approuve">Approuve</option>
                    <option value="decaisse">Decaisse</option>
                    <option value="encaisse">Encaisse</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiaire</label>
                <input
                  type="text"
                  value={editFormData.beneficiaire}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, beneficiaire: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libelle</label>
                <input
                  type="text"
                  value={editFormData.libelle}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, libelle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FC)</label>
                  <input
                    type="number"
                    value={editFormData.montant_chiffre}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setEditFormData(prev => ({ ...prev, montant_chiffre: val, montant_lettre: montantEnLettres(val) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    value={editFormData.telephone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, telephone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de transaction</label>
                <input
                  type="date"
                  value={editFormData.date_transaction}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date_transaction: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {editFormData.montant_lettre && (
                <p className="text-xs text-gray-500 italic">{editFormData.montant_lettre}</p>
              )}
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={editModal.loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {editModal.loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, transaction: null, loading: false })}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pdfConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Imprimer le rapport financier</h3>
            <p className="text-sm text-gray-600 mb-6">Choisissez les donnees a inclure dans le PDF :</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const allForPdf = applyFiltersAndSort(transactions);
                  generateFinancesReport(allForPdf);
                  setPdfConfirmModal(false);
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-left flex items-center justify-between"
              >
                <span>Toutes les transactions</span>
                <span className="text-blue-200 text-sm">{applyFiltersAndSort(transactions).length} lignes</span>
              </button>
              <button
                onClick={() => {
                  generateFinancesReport(allFiltered);
                  setPdfConfirmModal(false);
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium text-left flex items-center justify-between"
              >
                <span>Vue actuelle uniquement</span>
                <span className="text-gray-500 text-sm">{allFiltered.length} lignes</span>
              </button>
            </div>
            <button
              onClick={() => setPdfConfirmModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {detailTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailTransaction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">Details de la transaction</h3>
              <button onClick={() => setDetailTransaction(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Type</span>
                  <p className={`text-sm font-bold mt-0.5 ${detailTransaction.type_operation === 'recette' ? 'text-green-600' : 'text-red-600'}`}>
                    {detailTransaction.type_operation === 'recette' ? 'Recette' : 'Depense'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Statut</span>
                  <p className="mt-0.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUT_COLORS[detailTransaction.statut] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUT_LABELS[detailTransaction.statut] || detailTransaction.statut}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Beneficiaire</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{detailTransaction.beneficiaire}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Libelle</span>
                <p className="text-sm text-gray-700 mt-0.5">{detailTransaction.libelle}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Montant en chiffres</span>
                  <p className={`text-sm font-bold mt-0.5 ${detailTransaction.type_operation === 'recette' ? 'text-green-600' : 'text-red-600'}`}>
                    {detailTransaction.type_operation === 'recette' ? '+' : '-'}{detailTransaction.montant_chiffre.toLocaleString()} FC
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Telephone</span>
                  <p className="text-sm text-gray-700 mt-0.5">{detailTransaction.telephone || '—'}</p>
                </div>
              </div>
              {detailTransaction.montant_lettre && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Montant en lettres</span>
                  <p className="text-sm text-gray-700 mt-0.5 italic">{detailTransaction.montant_lettre}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Date de transaction</span>
                  <p className="text-sm text-gray-700 mt-0.5">{new Date(detailTransaction.date_transaction).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Date de creation</span>
                  <p className="text-sm text-gray-700 mt-0.5">{new Date(detailTransaction.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">Intervenants</span>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <span className="text-xs text-gray-400">Createur (comptable)</span>
                      <p className="text-sm font-medium text-gray-900">{detailTransaction.nom_comptable || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-xs text-blue-400">Approbateur</span>
                      <p className="text-sm font-medium text-gray-900">{detailTransaction.nom_approbateur || '—'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${detailTransaction.type_operation === 'recette' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {detailTransaction.type_operation === 'recette'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <div>
                      <span className={`text-xs ${detailTransaction.type_operation === 'recette' ? 'text-green-500' : 'text-red-500'}`}>
                        {detailTransaction.type_operation === 'recette' ? 'Encaisseur' : 'Decaisseur'}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{(detailTransaction as any).nom_encaisseur || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDetailTransaction(null)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
