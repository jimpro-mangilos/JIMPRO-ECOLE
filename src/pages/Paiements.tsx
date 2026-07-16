import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, Search, CheckCircle, Clock, Printer, Plus, XCircle, AlertTriangle, Trash2, Calendar, CalendarDays, ChevronRight, ChevronsDownUp, FileDown, RotateCcw, LayoutDashboard, User, ChevronDown, Check, X, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateReceipt } from '../utils/receiptGenerator';
import { generatePaiementsReport } from '../utils/pdfGenerator';
import PaymentFormModal from '../components/PaymentFormModal';

interface Paiement {
  id: string;
  numero_recu: string;
  eleve_id: string;
  nom_eleve: string;
  matricule: string;
  postnom: string;
  prenom: string;
  classe: string;
  sexe: string;
  section: string;
  option: string | null;
  telephone: string;
  domicile: string;
  lieu_naissance: string | null;
  date_naissance: string | null;
  responsable: string | null;
  photo_url: string | null;
  type_paiement: string;
  description: string | null;
  montant_paye: number;
  montant_en_lettre: string;
  mode_paiement: string;
  date_paiement: string;
  comptable_id: string;
  nom_comptable: string;
  est_encaisse: boolean;
  date_encaissement: string | null;
  encaisseur_id?: string;
  nom_encaisseur?: string | null;
  annee_scolaire: string | null;
  motif_id: string | null;
  motif_libelle: string;
  created_at: string;
  statut: 'en_attente' | 'encaisse' | 'annule';
  motif_annulation: string | null;
  annule_par: string | null;
  nom_annuleur: string | null;
  date_annulation: string | null;
}

interface TypePaiement {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
}

interface AnnulationModalState {
  open: boolean;
  paiementId: string | null;
  motif: string;
  loading: boolean;
}

