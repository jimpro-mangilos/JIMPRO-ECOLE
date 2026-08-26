import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export interface PointageRecord {
  id: string;
  ecole_id: string;
  personnel_id: string;
  date_pointage: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  statut: string;
  note: string | null;
  created_at: string;
}

export const STATUT_POINTAGE: Record<string, { label: string; color: string }> = {
  present: { label: 'Présent', color: 'bg-green-100 text-green-700' },
  retard: { label: 'Retard', color: 'bg-amber-100 text-amber-700' },
  absent: { label: 'Absent', color: 'bg-red-100 text-red-700' },
  permission: { label: 'Permission', color: 'bg-blue-100 text-blue-700' },
};

export type PointageInput = {
  personnel_id: string;
  date_pointage: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  statut: string;
  note: string | null;
};

export interface PointageConfig {
  heureEntree: string;  // ex. '08:00'
  heureSortie: string;  // ex. '16:30'
}

export const POINTAGE_DEFAUT: PointageConfig = { heureEntree: '08:00', heureSortie: '16:30' };

/** Charge la configuration du pointage (heures d'entrée/sortie) de l'école. */
export async function loadPointageConfig(schoolId: string | null): Promise<PointageConfig> {
  if (!schoolId) return POINTAGE_DEFAUT;
  try {
    const { data } = await (supabase as any)
      .from('app_settings')
      .select('key, value')
      .eq('ecole_id', schoolId)
      .in('key', ['pointage_heure_entree', 'pointage_heure_sortie']);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return {
      heureEntree: map.pointage_heure_entree || POINTAGE_DEFAUT.heureEntree,
      heureSortie: map.pointage_heure_sortie || POINTAGE_DEFAUT.heureSortie,
    };
  } catch {
    return POINTAGE_DEFAUT;
  }
}

/** Vrai si la date est un jour ouvrable (lundi → vendredi). */
export function estJourOuvrable(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** Compare deux heures 'HH:MM' → négatif si a < b, 0 si égal, positif sinon. */
export function compareHeures(a: string, b: string): number {
  const pa = a.split(':').map(Number);
  const pb = b.split(':').map(Number);
  return (pa[0] * 60 + pa[1]) - (pb[0] * 60 + pb[1]);
}

/** Statut automatique selon l'heure d'arrivée et l'heure d'entrée configurée. */
export function statutAuto(heureArrivee: string | null, config: PointageConfig): string {
  if (!heureArrivee) return 'absent';
  if (compareHeures(heureArrivee.slice(0, 5), config.heureEntree) > 0) return 'retard';
  return 'present';
}

export function formatDatePointage(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function usePointage(date: string) {
  const { currentSchoolId } = useAuth();
  const queryClient = useQueryClient();

  const { data: pointages = [], isLoading: loading } = useQuery({
    queryKey: ['pointages', date, currentSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pointages_personnel').select('*').eq('ecole_id', currentSchoolId).eq('date_pointage', date);
      if (error) throw error;
      return (data as PointageRecord[]) || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pointages', date, currentSchoolId] });

  const save = async (input: PointageInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pointages_personnel')
        .upsert({ ...input, ecole_id: currentSchoolId }, { onConflict: 'personnel_id,date_pointage' });
      if (error) throw error;
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors du pointage');
      return false;
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('pointages_personnel').delete().eq('id', id);
      if (error) throw error;
      invalidate();
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression');
      return false;
    }
  };

  return { pointages, loading, save, remove };
}