import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { loadLogoBase64, loadSchoolName, sanitizePdfText, formatDatePDF, PDF_THEME } from './pdfTheme';
import { getSchoolInitials } from './schoolInitials';

export interface PersonnelCarteService {
  matricule: string | null;
  nom: string;
  postnom?: string | null;
  prenom: string;
  sexe?: string | null;
  fonction: string;
  date_naissance?: string | null;
  nationalite?: string | null;
  date_embauche?: string | null;
  photo_url?: string | null;
}

async function fetchImageBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function generateCarteService(p: PersonnelCarteService): Promise<void> {
  const schoolName = sanitizePdfText(await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const c = PDF_THEME.colors;
  const nomComplet = sanitizePdfText(`${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}`).toUpperCase();

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [54, 85] });

  // Bandeau en-tête (marine) + liseré or
  doc.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
  doc.rect(0, 0, 85, 15, 'F');
  doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
  doc.rect(0, 15, 85, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CARTE DE SERVICE', 42.5, 6.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(schoolName, 42.5, 12, { align: 'center' });
  if (logo) {
    try { doc.addImage(logo, 'PNG', 6, 3.5, 8, 8); } catch { /* ignore */ }
  }

  // Photo (ou initiales)
  const photoX = 6, photoY = 18.5, photoW = 28, photoH = 32;
  doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'S');
  let photoDrawn = false;
  if (p.photo_url) {
    try {
      const b64 = await fetchImageBase64(p.photo_url);
      doc.addImage(b64, 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2, undefined, 'FAST');
      photoDrawn = true;
    } catch { /* fallback initiales */ }
  }
  if (!photoDrawn) {
    doc.setFillColor(c.primarySoft[0], c.primarySoft[1], c.primarySoft[2]);
    doc.roundedRect(photoX + 1, photoY + 1, photoW - 2, photoH - 2, 1.2, 1.2, 'F');
    doc.setTextColor(c.primary[0], c.primary[1], c.primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const ini = getSchoolInitials(`${p.nom} ${p.prenom}`);
    doc.text(ini, photoX + photoW / 2, photoY + photoH / 2 + 1, { align: 'center' });
  }

  // Identité
  const ix = 38;
  let iy = 20;
  doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);

  const rows: [string, string][] = [
    ['NOM', nomComplet],
    ['FONCTION', sanitizePdfText(p.fonction).toUpperCase()],
    ['MATRICULE', sanitizePdfText(p.matricule || '—').toUpperCase()],
    ['SEXE', sanitizePdfText(p.sexe || '—')],
    ['NÉ(E) LE', formatDatePDF(p.date_naissance)],
    ['NATIONALITÉ', sanitizePdfText(p.nationalite || '—')],
    ['EMBAUCHE', formatDatePDF(p.date_embauche)],
  ];

  for (const [label, value] of rows) {
    doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(label, ix, iy);
    doc.setTextColor(c.black[0], c.black[1], c.black[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const v = value.length > 30 ? value.slice(0, 29) + '…' : value;
    doc.text(v, ix + 16, iy);
    iy += 5.3;
  }

  // QR code (matricule)
  try {
    const qr = await QRCode.toDataURL(`MATRICULE:${p.matricule || ''}|NOM:${nomComplet}|FONCTION:${p.fonction}`, { width: 300, margin: 1, errorCorrectionLevel: 'M' });
    doc.addImage(qr, 'PNG', 68, 18.5, 12, 12);
  } catch { /* ignore */ }

  // Pied
  doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Carte de service — valable pour l\'année scolaire en cours', 42.5, 52.5, { align: 'center' });

  doc.save(`Carte-service-${sanitizePdfText(p.matricule || p.nom).replace(/\s+/g, '-')}.pdf`);
}
