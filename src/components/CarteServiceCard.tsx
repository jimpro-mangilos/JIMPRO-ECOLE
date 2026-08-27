import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — « Émeraude » (édition moderne & épurée)
// Élégance par la retenue :
//  · entête ÉMERAUDE pleine, un seul filet or fin
//  · photo RONDE à fin anneau or, remontée
//  · typographie nette : nom + sexe, fonction espacée
//  · champs aérés, séparateurs filaires, dates + sexe en grille
//  · QR au cadre or fin
//  · bande ÉMERAUDE inférieure, filet or
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

// ─── Palette « Émeraude » ───────────────────────────────────────────────────────
const EMERALD = '#0d3b2c';
const EMERALD_DEEP = '#07281d';
const GOLD = '#d8b45a';       // or champagne
const GOLD_LIGHT = '#ecd9a0';
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

/** Petit losange or (le seul motif décoratif de la carte). */
function Dot({ size = 4, color = GOLD }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, transform: 'rotate(45deg)', background: color, flexShrink: 0 }} />;
}

function Field({ label, value, nowrap }: { label: string; value: string; nowrap?: boolean }) {
  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: 1.8, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: INK, marginTop: 1.5, lineHeight: 1.3, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
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

  // ═══ Entête : ÉMERAUDE pleine + filet or fin ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="112" viewBox="0 0 324 112">` +
    `<defs>` +
    `<linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    `<rect x="0" y="0" width="324" height="112" rx="14" fill="url(#hb)"/>` +
    // filet or fin
    `<rect x="0" y="107" width="324" height="5" fill="url(#hg)"/>` +
    // coin or discret (haut droite)
    `<polygon points="300,0 324,0 324,24" fill="url(#hg)" opacity="0.85"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure : ÉMERAUDE + filet or fin ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="46" viewBox="0 0 324 46" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    `<rect x="0" y="5" width="324" height="41" fill="url(#fb)"/>` +
    `<rect x="0" y="0" width="324" height="5" fill="url(#fg)"/>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(7,40,29,0.22)' }}>
      {/* Entête */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 112 }} />

      {/* Logo école (rond blanc, fin anneau or) */}
      <div style={{ position: 'absolute', top: 24, right: 26, width: 46, height: 46, borderRadius: '50%', background: '#ffffff', border: '1.5px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: EMERALD }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre */}
      <div style={{ position: 'absolute', top: 30, left: 30, right: 88 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dot size={3.5} color={GOLD_LIGHT} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.6, color: '#ffffff', textTransform: 'uppercase', marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: 4, color: GOLD_LIGHT, marginTop: 6, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ Photo — RONDE, fin anneau or ═══ */}
      <div style={{ position: 'absolute', top: 126, left: 110, width: 104, height: 104, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD})`, padding: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.9), 0 10px 24px rgba(7,40,29,0.22)' }}>
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

      {/* ═══ Identité — nom + sexe, fonction ═══ */}
      <div style={{ position: 'absolute', top: 242, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: 0.4, lineHeight: 1.15, padding: '0 14px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 600, color: INK }}>{personnel.prenom}</span>
          {personnel.sexe ? <span style={{ fontSize: 12, fontWeight: 700, color: EMERALD, marginLeft: 6 }}>· {personnel.sexe}</span> : null}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2.5, color: '#5f7a6a', textTransform: 'uppercase', marginTop: 7, padding: '0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</div>
      </div>

      {/* Séparateur : filet or + losange (seul motif) */}
      <div style={{ position: 'absolute', top: 292, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 1, background: 'linear-gradient(90deg, transparent, #d8b45a)' }} />
        <Dot size={4} />
        <div style={{ width: 64, height: 1, background: 'linear-gradient(270deg, transparent, #d8b45a)' }} />
      </div>

      {/* ═══ Champs — grille aérée, séparateurs filaires ═══ */}
      <div style={{ position: 'absolute', top: 306, left: 34, right: 142 }}>
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

      {/* ═══ QR Code — cadre or fin ═══ */}
      <div style={{ position: 'absolute', top: 322, right: 14, borderRadius: 10, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD})`, padding: 2, zIndex: 4 }}>
        <div style={{ borderRadius: 8, background: '#ffffff', padding: 3 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande inférieure — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 46 }} />
      <div style={{ position: 'absolute', bottom: 13, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.80)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 13, left: 68, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
