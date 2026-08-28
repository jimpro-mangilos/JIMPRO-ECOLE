import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — template « Prestige »
// Carte d'identité professionnelle VERTICALE haut de gamme :
//  · composition diagonale : vert profond (trapèzes/triangles dégradés) + bande
//    DORÉE diagonale parallèle + facettes de relief
//  · photo à DOUBLE anneau doré dégradé, à cheval sur la diagonale
//  · typographie affinée (Segoe UI), losanges dorés en séparateurs,
//    cadre intérieur double filet, filigrane subtil
//  · champs à barres dorées dégradées, QR cerclé d'un dégradé or
//  · bande verte dégradée en bas au bord zigzag. Format 54 × 86 mm.
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
export const CARTE_SERVICE_QR = 140; // ~23 mm × 23 mm

// ─── Palette « Prestige » : vert profond + or ─────────────────────────────────
const GREEN_DEEP = '#0a3529';
const GREEN = '#0f4c3a';
const GREEN_LIGHT = '#125640';
const GOLD = '#c9a227';
const GOLD_LIGHT = '#e8c96a';
const GOLD_DARK = '#a8821f';
const NAVY = '#16324a';

const MUTED = '#98a1b0';
const IVORY = '#fbfaf7';
const PHOTO_BG = '#f6efe0';
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



