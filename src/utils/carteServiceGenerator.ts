import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { CarteServiceCard, type CarteService } from '../components/CarteServiceCard';
import { loadLogoBase64, loadSchoolName } from './pdfTheme';
import { asciiFold } from './ascii';

const CARD_W = 54; // mm (largeur — carte verticale)
const CARD_H = 86; // mm (hauteur)

async function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return;
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          setTimeout(resolve, 3000);
        })
    )
  );
}

async function renderCarteServiceToCanvas(
  personnel: CarteService,
  schoolName: string,
  logoUrl: string | null,
  qrDataUrl: string,
  scale = 3
): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  let root: Root | null = null;
  try {
    root = createRoot(container);
    root.render(createElement(CarteServiceCard, { personnel, schoolName, logoUrl, qrDataUrl }));

    await new Promise((r) => setTimeout(r, 0));
    await waitForImages(container);
    await new Promise((r) => setTimeout(r, 60));

    const cardEl = container.firstElementChild as HTMLElement;
    if (!cardEl) throw new Error('Carte non rendue');

    return await html2canvas(cardEl, { scale, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
  } finally {
    if (root) root.unmount();
    container.remove();
  }
}

/**
 * Génère la carte de service d'un membre du personnel (PDF, 54 × 86 mm portrait).
 * Rendu via le composant React + html2canvas — identique à l'aperçu.
 */
/**
 * Génère la carte de service d'un membre du personnel en JPG haute résolution
 * (972 × 1548 px ≈ 54 × 86 mm à 300 dpi) — pièce unique à imprimer.
 * Rendu via le composant React + html2canvas — identique à l'aperçu.
 */
export async function generateCarteService(p: CarteService): Promise<void> {
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const qrDataUrl = await buildQrDataUrl(p);

  const canvas = await renderCarteServiceToCanvas(p, schoolName, logo || null, qrDataUrl);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Carte-service-${(p.matricule || p.nom || 'personnel').replace(/\s+/g, '-')}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Génère les cartes de service de plusieurs membres en cascade (un PDF,
 * une carte par page — 54 × 86 mm). Utilisé par l'impression en lot.
 */
export async function generateCartesService(list: CarteService[]): Promise<void> {
  if (!list.length) return;
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [CARD_W, CARD_H] });
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const qrDataUrl = await buildQrDataUrl(p);
    const canvas = await renderCarteServiceToCanvas(p, schoolName, logo || null, qrDataUrl);
    if (i > 0) doc.addPage([CARD_W, CARD_H], 'portrait');
    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_W, CARD_H);
  }
  doc.save(`Cartes-service-${list.length}-membres.pdf`);
}

async function buildQrDataUrl(p: CarteService): Promise<string> {
  return QRCode.toDataURL(
    `MATRICULE:${p.matricule || ''}|NOM:${asciiFold(`${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}`)}|FONCTION:${asciiFold(p.fonction)}`,
    { width: 800, margin: 2, errorCorrectionLevel: 'H' }
  );
}