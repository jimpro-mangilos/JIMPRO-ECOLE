import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Users, DollarSign, Package, Briefcase, Loader2, CheckCircle, AlertCircle, UserCheck, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MultiSelectFilter from '../components/MultiSelectFilter';
import {
  generateElevesReport,
  generateMinervalReport,
  generateFinancesReport,
  generateFournituresElevesReport,
  generateFournituresBureauReport,
  generateRapportComptable,
  generateRapportComparatifComptables,
} from '../utils/pdfGenerator';

export default function Rapports() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comptables, setComptables] = useState<any[]>([]);
  const [selectedComptables, setSelectedComptables] = useState<string[]>([]);
  const [loadingComptables, setLoadingComptables] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [fournitureFilters, setFournitureFilters] = useState({
    section: [] as string[],
    classe: [] as string[],
    typeUniforme: [] as string[],
    annee: [] as string[],
    startDate: '',
    endDate: '',
    search: '',
  });
  const [fournitureSections, setFournitureSections] = useState<string[]>([]);
  const [fournitureClasses, setFournitureClasses] = useState<{ section: string; classe: string }[]>([]);
  const [fournitureTypes, setFournitureTypes] = useState<string[]>([]);
  const [fournitureAnnees, setFournitureAnnees] = useState<string[]>([]);

  const [eleveFilters, setEleveFilters] = useState({
    startDate: '',
    endDate: '',
    section: [] as string[],
    option: [] as string[],
    classe: [] as string[],
    motif: [] as string[],
    annee: [] as string[],
    montantMin: '',
    montantMax: '',
  });
  const [eleveSections, setEleveSections] = useState<string[]>([]);
  const [eleveOptions, setEleveOptions] = useState<{ nom: string; section_id: string }[]>([]);
  const [eleveClasses, setEleveClasses] = useState<{ nom: string; section: string; option: string }[]>([]);
  const [eleveMotifs, setEleveMotifs] = useState<string[]>([]);
  const [eleveAnnees, setEleveAnnees] = useState<string[]>([]);
  const [eleveSectionMap, setEleveSectionMap] = useState<Record<string, string>>({});

  const [financeFilters, setFinanceFilters] = useState({
    startDate: '',
    endDate: '',
    typeOperation: [] as string[],
    statut: [] as string[],
    comptable: [] as string[],
    approbateur: [] as string[],
    montantMin: '',
    montantMax: '',
    search: '',
  });
  const [financeComptables, setFinanceComptables] = useState<string[]>([]);
  const [financeApprobateurs, setFinanceApprobateurs] = useState<string[]>([]);

  useEffect(() => {
    loadComptables();
    loadFournitureFilterOptions();
    loadEleveFilterOptions();
    loadFinanceFilterOptions();
  }, []);

  const filteredFournitureClasses = useMemo(() => {
    if (!fournitureFilters.section) {
      return Array.from(new Set(fournitureClasses.map(c => c.classe))).sort();
    }
    return fournitureClasses
      .filter(c => c.section === fournitureFilters.section)
      .map(c => c.classe)
      .sort();
  }, [fournitureClasses, fournitureFilters.section]);

  const filteredEleveOptions = useMemo(() => {
    if (eleveFilters.section.length === 0) return eleveOptions.map(o => o.nom);
    const sectionIds = eleveFilters.section.map(s => eleveSectionMap[s] || '').filter(Boolean);
    return eleveOptions.filter(o => sectionIds.includes(o.section_id)).map(o => o.nom);
  }, [eleveOptions, eleveFilters.section, eleveSectionMap]);

  const filteredEleveClasses = useMemo(() => {
    let list = eleveClasses;
    if (eleveFilters.section.length > 0) list = list.filter(c => eleveFilters.section.includes(c.section));
    if (eleveFilters.option.length > 0) list = list.filter(c => eleveFilters.option.includes(c.option));
    return Array.from(new Set(list.map(c => c.nom))).sort();
  }, [eleveClasses, eleveFilters.section, eleveFilters.option]);

  const activeEleveFilterCount = Object.values(eleveFilters).filter(v => v && v.length > 0).length;

  const updateEleveFilter = (key: 'startDate' | 'endDate' | 'montantMin' | 'montantMax', value: string) => {
    setEleveFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateEleveArrayFilter = (key: 'section' | 'option' | 'classe' | 'motif' | 'annee', value: string[]) => {
    setEleveFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetEleveFilters = () => {
    setEleveFilters({
      startDate: '',
      endDate: '',
      section: [],
      option: [],
      classe: [],
      motif: [],
      annee: [],
      montantMin: '',
      montantMax: '',
    });
  };

  const loadEleveFilterOptions = async () => {
    try {
      const [sectionsRes, optionsRes, classesRes, motifsRes, anneesRes] = await Promise.all([
        supabase.from('sections').select('id, nom').eq('is_active', true).order('ordre'),
        supabase.from('options').select('id, nom, section_id').eq('is_active', true).order('ordre'),
        supabase.from('classes').select('id, nom, section_id, option_id').eq('is_active', true).order('ordre'),
        supabase.from('motifs_paiement').select('libelle').eq('is_active', true).order('ordre'),
        supabase.from('annees_scolaires').select('annee').order('ordre', { ascending: false }),
      ]);

      const sections = (sectionsRes.data || []) as { id: string; nom: string }[];
      const sectionMap: Record<string, string> = {};
      const sectionIdToName: Record<string, string> = {};
      sections.forEach(s => {
        sectionMap[s.nom] = s.id;
        sectionIdToName[s.id] = s.nom;
      });
      setEleveSectionMap(sectionMap);
      setEleveSections(sections.map(s => s.nom));

      const opts = (optionsRes.data || []) as { id: string; nom: string; section_id: string }[];
      setEleveOptions(opts.map(o => ({ nom: o.nom, section_id: o.section_id })));

      const cls = (classesRes.data || []) as { id: string; nom: string; section_id: string; option_id: string | null }[];
      setEleveClasses(cls.map(c => ({
        nom: c.nom,
        section: sectionIdToName[c.section_id] || '',
        option: opts.find(o => o.id === c.option_id)?.nom || '',
      })));

      setEleveMotifs((motifsRes.data || []).map((m: any) => m.libelle));
      setEleveAnnees((anneesRes.data || []).map((a: any) => a.annee));
    } catch (error) {
      console.error('Erreur chargement filtres eleves:', error);
    }
  };

  const activeFinanceFilterCount = Object.entries(financeFilters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : (v && (v as string).length > 0)).length;

  const updateFinanceFilter = (key: keyof typeof financeFilters, value: string) => {
    setFinanceFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateFinanceArrayFilter = (key: 'typeOperation' | 'statut' | 'comptable' | 'approbateur', values: string[]) => {
    setFinanceFilters(prev => ({ ...prev, [key]: values }));
  };

  const resetFinanceFilters = () => {
    setFinanceFilters({
      startDate: '',
      endDate: '',
      typeOperation: [] as string[],
      statut: [] as string[],
      comptable: [] as string[],
      approbateur: [] as string[],
      montantMin: '',
      montantMax: '',
      search: '',
    });
  };

  const loadFinanceFilterOptions = async () => {
    try {
       const { data } = await supabase
        .from('compte_courant')
        .select('nom_comptable, nom_approbateur, nom_encaisseur');

      const comptableSet = new Set<string>();
      const approbateurSet = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.nom_comptable) comptableSet.add(row.nom_comptable);
        if (row.nom_encaisseur) comptableSet.add(row.nom_encaisseur);
        if (row.nom_approbateur) approbateurSet.add(row.nom_approbateur);
      });
      setFinanceComptables(Array.from(comptableSet).sort());
      setFinanceApprobateurs(Array.from(approbateurSet).sort());
    } catch (error) {
      console.error('Erreur chargement filtres finances:', error);
    }
  };

  const loadFournitureFilterOptions = async () => {
    try {
      const [sectionsRes, classesRes, typesRes, anneesRes, distributionsRes] = await Promise.all([
        supabase.from('sections').select('nom').eq('is_active', true).order('ordre'),
        supabase
          .from('classes')
          .select('nom, sections(nom)')
          .eq('is_active', true)
          .order('nom'),
        supabase.from('types_uniforme').select('libelle').eq('is_active', true).order('ordre'),
        supabase.from('annees_scolaires').select('annee').order('ordre', { ascending: false }),
        supabase.from('gestion_uniformes').select('section, classe, type_uniforme_libelle, annee_scolaire'),
      ]);

      const sectionSet = new Set<string>();
      (sectionsRes.data || []).forEach((s: any) => s?.nom && sectionSet.add(s.nom));
      (distributionsRes.data || []).forEach((d: any) => d?.section && sectionSet.add(d.section));

      const classMap = new Map<string, { section: string; classe: string }>();
      (classesRes.data || []).forEach((c: any) => {
        const sec = c?.sections?.nom || '';
        const cls = c?.nom || '';
        if (cls) classMap.set(`${sec}::${cls}`, { section: sec, classe: cls });
      });
      (distributionsRes.data || []).forEach((d: any) => {
        if (d?.classe) classMap.set(`${d.section || ''}::${d.classe}`, { section: d.section || '', classe: d.classe });
      });

      const typeSet = new Set<string>();
      (typesRes.data || []).forEach((t: any) => t?.libelle && typeSet.add(t.libelle));
      (distributionsRes.data || []).forEach((d: any) => d?.type_uniforme_libelle && typeSet.add(d.type_uniforme_libelle));

      const anneeSet = new Set<string>();
      (anneesRes.data || []).forEach((a: any) => a?.annee && anneeSet.add(a.annee));
      (distributionsRes.data || []).forEach((d: any) => d?.annee_scolaire && anneeSet.add(d.annee_scolaire));

      setFournitureSections(Array.from(sectionSet).sort());
      setFournitureClasses(Array.from(classMap.values()));
      setFournitureTypes(Array.from(typeSet).sort());
      setFournitureAnnees(Array.from(anneeSet).sort().reverse());
    } catch (error) {
      console.error('Erreur chargement filtres fournitures:', error);
    }
  };

  const updateFournitureFilter = (key: keyof typeof fournitureFilters, value: string) => {
    setFournitureFilters(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  const updateFournitureArrayFilter = (key: 'section' | 'classe' | 'typeUniforme' | 'annee', values: string[]) => {
    setFournitureFilters(prev => ({ ...prev, [key]: values }));
  };

  const resetFournitureFilters = () => {
    setFournitureFilters({
      section: [] as string[],
      classe: [] as string[],
      typeUniforme: [] as string[],
      annee: [] as string[],
      startDate: '',
      endDate: '',
      search: '',
    });
  };

  const activeFournitureFilterCount = Object.entries(fournitureFilters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : (v && (v as string).length > 0)).length;

  const loadComptables = async () => {
    setLoadingComptables(true);
    try {
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .in('nom', ['comptable', 'IT_MANAGER', 'admin']);

      const roleIds = (roles || []).map(r => r.id);

      const [roleProfilesResult, encaisseursResult] = await Promise.all([
        roleIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, nom, prenom, email')
              .in('role_id', roleIds)
              .eq('is_active', true)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from('paiements')
          .select('encaisseur_id')
          .eq('est_encaisse', true)
          .not('encaisseur_id', 'is', null),
      ]);

      if (roleProfilesResult.error) throw roleProfilesResult.error;
      if (encaisseursResult.error) throw encaisseursResult.error;

      const encaisseurIds = Array.from(
        new Set(
          (encaisseursResult.data || [])
            .map((p: any) => p.encaisseur_id)
            .filter(Boolean)
        )
      );

      let encaisseurProfiles: any[] = [];
      if (encaisseurIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom, email')
          .in('id', encaisseurIds);
        if (profilesError) throw profilesError;
        encaisseurProfiles = profilesData || [];
      }

      const merged = new Map<string, any>();
      (roleProfilesResult.data || []).forEach((p: any) => merged.set(p.id, p));
      encaisseurProfiles.forEach(p => {
        if (!merged.has(p.id)) merged.set(p.id, p);
      });

      const list = Array.from(merged.values()).sort((a, b) => {
        const an = `${a.nom || ''} ${a.prenom || ''}`.toLowerCase();
        const bn = `${b.nom || ''} ${b.prenom || ''}`.toLowerCase();
        return an.localeCompare(bn);
      });

      setComptables(list);
    } catch (error) {
      console.error('Erreur lors du chargement des comptables:', error);
    } finally {
      setLoadingComptables(false);
    }
  };

  async function handleRapportComptable() {
    if (selectedComptables.length === 0) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner au moins un comptable' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (selectedComptables.length === 1) {
        const comptableId = selectedComptables[0];
        const comptable = comptables.find(c => c.id === comptableId);
        if (!comptable) return;

        let query = supabase
          .from('paiements')
          .select('*')
          .or(`encaisseur_id.eq.${comptableId},and(encaisseur_id.is.null,comptable_id.eq.${comptableId})`)
          .eq('est_encaisse', true)
          .order('date_encaissement', { ascending: false });

        if (start) query = query.gte('date_paiement', start.toISOString().split('T')[0]);
        if (end) query = query.lte('date_paiement', end.toISOString().split('T')[0]);

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
          setMessage({ type: 'error', text: 'Aucune donnée disponible pour cette période' });
          return;
        }

        generateRapportComptable(comptable, data, start, end);
        setMessage({ type: 'success', text: 'Rapport généré avec succès' });
      } else {
        const comptablesData = await Promise.all(
          selectedComptables.map(async (comptableId) => {
            const comptable = comptables.find(c => c.id === comptableId);
            if (!comptable) return null;

            let query = supabase
              .from('paiements')
              .select('*')
              .or(`encaisseur_id.eq.${comptableId},and(encaisseur_id.is.null,comptable_id.eq.${comptableId})`);

            if (start) query = query.gte('date_paiement', start.toISOString().split('T')[0]);
            if (end) query = query.lte('date_paiement', end.toISOString().split('T')[0]);

            const { data } = await query;
            const paiements = data || [];
            const encaisses = paiements.filter(p => p.est_encaisse);

            return {
              comptable,
              stats: {
                nombre_transactions: paiements.length,
                montant_total: paiements.reduce((sum, p) => sum + p.montant_paye, 0),
                nombre_encaisses: encaisses.length,
                montant_encaisse: encaisses.reduce((sum, p) => sum + p.montant_paye, 0),
              },
            };
          })
        );

        const validData = comptablesData.filter(d => d !== null) as any[];

        if (validData.length === 0) {
          setMessage({ type: 'error', text: 'Aucune donnée disponible' });
          return;
        }

        generateRapportComparatifComptables(validData, start, end);
        setMessage({ type: 'success', text: 'Rapport comparatif généré avec succès' });
      }
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération du rapport' });
    } finally {
      setLoading(false);
    }
  }

  const toggleComptableSelection = (comptableId: string) => {
    setSelectedComptables(prev =>
      prev.includes(comptableId)
        ? prev.filter(id => id !== comptableId)
        : [...prev, comptableId]
    );
  };

  async function handleElevesReport() {
    try {
      setLoading(true);
      setMessage(null);

      let query = supabase
        .from('eleves')
        .select('*')
        .order('section', { ascending: true })
        .order('nom', { ascending: true });

      if (eleveFilters.section.length > 0) query = query.in('section', eleveFilters.section);
      if (eleveFilters.option.length > 0) query = query.in('option', eleveFilters.option);
      if (eleveFilters.classe.length > 0) query = query.in('classe', eleveFilters.classe);

      const { data: elevesData, error: elevesError } = await query;
      if (elevesError) throw elevesError;

      let filteredEleves = elevesData || [];

      const hasPaymentFilters = eleveFilters.motif.length > 0 || eleveFilters.annee.length > 0 || eleveFilters.montantMin || eleveFilters.montantMax || eleveFilters.startDate || eleveFilters.endDate;

      if (hasPaymentFilters && filteredEleves.length > 0) {
        let pQuery = supabase.from('paiements').select('matricule, montant_paye, motif_libelle, annee_scolaire, date_paiement, statut, est_encaisse');

        if (eleveFilters.motif.length > 0) pQuery = pQuery.in('motif_libelle', eleveFilters.motif);
        if (eleveFilters.annee.length > 0) pQuery = pQuery.in('annee_scolaire', eleveFilters.annee);
        if (eleveFilters.startDate) pQuery = pQuery.gte('date_paiement', eleveFilters.startDate);
        if (eleveFilters.endDate) pQuery = pQuery.lte('date_paiement', `${eleveFilters.endDate}T23:59:59.999Z`);
        if (eleveFilters.montantMin) pQuery = pQuery.gte('montant_paye', parseInt(eleveFilters.montantMin));
        if (eleveFilters.montantMax) pQuery = pQuery.lte('montant_paye', parseInt(eleveFilters.montantMax));

        const { data: paiementsData, error: pError } = await pQuery;
        if (pError) throw pError;

        const matriculesWithPayments = new Set((paiementsData || []).map(p => p.matricule));
        filteredEleves = filteredEleves.filter(e => matriculesWithPayments.has(e.matricule));
      }

      if (filteredEleves.length === 0) {
        setMessage({ type: 'error', text: activeEleveFilterCount > 0 ? 'Aucun eleve ne correspond aux filtres appliques' : 'Aucune donnee disponible pour ce rapport' });
        return;
      }

      generateElevesReport(filteredEleves);
      setMessage({ type: 'success', text: `Rapport genere avec succes (${filteredEleves.length} eleves)` });
    } catch (error) {
      console.error('Erreur lors de la generation du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la generation du rapport' });
    } finally {
      setLoading(false);
    }
  }

  async function handleMinervalReport() {
    try {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from('minerval')
        .select('*')
        .order('date_paiement', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage({ type: 'error', text: 'Aucune donnée disponible pour ce rapport' });
        return;
      }

      generateMinervalReport(data);
      setMessage({ type: 'success', text: 'Rapport généré avec succès' });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération du rapport' });
    } finally {
      setLoading(false);
    }
  }

  async function handleFinancesReport() {
    try {
      setLoading(true);
      setMessage(null);

      let query = supabase
        .from('compte_courant')
        .select('*')
        .order('date_transaction', { ascending: false });

      if (financeFilters.typeOperation.length > 0) query = query.in('type_operation', financeFilters.typeOperation);
      if (financeFilters.statut.length > 0) query = query.in('statut', financeFilters.statut);
      if (financeFilters.comptable.length > 0) {
        const orParts = financeFilters.comptable.map(c => `nom_comptable.eq.${c},nom_encaisseur.eq.${c}`).join(',');
        query = query.or(orParts);
      }
      if (financeFilters.approbateur.length > 0) query = query.in('nom_approbateur', financeFilters.approbateur);
      if (financeFilters.startDate) query = query.gte('date_transaction', financeFilters.startDate);
      if (financeFilters.endDate) query = query.lte('date_transaction', `${financeFilters.endDate}T23:59:59.999Z`);
      if (financeFilters.montantMin) query = query.gte('montant_chiffre', parseInt(financeFilters.montantMin));
      if (financeFilters.montantMax) query = query.lte('montant_chiffre', parseInt(financeFilters.montantMax));

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (financeFilters.search.trim()) {
        const term = financeFilters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (t: any) =>
            t.beneficiaire.toLowerCase().includes(term) ||
            t.libelle.toLowerCase().includes(term)
        );
      }

      if (filtered.length === 0) {
        setMessage({ type: 'error', text: activeFinanceFilterCount > 0 ? 'Aucune transaction ne correspond aux filtres appliques' : 'Aucune donnee disponible pour ce rapport' });
        return;
      }

      const start = financeFilters.startDate ? new Date(financeFilters.startDate) : undefined;
      const end = financeFilters.endDate ? new Date(financeFilters.endDate) : undefined;
      const filterParts: string[] = [];
      if (financeFilters.typeOperation.length > 0) filterParts.push('Type: ' + financeFilters.typeOperation.join(', '));
      if (financeFilters.statut.length > 0) filterParts.push('Statut: ' + financeFilters.statut.join(', '));
      if (financeFilters.comptable.length > 0) filterParts.push('Intervenant: ' + financeFilters.comptable.join(', '));
      if (financeFilters.approbateur.length > 0) filterParts.push('Approbateur: ' + financeFilters.approbateur.join(', '));
      if (financeFilters.montantMin) filterParts.push('Min: ' + financeFilters.montantMin + ' FC');
      if (financeFilters.montantMax) filterParts.push('Max: ' + financeFilters.montantMax + ' FC');
      const filterInfo = filterParts.length > 0 ? filterParts.join(' | ') : undefined;
      generateFinancesReport(filtered, filterInfo, start, end);
      setMessage({ type: 'success', text: `Rapport financier genere avec succes (${filtered.length} transactions)` });
    } catch (error) {
      console.error('Erreur lors de la generation du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la generation du rapport' });
    } finally {
      setLoading(false);
    }
  }

  async function handleFournituresElevesReport() {
    try {
      setLoading(true);
      setMessage(null);

      let query = supabase
        .from('gestion_uniformes')
        .select('matricule, nom_eleve, postnom, prenom, section, classe, type_uniforme_libelle, quantite, annee_scolaire, date_distribution, nom_comptable');

      if (fournitureFilters.section.length > 0) query = query.in('section', fournitureFilters.section);
      if (fournitureFilters.classe.length > 0) query = query.in('classe', fournitureFilters.classe);
      if (fournitureFilters.typeUniforme.length > 0) query = query.in('type_uniforme_libelle', fournitureFilters.typeUniforme);
      if (fournitureFilters.annee.length > 0) query = query.in('annee_scolaire', fournitureFilters.annee);
      if (fournitureFilters.startDate) query = query.gte('date_distribution', fournitureFilters.startDate);
      if (fournitureFilters.endDate) {
        const endOfDay = `${fournitureFilters.endDate}T23:59:59.999Z`;
        query = query.lte('date_distribution', endOfDay);
      }
      if (fournitureFilters.search.trim()) {
        const term = fournitureFilters.search.trim().replace(/[%,]/g, '');
        query = query.or(
          `matricule.ilike.%${term}%,nom_eleve.ilike.%${term}%,postnom.ilike.%${term}%,prenom.ilike.%${term}%`
        );
      }

      query = query
        .order('section', { ascending: true })
        .order('nom_eleve', { ascending: true })
        .order('date_distribution', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage({
          type: 'error',
          text:
            activeFournitureFilterCount > 0
              ? 'Aucune donnée disponible pour ces filtres'
              : 'Aucune donnée disponible pour ce rapport',
        });
        return;
      }

      generateFournituresElevesReport(data, {
        section: fournitureFilters.section.join(', '),
        classe: fournitureFilters.classe.join(', '),
        typeUniforme: fournitureFilters.typeUniforme.join(', '),
        annee: fournitureFilters.annee.join(', '),
        startDate: fournitureFilters.startDate,
        endDate: fournitureFilters.endDate,
        search: fournitureFilters.search.trim(),
      });
      setMessage({ type: 'success', text: 'Rapport généré avec succès' });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération du rapport' });
    } finally {
      setLoading(false);
    }
  }

  async function handleFournituresBureauReport() {
    try {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from('gestion_fourniture_bureau')
        .select('*')
        .order('date_operation', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage({ type: 'error', text: 'Aucune donnée disponible pour ce rapport' });
        return;
      }

      generateFournituresBureauReport(data);
      setMessage({ type: 'success', text: 'Rapport généré avec succès' });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération du rapport' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-600 mt-1">Générez et exportez vos rapports</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'eleves' ? null : 'eleves')}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-sm">Rapport des Eleves</h3>
              <p className="text-xs text-gray-500">Filtrez par section, option, classe, motif, annee</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeEleveFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                <Filter className="w-3 h-3" />
                {activeEleveFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'eleves' ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {expandedSection === 'eleves' && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MultiSelectFilter
            label="Section"
            placeholder="Toutes les sections"
            options={eleveSections}
            selected={eleveFilters.section}
            onChange={(v) => updateEleveArrayFilter('section', v)}
          />
          <MultiSelectFilter
            label="Option"
            placeholder="Toutes les options"
            options={filteredEleveOptions}
            selected={eleveFilters.option}
            onChange={(v) => updateEleveArrayFilter('option', v)}
          />
          <MultiSelectFilter
            label="Classe"
            placeholder="Toutes les classes"
            options={filteredEleveClasses}
            selected={eleveFilters.classe}
            onChange={(v) => updateEleveArrayFilter('classe', v)}
          />
          <MultiSelectFilter
            label="En regle (motif de paiement)"
            placeholder="Tous les motifs"
            options={eleveMotifs}
            selected={eleveFilters.motif}
            onChange={(v) => updateEleveArrayFilter('motif', v)}
          />
          <MultiSelectFilter
            label="Annee scolaire"
            placeholder="Toutes les annees"
            options={eleveAnnees}
            selected={eleveFilters.annee}
            onChange={(v) => updateEleveArrayFilter('annee', v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de debut</label>
            <input
              type="date"
              value={eleveFilters.startDate}
              onChange={(e) => updateEleveFilter('startDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="date"
              value={eleveFilters.endDate}
              onChange={(e) => updateEleveFilter('endDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant minimum (FC)</label>
            <input
              type="number"
              value={eleveFilters.montantMin}
              onChange={(e) => updateEleveFilter('montantMin', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant maximum (FC)</label>
            <input
              type="number"
              value={eleveFilters.montantMax}
              onChange={(e) => updateEleveFilter('montantMax', e.target.value)}
              placeholder="Illimite"
              min="0"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleElevesReport}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generation en cours...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generer le rapport
              </>
            )}
          </button>
          <button
            onClick={resetEleveFilters}
            disabled={loading || activeEleveFilterCount === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reinitialiser
          </button>
        </div>
            </div>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'finances' ? null : 'finances')}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-sm">Rapport Financier</h3>
              <p className="text-xs text-gray-500">Filtrez par type, statut, comptable, approbateur, periode</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFinanceFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                <Filter className="w-3 h-3" />
                {activeFinanceFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'finances' ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {expandedSection === 'finances' && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MultiSelectFilter
            label="Type d'operation"
            placeholder="Tous les types"
            options={['recette', 'dépense']}
            selected={financeFilters.typeOperation}
            onChange={(v) => updateFinanceArrayFilter('typeOperation', v)}
          />
          <MultiSelectFilter
            label="Statut"
            placeholder="Tous les statuts"
            options={['en_attente', 'approuve', 'encaisse', 'decaisse']}
            selected={financeFilters.statut}
            onChange={(v) => updateFinanceArrayFilter('statut', v)}
          />
          <MultiSelectFilter
            label="Comptable / Encaisseur"
            placeholder="Tous (comptable, encaisseur)"
            options={financeComptables}
            selected={financeFilters.comptable}
            onChange={(v) => updateFinanceArrayFilter('comptable', v)}
          />
          <MultiSelectFilter
            label="Approbateur"
            placeholder="Tous les approbateurs"
            options={financeApprobateurs}
            selected={financeFilters.approbateur}
            onChange={(v) => updateFinanceArrayFilter('approbateur', v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de debut</label>
            <input
              type="date"
              value={financeFilters.startDate}
              onChange={(e) => updateFinanceFilter('startDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="date"
              value={financeFilters.endDate}
              onChange={(e) => updateFinanceFilter('endDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant minimum (FC)</label>
            <input
              type="number"
              value={financeFilters.montantMin}
              onChange={(e) => updateFinanceFilter('montantMin', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant maximum (FC)</label>
            <input
              type="number"
              value={financeFilters.montantMax}
              onChange={(e) => updateFinanceFilter('montantMax', e.target.value)}
              placeholder="Illimite"
              min="0"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche (beneficiaire, libelle)</label>
            <input
              type="text"
              value={financeFilters.search}
              onChange={(e) => updateFinanceFilter('search', e.target.value)}
              placeholder="ex: Mukendi, Loyer bureau..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleFinancesReport}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generation en cours...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generer le rapport
              </>
            )}
          </button>
          <button
            onClick={resetFinanceFilters}
            disabled={loading || activeFinanceFilterCount === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reinitialiser
          </button>
        </div>
            </div>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'fournitures' ? null : 'fournitures')}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-orange-600 shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-sm">Rapport Fournitures Élèves</h3>
              <p className="text-xs text-gray-500">Filtrez par section, classe, type, annee</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFournitureFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
                <Filter className="w-3 h-3" />
                {activeFournitureFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'fournitures' ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {expandedSection === 'fournitures' && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MultiSelectFilter
            label="Section"
            placeholder="Toutes les sections"
            options={fournitureSections}
            selected={fournitureFilters.section}
            onChange={(v) => updateFournitureArrayFilter('section', v)}
          />
          <MultiSelectFilter
            label="Classe"
            placeholder="Toutes les classes"
            options={filteredFournitureClasses}
            selected={fournitureFilters.classe}
            onChange={(v) => updateFournitureArrayFilter('classe', v)}
          />
          <MultiSelectFilter
            label="Type d'uniforme"
            placeholder="Tous les types"
            options={fournitureTypes}
            selected={fournitureFilters.typeUniforme}
            onChange={(v) => updateFournitureArrayFilter('typeUniforme', v)}
          />
          <MultiSelectFilter
            label="Année scolaire"
            placeholder="Toutes les années"
            options={fournitureAnnees}
            selected={fournitureFilters.annee}
            onChange={(v) => updateFournitureArrayFilter('annee', v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
            <input
              type="date"
              value={fournitureFilters.startDate}
              onChange={(e) => updateFournitureFilter('startDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="date"
              value={fournitureFilters.endDate}
              onChange={(e) => updateFournitureFilter('endDate', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche élève (matricule, nom, postnom, prénom)</label>
            <input
              type="text"
              value={fournitureFilters.search}
              onChange={(e) => updateFournitureFilter('search', e.target.value)}
              placeholder="ex: MAT2025, Mukendi..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleFournituresElevesReport}
            disabled={loading}
            className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Générer le rapport
              </>
            )}
          </button>
          <button
            onClick={resetFournitureFilters}
            disabled={loading || activeFournitureFilterCount === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>
            </div>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'comptable' ? null : 'comptable')}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-pink-600 shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-sm">Rapport par Comptable</h3>
              <p className="text-xs text-gray-500">Performance et statistiques des comptables</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'comptable' ? 'rotate-180' : ''}`} />
        </button>
        {expandedSection === 'comptable' && (
          <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-gray-600 mb-6">
          Générez des rapports détaillés pour un ou plusieurs comptables avec comparaison des performances
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sélection des Comptables *
            </label>
            {loadingComptables ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Chargement des comptables...</span>
              </div>
            ) : comptables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun comptable trouvé dans le système
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {comptables.map((comptable) => (
                  <label
                    key={comptable.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedComptables.includes(comptable.id)
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedComptables.includes(comptable.id)}
                      onChange={() => toggleComptableSelection(comptable.id)}
                      className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {comptable.nom} {comptable.prenom}
                      </p>
                      <p className="text-xs text-gray-500">{comptable.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedComptables.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-pink-600" />
                <span className="text-sm text-pink-700 font-medium">
                  {selectedComptables.length} comptable{selectedComptables.length > 1 ? 's' : ''} sélectionné{selectedComptables.length > 1 ? 's' : ''}
                  {selectedComptables.length > 1 && ' - Rapport comparatif sera généré'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Début (optionnel)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Fin (optionnel)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <h3 className="font-medium text-pink-900 mb-2">Informations</h3>
            <ul className="text-sm text-pink-800 space-y-1 list-disc list-inside">
              <li>Sélectionnez un seul comptable pour un rapport détaillé individuel</li>
              <li>Sélectionnez plusieurs comptables pour un rapport comparatif</li>
              <li>Les dates sont optionnelles (par défaut: tous les temps)</li>
              <li>Seuls les paiements encaissés sont inclus dans les rapports</li>
            </ul>
          </div>

          <button
            onClick={handleRapportComptable}
            disabled={loading || selectedComptables.length === 0}
            className="w-full bg-pink-600 text-white px-8 py-3 rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {selectedComptables.length > 1
                  ? 'Générer le Rapport Comparatif'
                  : 'Générer le Rapport Individuel'}
              </>
            )}
          </button>
        </div>
            </div>
          )}
      </div>
      </div>
    </div>
  );
}
