import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

export function useConfiguration() {
  const queryClient = useQueryClient();
  const { currentSchoolId } = useAuth();
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sections.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.options.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.motifsPaiement.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.typesPaiement.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.anneesScolaires.all });
  }, [queryClient]);

  // ─── Section Prefixes ──────────────────────────────────────────────────────
  const { data: sectionPrefixes = [] } = useQuery({
    queryKey: ['sectionPrefixes'],
    queryFn: async () => { const { data, error } = await db.from('section_prefixes').select('*').order('ordre'); if (error) throw error; return data ?? []; },
    staleTime: 5 * 60 * 1000,
  });

  const upsertPrefix = useCallback(async (form: { section: string; libelle: string; prefix: string; is_active: boolean }, id?: string) => {
    if (id) {
      const { error } = await db.from('section_prefixes').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await db.from('section_prefixes').insert([{ ...form, ecole_id: currentSchoolId }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['sectionPrefixes'] });
  }, [queryClient, currentSchoolId]);

  const deletePrefix = useCallback(async (id: string) => {
    const { error } = await db.from('section_prefixes').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['sectionPrefixes'] });
  }, [queryClient]);

  // ─── Types Uniforme ────────────────────────────────────────────────────────
  const { data: typesUniforme = [] } = useQuery({
    queryKey: ['typesUniforme'],
    queryFn: async () => { const { data, error } = await db.from('types_uniforme').select('*').order('ordre'); if (error) throw error; return data ?? []; },
    staleTime: 5 * 60 * 1000,
  });

  const upsertTypeUniforme = useCallback(async (form: { libelle: string; description: string; is_active: boolean }, id?: string) => {
    if (id) {
      const { error } = await db.from('types_uniforme').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await db.from('types_uniforme').insert([{ ...form, ecole_id: currentSchoolId }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['typesUniforme'] });
  }, [queryClient, currentSchoolId]);

  const deleteTypeUniforme = useCallback(async (id: string) => {
    const { error } = await db.from('types_uniforme').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['typesUniforme'] });
  }, [queryClient]);

  // ─── Sections ──────────────────────────────────────────────────────────────
  const upsertSection = useCallback(async (form: { nom: string; description: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('sections').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('sections').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.sections.all });
  }, [queryClient, currentSchoolId]);

  const deleteSection = useCallback(async (id: string) => {
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.sections.all });
  }, [queryClient]);

  // ─── Options ───────────────────────────────────────────────────────────────
  const upsertOption = useCallback(async (form: { nom: string; section_id: string; description: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('options').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('options').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.options.all });
  }, [queryClient, currentSchoolId]);

  const deleteOption = useCallback(async (id: string) => {
    const { error } = await supabase.from('options').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.options.all });
  }, [queryClient]);

  // ─── Classes ───────────────────────────────────────────────────────────────
  const upsertClasse = useCallback(async (form: { nom: string; section_id: string; option_id: string; niveau: string; designation: string; description: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('classes').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('classes').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
  }, [queryClient, currentSchoolId]);

  const deleteClasse = useCallback(async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
  }, [queryClient]);

  // ─── Motifs ────────────────────────────────────────────────────────────────
  const upsertMotif = useCallback(async (form: { libelle: string; description: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('motifs_paiement').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('motifs_paiement').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.motifsPaiement.all });
  }, [queryClient, currentSchoolId]);

  const deleteMotif = useCallback(async (id: string) => {
    const { error } = await supabase.from('motifs_paiement').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.motifsPaiement.all });
  }, [queryClient]);

  // ─── Types Paiement ────────────────────────────────────────────────────────
  const upsertTypePaiement = useCallback(async (form: { libelle: string; description: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('types_paiement').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('types_paiement').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.typesPaiement.all });
  }, [queryClient, currentSchoolId]);

  const deleteTypePaiement = useCallback(async (id: string) => {
    const { error } = await supabase.from('types_paiement').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.typesPaiement.all });
  }, [queryClient]);

  // ─── Années Scolaires ──────────────────────────────────────────────────────
  const upsertAnneeScolaire = useCallback(async (form: { annee: string; date_debut: string; date_fin: string; is_active: boolean }, id?: string, maxOrdre?: number) => {
    if (id) {
      const { error } = await supabase.from('annees_scolaires').update({ ...form, ecole_id: currentSchoolId }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('annees_scolaires').insert([{ ...form, ecole_id: currentSchoolId, ordre: (maxOrdre || 0) + 1 }]);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.anneesScolaires.all });
  }, [queryClient, currentSchoolId]);

  const deleteAnneeScolaire = useCallback(async (id: string) => {
    const { error } = await supabase.from('annees_scolaires').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.anneesScolaires.all });
  }, [queryClient]);

  return {
    sectionPrefixes, upsertPrefix, deletePrefix,
    typesUniforme, upsertTypeUniforme, deleteTypeUniforme,
    upsertSection, deleteSection,
    upsertOption, deleteOption,
    upsertClasse, deleteClasse,
    upsertMotif, deleteMotif,
    upsertTypePaiement, deleteTypePaiement,
    upsertAnneeScolaire, deleteAnneeScolaire,
    invalidateAll,
  };
}
