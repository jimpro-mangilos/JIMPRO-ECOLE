import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface CarteEtudiantEleve {
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

// ─── Design System ────────────────────────────────────────────────────────────
const GREEN = '#2f8f68';
const GOLD = '#b58a2a';
const INK = '#16213e';
const WHITE = '#ffffff';
const CARD_W = 85, CARD_H = 54;

// ─── Public API ───────────────────────────────────────────────────────────────

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
      doc.line(cx, cy + (cy === y ? cm : -cm), cx, cy + (cy === y ? 1 : -1));
      doc.line(cx + (cx === x ? cm : -cm), cy, cx + (cx === x ? 1 : -1), cy);
    });
    await drawCard(doc, eleves[i], x, y, logoBase64);
  }
  return doc;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Card Drawing ─────────────────────────────────────────────────────────────

async function drawCard(doc: jsPDF, e: CarteEtudiantEleve, ox: number, oy: number, logo?: string | null) {
  const nomComplet = `${e.nom} ${e.postnom ? e.postnom + ' ' : ''}${e.prenom}`;
  const annee = e.annee_scolaire || new Date().getFullYear().toString();

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Background
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(WHITE);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 2, 2, 'F');

  // Subtle green tint gradient effect
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.setFillColor(GREEN);
  doc.rect(ox + CARD_W - 25, oy, 25, CARD_H, 'F');
  doc.restoreGraphicsState();

  // Grid lines
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setDrawColor(GREEN);
  doc.setLineWidth(0.08);
  for (let gx = ox + 5; gx < ox + CARD_W; gx += 22) {
    doc.line(gx, oy, gx, oy + CARD_H);
  }
  for (let gy = oy + 5; gy < oy + CARD_H; gy += 22) {
    doc.line(ox + 15, gy, ox + CARD_W, gy);
  }
  doc.restoreGraphicsState();

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Green accent bar (left edge)
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(GREEN);
  doc.rect(ox, oy, 2, CARD_H, 'F');

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Decorative circles
  // ══════════════════════════════════════════════════════════════════════════════
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  doc.setDrawColor(GREEN);
  doc.setLineWidth(0.5);
  (doc as any).circle(ox + CARD_W + 12, oy - 8, 18, 'S');
  (doc as any).circle(ox + CARD_W + 12, oy - 8, 14, 'S');
  doc.restoreGraphicsState();

  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  doc.setFillColor(GOLD);
  (doc as any).circle(ox + CARD_W / 2 + 5, oy + CARD_H + 12, 14, 'F');
  doc.restoreGraphicsState();

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. "OFFICIEL" badge (top-right)
  // ══════════════════════════════════════════════════════════════════════════════
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setFillColor(GOLD);
  doc.restoreGraphicsState();
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(ox + CARD_W - 24, oy + 2.5, 21, 4, 2, 2, 'S');
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.8);
  doc.text('OFFICIEL', ox + CARD_W - 13.5, oy + 5.2, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. School identity (top-left area)
  // ══════════════════════════════════════════════════════════════════════════════
  const leftPad = ox + 5;

  // School logo placeholder
  if (logo) {
    const fmt = logo.startsWith('data:image/jpeg') || logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(logo, fmt, leftPad + 1, oy + 4, 8, 8);
  } else {
    doc.setFillColor(GREEN);
    doc.roundedRect(leftPad + 1, oy + 4, 8, 8, 1.5, 1.5, 'F');
    doc.setTextColor(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text('GA', leftPad + 5, oy + 7.5, { align: 'center' });
  }

  // "Student Pass" label
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.5);
  doc.text('STUDENT PASS', leftPad + 12, oy + 6);

  // School name
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.2);
  doc.text('GOLDEN ACADEMY', leftPad + 12, oy + 9);

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Photo (circle)
  // ══════════════════════════════════════════════════════════════════════════════
  const photoCx = leftPad + 12;
  const photoCy = oy + 30;
  const photoR = 10;

  // Shadow
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  doc.setFillColor('#000000');
  (doc as any).circle(photoCx + 0.5, photoCy + 0.5, photoR, 'F');
  doc.restoreGraphicsState();

  // Photo circle background
  doc.saveGraphicsState();
  doc.setFillColor('#e8f5e9');
  (doc as any).circle(photoCx, photoCy, photoR, 'F');
  doc.clip();

  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) doc.addImage(img, 'JPEG', photoCx - photoR, photoCy - photoR, photoR * 2, photoR * 2);
    } catch { /* skip */ }
  }

  if (!e.photo_url) {
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    doc.setTextColor(GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(init, photoCx, photoCy + 2, { align: 'center' });
  }

  doc.restoreGraphicsState();

  // White border
  doc.setDrawColor(WHITE);
  doc.setLineWidth(2);
  (doc as any).circle(photoCx, photoCy, photoR + 0.5, 'S');

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. Student name & program
  // ══════════════════════════════════════════════════════════════════════════════
  const infoX = photoCx + photoR + 5;

  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(nomComplet, infoX, oy + 25, { maxWidth: CARD_W - infoX - 8 });

  const program = [e.section, e.classe, e.option].filter(Boolean).join(' - ');
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3);
  doc.text(program || '—', infoX, oy + 28.5);

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. Separator line
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.2);
  doc.line(leftPad, oy + 39, ox + CARD_W - 28, oy + 39);

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. Matricule + Year (bottom section)
  // ══════════════════════════════════════════════════════════════════════════════
  // Left: Matricule
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.2);
  doc.text('N° ÉTUDIANT', leftPad, oy + 42);
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3);
  doc.text(e.matricule, leftPad, oy + 45);

  // Right: Year
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.2);
  doc.text('ANNÉE', ox + CARD_W - 28, oy + 42, { align: 'right' });
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3);
  doc.text(annee, ox + CARD_W - 28, oy + 45, { align: 'right' });

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. QR Code (bottom-right)
  // ══════════════════════════════════════════════════════════════════════════════
  const qrData = `MATRICULE:${e.matricule}|ELEVE:${nomComplet}|SECTION:${e.section}|CLASSE:${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 400, margin: 0, errorCorrectionLevel: 'H' });
  const qs = 16;
  const qx = ox + CARD_W - qs - 3;
  const qy = oy + CARD_H - qs - 3;

  doc.setFillColor(WHITE);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1, 1, 'F');
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
}
