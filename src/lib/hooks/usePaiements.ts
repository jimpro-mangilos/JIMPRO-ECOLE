import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export interface Paiement {
  id: string; numero_recu: string; eleve_id: string; nom_eleve: string; matricule: string;
  postnom: string; prenom: string; classe: string; sexe: string; section: string;
  option: string | null; telephone: string; domicile: string; lieu_naissance: string | null;
  date_naissance: string | null; responsable: string | null; photo_url: string | null;
  type_paiement: string; description: string | null; montant_paye: number;
  montant_en_lettre: string; mode_paiement: string; date_paiement: string;
  comptable_id: string; nom_comptable: string; est_encaisse: boolean;
  date_encaissement: string | null; encaisseur_id?: string; nom_encaisseur?: string | null;
  annee_scolaire: string | null; motif_id: string | null; motif_libelle: string;
  created_at: string; statut: 'en_attente' | 'encaisse' | 'annule';
  motif_annulation: string | null; annule_par: string | null;
  nom_annuleur: string | null; date_annulation: string | null;
}

export function getStatut(p: Paiement): 'en_attente' | 'encaisse' | 'annule' {
  if (p.statut) return p.statut;
  return p.est_encaisse ? 'encaisse' : 'en_attente';
}

interface PaiementFilters {
  searchTerm: string;
  filterType: string[];
  filterStatut: string[];
  filterMotifs: string[];
  filterYear: string[];
  filterEncaisseur: string[];
  filterSection: string[];
  filterOption: string[];
  filterClasse: string[];
  filterDateDebut: string;
  filterDateFin: string;
  viewMode: 'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif';
}

