import { useEffect, useState, useMemo } from 'react';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { Plus, Search, CreditCard as Edit, Trash2, Eye, Users, User, RefreshCw, Loader2, FileDown, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { calculateAverageAge } from '../utils/calculations';
import EleveDetailsModal from '../components/EleveDetailsModal';
import PaymentFormModal from '../components/PaymentFormModal';
import { generateMatricule, validateMatriculeUniqueness } from '../utils/matriculeGenerator';
import { generateElevesReport } from '../utils/pdfGenerator';
import { useAuth } from '../contexts/AuthContext';

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getCurrentMoisMinerval(): string {
  return MOIS_FR[new Date().getMonth()];
}

type Eleve = Database['public']['Tables']['eleves']['Row'];

interface Section {
  id: string;
  nom: string;
  is_active: boolean;
}

interface Option {
  id: string;
  nom: string;
  section_id: string;
  is_active: boolean;
}

interface Classe {
  id: string;
  nom: string;
  section_id: string;
  option_id: string | null;
  is_active: boolean;
}

export default function Eleves() {
  const { isReadOnly, isItManager } = useAuth();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string[]>([]);
  const [selectedClasse, setSelectedClasse] = useState<string[]>([]);
  const [filterOrdre, setFilterOrdre] = useState<'' | 'en_ordre' | 'pas_en_ordre'>('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [sortAlpha, setSortAlpha] = useState<'' | 'asc' | 'desc'>('');
  const [paidEleveIds, setPaidEleveIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [autoGenerateMatricule, setAutoGenerateMatricule] = useState(true);
  const [generatingMatricule, setGeneratingMatricule] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'M',
    lieu_naissance: '',
    date_naissance: '',
    section: '',
    option: '',
    classe: '',
    classe_id: '',
    responsable: '',
    telephone: '',
    domicile: '',
  });

  useEffect(() => {
    loadEleves();
    loadSectionsAndOptions();
    loadCurrentMonthPaidEleves();

    const channel = supabase
      .channel('eleves-paiements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        loadCurrentMonthPaidEleves();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentMonthPaidEleves = async () => {
    try {
      const currentMois = getCurrentMoisMinerval();
      const { data, error } = await supabase
        .from('paiements')
        .select('eleve_id')
        .eq('mois_minerval', currentMois)
        .eq('statut', 'encaisse');

      if (error) throw error;
      const ids = new Set((data || []).map((p: any) => p.eleve_id as string));
      setPaidEleveIds(ids);
    } catch (error) {
      console.error('Erreur chargement paiements mois:', error);
    }
  };

  const loadEleves = async () => {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEleves(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionsAndOptions = async () => {
    try {
      const [sectionsRes, optionsRes, classesRes] = await Promise.all([
        supabase.from('sections').select('id, nom, is_active').eq('is_active', true).order('ordre'),
        supabase.from('options').select('id, nom, section_id, is_active').eq('is_active', true).order('ordre'),
        supabase.from('classes').select('id, nom, section_id, option_id, is_active').eq('is_active', true).order('ordre'),
      ]);

      if (sectionsRes.error) throw sectionsRes.error;
      if (optionsRes.error) throw optionsRes.error;
      if (classesRes.error) throw classesRes.error;

      setSections(sectionsRes.data || []);
      setOptions(optionsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedEleve) {
        const isUnique = await validateMatriculeUniqueness(formData.matricule);
        if (!isUnique) {
          alert('Ce matricule existe déjà. Veuillez en générer un nouveau ou en saisir un différent.');
          return;
        }
      }

      const classe = classes.find(c => c.id === formData.classe_id);
      const dataToSave = {
        ...formData,
        classe: classe?.nom || formData.classe,
        classe_id: formData.classe_id || null,
      };

      if (selectedEleve) {
        const { error } = await supabase
          .from('eleves')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', selectedEleve.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('eleves')
          .insert([dataToSave]);
        if (error) {
          if (error.code === '23505') {
            alert('Ce matricule existe déjà. Veuillez régénérer un nouveau matricule.');
            return;
          }
          throw error;
        }
      }
      setShowModal(false);
      resetForm();
      loadEleves();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { count } = await supabase
        .from('paiements')
        .select('id', { count: 'exact', head: true })
        .eq('eleve_id', id);

      const msg = count && count > 0
        ? `ATTENTION : Cet élève possède ${count} paiement(s).\n\nSupprimer cet élève effacera aussi tout son historique de paiements. Cette action est irréversible.\n\nContinuer ?`
        : 'Êtes-vous sûr de vouloir supprimer cet élève ? Cette action est irréversible.';

      if (!confirm(msg)) return;

      const { error } = await supabase.from('eleves').delete().eq('id', id);
      if (error) throw error;
      loadEleves();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression : ' + (error.message || 'Erreur inconnue'));
    }
  };

  const resetForm = () => {
    setFormData({
      matricule: '',
      nom: '',
      postnom: '',
      prenom: '',
      sexe: 'M',
      lieu_naissance: '',
      date_naissance: '',
      section: '',
      option: '',
      classe: '',
      classe_id: '',
      responsable: '',
      telephone: '',
      domicile: '',
    });
    setSelectedEleve(null);
    setAutoGenerateMatricule(true);
  };

  const handleGenerateMatricule = async (section: string) => {
    if (!section || !autoGenerateMatricule || selectedEleve) return;

    setGeneratingMatricule(true);
    try {
      const result = await generateMatricule(section);
      if (result.isUnique && result.matricule) {
        setFormData(prev => ({ ...prev, matricule: result.matricule }));
      } else {
        alert('Impossible de générer un matricule unique. Veuillez réessayer ou saisir manuellement.');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du matricule:', error);
      alert('Erreur lors de la génération du matricule');
    } finally {
      setGeneratingMatricule(false);
    }
  };

  const handleSectionChange = (section: string) => {
    setFormData({ ...formData, section, option: '', classe_id: '' });
    if (autoGenerateMatricule && !selectedEleve) {
      handleGenerateMatricule(section);
    }
  };

  const handleOptionChange = (option: string) => {
    setFormData({ ...formData, option, classe_id: '' });
  };

  const openEditModal = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setAutoGenerateMatricule(false);
    setFormData({
      matricule: eleve.matricule,
      nom: eleve.nom,
      postnom: eleve.postnom,
      prenom: eleve.prenom,
      sexe: eleve.sexe,
      lieu_naissance: eleve.lieu_naissance,
      date_naissance: eleve.date_naissance,
      section: eleve.section,
      option: eleve.option || '',
      classe: eleve.classe || '',
      classe_id: (eleve as any).classe_id || '',
      responsable: eleve.responsable,
      telephone: eleve.telephone,
      domicile: eleve.domicile,
    });
    setShowModal(true);
  };

  const filteredEleves = useMemo(() => {
    const filtered = eleves.filter((eleve) => {
      const matchesSearch =
        eleve.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eleve.postnom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eleve.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eleve.matricule.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection = selectedSection.length === 0 || selectedSection.some(s => eleve.section.toLowerCase() === s.toLowerCase());
      const matchesOption = selectedOption.length === 0 || (eleve.option && selectedOption.some(o => eleve.option!.toLowerCase() === o.toLowerCase()));
      const matchesClasse = selectedClasse.length === 0 || (eleve.classe && selectedClasse.some(c => eleve.classe!.toLowerCase() === c.toLowerCase()));

      let matchesOrdre = true;
      if (filterOrdre === 'en_ordre') {
        matchesOrdre = paidEleveIds.has(eleve.id);
      } else if (filterOrdre === 'pas_en_ordre') {
        matchesOrdre = !paidEleveIds.has(eleve.id);
      }

      let matchesDate = true;
      if (filterDateDebut && eleve.created_at) {
        const created = new Date(eleve.created_at).toLocaleDateString('fr-CA');
        if (created < filterDateDebut) matchesDate = false;
      }
      if (filterDateFin && eleve.created_at) {
        const created = new Date(eleve.created_at).toLocaleDateString('fr-CA');
        if (created > filterDateFin) matchesDate = false;
      }

      return matchesSearch && matchesSection && matchesOption && matchesClasse && matchesOrdre && matchesDate;
    });

    if (sortAlpha === 'asc') {
      filtered.sort((a, b) => `${a.nom} ${a.postnom} ${a.prenom}`.localeCompare(`${b.nom} ${b.postnom} ${b.prenom}`));
    } else if (sortAlpha === 'desc') {
      filtered.sort((a, b) => `${b.nom} ${b.postnom} ${b.prenom}`.localeCompare(`${a.nom} ${a.postnom} ${a.prenom}`));
    }

    return filtered;
  }, [eleves, searchTerm, selectedSection, selectedOption, selectedClasse, filterOrdre, filterDateDebut, filterDateFin, sortAlpha, paidEleveIds]);

  const getSectionStats = (sectionName: string) => {
    const sectionEleves = sectionName === ''
      ? filteredEleves
      : filteredEleves.filter(e => e.section.toLowerCase() === sectionName.toLowerCase());

    const total = sectionEleves.length;
    const garcons = sectionEleves.filter(e => e.sexe.toUpperCase() === 'M').length;
    const filles = sectionEleves.filter(e => e.sexe.toUpperCase() === 'F').length;
    const enOrdre = sectionEleves.filter(e => paidEleveIds.has(e.id)).length;
    const pasEnOrdre = total - enOrdre;
    const ages = sectionEleves
      .filter(e => e.date_naissance)
      .map(e => e.date_naissance);
    const avgAge = calculateAverageAge(ages);

    return { total, garcons, filles, enOrdre, pasEnOrdre, avgAge };
  };

  const handleViewDetails = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setShowDetailsModal(true);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEleves.length && filteredEleves.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEleves.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isItManager()) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);

    let paiementsMsg = '';
    try {
      const CHUNK = 50;
      let totalPaiements = 0;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { count } = await supabase
          .from('paiements')
          .select('id', { count: 'exact', head: true })
          .in('eleve_id', ids.slice(i, i + CHUNK));
        totalPaiements += count ?? 0;
      }
      if (totalPaiements > 0) {
        paiementsMsg = `\n\nCes élèves ont au total ${totalPaiements} paiement(s) qui seront aussi supprimés.`;
      }
    } catch {
      // count optional — proceed without it
    }

    if (!confirm(`ATTENTION : Vous êtes sur le point de supprimer définitivement ${ids.length} élève(s).${paiementsMsg}\n\nCette action est irréversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const CHUNK = 50;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase
          .from('eleves')
          .delete()
          .in('id', ids.slice(i, i + CHUNK));
        if (error) throw error;
      }
      setSelectedIds(new Set());
      loadEleves();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression multiple: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Élèves</h1>
          <p className="text-gray-600 mt-1">Liste complète des élèves inscrits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              generateElevesReport(filteredEleves.map(e => ({
                matricule: e.matricule,
                nom: e.nom,
                postnom: e.postnom,
                prenom: e.prenom,
                sexe: e.sexe,
                section: e.section,
                option: e.option || undefined,
                classe: e.classe || '',
                responsable: e.responsable,
                telephone: e.telephone,
                date_naissance: e.date_naissance || undefined,
                lieu_naissance: e.lieu_naissance || undefined,
                domicile: e.domicile || undefined,
              })));
            }}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            title="Imprimer la liste"
          >
            <FileDown className="w-5 h-5" />
            Imprimer
          </button>
          {!isReadOnly() && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Ajouter un Élève
            </button>
          )}
        </div>
      </div>

      {/* Section Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedSection([])}
          className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
            selectedSection.length === 0 ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{getSectionStats('').total}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Tous les Élèves</h3>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>Garçons: {getSectionStats('').garcons}</span>
            <span>Filles: {getSectionStats('').filles}</span>
          </div>
          <div className="flex items-center gap-3 text-xs mt-1">
            <span className="text-green-700 font-medium">En ordre: {getSectionStats('').enOrdre}</span>
            <span className="text-red-600 font-medium">Pas en ordre: {getSectionStats('').pasEnOrdre}</span>
          </div>
        </div>

        {sections.map((section) => {
          const stats = getSectionStats(section.nom);
          return (
            <div
              key={section.id}
              onClick={() => setSelectedSection(prev => prev.includes(section.nom) ? prev.filter(s => s !== section.nom) : [...prev, section.nom])}
              className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedSection.includes(section.nom) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{section.nom}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>Garçons: {stats.garcons}</span>
                <span>Filles: {stats.filles}</span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="text-green-700 font-medium">En ordre: {stats.enOrdre}</span>
                <span className="text-red-600 font-medium">Pas en ordre: {stats.pasEnOrdre}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève (nom, matricule...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-gray-700"
            />
          </div>

          {/* Filtres supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <MultiSelectFilter
              label="Section"
              placeholder="Toutes les sections"
              options={sections.map(s => s.nom)}
              selected={selectedSection}
              onChange={(v) => setSelectedSection(v)}
            />

            <MultiSelectFilter
              label="Option"
              placeholder="Toutes les options"
              options={options
                .filter(opt => selectedSection.length === 0 || selectedSection.some(secName => {
                  const sec = sections.find(s => s.nom === secName);
                  return sec && opt.section_id === sec.id;
                }))
                .map(opt => opt.nom)}
              selected={selectedOption}
              onChange={(v) => setSelectedOption(v)}
            />

            <MultiSelectFilter
              label="Classe"
              placeholder="Toutes les classes"
              options={classes
                .filter(cls => {
                  if (selectedSection.length > 0) {
                    const sectionIds = sections.filter(s => selectedSection.includes(s.nom)).map(s => s.id);
                    if (!sectionIds.includes(cls.section_id)) return false;
                  }
                  if (selectedOption.length > 0) {
                    const optionIds = options.filter(o => selectedOption.includes(o.nom)).map(o => o.id);
                    if (cls.option_id && !optionIds.includes(cls.option_id)) return false;
                  }
                  return true;
                })
                .map(cls => cls.nom)}
              selected={selectedClasse}
              onChange={(v) => setSelectedClasse(v)}
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut Paiement ({getCurrentMoisMinerval()})</label>
              <select
                value={filterOrdre}
                onChange={(e) => setFilterOrdre(e.target.value as '' | 'en_ordre' | 'pas_en_ordre')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                <option value="en_ordre">En ordre</option>
                <option value="pas_en_ordre">Pas en ordre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tri alphabétique</label>
              <select
                value={sortAlpha}
                onChange={(e) => setSortAlpha(e.target.value as '' | 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sans tri</option>
                <option value="asc">A &rarr; Z</option>
                <option value="desc">Z &rarr; A</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date inscription (Du)</label>
              <input
                type="date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date inscription (Au)</label>
              <input
                type="date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSection([]);
                  setSelectedOption([]);
                  setSelectedClasse([]);
                  setFilterOrdre('');
                  setFilterDateDebut('');
                  setFilterDateFin('');
                  setSortAlpha('');
                }}
                disabled={!searchTerm && selectedSection.length === 0 && selectedOption.length === 0 && selectedClasse.length === 0 && !filterOrdre && !filterDateDebut && !filterDateFin && !sortAlpha}
                className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" />
                Réinitialiser
              </button>
            </div>
          </div>

          {(selectedSection.length > 0 || selectedOption.length > 0 || selectedClasse.length > 0 || filterOrdre || filterDateDebut || filterDateFin || sortAlpha) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap mt-3">
              <span className="font-medium">Filtres actifs:</span>
              {selectedSection.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Section: {selectedSection.join(', ')}
                </span>
              )}
              {selectedOption.length > 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  Option: {selectedOption.join(', ')}
                </span>
              )}
              {selectedClasse.length > 0 && (
                <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded">
                  Classe: {selectedClasse.join(', ')}
                </span>
              )}
              {filterOrdre && (
                <span className={`px-2 py-1 rounded ${
                  filterOrdre === 'en_ordre' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {filterOrdre === 'en_ordre' ? 'En ordre' : 'Pas en ordre'}
                </span>
              )}
              {(filterDateDebut || filterDateFin) && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                  Période: {filterDateDebut || '...'} - {filterDateFin || '...'}
                </span>
              )}
              {sortAlpha && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                  Tri: {sortAlpha === 'asc' ? 'A → Z' : 'Z → A'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isItManager() && selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {selectedIds.size} élève(s) sélectionné(s)
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {bulkDeleting ? 'Suppression...' : `Supprimer la sélection (${selectedIds.size})`}
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isItManager() && (
                  <th className="px-3 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={filteredEleves.length > 0 && selectedIds.size === filteredEleves.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      title="Tout sélectionner"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nom Complet
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sexe
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Classe
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={isItManager() ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : filteredEleves.length === 0 ? (
                <tr>
                  <td colSpan={isItManager() ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                    Aucun élève trouvé
                  </td>
                </tr>
              ) : (
                filteredEleves.map((eleve) => (
                  <tr key={eleve.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(eleve.id) ? 'bg-red-50' : ''}`}>
                    {isItManager() && (
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(eleve.id)}
                          onChange={() => toggleSelectOne(eleve.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium px-2 py-0.5 rounded text-sm ${
                        paidEleveIds.has(eleve.id)
                          ? 'text-green-700 bg-green-50'
                          : 'text-red-700 bg-red-50'
                      }`}>
                        {eleve.matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {eleve.nom} {eleve.postnom} {eleve.prenom}
                      </div>
                      <div className="text-xs text-gray-500">{eleve.responsable}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        eleve.sexe === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {eleve.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {eleve.classe || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {eleve.telephone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(eleve)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isReadOnly() && (
                          <button
                            onClick={() => openEditModal(eleve)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {isItManager() && (
                          <button
                            onClick={() => handleDelete(eleve.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEleve ? 'Modifier l\'Élève' : 'Ajouter un Élève'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {!selectedEleve && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoGenerate"
                        checked={autoGenerateMatricule}
                        onChange={(e) => {
                          setAutoGenerateMatricule(e.target.checked);
                          if (e.target.checked && formData.section) {
                            handleGenerateMatricule(formData.section);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="autoGenerate" className="text-sm font-medium text-gray-700">
                        Générer automatiquement le matricule
                      </label>
                    </div>
                    {autoGenerateMatricule && formData.section && (
                      <button
                        type="button"
                        onClick={() => handleGenerateMatricule(formData.section)}
                        disabled={generatingMatricule}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${generatingMatricule ? 'animate-spin' : ''}`} />
                        Régénérer
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Format: SPM-AAAAMMJJ-XXXXXXX (Maternelle), SPP-AAAAMMJJ-XXXXXXX (Primaire), SPS-AAAAMMJJ-XXXXXXX (Secondaire) — X: lettre ou chiffre unique
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matricule *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.matricule}
                      onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                      disabled={autoGenerateMatricule && !selectedEleve}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                    />
                    {generatingMatricule && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  {autoGenerateMatricule && !selectedEleve && (
                    <p className="text-xs text-gray-500 mt-1">
                      Le matricule sera généré automatiquement après la sélection de la section
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sexe *
                  </label>
                  <select
                    required
                    value={formData.sexe}
                    onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postnom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.postnom}
                    onChange={(e) => setFormData({ ...formData, postnom: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de Naissance *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_naissance}
                    onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieu de Naissance *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lieu_naissance}
                    onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section *
                  </label>
                  <select
                    required
                    value={formData.section}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.nom}>
                        {section.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Option
                  </label>
                  <select
                    value={formData.option}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.section}
                  >
                    <option value="">Sélectionner une option</option>
                    {options
                      .filter((opt) => {
                        const selectedSection = sections.find(s => s.nom === formData.section);
                        return selectedSection && opt.section_id === selectedSection.id;
                      })
                      .map((option) => (
                        <option key={option.id} value={option.nom}>
                          {option.nom}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classe
                  </label>
                  <select
                    value={formData.classe_id}
                    onChange={(e) => setFormData({ ...formData, classe_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.section}
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes
                      .filter((classe) => {
                        const selectedSection = sections.find(s => s.nom === formData.section);
                        if (!selectedSection || classe.section_id !== selectedSection.id) return false;

                        if (formData.option) {
                          const selectedOption = options.find(o => o.nom === formData.option);
                          return !classe.option_id || classe.option_id === selectedOption?.id;
                        }

                        return true;
                      })
                      .map((classe) => (
                        <option key={classe.id} value={classe.id}>
                          {classe.nom}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domicile *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.domicile}
                    onChange={(e) => setFormData({ ...formData, domicile: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {selectedEleve ? 'Mettre à Jour' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEleve && (
        <EleveDetailsModal
          eleve={selectedEleve}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEleve(null);
          }}
          onPaymentAdded={loadEleves}
          onOpenPaymentForm={() => {
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentModal && selectedEleve && (
        <PaymentFormModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            loadEleves();
            setShowPaymentModal(false);
          }}
          preselectedEleve={selectedEleve}
        />
      )}
    </div>
  );
}
