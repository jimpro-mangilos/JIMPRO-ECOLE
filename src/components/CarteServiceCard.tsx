import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — « Émeraude Royale » (entête à motifs courbes)
//  · entête ÉMERAUDE : éventails d'ARCS concentriques dorés dans les DEUX coins
//    (lignes sur les angles), couture OR en arc, monogramme ton sur ton
//  · corps épuré : photo RONDE à anneau or, identité + filet, champs aérés,
//    QR cadre or, bande ÉMERAUDE droite à losanges
// Les courbes sont réservées aux motifs de l'entête.
// Format vertical 54 × 86 mm.
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
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  siteWeb?: string | null;
}

export const CARTE_SERVICE_W = 324; // 54 mm × 6
export const CARTE_SERVICE_H = 516; // 86 mm × 6
export const CARTE_SERVICE_QR = 96; // ~16 mm

// ─── Palette ────────────────────────────────────────────────────────────────────
const EMERALD = '#0b3d2e';
const EMERALD_DEEP = '#06291e';
const EMERALD_LIGHT = '#1a5c44';
const GOLD = '#e3b94f';
const GOLD_LIGHT = '#f2dda0';
const GOLD_DARK = '#a97f1f';
const IVORY = '#fcfbf7';
const INK = '#24332a';
const MUTED = '#8b9187';
const LINE = '#e8e9e2';

const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/** Dérive l'adresse web de l'école à partir de son nom (ex. "www.cs-golden-academy.cd"). */
function slugifySchool(name: string): string {
  const base = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `www.${base || 'ecole'}.cd`;
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function Dot({ size = 4, color = GOLD }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function Diamond({ size = 4, color = GOLD }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, transform: 'rotate(45deg)', background: color, flexShrink: 0 }} />;
}

