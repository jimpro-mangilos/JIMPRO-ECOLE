import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';
import type { Database } from '../database.types';
import { generateMatricule, validateMatriculeUniqueness } from '../../utils/matriculeGenerator';
import { toast } from 'sonner';

type Eleve = Database['public']['Tables']['eleves']['Row'];

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getCurrentMoisMinerval() { return MOIS_FR[new Date().getMonth()]; }

interface EleveFormData {
  matricule: string; nom: string; postnom: string; prenom: string;
  sexe: string; lieu_naissance: string; date_naissance: string;
  section: string; option: string; classe: string; classe_id: string;
  responsable: string; telephone: string; domicile: string;
}

const EMPTY_FORM: EleveFormData = {
  matricule: '', nom: '', postnom: '', prenom: '', sexe: 'M',
  lieu_naissance: '', date_naissance: '', section: '', option: '',
  classe: '', classe_id: '', responsable: '', telephone: '', domicile: '',
};

interface UseElevesOptions {
  searchTerm: string;
  selectedSection: string[];
  selectedOption: string[];
  selectedClasse: string[];
  filterOrdre: '' | 'en_ordre' | 'pas_en_ordre';
  filterDateDebut: string;
  filterDateFin: string;
  sortAlpha: '' | 'asc' | 'desc';
}

