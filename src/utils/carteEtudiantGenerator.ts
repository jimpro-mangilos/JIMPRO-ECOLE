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
const DARK    = '#0f172a';   // slate-900
const PRIMARY = '#1e40af';   // blue-800
const ACCENT  = '#d97706';   // amber-600
const MUTED   = '#64748b';   // slate-500
const SURFACE = '#f1f5f9';   // slate-100
const BORDER  = '#e2e8f0';   // slate-200
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

  // ─── Background with subtle gradient effect via layered rectangles ────────
  doc.setFillColor(WHITE);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 2, 2, 'F');

  // ─── Left accent stripe ─────────────────────────────────────────────────────
  doc.setFillColor(DARK);
  doc.roundedRect(ox, oy, 4, CARD_H, 2, 2, 'F');
  doc.rect(ox + 2, oy, 2, CARD_H, 'F'); // fill the rounded gap on right side

  // ─── Top-right decorative triangle ──────────────────────────────────────────
  doc.setFillColor('#f8fafc');
  doc.triangle(ox + CARD_W, oy, ox + CARD_W - 22, oy, ox + CARD_W, oy + 16, 'F');

  // ─── Header: school name ────────────────────────────────────────────────────
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('GOLDEN', ox + PAD + 5, oy + 8);
  doc.setTextColor(PRIMARY);
  doc.setFontSize(5.5);
  doc.text('A C A D E M Y', ox + PAD + 5, oy + 12);

  // ─── Logo ────────────────────────────────────────────────────────────────────
  if (logo) {
    doc.addImage(logo, 'PNG', ox + CARD_W - 18, oy + PAD, 9, 6);
  }

  // ─── Thin separator ─────────────────────────────────────────────────────────
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.line(ox + PAD + 5, oy + 15, ox + CARD_W - PAD, oy + 15);

  // ─── Photo area ─────────────────────────────────────────────────────────────
  const px = ox + PAD + 5;
  const py = oy + 17.5;
  const pw = 18;
  const ph = 24;

  // Outer border
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.6);
  doc.roundedRect(px, py, pw, ph, 2, 2, 'S');
  // Inner background
  doc.setFillColor(SURFACE);
  doc.roundedRect(px + 0.5, py + 0.5, pw - 1, ph - 1, 1.5, 1.5, 'F');

  // Photo or initials
  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) doc.addImage(img, 'JPEG', px + 0.5, py + 0.5, pw - 1, ph - 1);
    } catch {}
  }
  if (!e.photo_url) {
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(init, px + pw / 2, py + ph / 2 + 2, { align: 'center' });
  }

  // ─── Info section ───────────────────────────────────────────────────────────
  const ix = px + pw + 3.5;
  const iy = py + 2;

  // Name
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(nom, ix, iy);

  // Matricule badge
  doc.setFillColor('#eef2ff');
  doc.roundedRect(ix, iy + 3.5, 36, 5, 1, 1, 'F');
  doc.setTextColor(PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text(e.matricule, ix + 1, iy + 7);

  // Sexe + Age
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  const sexeLabel = e.sexe === 'M' ? 'Masculin' : 'Féminin';
  const ageInfo = e.date_naissance ? ` • Né(e) ${e.date_naissance}` : '';
  doc.text(`${sexeLabel}${ageInfo}`, ix, iy + 12);

  // Section - Classe - Option
  doc.setTextColor('#334155');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  const classe = [e.section, e.classe, e.option].filter(Boolean).join('  ·  ');
  doc.text(classe, ix, iy + 15);

  // ─── Bottom panel ───────────────────────────────────────────────────────────
  const by = oy + CARD_H;

  // Dark bar at bottom
  doc.setFillColor(DARK);
  doc.roundedRect(ox + PAD, by - 10.5, CARD_W - PAD * 2, 8, 1.5, 1.5, 'F');

  // School year inside bar
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text(`ANNÉE SCOLAIRE ${annee}`, ox + CARD_W / 2, by - 5.5, { align: 'center' });

  // ─── Badge ──────────────────────────────────────────────────────────────────
  doc.setFillColor(ACCENT);
  doc.roundedRect(ox + CARD_W - 23, by - 13, 19, 4.5, 1, 1, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text("CARTE D'ÉLÈVE", ox + CARD_W - 13.5, by - 10.2, { align: 'center' });

  // ─── QR Code ────────────────────────────────────────────────────────────────
  const qrData = `${e.matricule}|${nom}|${e.section}|${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1, errorCorrectionLevel: 'M' });
  const qx = px + pw / 2 - 6;
  const qy = by - 18;
  const qs = 12;
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);
  // white padding behind QR
  doc.setFillColor('#ffffff');
  doc.roundedRect(qx - 0.5, qy - 0.5, qs + 1, qs + 1, 1, 1, 'S');
  doc.setDrawColor('#cbd5e1');
  doc.setLineWidth(0.1);
  doc.roundedRect(qx - 0.5, qy - 0.5, qs + 1, qs + 1, 1, 1, 'S');

  // QR Label
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.8);
  doc.text('Vérifier', qx + qs / 2, qy + qs + 2.5, { align: 'center' });

  // ─── Signature line ─────────────────────────────────────────────────────────
  doc.setDrawColor('#94a3b8');
  doc.setLineWidth(0.15);
  doc.line(ox + PAD + 5, by - 3.5, ox + CARD_W / 2 + 5, by - 3.5);
  doc.setTextColor('#94a3b8');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(2.8);
  doc.text('Signature du titulaire', ox + CARD_W / 4, by - 2, { align: 'center' });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  if (url.includes('supabase.co') || url.startsWith('data:')) return url;
  return null;
}
