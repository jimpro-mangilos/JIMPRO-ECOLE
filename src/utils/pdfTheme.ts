import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { getSchoolInitials } from './schoolInitials';

export const PDF_THEME = {
  colors: {
    primary: [30, 58, 95] as [number, number, number],
    primarySoft: [226, 232, 240] as [number, number, number],
    accent: [212, 160, 74] as [number, number, number],
    success: [21, 128, 61] as [number, number, number],
    successSoft: [220, 252, 231] as [number, number, number],
    danger: [185, 28, 28] as [number, number, number],
    dangerSoft: [254, 226, 226] as [number, number, number],
    warning: [180, 83, 9] as [number, number, number],
    warningSoft: [254, 243, 199] as [number, number, number],
    info: [30, 64, 175] as [number, number, number],
    infoSoft: [219, 234, 254] as [number, number, number],
    slate: [51, 65, 85] as [number, number, number],
    slateSoft: [241, 245, 249] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    black: [15, 23, 42] as [number, number, number],
  },
  font: 'helvetica',
  pageMargin: 14,
  headerHeight: 28,
  titleBandHeight: 18,
};

export function sanitizePdfText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/\u2009/g, ' ')
    .replace(/\u2007/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00AB\s?/g, '"')
    .replace(/\s?\u00BB/g, '"')
    .replace(/\u0152/g, 'OE')
    .replace(/\u0153/g, 'oe')
    .replace(/\u20AC/g, 'EUR');
}

export function sanitizeRows(rows: (string | number | null | undefined)[][]): string[][] {
  return rows.map(row => row.map(cell => sanitizePdfText(cell)));
}

export function formatCurrencyPDF(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  const parts: string[] = [];
  const str = Math.abs(rounded).toString();
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  const formatted = parts.join(' ');
  return `${rounded < 0 ? '-' : ''}${formatted} FC`;
}

