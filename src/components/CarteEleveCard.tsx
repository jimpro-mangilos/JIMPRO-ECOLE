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
// Palette « Or & Encre » — ivoire + marine + or champagne (retenue = élégance)
// ═══════════════════════════════════════════════════════════════════════════════

const IVORY = '#fcfbf8';   // fond dominant (ivoire chaud, plus premium que blanc pur)
const INK = '#16233a';     // marine profond (texte, structure) — plus raffiné que le noir
const GOLD = '#c19a3d';    // or champagne (accent de marque « GOLDEN »)
const GOLD_DARK = '#8f6f24';
const GOLD_SOFT = '#f4ecd8';
const MUTED = '#8d93a3';   // gris bleuté pour les labels secondaires
const HAIRLINE = '#e9e6df'; // lignes fines chaudes

export interface CardTheme {
  accent: string;       // couleur du point de section (subtile, désaturée)
  accentDark: string;   // texte du label de section
  accentSoft: string;   // fond du chip de section
}

const THEMES: Record<string, CardTheme> = {
  MATERNELLE: {
    accent: '#a8646f',
    accentDark: '#7d4550',
    accentSoft: '#f6ebed',
  },
  PRIMAIRE: {
    accent: '#56806a',
    accentDark: '#3d604d',
    accentSoft: '#eaf1ec',
  },
  SECONDAIRE: {
    accent: GOLD,
    accentDark: GOLD_DARK,
    accentSoft: GOLD_SOFT,
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
// Composant carte — « Or & Encre » : ivoire dominant, marine + or
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
    fontSize: 8, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase' as const,
  };
  const labelGold = {
    fontSize: 8, fontWeight: 700, color: GOLD_DARK, letterSpacing: 2.5, textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(22,35,58,0.20)' }}>
      {/* Barre d'accent or (gauche) */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${GOLD}, ${GOLD_DARK})` }} />

      {/* Fine bordure intérieure */}
      <div style={{ position: 'absolute', top: 10, left: 18, right: 18, bottom: 10, borderRadius: 10, border: `1px solid ${HAIRLINE}` }} />

      {/* Lettre watermark */}
      <div style={{ position: 'absolute', top: 84, right: 150, fontSize: 140, fontWeight: 900, lineHeight: 1, color: INK, opacity: 0.03, letterSpacing: -8, userSelect: 'none' }}>{watermark}</div>

      {/* ═══ Header ═══ */}
      <div style={{ position: 'absolute', top: 20, left: 28, right: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${GOLD}` }}
            onError={() => setLogoError(true)} />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: GOLD }}>{getSchoolInitials(schoolName)}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 3.5, color: GOLD_DARK, textTransform: 'uppercase' }}>Carte d'élève</div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: MUTED }}>{annee}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '3px 10px', borderRadius: 20, background: t.accentSoft }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: t.accentDark }}>{getSectionLabel(eleve.section)}</span>
          </div>
        </div>
      </div>

      {/* Ligne fine or */}
      <div style={{ position: 'absolute', top: 78, left: 28, right: 28, height: 1, background: `linear-gradient(90deg, ${GOLD}44, ${HAIRLINE}, ${GOLD}44)` }} />

      {/* ═══ Photo ═══ */}
      <div style={{ position: 'absolute', top: 96, left: 28, width: 100, height: 126, borderRadius: 14, overflow: 'hidden', border: `2px solid ${GOLD}`, background: GOLD_SOFT }}>
        {eleve.photo_url && !photoError ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: GOLD_DARK, opacity: 0.55 }}>{initials}</div>
        )}
      </div>

      {/* ═══ Identité ═══ */}
      <div style={{ position: 'absolute', top: 94, left: 150, right: 150 }}>
        <div style={{ ...label }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.nom}</div>
        <div style={{ ...label, marginTop: 8 }}>Postnom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.postnom || '—'}</div>
        <div style={{ ...label, marginTop: 8 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.prenom}</div>
      </div>

      {/* ═══ Chips : option / classe / sexe ═══ */}
      <div style={{ position: 'absolute', top: 232, left: 150, right: 150, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {eleve.option ? (
          <div style={{ padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}` }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#4a5568' }}>{eleve.option}</span>
          </div>
        ) : null}
        <div style={{ padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}` }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#4a5568' }}>{eleve.classe || '—'}</span>
        </div>
        <div style={{ padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}` }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#4a5568' }}>{eleve.sexe}</span>
        </div>
      </div>

      {/* ═══ Pied : matricule + naissance ═══ */}
      <div style={{ position: 'absolute', bottom: 24, left: 28, right: 160, display: 'flex', gap: 40 }}>
        <div>
          <div style={{ ...labelGold }}>Matricule</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{eleve.matricule}</div>
        </div>
        <div>
          <div style={{ ...labelGold }}>Naissance</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{formatDateNaissance(eleve.date_naissance)}</div>
        </div>
      </div>

      {/* ═══ QR Code ═══ */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, width: CARTE_QR, height: CARTE_QR, background: '#ffffff', borderRadius: 12, padding: 8, border: `1px solid ${GOLD}66`, boxShadow: '0 6px 20px rgba(22,35,58,0.10)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, color: '#ffffff', fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '2px 10px', borderRadius: 8 }}>SCAN</div>
      </div>
    </div>
  );
}
