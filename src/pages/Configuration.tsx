import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLogo } from '../contexts/LogoContext';
import { invalidatePrefixCache } from '../utils/matriculeGenerator';
import { Settings, Plus, CreditCard as Edit2, Trash2, Check, X, AlertCircle, Hash, Package, Upload, Image, RotateCcw, Menu as MenuIcon } from 'lucide-react';
import MenuConfigTab from '../components/MenuConfigTab';

interface Section {
  id: string;
  nom: string;
  description: string;
  is_active: boolean;
  ordre: number;
}

interface Option {
  id: string;
  nom: string;
  section_id: string;
  description: string;
  is_active: boolean;
  ordre: number;
}

interface Classe {
  id: string;
  nom: string;
  section_id: string;
  option_id: string | null;
  niveau: string | null;
  designation: string | null;
  description: string;
  is_active: boolean;
  ordre: number;
}

interface MotifPaiement {
  id: string;
  libelle: string;
  description: string;
  is_active: boolean;
  ordre: number;
}

interface TypePaiement {
  id: string;
  libelle: string;
  description: string;
  is_active: boolean;
  ordre: number;
}

interface AnneeScolaire {
  id: string;
  annee: string;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
  ordre: number;
}

interface SectionPrefix {
  id: string;
  section: string;
  libelle: string;
  prefix: string;
  is_active: boolean;
  ordre: number;
}

interface TypeUniforme {
  id: string;
  libelle: string;
  description: string;
  is_active: boolean;
  ordre: number;
}

