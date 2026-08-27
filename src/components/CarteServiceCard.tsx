import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — template « IdCard Pink & Navy »
// Design moderne inspiré du modèle de référence (mockup 500×500) :
//  · fond clair, ruban ROSE diagonal en haut à gauche
//  · bandeau MARINE supérieur (nom de l'école + logo)
//  · photo rectangulaire à cadre MARINE sur fond bleu doux
//  · identité : nom marine + sexe rose, fonction rose
//  · champs : matricule, e-mail, téléphone, date d'embauche
//  · QR code à droite, bande MARINE inférieure (site web + année)
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
export const CARTE_SERVICE_QR = 112; // ~19 mm × 19 mm

// ─── Palette « Pink & Navy » ───────────────────────────────────────────────────
const NAVY_DEEP = '#0d1f38';
const NAVY = '#16324a';
const NAVY_SOFT = '#2c4a6e';
const PINK = '#f55989';
const PINK_DARK = '#d43269';
const BLUE_SOFT = '#e8f0fc';
const BG = '#f7f8fc';
const INK = '#1c2b42';
const MUTED = '#7c8698';
const LINE = '#e6eaf3';

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

function Field({ label, value, nowrap }: { label: string; value: string; nowrap?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ width: 3, height: 24, borderRadius: 2, margin: '2px 9px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${PINK}, ${PINK_DARK})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.6, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: INK, marginTop: 2, lineHeight: 1.25, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

/** Petite pastille rose (séparateur). */
function Dot({ size = 5 }: { size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: PINK, flexShrink: 0 }} />;
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

  // ═══ Bandeau supérieur MARINE (arrondi en haut) ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="118" viewBox="0 0 324 118">` +
    `<defs>` +
    `<linearGradient id="nh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY_DEEP}"/><stop offset="1" stop-color="${NAVY}"/></linearGradient>` +
    `<linearGradient id="pk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PINK}"/><stop offset="1" stop-color="${PINK_DARK}"/></linearGradient>` +
    `</defs>` +
    `<rect x="0" y="0" width="324" height="118" rx="14" fill="url(#nh)"/>` +
    // ruban rose diagonal (coin haut gauche)
    `<polygon points="0,0 118,0 178,58 60,58" fill="url(#pk)" opacity="0.95"/>` +
    `<polygon points="0,0 118,0 118,10 0,24" fill="url(#pk)" opacity="0.75"/>` +
    // accent rose fin sur le bord droit du bandeau
    `<polygon points="314,0 324,0 324,118 300,118" fill="url(#pk)" opacity="0.85"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure MARINE (arrondie en bas) ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="52" viewBox="0 0 324 52" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/></linearGradient>` +
    `<linearGradient id="fp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${PINK}"/><stop offset="1" stop-color="${PINK_DARK}"/></linearGradient>` +
    `</defs>` +
    // fine couche rose supérieure
    `<rect x="0" y="0" width="324" height="4" fill="url(#fp)"/>` +
    `<rect x="0" y="4" width="324" height="48" fill="url(#fh)"/>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: BG, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(13,31,56,0.22)' }}>
      {/* Bandeau supérieur */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 118 }} />

      {/* Logo école (cerclé blanc) */}
      <div style={{ position: 'absolute', top: 30, right: 28, width: 46, height: 46, borderRadius: '50%', background: '#ffffff', border: '2px solid ' + PINK, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,31,56,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: 0.5 }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre (à droite du ruban) */}
      <div style={{ position: 'absolute', top: 36, left: 30, right: 88 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dot size={4} />
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.2, color: '#ffffff', textTransform: 'uppercase', marginLeft: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 3.5, color: PINK, marginTop: 6, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ Photo — rectangulaire à cadre marine sur fond bleu doux ═══ */}
      <div style={{ position: 'absolute', top: 142, left: 106, width: 112, height: 126, borderRadius: 12, background: `linear-gradient(150deg, ${NAVY}, ${NAVY_SOFT})`, padding: 3, boxShadow: '0 10px 24px rgba(13,31,56,0.25)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 9, background: BLUE_SOFT, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {personnel.photo_url && !photoError ? (
            <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${BLUE_SOFT}, #dbe8fb)` }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: NAVY }}>{initials}</span>
              <span style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: 2, color: NAVY_SOFT, marginTop: 4, textTransform: 'uppercase' }}>Photo</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Identité — NOM + prénom + sexe, fonction ═══ */}
      <div style={{ position: 'absolute', top: 278, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: NAVY, letterSpacing: 0.3, lineHeight: 1.15, padding: '0 10px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 700, color: NAVY }}>{personnel.prenom}</span>
          {personnel.sexe ? <span style={{ fontSize: 13, fontWeight: 800, color: PINK, marginLeft: 7 }}>· {personnel.sexe}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 6, padding: '0 10px' }}>
          <span style={{ width: 24, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #f55989)', flexShrink: 0 }} />
          <Dot size={5} />
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 2, color: PINK_DARK, textTransform: 'uppercase', margin: '0 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</span>
          <Dot size={5} />
          <span style={{ width: 24, height: 2, borderRadius: 2, background: 'linear-gradient(270deg, transparent, #f55989)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Séparateur discret */}
      <div style={{ position: 'absolute', top: 336, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 86, height: 1, background: 'linear-gradient(90deg, transparent, #c8d2e4)' }} />
        <Dot size={5} />
        <div style={{ width: 86, height: 1, background: 'linear-gradient(270deg, transparent, #c8d2e4)' }} />
      </div>

      {/* ═══ Champs d'information (matricule, e-mail, téléphone, date d'embauche) ═══ */}
      <div style={{ position: 'absolute', top: 352, left: 40, right: 142 }}>
        <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
        <Field label="E-mail" value={personnel.email || '—'} nowrap />
        <Field label="Téléphone" value={personnel.telephone || '—'} />
        <Field label="Date d'embauche" value={formatDate(personnel.date_embauche)} />
      </div>

      {/* ═══ QR Code — cadre marine arrondi ═══ */}
      <div style={{ position: 'absolute', top: 372, right: 12, borderRadius: 12, background: `linear-gradient(140deg, ${NAVY}, ${NAVY_SOFT})`, padding: 3, boxShadow: '0 8px 20px rgba(13,31,56,0.18)', zIndex: 4 }}>
        <div style={{ borderRadius: 9, background: '#ffffff', padding: 4 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande MARINE inférieure — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 52 }} />
      <div style={{ position: 'absolute', bottom: 12, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.80)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 12, left: 70, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
