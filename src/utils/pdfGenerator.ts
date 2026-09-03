
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  PDF_THEME,
  drawReportHeader,
  drawReportFooter,
  drawKpiCards,
  drawSectionTitle,
  contentStartY,
  ensureSpace,
  defaultTableStyles,
  formatCurrencyPDF,
  formatDatePDF,
  sanitizeRows,
  sanitizePdfText,
  ReportHeaderOptions,
  loadLogoBase64,
  loadSchoolName,
  drawVerticalBarChart,
} from './pdfTheme';

interface Eleve {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  section: string;
  option?: string;
  classe: string;
  responsable: string;
  telephone: string;
  date_naissance?: string;
  lieu_naissance?: string;
  domicile?: string;
}

interface MinervalRecord {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  section: string;
  montant_total: number;
  montant_paye: number;
  date_paiement: string;
  methode_paiement: string;
  motif_libelle?: string;
  numero_recu?: string;
  nom_encaisseur?: string;
  date_encaissement?: string;
}

interface FinanceRecord {
  montant_chiffre: number;
  beneficiaire: string;
  libelle: string;
  type_operation: 'recette' | 'dépense';
  date_transaction: string;
  statut?: string;
  nom_comptable?: string;
  nom_approbateur?: string;
  nom_encaisseur?: string;
  telephone?: string;
}

interface FournitureEleve {
  matricule: string;
  nom_eleve: string;
  postnom?: string;
  prenom?: string;
  section: string;
  classe?: string;
  type_uniforme_libelle: string;
  quantite: number;
  annee_scolaire?: string;
  date_distribution?: string;
  nom_comptable?: string;
}

interface FournitureBureau {
  article: string;
  beneficiaire: string;
  quantite: number;
  date_operation: string;
  commentaire?: string;
}

function landscape(): jsPDF {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
}

function portrait(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

function lastTableY(doc: jsPDF): number | undefined {
  return (doc as any).lastAutoTable?.finalY;
}

function runAutoTable(doc: jsPDF, config: any, header: ReportHeaderOptions) {
  const firstPageNum = doc.getNumberOfPages();
  (doc as any).autoTable({
    ...defaultTableStyles(config.headColor),
    ...config,
    didDrawPage: () => {
      // ⚠️ didDrawPage est SYNC chez jspdf-autotable : dessiner l'en-tête complet ici
      // (async, logo via canvas) peindrait APRÈS les lignes du tableau → corruption.
      // L'en-tête de la page 1 est déjà dessiné par l'appelant AVANT le tableau.
      const currentPage = doc.getNumberOfPages();
      if (currentPage === firstPageNum) return; // déjà dessiné
      // Pages suivantes : bandeau de continuation SYNC (sans logo) + titre
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(PDF_THEME.colors.primary[0], PDF_THEME.colors.primary[1], PDF_THEME.colors.primary[2]);
      doc.rect(0, 0, pageWidth, PDF_THEME.titleBandHeight, 'F');
      doc.setFillColor(PDF_THEME.colors.accent[0], PDF_THEME.colors.accent[1], PDF_THEME.colors.accent[2]);
      doc.rect(0, 0, 4, PDF_THEME.titleBandHeight, 'F');
      doc.setFont(PDF_THEME.font, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(sanitizePdfText((header.title || '').toUpperCase()), PDF_THEME.pageMargin, 11);
      doc.setFont(PDF_THEME.font, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(220, 225, 235);
      doc.text(sanitizePdfText((header.schoolName || '') + ' — suite'), pageWidth - PDF_THEME.pageMargin, 11, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    },
    margin: {
      left: PDF_THEME.pageMargin,
      right: PDF_THEME.pageMargin,
      top: PDF_THEME.pageMargin,
      bottom: 20, // garde le filet de pied (pageHeight−16) libre de chevaucher la dernière ligne
    },
  });
}

export async function generateElevesReport(eleves: Eleve[]) {
  const doc = landscape();
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport des Eleves',
    subtitle: 'Liste nominative par section',
    period: `Effectif total : ${eleves.length}`,
  };
  await drawReportHeader(doc, header);

  const totalEleves = eleves.length;
  const garcons = eleves.filter(e => (e.sexe || '').toUpperCase() === 'M').length;
  const filles = eleves.filter(e => (e.sexe || '').toUpperCase() === 'F').length;
  const sections = [...new Set(eleves.map(e => e.section || 'Non defini'))];

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Effectif total', value: String(totalEleves), tone: 'primary' },
    { label: 'Garcons', value: String(garcons), tone: 'info' },
    { label: 'Filles', value: String(filles), tone: 'accent' },
    { label: 'Sections', value: String(sections.length), tone: 'success' },
  ]);

  sections.forEach(section => {
    const elevesSection = eleves.filter(e => (e.section || 'Non defini') === section);
    y = ensureSpace(doc, y, 25, header);
    y = drawSectionTitle(
      doc,
      y + 2,
      `Section : ${section}`,
      `${elevesSection.length} eleve(s)`,
      PDF_THEME.colors.primary
    );

    const rows = sanitizeRows(elevesSection.map((e, i) => [
      String(i + 1),
      e.matricule,
      `${e.nom} ${e.postnom} ${e.prenom}`.trim(),
      e.sexe,
      e.option || '-',
      e.classe || '-',
      e.date_naissance ? formatDatePDF(e.date_naissance) : '-',
      e.lieu_naissance || '-',
      e.domicile || '-',
      e.responsable,
      e.telephone,
    ]));

    runAutoTable(doc, {
      startY: y + 2,
      head: [['#', 'Matricule', 'Nom complet', 'Sexe', 'Option', 'Classe', 'Date naiss.', 'Lieu naiss.', 'Domicile', 'Responsable', 'Telephone']],
      body: rows,
      headColor: PDF_THEME.colors.primary,
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        3: { cellWidth: 10, halign: 'center' },
      },
    }, header);

    y = (lastTableY(doc) ?? y) + 6;
  });

  drawReportFooter(doc, header.title);
  doc.save(`rapport_eleves_${Date.now()}.pdf`);
}

