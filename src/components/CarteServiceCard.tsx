import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — design « Or & Encre » (ivoire + marine + or)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CarteService {
  matricule: string | null;
  nom: string;
  postnom: string | null;
  prenom: string;
  sexe: string | null;
  fonction: string;
  date_naissance: string | null;
  nationalite: string | null;
  date_embauche: string | null;
  photo_url: string | null;
}

export const CARTE_SERVICE_W = 510;
export const CARTE_SERVICE_H = 324;
export const CARTE_SERVICE_QR = 138;

const IVORY = '#fcfbf8';
const INK = '#16233a';
const GOLD = '#c19a3d';
const GOLD_DARK = '#8f6f24';
const MUTED = '#64748b';
const HAIRLINE = '#e9e6df';

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

export function CarteServiceCard({ personnel, schoolName, logoUrl, qrDataUrl }: {
  personnel: CarteService;
  schoolName: string;
  logoUrl: string | null;
  qrDataUrl: string;
}) {
  const initials = (personnel.nom.charAt(0) + personnel.prenom.charAt(0)).toUpperCase();
  const annee = '2026-2027';
  const [logoError, setLogoError] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const nomComplet = `${personnel.nom} ${personnel.postnom ? personnel.postnom + ' ' : ''}${personnel.prenom}`.toUpperCase();

  const label = {
    fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' as const,
  };
  const labelGold = {
    fontSize: 9, fontWeight: 700, color: GOLD_DARK, letterSpacing: 1.5, textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif', background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(22,35,58,0.20)' }}>
      {/* Liserés or */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})` }} />

      {/* Bordure intérieure fine */}
      <div style={{ position: 'absolute', top: 12, left: 18, right: 18, bottom: 12, borderRadius: 10, border: `1px solid ${HAIRLINE}` }} />

      {/* Lettre watermark (F pour fonction) */}
      <div style={{ position: 'absolute', top: 84, right: 150, fontSize: 140, fontWeight: 900, lineHeight: 1, color: INK, opacity: 0.03, letterSpacing: -8, userSelect: 'none' }}>S</div>

      {/* ═══ Header ═══ */}
      {logoUrl && !logoError ? (
        <img src={logoUrl} alt="" style={{ position: 'absolute', top: 20, left: 28, width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${GOLD}` }}
          onError={() => setLogoError(true)} />
      ) : (
        <div style={{ position: 'absolute', top: 20, left: 28, width: 46, height: 46, borderRadius: '50%', background: INK, lineHeight: '46px', textAlign: 'center', fontWeight: 700, fontSize: 19, color: GOLD }}>{getSchoolInitials(schoolName)}</div>
      )}

      <div style={{ position: 'absolute', top: 20, left: 84, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: GOLD_DARK, textTransform: 'uppercase' }}>Carte de service</div>
      <div style={{ position: 'absolute', top: 36, left: 84, fontSize: 15, fontWeight: 700, letterSpacing: 1.2, color: INK, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{schoolName}</div>

      <div style={{ position: 'absolute', top: 20, right: 28, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: MUTED }}>{annee}</div>

      {/* Ligne or */}
      <div style={{ position: 'absolute', top: 76, left: 28, right: 28, height: 1, background: `linear-gradient(90deg, ${GOLD}55, ${HAIRLINE}, ${GOLD}55)` }} />

      {/* ═══ Photo ═══ */}
      <div style={{ position: 'absolute', top: 92, left: 28, width: 100, height: 128, borderRadius: 14, overflow: 'hidden', border: `2px solid ${GOLD}`, background: '#f4ecd8' }}>
        {personnel.photo_url && !photoError ? (
          <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setPhotoError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', lineHeight: '124px', textAlign: 'center', fontSize: 40, fontWeight: 700, color: GOLD_DARK, opacity: 0.55 }}>{initials}</div>
        )}
      </div>

      {/* ═══ Identité ═══ */}
      <div style={{ position: 'absolute', top: 90, left: 148, width: 200 }}>
        <div style={{ ...label }}>Nom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomComplet}</div>

        <div style={{ ...label, marginTop: 9 }}>Fonction</div>
        <div style={{ display: 'inline-block', marginTop: 3, padding: '3px 12px', borderRadius: 8, background: '#f4ecd8', border: `1px solid ${GOLD}66` }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: GOLD_DARK, textTransform: 'uppercase' }}>{personnel.fonction}</span>
        </div>

        <div style={{ ...label, marginTop: 12 }}>Matricule</div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: INK }}>{personnel.matricule || '—'}</div>
      </div>

      {/* ═══ Infos complémentaires ═══ */}
      <div style={{ position: 'absolute', top: 236, left: 148, display: 'flex', gap: 24 }}>
        <div>
          <div style={{ ...label }}>Sexe</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: INK }}>{personnel.sexe || '—'}</div>
        </div>
        <div>
          <div style={{ ...label }}>Né(e) le</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: INK }}>{formatDate(personnel.date_naissance)}</div>
        </div>
        <div>
          <div style={{ ...label }}>Nationalité</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: INK }}>{personnel.nationalite || '—'}</div>
        </div>
      </div>

      {/* ═══ Pied : embauche ═══ */}
      <div style={{ position: 'absolute', bottom: 22, left: 28 }}>
        <div style={{ ...labelGold }}>Embauche</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: INK }}>{formatDate(personnel.date_embauche)}</div>
      </div>

      {/* ═══ QR Code ═══ */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, background: '#ffffff', borderRadius: 12, padding: 8, border: `1px solid ${GOLD}66`, boxShadow: '0 6px 20px rgba(22,35,58,0.10)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, color: '#ffffff', fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '2px 10px', borderRadius: 8 }}>SCAN</div>
      </div>
    </div>
  );
}
