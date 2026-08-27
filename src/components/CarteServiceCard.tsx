import { useState } from 'react';
import { getSchoolInitials } from '../utils/schoolInitials';

// ═══════════════════════════════════════════════════════════════════════════════
// Carte de service du personnel — template « Vert & Or »
// Design moderne inspiré du modèle de référence (mockup 500×500) :
//  · fond clair, ruban VERT diagonal en haut à gauche + motif DORÉ vif
//  · bandeau MARINE supérieur réduit (nom de l'école + logo)
//  · photo RONDE remontée, double anneau or / vert
//  · identité : nom marine + sexe vert, fonction verte cerclée d'or
//  · champs : matricule, e-mail, téléphone, date de naissance + sexe,
//    date d'embauche + nationalité
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

// ─── Palette « Vert & Or » ─────────────────────────────────────────────────────
const GREEN_DEEP = '#0a3529';
const GREEN = '#0f4c3a';
const GOLD = '#e6b422';      // doré vif
const GOLD_LIGHT = '#f7d774';
const GOLD_DARK = '#b8891a';
const NAVY_DEEP = '#0d1f38';
const NAVY = '#16324a';
const BG = '#f7f8fc';
const INK = '#1c2b42';
const MUTED = '#7c8698';
const LINE = '#e6eaf3';
const PHOTO_BG = '#eef4e7';  // vert très clair

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
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 0', borderBottom: '1px solid ' + LINE }}>
      <div style={{ width: 3, height: 22, borderRadius: 2, margin: '2px 8px 0 0', flexShrink: 0, background: `linear-gradient(180deg, ${GOLD}, ${GOLD_DARK})` }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 6.8, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: INK, marginTop: 1.5, lineHeight: 1.25, ...(nowrap ? { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

/** Petit losange doré (séparateur). */
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

  // ═══ Bandeau supérieur réduit — marine + ruban vert + motif or ═══
  const headerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="96" viewBox="0 0 324 96">` +
    `<defs>` +
    `<linearGradient id="nh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY_DEEP}"/><stop offset="1" stop-color="${NAVY}"/></linearGradient>` +
    `<linearGradient id="vt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DEEP}"/></linearGradient>` +
    `<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    `</defs>` +
    // bandeau marine arrondi
    `<rect x="0" y="0" width="324" height="96" rx="14" fill="url(#nh)"/>` +
    // ruban VERT diagonal (coin haut gauche)
    `<polygon points="0,0 104,0 158,48 54,48" fill="url(#vt)"/>` +
    `<polygon points="0,0 104,0 104,9 0,22" fill="url(#vt)" opacity="0.8"/>` +
    // motif DORÉ vif : fine bande dorée le long du ruban + éclat en haut à droite
    `<polygon points="0,52 158,52 162,56 0,56" fill="url(#gd)" opacity="0.9"/>` +
    `<polygon points="196,0 224,0 210,26" fill="url(#gd)" opacity="0.9"/>` +
    `<polygon points="282,0 324,0 324,14 296,0" fill="url(#gd)" opacity="0.7"/>` +
    // losange or décoratif
    `<polygon points="168,16 174,22 168,28 162,22" fill="url(#gd)"/>` +
    `</svg>`
  )}`;

  // ═══ Bande inférieure — marine + liseré or ═══
  const footerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="324" height="52" viewBox="0 0 324 52" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="fh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/></linearGradient>` +
    `<linearGradient id="fo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_LIGHT}"/></linearGradient>` +
    `</defs>` +
    // liseré or vif supérieur
    `<rect x="0" y="0" width="324" height="4" fill="url(#fo)"/>` +
    `<rect x="0" y="4" width="324" height="48" fill="url(#fh)"/>` +
    `</svg>`
  )}`;

  return (
    <div style={{ width: CARTE_SERVICE_W, height: CARTE_SERVICE_H, position: 'relative', overflow: 'hidden', fontFamily: FONT, background: BG, borderRadius: 14, color: INK, boxShadow: '0 24px 64px rgba(13,31,56,0.22)' }}>
      {/* Bandeau supérieur */}
      <img src={headerSvg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 324, height: 96 }} />

      {/* Logo école (cerclé or) */}
      <div style={{ position: 'absolute', top: 22, right: 24, width: 44, height: 44, borderRadius: '50%', background: '#ffffff', border: '2px solid ' + GOLD, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,31,56,0.30)' }}>
        {logoUrl && !logoError ? (
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoError(true)} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 800, color: GREEN, letterSpacing: 0.5 }}>{getSchoolInitials(schoolName)}</span>
        )}
      </div>

      {/* Nom de l'école + titre */}
      <div style={{ position: 'absolute', top: 28, left: 28, right: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Diamond size={4} color={GOLD_LIGHT} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: '#ffffff', textTransform: 'uppercase', marginLeft: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</span>
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 3, color: GOLD_LIGHT, marginTop: 5, textTransform: 'uppercase' }}>Carte de service</div>
      </div>

      {/* ═══ Photo — RONDE, remontée, double anneau or / vert ═══ */}
      <div style={{ position: 'absolute', top: 106, left: 108, width: 108, height: 108, borderRadius: '50%', background: `linear-gradient(140deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`, padding: 2.5, boxShadow: '0 0 0 4px rgba(255,255,255,0.95), 0 10px 24px rgba(13,31,56,0.28)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(140deg, ${GREEN}, ${GREEN_DEEP})`, padding: 2.5 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: PHOTO_BG }}>
              {personnel.photo_url && !photoError ? (
                <img src={personnel.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoError(true)} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${PHOTO_BG}, #dfeed2)` }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: GREEN }}>{initials}</span>
                  <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 2, color: GREEN, marginTop: 3, textTransform: 'uppercase' }}>Photo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Identité — NOM + prénom + sexe, fonction ═══ */}
      <div style={{ position: 'absolute', top: 224, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: NAVY, letterSpacing: 0.3, lineHeight: 1.15, padding: '0 10px' }}>
          {personnel.nom.toUpperCase()} <span style={{ fontWeight: 700, color: NAVY }}>{personnel.prenom}</span>
          {personnel.sexe ? <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, marginLeft: 7 }}>· {personnel.sexe}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 5, padding: '0 10px' }}>
          <span style={{ width: 22, height: 1.5, background: 'linear-gradient(90deg, transparent, #e6b422)', flexShrink: 0 }} />
          <Diamond size={5} color={GOLD} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: GREEN, textTransform: 'uppercase', margin: '0 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personnel.fonction}</span>
          <Diamond size={5} color={GOLD} />
          <span style={{ width: 22, height: 1.5, background: 'linear-gradient(270deg, transparent, #e6b422)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Séparateur or discret */}
      <div style={{ position: 'absolute', top: 262, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 84, height: 1, background: 'linear-gradient(90deg, transparent, #d9c97c)' }} />
        <Diamond size={5} color={GOLD} />
        <div style={{ width: 84, height: 1, background: 'linear-gradient(270deg, transparent, #d9c97c)' }} />
      </div>

      {/* ═══ Champs d'information ═══ */}
      <div style={{ position: 'absolute', top: 274, left: 36, right: 148 }}>
        <Field label="Matricule" value={personnel.matricule || '—'} nowrap />
        <Field label="E-mail" value={personnel.email || '—'} nowrap />
        <Field label="Téléphone" value={personnel.telephone || '—'} />
        {/* Date de naissance + Sexe côte à côte */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date de naissance" value={formatDate(personnel.date_naissance)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Sexe" value={personnel.sexe || '—'} nowrap />
          </div>
        </div>
        {/* Date d'embauche + Nationalité côte à côte */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Date d'embauche" value={formatDate(personnel.date_embauche)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Nationalité" value={personnel.nationalite || '—'} nowrap />
          </div>
        </div>
      </div>

      {/* ═══ QR Code — cadre vert + or ═══ */}
      <div style={{ position: 'absolute', top: 292, right: 12, borderRadius: 12, background: `linear-gradient(140deg, ${GREEN}, ${GREEN_DEEP})`, padding: 3, boxShadow: '0 8px 20px rgba(13,31,56,0.18)', zIndex: 4 }}>
        <div style={{ borderRadius: 9, background: '#ffffff', padding: 4 }}>
          <img src={qrDataUrl} alt="" style={{ width: CARTE_SERVICE_QR, height: CARTE_SERVICE_QR, display: 'block' }} />
        </div>
      </div>

      {/* ═══ Bande inférieure — site web + année ═══ */}
      <img src={footerSvg} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: CARTE_SERVICE_W, height: 52 }} />
      <div style={{ position: 'absolute', bottom: 12, left: 18, fontSize: 8.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.80)' }}>{annee}</div>
      <div style={{ position: 'absolute', bottom: 12, left: 70, right: 0, textAlign: 'left', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: '#ffffff', textTransform: 'lowercase' }}>{siteWeb}</div>
    </div>
  );
}