function Field({ label, value, nowrap, narrow }: { label: string; value: string; nowrap?: boolean; narrow?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f0ece3', width: narrow ? 148 : '100%' }}>
      <div style={{ width: 3, height: 26, borderRadius: 2, margin: '2px 10px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${GOLD}, ${GOLD_LIGHT})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: 2, lineHeight: 1.25, overflowWrap: 'break-word', wordBreak: 'break-word', ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

/** Petit losange doré (séparateur). */
function Diamond({ size = 5, color = GOLD }: { size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, transform: 'rotate(45deg)', background: color, flexShrink: 0 }} />
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

  // ═══ Composition diagonale : trapèzes & triangles dégradés ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="175" viewBox="0 0 324 175">` +
    `<defs>` +
    `<linearGradient id="gv1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN_DEEP}"/><stop offset="0.55" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_LIGHT}"/></linearGradient>` +
    `<linearGradient id="gv2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${GREEN_DEEP}"/><stop offset="1" stop-color="${GREEN}"/></linearGradient>` +
    `<linearGradient id="gv3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DEEP}"/></linearGradient>` +
    `<linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `<linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6a25c"/><stop offset="1" stop-color="#e8933a"/></linearGradient>` +
    `</defs>` +
    // trapèze vert dominant — frontière oblique (0,60)→(324,150)
    `<polygon points="0,0 324,0 324,150 0,60" fill="url(#gv1)"/>` +
    // liseré doré fin le long de la diagonale (même style que le bas)
    `<polygon points="0,58 324,148 324,152 0,62" fill="url(#go)"/>` +
    // prolongement vert bas-gauche (triangle clair)
    `<polygon points="0,60 150,60 0,150" fill="url(#gv2)" opacity="0.9"/>` +
    // facette sombre haut-droite (relief)
    `<polygon points="216,0 324,0 324,96" fill="url(#gv3)" opacity="0.85"/>` +
    // bande dorée diagonale parallèle à la frontière
    `<polygon points="0,74 324,164 324,176 0,86" fill="url(#go)" opacity="0.95"/>` +
    // trapèze doré (haut gauche, derrière le logo)
    `<polygon points="0,0 128,0 140,22 0,28" fill="url(#go)"/>` +
    // éclat doré
    `<polygon points="196,0 224,0 210,32" fill="url(#go)" opacity="0.9"/>` +
    // triangle orange (accent réduit)
    `<polygon points="270,60 324,60 324,96" fill="url(#g3)"/>` +
    // contour triangulaire discret
    `<polygon points="278,4 322,4 300,46" fill="none" stroke="${GOLD_LIGHT}" stroke-opacity="0.3" stroke-width="1.5"/>` +
    // éclats dorés sur la facette sombre (haut droite)
    `<polygon points="236,52 240,56 236,60 232,56" fill="url(#go)" opacity="0.8"/>` +
    `<polygon points="262,68 266,72 262,76 258,72" fill="url(#go)" opacity="0.65"/>` +
    `<polygon points="288,40 292,44 288,48 284,44" fill="url(#go)" opacity="0.75"/>` +
    `<polygon points="306,58 310,62 306,66 302,62" fill="url(#go)" opacity="0.6"/>` +
    // petit losange or au-dessus du nom de l'école
    `<polygon points="150,10 154,14 150,18 146,14" fill="url(#go)" opacity="0.85"/>` +
    `</svg>`
  )}`;

  // Hachures très discrètes par-dessus le vert
  const patternSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="175" viewBox="0 0 324 175">` +
    `<g stroke="#ffffff" stroke-width="1" opacity="0.05">` +
    `<path d="M-30 190 L40 0"/><path d="M30 190 L100 0"/><path d="M90 190 L160 0"/>` +
    `<path d="M150 190 L220 0"/><path d="M210 190 L280 0"/><path d="M270 190 L340 0"/>` +
    `</g></svg>`
  )}`;

  // ═══ Bande du bas : 51 px (+70 %) — fine couche dorée supérieure + vert dégradé ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="51" viewBox="0 0 324 51" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="gz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN_LIGHT}"/><stop offset="1" stop-color="${GREEN_DEEP}"/></linearGradient>` +
    `<linearGradient id="gof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    // bande verte avec 3 sommets TRIANGULAIRES (le centre, vert, est le plus grand)
    `<polygon points="0,51 324,51 324,24 257,8 190,24 126,2 62,24 31,8 0,24" fill="url(#gz)"/>` +
    // TRIANGLE doré à gauche
    `<polygon points="0,24 31,8 62,24" fill="url(#gof)"/>` +
    // TRIANGLE doré à droite (le sommet central reste vert)
    `<polygon points="190,24 257,8 324,24" fill="url(#gof)"/>` +
    // MOTIFS D'ANGLE : plis dorés aux coins inférieurs
    `<polygon points="0,51 30,51 0,21" fill="url(#gof)"/>` +
    `<polygon points="0,51 18,51 0,33" fill="#f7d774" opacity="0.85"/>` +
    `<polygon points="324,51 294,51 324,21" fill="url(#gof)"/>` +
    `<polygon points="324,51 306,51 324,33" fill="#f7d774" opacity="0.85"/>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: NAVY, boxShadow: '0 24px 64px rgba(11,61,46,0.22)' }}>
      {/* Cadre intérieur double filet doré */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: 10, border: '1px solid rgba(201,162,39,0.30)' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, borderRadius: 8, border: '1px solid rgba(201,162,39,0.14)' }} />

      {/* ═══ Composition diagonale ═══ */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 175 }} />
      <img src={patternSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 175 }} />

      {/* ═══ Logo école ═══ */}
      <div style={{ position: 'absolute', top: 24, left: 28, width: 46, height: 46, borderRadius: '50%', background: '#ffffff', border: `2px solid ${GOLD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(10,53,41,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 15, fontWeight: 800, color: GREEN, letterSpacing: 0.5 }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre — pleine largeur (l'année est en bas) */}
      <div style={{ position: 'absolute', top: 31, left: 86, right: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Diamond size={4} color={GOLD_LIGHT} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: '#ffffff', textTransform: 'uppercase', marginLeft: 7, whiteSpace: 'nowrap' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: GOLD_LIGHT, marginTop: 5, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ Photo — double anneau doré dégradé, à cheval sur la diagonale ═══ */}
      <div style={{ position: 'absolute', top: 89, left: 100, width: 124, height: 124, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.92), 0 12px 28px rgba(11,61,46,0.30)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', padding: 4 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 3 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: PHOTO_BG }}>
              {personnel.photo_url && !photoError ? (
                <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: GOLD_DARK }}>{initials}</div>
              )}
            </div>
          </div>
        </div>
        {/* Couronne dorée au sommet de l'anneau */}
        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 2px 3px rgba(11,61,46,0.25))' }}>
          <Diamond size={5} color={GOLD} />
          <Diamond size={8} color={GOLD_LIGHT} />
          <Diamond size={5} color={GOLD} />
        </div>
      </div>

      {/* ═══ Identité — NOM + prénom + sexe, fonction ═══ */}
      <div style={{ position: 'absolute', top: 214, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 23, fontWeight: 800, color: NAVY, letterSpacing: 0.4, lineHeight: 1.15, padding: '0 10px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 800, color: NAVY }}>{personnel.prenom}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, padding: '0 12px' }}>
          <Diamond size={5} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1.2, color: GOLD_DARK, textTransform: 'uppercase', margin: '0 12px', lineHeight: 1.3, textAlign: 'center' }}>{personnel.fonction}</span>
          <Diamond size={5} />
        </div>
      </div>

      {/* Filigrane subtil (initiale école) */}
      <div style={{ position: 'absolute', top: 415, left: 14, fontSize: 92, fontWeight: 900, lineHeight: 1, color: NAVY, opacity: 0.02, letterSpacing: -6, userSelect: 'none' }}>{getSchoolInitials(schoolName).charAt(0)}</div>

      {/* ═══ Champs d'information — E-mail pleine largeur (une seule ligne) ═══ */}
      <div style={{ position: 'absolute', top: 268, left: 30, right: 164 }}>
        <div style={{ marginBottom: 12 }}>
          <Field label="Matricule" value={personnel.matricule || '—'} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Téléphone" value={personnel.telephone || '—'} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Année scolaire" value={annee} />
        </div>
      </div>

      {/* ═══ QR Code — 20 × 20 mm, bordure dégradée or ═══ */}
      <div style={{ position: 'absolute', top: 294, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4 }}>
        {/* Mention JIMPRO SCAN HORS du QR (au-dessus, ne masque rien) */}
        <div style={{ marginBottom: 3, fontSize: 11, fontWeight: 800, letterSpacing: 2, color: '#0b3d2e', textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.9)', padding: '1px 9px', borderRadius: 4 }}>JIMPRO SCAN</div>
        <div style={{ borderRadius: 14, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 8px 20px rgba(11,61,46,0.16)' }}>
          <div style={{ borderRadius: 12, background: '#ffffff', padding: 4 }}>
            <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
          </div>
        </div>
      </div>

      {/* ═══ Bande verte dégradée du bas (zigzag) — adresse web ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 51 }} />
      <div style={{ position: 'absolute', bottom: 11, left: 40, right: 40, textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#ffffff', textTransform: 'lowercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{siteWeb}</div>
    </div>
  );
}