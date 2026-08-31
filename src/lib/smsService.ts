/**
 * Service d'envoi de SMS — prestataires supportés : Twilio, Africa's Talking.
 * La configuration (clés API, expéditeur, activations) est lue dans app_settings
 * (jamais stockée en dur côté client). Chaque tentative est journalisée dans
 * notifications_sms (statut : en_attente | envoye | echec).
 */
import { supabase } from './supabase';

export interface SmsConfig {
  actif: boolean;          // sms_actif — notifications SMS globalement actives
  paiementActif: boolean;  // sms_paiement_actif — SMS à chaque paiement enregistré
  provider: string;        // '' | 'twilio' | 'africastalking'
  sid: string;             // Twilio Account SID / Africa's Talking username
  token: string;           // Twilio Auth Token / Africa's Talking API key
  from: string;            // Twilio numéro / AT sender id
}

const CLEFS = ['sms_actif', 'sms_paiement_actif', 'sms_provider', 'sms_sid', 'sms_token', 'sms_from'];

export async function chargerConfigSms(ecoleId: string): Promise<SmsConfig> {
  const defaut: SmsConfig = { actif: false, paiementActif: false, provider: '', sid: '', token: '', from: '' };
  if (!ecoleId) return defaut;
  try {
    const { data } = await (supabase as any).from('app_settings').select('key, value').eq('ecole_id', ecoleId).in('key', CLEFS);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return {
      actif: map.sms_actif === 'true',
      paiementActif: map.sms_paiement_actif === 'true',
      provider: map.sms_provider || '',
      sid: map.sms_sid || '',
      token: map.sms_token || '',
      from: map.sms_from || '',
    };
  } catch {
    return defaut;
  }
}

export async function sauverConfigSms(ecoleId: string, cfg: SmsConfig): Promise<{ error: string | null }> {
  if (!ecoleId) return { error: 'École introuvable' };
  const { error } = await (supabase as any).from('app_settings').upsert(
    [
      { ecole_id: ecoleId, key: 'sms_actif', value: cfg.actif ? 'true' : 'false' },
      { ecole_id: ecoleId, key: 'sms_paiement_actif', value: cfg.paiementActif ? 'true' : 'false' },
      { ecole_id: ecoleId, key: 'sms_provider', value: cfg.provider },
      { ecole_id: ecoleId, key: 'sms_sid', value: cfg.sid },
      { ecole_id: ecoleId, key: 'sms_token', value: cfg.token },
      { ecole_id: ecoleId, key: 'sms_from', value: cfg.from },
    ],
    { onConflict: 'ecole_id,key' }
  );
  return { error: error ? error.message : null };
}

async function journaliser(ecoleId: string, telephone: string, message: string, contexte: string, statut: string, erreur?: string, eleveId?: string | null) {
  try {
    await (supabase as any).from('notifications_sms').insert({
      ecole_id: ecoleId, eleve_id: eleveId || null, telephone, message,
      contexte, statut, erreur: erreur || null,
    });
  } catch { /* le journal ne doit jamais bloquer l'app */ }
}

/** Numéro téléphone → format international simplifié (chiffres, + conservé). */
export function normaliserTelephone(tel: string | null | undefined): string {
  let d = (tel || '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '+243' + d.slice(1); // RDC : 09xx... → +243 9xx...
  if (!d.startsWith('+')) d = '+' + d;
  return d;
}

export interface ResultatSms { ok: boolean; statut: string; erreur?: string; }

/** Envoie un SMS via le prestataire configuré et journalise le résultat. */
export async function envoyerSms(ecoleId: string, telephone: string, message: string, contexte = 'general', eleveId?: string | null): Promise<ResultatSms> {
  const cfg = await chargerConfigSms(ecoleId);
  if (!cfg.actif) {
    await journaliser(ecoleId, telephone, message, contexte, 'en_attente', 'SMS désactivés dans la configuration', eleveId);
    return { ok: false, statut: 'en_attente', erreur: 'SMS désactivés dans la configuration' };
  }
  if (!cfg.provider || !cfg.token || !cfg.sid) {
    await journaliser(ecoleId, telephone, message, contexte, 'echec', 'Prestataire SMS non configuré (Configuration → SMS)', eleveId);
    return { ok: false, statut: 'echec', erreur: 'Prestataire SMS non configuré' };
  }
  const tel = normaliserTelephone(telephone);
  if (!/^\+?\d{9,15}$/.test(tel)) {
    await journaliser(ecoleId, telephone, message, contexte, 'echec', 'Numéro de téléphone invalide', eleveId);
    return { ok: false, statut: 'echec', erreur: 'Numéro invalide' };
  }
  try {
    let status = 0;
    let body = '';
    if (cfg.provider === 'twilio') {
      const resp = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(cfg.sid) + '/Messages.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(cfg.sid + ':' + cfg.token),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: tel, From: cfg.from, Body: message }).toString(),
      });
      status = resp.status;
      body = await resp.text();
    } else if (cfg.provider === 'africastalking') {
      const resp = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'apiKey': cfg.token,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({ username: cfg.sid, to: tel, message, from: cfg.from }).toString(),
      });
      status = resp.status;
      body = await resp.text();
    } else {
      await journaliser(ecoleId, telephone, message, contexte, 'echec', 'Prestataire inconnu : ' + cfg.provider, eleveId);
      return { ok: false, statut: 'echec', erreur: 'Prestataire inconnu' };
    }
    const ok = status >= 200 && status < 300;
    await journaliser(ecoleId, telephone, message, contexte, ok ? 'envoye' : 'echec', ok ? undefined : body.slice(0, 500), eleveId);
    return ok ? { ok: true, statut: 'envoye' } : { ok: false, statut: 'echec', erreur: body.slice(0, 300) };
  } catch (err: any) {
    await journaliser(ecoleId, telephone, message, contexte, 'echec', err?.message || 'Erreur réseau', eleveId);
    return { ok: false, statut: 'echec', erreur: err?.message || 'Erreur réseau' };
  }
}

export interface PaiementSms {
  ecoleId: string;
  eleveId: string | null;
  telephone: string | null;
  nomEleve: string;
  montant: number;
  motif: string;
  numeroRecu: string;
  datePaiement: string;
  schoolName: string;
}

/** SMS de notification pour chaque paiement enregistré (si activé). */
export async function notifierPaiement(p: PaiementSms): Promise<ResultatSms | null> {
  if (!p.telephone) return null;
  const cfg = await chargerConfigSms(p.ecoleId);
  if (!cfg.actif || !cfg.paiementActif) return null;
  const montant = (p.montant || 0).toLocaleString('fr-FR');
  const date = p.datePaiement ? new Date(p.datePaiement + 'T00:00:00').toLocaleDateString('fr-FR') : '';
  const nom = (p.nomEleve || '').trim();
  const msg = (p.schoolName || 'École') + ' — Paiement enregistré : ' + nom + (p.motif ? ' (' + p.motif + ')' : '') + ' ' + montant + ' FC le ' + date + (p.numeroRecu ? '. N° reçu : ' + p.numeroRecu : '') + '. Merci !';
  return envoyerSms(p.ecoleId, p.telephone, msg, 'paiement', p.eleveId);
}
