import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '../database.types';

export type Transaction = Database['public']['Tables']['compte_courant']['Row'];

export const STATUT_LABELS: Record<string, string> = { en_attente: 'En attente', approuve: 'Approuve', decaisse: 'Decaisse', encaisse: 'Encaisse' };
export const STATUT_COLORS: Record<string, string> = { en_attente: 'bg-amber-100 text-amber-700', approuve: 'bg-blue-100 text-blue-700', decaisse: 'bg-red-100 text-red-700', encaisse: 'bg-green-100 text-green-700' };

interface FinanceFilters {
  searchTerm: string;
  filterStatut: 'all' | 'en_attente' | 'approuve' | 'decaisse' | 'encaisse';
  filterComptable: string;
  filterYear: string;
  filterDateDebut: string;
  filterDateFin: string;
  viewMode: 'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif';
  sortField: 'date_transaction' | 'montant_chiffre';
  sortDir: 'asc' | 'desc';
}

export function useFinances(filters: FinanceFilters) {
  const { isAdmin, isItManager, isComptable, isCoordonnateur, isSecretary, isPromoteur, profile, currentSchoolId } = useAuth();
  const queryClient = useQueryClient();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['__first__']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentUserFullName = profile ? `${profile.prenom} ${profile.nom}`.trim() : '';

  // ─── Data ───────────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: [...queryKeys.finances.all, 'v3'],
    queryFn: async () => {
      const PAGE = 1000;
      let all: Transaction[] = [];
      let from = 0;
      while (true) {
        const to = from + PAGE - 1;
        const { data, error } = await supabase.from('compte_courant').select('*').order('date_transaction', { ascending: false }).range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as Transaction[]);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  // ─── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('finances-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compte_courant' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Permissions ───────────────────────────────────────────────────────────
  const canApprouver = () => isAdmin() || isItManager() || isCoordonnateur() || isPromoteur();
  const canApprouverTransaction = (montant: number) => isItManager() || isPromoteur() || isAdmin() || (isCoordonnateur() && montant <= 300000);
  const canDecaisserEncaisser = () => isItManager() || isComptable() || isPromoteur();
  const canDecaisserTransaction = (montant: number) => montant === 0 ? (isItManager() || isCoordonnateur() || isSecretary()) : (isItManager() || isComptable());
  const canDecaisserEncaisserTransaction = (montant: number) => montant === 0 ? (isItManager() || isPromoteur() || isCoordonnateur() || isSecretary()) : (isItManager() || isComptable() || isPromoteur());
  const canSupprimer = () => isItManager() || isAdmin();
  const canCreer = () => isItManager() || isAdmin() || isSecretary();
  const canModifier = () => isItManager() || isAdmin();

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // View mode
    if (filters.viewMode === 'journalier') {
      const today = new Date().toLocaleDateString('fr-CA');
      filtered = filtered.filter(t => new Date(t.date_transaction).toLocaleDateString('fr-CA') === today);
    } else if (filters.viewMode === 'jour_precedent') {
      const y = new Date(); y.setDate(y.getDate() - 1);
      filtered = filtered.filter(t => new Date(t.date_transaction).toLocaleDateString('fr-CA') === y.toLocaleDateString('fr-CA'));
    } else if (filters.viewMode === 'mois') {
      const now = new Date();
      filtered = filtered.filter(t => { const d = new Date(t.date_transaction); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else if (filters.viewMode === 'mois_precedent') {
      const now = new Date(); const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1; const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = filtered.filter(t => { const d = new Date(t.date_transaction); return d.getMonth() === pm && d.getFullYear() === py; });
    } else if (filters.viewMode === 'compte_actif') {
      filtered = filtered.filter(t => t.nom_comptable === currentUserFullName || t.statut === 'en_attente');
    }

    if (filters.searchTerm) {
      const s = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t => (t.beneficiaire || '').toLowerCase().includes(s) || (t.libelle || '').toLowerCase().includes(s));
    }
    if (filters.filterStatut !== 'all') filtered = filtered.filter(t => (t.statut || 'en_attente') === filters.filterStatut);
    if (filters.filterComptable !== 'all') filtered = filtered.filter(t => t.nom_comptable === filters.filterComptable || (t as any).nom_encaisseur === filters.filterComptable || t.nom_approbateur === filters.filterComptable);
    if (filters.filterYear !== 'all') filtered = filtered.filter(t => new Date(t.date_transaction).getFullYear().toString() === filters.filterYear);
    if (filters.filterDateDebut) filtered = filtered.filter(t => t.date_transaction >= filters.filterDateDebut);
    if (filters.filterDateFin) filtered = filtered.filter(t => t.date_transaction <= filters.filterDateFin);

    // Sort
    filtered.sort((a, b) => {
      if (filters.sortField === 'montant_chiffre') return filters.sortDir === 'asc' ? a.montant_chiffre - b.montant_chiffre : b.montant_chiffre - a.montant_chiffre;
      return filters.sortDir === 'asc' ? new Date(a.date_transaction).getTime() - new Date(b.date_transaction).getTime() : new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime();
    });

    return filtered;
  }, [transactions, filters, currentUserFullName]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRecettes = filteredTransactions.filter(t => t.type_operation === 'recette').reduce((s, t) => s + t.montant_chiffre, 0);
    const totalDepenses = filteredTransactions.filter(t => t.type_operation === 'dépense').reduce((s, t) => s + t.montant_chiffre, 0);
    const solde = totalRecettes - totalDepenses;
    const count = filteredTransactions.length;
    return { totalRecettes, totalDepenses, solde, count };
  }, [filteredTransactions]);

  // ─── Pie chart data ────────────────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Recettes', value: stats.totalRecettes },
    { name: 'Dépenses', value: stats.totalDepenses },
  ], [stats]);

  // ─── Comptable options for filter ──────────────────────────────────────────
  const comptableOptions = useMemo(() => {
    const names = [...transactions.map(t => t.nom_comptable), ...transactions.map(t => t.nom_approbateur), ...transactions.map(t => (t as any).nom_encaisseur)].filter((n): n is string => !!n);
    return Array.from(new Set(names)).sort();
  }, [transactions]);

  const years = useMemo(() => Array.from(new Set(transactions.map(t => new Date(t.date_transaction).getFullYear().toString()))).sort(), [transactions]);

  // ─── Date grouping ─────────────────────────────────────────────────────────
  const dateGroups = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of filteredTransactions) {
      const key = new Date(t.date_transaction).toLocaleDateString('fr-FR');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const toggleDate = useCallback((dateKey: string) => {
    setExpandedDates(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; });
  }, []);

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => ids.every(id => prev.has(id)) ? new Set() : new Set(ids));
  }, []);

  // ─── Operations ────────────────────────────────────────────────────────────
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.finances.all }), [queryClient]);

  const updateStatut = useCallback(async (id: string, newStatut: string) => {
    setActionLoading(id + newStatut);
    try {
      const updateData: Record<string, any> = { statut: newStatut };
      if (newStatut === 'approuve' && currentUserFullName) updateData.nom_approbateur = currentUserFullName;
      if ((newStatut === 'encaisse' || newStatut === 'decaisse') && currentUserFullName) updateData.nom_encaisseur = currentUserFullName;
      const { error } = await supabase.from('compte_courant').update({ ...updateData, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
      invalidate();
      return true;
    } catch (err) {  toast.error('Erreur mise à jour statut'); return false; }
    finally { setActionLoading(null); }
  }, [currentUserFullName, invalidate]);

  const supprimer = useCallback(async (id: string) => {
    if (!confirm('Supprimer cette transaction ?')) return;
    setActionLoading(id + 'delete');
    try {
      const { error } = await supabase.from('compte_courant').delete().eq('id', id);
      if (error) throw error;
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      invalidate();
    } catch (err) {  toast.error('Erreur suppression'); }
    finally { setActionLoading(null); }
  }, [invalidate]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Supprimer ${selectedIds.size} transaction(s) ?`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('compte_courant').delete().in('id', [...selectedIds]);
      if (error) throw error;
      setSelectedIds(new Set());
      invalidate();
    } catch (err) {  toast.error('Erreur suppression en masse'); }
    finally { setBulkDeleting(false); }
  }, [selectedIds, invalidate]);

  const createTransaction = useCallback(async (formData: { montant_chiffre: number; montant_lettre: string; beneficiaire: string; libelle: string; telephone: string; type_operation: string }) => {
    const { error } = await supabase.from('compte_courant').insert([{ ...formData, ecole_id: currentSchoolId, nom_comptable: currentUserFullName || null }]);
    if (error) {  toast.error('Erreur création: ' + error.message); return false; }
    invalidate();
    return true;
  }, [currentUserFullName, invalidate]);

  const editTransaction = useCallback(async (id: string, formData: Record<string, any>) => {
    const { error } = await supabase.from('compte_courant').update({ ...formData, ecole_id: currentSchoolId }).eq('id', id);
    if (error) {  toast.error('Erreur modification: ' + error.message); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading, stats, pieData,
    dateGroups, expandedDates, toggleDate,
    comptableOptions, years,
    selectedIds, bulkDeleting, actionLoading,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    canApprouver, canApprouverTransaction, canDecaisserEncaisser, canDecaisserTransaction, canDecaisserEncaisserTransaction,
    canSupprimer, canCreer, canModifier,
    updateStatut, supprimer, createTransaction, editTransaction,
    invalidate, currentUserFullName,
  };
}
