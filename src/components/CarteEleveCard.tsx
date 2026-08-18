import { useState } from 'react';
import QRCode from 'qrcode';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Données & helpers partagés — source unique pour la carte d'élève
// ═══════════════════════════════════════════════════════════════════════════════

export interface CarteEleve {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  section: string;
  option?: string | null;
  classe?: string | null;
  photo_url?: string | null;
  date_naissance?: string | null;
}

export const CARTE_W = 510;
export const CARTE_H = 324;
export const CARTE_QR = 138;

export function formatDateNaissance(d?: string | null): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

export async function generateQrDataUrl(eleve: CarteEleve): Promise<string> {
  const nomComplet = `${eleve.nom} ${eleve.postnom ? eleve.postnom + ' ' : ''}${eleve.prenom}`;
  return QRCode.toDataURL(
    `MATRICULE:${eleve.matricule}|ELEVE:${nomComplet}|SECTION:${eleve.section}|CLASSE:${eleve.classe || ''}`,
    { width: 800, margin: 2, errorCorrectionLevel: 'H' }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Palette — ivoire + marine + or, avec une couleur de section (discrète mais visible)
// ═══════════════════════════════════════════════════════════════════════════════

const IVORY = '#fcfbf8';
const INK = '#16233a';
const GOLD = '#c19a3d';
const GOLD_DARK = '#8f6f24';
const MUTED = '#64748b';   // gris lisible pour les labels
const HAIRLINE = '#e9e6df';

export interface CardTheme {
  accent: string;       // couleur de section (liseré, labels, photo)
  accentDark: string;   // teinte foncée de la section
  accentSoft: string;   // teinte claire (fond de la pastille)
}

const THEMES: Record<string, CardTheme> = {
  MATERNELLE: {
    accent: '#b06070',
    accentDark: '#7d4550',
    accentSoft: '#f6ebed',
  },
  PRIMAIRE: {
    accent: '#4c8a6a',
    accentDark: '#3d604d',
    accentSoft: '#eaf1ec',
  },
  SECONDAIRE: {
    accent: GOLD,
    accentDark: GOLD_DARK,
    accentSoft: '#f4ecd8',
  },
};

export function getSectionTheme(section?: string | null): CardTheme {
  const s = (section || '').toUpperCase();
  if (s.includes('MATERNELLE')) return THEMES.MATERNELLE;
  if (s.includes('PRIMAIRE')) return THEMES.PRIMAIRE;
  return THEMES.SECONDAIRE; // Secondaire + fallback
}

export function getSectionLabel(section?: string | null): string {
  const s = (section || '').toUpperCase();
  if (s.includes('MATERNELLE')) return 'MATERNELLE';
  if (s.includes('PRIMAIRE')) return 'PRIMAIRE';
  return 'SECONDAIRE';
}

function sectionWatermark(section?: string | null): string {
  const s = (section || '').toUpperCase();
  if (s.includes('MATERNELLE')) return 'M';
  if (s.includes('PRIMAIRE')) return 'P';
  return 'S';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant carte — layout 100% absolu/inline-block (compatible html2canvas)
// ═══════════════════════════════════════════════════════════════════════════════

export function CarteEleveCard({ eleve, schoolName, logoUrl, qrDataUrl }: {
  eleve: CarteEleve;
  schoolName: string;
  logoUrl: string | null;
  qrDataUrl: string;
}) {
  const initials = (eleve.nom.charAt(0) + eleve.prenom.charAt(0)).toUpperCase();
  const annee = '2026-2027';
  const t = getSectionTheme(eleve.section);
  const [logoError, setLogoError] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const watermark = sectionWatermark(eleve.section);

  const label = {
    fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' as const,
  };
  const labelAccent = {
    fontSize: 9, fontWeight: 700, color: t.accentDark, letterSpacing: 2, textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(22,35,58,0.20)' }}>
      {/* Liseré coloré haut (couleur de section) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${t.accentDark}, ${t.accent}, ${t.accentDark})` }} />

      {/* Fine bordure intérieure */}
      <div style={{ position: 'absolute', top: 12, left: 18, right: 18, bottom: 12, borderRadius: 10, border: `1px solid ${HAIRLINE}` }} />

      {/* Lettre watermark */}
      <div style={{ position: 'absolute', top: 84, right: 150, fontSize: 140, fontWeight: 900, lineHeight: 1, color: INK, opacity: 0.03, letterSpacing: -8, userSelect: 'none' }}>{watermark}</div>

      {/* ═══ Header ═══ */}
      {logoUrl && !logoError ? (
        <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ position: 'absolute', top: 20, left: 28, width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${t.accent}` }}
          onError={() => setLogoError(true)} />
      ) : (
        <div style={{ position: 'absolute', top: 20, left: 28, width: 42, height: 42, borderRadius: '50%', background: INK, lineHeight: '42px', textAlign: 'center', fontWeight: 700, fontSize: 18, color: GOLD }}>{getSchoolInitials(schoolName)}</div>
      )}

      <div style={{ position: 'absolute', top: 20, left: 82, fontSize: 9, fontWeight: 700, letterSpacing: 3, color: t.accentDark, textTransform: 'uppercase' }}>Carte d'élève</div>
      <div style={{ position: 'absolute', top: 35, left: 82, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: INK, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</div>

      <div style={{ position: 'absolute', top: 20, right: 28, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: MUTED }}>{annee}</div>
      <div style={{ position: 'absolute', top: 40, right: 28, padding: '3px 10px', borderRadius: 20, background: t.accentSoft }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.accent, marginRight: 5, verticalAlign: 'middle' }} />
        <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: t.accentDark, verticalAlign: 'middle' }}>{getSectionLabel(eleve.section)}</span>
      </div>

      {/* Ligne fine */}
      <div style={{ position: 'absolute', top: 76, left: 28, right: 28, height: 1, background: `linear-gradient(90deg, ${t.accent}55, ${HAIRLINE}, ${t.accent}55)` }} />

      {/* ═══ Photo ═══ */}
      <div style={{ position: 'absolute', top: 92, left: 28, width: 100, height: 128, borderRadius: 14, overflow: 'hidden', border: `2px solid ${t.accent}`, background: t.accentSoft }}>
        {eleve.photo_url && !photoError ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', lineHeight: '124px', textAlign: 'center', fontSize: 40, fontWeight: 700, color: t.accentDark, opacity: 0.55 }}>{initials}</div>
        )}
      </div>

      {/* ═══ Identité ═══ */}
      <div style={{ position: 'absolute', top: 90, left: 148, width: 205 }}>
        <div style={{ ...label }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.nom}</div>
        <div style={{ ...label, marginTop: 9 }}>Postnom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.postnom || '—'}</div>
        <div style={{ ...label, marginTop: 9 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.prenom}</div>
      </div>

      {/* ═══ Chips : option / classe / sexe ═══ */}
      <div style={{ position: 'absolute', top: 232, left: 148 }}>
        {eleve.option ? (
          <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}`, marginRight: 6, fontSize: 10, fontWeight: 600, color: '#4a5568' }}>{eleve.option}</span>
        ) : null}
        <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}`, marginRight: 6, fontSize: 10, fontWeight: 600, color: '#4a5568' }}>{eleve.classe || '—'}</span>
        <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}`, fontSize: 10, fontWeight: 600, color: '#4a5568' }}>{eleve.sexe}</span>
      </div>

      {/* ═══ Pied : matricule + naissance ═══ */}
      <div style={{ position: 'absolute', bottom: 24, left: 28 }}>
        <div style={{ display: 'inline-block', marginRight: 40, verticalAlign: 'top' }}>
          <div style={{ ...labelAccent }}>Matricule</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{eleve.matricule}</div>
        </div>
        <div style={{ display: 'inline-block', verticalAlign: 'top' }}>
          <div style={{ ...labelAccent }}>Naissance</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{formatDateNaissance(eleve.date_naissance)}</div>
        </div>
      </div>

      {/* ═══ QR Code ═══ */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, width: CARTE_QR, height: CARTE_QR, background: '#ffffff', borderRadius: 12, padding: 8, border: `1px solid ${t.accent}66`, boxShadow: '0 6px 20px rgba(22,35,58,0.10)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${t.accentDark}, ${t.accent})`, color: '#ffffff', fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '2px 10px', borderRadius: 8 }}>SCAN</div>
      </div>
    </div>
  );
}
