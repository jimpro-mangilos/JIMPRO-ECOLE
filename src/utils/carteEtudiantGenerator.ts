import { jsPDF } from 'jspdf';
import { generateQrDataUrl, type CarteEleve } from '../components/CarteEleveCard';
import { renderCarteEleveToCanvas } from './carteEleveRenderer';

// ─── Dimensions CR-80 ──────────────────────────────────────────────────────────
const CARD_W = 85; // mm
const CARD_H = 54; // mm

/**
 * Génère une carte d'élève unique (PDF paysage 85×54mm).
 * La carte est rendue en HTML puis capturée — rendu identique à l'aperçu.
 */
export async function generateCarteEtudiant(
  eleve: CarteEleve,
  schoolName: string,
  logoUrl?: string | null,
): Promise<jsPDF> {
  const qr = await generateQrDataUrl(eleve);
  const canvas = await renderCarteEleveToCanvas(eleve, schoolName, logoUrl ?? null, qr, 3);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_H, CARD_W] });
  doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_W, CARD_H);
  return doc;
}

/**
 * Génère une planche A4 de cartes (2 par ligne × 4 par colonne).
 * Chaque carte est capturée depuis le rendu HTML — identique à l'aperçu.
 */
export async function generateCartesEtudiants(
  eleves: CarteEleve[],
  schoolName: string,
  logoUrl?: string | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const perRow = 2, perCol = 4, perPage = perRow * perCol;
  const pw = 210, ph = 297;
  const sx = (pw - perRow * CARD_W) / (perRow + 1);
  const sy = (ph - perCol * CARD_H) / (perCol + 1);

  for (let i = 0; i < eleves.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const idx = i % perPage;
    const x = sx + (idx % perRow) * (CARD_W + sx);
    const y = sy + Math.floor(idx / perRow) * (CARD_H + sy);

    const qr = await generateQrDataUrl(eleves[i]);
    const canvas = await renderCarteEleveToCanvas(eleves[i], schoolName, logoUrl ?? null, qr, 2);
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, CARD_W, CARD_H);
  }
  return doc;
}
