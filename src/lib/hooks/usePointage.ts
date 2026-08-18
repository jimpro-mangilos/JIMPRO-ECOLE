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
