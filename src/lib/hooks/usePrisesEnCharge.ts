/**
 * Prises en charge : élève pris en charge par un membre du personnel → ses
 * paiements (mode « prise_en_charge ») sont déduits du salaire du membre.
 */
import { supabase } from '../supabase';

export const MODE_PRISE_EN_CHARGE = 'prise_en_charge';

export interface PriseEnCharge {
  id: string;
  ecole_id: string;
  personnel_id: string;
  eleve_id: string;
  type: string;
  date_debut: string;
  date_fin: string | null;
  statut: string; // en_attente | active | refusee | cloturee
  motif: string | null;
  decision_note: string | null;
  created_at: string | null;
}

export const TYPES_PEC = ['enfant', 'boursier', 'autre'];

export async function chargerPrisesEnCharge(ecoleId: string): Promise<PriseEnCharge[]> {
  const { data } = await (supabase as any)
    .from('prises_en_charge_personnel')
    .select('*')
    .eq('ecole_id', ecoleId)
    .order('created_at', { ascending: false });
  return (data || []) as PriseEnCharge[];
}

/** Fiche ACTIVE d'un élève (ou null). */
export async function chargerActivePourEleve(ecoleId: string, eleveId: string): Promise<PriseEnCharge | null> {
  const { data } = await (supabase as any)
    .from('prises_en_charge_personnel')
    .select('*')
    .eq('ecole_id', ecoleId)
    .eq('eleve_id', eleveId)
    .eq('statut', 'active')
    .maybeSingle();
  return (data as PriseEnCharge) || null;
}

export async function creerPriseEnCharge(opts: {
  ecoleId: string; personnelId: string; eleveId: string; type: string;
  dateDebut: string; dateFin?: string; motif?: string; userId?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).from('prises_en_charge_personnel').insert({
    ecole_id: opts.ecoleId, personnel_id: opts.personnelId, eleve_id: opts.eleveId,
    type: opts.type, date_debut: opts.dateDebut, date_fin: opts.dateFin || null,
    motif: opts.motif || null, statut: 'en_attente', demande_par: opts.userId || null,
  });
  return { error: error ? error.message : null };
}

export async function deciderPriseEnCharge(id: string, statut: 'active' | 'refusee' | 'cloturee', userId: string | null, note?: string): Promise<{ error: string | null }> {
  const { error } = await (supabase as any)
    .from('prises_en_charge_personnel')
    .update({ statut, decide_par: userId || null, decision_note: note || null, decided_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error ? error.message : null };
}

/** Somme des paiements « prise en charge » d'un membre pour un mois (non annulés). */
export async function chargerRetenueMembre(ecoleId: string, year: number, month: number, personnelId: string): Promise<number> {
  const start = year + '-' + String(month).padStart(2, '0') + '-01';
  const end = year + '-' + String(month).padStart(2, '0') + '-' + String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const { data } = await (supabase as any)
    .from('paiements')
    .select('montant_paye, statut')
    .eq('ecole_id', ecoleId)
    .eq('personnel_id', personnelId)
    .eq('mode_paiement', MODE_PRISE_EN_CHARGE)
    .gte('date_paiement', start)
    .lte('date_paiement', end);
  return (data || []).reduce((s: number, r: any) => s + (r.statut !== 'annule' ? Number(r.montant_paye) || 0 : 0), 0);
}

/** Retenues de TOUS les membres pour un mois : { personnelId: montant }. */
export async function chargerRetenuesMois(ecoleId: string, year: number, month: number): Promise<Record<string, number>> {
  const start = year + '-' + String(month).padStart(2, '0') + '-01';
  const end = year + '-' + String(month).padStart(2, '0') + '-' + String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const PAGE = 1000;
  const map: Record<string, number> = {};
  let from = 0;
  while (true) {
    const to = from + PAGE - 1;
    const { data } = await (supabase as any)
      .from('paiements')
      .select('personnel_id, montant_paye, statut')
      .eq('ecole_id', ecoleId)
      .eq('mode_paiement', MODE_PRISE_EN_CHARGE)
      .not('personnel_id', 'is', null)
      .gte('date_paiement', start)
      .lte('date_paiement', end)
      .range(from, to);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.statut !== 'annule') map[r.personnel_id] = (map[r.personnel_id] || 0) + (Number(r.montant_paye) || 0);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

/**
 * Solde des prises en charge NON ENCORE DÉDUITES avant un mois donné,
 * par membre : total des paiements « prise en charge » antérieurs au mois,
 * moins les retenues déjà enregistrées (paiements_salaires.retenue_fc)
 * sur les mois précédents. Le solde est reporté sur les mois suivants.
 */
export async function chargerSoldeReporte(ecoleId: string, year: number, month: number): Promise<Record<string, number>> {
  const mois = year + '-' + String(month).padStart(2, '0');
  const PAGE = 1000;
  const cumPec: Record<string, number> = {};
  const cumRet: Record<string, number> = {};
  let from = 0;
  let error: any = null;
  while (true) {
    const to = from + PAGE - 1;
    const { data, error: e } = await (supabase as any)
      .from('paiements')
      .select('personnel_id, montant_paye, statut')
      .eq('ecole_id', ecoleId)
      .eq('mode_paiement', MODE_PRISE_EN_CHARGE)
      .not('personnel_id', 'is', null)
      .lt('date_paiement', mois + '-01')
      .range(from, to);
    if (e) { error = e; break; }
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.statut !== 'annule') cumPec[r.personnel_id] = (cumPec[r.personnel_id] || 0) + (Number(r.montant_paye) || 0);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  // Déductions déjà enregistrées sur les mois précédents (colonne retenue_fc)
  if (!error) {
    from = 0;
    while (true) {
      const to = from + PAGE - 1;
      const { data, error: e } = await (supabase as any)
        .from('paiements_salaires')
        .select('personnel_id, retenue_fc')
        .eq('ecole_id', ecoleId)
        .lt('mois', mois)
        .range(from, to);
      if (e) { error = e; break; }
      if (!data || data.length === 0) break;
      for (const r of data) cumRet[r.personnel_id] = (cumRet[r.personnel_id] || 0) + (Number(r.retenue_fc) || 0);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  // En cas d'erreur (ex. colonne pas encore créée) : pas de report (comportement d'origine)
  if (error) return {};
  const out: Record<string, number> = {};
  for (const pid of Object.keys(cumPec)) {
    const bal = (cumPec[pid] || 0) - (cumRet[pid] || 0);
    if (bal > 0) out[pid] = Math.round(bal);
  }
  return out;
}
