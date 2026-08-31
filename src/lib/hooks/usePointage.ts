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
  tauxChange: number | null; // FC pour 1 USD (null = non configuré)
  seuilRetards: number;    // nb de retards avant alerte (défaut 3)
}

export const POINTAGE_DEFAUT: PointageConfig = { heureEntree: '08:00', heureSortie: '16:30', tauxChange: null, seuilRetards: 3 };

/** Heures de service d'une fonction du personnel (nullable si non définies). */
export interface FonctionHeures {
  id: string;
  libelle: string;
  heureEntree: string | null; // ex. '07:15'
  heureSortie: string | null; // ex. '15:00'
  is_active: boolean;
}

/**
 * Normalise une fonction pour la correspondance (minuscules, sans accents,
 * sans espaces superflus). Ex : "INSTITUTRICE " → "institutrice".
 */
export function normaliserFonction(fonction: string | null | undefined): string {
  return (fonction || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/s+/g, ' ');
}

/**
 * Charge les heures de service par fonction de l'école.
 * Retourne un Map clé = fonction normalisée → FonctionHeures.
 */
export async function loadFonctionsHeures(schoolId: string | null): Promise<Map<string, FonctionHeures>> {
  const map = new Map<string, FonctionHeures>();
  if (!schoolId) return map;
  try {
    const { data } = await (supabase as any)
      .from('fonctions_personnel')
      .select('id, libelle, heure_entree, heure_sortie, is_active')
      .eq('ecole_id', schoolId);
    for (const r of (data || []) as any[]) {
      const f: FonctionHeures = {
        id: r.id,
        libelle: r.libelle,
        heureEntree: r.heure_entree || null,
        heureSortie: r.heure_sortie || null,
        is_active: r.is_active,
      };
      map.set(normaliserFonction(r.libelle), f);
    }
  } catch {
    /* table absente ou RLS → retourne un Map vide (heures globales) */
  }
  return map;
}

/**
 * Trouve la fonction configurée la plus proche :
 *  1. correspondance exacte du libellé normalisé ;
 *  2. sinon correspondance sur le premier mot (ex : « directrice » → « directeur »,
 *     « institutrice » → « enseignant » n'a pas de racine commune, mais « directrice » ≈ « directeur »).
 */
export function trouverFonctionHeures(fonction: string | null | undefined, fonctHeures: Map<string, FonctionHeures>): FonctionHeures | undefined {
  const norm = normaliserFonction(fonction);
  if (!norm) return undefined;
  const exact = fonctHeures.get(norm);
  if (exact) return exact;
  // Repli : premier mot (racine) — « directrice » → « directeur », « institutrice » → « instituteur »
  const premierMot = norm.split(' ')[0];
  if (premierMot.length >= 4) {
    for (const [cle, f] of fonctHeures) {
      const motCle = cle.split(' ')[0];
      // racine commune d'au moins 5 caractères
      if (motCle.length >= 5 && (premierMot.startsWith(motCle.slice(0, 5)) || motCle.startsWith(premierMot.slice(0, 5)))) {
        return f;
      }
    }
  }
  return undefined;
}

/** Heures d'entrée/sortie effectives d'une fonction, avec repli sur les heures globales. */
export function heuresPourFonction(fonction: string | null | undefined, fonctHeures: Map<string, FonctionHeures>, config: PointageConfig): { heureEntree: string; heureSortie: string } {
  const f = trouverFonctionHeures(fonction, fonctHeures);
  return {
    heureEntree: f?.heureEntree || config.heureEntree,
    heureSortie: f?.heureSortie || config.heureSortie,
  };
}

/** Charge la configuration du pointage (heures d'entrée/sortie) de l'école. */
export async function loadPointageConfig(schoolId: string | null): Promise<PointageConfig> {
  if (!schoolId) return POINTAGE_DEFAUT;
  try {
    const { data } = await (supabase as any)
      .from('app_settings')
      .select('key, value')
      .eq('ecole_id', schoolId)
      .in('key', ['pointage_heure_entree', 'pointage_heure_sortie', 'pointage_taux_change', 'pointage_seuil_retards']);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    const taux = map.pointage_taux_change ? parseFloat(map.pointage_taux_change) : null;
    const seuil = map.pointage_seuil_retards ? parseInt(map.pointage_seuil_retards, 10) : NaN;
    return {
      heureEntree: map.pointage_heure_entree || POINTAGE_DEFAUT.heureEntree,
      heureSortie: map.pointage_heure_sortie || POINTAGE_DEFAUT.heureSortie,
      tauxChange: taux && !isNaN(taux) && taux > 0 ? taux : null,
      seuilRetards: !isNaN(seuil) && seuil > 0 ? seuil : POINTAGE_DEFAUT.seuilRetards,
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

/**
 * Vrai si l'erreur indique une table absente (migration pas encore exécutée).
 * Couvre PGRST205 (« Could not find the table ... in the schema cache »)
 * et les erreurs SQL « relation ... does not exist ».
 */
export function isTableMissingError(err: any): boolean {
  const msg = (err && err.message ? String(err.message) : '') + ' ' + (err && err.code ? String(err.code) : '');
  return msg.includes('does not exist') || msg.includes('Could not find the table') || msg.includes('PGRST205') || msg.includes('42P01');
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