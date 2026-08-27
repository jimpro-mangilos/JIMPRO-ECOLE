import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — reproduction du MODÈLE DE RÉFÉRENCE en vert-doré
// Composition identique au modèle (id-card-printing-service) :
//  · RUBAN diagonal émeraude en haut à gauche (avec reflet et liseré or)
//  · ÉLÉMENT doré en haut à droite
//  · PHOTO ronde à DROITE (cadre or/émeraude)
//  · NOM + fonction à GAUCHE, au niveau de la photo
//  · CHAMPS en bas + QR
//  · FORME dorée en bas à droite
//  · bande émeraude inférieure
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
export const CARTE_SERVICE_QR = 92; // ~15 mm

// ─── Palette vert-doré ──────────────────────────────────────────────────────────
const EMERALD = '#0f4c3a';
const EMERALD_DEEP = '#07281d';
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

function Field({ label, value, nowrap }: { label: string; value: string; nowrap?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '3px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ width: 3, height: 19, borderRadius: 99, margin: '2px 7px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD_DARK})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 6.2, fontWeight: 600, letterSpacing: 1.6, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 10.2, fontWeight: 600, color: INK, marginTop: 1, lineHeight: 1.25, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
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

  // ═══ Motif du haut : GRAND ruban diagonal émeraude + élément or à droite ═══
  const topSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="110" viewBox="0 0 324 110">` +
    `<defs>` +
    `<linearGradient id="em" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMERALD}"/><stop offset="1" stop-color="${EMERALD_DEEP}"/></linearGradient>` +
    `<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.55" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    // GRAND RUBAN diagonal émeraude (coin haut gauche → centre droit)
    `<polygon points="0,0 200,0 300,110 100,110" fill="url(#em)"/>` +
    // reflet sur le ruban
    `<polygon points="0,0 200,0 180,18 0,18" fill="#ffffff" opacity="0.10"/>` +
    // pli du ruban (coin gauche)
    `<polygon points="0,0 28,0 0,28" fill="${EMERALD_DEEP}"/>` +
    // liseré OR le long du bord inférieur du ruban
    `<polygon points="100,110 300,110 303,114 103,114" fill="url(#gd)"/>` +
    // ÉLÉMENT doré en haut à droite (comme le modèle)
    `<polygon points="250,0 324,0 324,86" fill="url(#gd)" opacity="0.85"/>` +
    `<polygon points="250,0 292,0 271,42" fill="#ffffff" opacity="0.15"/>` +
    `<polygon points="296,0 324,0 324,36" fill="url(#gd)" opacity="0.7"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure émeraude + liseré or ═══
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

  // ═══ FORME dorée en bas à droite (comme le modèle) ═══
  const cornerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
    `<polygon points="80,0 80,80 0,80" fill="url(#gd2)" opacity="0.5"/>` +
    `<polygon points="80,24 80,80 56,80" fill="url(#gd2)" opacity="0.8"/>` +
    `<defs>` +
    `<linearGradient id="gd2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD_DARK}"/></linearGradient>` +
    `</defs>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: IVORY, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(6,41,30,0.24)' }}>
      {/* Motif du haut : ruban + élément or */}
      <img src={topSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 110 }} />

      {/* Logo école (sur l'élément or, cerclé or) */}
      <div style={{ position: 'absolute', top: 14, right: 18, width: 44, height: 44, borderRadius: '50%', background: '#ffffff', border: '1.5px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(6,41,30,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: EMERALD }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école (sur le ruban) + titre */}
      <div style={{ position: 'absolute', top: 14, left: 32, right: 190 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dot size={3.5} color={GOLD_LIGHT} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.1, color: '#ffffff', textTransform: 'uppercase', marginLeft: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 7.6, fontWeight: 600, letterSpacing: 3, color: GOLD_LIGHT, marginTop: 4, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ PHOTO — ronde à DROITE (comme le modèle) ═══ */}
      <div style={{ position: 'absolute', top: 140, left: 28, width: 100, height: 100, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.92), 0 10px 24px rgba(6,41,30,0.24)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#eef3ea' }}>
            {personnel.photo_url && !photoError ? (
              <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: EMERALD }}>{initials}</span>
                <span style={{ fontSize: 6, fontWeight: 600, letterSpacing: 2, color: '#5f7a6a', marginTop: 2, textTransform: 'uppercase' }}>Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ NOM + fonction — à GAUCHE de la photo ═══ */}
      <div style={{ position: 'absolute', top: 140, left: 140, right: 30, textAlign: 'left' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: INK, letterSpacing: 0.3, lineHeight: 1.2 }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 600, color: INK }}>{personnel.prenom}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
          <div style={{ width: 26, height: 1.5, background: 'linear-gradient(90deg, #e3b94f, transparent)' }} />
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.8, color: '#4a7a63', textTransform: 'uppercase', margin: '0 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</span>
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ position: 'absolute', top: 260, left: 30, right: 30, display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d8b45a, transparent)' }} />
        <Dot size={4} />
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d8b45a, transparent)' }} />
      </div>

      {/* ═══ CHAMPS — en bas (comme le modèle) ═══ */}
      <div style={{ position: 'absolute', top: 276, left: 30, right: 148 }}>
        <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
        <Field label="E-mail" value={personnel.email || '—'} nowrap />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Téléphone" value={personnel.telephone || '—'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Sexe" value={personnel.sexe || '—'} nowrap />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date de naissance" value={formatDate(personnel.date_naissance)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date d'embauche" value={formatDate(personnel.date_embauche)} />
          </div>
        </div>
        <Field label="Nationalité" value={personnel.nationalite || '—'} nowrap />
      </div>

      {/* ═══ QR — cadre or ═══ */}
      <div style={{ position: 'absolute', top: 294, right: 12, borderRadius: 10, background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2, zIndex: 4 }}>
        <div style={{ borderRadius: 8, background: '#ffffff', padding: 3 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* FORME dorée en bas à droite (comme le modèle) */}
      <img src={cornerSvg} alt="" style={{ position: 'absolute', bottom: 0, right: 0, width: 80, height: 80 }} />

      {/* Bande inférieure — site web + année */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 46 }} />
      <div style={{ position: 'absolute', bottom: 13, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 13, left: 68, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
