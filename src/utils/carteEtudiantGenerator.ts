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

// ─── Design System ─────────────────────────────────────────────────────────────
const DARK    = '#07518a';
const GOLD    = '#f6b21c';
const WHITE   = '#fcfcfd';
const SURFACE = '#eff4f6';
const BORDER  = '#cdd9e2'; // approx rgba(7,65,112,.2)

const CARD_W = 85; // mm
const CARD_H = 54; // mm
const PAD = 2;

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

    // Draw cut guides
    doc.setDrawColor('#cbd5e1');
    doc.setLineWidth(0.05);
    const cm = 5;
    [[x, y], [x + CARD_W, y], [x, y + CARD_H], [x + CARD_W, y + CARD_H]].forEach(([cx, cy]) => {
      const hw = cx === x ? 1 : -1, vw = cy === y ? 1 : -1;
      doc.line(cx, cy + vw * cm, cx, cy + vw * 1);  // vertical
      doc.line(cx + hw * cm, cy, cx + hw * 1, cy);  // horizontal
    });

    await drawCard(doc, eleves[i], x, y, logoBase64);
  }

  return doc;
}

// ─── Core Card Drawing ─────────────────────────────────────────────────────────

async function drawCard(doc: jsPDF, e: CarteEtudiantEleve, ox: number, oy: number, logo?: string | null) {
  const annee = e.annee_scolaire || new Date().getFullYear().toString();
  const nom = `${e.nom} ${e.postnom ? e.postnom + ' ' : ''}${e.prenom}`.toUpperCase();

  // ─── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(WHITE);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 2, 2, 'F');

  // ─── Watermark logo (semi-transparent, centered) ────────────────────────────
  if (logo) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    const logoWm = CARD_W * 0.55;
    const logoHm = CARD_H * 0.4;
    const fmt = logo.startsWith('data:image/jpeg') || logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(logo, fmt, ox + (CARD_W - logoWm) / 2, oy + (CARD_H - logoHm) / 2, logoWm, logoHm);
    doc.restoreGraphicsState();
  }

  // ─── Blue zone (right ~35%, full height) ─────────────────────────────────────
  const blueX = ox + CARD_W * 0.65;
  doc.setFillColor(DARK);
  doc.rect(blueX, oy, CARD_W - CARD_W * 0.65, CARD_H, 'F');

  // Dot pattern overlay on blue zone (semi-transparent white circles)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  doc.setFillColor(WHITE);
  const dots: [number, number][] = [
    [blueX + 4, oy + 7],  [blueX + 15, oy + 5],  [blueX + 9, oy + 18],
    [blueX + 19, oy + 15], [blueX + 6, oy + 30],  [blueX + 17, oy + 28],
    [blueX + 4, oy + 42],  [blueX + 14, oy + 39], [blueX + 21, oy + 47],
    [blueX + 23, oy + 10], [blueX + 24, oy + 34],
  ];
  dots.forEach(([dx, dy]) => {
    (doc as any).circle(dx, dy, 0.7, 'F');
  });
  doc.restoreGraphicsState();

  // ─── Top band (7mm height, gradient approximated) ────────────────────────────
  const bandH = 7;
  // Gold segment: 0–10% width
  doc.setFillColor(GOLD);
  doc.rect(ox, oy, CARD_W * 0.10, bandH, 'F');
  // Dark segment: 10–74% width
  doc.setFillColor(DARK);
  doc.rect(ox + CARD_W * 0.10, oy, CARD_W * 0.64, bandH, 'F');
  // White segment: 74–100% width
  doc.setFillColor(WHITE);
  doc.rect(ox + CARD_W * 0.74, oy, CARD_W * 0.26, bandH, 'F');

  // School name
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('GOLDEN ACADEMY', ox + PAD + 1, oy + 5.5);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.2);
  doc.text("Établissement d'Enseignement", ox + PAD + 1, oy + 9);

  // ─── GA Emblem (top-right circle) ────────────────────────────────────────────
  const emblemCx = ox + CARD_W - 10;
  const emblemCy = oy + 6;
  const emblemR = 6; // 12 mm diameter

  doc.setFillColor(DARK);
  (doc as any).circle(emblemCx, emblemCy, emblemR, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  (doc as any).circle(emblemCx, emblemCy, emblemR, 'S');

  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('GA', emblemCx, emblemCy + 2.3, { align: 'center' });

  // ─── Photo area (left, 21×27 mm) ─────────────────────────────────────────────
  const px = ox + PAD + 1;
  const py = oy + 16;
  const pw = 21;
  const ph = 27;

  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'S');
  doc.setFillColor(SURFACE);
  doc.roundedRect(px + 0.3, py + 0.3, pw - 0.6, ph - 0.6, 1.2, 1.2, 'F');

  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) doc.addImage(img, 'JPEG', px + 0.3, py + 0.3, pw - 0.6, ph - 0.6);
    } catch { /* image non chargée, on continue sans photo */ }
  } else {
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(init, px + pw / 2, py + ph / 2 + 2, { align: 'center' });
  }

  // ─── Student info (center, x=25 mm from left) ────────────────────────────────
  const ix = 25;
  let cy = oy + 17;

  // MATRICULE
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text(`MATRICULE: ${e.matricule}`, ox + ix, cy);

  // Gold underline below matricule
  cy += 1.2;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.25);
  doc.line(ox + ix, cy, ox + ix + 30, cy);

  // NOM PRENOM (uppercase)
  cy += 2.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(nom, ox + ix, cy);

  // Thin separator line
  cy += 1.8;
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.15);
  doc.line(ox + ix, cy, ox + ix + 32, cy);

  // Détails
  cy += 2.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.text(`Sexe: ${e.sexe}`, ox + ix, cy);

  if (e.date_naissance) {
    cy += 3.5;
    doc.text(`Né(e) le: ${e.date_naissance}`, ox + ix, cy);
  }

  cy += 3.5;
  doc.text(`Section: ${e.section}`, ox + ix, cy);

  if (e.classe) {
    cy += 3.5;
    doc.text(`Classe: ${e.classe}`, ox + ix, cy);
  }

  // ─── Bottom left ─────────────────────────────────────────────────────────────
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.text(`${annee}`, ox + PAD + 1, oy + CARD_H - 5);

  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3);
  doc.text("CARTE D'ÉLÈVE", ox + PAD + 1, oy + CARD_H - 2.5);

  // ─── QR Code (bottom-right of blue zone, 18×18 mm) ───────────────────────────
  const qrData = `MATRICULE:${e.matricule}|ELEVE:${nom}|SECTION:${e.section}|CLASSE:${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
  const qs = 18;
  const qx = ox + CARD_W - qs - 4;
  const qy = oy + CARD_H - qs - 5;

  // White background behind QR
  doc.setFillColor(WHITE);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1.5, 1.5, 'F');
  // QR image
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
  // Border
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1.5, 1.5, 'S');

  // ─── Micro text (rotated 90°, bottom-right of blue zone) ─────────────────────
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3);
  doc.text('Éducation • Excellence • Avenir', ox + CARD_W - 1.5, oy + CARD_H - 3, {
    angle: 90,
    align: 'left',
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  if (url.includes('supabase.co') || url.startsWith('data:')) return url;
  return null;
}
