import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export interface DemandeAnnulation {
  id: string;
  ecole_id: string;
  paiement_id: string;
  motif: string;
  statut: 'en_attente' | 'approuvee' | 'refusee';
  demandeur_id: string | null;
  demandeur_nom: string | null;
  approuveur_id: string | null;
  approuveur_nom: string | null;
  date_demande: string;
  date_decision: string | null;
  motif_refus: string | null;
  created_at: string;
  paiement?: {
    numero_recu: string;
    nom_eleve: string;
    prenom: string;
    classe: string;
    montant_paye: number;
    statut: string;
  } | null;
}

/**
 * Gestion des demandes d'annulation de paiement :
 *  - le comptable soumet une demande (demanderAnnulation) ;
 *  - la hiérarchie (promoteur / it_manager / admin) approuve ou refuse.
 */
export function useDemandesAnnulation() {
  const { canDemanderAnnulation, isAnnulationApprover, currentSchoolId } = useAuth();
  const queryClient = useQueryClient();

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: [...queryKeys.demandesAnnulation.all, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demandes_annulation')
        .select(`*, paiement:paiements(numero_recu, nom_eleve, prenom, classe, montant_paye, statut)`)
        .eq('ecole_id', currentSchoolId)
        .order('date_demande', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DemandeAnnulation[];
    },
    enabled: !!currentSchoolId,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('demandes-annulation-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_annulation' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.demandesAnnulation.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.demandesAnnulation.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.paiements.all });
  }, [queryClient]);

  const demanderAnnulation = useCallback(async (paiementId: string, motif: string) => {
    if (!canDemanderAnnulation()) { toast.error('Seul le comptable peut demander une annulation'); return false; }
    if (!motif.trim()) { toast.error('Veuillez saisir un motif'); return false; }
    const { error } = await supabase.rpc('demander_annulation_paiement', {
      p_paiement_id: paiementId,
      p_motif: motif.trim(),
    });
    if (error) { toast.error("Erreur de demande: " + error.message); return false; }
    toast.success("Demande d'annulation envoyée à la hiérarchie");
    invalidate();
    return true;
  }, [canDemanderAnnulation, invalidate]);

  const approuverDemande = useCallback(async (demandeId: string) => {
    if (!isAnnulationApprover()) { toast.error('Permission insuffisante'); return false; }
    const { error } = await supabase.rpc('traiter_demande_annulation', {
      p_demande_id: demandeId,
      p_decision: 'approuvee',
      p_motif_refus: null,
    });
    if (error) { toast.error("Erreur d'approbation: " + error.message); return false; }
    toast.success('Annulation approuvée : le paiement a été annulé');
    invalidate();
    return true;
  }, [isAnnulationApprover, invalidate]);

  const refuserDemande = useCallback(async (demandeId: string, motifRefus: string) => {
    if (!isAnnulationApprover()) { toast.error('Permission insuffisante'); return false; }
    const { error } = await supabase.rpc('traiter_demande_annulation', {
      p_demande_id: demandeId,
      p_decision: 'refusee',
      p_motif_refus: motifRefus.trim() || null,
    });
    if (error) { toast.error('Erreur de refus: ' + error.message); return false; }
    toast.success('Demande refusée');
    invalidate();
    return true;
  }, [isAnnulationApprover, invalidate]);

  return {
    demandes,
    isLoading,
    demanderAnnulation,
    approuverDemande,
    refuserDemande,
  };
}
