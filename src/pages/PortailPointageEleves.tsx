import { useState, useEffect, useRef } from 'react';
import { QrCode, X, Loader2, CheckCircle2, LogIn, LogOut, UserCheck, Clock } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { usePublicSchool } from '../lib/hooks/usePublicSchool';
import { loadPointageConfig, statutAuto, type PointageConfig } from '../lib/hooks/usePointage';
import { parseScannedMatricule, isMatriculePlausible } from '../utils/ascii';

interface EleveInfo {
  id: string;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  section: string;
  classe: string | null;
  photo_url: string | null;
}

type Resultat =
  | { type: 'loading' }
  | { type: 'arrivee'; eleve: EleveInfo; heure: string }
  | { type: 'depart'; eleve: EleveInfo; heure: string }
  | { type: 'deja_complet'; eleve: EleveInfo }
  | { type: 'introuvable' }
  | null;

function heureActuelle(): string {
  return new Date().toTimeString().slice(0, 8);
}

export default function PortailPointageEleves() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [matriculeManuel, setMatriculeManuel] = useState('');
  const [resultat, setResultat] = useState<Resultat>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunning = useRef(false);
  const scannerDivId = 'qr-pointage-eleves';
  const { schoolId, schoolName, loading: schoolLoading } = usePublicSchool();
  const [config, setConfig] = useState<PointageConfig>({ heureEntree: '08:00', heureSortie: '16:30', tauxChange: null, seuilRetards: 3 });

  useEffect(() => {
    if (schoolId) { loadPointageConfig(schoolId).then(setConfig).catch(() => {}); }
  }, [schoolId]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scannerRunning.current = false;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 300, height: 300 }, aspectRatio: 1 },
        async (decodedText) => {
          if (!scannerRunning.current) return;
          scannerRunning.current = false;
          const m = parseScannedMatricule(decodedText);
          if (m && isMatriculePlausible(m)) {
            setShowScanner(false);
            setScanError('');
            await pointerEleve(m);
          } else if (m) {
            setScanError('Scan illisible (encodage). Configurez le lecteur en ASCII ou vérifiez le matricule.');
            scannerRunning.current = true;
          } else {
            setScanError('Aucun matricule valide trouvé.');
            scannerRunning.current = true;
          }
        },
        () => {}
      ).then(() => { scannerRunning.current = true; }).catch(() => setScanError("Erreur d'accès caméra."));
    }
    return () => {
      // Toujours arrêter la caméra au nettoyage (même après un scan réussi)
      const s = scannerRef.current;
      scannerRef.current = null;
      scannerRunning.current = false;
      if (s) {
        try { s.stop().catch(() => {}); } catch { /* scanner non démarré */ }
      }
    };
  }, [showScanner]);

  async function pointerEleve(matricule: string) {
    if (schoolLoading) return;
    if (!schoolId) { setScanError("Aucune école trouvée. Contactez l'administrateur."); return; }
    setLoading(true);
    setResultat({ type: 'loading' });

    try {
      const matriculeTrim = matricule.trim();
      // Recherche scoped école, puis repli global (matricules uniques)
      let { data: eleve } = await supabase
        .from('eleves')
        .select('id, matricule, nom, postnom, prenom, section, classe, photo_url')
        .eq('ecole_id', schoolId)
        .ilike('matricule', matriculeTrim)
        .maybeSingle();
      if (!eleve) {
        const { data: fb } = await supabase
          .from('eleves')
          .select('id, matricule, nom, postnom, prenom, section, classe, photo_url')
          .ilike('matricule', matriculeTrim)
          .maybeSingle();
        eleve = fb;
      }
      if (!eleve) { setResultat({ type: 'introuvable' }); return; }

      const info: EleveInfo = {
        id: eleve.id, matricule: eleve.matricule, nom: eleve.nom,
        postnom: eleve.postnom, prenom: eleve.prenom,
        section: eleve.section, classe: eleve.classe || null, photo_url: eleve.photo_url || null,
      };

      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from('pointages_eleves')
        .select('id, heure_arrivee, heure_depart')
        .eq('eleve_id', eleve.id)
        .eq('date_pointage', today)
        .maybeSingle();

      if (!existing) {
        const heureArrivee = heureActuelle();
        await supabase.from('pointages_eleves').insert({
          ecole_id: schoolId, eleve_id: eleve.id, date_pointage: today,
          heure_arrivee: heureArrivee, statut: statutAuto(heureArrivee, config),
        });
        setResultat({ type: 'arrivee', eleve: info, heure: heureActuelle() });
      } else if (!existing.heure_depart) {
        await supabase.from('pointages_eleves').update({ heure_depart: heureActuelle() }).eq('id', existing.id);
        setResultat({ type: 'depart', eleve: info, heure: heureActuelle() });
      } else {
        setResultat({ type: 'deja_complet', eleve: info });
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
    const m = parseScannedMatricule(matriculeManuel);
    if (!m) { setScanError('Matricule invalide.'); return; }
    if (!isMatriculePlausible(m)) { setScanError('Scan illisible (encodage). Configurez le lecteur en ASCII ou vérifiez le matricule.'); return; }
    await pointerEleve(m);
    setMatriculeManuel('');
  }

  const statutArrivee = statutAuto(heureActuelle(), config);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-white/80 text-sm mb-4">
            <UserCheck className="w-4 h-4" />
            Portail de Pointage — Élèves
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{schoolName || 'ÉCOLE'}</h1>
          <p className="text-white/60 text-sm">Scannez la carte d'élève pour pointer (arrivée / départ)</p>
          <p className="text-white/40 text-xs mt-1">Heure d'entrée : <span className="text-indigo-300 font-semibold">{config.heureEntree}</span> · après cette heure = Retard</p>
        </div>

        <button
          onClick={() => { setResultat(null); setScanError(''); setShowScanner(true); }}
          className="w-full flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-4 rounded-xl mb-4 shadow-lg transition-colors"
        >
          <QrCode className="w-6 h-6" /> Scanner la carte de l'élève
        </button>

        <form onSubmit={pointerManuel} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <p className="text-white/50 text-xs mb-2">Ou saisissez / collez le matricule (même avec d'autres informations, seul le matricule est reconnu)</p>
          <div className="flex gap-2">
            <input
              value={matriculeManuel}
              onChange={e => setMatriculeManuel(e.target.value)}
              placeholder="Matricule (ex : GAP-...)"
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-lg">Pointer</button>
          </div>
        </form>

        {showScanner && (
          <div className="bg-black rounded-xl overflow-hidden mb-4 shadow-2xl">
            <div id={scannerDivId} className="w-full" style={{ minHeight: 280 }} />
          </div>
        )}
        {scanError && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm mb-4">{scanError}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="text-white/60">Pointage en cours...</span>
          </div>
        )}

        {resultat && !loading && resultat.type !== 'loading' && (
          <div className="mt-4 space-y-4">
            {resultat.type === 'arrivee' && (
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-6 text-center animate-in">
                <LogIn className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-emerald-300 mb-1">ARRIVÉE ENREGISTRÉE</h2>
                <p className="text-emerald-200/80 text-sm">À {resultat.heure.slice(0, 5)} · {statutArrivee === 'retard' ? 'Retard' : 'Présent'}</p>
              </div>
            )}
            {resultat.type === 'depart' && (
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl p-6 text-center animate-in">
                <LogOut className="w-14 h-14 text-blue-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-blue-300 mb-1">DÉPART ENREGISTRÉ</h2>
                <p className="text-blue-200/80 text-sm">À {resultat.heure.slice(0, 5)} — Bonne fin de journée</p>
              </div>
            )}
            {resultat.type === 'deja_complet' && (
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-6 text-center animate-in">
                <Clock className="w-14 h-14 text-amber-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-amber-300 mb-1">POINTAGE DÉJÀ COMPLET</h2>
                <p className="text-amber-200/80 text-sm">Arrivée et départ déjà enregistrés aujourd'hui.</p>
              </div>
            )}
            {resultat.type === 'introuvable' && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-6 text-center animate-in">
                <X className="w-14 h-14 text-red-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-red-300 mb-1">MATRICULE INTROUVABLE</h2>
              </div>
            )}

            {(resultat.type === 'arrivee' || resultat.type === 'depart' || resultat.type === 'deja_complet') && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  {resultat.eleve.photo_url ? (
                    <img src={resultat.eleve.photo_url} className="w-14 h-14 rounded-xl object-cover border-2 border-white/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-white text-xl font-bold">
                      {resultat.eleve.nom.charAt(0)}{resultat.eleve.prenom.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{resultat.eleve.nom} {resultat.eleve.postnom ? resultat.eleve.postnom + ' ' : ''}{resultat.eleve.prenom}</h3>
                    <p className="text-white/50 text-sm">{resultat.eleve.matricule}</p>
                    <p className="text-white/60 text-sm">{resultat.eleve.section}{resultat.eleve.classe ? ' · Classe ' + resultat.eleve.classe : ''}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => { setResultat(null); setScanError(''); }}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Pointer un autre élève
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
