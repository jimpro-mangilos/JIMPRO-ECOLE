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
const DARK    = '#1e293b';   // slate-800
const PRIMARY = '#2563eb';   // blue-600
const MUTED   = '#94a3b8';   // slate-400
const SURFACE = '#f8fafc';   // slate-50
const BORDER  = '#e2e8f0';   // slate-200
const GOLD    = '#eab308';   // yellow-500
const WHITE   = '#ffffff';

const CARD_W = 86; // mm
const CARD_H = 54; // mm
const PAD = 3.5;

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
    doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
    const logoWm = CARD_W * 0.7;
    const logoHm = CARD_H * 0.5;
    doc.addImage(logo, 'PNG', ox + (CARD_W - logoWm) / 2, oy + (CARD_H - logoHm) / 2, logoWm, logoHm);
    doc.restoreGraphicsState();
  }

  // ─── Top band ────────────────────────────────────────────────────────────────
  doc.setFillColor(DARK);
  doc.roundedRect(ox, oy, CARD_W, 13, 2, 2, 'F');
  doc.rect(ox, oy + 11, CARD_W, 2, 'F'); // fill curved bottom

  // Bottom gold stripe below band
  doc.setFillColor(GOLD);
  doc.rect(ox + PAD, oy + 13, CARD_W - PAD * 2, 0.4, 'F');

  // School name in top band
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('GOLDEN ACADEMY', ox + PAD + 1, oy + 7);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.2);
  doc.text('Établissement d\'Enseignement', ox + PAD + 1, oy + 10.5);

  // ─── Badge top-right ─────────────────────────────────────────────────────────
  doc.setFillColor(GOLD);
  doc.roundedRect(ox + CARD_W - 22, oy + 2, 19, 5, 1, 1, 'F');
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text("CARTE D'ÉLÈVE", ox + CARD_W - 12.5, oy + 5.5, { align: 'center' });

  // ─── Logo ────────────────────────────────────────────────────────────────────
  if (logo) {
    doc.addImage(logo, 'PNG', ox + CARD_W - 20, oy + 8, 10, 7);
  }

  // ─── Photo area ─────────────────────────────────────────────────────────────
  const px = ox + PAD + 1;
  const py = oy + 16;
  const pw = 18;
  const ph = 24;

  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.6);
  doc.roundedRect(px, py, pw, ph, 2, 2, 'S');
  doc.setFillColor(SURFACE);
  doc.roundedRect(px + 0.5, py + 0.5, pw - 1, ph - 1, 1.5, 1.5, 'F');

  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) doc.addImage(img, 'JPEG', px + 0.5, py + 0.5, pw - 1, ph - 1);
    } catch { /* image non chargée, on continue sans photo */ }
  } else {
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(init, px + pw / 2, py + ph / 2 + 2, { align: 'center' });
  }

  // ─── Student info (center area) ─────────────────────────────────────────────
  const ix = px + pw + 3;
  const iy = py + 2;

  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(nom, ix, iy);

  // Matricule pill
  doc.setFillColor('#eff6ff');
  doc.roundedRect(ix, iy + 3.5, 32, 5, 1, 1, 'F');
  doc.setTextColor(PRIMARY);
  doc.setFontSize(4.5);
  doc.text(e.matricule, ix + 1.5, iy + 7);

  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  const sexeLabel = e.sexe === 'M' ? 'Masculin' : 'Féminin';
  const ageInfo = e.date_naissance ? ` · Né(e) ${e.date_naissance}` : '';
  doc.text(`${sexeLabel}${ageInfo}`, ix, iy + 12);

  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  const classe = [e.section, e.classe, e.option].filter(Boolean).join('  ·  ');
  doc.text(classe, ix, iy + 15);

  // ─── Bottom info bar (drawn FIRST so QR goes on top) ────────────────────────
  const by = oy + CARD_H;
  doc.setFillColor(DARK);
  doc.roundedRect(ox + PAD, by - 9, CARD_W - PAD * 2, 7, 1.5, 1.5, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text(`ANNÉE ${annee}`, ox + CARD_W / 2, by - 4, { align: 'center' });

  // ─── Signature ──────────────────────────────────────────────────────────────
  doc.setDrawColor('#94a3b8');
  doc.setLineWidth(0.15);
  doc.line(ox + PAD + 1, by - 2.5, ox + CARD_W / 2 - 4, by - 2.5);
  doc.setTextColor('#94a3b8');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(2.5);
  doc.text('Signature', ox + CARD_W / 4 - 5, by - 1.2, { align: 'center' });

  // ─── QR Code (ON TOP of the bottom bar) ──────────────────────────────────────
  const qrData = `${e.matricule}|${nom}|${e.section}|${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
  const qs = 24;
  const qx = ox + CARD_W - qs - PAD;
  const qy = oy + CARD_H - qs - 3;
  // White card behind QR
  doc.setFillColor(WHITE);
  doc.roundedRect(qx - 2, qy - 2, qs + 4, qs + 4, 2, 2, 'F');
  // QR image
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
  // Border
  doc.setDrawColor('#cbd5e1');
  doc.setLineWidth(0.3);
  doc.roundedRect(qx - 2, qy - 2, qs + 4, qs + 4, 2, 2, 'S');
  // Label above QR
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.8);
  doc.text('Scanner', qx + qs / 2, qy - 3.5, { align: 'center' });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  if (url.includes('supabase.co') || url.startsWith('data:')) return url;
  return null;
}
