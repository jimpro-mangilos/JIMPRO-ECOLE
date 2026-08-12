import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';

interface EleveCard {
  matricule: string; nom: string; postnom: string; prenom: string;
  sexe: string; section: string; option?: string | null; classe?: string | null;
  photo_url?: string | null; date_naissance?: string | null;
}
type State =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'ready'; eleve: EleveCard; schoolName: string; logoUrl: string | null; qrDataUrl: string };

const W = 510; const H = 324; const QR = 150;
const GOLD = '#d4a853';

function formatDateNaissance(d?: string | null): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Carte Élégant — Premium Dark · Or sur fond sombre
// ═══════════════════════════════════════════════════════════════════════════════

function CardPremium({ eleve, schoolName, logoUrl, qrDataUrl }: {
  eleve: EleveCard; schoolName: string; logoUrl: string | null; qrDataUrl: string;
}) {
  const nomComplet = `${eleve.nom} ${eleve.postnom ? eleve.postnom + ' ' : ''}${eleve.prenom}`;
  const initials = (eleve.nom.charAt(0) + eleve.prenom.charAt(0)).toUpperCase();
  const annee = '2026-2027';

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)', borderRadius: 12, color: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      {/* Subtle dot grid */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="510" height="324">
        <defs><pattern id="g1" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white"/></pattern></defs>
        <rect width="510" height="324" fill="url(#g1)"/>
      </svg>

      {/* Gold top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #b8860b, #d4a853, #f0d060, #d4a853, #b8860b)' }} />

      {/* Gold bottom bar — large */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'linear-gradient(90deg, #0d3b2e, #b8943a, #c9a84c, #e0c060, #f0d878, #e0c060, #c9a84c, #b8943a, #0d3b2e)' }} />

      {/* Decorative circles */}
      <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.08 }} width="200" height="200">
        <circle cx="100" cy="100" r="90" fill="none" stroke={GOLD} strokeWidth="2"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke={GOLD} strokeWidth="1"/>
      </svg>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        {logoUrl ? (
          <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: 2 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #b8860b, #d4a853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#0f0c29' }}>GA</div>
        )}
        <div>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase' }}>CARTE D'ÉLÈVE</div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, marginTop: 1, textTransform: 'uppercase', color: '#ffd24d' }}>{schoolName}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ border: `1.5px solid ${GOLD}`, borderRadius: 20, padding: '3px 14px', opacity: 0.8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: GOLD }}>OFFICIEL</span>
          </div>
          <span style={{ fontSize: 5, fontWeight: 600, color: GOLD, letterSpacing: 2, opacity: 0.6 }}>JIMPRO</span>
        </div>
      </div>

      {/* Gold hairline */}
      <div style={{ position: 'absolute', top: 74, left: 24, right: 24, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }} />

      {/* Année scolaire */}
      <div style={{ position: 'absolute', top: 218, left: 32, width: 96, textAlign: 'center' }}>
        <span style={{ fontSize: 5, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' }}>Année {annee}</span>
      </div>

      {/* Photo */}
      <div style={{ position: 'absolute', top: 92, left: 32, width: 96, height: 120, borderRadius: 16, overflow: 'hidden', border: `3px solid ${GOLD}`, boxShadow: '0 4px 20px rgba(180,140,0,0.25)', background: 'rgba(255,255,255,0.05)' }}>
        {eleve.photo_url ? (
          <img src={eleve.photo_url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: GOLD, opacity: 0.7 }}>{initials}</div>
        )}
      </div>

      {/* Name + program */}
      <div style={{ position: 'absolute', top: 86, left: 160, right: 120 }}>
        <div style={{ fontSize: 5, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' }}>Nom Élève</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5 }}>{eleve.nom} {eleve.postnom}</div>
        <div style={{ fontSize: 5, fontWeight: 600, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Prénom</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5 }}>{eleve.prenom}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Classe</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.classe || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Sexe</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.sexe}</div>
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Option</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: GOLD, marginTop: 1 }}>{eleve.option || '—'}</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div><div style={{ fontSize: 5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Matricule</div><div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>{eleve.matricule}</div></div>
        </div>
      </div>

      {/* Bottom meta */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: QR + 32, display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Date de naissance</div><div style={{ fontSize: 12, fontWeight: 500, marginTop: 1 }}>{formatDateNaissance(eleve.date_naissance)}</div></div>
      </div>

      {/* QR Code */}
      <div style={{ position: 'absolute', bottom: 20, right: 12, width: QR, height: QR, background: 'white', borderRadius: 8, padding: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <img src={qrDataUrl} alt="" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function CarteEtudiant() {
  const { matricule } = useParams<{ matricule: string }>();
  const [searchParams] = useSearchParams();
  const ecoleCode = searchParams.get('ecole') || '';
  const [state, setState] = useState<State>({ type: 'loading' });
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!matricule) return;
      try {
        const { data: ecole } = await supabase.from('ecoles').select('id, nom').eq('code', ecoleCode.toUpperCase()).eq('is_active', true).maybeSingle();
        if (!ecole) { if (!cancelled) setState({ type: 'error', message: ecoleCode ? `École "${ecoleCode}" introuvable.` : '?ecole= requis.' }); return; }
        const { data: eleve } = await supabase.from('eleves').select('*').eq('ecole_id', ecole.id).eq('matricule', matricule).maybeSingle();
        if (!eleve) { if (!cancelled) setState({ type: 'error', message: `Élève "${matricule}" introuvable.` }); return; }
        const { data: logo } = await supabase.from('app_settings').select('value').eq('ecole_id', ecole.id).eq('key', 'logo_url').maybeSingle();
        const nomComplet = `${eleve.nom} ${eleve.postnom ? eleve.postnom + ' ' : ''}${eleve.prenom}`;
        const qrDataUrl = await QRCode.toDataURL(`MATRICULE:${eleve.matricule}|ELEVE:${nomComplet}|SECTION:${eleve.section}|CLASSE:${eleve.classe || ''}`, { width: 800, margin: 2, errorCorrectionLevel: 'H' });
        if (!cancelled) setState({ type: 'ready', eleve: { matricule: eleve.matricule, nom: eleve.nom, postnom: eleve.postnom || '', prenom: eleve.prenom, sexe: eleve.sexe, section: eleve.section, option: eleve.option, classe: eleve.classe, photo_url: (eleve as any).photo_url || null, date_naissance: eleve.date_naissance }, schoolName: ecole.nom, logoUrl: logo?.value || null, qrDataUrl });
      } catch (err: any) { if (!cancelled) setState({ type: 'error', message: err.message }); }
    }
    load();
    return () => { cancelled = true; };
  }, [matricule, ecoleCode]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return; setDownloading(true);
    try {
      const c = await html2canvas(cardRef.current, { scale: 3, useCORS: true, allowTaint: true });
      const a = document.createElement('a'); a.download = `carte-${matricule}.png`; a.href = c.toDataURL('image/png'); a.click();
    } catch (e) { console.error(e); } finally { setDownloading(false); }
  }, [matricule]);

  const handlePrint = useCallback(async () => {
    if (!cardRef.current) return; setDownloading(true);
    try {
      const c = await html2canvas(cardRef.current, { scale: 3, useCORS: true, allowTaint: true });
      const w = window.open('', '_blank');
      if (w) { w.document.write(`<html><head><title>Carte ${matricule}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%}</style></head><body><img src="${c.toDataURL('image/png')}" /></body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
    } catch (e) { console.error(e); } finally { setDownloading(false); }
  }, [matricule]);

  if (state.type === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (state.type === 'error') return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4 text-center"><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" /><h2 className="text-lg font-bold text-gray-900 mb-2">Carte introuvable</h2><p className="text-gray-600">{state.message}</p></div></div>;

  const { eleve, schoolName, logoUrl, qrDataUrl } = state;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 gap-6">
      <div ref={cardRef}>
        <CardPremium eleve={eleve} schoolName={schoolName} logoUrl={logoUrl} qrDataUrl={qrDataUrl} />
      </div>
      <div className="flex gap-3">
        <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 font-semibold shadow-lg disabled:opacity-50">
          {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}Télécharger PNG
        </button>
        <button onClick={handlePrint} disabled={downloading} className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 font-semibold shadow border disabled:opacity-50">
          🖨️ Imprimer
        </button>
      </div>
      <p className="text-xs text-gray-400">{schoolName} — Carte d'élève officielle</p>
    </div>
  );
}