function MotifMultiSelect({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-2 border rounded-md text-sm flex items-center gap-2 min-w-[160px] transition-all ${selected.length > 0 ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700'}`}
      >
        <span className="truncate">
          {selected.length === 0 ? 'Tous motifs' : `${selected.length} motif${selected.length > 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {selected.length > 0 && (
            <span role="button" onClick={(e) => { e.stopPropagation(); onChange([]); }} className="p-0.5 rounded hover:bg-blue-100">
              <X className="w-3 h-3 text-blue-500" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="sticky top-0 bg-white border-b px-3 py-2 flex items-center justify-between">
            <button type="button" onClick={() => onChange([...options])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Tout selectionner</button>
            <button type="button" onClick={() => onChange([])} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Tout effacer</button>
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">Aucun motif</div>
          ) : options.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${selected.includes(option) ? 'bg-blue-50/50' : ''}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(option) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {selected.includes(option) && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="truncate">{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Paiements() {
  const { user, userProfile, canEncaisser, canCreatePaiement, canAnnulerPaiement, canSupprimerPaiement, isItManager, isAdmin, isComptable, isPromoteur, isCoordonnateur, isSecretary } = useAuth();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [filteredPaiements, setFilteredPaiements] = useState<Paiement[]>([]);
  const [typesPaiement, setTypesPaiement] = useState<TypePaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterMotifs, setFilterMotifs] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState('tous');
  const [filterEncaisseur, setFilterEncaisseur] = useState('tous');
  const [filterSection, setFilterSection] = useState('tous');
  const [filterOption, setFilterOption] = useState('tous');
  const [filterClasse, setFilterClasse] = useState('tous');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [annulationModal, setAnnulationModal] = useState<AnnulationModalState>({
    open: false,
    paiementId: null,
    motif: '',
    loading: false,
  });
  const [viewMode, setViewMode] = useState<'general' | 'journalier' | 'jour_precedent' | 'mois' | 'mois_precedent' | 'compte_actif'>('compte_actif');
  const isStrictComptable = isComptable() && !isItManager();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['__first__']));
  const [editModal, setEditModal] = useState<{ open: boolean; paiement: Paiement | null; loading: boolean }>({ open: false, paiement: null, loading: false });
  const [editFormData, setEditFormData] = useState({
    montant_paye: 0,
    montant_en_lettre: '',
    motif_libelle: '',
    mode_paiement: '',
    date_paiement: '',
    annee_scolaire: '',
  });

  useEffect(() => {
    fetchPaiements();
    fetchTypesPaiement();

    const channel = supabase
      .channel('paiements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        fetchPaiements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isStrictComptable && viewMode === 'general') {
      setViewMode('compte_actif');
    }
  }, [isStrictComptable, viewMode]);

  useEffect(() => {
    filterPaiements();
  }, [paiements, searchTerm, filterType, filterStatut, filterMotifs, filterYear, filterEncaisseur, filterSection, filterOption, filterClasse, filterDateDebut, filterDateFin, viewMode]);

  const fetchPaiements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaiements(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypesPaiement = async () => {
    try {
      const { data, error } = await supabase
        .from('types_paiement')
        .select('*')
        .eq('is_active', true)
        .order('ordre');

      if (error) throw error;
      setTypesPaiement(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types de paiement:', error);
    }
  };

  const filterPaiements = () => {
    let filtered = [...paiements];

    // Pre-filter by view mode
    if (viewMode === 'journalier') {
      const today = new Date().toLocaleDateString('fr-CA'); // YYYY-MM-DD
      filtered = filtered.filter(p => {
        const pDate = new Date(p.date_paiement).toLocaleDateString('fr-CA');
        return pDate === today;
      });
    } else if (viewMode === 'jour_precedent') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('fr-CA');
      filtered = filtered.filter(p => {
        const pDate = new Date(p.date_paiement).toLocaleDateString('fr-CA');
        return pDate === yesterdayStr;
      });
    } else if (viewMode === 'mois') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filtered = filtered.filter(p => {
        const d = new Date(p.date_paiement);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (viewMode === 'mois_precedent') {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = filtered.filter(p => {
        const d = new Date(p.date_paiement);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    } else if (viewMode === 'compte_actif') {
      filtered = filtered.filter(p => {
        const statut = getStatut(p);
        return p.comptable_id === user?.id || statut === 'en_attente';
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.numero_recu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nom_eleve.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.classe.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'tous') {
      filtered = filtered.filter(p => p.type_paiement === filterType);
    }

    if (filterStatut !== 'tous') {
      filtered = filtered.filter(p => {
        const statut = p.statut || (p.est_encaisse ? 'encaisse' : 'en_attente');
        return statut === filterStatut;
      });
    }

    if (filterMotifs.length > 0) {
      filtered = filtered.filter(p => filterMotifs.includes(p.motif_libelle));
    }

    if (filterYear !== 'tous') {
      filtered = filtered.filter(p => {
        const d = new Date(p.date_paiement);
        return d.getFullYear() === parseInt(filterYear);
      });
    }

    if (filterEncaisseur !== 'tous') {
      filtered = filtered.filter(p => p.nom_encaisseur === filterEncaisseur);
    }

    if (filterSection !== 'tous') {
      filtered = filtered.filter(p => p.section === filterSection);
    }

    if (filterOption !== 'tous') {
      filtered = filtered.filter(p => p.option === filterOption);
    }

    if (filterClasse !== 'tous') {
      filtered = filtered.filter(p => p.classe === filterClasse);
    }

    if (filterDateDebut) {
      filtered = filtered.filter(p => {
        const created = new Date(p.created_at).toLocaleDateString('fr-CA');
        return created >= filterDateDebut;
      });
    }

    if (filterDateFin) {
      filtered = filtered.filter(p => {
        const created = new Date(p.created_at).toLocaleDateString('fr-CA');
        return created <= filterDateFin;
      });
    }

    setFilteredPaiements(filtered);
  };

  const getStatut = (p: Paiement): 'en_attente' | 'encaisse' | 'annule' => {
    if (p.statut) return p.statut;
    return p.est_encaisse ? 'encaisse' : 'en_attente';
  };

  const canEncaisserMontant = (montant: number): boolean => {
    if (montant === 0) {
      return isItManager() || isPromoteur() || isCoordonnateur() || isSecretary();
    }
    return canEncaisser();
  };

  const handleEncaisser = async (paiementId: string, montant: number) => {
    if (!canEncaisserMontant(montant)) {
      if (montant === 0) {
        alert('Seuls le Promoteur, le Coordonnateur, le Secrétaire et l\'IT Manager peuvent encaisser les paiements à montant 0');
      } else {
        alert('Seuls les administrateurs, comptables, Promoteur et IT_MANAGER peuvent encaisser les paiements');
      }
      return;
    }

    if (!confirm('Confirmer l\'encaissement de ce paiement ?')) return;

    try {
      const { error } = await supabase
        .from('paiements')
        .update({
          est_encaisse: true,
          statut: 'encaisse',
          date_encaissement: new Date().toISOString(),
          encaisseur_id: user?.id,
          nom_encaisseur: `${userProfile?.prenom} ${userProfile?.nom}`,
        })
        .eq('id', paiementId);

      if (error) throw error;
      alert('Paiement encaisse avec succes');
      fetchPaiements();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'encaissement: ' + error.message);
    }
  };

  const openAnnulationModal = (paiementId: string) => {
    setAnnulationModal({ open: true, paiementId, motif: '', loading: false });
  };

  const closeAnnulationModal = () => {
    setAnnulationModal({ open: false, paiementId: null, motif: '', loading: false });
  };

  const handleAnnuler = async () => {
    if (!annulationModal.paiementId) return;
    if (!annulationModal.motif.trim()) {
      alert('Veuillez saisir un motif d\'annulation');
      return;
    }

    setAnnulationModal(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('paiements')
        .update({
          statut: 'annule',
          motif_annulation: annulationModal.motif.trim(),
          annule_par: user?.id,
          nom_annuleur: `${userProfile?.prenom} ${userProfile?.nom}`,
          date_annulation: new Date().toISOString(),
        })
        .eq('id', annulationModal.paiementId);

      if (error) throw error;
      closeAnnulationModal();
      fetchPaiements();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'annulation: ' + error.message);
      setAnnulationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSupprimer = async (paiement: Paiement) => {
    const statut = getStatut(paiement);

    if (statut === 'encaisse' && !isItManager()) {
      alert('Seul un IT Manager peut supprimer un paiement deja encaisse.');
      return;
    }

    const avertissement = statut === 'encaisse'
      ? `ATTENTION : Ce paiement est deja encaisse.\n\nEtes-vous certain de vouloir supprimer definitivement le paiement N ${paiement.numero_recu} de ${paiement.nom_eleve} (${paiement.montant_paye.toLocaleString('fr-FR')} FC) ?\n\nCette action est irreversible.`
      : `Etes-vous certain de vouloir supprimer definitivement le paiement N ${paiement.numero_recu} de ${paiement.nom_eleve} (${paiement.montant_paye.toLocaleString('fr-FR')} FC) ?\n\nCette action est irreversible.`;

    if (!confirm(avertissement)) return;

    try {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .eq('id', paiement.id);

      if (error) throw error;
      fetchPaiements();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const canModifierPaiement = () => isItManager() || isAdmin();

  const openEditPaiement = (paiement: Paiement) => {
    setEditFormData({
      montant_paye: paiement.montant_paye,
      montant_en_lettre: paiement.montant_en_lettre || '',
      motif_libelle: paiement.motif_libelle || '',
      mode_paiement: paiement.mode_paiement || '',
      date_paiement: paiement.date_paiement ? paiement.date_paiement.split('T')[0] : '',
      annee_scolaire: paiement.annee_scolaire || '',
    });
    setEditModal({ open: true, paiement, loading: false });
  };

  const handleEditPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.paiement) return;
    setEditModal(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase
        .from('paiements')
        .update({
          montant_paye: editFormData.montant_paye,
          montant_en_lettre: editFormData.montant_en_lettre,
          motif_libelle: editFormData.motif_libelle,
          mode_paiement: editFormData.mode_paiement,
          date_paiement: editFormData.date_paiement,
          annee_scolaire: editFormData.annee_scolaire,
        })
        .eq('id', editModal.paiement.id);
      if (error) throw error;
      await fetchPaiements();
      setEditModal({ open: false, paiement: null, loading: false });
    } catch (error: any) {
      console.error('Erreur modification:', error);
      alert('Erreur lors de la modification: ' + error.message);
      setEditModal(prev => ({ ...prev, loading: false }));
    }
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
    if (selectedIds.size === filteredPaiements.length && filteredPaiements.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPaiements.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!isItManager()) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (!confirm(`ATTENTION : Vous etes sur le point de supprimer definitivement ${ids.length} paiement(s).\n\nCette action est irreversible. Continuer ?`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setSelectedIds(new Set());
      fetchPaiements();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression multiple: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const imprimerRecu = async (paiement: Paiement) => {
    try {
      const typeLabel = typesPaiement.find(t => t.id === paiement.type_paiement)?.libelle || 'N/A';

      await generateReceipt({
        numero_recu: paiement.numero_recu,
        matricule: paiement.matricule,
        nom_eleve: paiement.nom_eleve,
        postnom: paiement.postnom,
        prenom: paiement.prenom,
        classe: paiement.classe,
        sexe: paiement.sexe,
        section: paiement.section,
        telephone: paiement.telephone,
        option: paiement.option || '',
        lieu_naissance: paiement.lieu_naissance,
        date_naissance: paiement.date_naissance,
        responsable: paiement.responsable,
        montant_paye: paiement.montant_paye,
        montant_en_lettre: paiement.montant_en_lettre,
        mode_paiement: paiement.mode_paiement,
        date_paiement: paiement.date_paiement,
        date_encaissement: paiement.date_encaissement || paiement.created_at,
        nom_comptable: paiement.nom_comptable,
        nom_encaisseur: paiement.nom_encaisseur,
        type_paiement: typeLabel,
        annee_scolaire: paiement.annee_scolaire,
        motif_paiement: paiement.motif_libelle || null,
      }, false);
    } catch (error) {
      console.error('Erreur lors de l\'impression du recu:', error);
      alert('Erreur lors de la generation du recu');
    }
  };

  const yearOptions = useMemo(() => {
    const years = paiements
      .map((p) => new Date(p.date_paiement).getFullYear())
      .filter((y) => !isNaN(y));
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [paiements]);

  const encaisseurOptions = useMemo(() => {
    const names = paiements
      .map((p) => p.nom_encaisseur)
      .filter((n): n is string => !!n);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  const sectionOptions = useMemo(() => {
    const sections = paiements
      .map((p) => p.section)
      .filter((s): s is string => !!s);
    return Array.from(new Set(sections)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  const optionOptions = useMemo(() => {
    const options = paiements
      .map((p) => p.option)
      .filter((o): o is string => !!o);
    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  const classeOptions = useMemo(() => {
    const classes = paiements
      .map((p) => p.classe)
      .filter((c): c is string => !!c);
    return Array.from(new Set(classes)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  const motifOptions = useMemo(() => {
    const motifs = paiements
      .map((p) => p.motif_libelle)
      .filter((m): m is string => !!m && m.trim() !== '');
    return Array.from(new Set(motifs)).sort((a, b) => a.localeCompare(b));
  }, [paiements]);

  const groupByDate = (list: Paiement[]): [string, Paiement[]][] => {
    const groups = new Map<string, Paiement[]>();
    for (const p of list) {
      const key = new Date(p.date_paiement).toLocaleDateString('fr-FR');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries());
  };

  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const dateGroups = useMemo(() => groupByDate(filteredPaiements), [filteredPaiements]);

  const expandAllDates = () => {
    setExpandedDates(new Set(dateGroups.map(([key]) => key)));
  };

  const collapseAllDates = () => {
    setExpandedDates(new Set());
  };

  const allExpanded = dateGroups.length > 0 && dateGroups.every(([key]) => expandedDates.has(key));

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split('/');
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const viewFilteredPaiements = useMemo(() => {
    if (viewMode === 'journalier') {
      const today = new Date().toLocaleDateString('fr-CA');
      return paiements.filter(p => new Date(p.date_paiement).toLocaleDateString('fr-CA') === today);
    }
    if (viewMode === 'jour_precedent') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('fr-CA');
      return paiements.filter(p => new Date(p.date_paiement).toLocaleDateString('fr-CA') === yesterdayStr);
    }
    if (viewMode === 'mois') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return paiements.filter(p => {
        const d = new Date(p.date_paiement);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }
    if (viewMode === 'mois_precedent') {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return paiements.filter(p => {
        const d = new Date(p.date_paiement);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    }
    if (viewMode === 'compte_actif') {
      return paiements.filter(p => {
        const statut = getStatut(p);
        return p.comptable_id === user?.id || statut === 'en_attente';
      });
    }
    return paiements;
  }, [paiements, viewMode, user?.id]);

  const isDateFilterActive = filterDateDebut !== '' || filterDateFin !== '';
  const cardSource = filteredPaiements;
  const paiementsActifs = cardSource.filter(p => getStatut(p) !== 'annule');
  const totalEncaisse = paiementsActifs.filter(p => getStatut(p) === 'encaisse').reduce((sum, p) => sum + p.montant_paye, 0);
  const totalEnAttente = paiementsActifs.filter(p => getStatut(p) === 'en_attente').reduce((sum, p) => sum + p.montant_paye, 0);
  const totalAnnule = cardSource.filter(p => getStatut(p) === 'annule').reduce((sum, p) => sum + p.montant_paye, 0);

  const colCount = isItManager() ? 8 : 7;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
        {canCreatePaiement() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nouveau Paiement
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setViewMode('compte_actif')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'compte_actif'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Compte Actif
        </button>
        <button
          onClick={() => setViewMode('journalier')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'journalier'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Journalier
        </button>
        <button
          onClick={() => setViewMode('jour_precedent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'jour_precedent'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Jour Precedent
        </button>
        <button
          onClick={() => setViewMode('mois')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'mois'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Mois
        </button>
        <button
          onClick={() => setViewMode('mois_precedent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'mois_precedent'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Mois Precedent
        </button>
        {!isStrictComptable && (
          <button
            onClick={() => setViewMode('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'general'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            General
          </button>
        )}
      </div>

      {isDateFilterActive && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl px-5 py-3 shadow-sm animate-pulse-once">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-semibold text-teal-800">Periode active :</span>
          </div>
          <span className="text-sm font-medium text-teal-700">
            {filterDateDebut ? new Date(filterDateDebut + 'T00:00').toLocaleDateString('fr-FR') : '...'} &mdash; {filterDateFin ? new Date(filterDateFin + 'T00:00').toLocaleDateString('fr-FR') : '...'}
          </span>
          <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full font-medium">{filteredPaiements.length} resultat{filteredPaiements.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => { setFilterDateDebut(''); setFilterDateFin(''); }}
            className="ml-auto text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded-full p-1 transition-colors"
            title="Effacer le filtre de periode"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`relative overflow-hidden rounded-xl shadow-sm p-6 border transition-all ${isDateFilterActive ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-emerald-100' : 'bg-white border-gray-100'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/30 rounded-full -mr-4 -mt-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Encaisse</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalEncaisse.toLocaleString('fr-FR')} FC</p>
              {isDateFilterActive && <p className="text-[10px] text-emerald-600 mt-1 font-medium">Periode filtree</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDateFilterActive ? 'bg-emerald-100' : 'bg-green-50'}`}>
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl shadow-sm p-6 border transition-all ${isDateFilterActive ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-amber-100' : 'bg-white border-gray-100'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/30 rounded-full -mr-4 -mt-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En Attente</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{totalEnAttente.toLocaleString('fr-FR')} FC</p>
              {isDateFilterActive && <p className="text-[10px] text-amber-600 mt-1 font-medium">Periode filtree</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDateFilterActive ? 'bg-amber-100' : 'bg-orange-50'}`}>
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl shadow-sm p-6 border transition-all ${isDateFilterActive ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200 shadow-rose-100' : 'bg-white border-gray-100'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-100/30 rounded-full -mr-4 -mt-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Annule</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{totalAnnule.toLocaleString('fr-FR')} FC</p>
              {isDateFilterActive && <p className="text-[10px] text-rose-600 mt-1 font-medium">Periode filtree</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDateFilterActive ? 'bg-rose-100' : 'bg-red-50'}`}>
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl shadow-sm p-6 border transition-all ${isDateFilterActive ? 'bg-gradient-to-br from-sky-50 to-white border-sky-200 shadow-sky-100' : 'bg-white border-gray-100'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-100/30 rounded-full -mr-4 -mt-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Paiements</p>
              <p className="text-2xl font-bold text-sky-700 mt-1">{filteredPaiements.length}</p>
              {isDateFilterActive && <p className="text-[10px] text-sky-600 mt-1 font-medium">Periode filtree</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDateFilterActive ? 'bg-sky-100' : 'bg-blue-50'}`}>
              <DollarSign className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Liste des Paiements</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generatePaiementsReport(filteredPaiements, {
                section: filterSection,
                option: filterOption,
                classe: filterClasse,
                encaisseur: filterEncaisseur,
                type: filterType,
                statut: filterStatut,
                motifs: filterMotifs,
                annee: filterYear,
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Imprimer PDF
            </button>
            {dateGroups.length > 1 && (
              <button
                onClick={() => allExpanded ? collapseAllDates() : expandAllDates()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium transition-colors"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                {allExpanded ? 'Tout replier' : 'Tout deplier'}
              </button>
            )}
            {isItManager() && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par numero, eleve ou classe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Tous types</option>
            {typesPaiement.map((type) => (
              <option key={type.id} value={type.id}>{type.libelle}</option>
            ))}
          </select>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Tous statuts</option>
            <option value="encaisse">Encaisses</option>
            <option value="en_attente">En attente</option>
            <option value="annule">Annules</option>
          </select>

          <MotifMultiSelect
            options={motifOptions}
            selected={filterMotifs}
            onChange={setFilterMotifs}
          />

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Toutes les annees</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={filterEncaisseur}
            onChange={(e) => setFilterEncaisseur(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Tous encaisseurs</option>
            {encaisseurOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Toutes sections</option>
            {sectionOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Toutes options</option>
            {optionOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="tous">Toutes classes</option>
            {classeOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isDateFilterActive ? 'bg-teal-50 border-2 border-teal-400 shadow-sm shadow-teal-100' : 'border border-transparent'}`}>
            <Calendar className={`w-5 h-5 shrink-0 transition-colors ${isDateFilterActive ? 'text-teal-600' : 'text-gray-400'}`} />
            <input
              type="date"
              value={filterDateDebut}
              onChange={(e) => setFilterDateDebut(e.target.value)}
              className={`px-3 py-2 border rounded-md text-sm outline-none transition-all ${isDateFilterActive ? 'border-teal-300 bg-white text-teal-800 font-medium focus:ring-2 focus:ring-teal-300' : 'border-gray-300 text-gray-700'}`}
              title="Date debut"
            />
            <span className={`text-sm font-medium ${isDateFilterActive ? 'text-teal-500' : 'text-gray-400'}`}>-</span>
            <input
              type="date"
              value={filterDateFin}
              onChange={(e) => setFilterDateFin(e.target.value)}
              className={`px-3 py-2 border rounded-md text-sm outline-none transition-all ${isDateFilterActive ? 'border-teal-300 bg-white text-teal-800 font-medium focus:ring-2 focus:ring-teal-300' : 'border-gray-300 text-gray-700'}`}
              title="Date fin"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('tous');
              setFilterStatut('tous');
              setFilterMotifs([]);
              setFilterYear('tous');
              setFilterEncaisseur('tous');
              setFilterSection('tous');
              setFilterOption('tous');
              setFilterClasse('tous');
              setFilterDateDebut('');
              setFilterDateFin('');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Reinitialiser
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {loading ? (
            <p className="text-center py-8 text-gray-400">Chargement...</p>
          ) : filteredPaiements.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Aucun paiement trouve</p>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isItManager() && (
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredPaiements.length > 0 && selectedIds.size === filteredPaiements.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        title="Tout selectionner"
                      />
                    </th>
                  )}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Recu</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eleve</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motif</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {dateGroups.map(([dateKey, items], idx) => {
                  const isOpen = expandedDates.has(dateKey) || (idx === 0 && expandedDates.has('__first__'));
                  const dayTotal = items.reduce((acc, p) => acc + p.montant_paye, 0);
                  const dayEncaisse = items.filter(p => getStatut(p) === 'encaisse').length;
                  const dayEnAttente = items.filter(p => getStatut(p) === 'en_attente').length;

                  return (
                    <React.Fragment key={dateKey}>
                      <tr
                        onClick={() => {
                          if (idx === 0 && expandedDates.has('__first__') && !expandedDates.has(dateKey)) {
                            const next = new Set(expandedDates);
                            next.delete('__first__');
                            setExpandedDates(next);
                          } else {
                            toggleDate(dateKey);
                          }
                        }}
                        className={`cursor-pointer hover:bg-blue-50 transition-colors border-t border-gray-200 ${isOpen ? 'bg-blue-50/50' : 'bg-gray-50/80'}`}
                      >
                        <td colSpan={colCount} className="px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                              <div className="w-1 h-5 rounded-full bg-blue-400" />
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700 capitalize">
                                {formatDateLong(dateKey)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">
                                {items.length} paiement{items.length !== 1 ? 's' : ''}
                              </span>
                              {dayEncaisse > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  {dayEncaisse}
                                </span>
                              )}
                              {dayEnAttente > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                  <Clock className="w-2.5 h-2.5" />
                                  {dayEnAttente}
                                </span>
                              )}
                              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                {dayTotal.toLocaleString('fr-FR')} FC
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isOpen && items.map((paiement) => {
                        const statut = getStatut(paiement);
                        return (
                          <tr key={paiement.id} className={`hover:bg-gray-50 border-t border-gray-100 ${statut === 'annule' ? 'opacity-70' : ''} ${selectedIds.has(paiement.id) ? 'bg-red-50' : ''}`}>
                            {isItManager() && (
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(paiement.id)}
                                  onChange={() => toggleSelectOne(paiement.id)}
                                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                              </td>
                            )}
                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{paiement.numero_recu}</td>
                            <td className="px-3 py-2.5 text-sm">
                              <div className="font-medium">{paiement.nom_eleve} {paiement.postnom} {paiement.prenom}</div>
                              <div className="text-xs text-gray-500">{paiement.matricule} - {paiement.classe}</div>
                            </td>
                            <td className="px-3 py-2.5 text-sm">{paiement.motif_libelle || typesPaiement.find(t => t.id === paiement.type_paiement)?.libelle || 'N/A'}</td>
                            <td className={`px-3 py-2.5 text-sm font-semibold ${statut === 'annule' ? 'line-through text-gray-400' : ''}`}>
                              {paiement.montant_paye.toLocaleString('fr-FR')} FC
                            </td>
                            <td className="px-3 py-2.5 text-sm">
                              <div className="space-y-1">
                                {statut === 'encaisse' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Encaisse
                                  </span>
                                )}
                                {statut === 'en_attente' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    En attente
                                  </span>
                                )}
                                {statut === 'annule' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Annule
                                  </span>
                                )}
                                <div className="text-xs text-gray-500">Par: {paiement.nom_comptable}</div>
                                {statut === 'encaisse' && paiement.nom_encaisseur && paiement.nom_encaisseur !== paiement.nom_comptable && (
                                  <div className="text-xs text-green-600">Encaisse par: {paiement.nom_encaisseur}</div>
                                )}
                                {statut === 'annule' && paiement.motif_annulation && (
                                  <div className="text-xs text-red-500 max-w-[160px]" title={paiement.motif_annulation}>
                                    Motif: {paiement.motif_annulation.length > 40 ? paiement.motif_annulation.substring(0, 40) + '...' : paiement.motif_annulation}
                                  </div>
                                )}
                                {statut === 'annule' && paiement.nom_annuleur && (
                                  <div className="text-xs text-red-400">Par: {paiement.nom_annuleur}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-sm">
                              <div className="flex gap-2 items-center">
                                {statut === 'encaisse' && (
                                  <button
                                    onClick={() => imprimerRecu(paiement)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Imprimer"
                                  >
                                    <Printer className="w-5 h-5" />
                                  </button>
                                )}
                                {statut === 'en_attente' && canEncaisserMontant(paiement.montant_paye) && (
                                  <button
                                    onClick={() => handleEncaisser(paiement.id, paiement.montant_paye)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Encaisser"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                )}
                                {statut === 'en_attente' && canAnnulerPaiement() && (
                                  <button
                                    onClick={() => openAnnulationModal(paiement.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Annuler le paiement"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                )}
                                {canModifierPaiement() && (
                                  <button
                                    onClick={() => openEditPaiement(paiement)}
                                    className="text-amber-500 hover:text-amber-700"
                                    title="Modifier le paiement"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {canSupprimerPaiement() && (statut !== 'encaisse' || isItManager()) && (
                                  <button
                                    onClick={() => handleSupprimer(paiement)}
                                    className="text-gray-400 hover:text-red-700"
                                    title="Supprimer definitivement"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {annulationModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Annuler le paiement</h2>
                <p className="text-sm text-gray-500">Cette action est irreversible</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Veuillez indiquer le motif d'annulation de ce paiement. Ce motif sera enregistre pour la tracabilite.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif d'annulation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={annulationModal.motif}
                  onChange={(e) => setAnnulationModal(prev => ({ ...prev, motif: e.target.value }))}
                  placeholder="Ex: Paiement en double, erreur de montant..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeAnnulationModal}
                disabled={annulationModal.loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={handleAnnuler}
                disabled={annulationModal.loading || !annulationModal.motif.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {annulationModal.loading ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchPaiements();
          setShowModal(false);
        }}
        preselectedEleve={null}
      />

      {editModal.open && editModal.paiement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Modifier le paiement</h3>
                <p className="text-sm text-gray-500 mt-0.5">N {editModal.paiement.numero_recu} - {editModal.paiement.nom_eleve}</p>
              </div>
              <button onClick={() => setEditModal({ open: false, paiement: null, loading: false })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleEditPaiement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FC)</label>
                  <input
                    type="number"
                    value={editFormData.montant_paye}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, montant_paye: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <select
                    value={editFormData.mode_paiement}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, mode_paiement: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="virement">Virement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant en lettres</label>
                <input
                  type="text"
                  value={editFormData.montant_en_lettre}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, montant_en_lettre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif de paiement</label>
                <input
                  type="text"
                  value={editFormData.motif_libelle}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, motif_libelle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
                  <input
                    type="date"
                    value={editFormData.date_paiement}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, date_paiement: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annee scolaire</label>
                  <input
                    type="text"
                    value={editFormData.annee_scolaire}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, annee_scolaire: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="2025-2026"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={editModal.loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {editModal.loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, paiement: null, loading: false })}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
