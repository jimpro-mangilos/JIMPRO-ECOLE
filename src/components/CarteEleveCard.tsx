import { useState } from 'react';
import QRCode from 'qrcode';

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
const GOLD = '#d4a853';

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
// Composant carte — Élégant Premium Dark
// ═══════════════════════════════════════════════════════════════════════════════

export function CarteEleveCard({ eleve, schoolName, logoUrl, qrDataUrl }: {
  eleve: CarteEleve;
  schoolName: string;
  logoUrl: string | null;
  qrDataUrl: string;
}) {
  const initials = (eleve.nom.charAt(0) + eleve.prenom.charAt(0)).toUpperCase();
  const annee = '2026-2027';
  const [logoError, setLogoError] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  return (
    <div style={{ width: CARTE_W, height: CARTE_H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)', borderRadius: 12, color: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      {/* Subtle dot grid */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="510" height="324">
        <defs><pattern id="carte-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white"/></pattern></defs>
        <rect width="510" height="324" fill="url(#carte-dots)"/>
      </svg>

      {/* Gold top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #b8860b, #d4a853, #f0d060, #d4a853, #b8860b)' }} />

      {/* Gold bottom bar — large */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #0d3b2e, #b8943a, #c9a84c, #e0c060, #f0d878, #e0c060, #c9a84c, #b8943a, #0d3b2e)' }} />

      {/* Decorative circles */}
      <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.08 }} width="200" height="200">
        <circle cx="100" cy="100" r="90" fill="none" stroke={GOLD} strokeWidth="2"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke={GOLD} strokeWidth="1"/>
      </svg>

      {/* Header */}
      <div style={{ position: 'absolute', top: 16, left: 24, right: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: 2 }}
            onError={() => setLogoError(true)} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg, #b8860b, #d4a853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#0f0c29' }}>GA</div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase' }}>CARTE D'ÉLÈVE</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase', color: '#ffd24d' }}>{schoolName}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ border: `1.5px solid ${GOLD}`, borderRadius: 20, padding: '4px 16px', opacity: 0.8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: GOLD }}>OFFICIEL</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: 2, opacity: 0.6 }}>JIMPRO</span>
        </div>
      </div>

      {/* Gold hairline */}
      <div style={{ position: 'absolute', top: 74, left: 24, right: 24, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }} />

      {/* Année scolaire */}
      <div style={{ position: 'absolute', top: 214, left: 32, width: 96, textAlign: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' }}>{annee}</span>
      </div>

      {/* Photo */}
      <div style={{ position: 'absolute', top: 90, left: 32, width: 96, height: 120, borderRadius: 16, overflow: 'hidden', border: `3px solid ${GOLD}`, boxShadow: '0 4px 20px rgba(180,140,0,0.25)', background: 'rgba(255,255,255,0.05)' }}>
        {eleve.photo_url && !photoError ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: GOLD, opacity: 0.7 }}>{initials}</div>
        )}
      </div>

      {/* Name + program */}
      <div style={{ position: 'absolute', top: 78, left: 160, right: 116 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.nom}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Postnom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.postnom}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5 }}>{eleve.prenom}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Classe</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.classe || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Sexe</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.sexe}</div>
            </div>
          </div>
          <div style={{ marginTop: 5 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Option</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.option || '—'}</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div><div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Matricule</div><div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, marginTop: 1 }}>{eleve.matricule}</div></div>
        </div>
      </div>

      {/* Bottom meta */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, right: CARTE_QR + 32, display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Date de naissance</div><div style={{ fontSize: 16, fontWeight: 500, marginTop: 1 }}>{formatDateNaissance(eleve.date_naissance)}</div></div>
      </div>

      {/* QR Code */}
      <div style={{ position: 'absolute', bottom: 20, right: 12, width: CARTE_QR, height: CARTE_QR, background: 'white', borderRadius: 8, padding: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
