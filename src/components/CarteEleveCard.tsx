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
export const CARTE_QR = 180; // 30 × 30 mm

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
// Palette — ivoire + marine, avec couleurs de section vives
// ═══════════════════════════════════════════════════════════════════════════════

const IVORY = '#fcfbf8';
const INK = '#16233a';
const GOLD = '#c19a3d';
const MUTED = '#64748b';
const HAIRLINE = '#e9e6df';

export interface CardTheme {
  accent: string;       // couleur de section vive (liseré, labels, photo, QR)
  accentDark: string;   // teinte foncée
  accentSoft: string;   // teinte claire (fond de pastille)
}

const THEMES: Record<string, CardTheme> = {
  MATERNELLE: {
    accent: '#e11d48',
    accentDark: '#9f1239',
    accentSoft: '#ffe4e6',
  },
  PRIMAIRE: {
    accent: '#16a34a',
    accentDark: '#166534',
    accentSoft: '#dcfce7',
  },
  SECONDAIRE: {
    accent: '#d4a017',
    accentDark: '#8f6f00',
    accentSoft: '#fef3c7',
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
    fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' as const,
  };
  const labelAccent = {
    fontSize: 9, fontWeight: 700, color: t.accentDark, letterSpacing: 1.5, textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif', background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(22,35,58,0.20)' }}>
      {/* Vagues colorées de fond (multi-dégradé, en dessous de la photo : 40→54mm hauteur, 0→85mm largeur) */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_W, height: 126 }} viewBox="0 0 510 84" preserveAspectRatio="none">
        <path d="M0 66 C 85 44, 170 44, 255 66 S 425 88, 510 66 L 510 84 L 0 84 Z" fill={t.accentDark} opacity={0.16} />
        <path d="M0 52 C 85 30, 170 30, 255 52 S 425 74, 510 52 L 510 84 L 0 84 Z" fill={t.accent} opacity={0.20} />
        <path d="M0 38 C 85 16, 170 16, 255 38 S 425 60, 510 38 L 510 84 L 0 84 Z" fill={GOLD} opacity={0.18} />
      </svg>

      {/* Liseré coloré haut (couleur de section vive) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${t.accentDark}, ${t.accent}, ${t.accentDark})` }} />

      {/* Liseré coloré bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${t.accentDark}, ${t.accent}, ${t.accentDark})` }} />

      {/* Lignes décoratives de couleur (fond) */}
      <div style={{ position: 'absolute', top: 66, left: 18, right: 18, height: 5, background: `${t.accent}55` }} />
      <div style={{ position: 'absolute', top: 228, left: 18, right: 18, height: 5, background: `${t.accent}44` }} />

      {/* Fine bordure intérieure */}
      <div style={{ position: 'absolute', top: 12, left: 18, right: 18, bottom: 12, borderRadius: 10, border: `1px solid ${HAIRLINE}` }} />

      {/* Lettre watermark */}
      <div style={{ position: 'absolute', top: 84, right: 150, fontSize: 140, fontWeight: 900, lineHeight: 1, color: INK, opacity: 0.03, letterSpacing: -8, userSelect: 'none' }}>{watermark}</div>

      {/* ═══ Header ═══ */}
      {logoUrl && !logoError ? (
        <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ position: 'absolute', top: 16, left: 26, width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${t.accent}` }}
          onError={() => setLogoError(true)} />
      ) : (
        <div style={{ position: 'absolute', top: 16, left: 26, width: 48, height: 48, borderRadius: '50%', background: INK, lineHeight: '48px', textAlign: 'center', fontWeight: 700, fontSize: 20, color: GOLD }}>{getSchoolInitials(schoolName)}</div>
      )}

      <div style={{ position: 'absolute', top: 18, left: 86, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: t.accentDark, textTransform: 'uppercase' }}>Carte d'élève</div>
      <div style={{ position: 'absolute', top: 34, left: 86, fontSize: 16, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{schoolName.toUpperCase()}</div>

      <div style={{ position: 'absolute', top: 18, right: 26, fontSize: 10, fontWeight: 600, color: MUTED }}>{annee}</div>
      <div style={{ position: 'absolute', top: 38, right: 26, padding: '3px 10px', borderRadius: 20, background: t.accentSoft }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.accent, marginRight: 5, verticalAlign: 'middle' }} />
        <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: t.accentDark, verticalAlign: 'middle' }}>{getSectionLabel(eleve.section)}</span>
      </div>

      {/* Ligne fine */}
      <div style={{ position: 'absolute', top: 74, left: 26, right: 26, height: 1, background: `linear-gradient(90deg, ${t.accent}55, ${HAIRLINE}, ${t.accent}55)` }} />

      {/* ═══ Photo ═══ */}
      <div style={{ position: 'absolute', top: 88, left: 26, width: 100, height: 134, borderRadius: 14, overflow: 'hidden', border: `2px solid ${t.accent}`, background: t.accentSoft }}>
        {eleve.photo_url && !photoError ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', lineHeight: '130px', textAlign: 'center', fontSize: 40, fontWeight: 700, color: t.accentDark, opacity: 0.55 }}>{initials}</div>
        )}
      </div>

      {/* ═══ Identité ═══ */}
      <div style={{ position: 'absolute', top: 86, left: 142, width: 150 }}>
        <div style={{ ...label }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.nom}</div>
        <div style={{ ...label, marginTop: 9 }}>Postnom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.postnom || '—'}</div>
        <div style={{ ...label, marginTop: 9 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK }}>{eleve.prenom}</div>
      </div>

      {/* ═══ Option (chip) ═══ */}
      {eleve.option ? (
        <div style={{ position: 'absolute', top: 236, left: 142 }}>
          <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: 8, background: '#f6f5f1', border: `1px solid ${HAIRLINE}`, fontSize: 10, fontWeight: 600, color: '#4a5568' }}>{eleve.option}</span>
        </div>
      ) : null}

      {/* ═══ Classe + Sexe (au-dessus du QR) ═══ */}
      <div style={{ position: 'absolute', top: 82, left: 318, width: 78, textAlign: 'center' }}>
        <div style={{ ...label }}>Classe</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: t.accentDark }}>{eleve.classe || '—'}</div>
      </div>
      <div style={{ position: 'absolute', top: 82, left: 402, width: 78, textAlign: 'center' }}>
        <div style={{ ...label }}>Sexe</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: t.accentDark }}>{eleve.sexe}</div>
      </div>

      {/* ═══ Pied : matricule + naissance ═══ */}
      <div style={{ position: 'absolute', bottom: 20, left: 26 }}>
        <div style={{ display: 'inline-block', marginRight: 40, verticalAlign: 'top' }}>
          <div style={{ ...labelAccent }}>Matricule</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{eleve.matricule}</div>
        </div>
        <div style={{ display: 'inline-block', verticalAlign: 'top' }}>
          <div style={{ ...labelAccent }}>Naissance</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, marginTop: 3, color: INK }}>{formatDateNaissance(eleve.date_naissance)}</div>
        </div>
      </div>

      {/* ═══ QR Code (30 × 30 mm) — anneau dégradé 7 couleurs vives ═══ */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: CARTE_QR + 12, height: CARTE_QR + 12, borderRadius: 16, background: 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6)', boxShadow: '0 6px 20px rgba(22,35,58,0.12)' }}>
        <div style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, background: '#ffffff', borderRadius: 12, padding: 8 }}>
          <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${t.accentDark}, ${t.accent})`, color: '#ffffff', fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '2px 10px', borderRadius: 8 }}>SCAN</div>
      </div>
    </div>
  );
}
