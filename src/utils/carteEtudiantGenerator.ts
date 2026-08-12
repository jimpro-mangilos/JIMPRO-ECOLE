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

// ─── Design System — Premium Dark ─────────────────────────────────────────────
const NAVY = '#0f0c29';
const NAVY_MID = '#1a1a2e';
const GOLD = '#d4a853';
const GOLD_LIGHT = '#f0d060';
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
  const annee = e.annee_scolaire || '2026-2027';
  const initials = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
  const dateNaiss = e.date_naissance
    ? (m => m ? `${m[3]}/${m[2]}/${m[1]}` : e.date_naissance!)(e.date_naissance.match(/^(\d{4})-(\d{2})-(\d{2})/))
    : '—';

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Dark background
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(NAVY);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 2, 2, 'F');

  // Dot grid pattern (subtle)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
  doc.setFillColor(WHITE);
  for (let dx = ox + 3; dx < ox + CARD_W; dx += 5) {
    for (let dy = oy + 3; dy < oy + CARD_H; dy += 5) {
      (doc as any).circle(dx, dy, 0.2, 'F');
    }
  }
  doc.restoreGraphicsState();

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Gold top bar
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(GOLD);
  doc.rect(ox, oy, CARD_W, 0.8, 'F');

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Gold bottom bar (large)
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(GOLD_LIGHT);
  doc.rect(ox, oy + CARD_H - 1.8, CARD_W, 1.8, 'F');

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. Decorative circles
  // ══════════════════════════════════════════════════════════════════════════════
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.4);
  (doc as any).circle(ox + CARD_W + 8, oy - 6, 16, 'S');
  (doc as any).circle(ox + CARD_W + 8, oy - 6, 12, 'S');
  doc.restoreGraphicsState();

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. Header: logo + school name + OFFICIEL badge
  // ══════════════════════════════════════════════════════════════════════════════
  const leftPad = ox + 4;

  // Logo
  if (logo) {
    const fmt = logo.startsWith('data:image/jpeg') || logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(logo, fmt, leftPad + 1, oy + 3, 7, 7);
  } else {
    doc.setFillColor(GOLD);
    doc.roundedRect(leftPad + 1, oy + 3, 7, 7, 1.5, 1.5, 'F');
    doc.setTextColor(NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4);
    doc.text('GA', leftPad + 4.5, oy + 7.5, { align: 'center' });
  }

  // Carte d'élève
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.5);
  doc.text("CARTE D'ÉLÈVE", leftPad + 10, oy + 6);

  // OFFICIEL badge
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.25);
  doc.roundedRect(ox + CARD_W - 22, oy + 2.5, 18, 3.5, 1.5, 1.5, 'S');
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(2.2);
  doc.text('OFFICIEL', ox + CARD_W - 13, oy + 4.8, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Gold hairline separator
  // ══════════════════════════════════════════════════════════════════════════════
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.1);
  doc.line(leftPad, oy + 13, ox + CARD_W - 4, oy + 13);
  doc.restoreGraphicsState();

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. Photo
  // ══════════════════════════════════════════════════════════════════════════════
  const photoX = leftPad + 2;
  const photoY = oy + 16;
  const photoW = 16;
  const photoH = 20;

  // Année scolaire (above photo)
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text(`ANNÉE ${annee}`, photoX + photoW / 2, photoY + photoH + 2.5, { align: 'center' });

  // Shadow
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setFillColor('#000000');
  doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW, photoH, 3, 3, 'F');
  doc.restoreGraphicsState();

  // Photo background
  doc.setFillColor('#1a1a2e');
  doc.roundedRect(photoX, photoY, photoW, photoH, 3, 3, 'F');

  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) {
        doc.saveGraphicsState();
        doc.roundedRect(photoX, photoY, photoW, photoH, 3, 3, 'S');
        doc.clip();
        doc.addImage(img, 'JPEG', photoX, photoY, photoW, photoH);
        doc.restoreGraphicsState();
      }
    } catch { /* skip */ }
  }

  if (!e.photo_url) {
    doc.setTextColor(GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 3, { align: 'center' });
  }

  // Gold border
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX, photoY, photoW, photoH, 3, 3, 'S');

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. Name + program
  // ══════════════════════════════════════════════════════════════════════════════
  const infoX = photoX + photoW + 4;

  // NOM ÉLÈVE label
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('NOM ÉLÈVE', infoX, oy + 16.5);

  // Nom
  doc.setTextColor(WHITE);
  doc.setFontSize(3.2);
  doc.text(`${e.nom} ${e.postnom}`, infoX, oy + 19.5);

  // PRÉNOM label
  doc.setTextColor(GOLD);
  doc.setFontSize(1.3);
  doc.text('PRÉNOM', infoX, oy + 22.5);

  // Prénom
  doc.setTextColor(WHITE);
  doc.setFontSize(3);
  doc.text(e.prenom, infoX, oy + 25.5);

  // CLASSE label
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('CLASSE', infoX, oy + 28);

  // Classe value
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.5);
  doc.text(e.classe || '—', infoX, oy + 30.5);

  // SEXE label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('SEXE', infoX + 22, oy + 28);

  // Sexe value
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.5);
  doc.text(e.sexe, infoX + 22, oy + 30.5);

  // OPTION label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('OPTION', infoX, oy + 33);

  // Option value
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.5);
  doc.text(e.option || '—', infoX, oy + 35.5);

  // MATRICULE label
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('MATRICULE', infoX, oy + 38.5);

  // Matricule value
  doc.setTextColor(WHITE);
  doc.setFontSize(2.2);
  doc.text(e.matricule, infoX, oy + 41);

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. Bottom meta
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(1.3);
  doc.text(`Naissance: ${dateNaiss}`, leftPad, oy + 46);

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. JIMPRO label + QR Code (25×25mm)
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(1.3);
  doc.text('JIMPRO', ox + CARD_W - 13, oy + 8.5, { align: 'center' });
  const qrData = `MATRICULE:${e.matricule}|ELEVE:${nomComplet}|SECTION:${e.section}|CLASSE:${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 600, margin: 2, errorCorrectionLevel: 'H' });
  const qs = 25;
  const qx = ox + CARD_W - qs - 1.5;
  const qy = oy + CARD_H - qs - 4.5;

  doc.setFillColor(WHITE);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1, 1, 'F');
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
}
