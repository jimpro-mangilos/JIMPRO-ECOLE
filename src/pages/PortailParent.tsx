import { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, Phone, MapPin, DollarSign, FileText, Package, Loader2, School, ChevronRight, QrCode, X, BookOpen, Upload } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../utils/calculations';

interface EleveInfo {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  section: string;
  option: string | null;
  classe: string | null;
  classe_id: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  domicile: string | null;
  responsable: string;
  telephone: string;
}

interface PaiementInfo {
  id: string;
  numero_recu: string;
  montant_paye: number;
  montant_en_lettre: string;
  mode_paiement: string;
  date_paiement: string;
  motif_libelle: string;
  annee_scolaire: string | null;
  type_paiement: string;
  nom_comptable: string;
  nom_encaisseur: string | null;
  est_encaisse: boolean;
}

interface CoursInfo { id: string; titre: string; description: string; fichier_url: string | null; fichier_nom: string | null; created_at: string; }
interface DevoirInfo { id: string; titre: string; description: string; date_limite: string | null; fichier_url: string | null; fichier_nom: string | null; created_at: string; }

export default function PortailParent() {
  const [matricule, setMatricule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [paiements, setPaiements] = useState<PaiementInfo[]>([]);
  const [totalPaye, setTotalPaye] = useState(0);
  const [cours, setCours] = useState<CoursInfo[]>([]);
  const [devoirs, setDevoirs] = useState<DevoirInfo[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-reader';

  // QR Scanner lifecycle
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        { fps: 15, qrbox: { width: 350, height: 350 }, aspectRatio: 1 },
        (decodedText) => {
          // Extract matricule: text starting with "GA" until "|"
          const match = decodedText.match(/GA[^|]*/i);
          if (match) {
            const matriculeExtrait = match[0].toUpperCase();
            setMatricule(matriculeExtrait);
            setShowScanner(false);
            setScanError('');
            // Auto-trigger search
            setTimeout(() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              handleSearchWithMatricule(matriculeExtrait, fakeEvent);
            }, 300);
          } else {
            setScanError('Aucun matricule valide (GA...) trouve dans ce QR code.');
          }
        },
        () => { /* ignore scan errors */ }
      ).catch((err) => {
        console.error('Scanner error:', err);
        setScanError('Erreur d\'acces a la camera. Verifiez les permissions.');
      });
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const handleSearchWithMatricule = async (term: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTerm = term.trim().toUpperCase();
    if (!cleanTerm) {
      setError('Veuillez entrer un matricule');
      return;
    }
    setLoading(true);
    setError('');
    setEleve(null);
    setPaiements([]);

    try {
      const { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('*')
        .ilike('matricule', cleanTerm)
        .maybeSingle();

      if (eleveError) throw eleveError;
      if (!eleveData) {
        setError('Aucun eleve trouve avec ce matricule. Verifiez et reessayez.');
        setLoading(false);
        return;
      }

      setEleve(eleveData as EleveInfo);

      const { data: paiementsData, error: paiementsError } = await supabase
        .from('paiements')
        .select('*')
        .eq('eleve_id', eleveData.id)
        .order('date_paiement', { ascending: false });

      if (paiementsError) throw paiementsError;

      const payments = (paiementsData || []) as PaiementInfo[];
      setPaiements(payments);
      setTotalPaye(payments.reduce((sum, p) => sum + Number(p.montant_paye), 0));

      // Fetch cours and devoirs for student's class
      const classeId = (eleveData as any).classe_id;
      if (classeId) {
        const [{ data: coursData }, { data: devoirsData }] = await Promise.all([
          supabase.from('cours').select('id, titre, description, fichier_url, fichier_nom, created_at').eq('classe_id', classeId).order('created_at', { ascending: false }),
          supabase.from('devoirs').select('id, titre, description, date_limite, fichier_url, fichier_nom, created_at').eq('classe_id', classeId).order('created_at', { ascending: false }),
        ]);
        setCours((coursData || []) as CoursInfo[]);
        setDevoirs((devoirsData || []) as DevoirInfo[]);
      }
    } catch (err: any) {
      console.error('Erreur recherche:', err);
      setError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSearchWithMatricule(matricule, e);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">JIMPRO</h1>
              <p className="text-xs text-gray-500">Portail Parent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero / Search */}
        {!eleve && (
          <div className="text-center mb-12 pt-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Portail Élève</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Entrez votre matricule pour consulter vos paiements, cours et devoirs.
            </p>

            <form onSubmit={handleSearch} className="max-w-md mx-auto">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => { setMatricule(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="Ex: MAT2025-001"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 font-mono text-lg tracking-wider placeholder:text-gray-400 transition-all"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {loading ? 'Recherche...' : 'Verifier'}
                </button>
              </div>

              {/* QR Code Scanner button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => { setShowScanner(true); setScanError(''); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all text-sm font-medium"
                >
                  <QrCode className="w-5 h-5" />
                  Scanner un QR Code
                </button>
              </div>

              {/* QR Scanner modal */}
              {showScanner && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        Scanner le QR Code
                      </h3>
                      <button
                        onClick={() => { setShowScanner(false); setScanError(''); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div id={scannerDivId} className="w-full aspect-square rounded-xl overflow-hidden bg-black" />
                      {scanError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {scanError}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 text-center mt-3">
                        Placez le QR Code dans le cadre. Le matricule sera extrait automatiquement.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2 max-w-md mx-auto">
                  <span className="text-red-500">⚠</span> {error}
                </div>
              )}

        {/* Student found */}
        {eleve && (
          <div className="space-y-6 animate-fadeIn">
            {/* Back button */}
            <button
              onClick={() => { setEleve(null); setMatricule(''); setError(''); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Nouvelle recherche
            </button>

            {/* Student info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {eleve.prenom?.charAt(0)}{eleve.nom?.charAt(0)}
                  </div>
                  <div className="text-white flex-1">
                    <h3 className="text-xl font-bold">{eleve.nom} {eleve.postnom} {eleve.prenom}</h3>
                    <p className="text-blue-100 text-sm mt-0.5">Matricule : {eleve.matricule}</p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{eleve.section}</span>
                      {eleve.option && <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{eleve.option}</span>}
                      {eleve.classe && <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{eleve.classe}</span>}
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{eleve.sexe === 'M' ? 'Garçon' : 'Fille'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500">Responsable</span>
                    <p className="text-sm font-medium text-gray-900">{eleve.responsable}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500">Telephone</span>
                    <p className="text-sm font-medium text-gray-900">{eleve.telephone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500">Domicile</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{eleve.domicile || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total paye</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaye)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paiements</p>
                    <p className="text-lg font-bold text-blue-600">{paiements.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dernier paiement</p>
                    <p className="text-sm font-bold text-amber-600">
                      {paiements.length > 0 ? formatDate(paiements[0].date_paiement) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Historique des paiements
                </h3>
                <span className="text-xs text-gray-500">{paiements.length} paiement{paiements.length !== 1 ? 's' : ''}</span>
              </div>

              {paiements.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucun paiement enregistre pour cet eleve.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">N Reçu</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Motif</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Montant</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paiements.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-900">{p.numero_recu}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(p.date_paiement)}</td>
                          <td className="px-4 py-3 text-gray-700">{p.motif_libelle}</td>
                          <td className="px-4 py-3 text-gray-600">{p.mode_paiement}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{p.montant_paye.toLocaleString()} FC</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              p.est_encaisse ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {p.est_encaisse ? 'Paye' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/50 border-t border-gray-100">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{totalPaye.toLocaleString()} FC</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Cours & Devoirs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Cours & Devoirs
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {cours.length === 0 && devoirs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun cours ou devoir disponible pour votre classe.</p>
                ) : (
                  <>
                    {cours.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-500" /> Cours ({cours.length})
                        </h4>
                        <div className="space-y-2">
                          {cours.map(c => (
                            <div key={c.id} className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
                              <p className="text-sm font-medium text-gray-900">{c.titre}</p>
                              {c.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                                {c.fichier_url && (
                                  <a href={c.fichier_url} target="_blank" rel="noopener" className="text-purple-600 hover:underline flex items-center gap-1">
                                    <Upload className="w-3 h-3" /> {c.fichier_nom || 'Fichier'}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {devoirs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-500" /> Devoirs ({devoirs.length})
                        </h4>
                        <div className="space-y-2">
                          {devoirs.map(d => (
                            <div key={d.id} className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-medium text-gray-900">{d.titre}</p>
                                {d.date_limite && (
                                  <span className="text-xs text-amber-600 font-medium whitespace-nowrap ml-2">
                                    Avant le {new Date(d.date_limite).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                              {d.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>}
                              {d.fichier_url && (
                                <a href={d.fichier_url} target="_blank" rel="noopener" className="text-xs text-amber-600 hover:underline flex items-center gap-1 mt-1">
                                  <Upload className="w-3 h-3" /> {d.fichier_nom || 'Fichier'}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-400">
          Portail Parent JIMPRO — Consultation des paiements scolaires
        </div>
      </div>
    </div>
  );
}
