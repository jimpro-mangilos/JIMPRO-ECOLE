import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { CarteServiceCard, type CarteService } from '../components/CarteServiceCard';
import { loadLogoBase64, loadSchoolName } from './pdfTheme';

const CARD_W = 85; // mm
const CARD_H = 54; // mm

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

    return await html2canvas(cardEl, { scale, useCORS: true, allowTaint: true, backgroundColor: '#fcfbf8' });
  } finally {
    if (root) root.unmount();
    container.remove();
  }
}

/**
 * Génère la carte de service d'un membre du personnel (PDF, 85 × 54 mm).
 * Rendu via le composant React + html2canvas — identique à l'aperçu.
 */
export async function generateCarteService(p: CarteService): Promise<void> {
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const qrDataUrl = await QRCode.toDataURL(
    `MATRICULE:${p.matricule || ''}|NOM:${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}|FONCTION:${p.fonction}`,
    { width: 800, margin: 2, errorCorrectionLevel: 'H' }
  );

  const canvas = await renderCarteServiceToCanvas(p, schoolName, logo || null, qrDataUrl);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_H, CARD_W] });
  doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_W, CARD_H);
  doc.save(`Carte-service-${(p.matricule || p.nom || 'personnel').replace(/\s+/g, '-')}.pdf`);
}
