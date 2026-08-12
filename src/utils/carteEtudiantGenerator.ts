import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CarteEtudiantEleve {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  section: string;
  option?: string | null;
  classe?: string | null;
  date_naissance?: string | null;
  photo_url?: string | null;
  annee_scolaire?: string;
}

// ─── Modern Design System ──────────────────────────────────────────────────────
const DEEP_BLUE   = '#0f172a';
const ACCENT_TEAL = '#06b6d4';
const PURE_WHITE  = '#ffffff';
const SOFT_GRAY   = '#f1f5f9';
const TEXT_GRAY   = '#64748b';

const CARD_W = 85;
const CARD_H = 54;

// ─── Public API ────────────────────────────────────────────────────────────────

export async function generateCarteEtudiant(
  eleve: CarteEtudiantEleve,
  logoBase64?: string | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_H, CARD_W] });
  await drawCard(doc, eleve, 0, 0, logoBase64);
  return doc;
}

export async function generateCartesEtudiants(
  eleves: CarteEtudiantEleve[],
  logoBase64?: string | null,
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

    doc.setDrawColor('#cbd5e1');
    doc.setLineWidth(0.05);
    const cm = 5;
    [[x, y], [x + CARD_W, y], [x, y + CARD_H], [x + CARD_W, y + CARD_H]].forEach(([cx, cy]) => {
      const hw = cx === x ? 1 : -1, vw = cy === y ? 1 : -1;
      doc.line(cx, cy + vw * cm, cx, cy + vw * 1);
      doc.line(cx + hw * cm, cy, cx + hw * 1, cy);
    });

    await drawCard(doc, eleves[i], x, y, logoBase64);
  }

  return doc;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Core Card Drawing ─────────────────────────────────────────────────────────

