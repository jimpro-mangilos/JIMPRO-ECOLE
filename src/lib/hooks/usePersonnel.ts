import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export interface PersonnelRecord {
  id: string;
  ecole_id: string;
  matricule: string | null;
  nom: string;
  postnom: string | null;
  prenom: string;
  sexe: string | null;
  fonction: string;
  etat_civil: string | null;
  nombre_enfants: number | null;
  niveau_etude_id: string | null;
  piece_etude: string | null;
  photo_url: string | null;
  nationalite: string | null;
  date_naissance: string | null;
  intitule_compte: string | null;
  num_compte: string | null;
  telephone: string | null;
  email: string | null;
  date_embauche: string | null;
  salaire: number | null;
  adresse: string | null;
  domaine: string | null;
  statut: string;
  est_agent_recouvrement?: boolean;
  created_at: string;
  updated_at: string;
}

export type PersonnelInput = Omit<PersonnelRecord, 'id' | 'ecole_id' | 'created_at' | 'updated_at'>;

export const FONCTIONS_SUGGEREES = ['Enseignant', 'Directeur', 'Directeur adjoint', 'Coordonnateur', 'Comptable', 'Secrétaire', 'Surveillant', 'Gardien', 'Bibliothécaire', 'Infirmier', 'Autre'];
export const ETATS_CIVILS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

export const STATUT_PERSONNEL_LABELS: Record<string, string> = { actif: 'Actif', inactif: 'Inactif', suspendu: 'Suspendu' };
export const STATUT_PERSONNEL_COLORS: Record<string, string> = { actif: 'bg-green-100 text-green-700', inactif: 'bg-gray-100 text-gray-600', suspendu: 'bg-amber-100 text-amber-700' };

export async function generatePersonnelMatricule(schoolId: string, date?: string | null): Promise<string> {
  const { data: pref } = await supabase.from('app_settings').select('value').eq('ecole_id', schoolId).eq('key', 'personnel_matricule_prefix').maybeSingle();
  const prefix = ((pref as any)?.value || '').trim() || 'PER';
  // Le matricule se base sur la date d'embauche (sinon la date du jour)
  const m = (date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uid = '';
  for (let i = 0; i < 5; i++) uid += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${ymd}-${uid}`;
}

export function usePersonnel() {
  const { currentSchoolId } = useAuth();
  const queryClient = useQueryClient();

  const { data: personnel = [], isLoading: loading } = useQuery({
    queryKey: [...queryKeys.personnel.all, { schoolId: currentSchoolId }],
    queryFn: async () => {
      const { data, error } = await supabase.from('personnel').select('*').eq('ecole_id', currentSchoolId).order('nom', { ascending: true });
      if (error) throw error;
      return (data as PersonnelRecord[]) || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.personnel.all });

  const create = async (input: PersonnelInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('personnel').insert({ ...input, ecole_id: currentSchoolId });
      if (error) throw error;
      toast.success('Personnel ajouté');
      invalidate();
      return true;
    } catch (err: any) { toast.error(err?.message || "Erreur lors de l'ajout"); return false; }
  };

  const update = async (id: string, input: PersonnelInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('personnel').update(input).eq('id', id);
      if (error) throw error;
      toast.success('Personnel mis à jour');
      invalidate();
      return true;
    } catch (err: any) { toast.error(err?.message || 'Erreur lors de la mise à jour'); return false; }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('personnel').delete().eq('id', id);
      if (error) throw error;
      toast.success('Personnel supprimé');
      invalidate();
      return true;
    } catch (err: any) { toast.error(err?.message || 'Erreur lors de la suppression'); return false; }
  };

  return { personnel, loading, create, update, remove };
}