import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';

interface PaiementFilters {
  searchTerm: string;
  filterStatut: string;
  filterType: string;
  filterAnnee: string;
  filterSection: string;
  filterClasse: string;
  filterDateDebut: string;
  filterDateFin: string;
}

export function usePaiements(filters: PaiementFilters) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [annulationModal, setAnnulationModal] = useState<{ open: boolean; paiementId: string | null }>({ open: false, paiementId: null });

  const { data: paiements = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.paiements.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredPaiements = useMemo(() => {
    return paiements.filter((p: any) => {
      const s = filters.searchTerm.toLowerCase();
      const matchesSearch = !s || (p.nom_eleve || '').toLowerCase().includes(s) || (p.matricule || '').toLowerCase().includes(s) || (p.numero_recu || '').toLowerCase().includes(s);
      const matchesStatut = filters.filterStatut === 'all' || p.statut === filters.filterStatut;
      const matchesType = filters.filterType === 'all' || p.type_paiement === filters.filterType;
      const matchesAnnee = filters.filterAnnee === 'all' || p.annee_scolaire === filters.filterAnnee;
      const matchesSection = filters.filterSection === 'all' || p.section === filters.filterSection;
      const matchesClasse = filters.filterClasse === 'all' || p.classe === filters.filterClasse;
      const matchesDateDebut = !filters.filterDateDebut || p.date_paiement >= filters.filterDateDebut;
      const matchesDateFin = !filters.filterDateFin || p.date_paiement <= filters.filterDateFin;
      return matchesSearch && matchesStatut && matchesType && matchesAnnee && matchesSection && matchesClasse && matchesDateDebut && matchesDateFin;
    });
  }, [paiements, filters]);

  const stats = useMemo(() => {
    const total = filteredPaiements.length;
    const encaisse = filteredPaiements.filter((p: any) => p.statut === 'encaisse').length;
    const enAttente = filteredPaiements.filter((p: any) => p.statut === 'en_attente').length;
    const annule = filteredPaiements.filter((p: any) => p.statut === 'annule').length;
    const totalMontant = filteredPaiements.reduce((sum: number, p: any) => sum + (p.montant_paye || 0), 0);
    return { total, encaisse, enAttente, annule, totalMontant };
  }, [filteredPaiements]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredPaiements.length && filteredPaiements.length > 0 ? new Set() : new Set(filteredPaiements.map((p: any) => p.id)));
  }, [filteredPaiements]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.paiements.all });

  return {
    paiements: filteredPaiements,
    allPaiements: paiements,
    loading,
    stats,
    selectedIds, setSelectedIds,
    bulkActionLoading, setBulkActionLoading,
    annulationModal, setAnnulationModal,
    toggleSelectOne, toggleSelectAll,
    invalidate,
  };
}