function Field({ label, value, nowrap }: { label: string; value: string; nowrap?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ width: 3, height: 20, borderRadius: 99, margin: '2px 8px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD_DARK})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 6.4, fontWeight: 600, letterSpacing: 1.7, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: INK, marginTop: 1.5, lineHeight: 1.3, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

export function CarteServiceCard({ personnel, schoolName, logoUrl, qrDataUrl }: {
  personnel: CarteService;
  schoolName: string;
  logoUrl: string | null;
  qrDataUrl: string;
}) {
  const initials = (personnel.nom.charAt(0) + personnel.prenom.charAt(0)).toUpperCase();
  const [logoError, setLogoError] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const siteWeb = personnel.siteWeb || slugifySchool(schoolName);
  const annee = '2026-2027';

  // ═══ Entête réduite : éventails d'arcs aux deux coins + couture arc ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="100" viewBox="0 0 324 100">` +
    `<defs>` +
    `<linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.55" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    // fond émeraude
    `<rect x="0" y="0" width="324" height="100" rx="14" fill="url(#hb)"/>` +
    // éventail d'arcs concentriques — coin haut GAUCHE
    `<g fill="none" stroke="url(#hg)" stroke-linecap="round">` +
    `<path d="M0,24 A24,24 0 0 1 24,0" stroke-width="2.2"/>` +
    `<path d="M0,37 A37,37 0 0 1 37,0" stroke-width="1.7" opacity="0.95"/>` +
    `<path d="M0,50 A50,50 0 0 1 50,0" stroke-width="1.4" opacity="0.8"/>` +
    `<path d="M0,63 A63,63 0 0 1 63,0" stroke-width="1.1" opacity="0.6"/>` +
    `</g>` +
    `<circle cx="6" cy="6" r="2" fill="url(#hg)"/>` +
    // éventail d'arcs — coin haut DROIT
    `<g fill="none" stroke="url(#hg)" stroke-linecap="round">` +
    `<path d="M324,24 A24,24 0 0 0 300,0" stroke-width="2.2"/>` +
    `<path d="M324,37 A37,37 0 0 0 287,0" stroke-width="1.7" opacity="0.95"/>` +
    `<path d="M324,50 A50,50 0 0 0 274,0" stroke-width="1.4" opacity="0.8"/>` +
    `</g>` +
    `<circle cx="318" cy="6" r="2" fill="url(#hg)"/>` +
    // filet courbe sous le nom
    `<path d="M96,62 C166,68 246,68 284,60" stroke="url(#hg)" stroke-width="1.1" fill="none" opacity="0.55" stroke-linecap="round"/>` +
    // couture OR en ARC (bas de l'entête)
    `<path d="M0,94 C80,85 244,85 324,94 L324,100 C244,91 80,91 0,100 Z" fill="url(#hg)"/>` +
    // points ronds le long de la couture
    `<circle cx="34" cy="92" r="1.7" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="92" cy="88" r="1.7" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="150" cy="86" r="1.7" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="208" cy="86" r="1.7" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="266" cy="89" r="1.7" fill="${GOLD_LIGHT}"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure droite : ÉMERAUDE + filet or + losanges ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="48" viewBox="0 0 324 48" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    `<rect x="0" y="5" width="324" height="43" fill="url(#fb)"/>` +
    `<rect x="0" y="0" width="324" height="5" fill="url(#fg)"/>` +
    `<g fill="${GOLD_LIGHT}" opacity="0.85">` +
    `<polygon points="32,11 37,16 32,21 27,16"/>` +
    `<polygon points="84,11 89,16 84,21 79,16"/>` +
    `<polygon points="136,11 141,16 136,21 131,16"/>` +
    `<polygon points="188,11 193,16 188,21 183,16"/>` +
    `<polygon points="240,11 245,16 240,21 235,16"/>` +
    `<polygon points="292,11 297,16 292,21 287,16"/>` +
    `</g>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(6,41,30,0.24)' }}>
      {/* Entête */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 100 }} />

      {/* Monogramme ton sur ton (coin haut droit) */}
      <div style={{ position: 'absolute', top: 2, right: 58, fontSize: 64, fontWeight: 800, lineHeight: 1, color: EMERALD_LIGHT, opacity: 0.22, letterSpacing: -8, userSelect: 'none' }}>{getSchoolInitials(schoolName).charAt(0)}</div>

      {/* Logo école (rond blanc, anneau or) */}
      <div style={{ position: 'absolute', top: 16, right: 26, width: 42, height: 42, borderRadius: '50%', background: '#ffffff', border: '1.5px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(6,41,30,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: EMERALD }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre (entre les éventails) */}
      <div style={{ position: 'absolute', top: 14, left: 88, right: 76 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dot size={3.5} color={GOLD_LIGHT} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.1, color: '#ffffff', textTransform: 'uppercase', marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 3.2, color: GOLD_LIGHT, marginTop: 4, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ Photo — RONDE, anneau or ═══ */}
      <div style={{ position: 'absolute', top: 112, left: 108, width: 108, height: 108, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.92), 0 10px 24px rgba(6,41,30,0.24)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#f1f4ec' }}>
            {personnel.photo_url && !photoError ? (
              <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: EMERALD }}>{initials}</span>
                <span style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: 2, color: '#5f7a6a', marginTop: 2, textTransform: 'uppercase' }}>Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Identité — nom + sexe, filet or, fonction ═══ */}
      <div style={{ position: 'absolute', top: 230, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 18.5, fontWeight: 700, color: INK, letterSpacing: 0.4, lineHeight: 1.15, padding: '0 14px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 600, color: INK }}>{personnel.prenom}</span>
          {personnel.sexe ? <span style={{ fontSize: 12, fontWeight: 700, color: EMERALD, marginLeft: 6 }}>· {personnel.sexe}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
          <div style={{ width: 84, height: 1.5, background: 'linear-gradient(90deg, transparent, #e3b94f, transparent)' }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2.5, color: '#5f7a6a', textTransform: 'uppercase', marginTop: 5, padding: '0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</div>
      </div>

      {/* Séparateur */}
      <div style={{ position: 'absolute', top: 282, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #d8b45a)' }} />
        <Diamond size={4} />
        <div style={{ width: 60, height: 1, background: 'linear-gradient(270deg, transparent, #d8b45a)' }} />
      </div>

      {/* ═══ Champs — aérés, dates + sexe en grille ═══ */}
      <div style={{ position: 'absolute', top: 294, left: 34, right: 142 }}>
        <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
        <Field label="E-mail" value={personnel.email || '—'} nowrap />
        <Field label="Téléphone" value={personnel.telephone || '—'} />
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date de naissance" value={formatDate(personnel.date_naissance)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Sexe" value={personnel.sexe || '—'} nowrap />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date d'embauche" value={formatDate(personnel.date_embauche)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Nationalité" value={personnel.nationalite || '—'} nowrap />
          </div>
        </div>
      </div>

      {/* ═══ QR Code — cadre or ═══ */}
      <div style={{ position: 'absolute', top: 310, right: 14, borderRadius: 10, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, zIndex: 4 }}>
        <div style={{ borderRadius: 8, background: '#ffffff', padding: 3 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande inférieure — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 48 }} />
      <div style={{ position: 'absolute', bottom: 14, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 14, left: 68, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