export async function generateMinervalReport(minerval: MinervalRecord[], startDate?: Date, endDate?: Date) {
  const doc = landscape();
  const period = startDate && endDate
    ? `Du ${formatDatePDF(startDate)} au ${formatDatePDF(endDate)}`
    : 'Periode : tous les enregistrements';
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport Minerval',
    subtitle: 'Suivi des paiements de scolarite',
    period,
  };
  await drawReportHeader(doc, header);

  const totalAttendu = minerval.reduce((sum, m) => sum + Number(m.montant_total), 0);
  const totalPercu = minerval.reduce((sum, m) => sum + Number(m.montant_paye), 0);
  const solde = totalAttendu - totalPercu;
  const taux = totalAttendu > 0 ? Math.round((totalPercu / totalAttendu) * 100) : 0;

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Enregistrements', value: String(minerval.length), tone: 'primary' },
    { label: 'Montant attendu', value: formatCurrencyPDF(totalAttendu), tone: 'info' },
    { label: 'Montant percu', value: formatCurrencyPDF(totalPercu), tone: 'success' },
    { label: 'Solde restant', value: formatCurrencyPDF(solde), tone: solde > 0 ? 'danger' : 'success' },
    { label: 'Taux recouvrement', value: `${taux} %`, tone: taux >= 80 ? 'success' : taux >= 50 ? 'warning' : 'danger' },
  ]);

  y = drawSectionTitle(doc, y + 2, 'Detail des paiements');

  const rows = sanitizeRows(minerval.map((m, i) => {
    const r = Number(m.montant_total) - Number(m.montant_paye);
    return [
      String(i + 1),
      m.matricule,
      `${m.nom} ${m.postnom} ${m.prenom}`.trim(),
      m.section,
      formatCurrencyPDF(Number(m.montant_total)),
      formatCurrencyPDF(Number(m.montant_paye)),
      formatCurrencyPDF(r),
      m.numero_recu || '-',
      formatDatePDF(m.date_paiement),
      m.methode_paiement,
      m.date_encaissement ? formatDatePDF(m.date_encaissement) : '-',
      m.nom_encaisseur || '-',
    ];
  }));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'Matricule', 'Nom complet', 'Section', 'Total', 'Paye', 'Solde', 'N Recu', 'Date pmt', 'Methode', 'Date encais.', 'Encaisseur']],
    body: rows,
    foot: [[
      { content: 'TOTAUX', colSpan: 4, styles: { halign: 'right' } },
      formatCurrencyPDF(totalAttendu),
      formatCurrencyPDF(totalPercu),
      formatCurrencyPDF(solde),
      '', '', '', '', '',
    ]],
    headColor: PDF_THEME.colors.primary,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_minerval_${Date.now()}.pdf`);
}

export async function generateFinancesReport(finances: FinanceRecord[], filterInfo?: string, startDate?: Date, endDate?: Date) {
  const doc = landscape();
  const period = startDate && endDate
    ? `Du ${formatDatePDF(startDate)} au ${formatDatePDF(endDate)}`
    : 'Periode : toutes les operations';
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport Financier',
    subtitle: filterInfo || 'Recettes et depenses consolidees',
    period,
  };
  await drawReportHeader(doc, header);

  const recettes = finances.filter(f => f.type_operation === 'recette');
  const depenses = finances.filter(f => f.type_operation === 'dépense');
  const totalRecettes = recettes.reduce((s, r) => s + Number(r.montant_chiffre), 0);
  const totalDepenses = depenses.reduce((s, d) => s + Number(d.montant_chiffre), 0);
  const solde = totalRecettes - totalDepenses;

  let y = contentStartY();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_THEME.pageMargin;
  const kpiWidth = (pageWidth - 2 * margin) * 0.38;
  const chartWidth = (pageWidth - 2 * margin) * 0.58;
  const chartX = margin + kpiWidth + (pageWidth - 2 * margin) * 0.04;

  // Compact KPI cards (stacked vertically, left side)
  const kpiCards = [
    { label: 'Recettes', value: formatCurrencyPDF(totalRecettes), tone: 'success' as const },
    { label: 'Depenses', value: formatCurrencyPDF(totalDepenses), tone: 'danger' as const },
    { label: 'Solde net', value: formatCurrencyPDF(solde), tone: (solde >= 0 ? 'success' : 'danger') },
  ];
  const kpiH = 14;
  const kpiGap = 3;
  kpiCards.forEach((card, i) => {
    const kpiY = y + i * (kpiH + kpiGap);
    const toneMap: Record<string, { bg: [number,number,number]; accent: [number,number,number]; fg: [number,number,number] }> = {
      success: { bg: PDF_THEME.colors.successSoft, accent: PDF_THEME.colors.success, fg: PDF_THEME.colors.success },
      danger: { bg: PDF_THEME.colors.dangerSoft, accent: PDF_THEME.colors.danger, fg: PDF_THEME.colors.danger },
    };
    const tone = toneMap[card.tone] || toneMap.success;
    doc.setFillColor(tone.bg[0], tone.bg[1], tone.bg[2]);
    doc.rect(margin, kpiY, kpiWidth, kpiH, 'F');
    doc.setFillColor(tone.accent[0], tone.accent[1], tone.accent[2]);
    doc.rect(margin, kpiY, 2, kpiH, 'F');
    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
    doc.text(sanitizePdfText(card.label.toUpperCase()), margin + 5, kpiY + 5);
    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(tone.fg[0], tone.fg[1], tone.fg[2]);
    doc.text(sanitizePdfText(card.value), margin + 5, kpiY + 11);
  });

  // Chart on the right side
  const monthlyMap: Record<string, { recettes: number; depenses: number }> = {};
  finances.forEach(f => {
    const d = new Date(f.date_transaction);
    const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!monthlyMap[key]) monthlyMap[key] = { recettes: 0, depenses: 0 };
    if (f.type_operation === 'recette') monthlyMap[key].recettes += Number(f.montant_chiffre);
    else monthlyMap[key].depenses += Number(f.montant_chiffre);
  });
  const monthKeys = Object.keys(monthlyMap).slice(-6);
  if (monthKeys.length > 1) {
    const chartItems = monthKeys.map(k => ({
      label: k,
      value: monthlyMap[k].recettes,
      color: PDF_THEME.colors.success as [number, number, number],
    }));
    drawVerticalBarChart(doc, chartX, y, chartWidth, kpiCards.length * (kpiH + kpiGap) - kpiGap, chartItems, 'Recettes mensuelles');
  }

  y += kpiCards.length * (kpiH + kpiGap) + 6;
  doc.setTextColor(0, 0, 0);

  const STATUT_LABELS: Record<string, string> = {
    en_attente: 'En attente',
    approuve: 'Approuve',
    decaisse: 'Decaisse',
    encaisse: 'Encaisse',
  };

  const renderOperations = (
    title: string,
    operations: FinanceRecord[],
    total: number,
    headColor: [number, number, number],
    toneTitle: [number, number, number]
  ) => {
    if (operations.length === 0) return;
    y = ensureSpace(doc, y, 30, header);
    y = drawSectionTitle(doc, y + 2, `${title} (${operations.length})`, `Total : ${formatCurrencyPDF(total)}`, toneTitle);

    const rows = sanitizeRows(operations.map((o, i) => [
      String(i + 1),
      formatDatePDF(o.date_transaction),
      o.beneficiaire,
      o.telephone || '-',
      o.libelle,
      STATUT_LABELS[o.statut || ''] || (o.statut || '-'),
      o.nom_comptable || '-',
      o.nom_approbateur || '-',
      o.nom_encaisseur || '-',
      formatCurrencyPDF(Number(o.montant_chiffre)),
    ]));

    runAutoTable(doc, {
      startY: y + 2,
      head: [['#', 'Date', 'Beneficiaire', 'Telephone', 'Libelle', 'Statut', 'Comptable', 'Approbateur', 'Encaisseur', 'Montant']],
      body: rows,
      foot: [[
        { content: 'SOUS-TOTAL', colSpan: 9, styles: { halign: 'right' } },
        formatCurrencyPDF(total),
      ]],
      headColor,
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        9: { halign: 'right' },
      },
    }, header);

    y = (lastTableY(doc) ?? y) + 6;
  };

  renderOperations('Recettes', recettes, totalRecettes, PDF_THEME.colors.success, PDF_THEME.colors.success);
  renderOperations('Depenses', depenses, totalDepenses, PDF_THEME.colors.danger, PDF_THEME.colors.danger);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_financier_${Date.now()}.pdf`);
}

