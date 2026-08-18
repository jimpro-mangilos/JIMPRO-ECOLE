import { useState, useEffect, useRef } from 'react';
import { QrCode, X, Loader2, CheckCircle2, LogIn, LogOut, UserCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { usePublicSchool } from '../lib/hooks/usePublicSchool';

interface PersonnelInfo {
  id: string;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  fonction: string;
  photo_url: string | null;
}

type Resultat =
  | { type: 'loading' }
  | { type: 'arrivee'; personne: PersonnelInfo; heure: string }
  | { type: 'depart'; personne: PersonnelInfo; heure: string }
  | { type: 'deja_complet'; personne: PersonnelInfo }
  | { type: 'introuvable' }
  | null;

function heureActuelle(): string {
  return new Date().toTimeString().slice(0, 8);
}

export default function PortailPointage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [matriculeManuel, setMatriculeManuel] = useState('');
  const [resultat, setResultat] = useState<Resultat>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunning = useRef(false);
  const scannerDivId = 'qr-pointage';
  const { schoolId, loading: schoolLoading } = usePublicSchool();

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scannerRunning.current = false;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 350, height: 350 }, aspectRatio: 1 },
        async (decodedText) => {
          if (!scannerRunning.current) return;
          scannerRunning.current = false;
          const match = decodedText.match(/MATRICULE:([^|]+)/i);
          const matriculeExtrait = match ? match[1].trim() : '';
          if (matriculeExtrait) {
            setShowScanner(false);
            setScanError('');
            await pointer(matriculeExtrait.toUpperCase());
          } else {
            setScanError('Aucun matricule valide trouvé.');
            scannerRunning.current = true;
          }
        },
        () => {}
      ).then(() => { scannerRunning.current = true; }).catch(() => setScanError("Erreur d'accès caméra."));
    }
    return () => {
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    };
  }, [showScanner]);

  async function pointer(matricule: string) {
    if (schoolLoading) return;
    if (!schoolId) { setScanError("Aucune école trouvée. Contactez l'administrateur."); return; }
    setLoading(true);
    setResultat({ type: 'loading' });

    try {
      const matriculeTrim = matricule.trim();
      let { data: personne } = await supabase
        .from('personnel')
        .select('id, matricule, nom, postnom, prenom, fonction, photo_url')
        .eq('ecole_id', schoolId)
        .ilike('matricule', matriculeTrim)
        .maybeSingle();
      if (!personne) {
        const { data: fb } = await supabase
          .from('personnel')
          .select('id, matricule, nom, postnom, prenom, fonction, photo_url')
          .ilike('matricule', matriculeTrim)
          .maybeSingle();
        personne = fb;
      }
      if (!personne) { setResultat({ type: 'introuvable' }); return; }

      const info: PersonnelInfo = {
        id: personne.id, matricule: personne.matricule, nom: personne.nom,
        postnom: personne.postnom, prenom: personne.prenom,
        fonction: personne.fonction, photo_url: personne.photo_url,
      };

      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from('pointages_personnel')
        .select('id, heure_arrivee, heure_depart')
        .eq('personnel_id', personne.id)
        .eq('date_pointage', today)
        .maybeSingle();

      if (!existing) {
        await supabase.from('pointages_personnel').insert({
          ecole_id: schoolId, personnel_id: personne.id, date_pointage: today,
          heure_arrivee: heureActuelle(), statut: 'present',
        });
        setResultat({ type: 'arrivee', personne: info, heure: heureActuelle() });
      } else if (!existing.heure_depart) {
        await supabase.from('pointages_personnel').update({ heure_depart: heureActuelle() }).eq('id', existing.id);
        setResultat({ type: 'depart', personne: info, heure: heureActuelle() });
      } else {
        setResultat({ type: 'deja_complet', personne: info });
      }
    } catch (err) {
      console.error(err);
      setScanError('Erreur lors du pointage.');
    } finally {
      setLoading(false);
    }
  }

  async function pointerManuel(e: React.FormEvent) {
    e.preventDefault();
    if (!matriculeManuel.trim()) return;
    await pointer(matriculeManuel.toUpperCase());
    setMatriculeManuel('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-white/80 text-sm mb-4">
            <UserCheck className="w-4 h-4" />
            Portail de Pointage
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GOLDEN ACADEMY</h1>
          <p className="text-white/60 text-sm">Scannez votre carte de service pour pointer</p>
        </div>

        {/* Bouton scan */}
        <button
          onClick={() => { setResultat(null); setScanError(''); setShowScanner(true); }}
          className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-4 rounded-xl mb-4 shadow-lg transition-colors"
        >
          <QrCode className="w-6 h-6" /> Scanner ma carte
        </button>

        {/* Saisie manuelle */}
        <form onSubmit={pointerManuel} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <p className="text-white/50 text-xs mb-2">Ou saisissez votre matricule</p>
          <div className="flex gap-2">
            <input
              value={matriculeManuel}
              onChange={e => setMatriculeManuel(e.target.value)}
              placeholder="Ex : PER-20260818-ABC12"
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm outline-none focus:border-emerald-400"
            />
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-lg">Pointer</button>
          </div>
        </form>

        {/* Scanner */}
        {showScanner && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm">Scanner la carte…</span>
              <button onClick={() => setShowScanner(false)} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div id={scannerDivId} className="w-full rounded-lg overflow-hidden" />
            {scanError && <p className="text-red-300 text-xs mt-2">{scanError}</p>}
          </div>
        )}

        {/* Résultat */}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-white/70 py-8">
            <Loader2 className="w-6 h-6 animate-spin" /> Pointage en cours…
          </div>
        )}

        {resultat?.type === 'arrivee' && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-6 text-center">
            <LogIn className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
            <div className="text-white font-bold text-lg">{resultat.personne.nom} {resultat.personne.postnom ? resultat.personne.postnom + ' ' : ''}{resultat.personne.prenom}</div>
            <div className="text-emerald-200 text-sm">{resultat.personne.fonction}</div>
            <div className="mt-3 text-white text-sm">Arrivée enregistrée à <span className="font-bold">{resultat.heure}</span></div>
          </div>
        )}

        {resultat?.type === 'depart' && (
          <div className="bg-blue-500/20 border border-blue-400/40 rounded-xl p-6 text-center">
            <LogOut className="w-10 h-10 text-blue-300 mx-auto mb-2" />
            <div className="text-white font-bold text-lg">{resultat.personne.nom} {resultat.personne.postnom ? resultat.personne.postnom + ' ' : ''}{resultat.personne.prenom}</div>
            <div className="text-blue-200 text-sm">{resultat.personne.fonction}</div>
            <div className="mt-3 text-white text-sm">Départ enregistré à <span className="font-bold">{resultat.heure}</span></div>
          </div>
        )}

        {resultat?.type === 'deja_complet' && (
          <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-amber-300 mx-auto mb-2" />
            <div className="text-white font-bold text-lg">{resultat.personne.nom} {resultat.personne.postnom ? resultat.personne.postnom + ' ' : ''}{resultat.personne.prenom}</div>
            <div className="mt-2 text-amber-200 text-sm">Déjà pointé aujourd'hui (arrivée + départ).</div>
          </div>
        )}

        {resultat?.type === 'introuvable' && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-6 text-center">
            <X className="w-10 h-10 text-red-300 mx-auto mb-2" />
            <div className="text-white font-bold">Matricule introuvable</div>
            <div className="mt-1 text-red-200 text-sm">Vérifiez votre carte ou contactez l'administration.</div>
          </div>
        )}

        {scanError && !showScanner && <p className="text-center text-red-300 text-xs mt-3">{scanError}</p>}
      </div>
    </div>
  );
}
