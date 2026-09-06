import { jsPDF } from 'jspdf';
import { exporterPdf } from './pdfExport';
import 'jspdf-autotable';
import { sanitizePdfText, PDF_THEME, drawReportHeader, contentStartY, loadSchoolName, loadLogoBase64 } from './pdfTheme';

export interface BulletinData {
  nom: string;
  postnom?: string | null;
  prenom: string;
  matricule?: string | null;
  fonction: string;
  moisLabel: string;
  joursOuvrables: number;
  joursPresent: number;
  joursAbsent: number;
  joursPermissionPayee: number;
  joursPermissionNonPayee: number;
  salaireMensuel: number | null;
  salaireJournalier: number | null;
  salaireMois: number | null;
  /** Total des paiements « prise en charge » du mois, déduit du salaire (plafond 80 % du brut). */
  retenue?: number;
  /** Salaire net à payer : brut − retenue. */
  net?: number | null;
  /** Total des prises en charge dues du mois + report des mois précédents. */
  retenueDue?: number;
  /** Solde non déduit ce mois (plafond 80 % du brut atteint) — reporté au mois suivant. */
  solde?: number;
  tauxChange: number | null;
}

function fmtFC(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${Math.round(n).toLocaleString('fr-FR')} FC`;
}

function fmtUSD(n: number | null | undefined, taux: number | null): string {
  if (n == null || !taux || taux <= 0) return '-';
  return `${(n / taux).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$`;
}

/** Génère le bulletin de paie PDF d'un membre pour un mois donné. */
export async function generateBulletinPaie(b: BulletinData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();

  await drawReportHeader(doc, { title: 'Bulletin de paie', subtitle: b.moisLabel, logoBase64: logo, schoolName });

  // Infos membre
  const nomComplet = sanitizePdfText(`${b.nom} ${b.postnom || ''} ${b.prenom}`.trim().toUpperCase());
  doc.setFontSize(11);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  const cy = contentStartY();
  doc.text(`Membre : ${nomComplet}`, 15, cy);
  doc.text(`Matricule : ${sanitizePdfText(b.matricule || '-')}    Fonction : ${sanitizePdfText(b.fonction)}`, 15, cy + 6);

  const t = PDF_THEME.colors;
  const rows = [
    ['Jours ouvrables du mois (lun–ven)', String(b.joursOuvrables)],
    ['Jours de présence', String(b.joursPresent)],
    ['Jours d\u0027absence', String(b.joursAbsent)],
    ['Permissions payées', String(b.joursPermissionPayee)],
    ['Permissions non payées', String(b.joursPermissionNonPayee)],
  ];

  (doc as any).autoTable({
    startY: contentStartY() + 12,
    head: [['Détail', 'Valeur']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: t.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: t.black, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', cellWidth: 55 } },
    margin: { left: 15, right: 15 },
  });

  const y = (doc as any).lastAutoTable.finalY + 6;

  const aPec = !!(b.retenue && b.retenue > 0);
  const bodyRubriques: string[][] = [
    ['Salaire mensuel (base)', fmtFC(b.salaireMensuel), fmtUSD(b.salaireMensuel, b.tauxChange)],
    ['Salaire journalier', fmtFC(b.salaireJournalier), fmtUSD(b.salaireJournalier, b.tauxChange)],
    [aPec ? 'SALAIRE BRUT DU MOIS' : 'SALAIRE DU MOIS', fmtFC(b.salaireMois), fmtUSD(b.salaireMois, b.tauxChange)],
  ];
  if (aPec) {
    bodyRubriques.push([
      'Retenue — prise en charge (élève pris en charge)',
      '- ' + fmtFC(b.retenue),
      b.tauxChange ? '- ' + fmtUSD(b.retenue, b.tauxChange) : '-',
    ]);
  }
  const footRubriques: string[][] = aPec ? [['NET À PAYER', fmtFC(b.net), fmtUSD(b.net, b.tauxChange)]] : [];

  (doc as any).autoTable({
    startY: y,
    head: [['Rubrique', 'Montant (FC)', 'Montant ($)']],
    body: bodyRubriques,
    foot: footRubriques.length > 0 ? footRubriques : undefined,
    theme: 'grid',
    headStyles: { fillColor: t.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: t.black, cellPadding: 2 },
    footStyles: aPec
      ? { fillColor: t.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 }
      : { fillColor: t.slateSoft, textColor: t.primary, fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right', cellWidth: 50 }, 2: { halign: 'right', cellWidth: 35 } },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = (t.primary as any).slice();
      }
      if (data.section === 'body' && aPec && data.row.index === 3) {
        data.cell.styles.textColor = (t.danger as any).slice();
      }
    },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(t.muted[0], t.muted[1], t.muted[2]);
  doc.text('Salaire du mois = jours de présence × salaire journalier (salaire mensuel ÷ jours ouvrables).', 15, y2);
  if (aPec) {
    doc.text('NET à payer = salaire brut du mois − retenue prise en charge (plafond 80 % du brut).', 15, y2 + 5);
    if (b.solde && b.solde > 0) doc.text('Solde de ' + fmtFC(b.solde) + ' reporté au mois suivant (prise en charge au-delà du plafond de 80 % du brut).', 15, y2 + 10);
    doc.text('Le présent bulletin est généré par le système JIMPRO.', 15, y2 + (b.solde && b.solde > 0 ? 15 : 10));
  } else if (b.retenueDue && b.retenueDue > 0) {
    doc.text('Prise en charge due : ' + fmtFC(b.retenueDue) + ' — non déductible ce mois (salaire brut nul, aucun jour de présence). Reportée au mois suivant.', 15, y2 + 5);
    doc.text('Le présent bulletin est généré par le système JIMPRO.', 15, y2 + 10);
  } else {
    doc.text('Le présent bulletin est généré par le système JIMPRO.', 15, y2 + 5);
  }

  exporterPdf(doc, `bulletin-paie-${(b.matricule || b.nom).replace(/\s+/g, '-')}-${b.moisLabel.replace(/\s+/g, '-')}.pdf`);
}
