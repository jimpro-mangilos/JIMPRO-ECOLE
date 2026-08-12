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
const NAVY        = '#0a1628';
const GOLD_ACCENT = '#c8a45c';
const WARM_WHITE  = '#fafaf9';
const LIGHT_GRAY  = '#e8e5df';
const MED_TEXT    = '#5c5c5c';

// RGBA via GState (jsPDF ne supporte pas rgba en string)
const rgba = (doc: jsPDF, r: number, g: number, b: number, a: number) => {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: a }));
  doc.setDrawColor(r, g, b);
  return () => doc.restoreGraphicsState();
};

const CARD_W = 85; // mm
const CARD_H = 54; // mm

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
  const nomComplet = `${e.nom} ${e.postnom ? e.postnom + ' ' : ''}${e.prenom}`.toUpperCase();
  const displayNom = e.nom.toUpperCase() + (e.postnom ? ' ' + e.postnom.toUpperCase() : '');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. BACKGROUND — solid warm white with subtle rounded corners
  // ═══════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(WARM_WHITE);
  doc.roundedRect(ox, oy, CARD_W, CARD_H, 1.5, 1.5, 'F');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. ANTI-COUNTERFEIT: subtle diagonal line pattern (45°, opacity 0.02)
  // ═══════════════════════════════════════════════════════════════════════════════
  const endDiag = rgba(doc, 0x1a, 0x1a, 0x1a, 0.02);
  doc.setLineWidth(0.08);
  for (let i = -60; i < 120; i += 2.5) {
    doc.line(ox + i, oy, ox + i + 60, oy + CARD_H);
  }
  endDiag();

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. WATERMARK — centered faint logo/crest (opacity 0.03)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (logo) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
    const wmSize = 32;
    const fmt = logo.startsWith('data:image/jpeg') || logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(logo, fmt, ox + (CARD_W - wmSize) / 2, oy + (CARD_H - wmSize) / 2, wmSize, wmSize);
    doc.restoreGraphicsState();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. TOP HAIRLINE — full-width champagne gold, 0.3mm
  // ═══════════════════════════════════════════════════════════════════════════════
  doc.setDrawColor(GOLD_ACCENT);
  doc.setLineWidth(0.3);
  doc.line(ox, oy + 0.5, ox + CARD_W, oy + 0.5);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. PHOTO ZONE (left, 36×48mm, bleeds to left edge)
  // ═══════════════════════════════════════════════════════════════════════════════
  const photoX = ox + 2;
  const photoY = oy + 2;
  const photoW = 16;
  const photoH = 20;

  // Photo interior fill
  doc.setFillColor(LIGHT_GRAY);
  doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 1.8, 1.8, 'F');

  let photoDrawn = false;
  if (e.photo_url) {
    try {
      const img = await loadImage(e.photo_url);
      if (img) {
        doc.addImage(img, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
        photoDrawn = true;

        // Subtle dark vignette overlay at bottom 40% of photo
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
        doc.setFillColor('#000000');
        doc.rect(photoX + 0.5, photoY + photoH * 0.6, photoW - 1, photoH * 0.4, 'F');
        doc.restoreGraphicsState();
      }
    } catch { /* image non chargée, on continue sans photo */ }
  }

  if (!photoDrawn) {
    // Elegant guilloche-like pattern with initials
    const init = (e.nom.charAt(0) + e.prenom.charAt(0)).toUpperCase();
    const cxP = photoX + photoW / 2;
    const cyP = photoY + photoH / 2;

    // Intersecting thin lines (banknote guilloche)
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.setDrawColor(NAVY);
    doc.setLineWidth(0.08);
    const maxR = Math.sqrt(photoW * photoW + photoH * photoH) / 2 + 5;
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = angle * Math.PI / 180;
      const dx = Math.cos(rad) * maxR;
      const dy = Math.sin(rad) * maxR;
      doc.line(cxP - dx, cyP - dy, cxP + dx, cyP + dy);
    }
    doc.restoreGraphicsState();

    // Initials centered
    doc.setTextColor(NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(init, cxP, cyP + 3.5, { align: 'center' });
  }

  // Gold frame around photo (drawn last so it overlays photo/vignette)
  doc.setDrawColor(GOLD_ACCENT);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX + 0.2, photoY + 0.2, photoW - 0.4, photoH - 0.4, 2, 2, 'S');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. SCHOOL IDENTITY (top right)
  // ═══════════════════════════════════════════════════════════════════════════════
  const rightX = ox + 20;

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('GOLDEN ACADEMY', rightX, oy + 5);

  // Gold dot separator
  doc.setFillColor(GOLD_ACCENT);
  (doc as any).circle(rightX + 0.5, oy + 6.2, 0.4, 'F');

  doc.setTextColor(MED_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.8);
  doc.text("Établissement d'Enseignement", rightX + 2.5, oy + 6.5);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. STUDENT NAME (prominent)
  // ═══════════════════════════════════════════════════════════════════════════════
  let nameY = oy + 10;

  // Last name + postnom (uppercase, bold, navy)
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(displayNom, rightX, nameY);

  // First name
  nameY += 5.5;
  doc.setTextColor(MED_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(e.prenom, rightX, nameY);

  // Gold separator line below name
  nameY += 1.8;
  doc.setDrawColor(GOLD_ACCENT);
  doc.setLineWidth(0.2);
  doc.line(rightX, nameY, rightX + 25, nameY);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. MATRICULE (with barcode aesthetic)
  // ═══════════════════════════════════════════════════════════════════════════════
  let matY = oy + 18.5;

  doc.setTextColor(MED_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.5);
  doc.text('MATRICULE', rightX, matY);

  matY += 2.4;

  // Alternating subtle background bars (barcode aesthetic)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.setFillColor(NAVY);
  const barW = 0.7;
  const barGap = 0.5;
  const barCount = 28;
  for (let i = 0; i < barCount; i++) {
    if (i % 3 !== 0) {
      doc.rect(rightX + i * (barW + barGap), matY - 2.2, barW, 3, 'F');
    }
  }
  doc.restoreGraphicsState();

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text(e.matricule, rightX, matY);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. STUDENT DETAILS (2-column grid)
  // ═══════════════════════════════════════════════════════════════════════════════
  let gridY = oy + 23.5;
  const col1X = rightX;
  const col2X = ox + 60;
  const colW = 18;
  const rowH = 7;

  const drawDetail = (label: string, value: string, x: number, y: number) => {
    // Label
    doc.setTextColor(MED_TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(2.5);
    doc.text(label, x, y);

    // Thin underline
    doc.setDrawColor(LIGHT_GRAY);
    doc.setLineWidth(0.1);
    doc.line(x, y + 0.8, x + colW - 2, y + 0.8);

    // Value
    doc.setTextColor(NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.2);
    doc.text(value, x, y + 2.5);
  };

  // Row 1: Sexe | Né(e) le
  drawDetail('Sexe', e.sexe, col1X, gridY);
  drawDetail('Né(e) le', e.date_naissance || '—', col2X, gridY);

  // Row 2: Section | Classe
  gridY += rowH;
  drawDetail('Section', e.section, col1X, gridY);
  drawDetail('Classe', e.classe || '—', col2X, gridY);

  // Row 3: Option | Responsable
  gridY += rowH;
  drawDetail('Option', e.option || '—', col1X, gridY);
  drawDetail('Responsable', '—', col2X, gridY);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 10. QR CODE ZONE (bottom right)
  // ═══════════════════════════════════════════════════════════════════════════════
  const qrData = `MATRICULE:${e.matricule}|ELEVE:${nomComplet}|SECTION:${e.section}|CLASSE:${e.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 600, margin: 0, errorCorrectionLevel: 'H' });
  const qs = 34;
  const qx = ox + CARD_W - qs - 2;
  const qy = oy + CARD_H - qs - 2;

  // White border around QR
  doc.setFillColor(WARM_WHITE);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1, 1, 'F');

  // Subtle gold border
  doc.setDrawColor(GOLD_ACCENT);
  doc.setLineWidth(0.2);
  doc.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1, 1, 'S');

  // QR image
  doc.addImage(qrUrl, 'PNG', qx, qy, qs, qs);

  // QR label (integrated into the card design — no separate label needed)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11. BOTTOM STRIP
  // ═══════════════════════════════════════════════════════════════════════════════
  const stripY = oy + 47;

  // Left: year
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3);
  doc.text(annee, rightX, stripY);

  // Right: "CARTE D'ÉLÈVE"
  doc.setTextColor(GOLD_ACCENT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(2.5);
  doc.text("CARTE D'ÉLÈVE", ox + 80, stripY);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12. SCHOOL SEAL (bottom left corner, overlaid on photo)
  // ═══════════════════════════════════════════════════════════════════════════════
  const sealCx = ox + 4;
  const sealCy = oy + 43;
  const sealR = 4;

  // White background for seal
  doc.setFillColor(WARM_WHITE);
  (doc as any).circle(sealCx, sealCy, sealR + 1, 'F');

  // Outer gold ring
  doc.setDrawColor(GOLD_ACCENT);
  doc.setLineWidth(0.5);
  (doc as any).circle(sealCx, sealCy, sealR, 'S');

  // Inner navy ring
  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.3);
  (doc as any).circle(sealCx, sealCy, sealR - 0.8, 'S');

  // "GA" text centered in seal
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text('GA', sealCx, sealCy + 1.2, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 13. MICRO-TEXT along bottom edge
  // ═══════════════════════════════════════════════════════════════════════════════
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setTextColor(MED_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(1.8);
  const microText = 'CARTE OFFICIELLE  •  CS GOLDEN ACADEMY  •  NE PAS PLIER  •  DOCUMENT NON TRANSFERABLE  •  ';
  doc.text(microText + microText, ox + CARD_W / 2, oy + CARD_H - 0.8, { align: 'center' });
  doc.restoreGraphicsState();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  if (url.includes('supabase.co') || url.startsWith('data:')) return url;
  return null;
}
