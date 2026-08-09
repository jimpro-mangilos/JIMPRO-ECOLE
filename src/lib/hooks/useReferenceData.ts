import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

// ─── Reference Data ───────────────────────────────────────────────────────────

export function useSections(currentSchoolId: string) {
  return useQuery({
    queryKey: [...queryKeys.sections.active, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, nom, description, is_active, ordre')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useOptions(currentSchoolId: string, sectionId?: string) {
  return useQuery({
    queryKey: [...(sectionId ? queryKeys.options.bySection(sectionId) : queryKeys.options.active), { schoolId: currentSchoolId }],
    queryFn: async () => {
      let query = db.from('options').select('id, nom, section_id, is_active, ordre').eq('ecole_id', currentSchoolId).eq('is_active', true).order('ordre');
      if (sectionId) query = query.eq('section_id', sectionId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useClasses(currentSchoolId: string) {
  return useQuery({
    queryKey: [...queryKeys.classes.active, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await db
        .from('classes')
        .select('id, nom, section_id, option_id, is_active, ordre')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMotifsPaiement(currentSchoolId: string) {
  return useQuery({
    queryKey: [...queryKeys.motifsPaiement.active, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motifs_paiement')
        .select('id, libelle, description, is_active, ordre')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTypesPaiement(currentSchoolId: string) {
  return useQuery({
    queryKey: [...queryKeys.typesPaiement.active, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('types_paiement')
        .select('id, libelle, description, is_active, ordre')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnneesScolaires(currentSchoolId: string) {
  return useQuery({
    queryKey: [...queryKeys.anneesScolaires.active, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annees_scolaires')
        .select('id, annee, date_debut, date_fin, is_active, ordre')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
