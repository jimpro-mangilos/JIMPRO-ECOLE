import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { sanitizePdfText, PDF_THEME, loadLogoBase64, loadSchoolName, addRoundedImage } from './pdfTheme';
import { getSchoolInitials } from './schoolInitials';
import { asciiFold } from './ascii';

const S = sanitizePdfText;

interface ReceiptData {
  numero_recu: string;
  matricule?: string;
  nom_eleve: string;
  postnom?: string;
  prenom?: string;
  classe: string | number;
  sexe?: string;
  section?: string;
  option?: string;
  telephone?: string;
  lieu_naissance?: string | null;
  date_naissance?: string | null;
  responsable?: string | null;
  montant_paye: number;
  montant_en_lettre: string;
  mode_paiement: string;
  date_paiement: string;
  date_encaissement: string;
  nom_comptable: string;
  nom_encaisseur?: string | null;
  type_paiement: string;
  annee_scolaire?: string | null;
  motif_paiement?: string | null;
}

function formatMontant(montant: number): string {
  const montantStr = Math.round(montant).toString();
  const parts = [];
  for (let i = montantStr.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(montantStr.slice(start, i));
  }
  return parts.join(' ');
}

function parseNomComplet(nomComplet: string | undefined) {
  if (!nomComplet) return { nom: '', postnom: '', prenom: '' };
  const parts = nomComplet.trim().split(/\s+/);
  if (parts.length >= 3) {
    return {
      nom: parts[0] || '',
      postnom: parts[1] || '',
      prenom: parts.slice(2).join(' ') || ''
    };
  } else if (parts.length === 2) {
    return {
      nom: parts[0] || '',
      postnom: parts[1] || '',
      prenom: ''
    };
  } else {
    return {
      nom: parts[0] || '',
      postnom: '',
      prenom: ''
    };
  }
}