export interface FournituresElevesFilters {
  section?: string;
  classe?: string;
  typeUniforme?: string;
  annee?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function generateFournituresElevesReport(
  fournitures: FournitureEleve[],
  filters?: FournituresElevesFilters
) {
  const doc = portrait();
  const filterParts: string[] = [];
  if (filters?.section) filterParts.push(`Section: ${filters.section}`);
  if (filters?.classe) filterParts.push(`Classe: ${filters.classe}`);
  if (filters?.typeUniforme) filterParts.push(`Type: ${filters.typeUniforme}`);
  if (filters?.annee) filterParts.push(`Annee: ${filters.annee}`);
  if (filters?.startDate || filters?.endDate) {
    const fromTxt = filters.startDate ? formatDatePDF(filters.startDate) : '...';
    const toTxt = filters.endDate ? formatDatePDF(filters.endDate) : '...';
    filterParts.push(`Periode: ${fromTxt} - ${toTxt}`);
  }
  if (filters?.search) filterParts.push(`Recherche: ${filters.search}`);

  const subtitle = filterParts.length > 0
    ? `Filtres: ${filterParts.join(' | ')}`
    : 'Distribution des uniformes scolaires';

  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport Fournitures Eleves',
    subtitle,
  };
  await drawReportHeader(doc, header);

