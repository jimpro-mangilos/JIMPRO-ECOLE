import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { sanitizePdfText, PDF_THEME, drawReportHeader, loadSchoolName, loadLogoBase64 } from './pdfTheme';
import type { PointageRecord, PointageConfig } from '../lib/hooks/usePointage';

const STATUT_LABEL: Record<string, string> = { present: 'Présent', retard: 'Retard', absent: 'Absent', permission: 'Permission' };

export interface PresenceMembre {
  id: string;
  nom: string;
  postnom?: string | null;
  prenom: string;
  matricule?: string | null;
  fonction: string;
}

/**
 * Fiche de présence PDF d'un membre pour un mois (détail jour par jour).
 */
export async function generateFichePresence(params: {
  membre: PresenceMembre;
  moisLabel: string;
  workDays: string[];
  records: PointageRecord[];
  config: PointageConfig;
  statutDe: (pId: string, date: string) => { statut: string; implied: boolean };
}) {
  const { membre, moisLabel, workDays, records, config, statutDe } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const schoolName = (await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();

  await drawReportHeader(doc, { title: 'Fiche de présence', subtitle: moisLabel, logoBase64: logo, schoolName });

  const nomComplet = sanitizePdfText(`${membre.nom} ${membre.postnom || ''} ${membre.prenom}`.trim().toUpperCase());
  doc.setFontSize(11);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(`Membre : ${nomComplet}`, 15, 42);
  doc.text(`Matricule : ${sanitizePdfText(membre.matricule || '-')}    Fonction : ${sanitizePdfText(membre.fonction)}`, 15, 48);
  doc.setFontSize(8.5);
  doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
  doc.text(`Heure d'entrée : ${config.heureEntree} · Heure de sortie : ${config.heureSortie} · Jours ouvrables : lun–ven`, 15, 53.5);

  const recByDate = new Map<string, PointageRecord>();
  for (const r of records) if (r.personnel_id === membre.id) recByDate.set(r.date_pointage, r);

  const body = workDays.map(d => {
    const st = statutDe(membre.id, d);
    const rec = recByDate.get(d);
    return [
      sanitizePdfText(new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })),
      st.statut ? STATUT_LABEL[st.statut] || st.statut : '-',
      rec?.heure_arrivee || '-',
      rec?.heure_depart || '-',
    ];
  });

  const counts: Record<string, number> = { present: 0, retard: 0, absent: 0, permission: 0 };
  for (const d of workDays) {
    const st = statutDe(membre.id, d).statut;
    if (counts[st] != null) counts[st]++;
  }

  (doc as any).autoTable({
    startY: 58,
    head: [['Date', 'Statut', 'Arrivée', 'Départ']],
    body,
    foot: [[`Présents : ${counts.present} · Retards : ${counts.retard} · Absents : ${counts.absent} · Permissions : ${counts.permission}`, '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: PDF_THEME.colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: PDF_THEME.colors.black, cellPadding: 1.5 },
    footStyles: { fillColor: PDF_THEME.colors.slateSoft, textColor: PDF_THEME.colors.primary, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { halign: 'center', cellWidth: 40 }, 3: { halign: 'center', cellWidth: 40 } },
    margin: { left: 15, right: 15 },
  });

  const y = (doc as any).lastAutoTable.finalY + 14;
  const mid = doc.internal.pageSize.getWidth() / 2;
  doc.setDrawColor(PDF_THEME.colors.border[0], PDF_THEME.colors.border[1], PDF_THEME.colors.border[2]);
  doc.setLineWidth(0.2);
  doc.line(20, y + 18, 100, y + 18);
  doc.line(mid + 10, y + 18, 190, y + 18);
  doc.setFontSize(8);
  doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
  doc.text('Signature du membre', 20, y + 22);
  doc.text('Cachet / Direction', mid + 10, y + 22);

  doc.save(`fiche-presence-${(membre.matricule || membre.nom).replace(/\s+/g, '-')}-${moisLabel.replace(/\s+/g, '-')}.pdf`);
}
