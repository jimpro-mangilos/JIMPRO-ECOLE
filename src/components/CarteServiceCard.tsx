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
export const CARTE_SERVICE_QR = 128; // ~21 mm × 21 mm

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
        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: 2, lineHeight: 1.25, overflowWrap: 'break-word', wordBreak: 'break-word', ...(nowrap ? { whiteSpace: 'nowrap' as const } : {}) }}>{value}</div>
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
    `<linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.55" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
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
    `<linearGradient id="gz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN_LIGHT}"/><stop offset="0.5" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DEEP}"/></linearGradient>` +
    `<linearGradient id="gof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `<linearGradient id="gof2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.55" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    // bande verte avec 3 sommets TRIANGULAIRES (le centre, vert, est le plus grand)
    `<polygon points="0,51 324,51 324,24 257,8 190,24 126,2 62,24 31,8 0,24" fill="url(#gz)"/>` +
    // TRIANGLE doré à gauche (dégradé diagonal clair → foncé)
    `<polygon points="0,24 31,8 62,24" fill="url(#gof2)"/>` +
    // TRIANGLE doré à droite (dégradé diagonal inversé, le sommet central reste vert)
    `<polygon points="190,24 257,8 324,24" fill="url(#gof2)" transform="scale(-1,1) translate(-324,0)"/>` +
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
      <div style={{ position: 'absolute', top: 4, left: 24, width: 52, height: 52, borderRadius: '50%', background: '#ffffff', border: `2px solid ${GOLD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(10,53,41,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 15, fontWeight: 800, color: GREEN, letterSpacing: 0.5 }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre — pleine largeur (l'année est en bas) */}
      <div style={{ position: 'absolute', top: 11, left: 86, right: 28 }}>
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
      <div style={{ position: 'absolute', top: 268, left: 30, right: 156 }}>
        <div style={{ marginBottom: 12 }}>
          <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Téléphone" value={personnel.telephone || '—'} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Année scolaire" value={annee} />
        </div>
      </div>

      {/* ═══ QR Code — 20 × 20 mm, bordure dégradée or ═══ */}
      <div style={{ position: 'absolute', top: 310, right: 18, zIndex: 4 }}>
        <div style={{ borderRadius: 14, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 8px 20px rgba(11,61,46,0.16)' }}>
          <div style={{ borderRadius: 12, background: '#ffffff', overflow: 'hidden' }}>
            {/* JIMPRO intégré au décor du cadre (bandeau or au-dessus du code) */}
            <div style={{ background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, textAlign: 'center', padding: '3px 0', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#06291e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(6,41,30,0.25)', borderBottom: '1px solid rgba(255,255,255,0.45)' }}>
              <div style={{ width: 3, height: 3, transform: 'rotate(45deg)', background: '#06291e', marginRight: 4, opacity: 0.7 }} />
              JIMPRO SCAN
              <div style={{ width: 3, height: 3, transform: 'rotate(45deg)', background: '#06291e', marginLeft: 4, opacity: 0.7 }} />
            </div>
            <div style={{ padding: 4 }}>
              <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bande verte dégradée du bas (zigzag) — adresse web ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 51 }} />
      <div style={{ position: 'absolute', bottom: 16, left: 36, right: 36, textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#ffffff', textTransform: 'lowercase', lineHeight: 1.3 }}>{siteWeb}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSO UNIVERSEL de la carte de service — mêmes dimensions portrait 54 × 86 mm.
// AUCUNE donnée personnelle : ce verso est identique pour TOUT le personnel.
// Design « Royaume » : émeraude profonde + or, emblème central (logo ou initiales
// de l'école), devise, coordonnées de l'établissement et mention légale.
// ═══════════════════════════════════════════════════════════════════════════════
export function CarteServiceCardBack({ schoolName, logoUrl, siteWeb, telephone }: {
  schoolName: string;
  logoUrl?: string | null;
  siteWeb?: string | null;
  telephone?: string | null;
}) {
  const initials = getSchoolInitials(schoolName || 'ÉCOLE');
  const web = siteWeb || slugifySchool(schoolName);
  const [logoError, setLogoError] = useState(false);

  // ── Anneau de l'emblème (double cercle doré, centre émeraude profond) ──
  const ringSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="142" height="142" viewBox="0 0 142 142">` +
    `<defs>` +
    `<linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#f5e0a0"/><stop offset="0.5" stop-color="#d4af37"/><stop offset="1" stop-color="#8f6f16"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<circle cx="71" cy="71" r="70" fill="url(#rg)"/>` +
    `<circle cx="71" cy="71" r="64" fill="none" stroke="#fff3cf" stroke-width="1" opacity="0.85"/>` +
    `<circle cx="71" cy="71" r="60" fill="#0a3526"/>` +
    // petites gemmes dorées sur l'anneau (N, E, S, O + diagonales)
    `<polygon points="71,4 74,9 71,14 68,9" fill="#f5e0a0"/>` +
    `<polygon points="138,71 133,68 138,65 143,68" fill="#f5e0a0"/>` +
    `<polygon points="71,138 74,133 71,128 68,133" fill="#f5e0a0"/>` +
    `<polygon points="4,71 9,74 14,71 9,68" fill="#f5e0a0"/>` +
    `<polygon points="20,20 24,24 20,28 16,24" fill="#f5e0a0" opacity="0.7"/>` +
    `<polygon points="122,20 126,24 122,28 118,24" fill="#f5e0a0" opacity="0.7"/>` +
    `<polygon points="20,122 24,118 28,122 24,126" fill="#f5e0a0" opacity="0.7"/>` +
    `<polygon points="122,122 118,118 122,114 126,118" fill="#f5e0a0" opacity="0.7"/>` +
    `</svg>`
  )}`;

  // ── Zone haute : composition de TRAPÈZES aux dégradés prononcés ──
  const topSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="150" viewBox="0 0 324 150">` +
    `<defs>` +
    `<linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#042a1e"/><stop offset="0.55" stop-color="#0d4433"/><stop offset="1" stop-color="#11503b"/></linearGradient>` +
    `<linearGradient id="te1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d7350"/><stop offset="0.5" stop-color="#155f44"/><stop offset="1" stop-color="#093427"/></linearGradient>` +
    `<linearGradient id="tg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fce9ac"/><stop offset="0.4" stop-color="#e6c04f"/><stop offset="0.75" stop-color="#c1931f"/><stop offset="1" stop-color="#82620f"/></linearGradient>` +
    `<linearGradient id="tg2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f6df96"/><stop offset="1" stop-color="#b38620"/></linearGradient>` +
    `</defs>` +
    // fond
    `<rect width="324" height="150" fill="url(#tb)"/>` +
    // trapèze émeraude CLAIR (balayage diagonal prononcé, bas-gauche → haut-droit)
    `<polygon points="0,34 324,126 324,150 0,150" fill="url(#te1)" opacity="0.95"/>` +
    // bande dorée épaisse en diagonale (dégradé prononcé clair → foncé)
    `<polygon points="0,6 324,96 324,105 0,15" fill="url(#tg1)" opacity="0.95"/>` +
    // rehaut doré fin parallèle
    `<polygon points="0,20 324,110 324,113 0,23" fill="#f7e2a4" opacity="0.6"/>` +
    // facette sombre haut-droite (relief)
    `<polygon points="214,0 324,0 324,92 258,32" fill="#032117" opacity="0.9"/>` +
    // trapèze doré coin haut-gauche
    `<polygon points="0,0 118,0 134,16 0,24" fill="url(#tg2)" opacity="0.95"/>` +
    // éclats losange dorés (marges droite/gauche)
    `<polygon points="262,42 266,46 262,50 258,46" fill="url(#tg1)" opacity="0.9"/>` +
    `<polygon points="286,58 290,62 286,66 282,62" fill="url(#tg1)" opacity="0.7"/>` +
    `<polygon points="304,34 308,38 304,42 300,38" fill="url(#tg1)" opacity="0.8"/>` +
    `<polygon points="30,84 33,87 30,90 27,87" fill="url(#tg1)" opacity="0.75"/>` +
    `<polygon points="14,66 17,69 14,72 11,69" fill="url(#tg1)" opacity="0.6"/>` +
    `</svg>`
  )}`;

  // ── Hachures diagonales très discrètes (texture) ──
  const patternSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="516" viewBox="0 0 324 516">` +
    `<g stroke="#ffffff" stroke-width="1" opacity="0.045">` +
    `<path d="M-40 260 L40 0"/><path d="M20 260 L100 0"/><path d="M80 260 L160 0"/>` +
    `<path d="M140 260 L220 0"/><path d="M200 260 L280 0"/><path d="M260 260 L340 0"/>` +
    `</g></svg>`
  )}`;

  // ── Bande inférieure : trapèzes dégradés + mention légale ──
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="156" viewBox="0 0 324 156" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e4d3a"/><stop offset="1" stop-color="#031c12"/></linearGradient>` +
    `<linearGradient id="fe2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b6f4e"/><stop offset="1" stop-color="#0a3526"/></linearGradient>` +
    `<linearGradient id="fg3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f6df96"/><stop offset="1" stop-color="#9c7c1e"/></linearGradient>` +
    `<linearGradient id="fg4" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fce9ac"/><stop offset="1" stop-color="#8f6f16"/></linearGradient>` +
    `</defs>` +
    // fond émeraude (profond en bas pour la lisibilité du texte blanc)
    `<rect x="0" y="0" width="324" height="156" fill="url(#fb)"/>` +
    // trapèze émeraude clair (bas-gauche, dégradé prononcé)
    `<polygon points="0,18 150,18 210,86 0,86" fill="url(#fe2)" opacity="0.85"/>` +
    // bande dorée diagonale (haut de la bande)
    `<polygon points="0,6 324,38 324,47 0,15" fill="url(#fg3)" opacity="0.95"/>` +
    // liseré or fin sous la bande
    `<polygon points="0,22 324,54 324,57 0,25" fill="#f7e2a4" opacity="0.55"/>` +
    // facette sombre haut-droite
    `<polygon points="240,0 324,0 324,64 278,22" fill="#041f15" opacity="0.9"/>` +
    // triangles dorés des coins inférieurs (plis)
    `<polygon points="0,156 52,156 0,108" fill="url(#fg4)"/>` +
    `<polygon points="0,156 30,156 0,126" fill="#f7d774" opacity="0.85"/>` +
    `<polygon points="324,156 272,156 324,108" fill="url(#fg4)"/>` +
    `<polygon points="324,156 294,156 324,126" fill="#f7d774" opacity="0.85"/>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: '#fdfcf7', borderRadius: 14, boxShadow: '0 24px 64px rgba(3,28,19,0.45)' }}>

      {/* ═══ Zone haute colorée (0 → ~30 %) : trapèzes dégradés + emblème ═══ */}
      <img src={topSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 150 }} />
      <img src={patternSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 516 }} />
      {/* fin de zone : liseré doré */}
      <div style={{ position: 'absolute', top: 147, left: 0, right: 0, height: 2.5, background: 'linear-gradient(90deg, #e8c96a, #c9a227, #e8c96a)' }} />

      {/* Emblème central (logo ou initiales) dans la zone haute */}
      <div style={{ position: 'absolute', top: 4, left: '50%', marginLeft: -71, width: 142, height: 142 }}>
        <img src={ringSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 142, height: 142 }} />
        <div style={{ position: 'absolute', top: 10, left: 10, width: 122, height: 122, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 36%, #145640, #09301f)', border: '1px solid rgba(240,215,140,0.25)' }}>
          {logoUrl && !logoError ? (
            <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
          ) : (
            <span style={{ fontSize: 40, fontWeight: 800, color: '#f0d78c', letterSpacing: 1, fontFamily: "'Georgia', 'Times New Roman', serif" }}>{initials}</span>
          )}
        </div>
      </div>

      {/* ═══ Zone centrale BLANCHE (≈ 30 % → 70 %) : texte sombre sur blanc ═══ */}
      {/* Étiquette */}
      <div style={{ position: 'absolute', top: 158, left: 0, right: 0, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 5, color: '#9c7c1e' }}>CARTE DE SERVICE</div>

      {/* Nom de l'école */}
      <div style={{ position: 'absolute', top: 170, left: 26, right: 26, textAlign: 'center', fontSize: 18, fontWeight: 800, letterSpacing: 1.2, color: '#0f4c3a', textTransform: 'uppercase', lineHeight: 1.18 }}>{schoolName}</div>

      {/* Séparateur avec losange */}
      <div style={{ position: 'absolute', top: 226, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 56, height: 1.5, background: 'linear-gradient(90deg, rgba(201,162,39,0), #c9a227)' }} />
        <Diamond size={6} color="#b58b1e" />
        <div style={{ width: 56, height: 1.5, background: 'linear-gradient(90deg, #c9a227, rgba(201,162,39,0))' }} />
      </div>

      {/* Devise */}
      <div style={{ position: 'absolute', top: 244, left: 0, right: 0, textAlign: 'center', fontSize: 10.5, fontWeight: 700, letterSpacing: 3.2, color: '#a8821f' }}>EXCELLENCE · DISCIPLINE · SAVOIR</div>

      {/* Couronne de gemmes décorative */}
      <div style={{ position: 'absolute', top: 272, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {[4, 6, 8, 12, 8, 6, 4].map((s, i) => <Diamond key={i} size={s} color={s === 12 ? '#b58b1e' : 'rgba(201,162,39,0.8)'} />)}
      </div>

      {/* Coordonnées de l'établissement (universel) */}
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 3.5, color: '#9c7c1e' }}>ÉTABLISSEMENT</div>
        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: '#16324a', letterSpacing: 0.5 }}>{web}</div>
        {telephone && <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: '#3f5468', letterSpacing: 0.4 }}>{telephone}</div>}
      </div>

      {/* ═══ Zone basse colorée (≈ 70 % → 100 %) : mention légale ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: 324, height: 156 }} />
      <div style={{ position: 'absolute', bottom: 18, left: 22, right: 22, textAlign: 'center', fontSize: 6.6, fontWeight: 600, letterSpacing: 0.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.92)' }}>
        Ce document est la propriété de l'établissement. Il est délivré à titre professionnel et doit être restitué en cas de départ.
      </div>
    </div>
  );
}

