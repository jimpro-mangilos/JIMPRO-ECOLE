import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { sanitizePdfText, PDF_THEME, drawReportHeader, contentStartY, loadSchoolName, loadLogoBase64 } from './pdfTheme';

export interface SalaireLigne {
  nom: string;
  postnom?: string | null;
  prenom: string;
  fonction: string;
  matricule?: string | null;
  joursPresent: number;
  salaireMensuel: number | null;
  salaireJournalier: number | null;
  salaireMois: number | null;
}

function fmtFC(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${Math.round(n).toLocaleString('fr-FR')} FC`;
}

function fmtUSD(n: number | null | undefined, taux: number | null): string {
  if (n == null || !taux || taux <= 0) return '-';
  return `${(n / taux).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/**
 * Génère le PDF du tableau des salaires du mois (jours présents × salaire journalier).
 */
export async function generatePointageSalaireReport(params: {
  month: number;
  year: number;
  rows: SalaireLigne[];
  tauxChange: number | null;
}) {
  const { month, year, rows, tauxChange } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const moisLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  await drawReportHeader(doc, {
    title: `Salaires du mois — ${moisLabel}`,
    subtitle: `${tauxChange ? `1 $ = ${tauxChange} FC · ` : ''}Salaire journalier = salaire mensuel ÷ jours ouvrables`,
    logoBase64: logo,
    schoolName,
  });

  const body = rows.map(r => [
    sanitizePdfText(`${r.nom} ${r.postnom || ''} ${r.prenom}`),
    sanitizePdfText(r.fonction),
    String(r.joursPresent),
    fmtFC(r.salaireMensuel),
    fmtFC(r.salaireJournalier),
    fmtFC(r.salaireMois),
    fmtUSD(r.salaireMois, tauxChange),
  ]);

  const totalFC = rows.reduce((acc, r) => acc + (r.salaireMois || 0), 0);

  (doc as any).autoTable({
    startY: contentStartY(),
    head: [['Personnel', 'Fonction', 'Jours présents', 'Salaire mensuel', 'Salaire journalier', 'Salaire du mois (FC)', 'Salaire du mois ($)']],
    body,
    foot: [['', '', '', '', '', sanitizePdfText(fmtFC(totalFC)), sanitizePdfText(fmtUSD(totalFC, tauxChange))]],
    theme: 'grid',
    headStyles: {
      fillColor: PDF_THEME.colors.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 1.5,
    },
    bodyStyles: { fontSize: 7.5, textColor: PDF_THEME.colors.black, cellPadding: 1.2 },
    footStyles: { fillColor: PDF_THEME.colors.slateSoft, textColor: PDF_THEME.colors.primary, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 40 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', cellWidth: 36 },
      6: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`salaires-${year}-${String(month).padStart(2, '0')}.pdf`);
}
