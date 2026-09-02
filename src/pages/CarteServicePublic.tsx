import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { CarteServiceCard, CarteServiceCardBack, type CarteService } from '../components/CarteServiceCard';

// Convertit une URL (Supabase storage) en data URL base64 (rendu html2canvas fiable)
async function urlToBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type State =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'ready'; membre: CarteService; schoolName: string; logoData: string | null; qrDataUrl: string };

export default function CarteServicePublic() {
  const { matricule } = useParams<{ matricule: string }>();
  const [searchParams] = useSearchParams();
  const ecoleCode = searchParams.get('ecole') || '';
  const [state, setState] = useState<State>({ type: 'loading' });
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<'recto' | 'verso' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!matricule) return;
      try {
        const { data: ecole } = await supabase.from('ecoles').select('id, nom').eq('code', ecoleCode.toUpperCase()).eq('is_active', true).maybeSingle();
        if (!ecole) { if (!cancelled) setState({ type: 'error', message: ecoleCode ? 'École "' + ecoleCode + '" introuvable.' : '?ecole= requis (ex : ?ecole=CSGA).' }); return; }
        // Membre : école d'abord, puis repli global (matricules uniques)
        let { data: membre } = await supabase
          .from('personnel')
          .select('matricule, nom, postnom, prenom, sexe, fonction, date_naissance, nationalite, date_embauche, photo_url, telephone, email, adresse')
          .eq('ecole_id', ecole.id)
          .ilike('matricule', matricule)
          .maybeSingle();
        if (!membre) {
          const { data: fb } = await supabase
            .from('personnel')
            .select('matricule, nom, postnom, prenom, sexe, fonction, date_naissance, nationalite, date_embauche, photo_url, telephone, email, adresse')
            .ilike('matricule', matricule)
            .maybeSingle();
          membre = fb;
        }
        if (!membre) { if (!cancelled) setState({ type: 'error', message: 'Aucun membre trouvé avec le matricule "' + matricule + '".' }); return; }

        const { data: logo } = await supabase.from('app_settings').select('value').eq('ecole_id', ecole.id).eq('key', 'logo_url').maybeSingle();
        const logoUrl = logo?.value || '';
        const logoData = logoUrl ? await urlToBase64(logoUrl) : null;

        const carte: CarteService = {
          matricule: membre.matricule || null, nom: membre.nom, postnom: membre.postnom || null,
          prenom: membre.prenom, sexe: membre.sexe || null, fonction: membre.fonction,
          date_naissance: membre.date_naissance || null, nationalite: membre.nationalite || null,
          date_embauche: membre.date_embauche || null, photo_url: membre.photo_url || null,
          telephone: membre.telephone || null, email: membre.email || null, adresse: membre.adresse || null,
        };
        const nomComplet = [carte.nom, carte.postnom, carte.prenom].filter(Boolean).join(' ');
        const qrDataUrl = await QRCode.toDataURL(
          'MATRICULE:' + (carte.matricule || '') + '|NOM:' + nomComplet + '|FONCTION:' + (carte.fonction || ''),
          { width: 800, margin: 2, errorCorrectionLevel: 'H' }
        );
        if (!cancelled) setState({ type: 'ready', membre: carte, schoolName: ecole.nom, logoData, qrDataUrl });
      } catch (err: any) {
        if (!cancelled) setState({ type: 'error', message: err?.message || 'Erreur de chargement.' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [matricule, ecoleCode]);

  const downloadCote = useCallback(async (cote: 'recto' | 'verso') => {
    const el = cote === 'recto' ? rectoRef.current : versoRef.current;
    if (!el) return;
    setDownloading(cote);
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.download = 'Carte-service-' + (matricule || 'membre') + '-' + cote + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (e) { console.error(e); } finally { setDownloading(null); }
  }, [matricule]);

  if (state.type === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }
  if (state.type === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Carte de service introuvable</h2>
          <p className="text-gray-600 mb-4">{state.message}</p>
          <a href={'/portail-pointage?ecole=' + ecoleCode} className="inline-block text-sm text-emerald-700 hover:underline">← Retour au portail de pointage</a>
        </div>
      </div>
    );
  }

  const { membre, schoolName, logoData, qrDataUrl } = state;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carte de service — {membre.nom} {membre.postnom || ''} {membre.prenom}</h1>
            <p className="text-gray-500 text-sm mt-1">{schoolName} · {membre.fonction} · Matricule {membre.matricule}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadCote('recto')} disabled={downloading !== null} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 font-semibold shadow disabled:opacity-50">
              {downloading === 'recto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Recto (PNG)
            </button>
            <button onClick={() => downloadCote('verso')} disabled={downloading !== null} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 font-semibold shadow disabled:opacity-50">
              {downloading === 'verso' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Verso (PNG)
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Recto</span>
            <div ref={rectoRef}>
              <CarteServiceCard personnel={membre} schoolName={schoolName} logoUrl={logoData} qrDataUrl={qrDataUrl} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-amber-600 uppercase tracking-wide">Verso</span>
            <div ref={versoRef}>
              <CarteServiceCardBack personnel={membre} schoolName={schoolName} />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
          <RefreshCw className="w-3 h-3" /> Aperçu réel — l'impression reste disponible depuis la page Personnel (recto / verso).
        </p>
      </div>
    </div>
  );
}
