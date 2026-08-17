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

// Bandeau coloré = 30% de la hauteur de la carte
export const HEADER_H = 97;

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
// Thèmes par section — 30% couleurs (bandeau) / 70% blanc
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardTheme {
  accent: string;       // couleur dominante (bordures, valeurs)
  accentDark: string;   // teinte foncée (texte sur fond blanc)
  accentSoft: string;   // teinte claire (fonds de chips/badges)
  bg: string;           // fond de la zone blanche
  headerGradient: string; // dégradé du bandeau coloré (30%)
  logoGradient: string; // dégradé du logo/initiales
}

// Bandeau tricolore partagé : rouge → doré → vert (le « mélange »)
const TRICOLOR_HEADER = 'linear-gradient(90deg, #dc2626 0%, #f59e0b 50%, #22c55e 100%)';
const TRICOLOR_BAR = 'linear-gradient(90deg, #dc2626, #ef4444, #f59e0b, #22c55e, #f59e0b, #ef4444, #dc2626)';

const THEMES: Record<string, CardTheme> = {
  MATERNELLE: {
    accent: '#dc2626',
    accentDark: '#991b1b',
    accentSoft: '#fee2e2',
    bg: '#ffffff',
    headerGradient: TRICOLOR_HEADER,
    logoGradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
  },
  PRIMAIRE: {
    accent: '#16a34a',
    accentDark: '#166534',
    accentSoft: '#dcfce7',
    bg: '#ffffff',
    headerGradient: TRICOLOR_HEADER,
    logoGradient: 'linear-gradient(135deg, #15803d, #22c55e)',
  },
  SECONDAIRE: {
    accent: '#d97706',
    accentDark: '#92400e',
    accentSoft: '#fef3c7',
    bg: '#ffffff',
    headerGradient: TRICOLOR_HEADER,
    logoGradient: 'linear-gradient(135deg, #b45309, #f59e0b)',
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
// Composant carte — 30% bandeau coloré / 70% blanc
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
    fontSize: 8, fontWeight: 700, color: t.accentDark, letterSpacing: 2, textTransform: 'uppercase' as const,
  };
  const labelMuted = {
    fontSize: 8, fontWeight: 600, letterSpacing: 2, color: '#9ca3af', textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: t.bg, borderRadius: 14, color: '#111827', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
      {/* ═══ Bandeau coloré 30% ═══ */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, background: t.headerGradient }}>
        {/* Scrim léger pour la lisibilité du texte blanc */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)' }} />
        {/* Lettre watermark dans le bandeau */}
        <div style={{ position: 'absolute', top: -12, right: 150, fontSize: 110, fontWeight: 900, lineHeight: 1, color: '#ffffff', opacity: 0.12, letterSpacing: -6, userSelect: 'none' }}>{watermark}</div>

        {/* Contenu du bandeau */}
        <div style={{ position: 'absolute', top: 22, left: 22, right: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
          {logoUrl && !logoError ? (
            <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', background: '#ffffff', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
              onError={() => setLogoError(true)} />
          ) : (
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: t.accentDark, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>{getSchoolInitials(schoolName)}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: '#ffffff', textTransform: 'uppercase', opacity: 0.95 }}>Carte d'élève</div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ border: '1.5px solid rgba(255,255,255,0.9)', borderRadius: 20, padding: '3px 14px', background: 'rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: '#ffffff' }}>OFFICIEL</span>
            </div>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#ffffff', letterSpacing: 2, opacity: 0.85 }}>JIMPRO&nbsp;·&nbsp;{annee}</span>
          </div>
        </div>
      </div>

      {/* ═══ Zone blanche 70% ═══ */}
      {/* Subtle dot grid */}
      <svg style={{ position: 'absolute', top: HEADER_H, left: 0, width: CARTE_W, height: CARTE_H - HEADER_H, opacity: 0.025 }}>
        <defs><pattern id="carte-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="black" /></pattern></defs>
        <rect width={CARTE_W} height={CARTE_H - HEADER_H} fill="url(#carte-dots)" />
      </svg>

      {/* ═══ Photo ═══ */}
      <div style={{ position: 'absolute', top: 112, left: 22, width: 100, height: 122, borderRadius: 16, padding: 3, background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 13, overflow: 'hidden', background: t.accentSoft }}>
          {eleve.photo_url && !photoError ? (
            <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setPhotoError(true)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 800, color: t.accentDark, opacity: 0.6 }}>{initials}</div>
          )}
        </div>
      </div>

      {/* ═══ Identité ═══ */}
      <div style={{ position: 'absolute', top: 108, left: 146, right: 150 }}>
        <div style={{ ...label }}>Nom</div>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.4, color: '#111827' }}>{eleve.nom}</div>
        <div style={{ ...label, marginTop: 6 }}>Postnom</div>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.4 }}>{eleve.postnom || '—'}</div>
        <div style={{ ...label, marginTop: 6 }}>Prénom</div>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.4 }}>{eleve.prenom}</div>
      </div>

      {/* ═══ Chips : section / option / classe / sexe ═══ */}
      <div style={{ position: 'absolute', top: 236, left: 146, right: 150, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: t.accentSoft, border: `1px solid ${t.accent}55` }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: t.accentDark }}>{getSectionLabel(eleve.section)}</span>
        </div>
        {eleve.option ? (
          <div style={{ padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>{eleve.option}</span>
          </div>
        ) : null}
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>{eleve.classe || '—'}</span>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>{eleve.sexe}</span>
        </div>
      </div>

      {/* ═══ Pied : matricule + naissance ═══ */}
      <div style={{ position: 'absolute', bottom: 18, left: 22, right: 158, display: 'flex', gap: 32 }}>
        <div>
          <div style={{ ...labelMuted }}>Matricule</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, marginTop: 2, color: '#374151' }}>{eleve.matricule}</div>
        </div>
        <div>
          <div style={{ ...labelMuted }}>Naissance</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, marginTop: 2, color: '#374151' }}>{formatDateNaissance(eleve.date_naissance)}</div>
        </div>
      </div>

      {/* ═══ QR Code ═══ */}
      <div style={{ position: 'absolute', bottom: 14, right: 14, width: CARTE_QR, height: CARTE_QR, background: '#ffffff', borderRadius: 12, padding: 8, border: `1px solid ${t.accent}40`, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: t.logoGradient, color: '#ffffff', fontSize: 7, fontWeight: 800, letterSpacing: 1, padding: '2px 10px', borderRadius: 8 }}>SCAN</div>
      </div>

      {/* ═══ Liseré tricolore bas ═══ */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: TRICOLOR_BAR }} />
    </div>
  );
}
