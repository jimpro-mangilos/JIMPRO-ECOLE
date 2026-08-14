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
export const CARTE_QR = 150;

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
// Thèmes par section — 3 couleurs distinctes
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardTheme {
  accent: string;       // couleur d'accent principale (labels, bordures)
  accentBright: string; // accent vif (nom d'école, valeurs)
  bg: string;           // fond dégradé
  topBar: string;       // barre du haut
  bottomBar: string;    // barre du bas
  logoGradient: string; // dégradé du carré logo/initiales
}

const THEMES: Record<string, CardTheme> = {
  MATERNELLE: {
    accent: '#f472b6',
    accentBright: '#fbcfe8',
    bg: 'linear-gradient(135deg, #2a0a1c 0%, #3a1030 40%, #24102e 100%)',
    topBar: 'linear-gradient(90deg, #9d174d, #ec4899, #f9a8d4, #ec4899, #9d174d)',
    bottomBar: 'linear-gradient(90deg, #1e0a14, #be185d, #ec4899, #f9a8d4, #fbcfe8, #f9a8d4, #ec4899, #be185d, #1e0a14)',
    logoGradient: 'linear-gradient(135deg, #9d174d, #ec4899)',
  },
  PRIMAIRE: {
    accent: '#34d399',
    accentBright: '#a7f3d0',
    bg: 'linear-gradient(135deg, #071f14 0%, #0c2b1e 40%, #0f352a 100%)',
    topBar: 'linear-gradient(90deg, #065f46, #10b981, #6ee7b7, #10b981, #065f46)',
    bottomBar: 'linear-gradient(90deg, #071f14, #047857, #10b981, #6ee7b7, #a7f3d0, #6ee7b7, #10b981, #047857, #071f14)',
    logoGradient: 'linear-gradient(135deg, #065f46, #10b981)',
  },
  SECONDAIRE: {
    accent: '#d4a853',
    accentBright: '#ffd24d',
    bg: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)',
    topBar: 'linear-gradient(90deg, #b8860b, #d4a853, #f0d060, #d4a853, #b8860b)',
    bottomBar: 'linear-gradient(90deg, #0d3b2e, #b8943a, #c9a84c, #e0c060, #f0d878, #e0c060, #c9a84c, #b8943a, #0d3b2e)',
    logoGradient: 'linear-gradient(135deg, #b8860b, #d4a853)',
  },
};

export function getSectionTheme(section?: string | null): CardTheme {
  const s = (section || '').toUpperCase();
  if (s.includes('MATERNELLE')) return THEMES.MATERNELLE;
  if (s.includes('PRIMAIRE')) return THEMES.PRIMAIRE;
  return THEMES.SECONDAIRE; // Secondaire + fallback
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant carte — Premium Dark, couleur selon la section
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

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: t.bg, borderRadius: 12, color: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      {/* Subtle dot grid */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="510" height="324">
        <defs><pattern id="carte-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white"/></pattern></defs>
        <rect width="510" height="324" fill="url(#carte-dots)"/>
      </svg>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: t.topBar }} />

      {/* Bottom bar — large */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: t.bottomBar }} />

      {/* Decorative circles */}
      <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.08 }} width="200" height="200">
        <circle cx="100" cy="100" r="90" fill="none" stroke={t.accent} strokeWidth="2"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke={t.accent} strokeWidth="1"/>
      </svg>

      {/* Header */}
      <div style={{ position: 'absolute', top: 16, left: 24, right: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: 2 }}
            onError={() => setLogoError(true)} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: t.logoGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#0f0c29' }}>{getSchoolInitials(schoolName)}</div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, color: t.accent, textTransform: 'uppercase' }}>CARTE D'ÉLÈVE</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase', color: t.accentBright }}>{schoolName}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ border: `1.5px solid ${t.accent}`, borderRadius: 20, padding: '4px 16px', opacity: 0.8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: t.accent }}>OFFICIEL</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: t.accent, letterSpacing: 2, opacity: 0.6 }}>JIMPRO</span>
        </div>
      </div>

      {/* Hairline */}
      <div style={{ position: 'absolute', top: 74, left: 24, right: 24, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent}50, transparent)` }} />

      {/* Année scolaire */}
      <div style={{ position: 'absolute', top: 214, left: 32, width: 96, textAlign: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: t.accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>{annee}</span>
      </div>

      {/* Photo */}
      <div style={{ position: 'absolute', top: 90, left: 32, width: 96, height: 120, borderRadius: 16, overflow: 'hidden', border: `3px solid ${t.accent}`, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', background: 'rgba(255,255,255,0.05)' }}>
        {eleve.photo_url && !photoError ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: t.accent, opacity: 0.7 }}>{initials}</div>
        )}
      </div>

      {/* Name + program */}
      <div style={{ position: 'absolute', top: 78, left: 160, right: 116 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: t.accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.nom}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: t.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Postnom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.postnom}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: t.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.prenom}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Option</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: t.accent, marginTop: 1 }}>{eleve.option || '—'}</div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div><div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Matricule</div><div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, marginTop: 1 }}>{eleve.matricule}</div></div>
        </div>
      </div>

      {/* Bottom meta */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, right: CARTE_QR + 32, display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Date de naissance</div><div style={{ fontSize: 16, fontWeight: 500, marginTop: 1 }}>{formatDateNaissance(eleve.date_naissance)}</div></div>
      </div>

      {/* Classe + Sexe (au-dessus du QR) */}
      <div style={{ position: 'absolute', right: 12, bottom: CARTE_QR + 32, width: CARTE_QR, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Classe</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.accent, marginTop: 1 }}>{eleve.classe || '—'}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Sexe</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.accent, marginTop: 1 }}>{eleve.sexe}</div>
        </div>
      </div>

      {/* QR Code */}
      <div style={{ position: 'absolute', bottom: 20, right: 12, width: CARTE_QR, height: CARTE_QR, background: 'white', borderRadius: 8, padding: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
