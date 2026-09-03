import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { sanitizePdfText, PDF_THEME, drawReportHeader, contentStartY, loadSchoolName, loadLogoBase64 } from './pdfTheme';

export interface BulletinNoteLigne {
  titre: string;
  description?: string;
  dateLimite?: string | null;
  note: number | null;
  appreciation?: string | null;
}

/** Génère le bulletin de notes PDF d'un élève. */
export async function generateBulletinNotes(params: {
  eleveNom: string;
  eleveMatricule?: string | null;
  classe: string;
  periodeLabel: string;
  lignes: BulletinNoteLigne[];
}) {
  const { eleveNom, eleveMatricule, classe, periodeLabel, lignes } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();

  await drawReportHeader(doc, { title: 'Bulletin de notes', subtitle: periodeLabel, logoBase64: logo, schoolName });

  doc.setFontSize(11);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  const cy = contentStartY();
  doc.text(`Élève : ${sanitizePdfText(eleveNom.toUpperCase())}`, 15, cy);
  doc.text(`Matricule : ${sanitizePdfText(eleveMatricule || '-')}    Classe : ${sanitizePdfText(classe)}`, 15, cy + 6);

  const body = lignes.map(l => [
    sanitizePdfText(l.titre),
    l.note != null ? String(l.note) : '-',
    sanitizePdfText(l.appreciation || ''),
  ]);

  const notes = lignes.map(l => l.note).filter((n): n is number => n != null);
  const moyenne = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

  (doc as any).autoTable({
    startY: contentStartY() + 12,
    head: [['Devoir', 'Note /20', 'Appréciation']],
    body,
    foot: [[{ content: `Moyenne : ${moyenne != null ? moyenne.toFixed(2) + ' /20' : '-'}`, colSpan: 3, styles: { halign: 'left' } }]],
    theme: 'grid',
    headStyles: { fillColor: PDF_THEME.colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: PDF_THEME.colors.black, cellPadding: 2 },
    footStyles: { fillColor: PDF_THEME.colors.slateSoft, textColor: PDF_THEME.colors.primary, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center', cellWidth: 25 }, 2: { cellWidth: 55 } },
    margin: { left: 15, right: 15 },
  });

  doc.save(`bulletin-notes-${(eleveMatricule || eleveNom).replace(/\s+/g, '-')}.pdf`);
}