export default function Configuration() {
  const { canManageConfiguration } = useAuth();
  const { logoUrl, refreshLogo } = useLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [motifs, setMotifs] = useState<MotifPaiement[]>([]);
  const [typesPaiement, setTypesPaiement] = useState<TypePaiement[]>([]);
  const [anneeScolaires, setAnneeScolaires] = useState<AnneeScolaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sections' | 'options' | 'classes' | 'motifs' | 'types_paiement' | 'annees_scolaires' | 'prefixes_matricule' | 'types_uniforme' | 'logo' | 'menu_par_role'>('sections');
  const [sectionPrefixes, setSectionPrefixes] = useState<SectionPrefix[]>([]);
  const [typesUniforme, setTypesUniforme] = useState<TypeUniforme[]>([]);
  const [showTypeUniformeForm, setShowTypeUniformeForm] = useState(false);
  const [editingTypeUniforme, setEditingTypeUniforme] = useState<TypeUniforme | null>(null);
  const [typeUniformeForm, setTypeUniformeForm] = useState({ libelle: '', description: '', is_active: true });
  const [showPrefixForm, setShowPrefixForm] = useState(false);
  const [editingPrefix, setEditingPrefix] = useState<SectionPrefix | null>(null);
  const [prefixForm, setPrefixForm] = useState({
    section: '',
    libelle: '',
    prefix: '',
    is_active: true,
  });
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [showClasseForm, setShowClasseForm] = useState(false);
  const [showMotifForm, setShowMotifForm] = useState(false);
  const [showTypePaiementForm, setShowTypePaiementForm] = useState(false);
  const [showAnneeScolaireForm, setShowAnneeScolaireForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [editingMotif, setEditingMotif] = useState<MotifPaiement | null>(null);
  const [editingTypePaiement, setEditingTypePaiement] = useState<TypePaiement | null>(null);
  const [editingAnneeScolaire, setEditingAnneeScolaire] = useState<AnneeScolaire | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sectionForm, setSectionForm] = useState({
    nom: '',
    description: '',
    is_active: true,
  });

  const [optionForm, setOptionForm] = useState({
    nom: '',
    section_id: '',
    description: '',
    is_active: true,
  });

  const [classeForm, setClasseForm] = useState({
    nom: '',
    section_id: '',
    option_id: '',
    niveau: '',
    designation: '',
    description: '',
    is_active: true,
  });

  const [motifForm, setMotifForm] = useState({
    libelle: '',
    description: '',
    is_active: true,
  });

  const [typePaiementForm, setTypePaiementForm] = useState({
    libelle: '',
    description: '',
    is_active: true,
  });

  const [anneeScolaireForm, setAnneeScolaireForm] = useState({
    annee: '',
    date_debut: '',
    date_fin: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sectionsRes, optionsRes, classesRes, motifsRes, typesPaiementRes, anneeScolairesRes, sectionPrefixesRes, typesUniformeRes] = await Promise.all([
        supabase.from('sections').select('*').order('ordre'),
        supabase.from('options').select('*').order('ordre'),
        supabase.from('classes').select('*').order('ordre'),
        supabase.from('motifs_paiement').select('*').order('ordre'),
        supabase.from('types_paiement').select('*').order('ordre'),
        supabase.from('annees_scolaires').select('*').order('ordre'),
        supabase.from('section_prefixes').select('*').order('ordre'),
        supabase.from('types_uniforme').select('*').order('ordre'),
      ]);

      if (sectionsRes.error) throw sectionsRes.error;
      if (optionsRes.error) throw optionsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (motifsRes.error) throw motifsRes.error;
      if (typesPaiementRes.error) throw typesPaiementRes.error;
      if (anneeScolairesRes.error) throw anneeScolairesRes.error;

      setSections(sectionsRes.data || []);
      setOptions(optionsRes.data || []);
      setClasses(classesRes.data || []);
      setMotifs(motifsRes.data || []);
      setTypesPaiement(typesPaiementRes.data || []);
      setAnneeScolaires(anneeScolairesRes.data || []);
      setSectionPrefixes(sectionPrefixesRes.data || []);
      setTypesUniforme(typesUniformeRes.data || []);
    } catch (err: any) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  async function handleSectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingSection) {
        const { error } = await supabase
          .from('sections')
          .update(sectionForm)
          .eq('id', editingSection.id);

        if (error) throw error;
        setSuccess('Section mise à jour avec succès');
      } else {
        const maxOrdre = Math.max(...sections.map(s => s.ordre), 0);
        const { error } = await supabase
          .from('sections')
          .insert([{ ...sectionForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess('Section créée avec succès');
      }

      setSectionForm({ nom: '', description: '', is_active: true });
      setEditingSection(null);
      setShowSectionForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function handleOptionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!optionForm.section_id) {
      setError('Veuillez sélectionner une section');
      return;
    }

    try {
      if (editingOption) {
        const { error } = await supabase
          .from('options')
          .update(optionForm)
          .eq('id', editingOption.id);

        if (error) throw error;
        setSuccess('Option mise à jour avec succès');
      } else {
        const maxOrdre = Math.max(...options.filter(o => o.section_id === optionForm.section_id).map(o => o.ordre), 0);
        const { error } = await supabase
          .from('options')
          .insert([{ ...optionForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess('Option créée avec succès');
      }

      setOptionForm({ nom: '', section_id: '', description: '', is_active: true });
      setEditingOption(null);
      setShowOptionForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteSection(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return;

    try {
      const { error } = await supabase.from('sections').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Section supprimée avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function deleteOption(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette option ?')) return;

    try {
      const { error } = await supabase.from('options').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Option supprimée avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleSectionActive(section: Section) {
    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_active: !section.is_active })
        .eq('id', section.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  async function toggleOptionActive(option: Option) {
    try {
      const { error } = await supabase
        .from('options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editSection(section: Section) {
    setEditingSection(section);
    setSectionForm({
      nom: section.nom,
      description: section.description,
      is_active: section.is_active,
    });
    setShowSectionForm(true);
  }

  function editOption(option: Option) {
    setEditingOption(option);
    setOptionForm({
      nom: option.nom,
      section_id: option.section_id,
      description: option.description,
      is_active: option.is_active,
    });
    setShowOptionForm(true);
  }

  async function handleClasseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!classeForm.section_id) {
      setError('Veuillez sélectionner une section');
      return;
    }

    try {
      if (editingClasse) {
        const { error } = await supabase
          .from('classes')
          .update({
            nom: classeForm.nom,
            section_id: classeForm.section_id,
            option_id: classeForm.option_id || null,
            niveau: classeForm.niveau || null,
            designation: classeForm.designation || null,
            description: classeForm.description,
            is_active: classeForm.is_active,
          })
          .eq('id', editingClasse.id);

        if (error) throw error;
        setSuccess('Classe mise à jour avec succès');
      } else {
        const maxOrdre = Math.max(...classes.filter(c => c.section_id === classeForm.section_id).map(c => c.ordre), 0);
        const { error } = await supabase
          .from('classes')
          .insert([{
            nom: classeForm.nom,
            section_id: classeForm.section_id,
            option_id: classeForm.option_id || null,
            niveau: classeForm.niveau || null,
            designation: classeForm.designation || null,
            description: classeForm.description,
            is_active: classeForm.is_active,
            ordre: maxOrdre + 1,
          }]);

        if (error) throw error;
        setSuccess('Classe créée avec succès');
      }

      setClasseForm({ nom: '', section_id: '', option_id: '', niveau: '', designation: '', description: '', is_active: true });
      setEditingClasse(null);
      setShowClasseForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteClasse(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;

    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Classe supprimée avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleClasseActive(classe: Classe) {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !classe.is_active })
        .eq('id', classe.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editClasse(classe: Classe) {
    setEditingClasse(classe);
    setClasseForm({
      nom: classe.nom,
      section_id: classe.section_id,
      option_id: classe.option_id || '',
      niveau: classe.niveau || '',
      designation: classe.designation || '',
      description: classe.description,
      is_active: classe.is_active,
    });
    setShowClasseForm(true);
  }

  async function handleMotifSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingMotif) {
        const { error } = await supabase
          .from('motifs_paiement')
          .update(motifForm)
          .eq('id', editingMotif.id);

        if (error) throw error;
        setSuccess('Motif mis à jour avec succès');
      } else {
        const maxOrdre = Math.max(...motifs.map(m => m.ordre), 0);
        const { error } = await supabase
          .from('motifs_paiement')
          .insert([{ ...motifForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess('Motif créé avec succès');
      }

      setMotifForm({ libelle: '', description: '', is_active: true });
      setEditingMotif(null);
      setShowMotifForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteMotif(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce motif ?')) return;

    try {
      const { error } = await supabase.from('motifs_paiement').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Motif supprimé avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleMotifActive(motif: MotifPaiement) {
    try {
      const { error } = await supabase
        .from('motifs_paiement')
        .update({ is_active: !motif.is_active })
        .eq('id', motif.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editMotif(motif: MotifPaiement) {
    setEditingMotif(motif);
    setMotifForm({
      libelle: motif.libelle,
      description: motif.description,
      is_active: motif.is_active,
    });
    setShowMotifForm(true);
  }

  async function handleTypePaiementSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingTypePaiement) {
        const { error } = await supabase
          .from('types_paiement')
          .update(typePaiementForm)
          .eq('id', editingTypePaiement.id);

        if (error) throw error;
        setSuccess('Type de paiement mis à jour avec succès');
      } else {
        const maxOrdre = Math.max(...typesPaiement.map(t => t.ordre), 0);
        const { error } = await supabase
          .from('types_paiement')
          .insert([{ ...typePaiementForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess('Type de paiement créé avec succès');
      }

      setTypePaiementForm({ libelle: '', description: '', is_active: true });
      setEditingTypePaiement(null);
      setShowTypePaiementForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteTypePaiement(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de paiement ?')) return;

    try {
      const { error } = await supabase.from('types_paiement').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Type de paiement supprimé avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleTypePaiementActive(typePaiement: TypePaiement) {
    try {
      const { error } = await supabase
        .from('types_paiement')
        .update({ is_active: !typePaiement.is_active })
        .eq('id', typePaiement.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editTypePaiement(typePaiement: TypePaiement) {
    setEditingTypePaiement(typePaiement);
    setTypePaiementForm({
      libelle: typePaiement.libelle,
      description: typePaiement.description,
      is_active: typePaiement.is_active,
    });
    setShowTypePaiementForm(true);
  }

  async function handleAnneeScolaireSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingAnneeScolaire) {
        const { error } = await supabase
          .from('annees_scolaires')
          .update(anneeScolaireForm)
          .eq('id', editingAnneeScolaire.id);

        if (error) throw error;
        setSuccess('Année scolaire mise à jour avec succès');
      } else {
        const maxOrdre = Math.max(...anneeScolaires.map(a => a.ordre), 0);
        const { error } = await supabase
          .from('annees_scolaires')
          .insert([{ ...anneeScolaireForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess('Année scolaire créée avec succès');
      }

      setAnneeScolaireForm({ annee: '', date_debut: '', date_fin: '', is_active: true });
      setEditingAnneeScolaire(null);
      setShowAnneeScolaireForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteAnneeScolaire(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette année scolaire ?')) return;

    try {
      const { error } = await supabase.from('annees_scolaires').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Année scolaire supprimée avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleAnneeScolaireActive(anneeScolaire: AnneeScolaire) {
    try {
      const { error } = await supabase
        .from('annees_scolaires')
        .update({ is_active: !anneeScolaire.is_active })
        .eq('id', anneeScolaire.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editAnneeScolaire(anneeScolaire: AnneeScolaire) {
    setEditingAnneeScolaire(anneeScolaire);
    setAnneeScolaireForm({
      annee: anneeScolaire.annee,
      date_debut: anneeScolaire.date_debut || '',
      date_fin: anneeScolaire.date_fin || '',
      is_active: anneeScolaire.is_active,
    });
    setShowAnneeScolaireForm(true);
  }

  async function handlePrefixSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (prefixForm.prefix.length < 2 || prefixForm.prefix.length > 5) {
      setError('Le préfixe doit contenir entre 2 et 5 caractères');
      return;
    }

    try {
      if (editingPrefix) {
        const { error } = await supabase
          .from('section_prefixes')
          .update({
            section: prefixForm.section.trim().toUpperCase(),
            libelle: prefixForm.libelle,
            prefix: prefixForm.prefix.trim().toUpperCase(),
            is_active: prefixForm.is_active,
          })
          .eq('id', editingPrefix.id);

        if (error) throw error;
        setSuccess('Préfixe mis à jour avec succès');
      } else {
        const maxOrdre = Math.max(...sectionPrefixes.map(p => p.ordre), 0);
        const { error } = await supabase
          .from('section_prefixes')
          .insert([{
            section: prefixForm.section.trim().toUpperCase(),
            libelle: prefixForm.libelle,
            prefix: prefixForm.prefix.trim().toUpperCase(),
            is_active: prefixForm.is_active,
            ordre: maxOrdre + 1,
          }]);

        if (error) throw error;
        setSuccess('Préfixe créé avec succès');
      }

      invalidatePrefixCache();
      setPrefixForm({ section: '', libelle: '', prefix: '', is_active: true });
      setEditingPrefix(null);
      setShowPrefixForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deletePrefix(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce préfixe ?')) return;

    try {
      const { error } = await supabase.from('section_prefixes').delete().eq('id', id);
      if (error) throw error;
      invalidatePrefixCache();
      setSuccess('Préfixe supprimé avec succès');
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function togglePrefixActive(sp: SectionPrefix) {
    try {
      const { error } = await supabase
        .from('section_prefixes')
        .update({ is_active: !sp.is_active })
        .eq('id', sp.id);

      if (error) throw error;
      invalidatePrefixCache();
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editPrefix(sp: SectionPrefix) {
    setEditingPrefix(sp);
    setPrefixForm({
      section: sp.section,
      libelle: sp.libelle,
      prefix: sp.prefix,
      is_active: sp.is_active,
    });
    setShowPrefixForm(true);
  }

  async function handleTypeUniformeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingTypeUniforme) {
        const { error } = await supabase
          .from('types_uniforme')
          .update(typeUniformeForm)
          .eq('id', editingTypeUniforme.id);

        if (error) throw error;
        setSuccess("Type d'uniforme mis à jour avec succès");
      } else {
        const maxOrdre = Math.max(...typesUniforme.map(t => t.ordre), 0);
        const { error } = await supabase
          .from('types_uniforme')
          .insert([{ ...typeUniformeForm, ordre: maxOrdre + 1 }]);

        if (error) throw error;
        setSuccess("Type d'uniforme créé avec succès");
      }

      setTypeUniformeForm({ libelle: '', description: '', is_active: true });
      setEditingTypeUniforme(null);
      setShowTypeUniformeForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  async function deleteTypeUniforme(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type d'uniforme ?")) return;

    try {
      const { error } = await supabase.from('types_uniforme').delete().eq('id', id);
      if (error) throw error;
      setSuccess("Type d'uniforme supprimé avec succès");
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  }

  async function toggleTypeUniformeActive(typeUniforme: TypeUniforme) {
    try {
      const { error } = await supabase
        .from('types_uniforme')
        .update({ is_active: !typeUniforme.is_active })
        .eq('id', typeUniforme.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    }
  }

  function editTypeUniforme(typeUniforme: TypeUniforme) {
    setEditingTypeUniforme(typeUniforme);
    setTypeUniformeForm({
      libelle: typeUniforme.libelle,
      description: typeUniforme.description,
      is_active: typeUniforme.is_active,
    });
    setShowTypeUniformeForm(true);
  }

  function cancelForm() {
    setShowSectionForm(false);
    setShowOptionForm(false);
    setShowClasseForm(false);
    setShowMotifForm(false);
    setShowTypePaiementForm(false);
    setShowAnneeScolaireForm(false);
    setShowPrefixForm(false);
    setShowTypeUniformeForm(false);
    setEditingSection(null);
    setEditingOption(null);
    setEditingClasse(null);
    setEditingMotif(null);
    setEditingTypePaiement(null);
    setEditingAnneeScolaire(null);
    setEditingPrefix(null);
    setEditingTypeUniforme(null);
    setSectionForm({ nom: '', description: '', is_active: true });
    setOptionForm({ nom: '', section_id: '', description: '', is_active: true });
    setClasseForm({ nom: '', section_id: '', option_id: '', niveau: '', designation: '', description: '', is_active: true });
    setMotifForm({ libelle: '', description: '', is_active: true });
    setTypePaiementForm({ libelle: '', description: '', is_active: true });
    setAnneeScolaireForm({ annee: '', date_debut: '', date_fin: '', is_active: true });
    setPrefixForm({ section: '', libelle: '', prefix: '', is_active: true });
    setTypeUniformeForm({ libelle: '', description: '', is_active: true });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuration
          </h1>
          <p className="text-gray-600 mt-1">Gérer les sections et options scolaires</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        {/* Groupe 1: Donnees Scolaires */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Donnees Scolaires</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'sections'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Sections
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'options'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Options
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'classes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Classes
            </button>
            <button
              onClick={() => setActiveTab('annees_scolaires')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'annees_scolaires'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Annees Scolaires
            </button>
            {canManageConfiguration() && (
              <button
                onClick={() => setActiveTab('prefixes_matricule')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'prefixes_matricule'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                Prefixes Matricule
              </button>
            )}
          </div>
        </div>

        {/* Groupe 2: Gestion & Parametres */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Gestion & Parametres</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('motifs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'motifs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Motifs de Paiement
            </button>
            <button
              onClick={() => setActiveTab('types_paiement')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'types_paiement'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Types de Paiement
            </button>
            <button
              onClick={() => setActiveTab('types_uniforme')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'types_uniforme'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Types d'Uniforme
            </button>
            {canManageConfiguration() && (
              <button
                onClick={() => setActiveTab('logo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'logo'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                Logo
              </button>
            )}
            {canManageConfiguration() && (
              <button
                onClick={() => setActiveTab('menu_par_role')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'menu_par_role'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <MenuIcon className="w-3.5 h-3.5" />
                Menu par Role
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'sections' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setShowSectionForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une section
            </button>
          </div>

          {showSectionForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingSection ? 'Modifier la section' : 'Nouvelle section'}
              </h3>
              <form onSubmit={handleSectionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la section
                  </label>
                  <input
                    type="text"
                    value={sectionForm.nom}
                    onChange={(e) => setSectionForm({ ...sectionForm, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={sectionForm.description}
                    onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sectionForm.is_active}
                    onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Section active</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{section.nom}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        section.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {section.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {section.description && (
                    <p className="text-gray-600 text-sm">{section.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSectionActive(section)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      section.is_active
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {section.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => editSection(section)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setShowClasseForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une classe
            </button>
          </div>

          {showClasseForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingClasse ? 'Modifier la classe' : 'Nouvelle classe'}
              </h3>
              <form onSubmit={handleClasseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={classeForm.section_id}
                    onChange={(e) => setClasseForm({ ...classeForm, section_id: e.target.value, option_id: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une section</option>
                    {sections.filter(s => s.is_active).map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Option (optionnel)
                  </label>
                  <select
                    value={classeForm.option_id}
                    onChange={(e) => setClasseForm({ ...classeForm, option_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!classeForm.section_id}
                  >
                    <option value="">Aucune option</option>
                    {options.filter(o => o.is_active && o.section_id === classeForm.section_id).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la classe
                  </label>
                  <input
                    type="text"
                    value={classeForm.nom}
                    onChange={(e) => setClasseForm({ ...classeForm, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 5ème Scientifique A"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Niveau (optionnel)
                    </label>
                    <input
                      type="text"
                      value={classeForm.niveau}
                      onChange={(e) => setClasseForm({ ...classeForm, niveau: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 5ème, 1ère"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Désignation (optionnel)
                    </label>
                    <input
                      type="text"
                      value={classeForm.designation}
                      onChange={(e) => setClasseForm({ ...classeForm, designation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: A, B"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={classeForm.description}
                    onChange={(e) => setClasseForm({ ...classeForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description de la classe"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={classeForm.is_active}
                    onChange={(e) => setClasseForm({ ...classeForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Classe active</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {sections.map((section) => {
              const sectionClasses = classes.filter((c) => c.section_id === section.id);
              if (sectionClasses.length === 0) return null;

              return (
                <div key={section.id} className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.nom}</h3>
                  <div className="space-y-3">
                    {sectionClasses.map((classe) => {
                      const option = options.find(o => o.id === classe.option_id);
                      return (
                        <div
                          key={classe.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-800">{classe.nom}</span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  classe.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {classe.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {option && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {option.nom}
                                </span>
                              )}
                            </div>
                            {classe.description && (
                              <p className="text-gray-600 text-sm mt-1">{classe.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleClasseActive(classe)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                classe.is_active
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {classe.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                            <button
                              onClick={() => editClasse(classe)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteClasse(classe.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'motifs' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setShowMotifForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un motif de paiement
            </button>
          </div>

          {showMotifForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingMotif ? 'Modifier le motif' : 'Nouveau motif de paiement'}
              </h3>
              <form onSubmit={handleMotifSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé du motif
                  </label>
                  <input
                    type="text"
                    value={motifForm.libelle}
                    onChange={(e) => setMotifForm({ ...motifForm, libelle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 1ère Tranche, 2ème Tranche"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={motifForm.description}
                    onChange={(e) => setMotifForm({ ...motifForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description du motif (optionnel)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={motifForm.is_active}
                    onChange={(e) => setMotifForm({ ...motifForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Motif actif</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {motifs.map((motif) => (
              <div
                key={motif.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{motif.libelle}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        motif.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {motif.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {motif.description && (
                    <p className="text-gray-600 text-sm">{motif.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMotifActive(motif)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      motif.is_active
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {motif.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => editMotif(motif)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteMotif(motif.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'types_paiement' && (
        <div>
          {!canManageConfiguration() && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Accès restreint</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Seuls les administrateurs et les IT Managers peuvent gérer les types de paiement.
                </p>
              </div>
            </div>
          )}

          {canManageConfiguration() && (
            <div className="mb-6">
              <button
                onClick={() => setShowTypePaiementForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un type de paiement
              </button>
            </div>
          )}

          {showTypePaiementForm && canManageConfiguration() && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingTypePaiement ? 'Modifier le type de paiement' : 'Nouveau type de paiement'}
              </h3>
              <form onSubmit={handleTypePaiementSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé du type
                  </label>
                  <input
                    type="text"
                    value={typePaiementForm.libelle}
                    onChange={(e) => setTypePaiementForm({ ...typePaiementForm, libelle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Espèces, Virement, Chèque"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={typePaiementForm.description}
                    onChange={(e) => setTypePaiementForm({ ...typePaiementForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description du type de paiement (optionnel)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typePaiementForm.is_active}
                    onChange={(e) => setTypePaiementForm({ ...typePaiementForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Type actif</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {typesPaiement.map((typePaiement) => (
              <div
                key={typePaiement.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{typePaiement.libelle}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        typePaiement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {typePaiement.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {typePaiement.description && (
                    <p className="text-gray-600 text-sm">{typePaiement.description}</p>
                  )}
                </div>
                {canManageConfiguration() && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTypePaiementActive(typePaiement)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        typePaiement.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {typePaiement.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => editTypePaiement(typePaiement)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTypePaiement(typePaiement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'annees_scolaires' && (
        <div>
          {!canManageConfiguration() && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Accès restreint</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Seuls les administrateurs et les IT Managers peuvent gérer les années scolaires.
                </p>
              </div>
            </div>
          )}

          {canManageConfiguration() && (
            <div className="mb-6">
              <button
                onClick={() => setShowAnneeScolaireForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter une année scolaire
              </button>
            </div>
          )}

          {showAnneeScolaireForm && canManageConfiguration() && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingAnneeScolaire ? "Modifier l'année scolaire" : 'Nouvelle année scolaire'}
              </h3>
              <form onSubmit={handleAnneeScolaireSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année scolaire
                  </label>
                  <input
                    type="text"
                    value={anneeScolaireForm.annee}
                    onChange={(e) => setAnneeScolaireForm({ ...anneeScolaireForm, annee: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 2025-2026"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={anneeScolaireForm.date_debut}
                    onChange={(e) => setAnneeScolaireForm({ ...anneeScolaireForm, date_debut: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={anneeScolaireForm.date_fin}
                    onChange={(e) => setAnneeScolaireForm({ ...anneeScolaireForm, date_fin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={anneeScolaireForm.is_active}
                    onChange={(e) => setAnneeScolaireForm({ ...anneeScolaireForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Année active</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {anneeScolaires.map((anneeScolaire) => (
              <div
                key={anneeScolaire.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{anneeScolaire.annee}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        anneeScolaire.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {anneeScolaire.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {(anneeScolaire.date_debut || anneeScolaire.date_fin) && (
                    <p className="text-gray-600 text-sm">
                      {anneeScolaire.date_debut && new Date(anneeScolaire.date_debut).toLocaleDateString('fr-FR')}
                      {anneeScolaire.date_debut && anneeScolaire.date_fin && ' - '}
                      {anneeScolaire.date_fin && new Date(anneeScolaire.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                {canManageConfiguration() && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAnneeScolaireActive(anneeScolaire)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        anneeScolaire.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {anneeScolaire.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => editAnneeScolaire(anneeScolaire)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteAnneeScolaire(anneeScolaire.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'options' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setShowOptionForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une option
            </button>
          </div>

          {showOptionForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingOption ? "Modifier l'option" : 'Nouvelle option'}
              </h3>
              <form onSubmit={handleOptionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={optionForm.section_id}
                    onChange={(e) => setOptionForm({ ...optionForm, section_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une section</option>
                    {sections.filter(s => s.is_active).map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'option
                  </label>
                  <input
                    type="text"
                    value={optionForm.nom}
                    onChange={(e) => setOptionForm({ ...optionForm, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={optionForm.description}
                    onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={optionForm.is_active}
                    onChange={(e) => setOptionForm({ ...optionForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Option active</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {sections.map((section) => {
              const sectionOptions = options.filter((o) => o.section_id === section.id);
              if (sectionOptions.length === 0) return null;

              return (
                <div key={section.id} className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.nom}</h3>
                  <div className="space-y-3">
                    {sectionOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-800">{option.nom}</span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                option.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {option.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {option.description && (
                            <p className="text-gray-600 text-sm mt-1">{option.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleOptionActive(option)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              option.is_active
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {option.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => editOption(option)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteOption(option.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'types_uniforme' && (
        <div>
          {!canManageConfiguration() && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Accès restreint</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Seuls les administrateurs et les IT Managers peuvent gérer les types d'uniforme.
                </p>
              </div>
            </div>
          )}

          {canManageConfiguration() && (
            <div className="mb-6">
              <button
                onClick={() => setShowTypeUniformeForm(true)}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un type d'uniforme
              </button>
            </div>
          )}

          {showTypeUniformeForm && canManageConfiguration() && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingTypeUniforme ? "Modifier le type d'uniforme" : "Nouveau type d'uniforme"}
              </h3>
              <form onSubmit={handleTypeUniformeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé de l'article
                  </label>
                  <input
                    type="text"
                    value={typeUniformeForm.libelle}
                    onChange={(e) => setTypeUniformeForm({ ...typeUniformeForm, libelle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Ex: Pull, Chemise, Pantalon..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={typeUniformeForm.description}
                    onChange={(e) => setTypeUniformeForm({ ...typeUniformeForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description de l'article (optionnel)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeUniformeForm.is_active}
                    onChange={(e) => setTypeUniformeForm({ ...typeUniformeForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-teal-600"
                  />
                  <label className="text-sm text-gray-700">Article actif</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {typesUniforme.map((typeUniforme) => (
              <div
                key={typeUniforme.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-teal-100 p-1.5 rounded-lg">
                      <Package className="w-4 h-4 text-teal-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{typeUniforme.libelle}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        typeUniforme.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {typeUniforme.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {typeUniforme.description && (
                    <p className="text-gray-600 text-sm">{typeUniforme.description}</p>
                  )}
                </div>
                {canManageConfiguration() && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTypeUniformeActive(typeUniforme)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        typeUniforme.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {typeUniforme.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => editTypeUniforme(typeUniforme)}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTypeUniforme(typeUniforme.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {typesUniforme.length === 0 && (
              <div className="bg-white p-12 rounded-lg shadow-md text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun type d'uniforme configuré</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prefixes_matricule' && canManageConfiguration() && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Ces préfixes sont utilisés lors de la génération automatique des matricules des élèves.
              Le format est : <span className="font-mono font-semibold">PREFIXE-AAAAMMJJ-XXXXXXX</span>.
              Toute modification prend effet immédiatement pour les nouveaux élèves.
            </p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setShowPrefixForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un préfixe
            </button>
          </div>

          {showPrefixForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingPrefix ? 'Modifier le préfixe' : 'Nouveau préfixe'}
              </h3>
              <form onSubmit={handlePrefixSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section (identifiant interne)
                    </label>
                    <input
                      type="text"
                      value={prefixForm.section}
                      onChange={(e) => setPrefixForm({ ...prefixForm, section: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                      placeholder="Ex: MATERNELLE"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Doit correspondre au nom de la section (en majuscules)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Libellé affiché
                    </label>
                    <input
                      type="text"
                      value={prefixForm.libelle}
                      onChange={(e) => setPrefixForm({ ...prefixForm, libelle: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Maternelle"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Préfixe matricule
                  </label>
                  <input
                    type="text"
                    value={prefixForm.prefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase tracking-widest"
                    placeholder="Ex: SPM"
                    maxLength={5}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">2 à 5 caractères alphanumériques. Exemple de matricule généré : <span className="font-mono">{prefixForm.prefix || 'SPM'}-20260415-ABC1234</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefixForm.is_active}
                    onChange={(e) => setPrefixForm({ ...prefixForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Préfixe actif</label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {sectionPrefixes.map((sp) => (
              <div
                key={sp.id}
                className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex-1 flex items-center gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center min-w-[80px]">
                    <p className="text-xs text-blue-600 font-medium mb-1">Préfixe</p>
                    <p className="text-2xl font-bold text-blue-800 font-mono tracking-widest">{sp.prefix}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-800">{sp.libelle}</h3>
                      <span className="text-sm text-gray-500 font-mono">({sp.section})</span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sp.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sp.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-mono">
                      Exemple: <span className="text-gray-700">{sp.prefix}-20260415-ABC1234</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePrefixActive(sp)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      sp.is_active
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {sp.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => editPrefix(sp)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deletePrefix(sp.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {sectionPrefixes.length === 0 && (
              <div className="bg-white p-12 rounded-lg shadow-md text-center">
                <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun préfixe configuré</p>
                <p className="text-sm text-gray-400 mt-1">Les préfixes par défaut (SPM, SPP, SPS) seront utilisés</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logo' && canManageConfiguration() && (
        <div className="max-w-2xl">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Téléchargez le logo principal de l'application. Ce logo sera utilisé dans la barre latérale,
              les pages de connexion et d'inscription, ainsi que dans tous les documents PDF générés (reçus, rapports).
              Formats acceptés : PNG, JPG. Taille maximale : 2 Mo.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                Logo actuel
              </h3>

              <div className="flex flex-col items-center gap-6">
                <div className="w-64 h-40 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl flex items-center justify-center p-6 shadow-inner">
                  <img
                    src={logoUrl}
                    alt="Logo actuel"
                    className="max-w-full max-h-full object-contain drop-shadow-lg"
                  />
                </div>

                <div className="flex gap-3 w-full">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!['image/png', 'image/jpeg'].includes(file.type)) {
                        setError('Format invalide. Utilisez PNG ou JPG.');
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setError('Le fichier dépasse 2 Mo.');
                        return;
                      }

                      setError('');
                      setLogoUploading(true);
                      try {
                        const ext = file.type === 'image/png' ? 'png' : 'jpg';
                        const fileName = `logo_${Date.now()}.${ext}`;

                        const { error: uploadErr } = await supabase.storage
                          .from('logos')
                          .upload(fileName, file, { upsert: true });
                        if (uploadErr) throw uploadErr;

                        const { data: urlData } = supabase.storage
                          .from('logos')
                          .getPublicUrl(fileName);

                        const publicUrl = urlData.publicUrl;

                        const { error: settErr } = await supabase
                          .from('app_settings')
                          .upsert({ key: 'logo_url', value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                        if (settErr) throw settErr;

                        await refreshLogo();
                        setSuccess('Logo mis à jour avec succès');
                      } catch (err: any) {
                        setError(err.message || 'Erreur lors du téléchargement du logo');
                      } finally {
                        setLogoUploading(false);
                        if (logoInputRef.current) logoInputRef.current.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    {logoUploading ? 'Téléchargement...' : 'Télécharger un nouveau logo'}
                  </button>
                  <button
                    onClick={async () => {
                      setError('');
                      setLogoUploading(true);
                      try {
                        const { error: settErr } = await supabase
                          .from('app_settings')
                          .upsert({ key: 'logo_url', value: null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                        if (settErr) throw settErr;
                        await refreshLogo();
                        setSuccess('Logo réinitialisé par défaut');
                      } catch (err: any) {
                        setError(err.message || 'Erreur');
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                    disabled={logoUploading}
                    className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Défaut
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu_par_role' && canManageConfiguration() && (
        <MenuConfigTab />
      )}
    </div>
  );
}