async function drawCard(doc: jsPDF, e: CarteEtudiantEleve, ox: number, oy: number, logo?: string | null) {
  const annee = e.annee_scolaire || new Date().getFullYear().toString();
  const nomComplet = `${e.nom} ${e.postnom ? e.postnom + ' ' : ''}${e.prenom}`.toUpperCase();
  const displayNom = e.nom.toUpperCase() + (e.postnom ? ' ' + e.postnom.toUpperCase() : '');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. BACKGROUND
  // ═══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(PURE_WHITE);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 2, 2, 'F');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. BANDE LATÉRALE GAUCHE
  // ═══════════════════════════════════════════════════════════════════════════════
  const bandWidth = 24;
  doc.setFillColor(DEEP_BLUE);
  doc.rect(ox, oy, bandWidth, CARD_H, 'F');

  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setFillColor(ACCENT_TEAL);
  doc.rect(ox, oy, bandWidth, 18, 'F');
  doc.restoreGraphicsState();

  // Cercles subtils
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setDrawColor(PURE_WHITE);
  doc.setLineWidth(0.3);
  for (let r = 5; r < 40; r += 5) {
    (doc as any).circle(ox + bandWidth / 2, oy + CARD_H / 2, r, 'S');
  }
  doc.restoreGraphicsState();

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. PHOTO ZONE
  // ═══════════════════════════════════════════════════════════════════════════════
  const photoX = ox + 4;
  const photoY = oy + 6;
  const photoW = 16;
  const photoH = 20;

  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.setFillColor('#000000');
  doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW, photoH, 2, 2, 'F');
  doc.restoreGraphicsState();

  doc.setFillColor(SOFT_GRAY);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'F');

  let photoDrawn = false;
  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) {
        doc.addImage(img, 'JPEG', photoX, photoY, photoW, photoH);
        photoDrawn = true;
      }
    } catch { /* ignore */ }
  }

  if (!photoDrawn) {
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    const cxP = photoX + photoW / 2;
    const cyP = photoY + photoH / 2;
    doc.setFillColor(ACCENT_TEAL);
    (doc as any).circle(cxP, cyP, 6, 'F');
    doc.setTextColor(PURE_WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(init, cxP, cyP + 2.5, { align: 'center' });
  }

  doc.setDrawColor(PURE_WHITE);
  doc.setLineWidth(0.8);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'S');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. LOGO ÉCOLE (bas de la bande)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (logo) {
    const logoSize = 12;
    const logoX = ox + (bandWidth - logoSize) / 2;
    const logoY = oy + 30;
    const fmt = logo.startsWith('data:image/jpeg') || logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'JPEG' : 'PNG';
    doc.setFillColor(PURE_WHITE);
    doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 1.5, 1.5, 'F');
    doc.addImage(logo, fmt, logoX, logoY, logoSize, logoSize);
  } else {
    const badgeX = ox + bandWidth / 2;
    const badgeY = oy + 36;
    doc.setFillColor(ACCENT_TEAL);
    doc.roundedRect(badgeX - 5, badgeY - 5, 10, 10, 2, 2, 'F');
    doc.setTextColor(PURE_WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('GA', badgeX, badgeY + 1.5, { align: 'center' });
  }

  doc.setTextColor(PURE_WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.2);
  doc.text('GOLDEN ACADEMY', ox + bandWidth / 2, oy + CARD_H - 4, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. HEADER — badge + année
  // ═══════════════════════════════════════════════════════════════════════════════
  const contentX = ox + bandWidth + 4;
  let cy = oy + 5;

  doc.setFillColor(ACCENT_TEAL);
  doc.roundedRect(contentX, cy, 28, 4, 1, 1, 'F');
  doc.setTextColor(PURE_WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.2);
  doc.text("CARTE D'ÉLÈVE", contentX + 14, cy + 2.8, { align: 'center' });

  doc.setTextColor(TEXT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.8);
  doc.text(annee, ox + CARD_W - 4, cy + 2.8, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. NOM DE L'ÉTUDIANT
  // ═══════════════════════════════════════════════════════════════════════════════
  cy += 9;
  doc.setTextColor(DEEP_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(displayNom, contentX, cy);

  cy += 5;
  doc.setTextColor(TEXT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.text(e.prenom, contentX, cy);

  // Séparateur
  cy += 2.5;
  doc.setDrawColor(ACCENT_TEAL);
  doc.setLineWidth(0.3);
  doc.line(contentX, cy, contentX + 30, cy);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. INFORMATIONS ÉLÈVE — grille 2 colonnes
  // ═══════════════════════════════════════════════════════════════════════════════
  cy += 3;

  const drawField = (label: string, value: string, x: number, maxW: number) => {
    doc.setTextColor(TEXT_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(2.2);
    doc.text(label, x, cy);
    doc.setTextColor(DEEP_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3);
    const lines = doc.splitTextToSize(value, maxW);
    doc.text(lines as string[] | string, x, cy + 2.2, { maxWidth: maxW });
  };

  const col1 = contentX;
  const col2 = contentX + 24;
  const colW = 22;

  const dateNaissance = e.date_naissance
    ? new Date(e.date_naissance).toLocaleDateString('fr-FR')
    : '—';

  drawField('Sexe', e.sexe === 'M' ? 'Masculin' : e.sexe === 'F' ? 'Féminin' : e.sexe, col1, colW);
  drawField('Né(e) le', dateNaissance, col2, colW);

  cy += 6;
  drawField('Section', e.section || '—', col1, colW);
  drawField('Classe', e.classe || '—', col2, colW);

  if (e.option) {
    cy += 6;
    drawField('Option', e.option, col1, 30);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. MATRICULE — style code-barres
  // ═══════════════════════════════════════════════════════════════════════════════
  cy += 7;
  doc.setTextColor(TEXT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2);
  doc.text('MATRICULE', contentX, cy);
  doc.setTextColor(DEEP_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.2);
  doc.text(e.matricule, contentX, cy + 2.2);

  // Barres décoratives sous le matricule
  const barY = cy + 3.5;
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.setFillColor(ACCENT_TEAL);
  for (let i = 0; i < 12; i++) {
    const bx = contentX + i * 2.8;
    const bw = i % 3 === 0 ? 0.8 : i % 3 === 1 ? 1.6 : 0.4;
    doc.rect(bx, barY, bw, 1, 'F');
  }
  doc.restoreGraphicsState();

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. QR CODE — 34×34mm bottom right
  // ═══════════════════════════════════════════════════════════════════════════════
  const qrData = `MATRICULE:${e.matricule}|ELEVE:${nomComplet}|SECTION:${e.section}|CLASSE:${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 600, margin: 0, errorCorrectionLevel: 'H' });
  const qs = 34;
  const qx = ox + CARD_W - qs - 2;
  const qy = oy + CARD_H - qs - 2;

  doc.setFillColor(SOFT_GRAY);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1, 1, 'F');
  doc.setFillColor(PURE_WHITE);
  doc.rect(qx, qy, qs, qs, 'F');
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
}

export type { CarteEtudiantEleve };
