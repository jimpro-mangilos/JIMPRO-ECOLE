import { jsPDF } from 'jspdf';
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

  (doc as any).autoTable({
    startY: y,
    head: [['Rubrique', 'Montant (FC)', 'Montant ($)']],
    body: [
      ['Salaire mensuel (base)', fmtFC(b.salaireMensuel), fmtUSD(b.salaireMensuel, b.tauxChange)],
      ['Salaire journalier', fmtFC(b.salaireJournalier), fmtUSD(b.salaireJournalier, b.tauxChange)],
      ['SALAIRE DU MOIS', fmtFC(b.salaireMois), fmtUSD(b.salaireMois, b.tauxChange)],
    ],
    theme: 'grid',
    headStyles: { fillColor: t.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: t.black, cellPadding: 2 },
    footStyles: { fillColor: t.slateSoft, textColor: t.primary, fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right', cellWidth: 50 }, 2: { halign: 'right', cellWidth: 35 } },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = (t.primary as any).slice();
      }
    },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(t.muted[0], t.muted[1], t.muted[2]);
  doc.text('Salaire du mois = jours de présence × salaire journalier (salaire mensuel ÷ jours ouvrables).', 15, y2);
  doc.text('Le présent bulletin est généré par le système JIMPRO.', 15, y2 + 5);

  doc.save(`bulletin-paie-${(b.matricule || b.nom).replace(/\s+/g, '-')}-${b.moisLabel.replace(/\s+/g, '-')}.pdf`);
}
