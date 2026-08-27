import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — « Émeraude Courbe »
// Tout en courbes et en arcs :
//  · entête ÉMERAUDE : ruban OR ondule (courbes de Bézier), couture or en
//    arc, monogramme ton sur ton
//  · ornements d'ANGLES : accolades courbes dorées aux 4 coins du corps
//  · photo RONDE à anneau or + croissant or au sommet
//  · identité : nom + sexe, filet arc, fonction espacée
//  · séparateur en ARC, champs aérés à barres arrondies
//  · bande inférieure en ARC avec bord or courbe + points ronds
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

// ─── Palette « Émeraude Courbe » ───────────────────────────────────────────────
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

/** Point rond doré (motif courbe). */
function Dot({ size = 4, color = GOLD }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
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

  // ═══ Entête : ÉMERAUDE + ruban OR ondule + couture arc ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="132" viewBox="0 0 324 132">` +
    `<defs>` +
    `<linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.55" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    // fond émeraude
    `<rect x="0" y="0" width="324" height="132" rx="14" fill="url(#hb)"/>` +
    // ruban OR ondule — courbe épaisse dans la moitié basse de l'entête
    `<path d="M-14,84 C130,84 190,116 340,120" stroke="url(#hg)" stroke-width="42" fill="none"/>` +
    // reflet doux le long du ruban
    `<path d="M-14,78 C130,78 190,110 340,114" stroke="#ffffff" stroke-width="9" fill="none" opacity="0.08"/>` +
    // couture OR en ARC (bas de l'entête)
    `<path d="M0,126 C80,114 244,114 324,126 L324,132 C244,120 80,120 0,132 Z" fill="url(#hg)"/>` +
    // points ronds le long de la couture
    `<circle cx="30" cy="125" r="2" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="78" cy="120" r="2" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="126" cy="117" r="2" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="174" cy="117" r="2" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="222" cy="120" r="2" fill="${GOLD_LIGHT}"/>` +
    `<circle cx="270" cy="124" r="2" fill="${GOLD_LIGHT}"/>` +
    `</svg>`
  )}`;

  // ═══ Ornement d'angle — accolades courbes dorées ═══
  const cornerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<g stroke="${GOLD}" stroke-width="1.8" fill="none" stroke-linecap="round">` +
    `<path d="M22,60 C22,38 38,22 60,22"/>` +
    `<path d="M29,52 C29,40 40,29 52,29" opacity="0.55"/>` +
    `</g>` +
    `<circle cx="60" cy="22" r="2.2" fill="${GOLD}"/>` +
    `<circle cx="22" cy="60" r="1.8" fill="${GOLD}" opacity="0.7"/>` +
    `</svg>`
  )}`;

  // ═══ Séparateur en ARC ═══
  const archSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="14" viewBox="0 0 150 14">` +
    `<path d="M10,12 C45,0 105,0 140,12" stroke="${GOLD}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="75" cy="6" r="2.6" fill="${GOLD}"/>` +
    `<circle cx="75" cy="6" r="6" fill="none" stroke="${GOLD_LIGHT}" stroke-width="0.8" opacity="0.7"/>` +
    `</svg>`
  )}`;

  // ═══ Croissant or au sommet de la photo ═══
  const crescentSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="12" viewBox="0 0 26 12">` +
    `<path d="M3,10 C8,1 18,1 23,10" stroke="${GOLD}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="13" cy="4.5" r="1.6" fill="${GOLD}"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure en ARC + points ronds ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="52" viewBox="0 0 324 52" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    // bande en ARC (bord supérieur convexe)
    `<path d="M0,18 C80,0 244,0 324,18 L324,52 L0,52 Z" fill="url(#fb)"/>` +
    // bord or suivant la courbe
    `<path d="M0,18 C80,0 244,0 324,18" stroke="url(#fg)" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    // points ronds or
    `<g fill="${GOLD_LIGHT}" opacity="0.9">` +
    `<circle cx="40" cy="26" r="2.2"/>` +
    `<circle cx="95" cy="24" r="2.2"/>` +
    `<circle cx="150" cy="23" r="2.2"/>` +
    `<circle cx="205" cy="24" r="2.2"/>` +
    `<circle cx="260" cy="26" r="2.2"/>` +
    `</g>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(6,41,30,0.24)' }}>
      {/* Entête */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 132 }} />

      {/* Monogramme ton sur ton (coin haut droit) */}
      <div style={{ position: 'absolute', top: 0, right: 74, fontSize: 96, fontWeight: 800, lineHeight: 1, color: EMERALD_LIGHT, opacity: 0.20, letterSpacing: -8, userSelect: 'none' }}>{getSchoolInitials(schoolName).charAt(0)}</div>

      {/* Logo école (rond blanc, anneau or) */}
      <div style={{ position: 'absolute', top: 26, right: 26, width: 46, height: 46, borderRadius: '50%', background: '#ffffff', border: '1.5px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(6,41,30,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: EMERALD }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre (sous le ruban) */}
      <div style={{ position: 'absolute', top: 30, left: 30, right: 88 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dot size={3.5} color={GOLD_LIGHT} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: '#ffffff', textTransform: 'uppercase', marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
          <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, #e3b94f)' }} />
          <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: 3.5, color: GOLD_LIGHT, margin: '0 8px', textTransform: 'uppercase' }}>Carte de service</span>
          <div style={{ width: 24, height: 1, background: 'linear-gradient(270deg, transparent, #e3b94f)' }} />
        </div>
      </div>

      {/* Ornements d'angles (accolades courbes) */}
      <img src={cornerSvg} alt="" style={{ position: 'absolute', top: 136, left: 14 }} />
      <img src={cornerSvg} alt="" style={{ position: 'absolute', top: 136, right: 14, transform: 'scaleX(-1)' }} />
      <img src={cornerSvg} alt="" style={{ position: 'absolute', bottom: 10, left: 14, transform: 'scaleY(-1)' }} />
      <img src={cornerSvg} alt="" style={{ position: 'absolute', bottom: 10, right: 14, transform: 'scale(-1,-1)' }} />

      {/* ═══ Photo — RONDE, anneau or + croissant ═══ */}
      <div style={{ position: 'absolute', top: 146, left: 108, width: 108, height: 108, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.92), 0 10px 24px rgba(6,41,30,0.24)' }}>
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
        {/* Croissant or au sommet */}
        <img src={crescentSvg} alt="" style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)' }} />
      </div>

      {/* ═══ Identité — nom + sexe, fonction ═══ */}
      <div style={{ position: 'absolute', top: 264, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 18.5, fontWeight: 700, color: INK, letterSpacing: 0.4, lineHeight: 1.15, padding: '0 14px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 600, color: INK }}>{personnel.prenom}</span>
          {personnel.sexe ? <span style={{ fontSize: 12, fontWeight: 700, color: EMERALD, marginLeft: 6 }}>· {personnel.sexe}</span> : null}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2.5, color: '#5f7a6a', textTransform: 'uppercase', marginTop: 6, padding: '0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</div>
      </div>

      {/* Séparateur en ARC */}
      <div style={{ position: 'absolute', top: 306, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <img src={archSvg} alt="" style={{ width: 150, height: 14 }} />
      </div>

      {/* ═══ Champs — aérés, barres arrondies, dates + sexe en grille ═══ */}
      <div style={{ position: 'absolute', top: 328, left: 34, right: 142 }}>
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

      {/* ═══ QR Code — cadre or arrondi ═══ */}
      <div style={{ position: 'absolute', top: 344, right: 14, borderRadius: 12, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, zIndex: 4 }}>
        <div style={{ borderRadius: 10, background: '#ffffff', padding: 3 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande inférieure en ARC — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 52 }} />
      <div style={{ position: 'absolute', bottom: 14, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 14, left: 68, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
