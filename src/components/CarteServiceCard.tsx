import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — « Émeraude & Or » édition Grand Prestige
// Composition en couches très travaillée :
//  · entête ÉMERAUDE : nappe de points dorés, facettes de gemme avec arêtes
//    lumineuses, reflet « feuille d'or », couture OR diagonale + losanges
//  · corps : texture guilloché (hachures croisées), filigrane monogramme,
//    double cadre intérieur en filet or
//  · photo RONDE : triple anneau (or / blanc / émeraude), ombre interne,
//    badge losange or
//  · identité : label encadré de filets, nom + SEXE en pastille dorée,
//    filet or sous le nom, fonction cerclée d'or
//  · panneau de champs SAGE arrondi (matricule, e-mail, téléphone,
//    date de naissance + sexe, date d'embauche + nationalité)
//  · QR dans un cadre or
//  · bande ÉMERAUDE : liseré or, rangée de losanges, hachures dorées
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
export const CARTE_SERVICE_QR = 104; // ~17 mm

// ─── Palette « Émeraude & Or » ─────────────────────────────────────────────────
const EMERALD = '#0b3d2e';
const EMERALD_DEEP = '#06291e';
const EMERALD_LIGHT = '#155c45';
const GOLD = '#e3b94f';
const GOLD_LIGHT = '#f4dc94';
const GOLD_DARK = '#a97f1f';
const IVORY = '#fbfaf4';
const INK = '#24352b';
const MUTED = '#8b958c';
const SAGE = '#edf2e7';
const LINE = '#e3e8db';

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
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '2px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ width: 3, height: 19, borderRadius: 2, margin: '2px 8px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD_DARK})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 6.2, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: INK, marginTop: 1.5, lineHeight: 1.25, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