  const totalDistributions = fournitures.length;
  const totalQuantite = fournitures.reduce((sum, f) => sum + (Number(f.quantite) || 0), 0);
  const elevesUniques = new Set(fournitures.map(f => f.matricule).filter(Boolean)).size;
  const typesDistincts = new Set(fournitures.map(f => f.type_uniforme_libelle).filter(Boolean));

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Distributions', value: String(totalDistributions), tone: 'primary' },
    { label: 'Quantite totale', value: String(totalQuantite), tone: 'info' },
    { label: 'Eleves uniques', value: String(elevesUniques), tone: 'accent' },
    { label: 'Types d\'uniforme', value: String(typesDistincts.size), tone: 'success' },
  ]);

  if (typesDistincts.size > 0) {
    y = drawSectionTitle(doc, y + 2, 'Repartition par type d\'uniforme');

    const parType = new Map<string, { quantite: number; distributions: number }>();
    fournitures.forEach(f => {
      const key = f.type_uniforme_libelle || 'Non specifie';
      const cur = parType.get(key) || { quantite: 0, distributions: 0 };
      cur.quantite += Number(f.quantite) || 0;
      cur.distributions += 1;
      parType.set(key, cur);
    });

    const repartitionRows = sanitizeRows(
      Array.from(parType.entries())
        .sort((a, b) => b[1].quantite - a[1].quantite)
        .map(([type, stats], i) => [String(i + 1), type, String(stats.distributions), String(stats.quantite)])
    );

    runAutoTable(doc, {
      startY: y + 2,
      head: [['#', 'Type d\'uniforme', 'Distributions', 'Quantite totale']],
      body: repartitionRows,
      foot: [[
        { content: 'TOTAL', colSpan: 2, styles: { halign: 'right' } },
        String(totalDistributions),
        String(totalQuantite),
      ]],
      headColor: PDF_THEME.colors.info,
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
    }, header);

    y = (doc as any).lastAutoTable?.finalY ?? y + 20;
  }

  y = drawSectionTitle(doc, y + 4, 'Detail des distributions');

  const rows = sanitizeRows(fournitures.map((f, i) => [
    String(i + 1),
    f.matricule || '-',
    `${f.nom_eleve || ''} ${f.postnom || ''} ${f.prenom || ''}`.trim() || '-',
    f.section || '-',
    f.classe || '-',
    f.type_uniforme_libelle || '-',
    String(f.quantite ?? 0),
    f.date_distribution ? formatDatePDF(f.date_distribution) : '-',
    f.nom_comptable || '-',
  ]));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'Matricule', 'Nom complet', 'Section', 'Classe', 'Type', 'Qte', 'Date', 'Comptable']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 6, styles: { halign: 'right' } },
      String(totalQuantite),
      '',
      '',
    ]],
    headColor: PDF_THEME.colors.accent,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_fournitures_eleves_${Date.now()}.pdf`);
}

export async function generateFournituresBureauReport(fournitures: FournitureBureau[]) {
  const doc = portrait();
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport Fournitures Bureau',
    subtitle: 'Historique des distributions internes',
  };
  await drawReportHeader(doc, header);

  const totalDistributions = fournitures.length;
  const totalQuantite = fournitures.reduce((sum, f) => sum + f.quantite, 0);
  const articlesUniques = [...new Set(fournitures.map(f => f.article))];
  const beneficiairesUniques = [...new Set(fournitures.map(f => f.beneficiaire))];

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Distributions', value: String(totalDistributions), tone: 'primary' },
    { label: 'Quantite totale', value: String(totalQuantite), tone: 'info' },
    { label: 'Articles', value: String(articlesUniques.length), tone: 'accent' },
    { label: 'Beneficiaires', value: String(beneficiairesUniques.length), tone: 'success' },
  ]);

  y = drawSectionTitle(doc, y + 2, 'Detail des distributions');

  const rows = sanitizeRows(fournitures.map((f, i) => [
    String(i + 1),
    f.article,
    f.beneficiaire,
    String(f.quantite),
    formatDatePDF(f.date_operation),
    f.commentaire || '-',
  ]));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'Article', 'Beneficiaire', 'Quantite', 'Date', 'Commentaire']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'right' } },
      String(totalQuantite),
      '', '',
    ]],
    headColor: PDF_THEME.colors.info,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { halign: 'center' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_fournitures_bureau_${Date.now()}.pdf`);
}