export function usePaiements(filters: PaiementFilters) {
  const { user, userProfile, canEncaisser, canAnnulerPaiement, canSupprimerPaiement, isItManager, isPromoteur, isCoordonnateur, isSecretary, currentSchoolId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [annulationModal, setAnnulationModal] = useState<{ open: boolean; paiementId: string | null; motif: string; loading: boolean }>(
    { open: false, paiementId: null, motif: '', loading: false }
  );
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['__first__']));

  // ─── Data Queries ──────────────────────────────────────────────────────────
  const { data: paiements = [], isLoading: loading } = useQuery({
    queryKey: [...queryKeys.paiements.all, 'v3'],
    queryFn: async () => {
      const PAGE = 1000;
      let all: Paiement[] = [];
      let from = 0;
      while (true) {
        const to = from + PAGE - 1;
        const { data, error } = await supabase.from('paiements').select('*').order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as Paiement[]);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    staleTime: 0,
  });

  const { data: typesPaiement = [] } = useQuery({
    queryKey: queryKeys.typesPaiement.active,
    queryFn: async () => {
      const { data, error } = await supabase.from('types_paiement').select('*').eq('is_active', true).order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('paiements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.paiements.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredPaiements = useMemo(() => {
    let filtered = [...paiements];

    // View mode pre-filter
    if (filters.viewMode === 'journalier') {
      const today = new Date().toLocaleDateString('fr-CA');
      filtered = filtered.filter(p => new Date(p.date_paiement).toLocaleDateString('fr-CA') === today);
    } else if (filters.viewMode === 'jour_precedent') {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const ys = yesterday.toLocaleDateString('fr-CA');
      filtered = filtered.filter(p => new Date(p.date_paiement).toLocaleDateString('fr-CA') === ys);
    } else if (filters.viewMode === 'mois') {
      const now = new Date();
      filtered = filtered.filter(p => { const d = new Date(p.date_paiement); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else if (filters.viewMode === 'mois_precedent') {
      const now = new Date(); const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1; const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = filtered.filter(p => { const d = new Date(p.date_paiement); return d.getMonth() === pm && d.getFullYear() === py; });
    } else if (filters.viewMode === 'compte_actif') {
      filtered = filtered.filter(p => p.comptable_id === user?.id || getStatut(p) === 'en_attente');
    }

    if (filters.searchTerm) {
      const s = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.numero_recu.toLowerCase().includes(s) || p.nom_eleve.toLowerCase().includes(s) || p.classe.toLowerCase().includes(s));
    }
    if (filters.filterType.length > 0) filtered = filtered.filter(p => filters.filterType.includes(p.type_paiement));
    if (filters.filterStatut.length > 0) filtered = filtered.filter(p => filters.filterStatut.includes(getStatut(p)));
    if (filters.filterMotifs.length > 0) filtered = filtered.filter(p => filters.filterMotifs.includes(p.motif_libelle));
    if (filters.filterYear.length > 0) filtered = filtered.filter(p => filters.filterYear.includes(new Date(p.date_paiement).getFullYear().toString()));
    if (filters.filterEncaisseur.length > 0) filtered = filtered.filter(p => filters.filterEncaisseur.includes(p.nom_encaisseur || ''));
    if (filters.filterSection.length > 0) filtered = filtered.filter(p => filters.filterSection.includes(p.section));
    if (filters.filterOption.length > 0) filtered = filtered.filter(p => filters.filterOption.includes(p.option || ''));
    if (filters.filterClasse.length > 0) filtered = filtered.filter(p => filters.filterClasse.includes(p.classe));
    if (filters.filterDateDebut) filtered = filtered.filter(p => new Date(p.created_at).toLocaleDateString('fr-CA') >= filters.filterDateDebut);
    if (filters.filterDateFin) filtered = filtered.filter(p => new Date(p.created_at).toLocaleDateString('fr-CA') <= filters.filterDateFin);

    return filtered;
  }, [paiements, filters, user?.id]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const actifs = filteredPaiements.filter(p => getStatut(p) !== 'annule');
    return {
      total: filteredPaiements.length,
      totalEncaisse: actifs.filter(p => getStatut(p) === 'encaisse').reduce((s, p) => s + p.montant_paye, 0),
      totalEnAttente: actifs.filter(p => getStatut(p) === 'en_attente').reduce((s, p) => s + p.montant_paye, 0),
      totalAnnule: filteredPaiements.filter(p => getStatut(p) === 'annule').reduce((s, p) => s + p.montant_paye, 0),
    };
  }, [filteredPaiements]);

  // ─── Motif options for filter ──────────────────────────────────────────────
  const motifOptions = useMemo(() => {
    const motifs = paiements.map(p => p.motif_libelle).filter((m): m is string => !!m && m.trim() !== '');
    return Array.from(new Set(motifs)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  // ─── Date grouping ─────────────────────────────────────────────────────────
  const dateGroups = useMemo(() => {
    const groups = new Map<string, Paiement[]>();
    for (const p of filteredPaiements) {
      const key = new Date(p.date_paiement).toLocaleDateString('fr-FR');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries());
  }, [filteredPaiements]);

  const toggleDate = useCallback((dateKey: string) => {
    setExpandedDates(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; });
  }, []);

  const expandAllDates = useCallback(() => setExpandedDates(new Set(dateGroups.map(([k]) => k))), [dateGroups]);
  const collapseAllDates = useCallback(() => setExpandedDates(new Set()), []);
  const allExpanded = dateGroups.length > 0 && dateGroups.every(([k]) => expandedDates.has(k));

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredPaiements.length && filteredPaiements.length > 0 ? new Set() : new Set(filteredPaiements.map(p => p.id)));
  }, [filteredPaiements]);

  // ─── Operations ────────────────────────────────────────────────────────────
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.paiements.all }), [queryClient]);

  const canEncaisserMontant = useCallback((montant: number) => {
    if (montant === 0) return isItManager() || isPromoteur() || isCoordonnateur() || isSecretary();
    return canEncaisser();
  }, [canEncaisser, isItManager, isPromoteur, isCoordonnateur, isSecretary]);

  const encaisser = useCallback(async (paiementId: string, montant: number) => {
    if (!canEncaisserMontant(montant)) {
       toast.error(montant === 0 ? 'Seuls Promoteur, Coordonnateur, Secrétaire et IT Manager peuvent encaisser les paiements à 0' : 'Seuls admins, comptables, Promoteur et IT Manager peuvent encaisser');
      return;
    }
    if (!confirm("Confirmer l'encaissement ?")) return;
    const { error } = await supabase.from('paiements').update({
      est_encaisse: true, statut: 'encaisse', date_encaissement: new Date().toISOString(),
      encaisseur_id: user?.id, nom_encaisseur: `${userProfile?.prenom} ${userProfile?.nom}`,
      ecole_id: currentSchoolId,
    }).eq('id', paiementId);
    if (error) {  toast.error("Erreur d'encaissement: " + error.message); return; }
     toast.success('Paiement encaissé avec succès');
    invalidate();
  }, [canEncaisserMontant, user, userProfile, invalidate]);

  const openAnnulation = useCallback((paiementId: string) => {
    setAnnulationModal({ open: true, paiementId, motif: '', loading: false });
  }, []);

  const closeAnnulation = useCallback(() => {
    setAnnulationModal({ open: false, paiementId: null, motif: '', loading: false });
  }, []);

  const handleAnnuler = useCallback(async () => {
    if (!annulationModal.paiementId) return;
    if (!annulationModal.motif.trim()) {  toast.error('Veuillez saisir un motif'); return; }
    setAnnulationModal(p => ({ ...p, loading: true }));
    const { error } = await supabase.from('paiements').update({
      statut: 'annule', motif_annulation: annulationModal.motif.trim(),
      annule_par: user?.id, nom_annuleur: `${userProfile?.prenom} ${userProfile?.nom}`,
      date_annulation: new Date().toISOString(),
      ecole_id: currentSchoolId,
    }).eq('id', annulationModal.paiementId);
    if (error) {  toast.error("Erreur d'annulation: " + error.message); setAnnulationModal(p => ({ ...p, loading: false })); return; }
    closeAnnulation();
    invalidate();
  }, [annulationModal, user, userProfile, closeAnnulation, invalidate]);

  const supprimer = useCallback(async (p: Paiement) => {
    const statut = getStatut(p);
    if (statut === 'encaisse' && !isItManager()) {  toast.error("Seul l'IT Manager peut supprimer un paiement encaissé"); return; }
    if (statut === 'annule' && !isItManager() && !canSupprimerPaiement()) {  toast.error('Permission insuffisante'); return; }
    if (!confirm('Supprimer définitivement ce paiement ?')) return;
    const { error } = await supabase.from('paiements').delete().eq('id', p.id);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    invalidate();
  }, [isItManager, canSupprimerPaiement, invalidate]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Supprimer définitivement ${ids.length} paiement(s) ?`)) return;
    setBulkDeleting(true);
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const { error } = await supabase.from('paiements').delete().in('id', ids.slice(i, i + 50));
        if (error) throw error;
      }
      setSelectedIds(new Set());
      invalidate();
    } catch (err: any) {  toast.error('Erreur: ' + err.message); }
    finally { setBulkDeleting(false); }
  }, [selectedIds, invalidate]);

  const editPaiement = useCallback(async (paiementId: string, formData: { montant_paye: number; montant_en_lettre: string; motif_libelle: string; mode_paiement: string; date_paiement: string; annee_scolaire: string }) => {
    const { error } = await supabase.from('paiements').update({ ...formData, ecole_id: currentSchoolId }).eq('id', paiementId);
    if (error) {  toast.error('Erreur modification: ' + error.message); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  return {
    paiements: filteredPaiements,
    allPaiements: paiements,
    typesPaiement,
    loading,
    stats,
    motifOptions,
    dateGroups,
    expandedDates,
    toggleDate, expandAllDates, collapseAllDates, allExpanded,
    selectedIds, bulkDeleting,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    annulationModal, setAnnulationModal, openAnnulation, closeAnnulation, handleAnnuler,
    encaisser, canEncaisserMontant,
    supprimer, editPaiement,
    invalidate,
    getStatut,
  };
}