/** Petit losange doré. */
function Diamond({ size = 5, color = GOLD }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, transform: 'rotate(45deg)', background: color, flexShrink: 0 }} />;
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

  // ═══ Entête ÉMERAUDE — points, gemmes, reflet or, couture ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="136" viewBox="0 0 324 136">` +
    `<defs>` +
    `<linearGradient id="hbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD_DEEP}"/><stop offset="0.55" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_LIGHT}"/></linearGradient>` +
    `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `<linearGradient id="hg2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `<pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r="0.9" fill="${GOLD_LIGHT}" opacity="0.55"/></pattern>` +
    `</defs>` +
    // fond émeraude
    `<rect x="0" y="0" width="324" height="136" fill="url(#hbg)"/>` +
    // nappe de points dorés
    `<rect x="0" y="0" width="324" height="136" fill="url(#dots)" opacity="0.25"/>` +
    // facettes de gemme (haut droite)
    `<polygon points="206,0 324,0 324,112" fill="${EMERALD_LIGHT}" opacity="0.45"/>` +
    `<polygon points="206,0 272,0 250,66" fill="${EMERALD_DEEP}" opacity="0.5"/>` +
    `<polygon points="272,0 324,0 324,112 292,60" fill="url(#hg2)" opacity="0.8"/>` +
    // arêtes lumineuses des facettes (reflet de gemme)
    `<polygon points="206,0 272,0 250,66" fill="none" stroke="${GOLD_LIGHT}" stroke-opacity="0.35" stroke-width="1"/>` +
    `<polygon points="272,0 324,0 324,112 292,60" fill="none" stroke="${GOLD_LIGHT}" stroke-opacity="0.5" stroke-width="1"/>` +
    // éclat or (facette fine)
    `<polygon points="206,0 224,34" fill="url(#hg)" opacity="0.9"/>` +
    // reflet lumineux horizontal (effet feuille d'or / holographique)
    `<polygon points="0,24 324,10 324,46 0,60" fill="#ffffff" opacity="0.05"/>` +
    // couture OR diagonale en bas de l'entête
    `<polygon points="0,124 324,118 324,136 0,136" fill="url(#hg)"/>` +
    // filet or fin au-dessus de la couture
    `<polygon points="0,116 324,110 324,113 0,119" fill="url(#hg)" opacity="0.55"/>` +
    // losanges or le long de la couture
    `<polygon points="34,112 40,118 34,124 28,118" fill="${GOLD_LIGHT}" opacity="0.9"/>` +
    `<polygon points="70,108 76,114 70,120 64,114" fill="${GOLD_LIGHT}" opacity="0.9"/>` +
    `<polygon points="106,104 112,110 106,116 100,110" fill="${GOLD_LIGHT}" opacity="0.9"/>` +
    `<polygon points="142,100 148,106 142,112 136,106" fill="${GOLD_LIGHT}" opacity="0.9"/>` +
    `</svg>`
  )}`;

  // ═══ Texture guilloché du corps (hachures croisées très fines) ═══
  const textureSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="392" viewBox="0 0 324 392">` +
    `<g stroke="#24352b" stroke-width="1" opacity="0.04">` +
    `<path d="M-30 40 L30 -40"/><path d="M30 40 L90 -40"/><path d="M90 40 L150 -40"/><path d="M150 40 L210 -40"/>` +
    `<path d="M210 40 L270 -40"/><path d="M270 40 L330 -40"/>` +
    `<path d="M-30 120 L30 40"/><path d="M30 120 L90 40"/><path d="M90 120 L150 40"/><path d="M150 120 L210 40"/>` +
    `<path d="M210 120 L270 40"/><path d="M270 120 L330 40"/>` +
    `<path d="M-30 200 L30 120"/><path d="M30 200 L90 120"/><path d="M90 200 L150 120"/><path d="M150 200 L210 120"/>` +
    `<path d="M210 200 L270 120"/><path d="M270 200 L330 120"/>` +
    `<path d="M-30 280 L30 200"/><path d="M30 280 L90 200"/><path d="M90 280 L150 200"/><path d="M150 280 L210 200"/>` +
    `<path d="M210 280 L270 200"/><path d="M270 280 L330 200"/>` +
    `<path d="M-30 360 L30 280"/><path d="M30 360 L90 280"/><path d="M90 360 L150 280"/><path d="M150 360 L210 280"/>` +
    `<path d="M210 360 L270 280"/><path d="M270 360 L330 280"/>` +
    `</g></svg>`
  )}`;

  // ═══ Bande inférieure ÉMERAUDE — liseré, losanges, hachures ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="58" viewBox="0 0 324 58" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD_LIGHT}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    // liseré or supérieur
    `<rect x="0" y="0" width="324" height="3" fill="url(#fg)"/>` +
    // rangée de losanges or
    `<g fill="${GOLD_LIGHT}" opacity="0.9">` +
    `<polygon points="24,6 29,11 24,16 19,11"/>` +
    `<polygon points="58,6 63,11 58,16 53,11"/>` +
    `<polygon points="92,6 97,11 92,16 87,11"/>` +
    `<polygon points="126,6 131,11 126,16 121,11"/>` +
    `<polygon points="160,6 165,11 160,16 155,11"/>` +
    `<polygon points="194,6 199,11 194,16 189,11"/>` +
    `<polygon points="228,6 233,11 228,16 223,11"/>` +
    `<polygon points="262,6 267,11 262,16 257,11"/>` +
    `<polygon points="296,6 301,11 296,16 291,11"/>` +
    `</g>` +
    // corps émeraude
    `<rect x="0" y="16" width="324" height="42" fill="url(#fbg)"/>` +
    // hachures dorées discrètes
    `<g stroke="#f4dc94" stroke-width="1" opacity="0.10">` +
    `<path d="M-10 70 L40 16"/><path d="M40 70 L90 16"/><path d="M90 70 L140 16"/>` +
    `<path d="M140 70 L190 16"/><path d="M190 70 L240 16"/><path d="M240 70 L290 16"/><path d="M290 70 L340 16"/>` +
    `</g>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(6,41,30,0.28)' }}>
      {/* Texture guilloché du corps */}
      <img src={textureSvg} alt="" style={{ position: 'absolute', top: 130, left: 0, width: 324, height: 392 }} />

      {/* Filigrane — initiale de l'école */}
      <div style={{ position: 'absolute', top: 296, right: 6, fontSize: 168, fontWeight: 900, lineHeight: 1, color: INK, opacity: 0.05, letterSpacing: -12, userSelect: 'none', zIndex: 0 }}>{getSchoolInitials(schoolName).charAt(0)}</div>

      {/* Double cadre intérieur en filet or */}
      <div style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 10, border: '1px solid rgba(227,185,79,0.35)' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: 8, border: '1px solid rgba(227,185,79,0.14)' }} />

      {/* Entête */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 136 }} />

      {/* Logo école (cerclé or) */}
      <div style={{ position: 'absolute', top: 20, right: 24, width: 46, height: 46, borderRadius: '50%', background: '#ffffff', border: '2px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(6,41,30,0.35)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 800, color: EMERALD, letterSpacing: 0.5 }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre */}
      <div style={{ position: 'absolute', top: 26, left: 28, right: 84 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Diamond size={4} color={GOLD_LIGHT} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: '#ffffff', textTransform: 'uppercase', marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
          <div style={{ width: 26, height: 1, background: 'linear-gradient(90deg, transparent, #e3b94f)' }} />
          <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: 3.5, color: GOLD_LIGHT, margin: '0 8px', textTransform: 'uppercase' }}>Carte de service</span>
          <div style={{ width: 26, height: 1, background: 'linear-gradient(270deg, transparent, #e3b94f)' }} />
        </div>
      </div>

      {/* ═══ Photo — RONDE, triple anneau, ombre interne, badge ═══ */}
      <div style={{ position: 'absolute', top: 144, left: 106, width: 112, height: 112, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2.5, boxShadow: '0 0 0 5px rgba(255,255,255,0.95), 0 12px 28px rgba(6,41,30,0.30)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(140deg, ${EMERALD}, ${EMERALD_DEEP})`, padding: 2.5 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: SAGE, position: 'relative' }}>
              {personnel.photo_url && !photoError ? (
                <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${SAGE}, #dce9d2)` }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: EMERALD }}>{initials}</span>
                  <span style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: 2, color: EMERALD, marginTop: 3, textTransform: 'uppercase' }}>Photo</span>
                </div>
              )}
              {/* Ombre interne (profondeur) */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.25) 0%, transparent 42%, rgba(6,41,30,0.30) 100%)' }} />
            </div>
          </div>
        </div>
        {/* Badge losange or sous l'anneau */}
        <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: 1.5, borderRadius: 3 }}>
          <Diamond size={9} color={GOLD} />
        </div>
      </div>

      {/* ═══ Identité — label, nom + sexe pastille, filet or, fonction ═══ */}
      <div style={{ position: 'absolute', top: 260, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 1, background: 'linear-gradient(90deg, transparent, #d9c072)' }} />
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 4, color: GOLD_DARK, textTransform: 'uppercase', margin: '0 8px' }}>Identité</span>
          <div style={{ width: 34, height: 1, background: 'linear-gradient(270deg, transparent, #d9c072)' }} />
        </div>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: INK, letterSpacing: 0.3, lineHeight: 1.15, marginTop: 3, padding: '0 10px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 700, color: INK }}>{personnel.prenom}</span>
          {personnel.sexe ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 17, borderRadius: 9, border: '1.5px solid ' + GOLD, color: EMERALD, fontSize: 10.5, fontWeight: 800, marginLeft: 7, padding: '0 5px', verticalAlign: 'middle', background: '#fffdf5' }}>{personnel.sexe}</span>
          ) : null}
        </div>
        {/* Filet or sous le nom */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
          <div style={{ width: 96, height: 1.5, background: 'linear-gradient(90deg, transparent, #e3b94f, transparent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, padding: '0 10px' }}>
          <span style={{ width: 20, height: 1.5, background: 'linear-gradient(90deg, transparent, #e3b94f)', flexShrink: 0 }} />
          <Diamond size={5} color={GOLD} />
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2, color: EMERALD, textTransform: 'uppercase', margin: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</span>
          <Diamond size={5} color={GOLD} />
          <span style={{ width: 20, height: 1.5, background: 'linear-gradient(270deg, transparent, #e3b94f)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Séparateur or */}
      <div style={{ position: 'absolute', top: 316, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #d9c072)' }} />
        <Diamond size={5} color={GOLD} />
        <div style={{ width: 80, height: 1, background: 'linear-gradient(270deg, transparent, #d9c072)' }} />
      </div>

      {/* ═══ Panneau de champs SAGE ═══ */}
      <div style={{ position: 'absolute', top: 322, left: 22, right: 140, height: 136, borderRadius: 12, background: SAGE, border: '1px solid ' + LINE, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 0 rgba(227,185,79,0.25)' }}>
        <div style={{ padding: '5px 12px' }}>
          <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
          <Field label="E-mail" value={personnel.email || '—'} nowrap />
          <Field label="Téléphone" value={personnel.telephone || '—'} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="Date de naissance" value={formatDate(personnel.date_naissance)} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="Sexe" value={personnel.sexe || '—'} nowrap />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="Date d'embauche" value={formatDate(personnel.date_embauche)} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="Nationalité" value={personnel.nationalite || '—'} nowrap />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ QR Code — cadre or ═══ */}
      <div style={{ position: 'absolute', top: 340, right: 14, borderRadius: 12, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2.5, boxShadow: '0 8px 20px rgba(6,41,30,0.20)', zIndex: 4 }}>
        <div style={{ borderRadius: 9, background: '#ffffff', padding: 3 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande inférieure ÉMERAUDE — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 58 }} />
      <div style={{ position: 'absolute', bottom: 13, left: 20, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 13, left: 74, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