export async function generateElevePaymentHistoryPDF(eleve: Eleve, paiements: MinervalRecord[]) {
  const doc = portrait();
  const nomComplet = `${eleve.nom} ${eleve.postnom} ${eleve.prenom}`.trim();
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Historique des Paiements',
    subtitle: nomComplet,
    period: `Matricule : ${eleve.matricule}`,
  };
  await drawReportHeader(doc, header);

  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant_paye), 0);
  const nbPaiements = paiements.length;

  let y = contentStartY();

  const margin = PDF_THEME.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const blockW = pageWidth - 2 * margin;
  const blockH = 28;

  doc.setFillColor(PDF_THEME.colors.slateSoft[0], PDF_THEME.colors.slateSoft[1], PDF_THEME.colors.slateSoft[2]);
  doc.rect(margin, y, blockW, blockH, 'F');
  doc.setFillColor(PDF_THEME.colors.primary[0], PDF_THEME.colors.primary[1], PDF_THEME.colors.primary[2]);
  doc.rect(margin, y, 3, blockH, 'F');

  doc.setFont(PDF_THEME.font, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(sanitizePdfText('INFORMATIONS ELEVE'), margin + 6, y + 6);

  doc.setFont(PDF_THEME.font, 'normal');
  doc.setFontSize(9);
  const col1X = margin + 6;
  const col2X = margin + blockW / 2 + 4;
  const lineH = 5;

  doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
  doc.text('Matricule', col1X, y + 13);
  doc.text('Section', col1X, y + 13 + lineH);
  if (eleve.option) doc.text('Option', col1X, y + 13 + 2 * lineH);
  doc.text('Date naiss.', col2X, y + 13);
  doc.text('Lieu naiss.', col2X, y + 13 + lineH);

  doc.setFont(PDF_THEME.font, 'bold');
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(sanitizePdfText(eleve.matricule), col1X + 22, y + 13);
  doc.text(sanitizePdfText(eleve.section), col1X + 22, y + 13 + lineH);
  if (eleve.option) doc.text(sanitizePdfText(eleve.option), col1X + 22, y + 13 + 2 * lineH);
  doc.text(sanitizePdfText(eleve.date_naissance ? formatDatePDF(eleve.date_naissance) : '-'), col2X + 22, y + 13);
  doc.text(sanitizePdfText(eleve.lieu_naissance || '-'), col2X + 22, y + 13 + lineH);

  y += blockH + 6;

  y = drawKpiCards(doc, y, [
    { label: 'Total payé', value: formatCurrencyPDF(totalPaye), tone: 'success' },
    { label: 'Paiements', value: String(nbPaiements), tone: 'info' },
    { label: 'Dernier', value: paiements.length ? formatDatePDF(paiements[0].date_paiement) : '-', tone: 'info' },
  ]);

  y = drawSectionTitle(doc, y + 2, 'Chronologie des paiements');

  const rows = sanitizeRows(paiements.map((p, i) => [
    String(i + 1),
    formatDatePDF(p.date_paiement),
    formatCurrencyPDF(Number(p.montant_paye)),
    p.motif_libelle || '-',
    p.numero_recu || '-',
    p.date_encaissement ? formatDatePDF(p.date_encaissement) : '-',
    p.nom_encaisseur || '-',
  ]));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'Date', 'Montant', 'Motif', 'N Reçu', 'Date encais.', 'Encaisseur']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 2, styles: { halign: 'right' } },
      formatCurrencyPDF(totalPaye),
      '', '', '', '',
    ]],
    headColor: PDF_THEME.colors.primary,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { halign: 'right' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`historique_paiement_${eleve.matricule}_${Date.now()}.pdf`);
}

interface PaiementComptable {
  numero_recu: string;
  nom_eleve: string;
  classe: string;
  type_paiement: string;
  montant_paye: number;
  mode_paiement: string;
  date_paiement: string;
  est_encaisse: boolean;
  date_encaissement?: string;
  annee_scolaire?: string;
  motif_libelle?: string;
  section?: string;
}

interface ComptableData {
  nom: string;
  prenom: string;
  email: string;
}

const MODE_LABELS: Record<string, string> = {
  especes: 'Especes',
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  cheque: 'Cheque',
};

