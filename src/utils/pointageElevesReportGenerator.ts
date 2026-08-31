import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadLogoBase64, loadSchoolName, PDF_THEME, sanitizePdfText } from './pdfTheme';

export const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export interface PointageEleveRecord {
  id: string;
  eleve_id: string;
  date_pointage: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  statut: string;
  note: string | null;
}

export interface PermissionEleve {
  id: string;
  eleve_id: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif?: string | null;
}

interface EleveLigne {
  id: string;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  section: string;
  classe: string | null;
}

export async function generatePointageElevesReport(opts: {
  month: number; // 1-12
  year: number;
  eleves: EleveLigne[];
  pointages: PointageEleveRecord[];
  permissions?: PermissionEleve[];
  heureEntree: string;
}): Promise<void> {
  const { month, year, eleves, pointages, permissions, heureEntree } = opts;
  const schoolName = sanitizePdfText(await loadSchoolName()) || 'ÉTABLISSEMENT';
  const logo = await loadLogoBase64();
  const c = PDF_THEME.colors;

  // Agrégation par élève (jours ouvrés passés inclus dans le mois)
  const byId = new Map<string, { present: number; retard: number; absent: number; permission: number }>();
  for (const e of eleves) byId.set(e.id, { present: 0, retard: 0, absent: 0, permission: 0 });

  // Dates couvertes par des permissions approuvées
  const permDates = new Set<string>();
  for (const p of permissions || []) {
    if (p.statut !== 'approuvee') continue;
    const start = new Date(p.date_debut + 'T00:00:00');
    const end = new Date(p.date_fin + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      permDates.add(p.eleve_id + '_' + d.toISOString().slice(0, 10));
    }
  }

  const lastDay = new Date(year, month, 0).getDate();
  const workDays: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day >= 1 && day <= 5) {
      workDays.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const pastWorkDays = workDays.filter(d => d <= today);

  const byKey = new Map<string, PointageEleveRecord>();
  for (const pt of pointages) byKey.set(pt.eleve_id + '_' + pt.date_pointage, pt);

  for (const e of eleves) {
    const a = byId.get(e.id)!;
    for (const d of pastWorkDays) {
      const rec = byKey.get(e.id + '_' + d);
      if (rec) {
        if (rec.statut === 'retard') { a.retard++; continue; }
        if (rec.statut === 'absent') { a.absent++; continue; }
        if (rec.statut === 'permission') { a.permission++; continue; }
        // présent — retard automatique si arrivée après l'heure d'entrée
        if (rec.heure_arrivee && rec.heure_arrivee.slice(0, 5) > heureEntree) { a.retard++; }
        else { a.present++; }
      } else if (permDates.has(e.id + '_' + d)) {
        a.permission++;
      } else {
        a.absent++;
      }
    }
  }

  const totals = { present: 0, retard: 0, absent: 0, permission: 0 };
  for (const a of byId.values()) {
    totals.present += a.present;
    totals.retard += a.retard;
    totals.absent += a.absent;
    totals.permission += a.permission;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  // En-tête
  doc.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
  doc.rect(0, 0, pw, 30, 'F');
  doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
  doc.rect(0, 30, pw, 1.2, 'F');
  if (logo) { try { doc.addImage(logo, 'PNG', 12, 7, 14, 14); } catch { } }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(schoolName, pw / 2, 13, { align: 'center' });
  doc.setFontSize(11);
  doc.text('RAPPORT DE PRÉSENCE DES ÉLÈVES', pw / 2, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const moisLabel = MOIS_FR[month - 1] + ' ' + year;
  doc.text('Mois : ' + moisLabel + '    |    Jours ouvrés : ' + workDays.length + '    |    Heure d\'entrée : ' + heureEntree, pw / 2, 26, { align: 'center' });

  // Statistiques globales
  const nbEleves = eleves.length;
  const y0 = 40;
  doc.setFillColor(c.infoSoft[0], c.infoSoft[1], c.infoSoft[2]);
  doc.roundedRect(PDF_THEME.pageMargin, y0, pw - PDF_THEME.pageMargin * 2, 16, 2, 2, 'F');
  doc.setTextColor(c.slate[0], c.slate[1], c.slate[2]);
  doc.setFontSize(9);
  doc.text('Présences : ' + totals.present + '    Retards : ' + totals.retard + '    Absences : ' + totals.absent + '    Permissions : ' + totals.permission + '    Élèves : ' + nbEleves, pw / 2, y0 + 10, { align: 'center' });

  // Tableau bilan par élève
  const rows = eleves.map(e => {
    const a = byId.get(e.id)!;
    const joursEcoules = pastWorkDays.length;
    const taux = joursEcoules > 0 ? Math.round(((a.present + a.retard + a.permission) / joursEcoules) * 100) + '%' : '-';
    const nomComplet = [e.nom, e.postnom, e.prenom].filter(Boolean).join(' ');
    return [sanitizePdfText(e.matricule), sanitizePdfText(nomComplet), sanitizePdfText(e.section), sanitizePdfText(e.classe || ''), String(a.present), String(a.retard), String(a.absent), String(a.permission), taux];
  });

  doc.autoTable({
    startY: y0 + 22,
    head: [['Matricule', 'Nom complet', 'Section', 'Classe', 'Présent', 'Retard', 'Absent', 'Permiss.', 'Taux']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: c.slate, lineColor: c.border, lineWidth: 0.2 },
    headStyles: { fillColor: c.primary, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: c.slateSoft },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28 },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 18, halign: 'center' },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
      doc.text('JIMPRO ÉCOLE — Généré le ' + new Date().toLocaleDateString('fr-FR'), PDF_THEME.pageMargin, doc.internal.pageSize.getHeight() - 6);
    },
  });

  doc.save('pointage-eleves-' + month + '-' + year + '.pdf');
}