export function useEleves(filters: UseElevesOptions) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [autoGenerateMatricule, setAutoGenerateMatricule] = useState(true);
  const [generatingMatricule, setGeneratingMatricule] = useState(false);
  const [formData, setFormData] = useState<EleveFormData>(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Load eleves
  const { data: eleves = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.eleves.all,
    queryFn: async () => {
      const { data, error } = await supabase.from('eleves').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load paid eleve IDs for current month
  const { data: paidEleveIds = new Set<string>() } = useQuery({
    queryKey: ['eleves', 'paidThisMonth'],
    queryFn: async () => {
      const { data } = await supabase
        .from('paiements')
        .select('eleve_id')
        .eq('mois_minerval', getCurrentMoisMinerval())
        .eq('statut', 'encaisse');
      return new Set((data ?? []).map((p: { eleve_id: string }) => p.eleve_id));
    },
  });

  // Realtime subscription for payment changes
  useEffect(() => {
    const channel = supabase
      .channel('eleves-paiements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['eleves', 'paidThisMonth'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Filtering
  const filteredEleves = useMemo(() => {
    let result = eleves.filter((eleve) => {
      const s = filters.searchTerm.toLowerCase();
      const matchesSearch = !s || eleve.nom.toLowerCase().includes(s) || eleve.postnom.toLowerCase().includes(s) || eleve.prenom.toLowerCase().includes(s) || eleve.matricule.toLowerCase().includes(s);
      const matchesSection = filters.selectedSection.length === 0 || filters.selectedSection.some(sec => eleve.section.toLowerCase() === sec.toLowerCase());
      const matchesOption = filters.selectedOption.length === 0 || (eleve.option && filters.selectedOption.some(o => eleve.option!.toLowerCase() === o.toLowerCase()));
      const matchesClasse = filters.selectedClasse.length === 0 || (eleve.classe && filters.selectedClasse.some(c => eleve.classe!.toLowerCase() === c.toLowerCase()));

      let matchesOrdre = true;
      if (filters.filterOrdre === 'en_ordre') matchesOrdre = paidEleveIds.has(eleve.id);
      else if (filters.filterOrdre === 'pas_en_ordre') matchesOrdre = !paidEleveIds.has(eleve.id);

      let matchesDate = true;
      if (filters.filterDateDebut && eleve.created_at) {
        if (new Date(eleve.created_at).toLocaleDateString('fr-CA') < filters.filterDateDebut) matchesDate = false;
      }
      if (filters.filterDateFin && eleve.created_at) {
        if (new Date(eleve.created_at).toLocaleDateString('fr-CA') > filters.filterDateFin) matchesDate = false;
      }

      return matchesSearch && matchesSection && matchesOption && matchesClasse && matchesOrdre && matchesDate;
    });

    if (filters.sortAlpha === 'asc') result.sort((a, b) => `${a.nom} ${a.postnom} ${a.prenom}`.localeCompare(`${b.nom} ${b.postnom} ${b.prenom}`));
    else if (filters.sortAlpha === 'desc') result.sort((a, b) => `${b.nom} ${b.postnom} ${b.prenom}`.localeCompare(`${a.nom} ${a.postnom} ${a.prenom}`));

    return result;
  }, [eleves, filters, paidEleveIds]);

  // Form actions
  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setSelectedEleve(null);
    setAutoGenerateMatricule(true);
  }, []);

  const openCreate = useCallback(() => { resetForm(); setShowModal(true); }, [resetForm]);
  const openEdit = useCallback((eleve: Eleve) => {
    setSelectedEleve(eleve);
    setAutoGenerateMatricule(false);
    setFormData({
      matricule: eleve.matricule, nom: eleve.nom, postnom: eleve.postnom, prenom: eleve.prenom,
      sexe: eleve.sexe, lieu_naissance: eleve.lieu_naissance, date_naissance: eleve.date_naissance,
      section: eleve.section, option: eleve.option || '', classe: eleve.classe || '',
      classe_id: (eleve as any).classe_id || '', responsable: eleve.responsable,
      telephone: eleve.telephone, domicile: eleve.domicile,
    });
    setShowModal(true);
  }, []);

  const handleGenerateMatricule = useCallback(async (section: string) => {
    if (!section || !autoGenerateMatricule || selectedEleve) return;
    setGeneratingMatricule(true);
    try {
      const result = await generateMatricule(section);
      if (result.isUnique && result.matricule) {
        setFormData(prev => ({ ...prev, matricule: result.matricule }));
      } else {
         toast.error('Impossible de générer un matricule unique.');
      }
    } finally { setGeneratingMatricule(false); }
  }, [autoGenerateMatricule, selectedEleve]);

  const handleSectionChange = useCallback((section: string) => {
    setFormData(prev => ({ ...prev, section, option: '', classe_id: '' }));
    if (autoGenerateMatricule && !selectedEleve) handleGenerateMatricule(section);
  }, [autoGenerateMatricule, selectedEleve, handleGenerateMatricule]);

  const submitEleve = useCallback(async (classes: { id: string; nom: string }[]) => {
    const isUnique = selectedEleve ? true : await validateMatriculeUniqueness(formData.matricule);
    if (!isUnique) {  toast.error('Ce matricule existe déjà.'); return false; }

    const classeObj = classes.find(c => c.id === formData.classe_id);
    const dataToSave = { ...formData, classe: classeObj?.nom || formData.classe, classe_id: formData.classe_id || null };

    if (selectedEleve) {
      const { error } = await supabase.from('eleves').update({ ...dataToSave, updated_at: new Date().toISOString() }).eq('id', selectedEleve.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('eleves').insert([dataToSave]);
      if (error) {
        if (error.code === '23505') {  toast.error('Matricule en double. Régénérez.'); return false; }
        throw error;
      }
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.eleves.all });
    setShowModal(false);
    resetForm();
    return true;
  }, [formData, selectedEleve, queryClient, resetForm]);

  const deleteEleve = useCallback(async (id: string) => {
    const { count } = await supabase.from('paiements').select('id', { count: 'exact', head: true }).eq('eleve_id', id);
    const msg = count && count > 0
      ? `ATTENTION : ${count} paiement(s). Supprimer l'élève effacera tout l'historique. Continuer ?`
      : 'Supprimer cet élève ?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('eleves').delete().eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: queryKeys.eleves.all });
  }, [queryClient]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredEleves.length && filteredEleves.length > 0 ? new Set() : new Set(filteredEleves.map(e => e.id)));
  }, [filteredEleves]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Supprimer définitivement ${ids.length} élève(s) ? Cette action est irréversible.`)) return;
    setBulkDeleting(true);
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const { error } = await supabase.from('eleves').delete().in('id', ids.slice(i, i + 50));
        if (error) throw error;
      }
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: queryKeys.eleves.all });
    } catch (err: any) {  toast.error('Erreur suppression: ' + err.message); }
    finally { setBulkDeleting(false); }
  }, [selectedIds, queryClient]);

  return {
    eleves: filteredEleves,
    allEleves: eleves,
    loading,
    paidEleveIds,
    showModal, setShowModal,
    selectedEleve, setSelectedEleve,
    formData, setFormData,
    autoGenerateMatricule, setAutoGenerateMatricule,
    generatingMatricule,
    selectedIds, bulkDeleting,
    openCreate, openEdit,
    resetForm,
    handleGenerateMatricule, handleSectionChange,
    submitEleve, deleteEleve,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    invalidateEleves: () => queryClient.invalidateQueries({ queryKey: queryKeys.eleves.all }),
  };
}
