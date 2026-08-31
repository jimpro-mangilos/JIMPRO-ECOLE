import { useState, useEffect, useRef } from 'react';
import { QrCode, X, Search, Loader2, CheckCircle, XCircle, Calendar, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { parseScannedMatricule } from '../utils/ascii';
import { usePublicSchool } from '../lib/hooks/usePublicSchool';
import { formatDateTime } from '../utils/calculations';
import { jouerSonEnOrdre, jouerSonPasEnOrdre, jouerSonIntrouvable } from '../utils/sons';

// Préfixes de matricules du personnel (carte de service → portail de POINTAGE)
const PREFIXES_PERSONNEL = ['PGA', 'STF', 'PER'];

/** Détermine si un matricule appartient au personnel (carte de service). */
function estMatriculePersonnel(matricule: string): boolean {
  return PREFIXES_PERSONNEL.some(p => matricule.toUpperCase().startsWith(p));
}

// Mois scolaires (conformes au calendrier des paiements : Septembre → Juillet)
const MOIS = ['Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet'];
const CALENDRIER = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const _idxMoisCourant = MOIS.indexOf(CALENDRIER[new Date().getMonth()]);
// Hors période scolaire (ex : août) → premier mois de la nouvelle année scolaire (Septembre),
// sinon les élèves déjà à jour (année N-1/N) seraient affichés « PAS EN ORDRE ».
const currentMonthIdx = _idxMoisCourant >= 0 ? _idxMoisCourant : 0;
const MOIS_DEBUT_ANNEE = ['Septembre', 'Octobre', 'Novembre', 'Décembre'];
const anneeCourante = new Date().getFullYear();
const ANNEES = Array.from({ length: 8 }, (_, i) => anneeCourante - 1 + i); // 2025 → 2032
function anneeScolaireDepuis(mois: string, annee: number): string {
  return MOIS_DEBUT_ANNEE.includes(mois) ? `${annee}-${annee + 1}` : `${annee - 1}-${annee}`;
}

interface EleveInfo {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  section: string;
  classe: string | null;
  photo_url: string | null;
}

interface PaiementInfo {
  id: string;
  montant_paye: number;
  date_paiement: string;
  type_paiement: string;
  motif_libelle: string;
  statut: string;
  created_at: string | null;
}

type Resultat =
  | { type: 'loading' }
  | { type: 'en_ordre'; eleve: EleveInfo; paiement: PaiementInfo }
  | { type: 'pas_en_ordre'; eleve: EleveInfo }
  | { type: 'introuvable' }
  | null;

export default function PortailRecouvrement() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [month, setMonth] = useState(currentMonthIdx);
  const [year, setYear] = useState(anneeCourante);
  const [motifId, setMotifId] = useState<string>('');
  const [motifs, setMotifs] = useState<{ id: string; libelle: string }[]>([]);
  const [resultat, setResultat] = useState<Resultat>(null);
  const [loading, setLoading] = useState(false);
  const [matriculeInput, setMatriculeInput] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunning = useRef(false);
  const scannerDivId = 'qr-recouvrement';
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef('');
  const scanLastKey = useRef(0);
  const { schoolId, schoolName, loading: schoolLoading } = usePublicSchool();

  // Écouteur global : le lecteur de codes-barres physique agit comme un clavier
  // qui « tape » le contenu du QR très vite puis Entrée. On capture ces frappes
  // où que soit le focus dans la page (pas seulement dans le champ de recherche),
  // pour que le scan fonctionne de façon fiable et rapide.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore si l'utilisateur tape réellement dans un champ (comportement normal)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();
      // Une rafale du lecteur : touches séparées de moins de 60 ms
      if (now - scanLastKey.current > 60) scanBuffer.current = '';
      scanLastKey.current = now;

      if (e.key === 'Enter') {
        const raw = scanBuffer.current;
        scanBuffer.current = '';
        if (!raw.trim()) return;
        const matricule = parseScannedMatricule(raw);
        if (matricule) {
          e.preventDefault();
          if (estMatriculePersonnel(matricule)) {
            // Carte de service (personnel) → le bon portail est le POINTAGE
            window.location.href = '/portail-pointage';
            return;
          }
          verifierMatricule(matricule);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBuffer.current += e.key;
        // Limite de sécurité si ce n'est pas un lecteur (saisie clavier normale)
        if (scanBuffer.current.length > 120) scanBuffer.current = '';
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, schoolLoading]);

  // Load motifs and annees on mount (scoped by school)
  useEffect(() => {
    if (!schoolId) return;
    supabase.from('motifs_paiement').select('id, libelle').eq('ecole_id', schoolId).eq('is_active', true).order('ordre').then((r: any) => {
      if (r.data) setMotifs(r.data);
    });
  }, [schoolId]);

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
          const matriculeExtrait = parseScannedMatricule(decodedText);
          if (matriculeExtrait) {
            setShowScanner(false);
            setScanError('');
            await verifierMatricule(matriculeExtrait);
          } else {
            setScanError('Aucun matricule valide trouvé.');
          }
        },
        () => {}
      ).then(() => { scannerRunning.current = true; }).catch(() => setScanError("Erreur d'accès caméra."));
    }
    return () => {
      // stop() lève une erreur synchrone si le scanner n'a jamais démarré (ex : caméra refusée) —
      // on ne l'appelle donc que si le scan a réellement démarré, et on protège l'appel.
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && scannerRunning.current) {
        scannerRunning.current = false;
        try { s.stop().catch(() => {}); } catch { /* scanner non démarré */ }
      }
    };
  }, [showScanner, month]);

  // Son de retour selon le statut de la recherche (EN ORDRE / PAS EN ORDRE / introuvable)
  useEffect(() => {
    if (!resultat || loading) return;
    if (resultat.type === 'en_ordre') jouerSonEnOrdre();
    else if (resultat.type === 'pas_en_ordre') jouerSonPasEnOrdre();
    else if (resultat.type === 'introuvable') jouerSonIntrouvable();
  }, [resultat, loading]);

  const moisActuel = MOIS[month];

  async function verifierMatricule(matricule: string) {
    if (schoolLoading) return; // attente résolution école
    if (!schoolId) {
      setScanError('Aucune école trouvée. Contactez l\'administrateur.');
      return;
    }
    // Carte de SERVICE (personnel) scannée sur le mauvais portail →
    // on redirige automatiquement vers le portail de pointage.
    if (estMatriculePersonnel(matricule)) {
      window.location.href = '/portail-pointage';
      return;
    }
    // Réinitialise la barre de recherche après chaque scan/saisie :
    // permet des vérifications continues et rapides (scanne → vide → scanne).
    setMatriculeInput('');
    setLoading(true);
    setResultat({ type: 'loading' });

    try {
      // Find student — insensible à la casse, scoped par école (avec repli sans école)
      const matriculeTrim = matricule.trim();
      let { data: eleve } = await supabase
        .from('eleves')
        .select('*')
        .eq('ecole_id', schoolId)
        .ilike('matricule', matriculeTrim)
        .maybeSingle();
      if (!eleve) {
        // Repli : matricules globalement uniques → recherche sans filtre école
        const { data: fallback } = await supabase
          .from('eleves')
          .select('*')
          .ilike('matricule', matriculeTrim)
          .maybeSingle();
        eleve = fallback;
      }
      if (!eleve) { setResultat({ type: 'introuvable' }); return; }

      const info: EleveInfo = {
        matricule: eleve.matricule, nom: eleve.nom, postnom: eleve.postnom, prenom: eleve.prenom,
        section: eleve.section, classe: (eleve as any).classe || null, photo_url: (eleve as any).photo_url || null,
      };

      // Check payment for selected month, motif and année.
      // L'élève peut avoir été retrouvé via le repli dans une AUTRE école que celle résolue
      // par le portail (ex : portail sur CSES, élève de CSGA) → on filtre par l'école RÉELLE
      // de l'élève (eleve.ecole_id), sinon son paiement ne serait jamais trouvé.
      const eleveEcoleId = (eleve as any).ecole_id || schoolId;
      let query = supabase.from('paiements')
        .select('*')
        .eq('ecole_id', eleveEcoleId)
        .eq('eleve_id', eleve.id)
        .eq('mois_minerval', moisActuel)
        // Un paiement « en_attente » est déjà effectué (seuls les paiements annulés
        // ne comptent pas) — cohérent avec PaymentFormModal.fetchPaidMonths.
        .neq('statut', 'annule')
        .order('created_at', { ascending: false });
      query = query.eq('annee_scolaire', anneeScolaireDepuis(moisActuel, year));
      if (motifId) {
        // Les paiements de minerval ont motif_id NULL (le mois est dans mois_minerval) :
        // le filtre par motif doit donc se faire sur le LIBELLÉ (motif_libelle), pas sur motif_id.
        const motif = motifs.find(m => m.id === motifId);
        if (motif) query = query.eq('motif_libelle', motif.libelle.trim());
      }
      const { data: paiement } = await query.maybeSingle();

      if (paiement) {
        setResultat({ type: 'en_ordre', eleve: info, paiement: {
          id: paiement.id, montant_paye: paiement.montant_paye, date_paiement: paiement.date_paiement,
          type_paiement: paiement.type_paiement, motif_libelle: paiement.motif_libelle || '', statut: paiement.statut,
          created_at: paiement.created_at,
        }});
      } else {
        setResultat({ type: 'pas_en_ordre', eleve: info });
      }
    } catch (err) {
      console.error(err);
      setScanError('Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-white/80 text-sm mb-4">
            <QrCode className="w-4 h-4" />
            Portail de Recouvrement
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{schoolName || 'GOLDEN ACADEMY'}</h1>
          <p className="text-white/60 text-sm">Scannez une carte étudiant pour vérifier le statut de paiement</p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-3">
          {/* Mois + Année (séparés) */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/50" />
            <select value={month} onChange={e => { setMonth(Number(e.target.value)); setResultat(null); }}
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none cursor-pointer">
              {MOIS.map((m, i) => (
                <option key={m} value={i} className="bg-slate-800 text-white">{m}</option>
              ))}
            </select>
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setResultat(null); }}
              className="w-24 bg-transparent text-white text-sm font-medium outline-none cursor-pointer">
              {ANNEES.map(y => (<option key={y} value={y} className="bg-slate-800 text-white">{y}</option>))}
            </select>
          </div>
          {/* Motif */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">Motif</span>
            <select value={motifId} onChange={e => { setMotifId(e.target.value); setResultat(null); }}
              className="flex-1 bg-transparent text-white text-sm outline-none cursor-pointer">
              <option value="" className="bg-slate-800">Tous les motifs</option>
              {motifs.map(m => (<option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.libelle}</option>))}
            </select>
          </div>
        </div>

        {/* Scan button or result */}
        {!resultat && (
          <button
            onClick={() => { setShowScanner(!showScanner); setResultat(null); setScanError(''); }}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg ${
              showScanner ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white hover:bg-gray-50 text-slate-800'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {showScanner ? <X className="w-6 h-6" /> : <QrCode className="w-6 h-6" />}
              {showScanner ? 'Fermer le scanner' : 'Scanner une carte'}
            </span>
          </button>
        )}

        {/* Scanner */}
        {showScanner && (
          <div className="bg-black rounded-xl overflow-hidden mb-4 shadow-2xl">
            <div id={scannerDivId} className="w-full" style={{ minHeight: 300 }} />
          </div>
        )}
        {scanError && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm mb-4">{scanError}</div>
        )}

        {/* Manual matricule input */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 mt-4">
          <Search className="w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={matriculeInput}
            onChange={e => setMatriculeInput(e.target.value)}
            placeholder="Scannez ou entrez un matricule (GA...)"
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && matriculeInput.trim()) {
                // Même traitement que le scan QR : si plusieurs types de caractères sont
                // saisis (QR complet collé, texte, espaces, accents…), on n'extrait que
                // le matricule (A-Z, 0-9, tirets).
                const matricule = parseScannedMatricule(matriculeInput);
                if (matricule) await verifierMatricule(matricule);
                else setScanError('Aucun matricule valide trouvé.');
              }
            }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Carte de service (personnel) ? Vous serez redirigé automatiquement vers le portail de pointage.
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="text-white/60">Vérification en cours...</span>
          </div>
        )}

        {/* Result */}
        {resultat && !loading && (
          <div className="mt-4 space-y-4">
            {resultat.type === 'en_ordre' && (
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-6 text-center animate-in">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-emerald-300 mb-1">EN ORDRE</h2>
                <p className="text-emerald-200/80 text-sm">Paiement confirmé pour {moisActuel} {year}</p>
              </div>
            )}

            {resultat.type === 'pas_en_ordre' && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-6 text-center animate-in">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-red-300 mb-1">PAS EN ORDRE</h2>
                <p className="text-red-200/80 text-sm">Aucun paiement trouvé pour {moisActuel} {year}</p>
              </div>
            )}

            {resultat.type === 'introuvable' && (
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-6 text-center animate-in">
                <XCircle className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                <p className="text-amber-300">Matricule introuvable</p>
              </div>
            )}

            {(resultat.type === 'en_ordre' || resultat.type === 'pas_en_ordre') && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-4">
                  {resultat.eleve.photo_url ? (
                    <img src={resultat.eleve.photo_url} className="w-16 h-16 rounded-xl object-cover border-2 border-white/20" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-white text-2xl font-bold">
                      {resultat.eleve.nom.charAt(0)}{resultat.eleve.prenom.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{resultat.eleve.nom} {resultat.eleve.postnom} {resultat.eleve.prenom}</h3>
                    <p className="text-white/50 text-sm">{resultat.eleve.matricule}</p>
                    <p className="text-white/60 text-sm">{resultat.eleve.section}{resultat.eleve.classe ? ` · ${resultat.eleve.classe}` : ''}</p>
                  </div>
                </div>

                {resultat.type === 'en_ordre' && (
                  <div className="bg-emerald-500/10 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-white/40">Montant</span><p className="text-white font-bold">{resultat.paiement.montant_paye.toLocaleString()} FC</p></div>
                    <div><span className="text-white/40">Date</span><p className="text-white">{new Date(resultat.paiement.date_paiement).toLocaleDateString('fr-FR')}</p></div>
                    <div><span className="text-white/40">Type</span><p className="text-white">{resultat.paiement.type_paiement}</p></div>
                    <div><span className="text-white/40">Motif</span><p className="text-white">{resultat.paiement.motif_libelle || '—'}</p></div>
                    <div className="col-span-2"><span className="text-white/40">Horodatage</span><p className="text-white">{(resultat.paiement.created_at || resultat.paiement.date_paiement) ? formatDateTime(resultat.paiement.created_at || resultat.paiement.date_paiement) : '-'}</p></div>
                  </div>
                )}

                {resultat.type === 'pas_en_ordre' && (
                  <p className="text-white/50 text-sm text-center py-2">
                    Cet élève n'a pas encore effectué son paiement pour le mois de <strong className="text-white">{moisActuel} {year}</strong>.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => { setResultat(null); setScanError(''); setMatriculeInput(''); }}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Vérifier un autre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}