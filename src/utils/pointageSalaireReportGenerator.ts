import { jsPDF } from 'jspdf';
import { exporterPdf } from './pdfExport';
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
  /** Paiements « prise en charge » du mois déduits du salaire (plafond 80 % du brut). */
  retenue?: number;
  /** Salaire net à payer : brut − retenue. */
  net?: number | null;
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
 * Dès qu'au moins un membre a une retenue « prise en charge », le rapport ajoute
 * les colonnes Retenue et Net à payer (brut − retenue, plafond 80 % du brut).
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

  const showPec = rows.some(r => (r.retenue || 0) > 0);

  await drawReportHeader(doc, {
    title: `Salaires du mois — ${moisLabel}`,
    subtitle: `${tauxChange ? `1 $ = ${tauxChange} FC · ` : ''}Salaire journalier = salaire mensuel ÷ jours ouvrables${showPec ? ' · prises en charge déduites (plafond 80 % du brut)' : ''}`,
    logoBase64: logo,
    schoolName,
  });

  const head = showPec
    ? ['Personnel', 'Fonction', 'Jours présents', 'Salaire mensuel', 'Salaire journalier', 'Brut du mois (FC)', 'Retenue (FC)', 'Net à payer (FC)', 'Net à payer ($)']
    : ['Personnel', 'Fonction', 'Jours présents', 'Salaire mensuel', 'Salaire journalier', 'Salaire du mois (FC)', 'Salaire du mois ($)'];

  const body = rows.map(r => {
    const base = [
      sanitizePdfText(`${r.nom} ${r.postnom || ''} ${r.prenom}`),
      sanitizePdfText(r.fonction),
      String(r.joursPresent),
      fmtFC(r.salaireMensuel),
      fmtFC(r.salaireJournalier),
    ];
    if (showPec) {
      const net = r.net ?? r.salaireMois ?? 0;
      return [...base, fmtFC(r.salaireMois), fmtFC(r.retenue || 0), fmtFC(net), fmtUSD(net, tauxChange)];
    }
    return [...base, fmtFC(r.salaireMois), fmtUSD(r.salaireMois, tauxChange)];
  });

  const totalBrut = rows.reduce((acc, r) => acc + (r.salaireMois || 0), 0);
  const totalNet = rows.reduce((acc, r) => acc + (r.net ?? r.salaireMois ?? 0), 0);
  const foot = showPec
    ? [['', '', '', '', '', sanitizePdfText(fmtFC(totalBrut)), sanitizePdfText(fmtFC(totalBrut - totalNet)), sanitizePdfText(fmtFC(totalNet)), sanitizePdfText(fmtUSD(totalNet, tauxChange))]]
    : [['', '', '', '', '', sanitizePdfText(fmtFC(totalBrut)), sanitizePdfText(fmtUSD(totalBrut, tauxChange))]];

  const columnStyles: any = showPec
    ? {
        0: { cellWidth: 46 },
        1: { cellWidth: 32 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 27 },
        5: { halign: 'right', cellWidth: 29 },
        6: { halign: 'right', cellWidth: 26 },
        7: { halign: 'right', cellWidth: 29 },
        8: { halign: 'right', cellWidth: 29 },
      }
    : {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 32 },
        5: { halign: 'right', cellWidth: 36 },
        6: { halign: 'right', cellWidth: 36 },
      };

  (doc as any).autoTable({
    startY: contentStartY(),
    head: [head],
    body,
    foot,
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
    columnStyles,
    didParseCell: (data: any) => {
      if (showPec && data.section === 'body' && data.column.index === 6 && data.cell.raw !== '0 FC') {
        data.cell.styles.textColor = (PDF_THEME.colors.danger as any).slice();
      }
      if (showPec && data.section === 'body' && data.column.index === 7) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = (PDF_THEME.colors.primary as any).slice();
      }
    },
    margin: { left: 14, right: 14 },
  });

  exporterPdf(doc, `salaires-${year}-${String(month).padStart(2, '0')}.pdf`);
}