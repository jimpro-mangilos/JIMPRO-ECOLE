import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, Search, X, User, Phone, MapPin, Calendar, GraduationCap, Users, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { montantEnLettres } from '../utils/numberToWords';
import { extraireMatriculeTexte } from '../utils/ascii';
import { notifierPaiement } from '../lib/smsService';

interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  classe: string | null;
  sexe: string;
  section: string;
  option: string | null;
  telephone: string;
  domicile: string;
  lieu_naissance: string;
  date_naissance: string;
  responsable: string;
  photo_url?: string | null;
}

interface MotifPaiement {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
}

interface TypePaiement {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
}

interface AnneeScolaire {
  id: string;
  annee: string;
  is_active: boolean;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedEleve?: Eleve | null;
}

const modesPaiement = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

const MOIS_SCOLAIRES = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
];

export default function PaymentFormModal({ isOpen, onClose, onSuccess, preselectedEleve }: PaymentFormModalProps) {
  const { user, userProfile, canEncaisser, currentSchoolId } = useAuth();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [motifs, setMotifs] = useState<MotifPaiement[]>([]);
  const [typesPaiement, setTypesPaiement] = useState<TypePaiement[]>([]);
  const [anneeScolaires, setAnneeScolaires] = useState<AnneeScolaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [eleveSearch, setEleveSearch] = useState('');
  const [showEleveSuggestions, setShowEleveSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const eleveSearchRef = useRef<HTMLDivElement | null>(null);
  const autoSelectedEleve = useRef(false);

  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);

  const [formData, setFormData] = useState({
    eleve_id: preselectedEleve?.id || '',
    type_paiement: '',
    description: '',
    montant_paye: '',
    montant_en_lettre: '',
    mode_paiement: 'especes',
    date_paiement: new Date().toISOString().split('T')[0],
    annee_scolaire: '',
    motif_id: '',
    mois_minerval: '',
    encaisser: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchEleves();
      fetchMotifs();
      fetchTypesPaiement();
      fetchAnneeScolaires();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedEleve) {
      setFormData(prev => ({ ...prev, eleve_id: preselectedEleve.id }));
    }
  }, [preselectedEleve]);

  useEffect(() => {
    if (formData.montant_paye) {
      const montant = parseFloat(formData.montant_paye);
      if (!isNaN(montant) && montant > 0) {
        setFormData(prev => ({
          ...prev,
          montant_en_lettre: montantEnLettres(montant)
        }));
      } else {
        setFormData(prev => ({ ...prev, montant_en_lettre: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, montant_en_lettre: '' }));
    }
  }, [formData.montant_paye]);

  const isMinervalType = useMemo(() => {
    if (!formData.type_paiement) return false;
    const selectedType = typesPaiement.find(t => t.id === formData.type_paiement);
    return selectedType?.libelle?.toLowerCase().includes('minerval') || false;
  }, [formData.type_paiement, typesPaiement]);

  useEffect(() => {
    if (!isMinervalType) {
      setPaidMonths([]);
      if (formData.mois_minerval) setFormData(prev => ({ ...prev, mois_minerval: '' }));
      return;
    }
    if (!formData.eleve_id || !formData.annee_scolaire) {
      setPaidMonths([]);
      return;
    }
    fetchPaidMonths();
  }, [isMinervalType, formData.eleve_id, formData.annee_scolaire]);

  const fetchPaidMonths = async () => {
    try {
      setLoadingMonths(true);
      const { data, error } = await supabase
        .from('paiements')
        .select('mois_minerval')
        .eq('ecole_id', currentSchoolId)
        .eq('eleve_id', formData.eleve_id)
        .eq('type_paiement', formData.type_paiement)
        .eq('annee_scolaire', formData.annee_scolaire)
        .neq('statut', 'annule');

      if (error) throw error;
      const months = (data || [])
        .map((p: any) => p.mois_minerval)
        .filter((m: string | null): m is string => !!m);
      setPaidMonths(months);
    } catch (error) {
      console.error('Erreur verification mois:', error);
      setPaidMonths([]);
    } finally {
      setLoadingMonths(false);
    }
  };

  const nextAllowedMonth = useMemo(() => {
    for (const mois of MOIS_SCOLAIRES) {
      if (!paidMonths.includes(mois)) return mois;
    }
    return null;
  }, [paidMonths]);

  const isMonthAllowed = (mois: string) => {
    if (paidMonths.includes(mois)) return false;
    const idx = MOIS_SCOLAIRES.indexOf(mois);
    if (idx === 0) return true;
    const previousMonth = MOIS_SCOLAIRES[idx - 1];
    return paidMonths.includes(previousMonth);
  };

  const fetchEleves = async () => {
    try {
      // Pagination sans plafond (limite PostgREST de 1000 lignes par requête)
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const to = from + PAGE - 1;
        const { data, error } = await supabase
          .from('eleves')
          .select('*')
          .eq('ecole_id', currentSchoolId)
          .order('nom')
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setEleves(all);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchMotifs = async () => {
    try {
      const { data, error } = await supabase
        .from('motifs_paiement')
        .select('*')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');

      if (error) throw error;
      setMotifs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des motifs:', error);
    }
  };

  const fetchTypesPaiement = async () => {
    try {
      const { data, error } = await supabase
        .from('types_paiement')
        .select('*')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');

      if (error) throw error;
      setTypesPaiement(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types de paiement:', error);
    }
  };

  const fetchAnneeScolaires = async () => {
    try {
      const { data, error } = await supabase
        .from('annees_scolaires')
        .select('*')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('annee', { ascending: false });

      if (error) throw error;
      const annees = data || [];
      setAnneeScolaires(annees);
      if (annees.length > 0) {
        setFormData((prev) => (
          prev.annee_scolaire ? prev : { ...prev, annee_scolaire: annees[0].annee }
        ));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des années scolaires:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eleve_id || !formData.montant_paye) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (isMinervalType && !formData.mois_minerval) {
      alert('Veuillez selectionner le mois pour le paiement Minerval');
      return;
    }

    if (isMinervalType && formData.mois_minerval && !isMonthAllowed(formData.mois_minerval)) {
      alert(`Le mois "${formData.mois_minerval}" n'est pas autorise. Veuillez d'abord payer le mois precedent.`);
      return;
    }

    try {
      setLoading(true);
      const { data: eleveSelectionne, error: eleveError } = await supabase
        .from('eleves')
        .select('*')
        .eq('ecole_id', currentSchoolId)
        .eq('id', formData.eleve_id)
        .maybeSingle();

      if (eleveError) throw eleveError;
      if (!eleveSelectionne) {
        alert('Élève non trouvé');
        return;
      }

      const motifSelectionne = motifs.find(m => m.id === formData.motif_id);
      const motifLibelle = isMinervalType ? formData.mois_minerval : (motifSelectionne?.libelle || '');

      const paiementData: any = {
        eleve_id: formData.eleve_id,
        nom_eleve: eleveSelectionne.nom,
        matricule: eleveSelectionne.matricule,
        postnom: eleveSelectionne.postnom,
        prenom: eleveSelectionne.prenom,
        classe: eleveSelectionne.classe || '',
        sexe: eleveSelectionne.sexe,
        section: eleveSelectionne.section,
        option: eleveSelectionne.option || null,
        telephone: eleveSelectionne.telephone,
        domicile: eleveSelectionne.domicile,
        lieu_naissance: eleveSelectionne.lieu_naissance || null,
        date_naissance: eleveSelectionne.date_naissance || null,
        responsable: eleveSelectionne.responsable || null,
        photo_url: eleveSelectionne.photo_url || null,
        type_paiement: formData.type_paiement,
        description: formData.description || null,
        montant_paye: parseFloat(formData.montant_paye),
        montant_en_lettre: formData.montant_en_lettre,
        mode_paiement: formData.mode_paiement,
        date_paiement: formData.date_paiement,
        annee_scolaire: formData.annee_scolaire || null,
        motif_id: isMinervalType ? null : (formData.motif_id || null),
        motif_libelle: motifLibelle,
        mois_minerval: isMinervalType ? formData.mois_minerval || null : null,
        comptable_id: user?.id,
        nom_comptable: `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim(),
        ecole_id: currentSchoolId,
      };

      if (formData.encaisser && canEncaisser()) {
        paiementData.est_encaisse = true;
        paiementData.date_encaissement = new Date().toISOString();
        paiementData.encaisseur_id = user?.id;
        paiementData.nom_encaisseur = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();
      }

      const { data: paiementCree, error } = await supabase.from('paiements').insert(paiementData).select().maybeSingle();

      if (error) throw error;

      // Notification SMS au numéro de l'élève (fiche) — non bloquant, si activé
      try {
        const { data: ecoleRow } = await supabase.from('ecoles').select('nom').eq('id', currentSchoolId).maybeSingle();
        notifierPaiement({
          ecoleId: currentSchoolId || '',
          eleveId: formData.eleve_id,
          telephone: eleveSelectionne.telephone || null,
          nomEleve: (eleveSelectionne.nom + ' ' + (eleveSelectionne.postnom || '') + ' ' + eleveSelectionne.prenom).trim(),
          montant: parseFloat(formData.montant_paye) || 0,
          motif: motifLibelle || '',
          numeroRecu: paiementCree?.numero_recu || '',
          datePaiement: formData.date_paiement,
          schoolName: ecoleRow?.nom || '',
        });
      } catch { /* le SMS ne doit jamais bloquer l'enregistrement */ }

      alert('Paiement enregistré avec succès');
      setFormData({
        eleve_id: '',
        type_paiement: '',
        description: '',
        montant_paye: '',
        montant_en_lettre: '',
        mode_paiement: 'especes',
        date_paiement: new Date().toISOString().split('T')[0],
        annee_scolaire: anneeScolaires[0]?.annee || '',
        motif_id: '',
        mois_minerval: '',
        encaisser: false,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedEleve = eleves.find(e => e.id === formData.eleve_id) || preselectedEleve;

  useEffect(() => {
    if (selectedEleve) {
      setEleveSearch(
        `${selectedEleve.matricule} - ${selectedEleve.nom} ${selectedEleve.postnom} ${selectedEleve.prenom}`
      );
    } else {
      setEleveSearch('');
    }
  }, [selectedEleve?.id]);

  useEffect(() => {
    if (!showEleveSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (eleveSearchRef.current && !eleveSearchRef.current.contains(e.target as Node)) {
        setShowEleveSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEleveSuggestions]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredEleves = useMemo(() => {
    const raw = eleveSearch.trim();
    const selectedLabel = selectedEleve
      ? `${selectedEleve.matricule} - ${selectedEleve.nom} ${selectedEleve.postnom} ${selectedEleve.prenom}`
      : '';
    if (!raw || eleveSearch === selectedLabel) return eleves.slice(0, 50);
    // Comme au portail de pointage : le matricule est extrait du décombre
    // d'informations tapées/collées (QR complet, nom + matricule, texte...)
    const m = extraireMatriculeTexte(raw);
    if (m) {
      const upper = m.toUpperCase();
      const res = eleves.filter(e => {
        const mat = e.matricule.toUpperCase();
        return mat === upper || mat.startsWith(upper);
      });
      return res.slice(0, 50);
    }
    // Sinon : recherche par nom / prénom / postnom / classe / section
    const term = normalize(raw);
    return eleves
      .filter(e => {
        const haystack = normalize(
          `${e.matricule} ${e.nom} ${e.postnom} ${e.prenom} ${e.classe || ''} ${e.section || ''}`
        );
        return haystack.includes(term);
      })
      .slice(0, 50);
  }, [eleves, eleveSearch, selectedEleve]);

  const selectEleve = (eleve: Eleve) => {
    setFormData(prev => ({ ...prev, eleve_id: eleve.id }));
    setEleveSearch(`${eleve.matricule} - ${eleve.nom} ${eleve.postnom} ${eleve.prenom}`);
    setShowEleveSuggestions(false);
    setHighlightedIndex(0);
  };

  const clearEleve = () => {
    setFormData(prev => ({ ...prev, eleve_id: '' }));
    setEleveSearch('');
    setShowEleveSuggestions(true);
    setHighlightedIndex(0);
  };

  // Ouverture DIRECTE : dès que le MATRICULE saisi identifie UN SEUL élève,
  // on sélectionne automatiquement (l'élève choisi remplit le formulaire)
  useEffect(() => {
    if (preselectedEleve) { autoSelectedEleve.current = false; return; }
    const raw = eleveSearch.trim();
    if (!raw || filteredEleves.length !== 1) { autoSelectedEleve.current = false; return; }
    const m = extraireMatriculeTexte(raw);
    if (!m) { autoSelectedEleve.current = false; return; }
    if (autoSelectedEleve.current) return;
    const t = setTimeout(() => {
      if (!autoSelectedEleve.current) {
        autoSelectedEleve.current = true;
        selectEleve(filteredEleves[0]);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleveSearch, filteredEleves]);

  const handleEleveKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowEleveSuggestions(true);
      setHighlightedIndex(i => Math.min(i + 1, Math.max(filteredEleves.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (showEleveSuggestions && filteredEleves[highlightedIndex]) {
        e.preventDefault();
        selectEleve(filteredEleves[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowEleveSuggestions(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Non renseignée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Enregistrer un Paiement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Rechercher l'Élève</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Rechercher par matricule, nom, prénom ou classe * — le matricule est reconnu même collé avec d'autres infos
              </label>
              <div className="relative" ref={eleveSearchRef}>
                <div className="relative">
                  <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={eleveSearch}
                    onChange={(e) => {
                      setEleveSearch(e.target.value);
                      setShowEleveSuggestions(true);
                      setHighlightedIndex(0);
                      if (formData.eleve_id) {
                        setFormData(prev => ({ ...prev, eleve_id: '' }));
                      }
                    }}
                    onFocus={() => !preselectedEleve && setShowEleveSuggestions(true)}
                    onKeyDown={handleEleveKeyDown}
                    disabled={!!preselectedEleve}
                    placeholder="Tapez un matricule (même avec d'autres infos), un nom, un prénom..."
                    className="w-full pl-9 pr-20 py-2 border border-blue-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoComplete="off"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {eleveSearch && !preselectedEleve && (
                      <button
                        type="button"
                        onClick={clearEleve}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label="Effacer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {!preselectedEleve && (
                      <button
                        type="button"
                        onClick={() => setShowEleveSuggestions(v => !v)}
                        className="p-1 text-blue-500 hover:text-blue-700 rounded"
                        aria-label="Afficher la liste"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${showEleveSuggestions ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {showEleveSuggestions && !preselectedEleve && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-blue-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
                    {filteredEleves.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Aucun élève trouvé
                      </div>
                    ) : (
                      filteredEleves.map((eleve, index) => {
                        const isActive = index === highlightedIndex;
                        const isSelected = eleve.id === formData.eleve_id;
                        return (
                          <button
                            key={eleve.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectEleve(eleve)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full text-left px-4 py-2 text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                              isActive ? 'bg-blue-50' : 'bg-white'
                            } ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-800'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {eleve.matricule}
                              </span>
                              <span className="text-xs text-gray-500">
                                {eleve.classe || eleve.section}
                              </span>
                            </div>
                            <div className="text-gray-700">
                              {eleve.nom} {eleve.postnom} {eleve.prenom}
                            </div>
                          </button>
                        );
                      })
                    )}
                    {filteredEleves.length >= 50 && (
                      <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 text-center">
                        Affinez la recherche pour plus de résultats
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

          {selectedEleve && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations Complètes de l'Élève
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center text-xl font-bold text-blue-700">
                      {selectedEleve.nom.charAt(0)}{selectedEleve.postnom.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Matricule</p>
                      <p className="text-sm font-bold text-blue-700">{selectedEleve.matricule}</p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <div>
                      <p className="text-xs text-gray-500">Nom complet</p>
                      <p className="text-base font-bold text-gray-900">
                        {selectedEleve.nom} {selectedEleve.postnom} {selectedEleve.prenom}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sexe</p>
                      <p className="text-sm font-medium">{selectedEleve.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Date de naissance
                      </p>
                      <p className="text-sm">{formatDate(selectedEleve.date_naissance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Lieu de naissance
                      </p>
                      <p className="text-sm">{selectedEleve.lieu_naissance || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Scolarité
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Section</p>
                      <p className="text-sm font-medium">{selectedEleve.section}</p>
                    </div>
                    {selectedEleve.option && (
                      <div>
                        <p className="text-xs text-gray-500">Option</p>
                        <p className="text-sm font-medium">{selectedEleve.option}</p>
                      </div>
                    )}
                    {selectedEleve.classe && (
                      <div>
                        <p className="text-xs text-gray-500">Classe</p>
                        <p className="text-sm font-medium">{selectedEleve.classe}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Responsable</p>
                      <p className="text-sm font-medium">{selectedEleve.responsable}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Téléphone
                      </p>
                      <p className="text-sm font-medium">{selectedEleve.telephone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Domicile
                      </p>
                      <p className="text-sm">{selectedEleve.domicile}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Informations de Paiement</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type *</label>
                <select
                  value={formData.type_paiement}
                  onChange={(e) => setFormData({ ...formData, type_paiement: e.target.value, motif_id: '', mois_minerval: '' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {typesPaiement.map((type) => (
                    <option key={type.id} value={type.id}>{type.libelle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Année *</label>
                <select
                  value={formData.annee_scolaire}
                  onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white disabled:opacity-50 transition-colors"
                  required
                  disabled={anneeScolaires.length === 0}
                >
                  {anneeScolaires.length === 0 ? (
                    <option value="">Aucune année configurée</option>
                  ) : (
                    <>
                      <option value="">Sélectionner une année</option>
                      {anneeScolaires.map((a) => (
                        <option key={a.id} value={a.annee}>{a.annee}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {isMinervalType ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Mois du Minerval *
                  </label>
                  {!formData.eleve_id || !formData.annee_scolaire ? (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Selectionnez d'abord un eleve et une annee scolaire
                    </p>
                  ) : loadingMonths ? (
                    <p className="text-sm text-gray-500 px-4 py-2 border border-green-300 rounded-md bg-gray-50">
                      Verification des paiements...
                    </p>
                  ) : nextAllowedMonth === null ? (
                    <p className="text-sm text-green-700 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Cet eleve est a jour pour toute l'annee scolaire (Septembre a Juillet)
                    </p>
                  ) : (
                    <>
                      <select
                        value={formData.mois_minerval}
                        onChange={(e) => setFormData({ ...formData, mois_minerval: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
                        required
                      >
                        <option value="">Selectionner le mois</option>
                        {MOIS_SCOLAIRES.map((mois) => {
                          const isPaid = paidMonths.includes(mois);
                          const allowed = isMonthAllowed(mois);
                          return (
                            <option key={mois} value={mois} disabled={isPaid || !allowed}>
                              {mois}{isPaid ? ' (deja paye)' : !allowed ? ' (payer d\'abord le mois precedent)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {MOIS_SCOLAIRES.map((mois) => {
                          const isPaid = paidMonths.includes(mois);
                          return (
                            <span
                              key={mois}
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : mois === nextAllowedMonth
                                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {mois.substring(0, 3)}{isPaid ? ' \u2713' : ''}
                            </span>
                          );
                        })}
                      </div>
                      {nextAllowedMonth && (
                        <p className="mt-2 text-xs text-blue-600">
                          Prochain mois a payer : <strong>{nextAllowedMonth}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Motif du Paiement *</label>
                  <select
                    value={formData.motif_id}
                    onChange={(e) => setFormData({ ...formData, motif_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
                    required
                  >
                    <option value="">Sélectionner un motif</option>
                    {motifs.map((motif) => (
                      <option key={motif.id} value={motif.id}>
                        {motif.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Montant Paye (FC) *</label>
                <input
                  type="number"
                  value={formData.montant_paye}
                  onChange={(e) => setFormData({ ...formData, montant_paye: e.target.value })}
                  className="w-full px-4 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: 50000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Montant en lettres</label>
                <textarea
                  value={formData.montant_en_lettre}
                  readOnly
                  className="w-full px-4 py-2 border border-indigo-300 rounded-lg bg-indigo-50 text-indigo-900 font-medium"
                  rows={2}
                  placeholder="Saisissez un montant en chiffres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mode de Paiement *</label>
                <select
                  value={formData.mode_paiement}
                  onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
                  required
                >
                  {modesPaiement.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                <input
                  type="date"
                  value={formData.date_paiement}
                  onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                  className="w-full px-4 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={2}
                  placeholder="Informations supplémentaires (optionnel)"
                />
              </div>
            </div>
          </div>

          {canEncaisser() && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.encaisser}
                  onChange={(e) => setFormData({ ...formData, encaisser: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="font-semibold text-amber-900">Encaisser le paiement immédiatement</p>
                  <p className="text-sm text-amber-700">
                    Un SMS et un email seront envoyés au responsable si cette case est cochée
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2.5 px-6 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le Paiement'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
