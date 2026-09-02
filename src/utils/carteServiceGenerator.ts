import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import html2canvas from 'html2canvas';
import { CarteServiceCard, CarteServiceCardBack, type CarteService } from '../components/CarteServiceCard';
import { loadLogoBase64, loadSchoolName, getCurrentEcoleId } from './pdfTheme';
import { supabase } from '../lib/supabase';
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

/** Vérifie qu'une image se charge (sinon le composant affiche le fallback initiales). */
/** Charge une image en DATA URL (base64) : html2canvas peut toujours la dessiner (pas de CORS). */
async function loadPhotoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

  try {
    // Rendu STATIQUE (react-dom/server) : AUCUN second root React sur le DOM —
    // évite la corruption "Failed to execute 'removeChild'" du root principal.
    // La photo est convertie en DATA URL : garantie d'être dessinée par html2canvas (sinon blanc).
    const [photoData, logoOk] = await Promise.all([
      loadPhotoDataUrl(personnel.photo_url),
      new Promise<boolean>((resolve) => {
        if (!logoUrl) return resolve(false);
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = logoUrl;
      }),
    ]);
    container.innerHTML = renderToString(
      createElement(CarteServiceCard, {
        personnel: photoData ? { ...personnel, photo_url: photoData } : { ...personnel, photo_url: null },
        schoolName,
        logoUrl: logoOk ? logoUrl : null,
        qrDataUrl,
      })
    );

    await waitForImages(container);
    await new Promise((r) => setTimeout(r, 60));

    const cardEl = container.firstElementChild as HTMLElement;
    if (!cardEl) throw new Error('Carte non rendue');

    return await html2canvas(cardEl, { scale, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
  } finally {
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

  // PNG (sans perte) : texte net, aucun artefact JPEG sur les petits caractères
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Carte-service-${(p.matricule || p.nom || 'personnel').replace(/\s+/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Génère le VERSO de la carte de service d'un membre (JPG haute résolution).
 */
export async function generateCarteServiceBack(p: CarteService): Promise<void> {
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  // Téléphone de l'établissement (verso universel — aucune donnée personnelle)
  let telephone: string | null = null;
  try {
    const ecoleId = await getCurrentEcoleId();
    if (ecoleId) {
      const { data } = await (supabase as any).from('ecoles').select('telephone').eq('id', ecoleId).maybeSingle();
      telephone = data?.telephone || null;
    }
  } catch { /* ignore */ }
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);
  try {
    container.innerHTML = renderToString(
      createElement(CarteServiceCardBack, { schoolName, logoUrl: logo || null, telephone, siteWeb: p.siteWeb })
    );
    await waitForImages(container);
    await new Promise((r) => setTimeout(r, 60));
    const cardEl = container.firstElementChild as HTMLElement;
    if (!cardEl) throw new Error('Verso non rendu');
    const canvas = await html2canvas(cardEl, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Carte-service-vers-${(p.matricule || p.nom || 'personnel').replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    container.remove();
  }
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
    doc.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, CARD_W, CARD_H);
  }
  doc.save(`Cartes-service-${list.length}-membres.pdf`);
}

/**
 * Génère les cartes de service des membres SÉLECTIONNÉS en UN SEUL fichier.
 * La CARTE reste en PORTRAIT (54 × 86 mm) ; c'est la PAGE A4 qui est en
 * ORIENTATION PAYSAGE (297 × 210 mm), 8 cartes par feuille (4 colonnes × 2 rangées),
 * avec des marges entre les cartes pour faciliter la découpe.
 */
export async function generateCartesService8PerSheet(list: CarteService[]): Promise<void> {
  if (!list.length) return;
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();

  // A4 PAYSAGE : 297 × 210 mm — grille 4 × 2 = 8 cartes portrait / page
  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 9;          // marge extérieure
  const CARD_W = 54;         // carte portrait 54 × 86 mm
  const CARD_H = 86;
  const COLS = 4;
  const ROWS = 2;
  const PER_PAGE = COLS * ROWS; // 8
  const cellW = (PAGE_W - MARGIN * 2) / COLS;
  const cellH = (PAGE_H - MARGIN * 2) / ROWS;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && i % PER_PAGE === 0) doc.addPage('a4', 'landscape');
    const p = list[i];
    const qrDataUrl = await buildQrDataUrl(p);
    const canvas = await renderCarteServiceToCanvas(p, schoolName, logo || null, qrDataUrl);
    const col = i % COLS;
    const row = Math.floor((i % PER_PAGE) / COLS);
    // Centré dans la cellule → marges égales autour de chaque carte (découpe facile)
    const x = MARGIN + col * cellW + (cellW - CARD_W) / 2;
    const y = MARGIN + row * cellH + (cellH - CARD_H) / 2;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', x, y, CARD_W, CARD_H);
  }
  doc.save(`Cartes-service-${list.length}-membres.pdf`);
}

async function buildQrDataUrl(p: CarteService): Promise<string> {
  return QRCode.toDataURL(
    `MATRICULE:${p.matricule || ''}|NOM:${asciiFold(`${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}`)}|FONCTION:${asciiFold(p.fonction)}`,
    { width: 800, margin: 2, errorCorrectionLevel: 'H' }
  );
}