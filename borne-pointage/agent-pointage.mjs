/**
 * agent-pointage.mjs — Pont « Borne d'empreintes ↔ JIMPRO »
 *
 * À ADAPTER : fonction identifierParEmpreinte() selon le SDK de VOTRE lecteur.
 * Principe :
 *   1. Le lecteur identifie un doigt (capture + match via son SDK).
 *   2. On retrouve le membre via empreintes_personnel (empreinte_ref ↔ personnel_id).
 *   3. On appelle la fonction SQL pointer_personnel_borne() (arrivée/départ).
 *   4. Supabase Realtime met à jour la page Pointage instantanément.
 *
 * Sécurité : utilise un compte utilisateur DÉDIÉ (BORNE_EMAIL/PASSWORD), jamais la clé service.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const env = Object.fromEntries(
  existsSync('./.env')
    ? readFileSync('./.env', 'utf8').split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    : []
);

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const BORNE_EMAIL = process.env.BORNE_EMAIL || env.BORNE_EMAIL;
const BORNE_PASSWORD = process.env.BORNE_PASSWORD || env.BORNE_PASSWORD;
const ECOLE_ID = process.env.ECOLE_ID || env.ECOLE_ID;
const APPAREIL_ID = process.env.APPAREIL_ID || env.APPAREIL_ID || 'borne1';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !BORNE_EMAIL || !BORNE_PASSWORD || !ECOLE_ID) {
  console.error('Configuration incomplète — renseignez .env (voir .env.example)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── File d'attente hors-ligne : les pointages ratés sont rejoués au retour du réseau ──
const QUEUE_FILE = './queue-offline.json';
function lireFile() {
  try { return existsSync(QUEUE_FILE) ? JSON.parse(readFileSync(QUEUE_FILE, 'utf8')) : []; } catch { return []; }
}
function ecrireFile(q) { try { writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2)); } catch { /* ignore */ } }

async function envoyerPointage(idPersonnel, date, heure) {
  const { data, error } = await supabase.rpc('pointer_personnel_borne', {
    p_ecole: ECOLE_ID,
    p_personnel: idPersonnel,
    p_date: date,
    p_heure: heure,
    p_source: 'empreinte',
  });
  if (error) throw error;
  return data;
}

async function rejouerFile() {
  const q = lireFile();
  if (!q.length) return;
  for (let i = q.length - 1; i >= 0; i--) {
    try {
      await envoyerPointage(q[i].personnel_id, q[i].date, q[i].heure);
      q.splice(i, 1);
      console.log('↻ rejoué depuis la file :', q[i] && q[i].personnel_id);
    } catch { /* on retentera plus tard */ }
  }
  ecrireFile(q);
}

async function pointe() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const heure = now.toTimeString().slice(0, 8);
  try {
    // 1) identification par le lecteur (À ADAPTER à votre SDK) ──────────────
    const personnelId = await identifierParEmpreinte();
    if (!personnelId) { console.log('✋ doigt non reconnu'); return; }

    // 2) pointage (RPC = même logique que le portail) ───────────────────────
    const resultat = await envoyerPointage(personnelId, date, heure);
    console.log('✓', new Date().toLocaleTimeString('fr-FR'), '→', resultat);
    // TODO : afficher le nom/statut sur l'écran de la borne + jouer un son
  } catch (err) {
    console.error('✗', err.message);
    // Hors-ligne : mettre en file pour rejouer plus tard
    const q = lireFile();
    q.push({ personnel_id: null /* à compléter avant la file */, date, heure });
    ecrireFile(q);
  }
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * IDENTIFICATION PAR EMPREINTE — À ADAPTER au SDK de votre lecteur.
 * Retourne le personnel_id du membre (ou null si inconnu).
 *
 * Exemple ZKTeco/SDK : capture + match → empreinte_ref, puis :
 *   const ref = await lecteur.match();          // ex : 'slot 12'
 *   const { data } = await supabase
 *     .from('empreintes_personnel')
 *     .select('personnel_id')
 *     .eq('ecole_id', ECOLE_ID)
 *     .eq('appareil_id', APPAREIL_ID)
 *     .eq('empreinte_ref', ref)
 *     .maybeSingle();
 *   return data?.personnel_id || null;
 * ────────────────────────────────────────────────────────────────────────────
 */
async function identifierParEmpreinte() {
  // TODO : brancher ici le lecteur (SDK du fabricant).
  // En attendant un lecteur réel, test avec un matricule saisi en console :
  return null;
}

// ── Connexion du compte dédié + boucle principale ─────────────────────────────
await supabase.auth.signInWithPassword({ email: BORNE_EMAIL, password: BORNE_PASSWORD });
console.log('✅ Borne connectée — en attente d\'empreintes... (Ctrl+C pour arrêter)');
await rejouerFile();
setInterval(rejouerFile, 30000); // retente la file hors-ligne toutes les 30 s
setInterval(pointe, 1200);       // boucle de scrutation (à remplacer par l'événement du SDK)
