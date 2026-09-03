import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadLogoBase64, loadSchoolName, PDF_THEME, sanitizePdfText, addRoundedImage } from './pdfTheme';
import { getSchoolInitials } from './schoolInitials';
import type { PersonnelRecord } from '../lib/hooks/usePersonnel';
import type { PointageRecord } from '../lib/hooks/usePointage';

export const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface Agg { present: number; absent: number; retard: number; permission: number; }

export async function generatePointageReport(opts: {
  month: number;   // 1-12
  year: number;
  personnel: PersonnelRecord[];
  pointages: PointageRecord[];
}): Promise<void> {
  const { month, year, personnel, pointages } = opts;
  const schoolName = sanitizePdfText(await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const c = PDF_THEME.colors;

  // Agrégation par personne
  const byId = new Map<string, Agg>();
  for (const p of personnel) byId.set(p.id, { present: 0, absent: 0, retard: 0, permission: 0 });
  for (const pt of pointages) {
    const a = byId.get(pt.personnel_id);
    if (!a) continue;
    if (pt.statut === 'present') a.present++;
    else if (pt.statut === 'absent') a.absent++;
    else if (pt.statut === 'retard') a.retard++;
    else if (pt.statut === 'permission') a.permission++;
  }

  const totals = { present: 0, absent: 0, retard: 0, permission: 0 };
  for (const a of byId.values()) {
    totals.present += a.present;
    totals.absent += a.absent;
    totals.retard += a.retard;
    totals.permission += a.permission;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  // En-tête marine
  doc.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
  doc.rect(0, 0, pw, 30, 'F');
  doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
  doc.rect(0, 30, pw, 1.2, 'F');

  if (logo) {
    // Détection auto du format + arrondi (jamais d'erreur avalée silencieusement)
    try { await addRoundedImage(doc, logo, 12, 7, 14, 14, 7, c.primary); } catch { /* logo indisponible */ }
  } else {
    doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.circle(19, 14, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(getSchoolInitials(schoolName), 19, 16, { align: 'center' });
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(schoolName, pw / 2, 13, { align: 'center' });
  doc.setFontSize(11);
  doc.text('RAPPORT DE PRÉSENCE DU PERSONNEL', pw / 2, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Période : ${MOIS_FR[month - 1]} ${year}`, pw / 2, 27, { align: 'center' });

  // Résumé
  const summary: [string, number, [number, number, number]][] = [
    ['Présences', totals.present, c.success],
    ['Absences', totals.absent, c.danger],
    ['Retards', totals.retard, c.warning],
    ['Permissions', totals.permission, c.info],
  ];
  let sx = 14;
  const sw = (pw - 28 - 12) / 4;
  let sy = 38;
  doc.setFont('helvetica', 'bold');
  for (const [label, val, col] of summary) {
    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(sx, sy, sw, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), sx + sw / 2, sy + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text(String(val), sx + sw / 2, sy + 11.5, { align: 'center' });
    sx += sw + 4;
  }

  // Tableau détaillé
  const body = personnel.map(p => {
    const a = byId.get(p.id) || { present: 0, absent: 0, retard: 0, permission: 0 };
    const nom = sanitizePdfText(`${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}`);
    return [nom, sanitizePdfText(p.fonction), a.present, a.absent, a.retard, a.permission, a.present + a.absent + a.retard + a.permission];
  });

  (doc as any).autoTable({
    startY: 58,
    head: [['Personnel', 'Fonction', 'Présent', 'Absent', 'Retard', 'Permission', 'Total']],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 36 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 18 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data: any) => {
      // Pages suivantes : petit bandeau SYNC (jamais d'async dans ce hook)
      if (data.pageNumber > 1) {
        doc.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
        doc.rect(0, 0, pw, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('RAPPORT DE PRÉSENCE DU PERSONNEL — suite', pw / 2, 7, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    },
  });

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — Page ${i}/${pages}`, pw / 2, 292, { align: 'center' });
  }

  doc.save(`Rapport-presence-${MOIS_FR[month - 1]}-${year}.pdf`);
}