function drawHorizontalBar(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: number,
  maxValue: number,
  width: number,
  color: [number, number, number]
) {
  const barHeight = 4.5;
  const trackColor = PDF_THEME.colors.slateSoft;
  const pct = maxValue > 0 ? Math.min(1, value / maxValue) : 0;

  doc.setFont(PDF_THEME.font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(sanitizePdfText(label), x, y);

  doc.setFont(PDF_THEME.font, 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(sanitizePdfText(formatCurrencyPDF(value)), x + width, y, { align: 'right' });

  doc.setFillColor(trackColor[0], trackColor[1], trackColor[2]);
  doc.rect(x, y + 2, width, barHeight, 'F');
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x, y + 2, width * pct, barHeight, 'F');

  doc.setTextColor(0, 0, 0);
}

export async function generateRapportComptable(
  comptable: ComptableData,
  paiements: PaiementComptable[],
  startDate?: Date,
  endDate?: Date
) {
  const doc = landscape();
  const nomComplet = `${comptable.prenom} ${comptable.nom}`.trim();
  const period = startDate && endDate
    ? `Du ${formatDatePDF(startDate)} au ${formatDatePDF(endDate)}`
    : 'Periode : tous les enregistrements';
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport par Comptable',
    subtitle: `Encaissements realises par ${nomComplet}`,
    period,
  };
  await drawReportHeader(doc, header);

  const encaisses = paiements.filter(p => p.est_encaisse);
  const totalTransactions = paiements.length;
  const totalEncaisse = encaisses.reduce((s, p) => s + p.montant_paye, 0);
  const totalEnAttente = paiements.filter(p => !p.est_encaisse).reduce((s, p) => s + p.montant_paye, 0);
  const taux = totalTransactions > 0 ? Math.round((encaisses.length / totalTransactions) * 100) : 0;

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Transactions', value: String(totalTransactions), tone: 'primary' },
    { label: 'Encaissees', value: `${encaisses.length} (${taux}%)`, tone: 'success' },
    { label: 'Montant encaisse', value: formatCurrencyPDF(totalEncaisse), tone: 'info' },
    { label: 'En attente', value: formatCurrencyPDF(totalEnAttente), tone: 'warning' },
  ]);

  const parType: Record<string, number> = {};
  const parMode: Record<string, number> = {};
  const parSection: Record<string, number> = {};
  encaisses.forEach(p => {
    const typeKey = p.motif_libelle || p.type_paiement || 'Autre';
    parType[typeKey] = (parType[typeKey] || 0) + p.montant_paye;
    const modeKey = MODE_LABELS[p.mode_paiement] || p.mode_paiement;
    parMode[modeKey] = (parMode[modeKey] || 0) + p.montant_paye;
    if (p.section) parSection[p.section] = (parSection[p.section] || 0) + p.montant_paye;
  });

  const margin = PDF_THEME.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 2 * margin - 8) / 2;
  const rightX = margin + colWidth + 8;

  y = drawSectionTitle(doc, y + 2, 'Repartition par type', undefined, PDF_THEME.colors.info);
  const typeEntries = Object.entries(parType);
  const maxType = Math.max(1, ...typeEntries.map(([, v]) => v));
  let lyType = y + 4;
  typeEntries.forEach(([label, val]) => {
    lyType = ensureSpace(doc, lyType, 10, header);
    drawHorizontalBar(doc, margin, lyType, label, val, maxType, colWidth, PDF_THEME.colors.info);
    lyType += 9;
  });

  const modeEntries = Object.entries(parMode);
  const maxMode = Math.max(1, ...modeEntries.map(([, v]) => v));
  let lyMode = y + 4;
  doc.setFont(PDF_THEME.font, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(sanitizePdfText('REPARTITION PAR MODE'), rightX, y - 2);
  modeEntries.forEach(([label, val]) => {
    lyMode = ensureSpace(doc, lyMode, 10, header);
    drawHorizontalBar(doc, rightX, lyMode, label, val, maxMode, colWidth, PDF_THEME.colors.accent);
    lyMode += 9;
  });

  y = Math.max(lyType, lyMode) + 2;

  if (Object.keys(parSection).length > 0) {
    y = ensureSpace(doc, y, 20, header);
    y = drawSectionTitle(doc, y + 2, 'Repartition par section', undefined, PDF_THEME.colors.success);
    const sectionEntries = Object.entries(parSection);
    const maxSection = Math.max(1, ...sectionEntries.map(([, v]) => v));
    sectionEntries.forEach(([label, val]) => {
      y = ensureSpace(doc, y, 10, header);
      drawHorizontalBar(doc, margin, y + 2, label, val, maxSection, pageWidth - 2 * margin, PDF_THEME.colors.success);
      y += 10;
    });
  }

  y = ensureSpace(doc, y, 30, header);
  y = drawSectionTitle(doc, y + 4, 'Detail des transactions encaissees');

  const rows = sanitizeRows(encaisses.map((p, i) => [
    String(i + 1),
    p.numero_recu,
    formatDatePDF(p.date_paiement),
    p.nom_eleve,
    p.classe,
    p.section || '-',
    p.motif_libelle || p.type_paiement,
    p.annee_scolaire || '-',
    formatCurrencyPDF(p.montant_paye),
    MODE_LABELS[p.mode_paiement] || p.mode_paiement,
    p.date_encaissement ? formatDatePDF(p.date_encaissement) : '-',
  ]));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'N Recu', 'Date pmt', 'Eleve', 'Classe', 'Section', 'Motif', 'Annee', 'Montant', 'Mode', 'Date encais.']],
    body: rows,
    foot: [[
      { content: 'TOTAL ENCAISSE', colSpan: 8, styles: { halign: 'right' } },
      formatCurrencyPDF(totalEncaisse),
      '', '',
    ]],
    headColor: PDF_THEME.colors.primary,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      8: { halign: 'right' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_comptable_${comptable.nom}_${Date.now()}.pdf`);
}

export async function generateRapportComparatifComptables(
  comptables: Array<{
    comptable: ComptableData;
    stats: {
      nombre_transactions: number;
      montant_total: number;
      nombre_encaisses: number;
      montant_encaisse: number;
    };
  }>,
  startDate?: Date,
  endDate?: Date
) {
  const doc = landscape();
  const period = startDate && endDate
    ? `Du ${formatDatePDF(startDate)} au ${formatDatePDF(endDate)}`
    : 'Periode : tous les enregistrements';
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();
  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport Comparatif des Comptables',
    subtitle: 'Analyse de performance des encaisseurs',
    period,
  };
  await drawReportHeader(doc, header);

  const totalGlobal = comptables.reduce((s, c) => s + c.stats.montant_encaisse, 0);
  const totalTransactions = comptables.reduce((s, c) => s + c.stats.nombre_transactions, 0);
  const totalEncaisses = comptables.reduce((s, c) => s + c.stats.nombre_encaisses, 0);

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Comptables', value: String(comptables.length), tone: 'primary' },
    { label: 'Transactions', value: String(totalTransactions), tone: 'info' },
    { label: 'Encaissees', value: String(totalEncaisses), tone: 'success' },
    { label: 'Montant total', value: formatCurrencyPDF(totalGlobal), tone: 'accent' },
  ]);

  y = drawSectionTitle(doc, y + 2, 'Synthese par comptable');

  const rowsSynthese = sanitizeRows(comptables.map((c, i) => {
    const pct = totalGlobal > 0 ? ((c.stats.montant_encaisse / totalGlobal) * 100).toFixed(1) : '0';
    return [
      String(i + 1),
      `${c.comptable.prenom} ${c.comptable.nom}`.trim(),
      c.comptable.email,
      String(c.stats.nombre_transactions),
      String(c.stats.nombre_encaisses),
      formatCurrencyPDF(c.stats.montant_encaisse),
      formatCurrencyPDF(c.stats.montant_total - c.stats.montant_encaisse),
      `${pct} %`,
    ];
  }));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'Comptable', 'Email', 'Trx', 'Encais.', 'Montant encaisse', 'En attente', '% total']],
    body: rowsSynthese,
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'right' } },
      String(totalTransactions),
      String(totalEncaisses),
      formatCurrencyPDF(totalGlobal),
      '',
      '100 %',
    ]],
    headColor: PDF_THEME.colors.primary,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  }, header);

  let y2 = (lastTableY(doc) ?? y) + 8;
  y2 = ensureSpace(doc, y2, 40, header);
  y2 = drawSectionTitle(doc, y2, 'Classement par performance', undefined, PDF_THEME.colors.accent);

  const sorted = [...comptables].sort((a, b) => b.stats.montant_encaisse - a.stats.montant_encaisse);
  const maxMontant = Math.max(1, ...sorted.map(c => c.stats.montant_encaisse));
  const margin = PDF_THEME.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const barAreaX = margin + 70;
  const barAreaW = pageWidth - margin - barAreaX;

  const medalColor = (idx: number): [number, number, number] => {
    if (idx === 0) return PDF_THEME.colors.accent;
    if (idx === 1) return PDF_THEME.colors.muted;
    if (idx === 2) return PDF_THEME.colors.warning;
    return PDF_THEME.colors.info;
  };

  y2 += 4;
  sorted.forEach((c, idx) => {
    y2 = ensureSpace(doc, y2, 12, header);
    const color = medalColor(idx);

    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(margin + 4, y2 + 2, 3.2, 'F');
    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PDF_THEME.colors.white[0], PDF_THEME.colors.white[1], PDF_THEME.colors.white[2]);
    doc.text(String(idx + 1), margin + 4, y2 + 3.3, { align: 'center' });

    doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(9);
    const nom = sanitizePdfText(`${c.comptable.prenom} ${c.comptable.nom}`.trim());
    doc.text(nom, margin + 10, y2 + 3);

    drawHorizontalBar(
      doc,
      barAreaX,
      y2,
      `${c.stats.nombre_encaisses} / ${c.stats.nombre_transactions} transactions`,
      c.stats.montant_encaisse,
      maxMontant,
      barAreaW,
      color
    );

    y2 += 10;
  });

  drawReportFooter(doc, header.title);
  doc.save(`rapport_comparatif_comptables_${Date.now()}.pdf`);
}

interface PaiementReportRecord {
  numero_recu: string;
  nom_eleve: string;
  postnom?: string | null;
  prenom?: string | null;
  matricule: string;
  classe: string;
  section: string;
  option: string | null;
  montant_paye: number;
  motif_libelle: string;
  date_paiement: string;
  statut: 'en_attente' | 'encaisse' | 'annule';
  est_encaisse: boolean;
  nom_encaisseur?: string | null;
  nom_comptable: string;
}

interface PaiementsReportFilters {
  section?: string;
  option?: string;
  classe?: string;
  encaisseur?: string;
  type?: string;
  statut?: string;
  motifs?: string[];
  annee?: string;
}

export async function generatePaiementsReport(paiements: PaiementReportRecord[], filters?: PaiementsReportFilters) {
  const doc = landscape();
  const _logo = await loadLogoBase64();
  const _schoolName = await loadSchoolName();

  const activeFilters: string[] = [];
  if (filters?.section && filters.section !== 'tous') activeFilters.push(`Section: ${filters.section}`);
  if (filters?.option && filters.option !== 'tous') activeFilters.push(`Option: ${filters.option}`);
  if (filters?.classe && filters.classe !== 'tous') activeFilters.push(`Classe: ${filters.classe}`);
  if (filters?.encaisseur && filters.encaisseur !== 'tous') activeFilters.push(`Encaisseur: ${filters.encaisseur}`);
  if (filters?.type && filters.type !== 'tous') activeFilters.push(`Type: ${filters.type}`);
  if (filters?.statut && filters.statut !== 'tous') activeFilters.push(`Statut: ${filters.statut}`);
  if (filters?.motifs && filters.motifs.length > 0) {
    activeFilters.push(`Motifs: ${filters.motifs.join(', ')}`);
  }
  if (filters?.annee && filters.annee !== 'tous') activeFilters.push(`Annee: ${filters.annee}`);

  const period = activeFilters.length > 0
    ? activeFilters.join(' | ')
    : 'Tous les paiements';

  const header: ReportHeaderOptions = {
    logoBase64: _logo,
    schoolName: _schoolName,
    title: 'Rapport des Paiements',
    subtitle: 'Liste detaillee des paiements',
    period,
  };
  await drawReportHeader(doc, header);

  const getStatut = (p: PaiementReportRecord) => {
    if (p.statut) return p.statut;
    return p.est_encaisse ? 'encaisse' : 'en_attente';
  };

  const paiementsActifs = paiements.filter(p => getStatut(p) !== 'annule');
  const totalEncaisse = paiementsActifs.filter(p => getStatut(p) === 'encaisse').reduce((sum, p) => sum + p.montant_paye, 0);
  const totalEnAttente = paiementsActifs.filter(p => getStatut(p) === 'en_attente').reduce((sum, p) => sum + p.montant_paye, 0);
  const totalAnnule = paiements.filter(p => getStatut(p) === 'annule').reduce((sum, p) => sum + p.montant_paye, 0);

  let y = contentStartY();
  y = drawKpiCards(doc, y, [
    { label: 'Total paiements', value: String(paiements.length), tone: 'primary' },
    { label: 'Encaisse', value: formatCurrencyPDF(totalEncaisse), tone: 'success' },
    { label: 'En attente', value: formatCurrencyPDF(totalEnAttente), tone: 'warning' },
    { label: 'Annule', value: formatCurrencyPDF(totalAnnule), tone: 'danger' },
  ]);

  y = drawSectionTitle(doc, y + 2, 'Detail des paiements');

  const statutLabel = (p: PaiementReportRecord) => {
    const s = getStatut(p);
    if (s === 'encaisse') return 'Encaisse';
    if (s === 'annule') return 'Annule';
    return 'En attente';
  };

  const rows = sanitizeRows(paiements.map((p, i) => [
    String(i + 1),
    p.numero_recu,
    `${p.nom_eleve || ''} ${p.postnom || ''} ${p.prenom || ''}`.replace(/\s+/g, ' ').trim(),
    p.matricule,
    p.classe,
    p.section,
    p.motif_libelle || '-',
    formatCurrencyPDF(p.montant_paye),
    formatDatePDF(p.date_paiement),
    statutLabel(p),
    p.nom_encaisseur || p.nom_comptable || '-',
  ]));

  runAutoTable(doc, {
    startY: y + 2,
    head: [['#', 'N Recu', 'Nom Eleve', 'Matricule', 'Classe', 'Section', 'Motif', 'Montant', 'Date', 'Statut', 'Encaisseur']],
    body: rows,
    foot: [[
      { content: 'TOTAUX', colSpan: 7, styles: { halign: 'right' } },
      formatCurrencyPDF(paiements.reduce((s, p) => s + p.montant_paye, 0)),
      '', '', '',
    ]],
    headColor: PDF_THEME.colors.primary,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      7: { halign: 'right' },
    },
  }, header);

  drawReportFooter(doc, header.title);
  doc.save(`rapport_paiements_${Date.now()}.pdf`);
}
