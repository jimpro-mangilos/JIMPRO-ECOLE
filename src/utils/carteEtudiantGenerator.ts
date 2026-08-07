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

const DARK = '#1e2a5e';      // bleu foncé
const PRIMARY = '#1d4ed8';   // bleu école
const LIGHT_GRAY = '#f8fafc';
const ACCENT = '#f59e0b';    // doré

const CARD_W = 85;  // mm (credit card width)
const CARD_H = 54;  // mm (credit card height)
const MARGIN = 3;

export async function generateCarteEtudiant(
  eleve: CarteEtudiantEleve,
  logoBase64?: string | null,
  stampBase64?: string | null,
  isDryRun = false
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_H, CARD_W],
  });

  const annee = eleve.annee_scolaire || new Date().getFullYear().toString();

  // ─── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor('#ffffff');
  doc.rect(0, 0, CARD_W, CARD_H, 'F');

  // ─── Top band ─────────────────────────────────────────────────────────────────
  doc.setFillColor(DARK);
  doc.rect(0, 0, CARD_W, 12, 'F');

  // School name in top band
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('GOLDEN ACADEMY', MARGIN, 6);

  // School year badge
  doc.setFillColor(PRIMARY);
  doc.roundedRect(CARD_W - 18, 1.5, 16, 9, 1, 1, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text('ANNEE', CARD_W - 10, 5.5, { align: 'center' });
  doc.setFontSize(5);
  doc.text(annee, CARD_W - 10, 9, { align: 'center' });

  // ─── Logo ─────────────────────────────────────────────────────────────────────
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', MARGIN, 14, 10, 7);
  }

  // ─── CARD label ───────────────────────────────────────────────────────────────
  doc.setFillColor(ACCENT);
  doc.roundedRect(CARD_W - 28, 13, 26, 5, 1, 1, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text("CARTE D'ELEVE", CARD_W - 15, 16.3, { align: 'center' });

  // ─── Photo placeholder ────────────────────────────────────────────────────────
  const photoX = MARGIN + 2;
  const photoY = 24;
  const photoW = 18;
  const photoH = 22;
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'S');
  doc.setFillColor(LIGHT_GRAY);
  doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 1, 1, 'F');

  if (eleve.photo_url) {
    try {
      const img = await loadImage(eleve.photo_url);
      if (img) doc.addImage(img, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
    } catch { /* use placeholder */ }
  }

  // Initials in placeholder
  if (!eleve.photo_url) {
    const initials = (eleve.nom.charAt(0) + eleve.prenom.charAt(0)).toUpperCase();
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 1.5, { align: 'center' });
  }

  // ─── Student info ─────────────────────────────────────────────────────────────
  const infoX = photoX + photoW + 3;
  const infoY = 25;

  // Name
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  const nomComplet = `${eleve.nom} ${eleve.postnom ? eleve.postnom + ' ' : ''}${eleve.prenom}`.toUpperCase();
  doc.text(nomComplet, infoX, infoY);

  // Matricule
  doc.setTextColor(PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text(eleve.matricule, infoX, infoY + 5);

  // Sexe
  doc.setTextColor('#6b7280');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.text(`${eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}`, infoX, infoY + 8);

  // Section - Classe
  doc.setTextColor('#374151');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  const classeInfo = [eleve.section, eleve.classe, eleve.option].filter(Boolean).join(' - ');
  doc.text(classeInfo, infoX, infoY + 10.5);

  // Date naissance
  if (eleve.date_naissance) {
    doc.setTextColor('#9ca3af');
    doc.setFontSize(4);
    doc.text(`Né(e): ${eleve.date_naissance}`, infoX, infoY + 13);
  }

  // ─── QR Code ──────────────────────────────────────────────────────────────────
  const qrData = `${eleve.matricule}|${nomComplet}|${eleve.section}|${eleve.classe || ''}`;
  const qrUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1, errorCorrectionLevel: 'M' });
  const qrX = CARD_W - 19;
  const qrY = 32;
  const qrSize = 14;
  doc.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setTextColor('#6b7280');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3);
  doc.text('Scanner pour vérifier', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });

  // ─── Bottom line ──────────────────────────────────────────────────────────────
  doc.setDrawColor(DARK);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, CARD_H - 9, CARD_W - MARGIN, CARD_H - 9);

  // Stamp area
  if (stampBase64) {
    doc.addImage(stampBase64, 'PNG', CARD_W - 25, CARD_H - 8, 12, 8);
  } else {
    doc.setFillColor(DARK);
    doc.roundedRect(CARD_W - 25, CARD_H - 8, 12, 7, 1, 1, 'S');
    doc.setTextColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.5);
    doc.text('CACHET', CARD_W - 19, CARD_H - 3.5, { align: 'center' });
  }

  // Signature line
  doc.setDrawColor('#9ca3af');
  doc.setLineWidth(0.2);
  doc.line(MARGIN, CARD_H - 3, CARD_W / 2 - 2, CARD_H - 3);
  doc.setTextColor('#9ca3af');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(3);
  doc.text('Signature du titulaire', CARD_W / 2 - 3, CARD_H - 1.2, { align: 'center' });

  if (isDryRun) return doc;

  // ─── Page backend ────────────────────────────────────────────────────────────
  doc.addPage([CARD_H, CARD_W]);
  doc.setFillColor(LIGHT_GRAY);
  doc.rect(0, 0, CARD_W, CARD_H, 'F');

  doc.setFillColor(DARK);
  doc.rect(0, 0, CARD_W, 10, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('INFORMATIONS DE VALIDATION', CARD_W / 2, 6.5, { align: 'center' });

  doc.setTextColor('#374151');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  const backLines = [
    'Cette carte est la propriete de Golden Academy.',
    'Elle doit etre presentee a toute demande.',
    `Delivree le: ${new Date().toLocaleDateString('fr-FR')}`,
    `Valide pour l'annee scolaire: ${annee}`,
    `Matricule: ${eleve.matricule}`,
    'En cas de perte, signalez immediatement.',
  ];
  backLines.forEach((line, i) => doc.text(line, MARGIN + 1, 14 + i * 5));

  return doc;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    // Public URLs from Supabase storage
    if (url.includes('supabase.co')) {
      return url;
    }
    // Data URLs
    if (url.startsWith('data:')) return url;
    return null;
  } catch {
    return null;
  }
}

