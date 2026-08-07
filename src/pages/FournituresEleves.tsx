import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Search, Package, X, Loader2, Users, Trash2, RotateCcw, Calendar, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import UniformeFormModal from '../components/UniformeFormModal';
import MultiSelectFilter from '../components/MultiSelectFilter';

type Eleve = Database['public']['Tables']['eleves']['Row'];

interface DistributionUniforme {
  id: string;
  eleve_id: string;
  matricule: string;
  nom_eleve: string;
  postnom: string;
  prenom: string;
  section: string;
  classe: string;
  type_uniforme_id: string | null;
  type_uniforme_libelle: string;
  quantite: number;
  annee_scolaire: string | null;
  notes: string | null;
  nom_comptable: string;
  date_distribution: string;
  created_at: string;
}

export default function FournituresEleves() {
  const { isReadOnly, isItManager, isGestionnaireUniforme } = useAuth();
  const [distributions, setDistributions] = useState<DistributionUniforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterAnnees, setFilterAnnees] = useState<string[]>([]);
  const [filterSections, setFilterSections] = useState<string[]>([]);
  const [filterClasses, setFilterClasses] = useState<string[]>([]);
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');

  const [showEleveSelector, setShowEleveSelector] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [showUniformeForm, setShowUniformeForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunning = useRef(false);
  const scannerDivId = 'qr-scanner-fournitures-main';

  useEffect(() => {
    loadDistributions();

    const channel = supabase
      .channel('fournitures-eleves-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gestion_uniformes' }, () => {
        loadDistributions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // QR Scanner — scans eleve matricule and opens uniforme form
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scannerRunning.current = false;
      scanner.start(
        { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        { fps: 15, qrbox: { width: 350, height: 350 }, aspectRatio: 1, showTorchButtonIfSupported: true, showZoomSliderIfSupported: true, rememberLastUsedCamera: true },
        async (decodedText) => {
          scannerRunning.current = false;
          const match = decodedText.match(/GA[^|]*/i);
          if (match) {
            const matriculeExtrait = match[0].toUpperCase();
            setShowScanner(false);
            setScanError('');
            const { data } = await supabase.from('eleves').select('*').ilike('matricule', matriculeExtrait).maybeSingle();
            if (data) {
              setSelectedEleve(data);
              setShowUniformeForm(true);
            } else {
              setScanError('Aucun eleve trouve avec le matricule ' + matriculeExtrait);
            }
          } else {
            setScanError('Aucun matricule valide (GA...) trouve.');
          }
        },
        () => {}
      ).then(() => { scannerRunning.current = true; }).catch(() => setScanError("Erreur d'acces camera. Verifiez les permissions."));
    }
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && scannerRunning.current) {
        scannerRunning.current = false;
        s.stop().catch(() => {});
      }
    };
  }, [showScanner]);

  const loadDistributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gestion_uniformes')
        .select('*')
        .order('date_distribution', { ascending: false });

      if (error) throw error;
      setDistributions((data as DistributionUniforme[]) || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDistributionSuccess = () => {
    loadDistributions();
    setShowUniformeForm(false);
    setSelectedEleve(null);
  };

  const types = useMemo(() => {
    const set = new Map<string, string>();
    distributions.forEach(d => {
      if (d.type_uniforme_libelle) set.set(d.type_uniforme_libelle, d.type_uniforme_libelle);
    });
    return Array.from(set.values()).sort();
  }, [distributions]);

  const annees = useMemo(() => {
    const set = new Set<string>();
    distributions.forEach(d => { if (d.annee_scolaire) set.add(d.annee_scolaire); });
    return Array.from(set).sort().reverse();
  }, [distributions]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    distributions.forEach(d => { if (d.section) set.add(d.section); });
    return Array.from(set).sort();
  }, [distributions]);

  const classesList = useMemo(() => {
    const set = new Set<string>();
    distributions.forEach(d => { if (d.classe) set.add(d.classe); });
    return Array.from(set).sort();
  }, [distributions]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return distributions.filter(d => {
      if (filterTypes.length > 0 && !filterTypes.includes(d.type_uniforme_libelle)) return false;
      if (filterAnnees.length > 0 && (!d.annee_scolaire || !filterAnnees.includes(d.annee_scolaire))) return false;
      if (filterSections.length > 0 && !filterSections.includes(d.section)) return false;
      if (filterClasses.length > 0 && !filterClasses.includes(d.classe)) return false;
      if (filterDateDebut) {
        const created = new Date(d.created_at).toLocaleDateString('fr-CA');
        if (created < filterDateDebut) return false;
      }
      if (filterDateFin) {
        const created = new Date(d.created_at).toLocaleDateString('fr-CA');
        if (created > filterDateFin) return false;
      }
      if (term) {
        const haystack = `${d.matricule} ${d.nom_eleve} ${d.postnom} ${d.prenom} ${d.classe}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [distributions, searchTerm, filterTypes, filterAnnees, filterSections, filterClasses, filterDateDebut, filterDateFin]);

  const totalDistributions = filtered.length;
  const totalArticles = filtered.reduce((sum, d) => sum + d.quantite, 0);
  const elevesUniques = new Set(filtered.map(d => d.eleve_id)).size;

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isItManager()) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${ids.length} distribution(s) de fournitures élèves.\n\nCette action est irréversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('gestion_uniformes')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setSelectedIds(new Set());
      loadDistributions();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression multiple: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fournitures Élèves</h1>
          <p className="text-gray-600 mt-1">Distributions d'uniformes aux élèves (gratuit)</p>
        </div>
        <div className="flex items-center gap-3">
          {(!isReadOnly() || isGestionnaireUniforme()) && (
            <button
              onClick={() => { setShowScanner(!showScanner); setScanError(''); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                showScanner ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
              }`}
            >
              <QrCode className="w-5 h-5" />
              Scanner QR
            </button>
          )}
          {(!isReadOnly() || isGestionnaireUniforme()) && (
            <button
              onClick={() => setShowEleveSelector(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Nouvelle distribution
            </button>
          )}
        </div>
      </div>

      {scanError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{scanError}</div>
      )}
      {showScanner && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-3">Scannez le QR code de l'élève pour distribuer un uniforme</p>
          <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total distributions</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{totalDistributions}</p>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Articles distribués</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{totalArticles}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Élèves servis</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{elevesUniques}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule ou classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 py-2 outline-none text-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <MultiSelectFilter
              label="Articles"
              placeholder="Tous articles"
              options={types}
              selected={filterTypes}
              onChange={setFilterTypes}
            />
            <MultiSelectFilter
              label="Sections"
              placeholder="Toutes sections"
              options={sections}
              selected={filterSections}
              onChange={setFilterSections}
            />
            <MultiSelectFilter
              label="Classes"
              placeholder="Toutes classes"
              options={classesList}
              selected={filterClasses}
              onChange={setFilterClasses}
            />
            <MultiSelectFilter
              label="Années scolaires"
              placeholder="Toutes années"
              options={annees}
              selected={filterAnnees}
              onChange={setFilterAnnees}
            />
          </div>

          <div className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
                  <input
                    type="date"
                    value={filterDateDebut}
                    onChange={(e) => setFilterDateDebut(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
                  <input
                    type="date"
                    value={filterDateFin}
                    onChange={(e) => setFilterDateFin(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTypes([]);
                setFilterAnnees([]);
                setFilterSections([]);
                setFilterClasses([]);
                setFilterDateDebut('');
                setFilterDateFin('');
              }}
              disabled={!searchTerm && filterTypes.length === 0 && filterAnnees.length === 0 && filterSections.length === 0 && filterClasses.length === 0 && !filterDateDebut && !filterDateFin}
              className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isItManager() && selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {selectedIds.size} distribution(s) sélectionnée(s)
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {bulkDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isItManager() && (
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      title="Tout sélectionner"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Élève</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Classe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Section</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Article</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qté</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Année</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Comptable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={isItManager() ? 10 : 9} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isItManager() ? 10 : 9} className="px-6 py-8 text-center text-gray-500">Aucune distribution trouvée</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(d.id) ? 'bg-red-50' : ''}`}>
                    {isItManager() && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelectOne(d.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(d.date_distribution).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{d.nom_eleve} {d.postnom} {d.prenom}</div>
                      <div className="text-xs text-gray-500">{d.matricule}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.classe || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.section || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-800 text-sm font-medium rounded-full">
                        <Package className="w-3.5 h-3.5" />
                        {d.type_uniforme_libelle}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{d.quantite}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.annee_scolaire || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 italic">{d.notes || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.nom_comptable || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEleveSelector && (
        <EleveSelectorModal
          onClose={() => setShowEleveSelector(false)}
          onSelect={(eleve) => {
            setSelectedEleve(eleve);
            setShowEleveSelector(false);
            setShowUniformeForm(true);
          }}
        />
      )}

      {showUniformeForm && selectedEleve && (
        <UniformeFormModal
          isOpen={showUniformeForm}
          onClose={() => {
            setShowUniformeForm(false);
            setSelectedEleve(null);
          }}
          onSuccess={handleDistributionSuccess}
          eleve={selectedEleve}
        />
      )}
    </div>
  );
}

interface EleveSelectorModalProps {
  onClose: () => void;
  onSelect: (eleve: Eleve) => void;
}

function EleveSelectorModal({ onClose, onSelect }: EleveSelectorModalProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunning2 = useRef(false);
  const scannerDivId = 'qr-scanner-fournitures';

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('eleves')
          .select('*')
          .order('nom', { ascending: true });
        if (error) throw error;
        setEleves(data || []);
      } catch (err) {
        console.error('Erreur chargement élèves:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // QR Scanner lifecycle
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      scannerRunning2.current = false;
      scanner.start(
        { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        { fps: 15, qrbox: { width: 350, height: 350 }, aspectRatio: 1, showTorchButtonIfSupported: true, showZoomSliderIfSupported: true, rememberLastUsedCamera: true },
        (decodedText) => {
          scannerRunning2.current = false;
          const match = decodedText.match(/GA[^|]*/i);
          if (match) {
            const matriculeExtrait = match[0].toUpperCase();
            setSearch(matriculeExtrait);
            setShowScanner(false);
            setScanError('');
            setTimeout(() => {
              const found = eleves.filter(e => e.matricule.toUpperCase().includes(matriculeExtrait));
              if (found.length === 1) onSelect(found[0]);
            }, 200);
          } else {
            setScanError('Aucun matricule valide (GA...) trouvé dans ce QR code.');
          }
        },
        () => {}
      ).then(() => { scannerRunning2.current = true; }).catch(() => {
        setScanError("Erreur d'accès à la caméra. Vérifiez les permissions.");
      });
    }
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && scannerRunning2.current) {
        scannerRunning2.current = false;
        s.stop().catch(() => {});
      }
    };
  }, [showScanner, eleves, onSelect]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return eleves;
    return eleves.filter(e =>
      `${e.matricule} ${e.nom} ${e.postnom} ${e.prenom} ${(e as any).classe || ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [eleves, search]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choisir un élève</h2>
            <p className="text-sm text-gray-500">Sélectionnez l'élève bénéficiaire de la distribution</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 flex-1">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus={!showScanner}
                type="text"
                placeholder="Rechercher par matricule, nom, prénom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 py-2 outline-none text-gray-700"
              />
            </div>
            <button
              onClick={() => { setShowScanner(!showScanner); setScanError(''); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showScanner ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              {showScanner ? 'Fermer' : 'Scanner'}
            </button>
          </div>
          {scanError && <p className="text-sm text-red-600">{scanError}</p>}
          {showScanner && (
            <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucun élève trouvé</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(e => (
                <button
                  key={e.id}
                  onClick={() => onSelect(e)}
                  className="text-left border border-gray-200 rounded-lg p-3 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{e.nom} {e.postnom} {e.prenom}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {e.matricule} • {(e as any).classe || e.section || '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