export async function generateReceipt(data: ReceiptData, isDuplicate: boolean = false) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await loadLogoBase64();
  const schoolName = await loadSchoolName();

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  const primary = PDF_THEME.colors.primary;
  const accent = PDF_THEME.colors.accent;
  const slate = PDF_THEME.colors.slate;
  const muted = PDF_THEME.colors.muted;
  const border = PDF_THEME.colors.border;
  const slateSoft = PDF_THEME.colors.slateSoft;

  const nomParse = data.postnom && data.prenom ? {
    nom: data.nom_eleve,
    postnom: data.postnom,
    prenom: data.prenom
  } : parseNomComplet(data.nom_eleve);

  const nomComplet = `${nomParse.nom} ${nomParse.postnom} ${nomParse.prenom}`.trim();
  const qrAuthData = `RECU:${data.numero_recu}|MATRICULE:${data.matricule || ''}|ELEVE:${asciiFold(nomComplet)}|MONTANT:${data.montant_paye}|DATE:${data.date_encaissement}`;
  const qrAuthUrl = await QRCode.toDataURL(qrAuthData, { width: 300, margin: 1, errorCorrectionLevel: 'H' });
  const qrValidationUrl = await QRCode.toDataURL(`JIMPRO-VALIDATION:${data.numero_recu}|${data.date_encaissement}`, {
    width: 180, margin: 1, errorCorrectionLevel: 'M',
  });

  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 30, 'F');

  const logoSize = 18;
  if (logoBase64) {
    await addRoundedImage(doc, logoBase64, margin, 6, logoSize, logoSize, logoSize / 2, PDF_THEME.colors.primary);
  } else {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.circle(margin + logoSize / 2, 15, logoSize / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(getSchoolInitials(schoolName), margin + logoSize / 2, 17, { align: 'center' });
  }

  const textX = margin + logoSize + 3;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(S(schoolName), textX, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(S('Systeme de Gestion Scolaire'), textX, 20);
  doc.setFontSize(8);
  doc.text(S('Ecole Maternelle,Primaire et Secondaire'), textX, 25);

  doc.setFillColor(slateSoft[0], slateSoft[1], slateSoft[2]);
  doc.rect(0, 30, pageWidth, 18, 'F');
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 30, 4, 18, 'F');

  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(S('RECU DE PAIEMENT'), margin, 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(S((data.numero_recu || 'RECU-XXXX').toUpperCase()), pageWidth / 2, 42, { align: 'center' });

  const dateEmission = new Date(data.date_encaissement);
  const dateStr = `${String(dateEmission.getDate()).padStart(2, '0')}/${String(dateEmission.getMonth() + 1).padStart(2, '0')}/${dateEmission.getFullYear()} ${String(dateEmission.getHours()).padStart(2, '0')}:${String(dateEmission.getMinutes()).padStart(2, '0')}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(S(`Emis le ${dateStr}`), pageWidth - margin, 39, { align: 'right' });

  doc.addImage(qrAuthUrl, 'PNG', pageWidth - margin - 45, 45, 45, 45);

  let yPos = 58;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(S('INFORMATIONS ELEVE'), margin, yPos);

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos + 2, pageWidth - margin - 30, yPos + 2);

  yPos += 7;

  const eleveInfo: [string, string][] = [
    ['Matricule', data.matricule ? data.matricule.toUpperCase() : '-'],
    ['Nom', (nomParse.nom || '-').toUpperCase()],
    ['Postnom', (nomParse.postnom || '-').toUpperCase()],
    ['Prenom', (nomParse.prenom || '-').toUpperCase()],
    ['Sexe', data.sexe ? data.sexe.toUpperCase() : '-'],
    ['Section', data.section ? data.section.toUpperCase() : '-'],
    ['Option', data.option ? data.option.toUpperCase() : '-'],
    ['Classe', String(data.classe)],
    ['Telephone', data.telephone || '-'],
  ];

  doc.setFontSize(9);
  eleveInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(S(label), margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(S(value), margin + 28, yPos);
    yPos += 5;
  });

  yPos += 4;

  const rawType = (data.type_paiement || '').trim();
  const typeLabel =
    rawType.toLowerCase() === 'minerval' ? 'Minerval' :
    rawType.toLowerCase() === 'fournitures_eleves' ? 'Fournitures Eleves' :
    rawType.toLowerCase() === 'fournitures_bureau' ? 'Fournitures Bureau' :
    rawType;

  const motif = (data.motif_paiement || '').trim();
  let baseMotif = motif;
  if (typeLabel && typeLabel.toLowerCase() !== motif.toLowerCase()) {
    baseMotif = motif ? `${typeLabel} - ${motif}` : typeLabel;
  }
  const motifLabel = data.annee_scolaire ? `${baseMotif} / ${data.annee_scolaire}` : baseMotif;
  const refPaiement = data.numero_recu.substring(0, 8);

  const tableData = [
    ['1', S(refPaiement), S(motifLabel), 'CDF', S(`${formatMontant(data.montant_paye)} FC`)]
  ];

  (doc as any).autoTable({
    startY: yPos,
    head: [['N', 'REF', 'MOTIF', 'DEVISE', 'MONTANT']],
    body: tableData,
    foot: [['', '', S('TOTAL A PAYER'), '', S(`${formatMontant(data.montant_paye)} FC`)]],
    theme: 'grid',
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: slate,
      cellPadding: 3,
      lineColor: border,
    },
    footStyles: {
      fillColor: slateSoft,
      textColor: primary,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: function(data: any) { yPos = data.cursor.y; },
  });

  yPos += 8;

  doc.setFillColor(slateSoft[0], slateSoft[1], slateSoft[2]);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 12, 'F');
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(margin, yPos - 5, 3, 12, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(S(`la somme encaissée est : ${data.montant_en_lettre}`), margin + 6, yPos + 2);

  yPos += 14;

  const signatureH = 38;
  const colWidth = (pageWidth - 2 * margin) / 3;

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, signatureH);
  doc.line(margin + colWidth, yPos, margin + colWidth, yPos + signatureH);
  doc.line(margin + 2 * colWidth, yPos, margin + 2 * colWidth, yPos + signatureH);

  doc.setFillColor(slateSoft[0], slateSoft[1], slateSoft[2]);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(S('SIGNATURE DU RESPONSABLE'), margin + colWidth / 2, yPos + 5, { align: 'center' });
  doc.text(S('DIRECTION'), margin + colWidth + colWidth / 2, yPos + 5, { align: 'center' });
  doc.text(S('CAISSE'), margin + 2 * colWidth + colWidth / 2, yPos + 5, { align: 'center' });

  doc.addImage(qrValidationUrl, 'PNG', margin + colWidth + (colWidth - 20) / 2, yPos + 10, 20, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slate[0], slate[1], slate[2]);
  const caissier = data.nom_encaisseur || data.nom_comptable;
  doc.text(S(caissier), margin + 2 * colWidth + colWidth / 2, yPos + 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(S('Caissier / Encaisseur'), margin + 2 * colWidth + colWidth / 2, yPos + 27, { align: 'center' });

  yPos += signatureH + 10;

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);

  // Lien de vérification du reçu (fonctionne aussi sans logo)
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(S(`Verifier ce recu : ${origin}/verifier-facture/${data.numero_recu}`), pageWidth / 2, yPos - 4, { align: 'center' });
  doc.text(S('Systeme developpe par la start-up JIM-MARKET'), pageWidth / 2, yPos, { align: 'center' });
  doc.text(S('Tel : +243 813 100 008  |  +243 998 608 276'), pageWidth / 2, yPos + 4, { align: 'center' });

  if (isDuplicate) {
    doc.setFontSize(60);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.text(S('DUPLICATA'), pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  doc.save(`recu_${data.numero_recu}_${Date.now()}.pdf`);
}

export async function printReceipt(data: ReceiptData, isDuplicate: boolean = false) {
  await generateReceipt(data, isDuplicate);
}