export async function generateCartesEtudiants(
  eleves: CarteEtudiantEleve[],
  logoBase64?: string | null,
  stampBase64?: string | null
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cardsPerRow = 2;
  const cardsPerCol = 4;
  const pageW = 210;
  const pageH = 297;
  const spacingX = (pageW - cardsPerRow * CARD_W) / (cardsPerRow + 1);
  const spacingY = (pageH - cardsPerCol * CARD_H) / (cardsPerCol + 1);

  for (let i = 0; i < eleves.length; i++) {
    if (i > 0 && i % (cardsPerRow * cardsPerCol) === 0) doc.addPage();

    const idx = i % (cardsPerRow * cardsPerCol);
    const col = idx % cardsPerRow;
    const row = Math.floor(idx / cardsPerRow);
    const x = spacingX + col * (CARD_W + spacingX);
    const y = spacingY + row * (CARD_H + spacingY);

    const cardDoc = await generateCarteEtudiant(eleves[i], logoBase64, stampBase64, true);
    const cardImg = cardDoc.output('datauristring');

    doc.addImage(cardImg, 'JPEG', x, y, CARD_W, CARD_H);

    // Card outline
    doc.setDrawColor('#d1d5db');
    doc.setLineWidth(0.1);
    doc.roundedRect(x - 0.5, y - 0.5, CARD_W + 1, CARD_H + 1, 1.5, 1.5, 'S');
  }

  return doc;
}
