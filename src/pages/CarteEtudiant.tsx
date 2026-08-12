import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';
import { CarteEleveCard, generateQrDataUrl, type CarteEleve } from '../components/CarteEleveCard';

type State =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'ready'; eleve: CarteEleve; schoolName: string; logoUrl: string | null; qrDataUrl: string };

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
        const carteEleve: CarteEleve = {
          matricule: eleve.matricule, nom: eleve.nom, postnom: eleve.postnom || '', prenom: eleve.prenom,
          sexe: eleve.sexe, section: eleve.section, option: eleve.option, classe: eleve.classe,
          photo_url: (eleve as any).photo_url || null, date_naissance: eleve.date_naissance,
        };
        const qrDataUrl = await generateQrDataUrl(carteEleve);
        if (!cancelled) setState({ type: 'ready', eleve: carteEleve, schoolName: ecole.nom, logoUrl: logo?.value || null, qrDataUrl });
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
        <CarteEleveCard eleve={eleve} schoolName={schoolName} logoUrl={logoUrl} qrDataUrl={qrDataUrl} />
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