export function formatDatePDF(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatDateTimePDF(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return `${formatDatePDF(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface ReportHeaderOptions {
  title: string;
  subtitle?: string;
  period?: string;
  documentRef?: string;
  logoBase64?: string;
  schoolName?: string;
}

let _logoCache: string | null = null;
let _logoCacheEcoleId: string | null = null;

// Logo déjà chargé par LogoContext (UI) — source fiable de la BONNE école.
let _uiLogoBase64: string | null = null;

/** Permet à LogoContext de partager le logo chargé avec les générateurs PDF. */
export function setUiLogoBase64(b64: string | null) {
  _uiLogoBase64 = b64;
}

/**
 * Détermine l'école active hors-React : priorité override localStorage (admin),
 * sinon claim JWT (app_metadata.ecole_id).
 */
export async function getCurrentEcoleId(): Promise<string | null> {
  // 1. Override localStorage (admin/promoteur qui a basculé d'école)
  try {
    const stored = localStorage.getItem('jimpro_active_school_id');
    if (stored && stored !== 'null') return stored;
  } catch { /* localStorage indisponible */ }

  // 2. Table profiles (source de vérité — même priorité que AuthContext).
  //    Prioritaire sur le claim JWT app_metadata.ecole_id qui peut être
  //    obsolète après un changement d'école (le token n'est rafraîchi qu'à
  //    expiration) et faisait pointer le reçu vers la mauvaise école.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('ecole_id')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.ecole_id) return profile.ecole_id;
    }
  } catch { /* ignore */ }

  // 3. Claim JWT app_metadata.ecole_id (fallback)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const ecoleId = session?.user?.app_metadata?.ecole_id as string | undefined;
    if (ecoleId) return ecoleId;
  } catch { /* ignore */ }

  return null;
}

export async function loadLogoBase64(): Promise<string> {
  // 0. Logo déjà chargé par l'UI (LogoContext) — toujours la bonne école
  if (_uiLogoBase64) return _uiLogoBase64;

  const ecoleId = await getCurrentEcoleId();
  if (_logoCache && _logoCacheEcoleId === ecoleId) return _logoCache;

  // 1. Cache localStorage du base64 (spécifique école, puis universel)
  const tryCache = (key: string): string | null => {
    try {
      const v = localStorage.getItem(key);
      if (v) { _logoCache = v; _logoCacheEcoleId = ecoleId; return v; }
    } catch { /* ignore */ }
    return null;
  };
  if (ecoleId) { const c = tryCache(`jimpro_logo_b64_${ecoleId}`); if (c) return c; }
  { const c = tryCache('jimpro_logo_b64_current'); if (c) return c; }

  // 2. URL depuis app_settings — filtrée par école (jamais sans filtre :
  //    le logo d'une autre école serait pire qu'aucun logo)
  let url = '';
  try {
    if (ecoleId) {
      const { data } = await (supabase as any)
        .from('app_settings')
        .select('value')
        .eq('key', 'logo_url')
        .eq('ecole_id', ecoleId)
        .maybeSingle();
      url = (data as any)?.value || '';
    }
  } catch { url = ''; }

  // 3. Fallback : URL en cache localStorage (par école, puis universelle)
  if (!url && ecoleId) {
    try { url = localStorage.getItem(`jimpro_logo_${ecoleId}`) || ''; } catch { /* ignore */ }
  }
  if (!url) {
    try { url = localStorage.getItem('jimpro_logo_current') || ''; } catch { /* ignore */ }
  }
  if (!url) return '';

  // 4. Récupération de l'image → data URL (avec vérification de la réponse)
  try {
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        _logoCache = reader.result as string;
        _logoCacheEcoleId = ecoleId;
        try {
          if (ecoleId) localStorage.setItem(`jimpro_logo_b64_${ecoleId}`, _logoCache!);
          localStorage.setItem('jimpro_logo_b64_current', _logoCache!);
        } catch { /* ignore */ }
        resolve(_logoCache!);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export function invalidateLogoCache() {
  _logoCache = null;
  _logoCacheEcoleId = null;
}

/**
 * Charge le nom de l'école active (pour l'en-tête des rapports/reçus).
 */
export async function loadSchoolName(): Promise<string> {
  const ecoleId = await getCurrentEcoleId();
  try {
    if (!ecoleId) return 'GOLDEN ACADEMY';
    const { data } = await (supabase as any)
      .from('ecoles')
      .select('nom')
      .eq('id', ecoleId)
      .maybeSingle();
    return data?.nom || 'GOLDEN ACADEMY';
  } catch {
    return 'GOLDEN ACADEMY';
  }
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x, y, w, h, 'F');
}

/**
 * jsPDF ne gère pas l'auto-détection si on lui passe un mauvais format.
 * Les logos peuvent être du PNG, JPEG ou WEBP selon ce qui a été uploadé ;
 * on détecte le type réel à partir du data URL pour éviter qu'un JPEG
 * (uploadé par erreur) fasse échouer addImage avec le format 'PNG'.
 */
function detectImageFormat(img: string, fallback = 'PNG'): string {
  if (/^data:image\/(jpe?g)/i.test(img)) return 'JPEG';
  if (/^data:image\/png/i.test(img)) return 'PNG';
  if (/^data:image\/webp/i.test(img)) return 'WEBP';
  return fallback;
}

/**
 * Recompose une image (avec transparence) sur une couleur de fond donnée,
 * et la convertit en JPEG sans alpha.
 * → Corrige jsPDF qui rend la transparence des PNG en blanc opaque.
 */
export function compositeOnColor(img: string, r: number, g: number, b: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (e) { reject(e); }
    };
    image.onerror = reject;
    image.src = img;
  });
}

export async function addRoundedImage(
  doc: jsPDF,
  img: string,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 3,
  bgColor?: [number, number, number],
  format = 'PNG',
) {
  let imgToAdd = img;
  let fmt = detectImageFormat(img, format);
  // Recompose sur la couleur de fond si fournie (évite le fond blanc de jsPDF)
  if (bgColor) {
    try {
      imgToAdd = await compositeOnColor(img, bgColor[0], bgColor[1], bgColor[2]);
      fmt = 'JPEG';
    } catch { /* image d'origine */ }
  }
  doc.saveGraphicsState();
  doc.roundedRect(x, y, w, h, radius, radius, null);
  doc.clip();
  doc.addImage(imgToAdd, fmt, x, y, w, h);
  doc.restoreGraphicsState();
}

export async function drawReportHeader(doc: jsPDF, options: ReportHeaderOptions) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { primary, white, accent, slate, muted } = PDF_THEME.colors;

  drawRect(doc, 0, 0, pageWidth, PDF_THEME.headerHeight, primary);

  const logoSize = 18; // carré → cercle (rayon = logoSize / 2)
  const logoX = PDF_THEME.pageMargin;
  const logoY = (PDF_THEME.headerHeight - logoSize) / 2;
  const schoolName = options.schoolName || 'GOLDEN ACADEMY';
  if (options.logoBase64) {
    await addRoundedImage(doc, options.logoBase64, logoX, logoY, logoSize, logoSize, logoSize / 2, PDF_THEME.colors.primary);
  } else {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(8);
    doc.text(getSchoolInitials(schoolName), logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' });
  }

  const textX = PDF_THEME.pageMargin + logoSize + 3;
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFont(PDF_THEME.font, 'bold');
  doc.setFontSize(14);
  doc.text(sanitizePdfText(schoolName), textX, 13);

  doc.setFont(PDF_THEME.font, 'normal');
  doc.setFontSize(8.5);
  doc.text(sanitizePdfText('Systeme de Gestion Scolaire'), textX, 19);

  const ref = options.documentRef || `REF-${Date.now().toString(36).toUpperCase()}`;
  doc.setFontSize(8);
  doc.text(sanitizePdfText(`Reference : ${ref}`), pageWidth - PDF_THEME.pageMargin, 13, { align: 'right' });
  doc.text(sanitizePdfText(`Emis le ${formatDateTimePDF(new Date())}`), pageWidth - PDF_THEME.pageMargin, 19, { align: 'right' });

  const bandY = PDF_THEME.headerHeight;
  drawRect(doc, 0, bandY, pageWidth, PDF_THEME.titleBandHeight, PDF_THEME.colors.slateSoft);
  drawRect(doc, 0, bandY, 4, PDF_THEME.titleBandHeight, accent);

  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.setFont(PDF_THEME.font, 'bold');
  doc.setFontSize(14);
  doc.text(sanitizePdfText(options.title.toUpperCase()), PDF_THEME.pageMargin, bandY + 8);

  if (options.period || options.subtitle) {
    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    const meta = [options.subtitle, options.period].filter(Boolean).join('  -  ');
    doc.text(sanitizePdfText(meta), PDF_THEME.pageMargin, bandY + 14);
  }
}

export function drawReportFooter(doc: jsPDF, reportTitle?: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { border, muted } = PDF_THEME.colors;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.3);
    doc.line(PDF_THEME.pageMargin, pageHeight - 16, pageWidth - PDF_THEME.pageMargin, pageHeight - 16);

    if (i > 1 && reportTitle) {
      doc.setFont(PDF_THEME.font, 'italic');
      doc.setFontSize(6);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(
        sanitizePdfText(reportTitle),
        PDF_THEME.pageMargin,
        pageHeight - 12
      );
    }

    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(
      sanitizePdfText('JIMPRO - Systeme de Gestion Scolaire'),
      PDF_THEME.pageMargin,
      pageHeight - 7
    );
    doc.text(
      sanitizePdfText('Contact : +243 813 100 008 | +243 998 608 276'),
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
    doc.text(
      sanitizePdfText(`Page ${i} / ${pageCount}`),
      pageWidth - PDF_THEME.pageMargin,
      pageHeight - 7,
      { align: 'right' }
    );
  }
  doc.setTextColor(0, 0, 0);
}

export interface KpiCard {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'slate' | 'accent';
}

export function drawKpiCards(doc: jsPDF, startY: number, cards: KpiCard[]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_THEME.pageMargin;
  const gap = 4;
  const count = cards.length;
  const cardHeight = 18;
  const totalWidth = pageWidth - 2 * margin;
  const cardWidth = (totalWidth - gap * (count - 1)) / count;

  const toneMap: Record<NonNullable<KpiCard['tone']>, { bg: [number, number, number]; accent: [number, number, number]; fg: [number, number, number] }> = {
    primary: { bg: PDF_THEME.colors.slateSoft, accent: PDF_THEME.colors.primary, fg: PDF_THEME.colors.primary },
    success: { bg: PDF_THEME.colors.successSoft, accent: PDF_THEME.colors.success, fg: PDF_THEME.colors.success },
    danger: { bg: PDF_THEME.colors.dangerSoft, accent: PDF_THEME.colors.danger, fg: PDF_THEME.colors.danger },
    warning: { bg: PDF_THEME.colors.warningSoft, accent: PDF_THEME.colors.warning, fg: PDF_THEME.colors.warning },
    info: { bg: PDF_THEME.colors.infoSoft, accent: PDF_THEME.colors.info, fg: PDF_THEME.colors.info },
    slate: { bg: PDF_THEME.colors.slateSoft, accent: PDF_THEME.colors.slate, fg: PDF_THEME.colors.slate },
    accent: { bg: PDF_THEME.colors.warningSoft, accent: PDF_THEME.colors.accent, fg: PDF_THEME.colors.accent },
  };

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + gap);
    const tone = toneMap[card.tone || 'primary'];

    drawRect(doc, x, startY, cardWidth, cardHeight, tone.bg);
    drawRect(doc, x, startY, 2.5, cardHeight, tone.accent);

    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
    doc.text(sanitizePdfText(card.label.toUpperCase()), x + 5, startY + 6);

    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(tone.fg[0], tone.fg[1], tone.fg[2]);
    const maxWidth = cardWidth - 8;
    const valueText = sanitizePdfText(card.value);
    const lines = doc.splitTextToSize(valueText, maxWidth);
    doc.text(lines[0] || '', x + 5, startY + 13);
  });

  doc.setTextColor(0, 0, 0);
  return startY + cardHeight + 4;
}

export function drawSectionTitle(
  doc: jsPDF,
  y: number,
  title: string,
  subtitle?: string,
  tone: [number, number, number] = PDF_THEME.colors.primary
): number {
  const margin = PDF_THEME.pageMargin;
  drawRect(doc, margin, y - 3, 3, 7, tone);

  doc.setFont(PDF_THEME.font, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
  doc.text(sanitizePdfText(title.toUpperCase()), margin + 7, y + 1);

  if (subtitle) {
    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(sanitizePdfText(subtitle), pageWidth - margin, y + 1, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);
  return y + 5;
}

export function contentStartY(): number {
  return PDF_THEME.headerHeight + PDF_THEME.titleBandHeight + 6;
}

export function ensureSpace(doc: jsPDF, y: number, needed: number, _header: ReportHeaderOptions): number {
  void _header;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return PDF_THEME.pageMargin;
  }
  return y;
}

export function defaultTableStyles(headColor: [number, number, number] = PDF_THEME.colors.primary) {
  return {
    theme: 'grid' as const,
    headStyles: {
      fillColor: headColor,
      textColor: PDF_THEME.colors.white,
      fontStyle: 'bold' as const,
      fontSize: 7,
      halign: 'left' as const,
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: PDF_THEME.colors.black,
      cellPadding: 1.2,
      lineColor: PDF_THEME.colors.border,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: PDF_THEME.colors.slateSoft,
    },
    footStyles: {
      fillColor: PDF_THEME.colors.primarySoft,
      textColor: PDF_THEME.colors.primary,
      fontStyle: 'bold' as const,
      fontSize: 7,
    },
    showFoot: 'lastPage' as const,
    margin: { left: PDF_THEME.pageMargin, right: PDF_THEME.pageMargin },
  };
}

export interface VerticalBarItem {
  label: string;
  value: number;
  color?: [number, number, number];
}

export function drawVerticalBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: VerticalBarItem[],
  title?: string,
  formatValue?: (v: number) => string
): number {
  if (!data.length) return y;

  const fmt = formatValue || ((v: number) => formatCurrencyPDF(v));
  const margin = 4;
  const labelHeight = 10;
  const valueHeight = 8;
  const chartAreaHeight = height - labelHeight - valueHeight;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barGap = 3;
  const totalGaps = (data.length + 1) * barGap;
  const barWidth = Math.min(20, (width - totalGaps) / data.length);
  const totalBarsWidth = data.length * barWidth + (data.length + 1) * barGap;
  const offsetX = x + (width - totalBarsWidth) / 2;

  if (title) {
    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(PDF_THEME.colors.slate[0], PDF_THEME.colors.slate[1], PDF_THEME.colors.slate[2]);
    doc.text(sanitizePdfText(title), x, y + 4);
    y += 8;
  }

  const baselineY = y + valueHeight + chartAreaHeight;

  doc.setDrawColor(PDF_THEME.colors.border[0], PDF_THEME.colors.border[1], PDF_THEME.colors.border[2]);
  doc.setLineWidth(0.2);
  doc.line(x, baselineY, x + width, baselineY);

  for (let i = 1; i <= 3; i++) {
    const gy = baselineY - (chartAreaHeight / 3) * i;
    doc.setDrawColor(PDF_THEME.colors.border[0], PDF_THEME.colors.border[1], PDF_THEME.colors.border[2]);
    doc.setLineWidth(0.1);
    doc.line(x + margin, gy, x + width - margin, gy);
  }

  data.forEach((item, i) => {
    const barX = offsetX + barGap + i * (barWidth + barGap);
    const barH = maxValue > 0 ? (item.value / maxValue) * chartAreaHeight : 0;
    const barY = baselineY - barH;
    const color = item.color || PDF_THEME.colors.info;

    doc.setFillColor(color[0], color[1], color[2]);
    if (barH > 0) {
      doc.roundedRect(barX, barY, barWidth, barH, 1.5, 1.5, 'F');
    }

    doc.setFont(PDF_THEME.font, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(sanitizePdfText(fmt(item.value)), barX + barWidth / 2, barY - 2, { align: 'center' });

    doc.setFont(PDF_THEME.font, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(PDF_THEME.colors.muted[0], PDF_THEME.colors.muted[1], PDF_THEME.colors.muted[2]);
    const label = item.label.length > 10 ? item.label.slice(0, 9) + '.' : item.label;
    doc.text(sanitizePdfText(label), barX + barWidth / 2, baselineY + 5, { align: 'center' });
  });

  doc.setTextColor(0, 0, 0);
  return baselineY + labelHeight + 4;
}