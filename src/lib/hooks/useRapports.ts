import {} from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSections, useOptions, useClasses, useMotifsPaiement, useAnneesScolaires } from './useReferenceData';

export function useRapports() {
  const { currentSchoolId } = useAuth();
  const schoolId = currentSchoolId!;
  const { data: sections = [] } = useSections(schoolId);
  const { data: options = [] } = useOptions(schoolId);
  const { data: classes = [] } = useClasses(schoolId);
  const { data: motifs = [] } = useMotifsPaiement(schoolId);
  const { data: annees = [] } = useAnneesScolaires(schoolId);

  // ─── Finance filter data ───────────────────────────────────────────────────
  const { data: financeComptables = [] } = useQuery({
    queryKey: ['rapports', 'financeComptables'],
    queryFn: async () => {
      const { data } = await supabase.from('compte_courant').select('nom_comptable, nom_approbateur, nom_encaisseur').eq('ecole_id', schoolId);
      const set = new Set<string>();
      (data || []).forEach((r: any) => { if (r.nom_comptable) set.add(r.nom_comptable); if (r.nom_encaisseur) set.add(r.nom_encaisseur); });
      return Array.from(set).sort();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: financeApprobateurs = [] } = useQuery({
    queryKey: ['rapports', 'financeApprobateurs'],
    queryFn: async () => {
      const { data } = await supabase.from('compte_courant').select('nom_approbateur').eq('ecole_id', schoolId);
      const set = new Set<string>();
      (data || []).forEach((r: any) => { if (r.nom_approbateur) set.add(r.nom_approbateur); });
      return Array.from(set).sort();
    },
    staleTime: 10 * 60 * 1000,
  });

  // ─── Fourniture filter data ────────────────────────────────────────────────
  const { data: fournitureFilterData } = useQuery({
    queryKey: ['rapports', 'fournitureFilters'],
    queryFn: async () => {
      const [{ data: types }, { data: fournData }] = await Promise.all([
        supabase.from('types_uniforme').select('libelle').eq('ecole_id', schoolId).eq('is_active', true).order('ordre'),
        supabase.from('gestion_fournitures').select('section, classe').eq('ecole_id', schoolId).order('created_at'),
      ]);
      const classSet = new Set<string>();
      const sectionSet = new Set<string>();
      (fournData || []).forEach((f: any) => { if (f.section) sectionSet.add(f.section); if (f.classe) classSet.add(f.classe); });
      return {
        typesUniforme: (types || []).map((t: any) => t.libelle),
        sections: Array.from(sectionSet).sort(),
        classes: Array.from(classSet).sort(),
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  // ─── Map section names to IDs ──────────────────────────────────────────────
  const sectionMap: Record<string, string> = {};
  (sections as any[]).forEach((s: any) => { sectionMap[s.nom] = s.id; });
  const sectionIdToName: Record<string, string> = {};
  (sections as any[]).forEach((s: any) => { sectionIdToName[s.id] = s.nom; });

  const sectionNames = (sections as any[]).map((s: any) => s.nom);
  const optionNames = (options as any[]).map((o: any) => o.nom);
  const motifNames = (motifs as any[]).map((m: any) => m.libelle);
  const anneeNames = (annees as any[]).map((a: any) => a.annee);

  return {
    sections: sectionNames, options: optionNames, classes: classes as any[], motifs: motifNames, annees: anneeNames,
    sectionMap, sectionIdToName,
    financeComptables, financeApprobateurs,
    fournitureTypes: fournitureFilterData?.typesUniforme || [],
    fournitureSections: fournitureFilterData?.sections || [],
    fournitureClasses: fournitureFilterData?.classes || [],
  };
}
