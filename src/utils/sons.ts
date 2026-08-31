/**
 * Sons de retour pour le portail de recouvrement.
 * Utilise la Web Audio API (aucun fichier audio requis) :
 *  · EN ORDRE           → arpège ascendant joyeux (3 notes)
 *  · PAS EN ORDRE       → deux bips graves descendants
 *  · MATRICULE INCONNU  → un bip grave unique
 */

let audioCtx: AudioContext | null = null;

/** Crée (ou récupère) le contexte audio, débloqué après interaction utilisateur. */
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Joue une note (fréquence en Hz) avec enveloppe pour éviter les clics. */
function beep(ctx: AudioContext, freq: number, startDelay: number, duration = 0.18, gainValue = 0.18, type: OscillatorType = 'sine') {
  const t0 = ctx.currentTime + startDelay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Enveloppe : attaque rapide, décroissance douce (pas de « clic »)
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Son : matricule reconnu et paiement OK (arpège ascendant). */
export function jouerSonEnOrdre() {
  const ctx = getCtx();
  if (!ctx) return;
  // Do4 → Mi4 → Sol4 (arpège majeur joyeux)
  beep(ctx, 523.25, 0.00, 0.16);
  beep(ctx, 659.25, 0.14, 0.16);
  beep(ctx, 783.99, 0.28, 0.24);
}

/** Son : matricule reconnu mais paiement manquant (bips graves descendants). */
export function jouerSonPasEnOrdre() {
  const ctx = getCtx();
  if (!ctx) return;
  // La3 → Fa3 (descendant, légèrement désagréable)
  beep(ctx, 440.00, 0.00, 0.20, 0.20, 'square');
  beep(ctx, 349.23, 0.22, 0.26, 0.20, 'square');
}

/** Son : matricule non reconnu (bip grave unique). */
export function jouerSonIntrouvable() {
  const ctx = getCtx();
  if (!ctx) return;
  // Fa3 bas, court
  beep(ctx, 220.00, 0.00, 0.22, 0.18, 'triangle');
}
