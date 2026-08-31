import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLogo, clearLogoCache } from '../contexts/LogoContext';
import { invalidatePrefixCache } from '../utils/matriculeGenerator';
import { Plus, CreditCard as Edit2, Trash2, Check, X, AlertCircle, Upload, Download, RotateCcw, Send, MessageSquare } from 'lucide-react';
import { envoyerSms, sauverConfigSms } from '../lib/smsService';
import MenuConfigTab from '../components/MenuConfigTab';
import PersonnelConfigTab from '../components/PersonnelConfigTab';
import TaillesConfigTab from '../components/TaillesConfigTab';
import { useSections, useOptions, useClasses, useMotifsPaiement, useTypesPaiement, useAnneesScolaires } from '../lib/hooks/useReferenceData';
import { useConfiguration } from '../lib/hooks/useConfiguration';

// ─── Form helpers ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyForm = (extra?: Record<string, any>): any => ({ nom: '', description: '', is_active: true, ...extra });
const libForm = (extra?: Record<string, string | boolean>) => ({ libelle: '', description: '', is_active: true, ...extra });
type TabKey = 'sections' | 'options' | 'classes' | 'motifs' | 'types_paiement' | 'annees_scolaires' | 'prefixes_matricule' | 'types_uniforme' | 'logo' | 'pointage' | 'sauvegarde' | 'menu_par_role' | 'personnel' | 'tailles' | 'sms';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'sections', label: 'Sections' }, { key: 'options', label: 'Options' }, { key: 'classes', label: 'Classes' },
  { key: 'motifs', label: 'Motifs' }, { key: 'types_paiement', label: 'Types Paiement' }, { key: 'annees_scolaires', label: 'Années Scolaires' },
  { key: 'prefixes_matricule', label: 'Préfixes' }, { key: 'types_uniforme', label: 'Types Uniforme' }, { key: 'logo', label: 'Logo' }, { key: 'pointage', label: 'Pointage' }, { key: 'sms', label: 'SMS' }, { key: 'sauvegarde', label: 'Sauvegarde' }, { key: 'menu_par_role', label: 'Menus' }, { key: 'personnel', label: 'Personnel' }, { key: 'tailles', label: 'Tailles' },
];

// ─── Page Component ───────────────────────────────────────────────────────────
export default function Configuration() {
  const { canManageConfiguration, currentSchoolId } = useAuth();
  const { logoUrl, logoBase64, refreshLogo } = useLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [ptgHeureEntree, setPtgHeureEntree] = useState('08:00');
  const [ptgJustificatifRequis, setPtgJustificatifRequis] = useState('false');
  const [ptgWhatsapp, setPtgWhatsapp] = useState('');
  const [smsActif, setSmsActif] = useState(false);
  const [smsPaiementActif, setSmsPaiementActif] = useState(false);
  const [smsProvider, setSmsProvider] = useState('');
  const [smsSid, setSmsSid] = useState('');
  const [smsToken, setSmsToken] = useState('');
  const [smsFrom, setSmsFrom] = useState('');
  const [smsTestTel, setSmsTestTel] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsJournal, setSmsJournal] = useState<any[]>([]);
  const [ptgHeureSortie, setPtgHeureSortie] = useState('16:30');
  const [ptgTauxChange, setPtgTauxChange] = useState('');
  const [ptgSeuilRetards, setPtgSeuilRetards] = useState('3');
  const [ptgSaving, setPtgSaving] = useState(false);
  const [sauvegardeBusy, setSauvegardeBusy] = useState(false);
  const [sauvegardeMsg, setSauvegardeMsg] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('sections');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data from React Query
  const schoolId = currentSchoolId!;
  const { data: sections = [], isLoading: loading } = useSections(schoolId);
  const { data: options = [] } = useOptions(schoolId);
  const { data: classes = [] } = useClasses(schoolId);
  const { data: motifs = [] } = useMotifsPaiement(schoolId);
  const { data: typesPaiement = [] } = useTypesPaiement(schoolId);
  const { data: anneeScolaires = [] } = useAnneesScolaires(schoolId);
  const { sectionPrefixes, typesUniforme, upsertPrefix, deletePrefix, upsertTypeUniforme, deleteTypeUniforme,
    upsertSection, deleteSection, upsertOption, deleteOption, upsertClasse, deleteClasse,
    upsertMotif, deleteMotif, upsertTypePaiement, deleteTypePaiement, upsertAnneeScolaire, deleteAnneeScolaire } = useConfiguration();

  // Form states
  const [showSectionForm, setShowSectionForm] = useState(false); const [editingSection, setEditingSection] = useState<any>(null); const [sectionForm, setSectionForm] = useState(emptyForm());
  const [showOptionForm, setShowOptionForm] = useState(false); const [editingOption, setEditingOption] = useState<any>(null); const [optionForm, setOptionForm] = useState(emptyForm({ section_id: '' }));
  const [showClasseForm, setShowClasseForm] = useState(false); const [editingClasse, setEditingClasse] = useState<any>(null);
  // Multi-section/option : on stocke des tableaux
  const [classeForm, setClasseForm] = useState<{ nom: string; section_ids: string[]; option_ids: string[]; niveau: string; designation: string; description: string; is_active: boolean }>({ nom: '', section_ids: [], option_ids: [], niveau: '', designation: '', description: '', is_active: true });
  const [showMotifForm, setShowMotifForm] = useState(false); const [editingMotif, setEditingMotif] = useState<any>(null); const [motifForm, setMotifForm] = useState(libForm());
  const [showTypePaiementForm, setShowTypePaiementForm] = useState(false); const [editingTypePaiement, setEditingTypePaiement] = useState<any>(null); const [typePaiementForm, setTypePaiementForm] = useState(libForm());
  const [showAnneeScolaireForm, setShowAnneeScolaireForm] = useState(false); const [editingAnneeScolaire, setEditingAnneeScolaire] = useState<any>(null); const [anneeScolaireForm, setAnneeScolaireForm] = useState({ annee: '', date_debut: '', date_fin: '', is_active: true });
  const [showPrefixForm, setShowPrefixForm] = useState(false); const [editingPrefix, setEditingPrefix] = useState<any>(null); const [prefixForm, setPrefixForm] = useState({ section: '', libelle: '', prefix: '', is_active: true });
  const [showTypeUniformeForm, setShowTypeUniformeForm] = useState(false); const [editingTypeUniforme, setEditingTypeUniforme] = useState<any>(null); const [typeUniformeForm, setTypeUniformeForm] = useState({ libelle: '', description: '', is_active: true, sexe: '' });

  const clearMsg = () => { setError(''); setSuccess(''); };
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg: string) => { setError(msg); };

  // ─── Logo ───────────────────────────────────────────────────────────────────
  // Charger la configuration pointage au montage
  useEffect(() => {
    if (!currentSchoolId) return;
    (async () => {
      const { data } = await supabase.from('app_settings').select('key, value').eq('ecole_id', currentSchoolId).in('key', ['pointage_heure_entree', 'pointage_heure_sortie', 'permissions_justificatif_requis', 'ecole_whatsapp']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      if (map.pointage_heure_entree) setPtgHeureEntree(map.pointage_heure_entree);
      if (map.pointage_heure_sortie) setPtgHeureSortie(map.pointage_heure_sortie);
      if (map.pointage_taux_change) setPtgTauxChange(map.pointage_taux_change);
      if (map.pointage_seuil_retards) setPtgSeuilRetards(map.pointage_seuil_retards);
      if (map.permissions_justificatif_requis) setPtgJustificatifRequis(map.permissions_justificatif_requis);
      if (map.ecole_whatsapp) setPtgWhatsapp(map.ecole_whatsapp);

      // Configuration SMS
      const { data: smsData } = await supabase.from('app_settings').select('key, value').eq('ecole_id', currentSchoolId).in('key', ['sms_actif', 'sms_paiement_actif', 'sms_provider', 'sms_sid', 'sms_token', 'sms_from']);
      const smsMap: Record<string, string> = {};
      (smsData || []).forEach((r: any) => { smsMap[r.key] = r.value; });
      setSmsActif(smsMap.sms_actif === 'true');
      setSmsPaiementActif(smsMap.sms_paiement_actif === 'true');
      setSmsProvider(smsMap.sms_provider || '');
      setSmsSid(smsMap.sms_sid || '');
      setSmsToken(smsMap.sms_token || '');
      setSmsFrom(smsMap.sms_from || '');
      chargerJournalSms();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchoolId]);

  const TABLES_SAUVEGARDE = ['eleves', 'personnel', 'paiements', 'pointages_personnel', 'permissions_personnel', 'paiements_salaires', 'notes_eleves', 'sections', 'options', 'classes', 'motifs_paiement', 'types_paiement', 'annees_scolaires', 'types_uniforme'];

  async function exporterSauvegarde() {
    if (!currentSchoolId) return;
    setSauvegardeBusy(true); setSauvegardeMsg('');
    try {
      const data: Record<string, any[]> = {};
      for (const t of TABLES_SAUVEGARDE) {
        const { data: rows } = await (supabase as any).from(t).select('*').eq('ecole_id', currentSchoolId);
        data[t] = rows || [];
      }
      const blob = new Blob([JSON.stringify({ ecole_id: currentSchoolId, date: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sauvegarde-jimpro-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setSauvegardeMsg('Sauvegarde exportée.');
    } catch (err: any) { setSauvegardeMsg('Erreur export : ' + (err?.message || err)); }
    finally { setSauvegardeBusy(false); }
  }

  async function importerSauvegarde(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentSchoolId) return;
    if (!confirm('Restaurer cette sauvegarde ? Les lignes existantes seront remplacées (id conservé).')) return;
    setSauvegardeBusy(true); setSauvegardeMsg('');
    try {
      const json = JSON.parse(await file.text());
      let total = 0;
      for (const t of TABLES_SAUVEGARDE) {
        const rows = (json.data?.[t] || []).filter((r: any) => r.ecole_id === currentSchoolId);
        if (rows.length === 0) continue;
        const { error } = await (supabase as any).from(t).upsert(rows, { onConflict: 'id' });
        if (error) throw new Error(`${t} : ${error.message}`);
        total += rows.length;
      }
      setSauvegardeMsg(`Import terminé : ${total} lignes restaurées.`);
    } catch (err: any) { setSauvegardeMsg('Erreur import : ' + (err?.message || err)); }
    finally { setSauvegardeBusy(false); }
  }

  async function savePointageConfig() {
    if (!currentSchoolId) return;
    setPtgSaving(true);
    try {
      await supabase.from('app_settings').upsert(
        [
          { ecole_id: currentSchoolId, key: 'pointage_heure_entree', value: ptgHeureEntree },
          { ecole_id: currentSchoolId, key: 'pointage_heure_sortie', value: ptgHeureSortie },
          { ecole_id: currentSchoolId, key: 'pointage_taux_change', value: ptgTauxChange },
          { ecole_id: currentSchoolId, key: 'pointage_seuil_retards', value: ptgSeuilRetards },
          { ecole_id: currentSchoolId, key: 'permissions_justificatif_requis', value: ptgJustificatifRequis },
          { ecole_id: currentSchoolId, key: 'ecole_whatsapp', value: ptgWhatsapp },
        ],
        { onConflict: 'ecole_id,key' }
      );
      showSuccess('Horaires de pointage enregistrés');
    } catch (err: any) {
      showError(`Erreur : ${err?.message || err}`);
    } finally {
      setPtgSaving(false);
    }
  }

  async function chargerJournalSms() {
    if (!currentSchoolId) return;
    try {
      const { data } = await supabase.from('notifications_sms').select('*').eq('ecole_id', currentSchoolId).order('created_at', { ascending: false }).limit(20);
      setSmsJournal((data || []) as any[]);
    } catch {
      setSmsJournal([]);
    }
  }

  async function saveSmsConfig() {
    if (!currentSchoolId) return;
    setSmsSaving(true);
    const { error } = await sauverConfigSms(currentSchoolId, {
      actif: smsActif, paiementActif: smsPaiementActif,
      provider: smsProvider, sid: smsSid, token: smsToken, from: smsFrom,
    });
    if (error) showError('Erreur : ' + error);
    else showSuccess('Configuration SMS enregistrée');
    setSmsSaving(false);
  }

  async function testerSms() {
    if (!currentSchoolId) return;
    if (!smsTestTel.trim()) { showError('Saisissez un numéro de test.'); return; }
    setSmsTesting(true);
    const r = await envoyerSms(currentSchoolId, smsTestTel.trim(), 'Test SMS JIMPRO — notification de paiement opérationnelle.', 'test');
    if (r.ok) showSuccess('SMS de test envoyé !');
    else showError('Échec : ' + (r.erreur || r.statut));
    await chargerJournalSms();
    setSmsTesting(false);
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      // Chemin unique par école : évite d'écraser le logo des autres écoles
      const path = `logo_${currentSchoolId}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      // Récupérer l'URL publique du fichier uploadé
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('URL du logo introuvable');

      // Sauvegarder l'URL dans app_settings pour cette école uniquement
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({ ecole_id: currentSchoolId, key: 'logo_url', value: publicUrl }, { onConflict: 'ecole_id,key' });
      if (upsertError) throw upsertError;

      await refreshLogo();
      showSuccess('Logo mis à jour');
    } catch (err: any) {
      // Message détaillé : permet de diagnostiquer la perte du logo
      showError(`Erreur upload logo : ${err?.message || err}`);
    }
    finally { setLogoUploading(false); }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;
    if (!confirm('Supprimer le logo de cette école ?')) return;
    setLogoUploading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('ecole_id', currentSchoolId)
        .eq('key', 'logo_url');
      if (error) throw error;
      clearLogoCache(currentSchoolId);
      await refreshLogo();
      showSuccess('Logo supprimé');
    } catch (err: any) { showError(`Erreur suppression logo : ${err?.message || err}`); }
    finally { setLogoUploading(false); }
  };

  // ─── Generic submit helper ─────────────────────────────────────────────────
  const handleSubmit = async (upsertFn: Function, form: any, setShow: (v: boolean) => void, resetForm: () => void, entityName: string, isEdit: boolean, extra?: any) => {
    clearMsg();
    try { await upsertFn(form, isEdit ? (extra?.id) : undefined, extra?.maxOrdre); showSuccess(`${entityName} ${isEdit ? 'modifié' : 'créé'}`); resetForm(); setShow(false); }
    catch (err: any) { showError(err?.message || 'Erreur lors de l\'enregistrement'); }
  };

  const handleDelete = async (deleteFn: Function, id: string, entityName: string) => {
    if (!confirm(`Supprimer ${entityName} ?`)) return;
    try { await deleteFn(id); showSuccess(`${entityName} supprimé`); }
    catch (err: any) { showError(err?.message || 'Erreur suppression'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4" />{error}<button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}
      {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"><Check className="w-4 h-4" />{success}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{t.label}</button>
        ))}
      </div>

      {/* ─── Logo Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'logo' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-3">Logo de l'établissement</h2>
          <div className="flex items-center gap-4">
            {logoUrl || logoBase64 ? (
              <img src={logoBase64 || logoUrl} alt="Logo" className="w-32 h-32 object-cover border rounded-full bg-gray-50" />
            ) : (
              <div className="w-32 h-32 border rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm text-center px-2">Aucun logo</div>
            )}
            <div className="space-y-2">
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {logoUploading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Changer le logo
              </button>
              {logoUrl && (
                <button onClick={handleDeleteLogo} disabled={logoUploading} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm">
                  <Trash2 className="w-4 h-4" /> Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Sauvegarde Tab ───────────────────────────────────────────────── */}
      {activeTab === 'sauvegarde' && (
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-xl">
          <h2 className="text-lg font-bold mb-1">Sauvegarde des données</h2>
          <p className="text-sm text-gray-500 mb-5">
            Exportez toutes les données de l'école (élèves, personnel, paiements, pointage, salaires, notes…) dans un fichier JSON,
            ou restaurez-les depuis une sauvegarde.
          </p>
          <div className="space-y-3">
            <button onClick={exporterSauvegarde} disabled={sauvegardeBusy} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 text-sm">
              {sauvegardeBusy ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exporter la sauvegarde (JSON)
            </button>
            <button onClick={() => importFileRef.current?.click()} disabled={sauvegardeBusy} className="w-full flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 font-semibold disabled:opacity-50 text-sm">
              <Upload className="w-4 h-4" /> Restaurer une sauvegarde
            </button>
            <input ref={importFileRef} type="file" accept="application/json" onChange={importerSauvegarde} className="hidden" />
            {sauvegardeMsg && <p className="text-sm text-gray-600">{sauvegardeMsg}</p>}
          </div>
        </div>
      )}

      {/* ─── Pointage Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'pointage' && (
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-xl">
          <h2 className="text-lg font-bold mb-1">Configuration du pointage</h2>
          <p className="text-sm text-gray-500 mb-5">
            Définissez l'heure d'entrée (seuil de retard) et l'heure de sortie. Les jours ouvrables
            sont du lundi au vendredi : tout membre sans pointage un jour ouvrable est considéré
            <span className="font-semibold text-red-600"> absent</span> automatiquement.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure d'entrée (seuil de retard)</label>
              <input
                type="time"
                value={ptgHeureEntree}
                onChange={e => setPtgHeureEntree(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">Après cette heure, l'arrivée est marquée « Retard ».</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure de sortie</label>
              <input
                type="time"
                value={ptgHeureSortie}
                onChange={e => setPtgHeureSortie(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Seuil de retards récurrents (alerte)</label>
              <input
                type="number"
                min="1"
                value={ptgSeuilRetards}
                onChange={e => setPtgSeuilRetards(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">Un membre atteignant ce nombre de retards dans le mois est signalé.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Taux de change (1 $US = ... FC)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={ptgTauxChange}
                onChange={e => setPtgTauxChange(e.target.value)}
                placeholder="Ex : 2800"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">Permet d'afficher le salaire payable en dollars (en plus des francs).</p>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ptgJustificatifRequis === 'true'}
                  onChange={e => setPtgJustificatifRequis(e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="font-medium">Exiger un justificatif (pièce jointe) pour les permissions des élèves</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-1">Si coché, le portail parent et la page admin exigent une pièce jointe (photo, PDF) pour soumettre une permission.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Numéro WhatsApp de l'école (prévenir à l'approbation des permissions)</label>
              <input
                type="tel"
                value={ptgWhatsapp}
                onChange={e => setPtgWhatsapp(e.target.value)}
                placeholder="Ex : +243 8xx xxx xxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">Format international conseillé (+243...). Le bouton « WhatsApp » de la page Pointage des élèves s'activera avec ce numéro (sinon celui de l'école).</p>
            </div>
          </div>
          <button
            onClick={savePointageConfig}
            disabled={ptgSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 text-sm"
          >
            {ptgSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer les horaires
          </button>
        </div>
      )}

      {/* ─── SMS Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'sms' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" /> Notifications SMS</h2>
          <p className="text-sm text-gray-500 mb-5">Envoyez un SMS au numéro de téléphone de l'élève (fiche) à chaque paiement enregistré. Prestataires supportés : Twilio, Africa's Talking.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={smsActif} onChange={e => setSmsActif(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <span className="font-medium">Notifications SMS actives</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={smsPaiementActif} onChange={e => setSmsPaiementActif(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <span className="font-medium">SMS à chaque paiement enregistré</span>
            </label>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prestataire</label>
              <select value={smsProvider} onChange={e => setSmsProvider(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white">
                <option value="">Aucun</option>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Numéro / Sender ID expéditeur</label>
              <input type="text" value={smsFrom} onChange={e => setSmsFrom(e.target.value)} placeholder="Twilio : +1xxx / AT : nom expéditeur" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SID / Identifiant de compte</label>
              <input type="text" value={smsSid} onChange={e => setSmsSid(e.target.value)} placeholder="Twilio Account SID / AT username" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jeton / Clé API</label>
              <input type="password" value={smsToken} onChange={e => setSmsToken(e.target.value)} placeholder="Twilio Auth Token / AT apiKey" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button onClick={saveSmsConfig} disabled={smsSaving} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 text-sm">
              {smsSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer la configuration
            </button>
            <div className="flex items-center gap-2">
              <input type="tel" value={smsTestTel} onChange={e => setSmsTestTel(e.target.value)} placeholder="Numéro de test (ex : +243 8xx xxx xxx)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500" />
              <button onClick={testerSms} disabled={smsTesting} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                {smsTesting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Tester l'envoi
              </button>
            </div>
          </div>
          {/* Journal */}
          <h3 className="font-bold text-gray-800 mb-2">Journal des dernières notifications</h3>
          {smsJournal.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune notification (le journal se remplit dès l'envoi — le SMS de test l'alimente aussi).</p>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Téléphone</th>
                    <th className="px-3 py-2">Contexte</th>
                    <th className="px-3 py-2">Message</th>
                    <th className="px-3 py-2 text-center">Statut</th>
                    <th className="px-3 py-2">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {smsJournal.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(n.created_at).toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 text-xs">{n.telephone}</td>
                      <td className="px-3 py-2 text-xs">{n.contexte}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={n.message}>{n.message}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={'px-2 py-0.5 text-[10px] font-bold rounded-full ' + (n.statut === 'envoye' ? 'bg-green-100 text-green-700' : n.statut === 'echec' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{n.statut}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-[180px] truncate" title={n.erreur || ''}>{n.erreur || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Menu Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'menu_par_role' && <MenuConfigTab />}
      {activeTab === 'personnel' && <PersonnelConfigTab />}
      {activeTab === 'tailles' && <TaillesConfigTab />}

      {/* ─── CRUD Tabs (generic pattern) ──────────────────────────────────── */}
      {(activeTab === 'sections' || activeTab === 'options' || activeTab === 'classes' || activeTab === 'motifs' || activeTab === 'types_paiement' || activeTab === 'annees_scolaires' || activeTab === 'prefixes_matricule' || activeTab === 'types_uniforme') && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold capitalize">{TABS.find(t => t.key === activeTab)?.label}</h2>
            {canManageConfiguration() && (
              <button onClick={() => {
                if (activeTab === 'sections') { setEditingSection(null); setSectionForm(emptyForm()); setShowSectionForm(true); }
                else if (activeTab === 'options') { setEditingOption(null); setOptionForm(emptyForm({ section_id: '' })); setShowOptionForm(true); }
                else if (activeTab === 'classes') { setEditingClasse(null); setClasseForm({ nom: '', section_ids: [], option_ids: [], niveau: '', designation: '', description: '', is_active: true }); setShowClasseForm(true); }
                else if (activeTab === 'motifs') { setEditingMotif(null); setMotifForm(libForm()); setShowMotifForm(true); }
                else if (activeTab === 'types_paiement') { setEditingTypePaiement(null); setTypePaiementForm(libForm()); setShowTypePaiementForm(true); }
                else if (activeTab === 'annees_scolaires') { setEditingAnneeScolaire(null); setAnneeScolaireForm({ annee: '', date_debut: '', date_fin: '', is_active: true }); setShowAnneeScolaireForm(true); }
                else if (activeTab === 'prefixes_matricule') { setEditingPrefix(null); setPrefixForm({ section: '', libelle: '', prefix: '', is_active: true }); setShowPrefixForm(true); }
                else if (activeTab === 'types_uniforme') { setEditingTypeUniforme(null); setTypeUniformeForm({ libelle: '', description: '', is_active: true, sexe: '' }); setShowTypeUniformeForm(true); }
              }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" /> Ajouter</button>
            )}
          </div>

          {/* Table */}
          <table className="w-full"><thead><tr className="border-b text-left text-xs font-semibold text-gray-600 uppercase">
            {activeTab === 'sections' && <><th className="px-2 py-1.5">Nom</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'options' && <><th className="px-2 py-1.5">Nom</th><th className="px-2 py-1.5">Section</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'classes' && <><th className="px-2 py-1.5">Nom</th><th className="px-2 py-1.5">Niveau</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'motifs' && <><th className="px-2 py-1.5">Libellé</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'types_paiement' && <><th className="px-2 py-1.5">Libellé</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'annees_scolaires' && <><th className="px-2 py-1.5">Année</th><th className="px-2 py-1.5">Début</th><th className="px-2 py-1.5">Fin</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'prefixes_matricule' && <><th className="px-2 py-1.5">Section</th><th className="px-2 py-1.5">Libellé</th><th className="px-2 py-1.5">Préfixe</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
            {activeTab === 'types_uniforme' && <><th className="px-2 py-1.5">Libellé</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5">Actif</th><th className="px-2 py-1.5 text-right">Actions</th></>}
          </tr></thead><tbody className="divide-y">
            {activeTab === 'sections' && sections.map((s: any) => <tr key={s.id}><td className="px-2 py-1.5 text-sm font-medium">{s.nom}</td><td className="px-2 py-1.5 text-sm text-gray-500">{s.description}</td><td className="px-2 py-1.5">{s.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingSection(s); setSectionForm({ nom: s.nom, description: s.description, is_active: s.is_active }); setShowSectionForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteSection, s.id, 'Section')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'options' && options.map((o: any) => <tr key={o.id}><td className="px-2 py-1.5 text-sm font-medium">{o.nom}</td><td className="px-2 py-1.5 text-sm text-gray-500">{sections.find((s: any) => s.id === o.section_id)?.nom}</td><td className="px-2 py-1.5">{o.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingOption(o); setOptionForm({ nom: o.nom, section_id: o.section_id, description: o.description, is_active: o.is_active }); setShowOptionForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteOption, o.id, "Option")} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'classes' && classes.map((c: any) => <tr key={c.id}><td className="px-2 py-1.5 text-sm font-medium">{c.nom}</td><td className="px-2 py-1.5 text-sm text-gray-500">{c.niveau || '—'}</td><td className="px-2 py-1.5">{c.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingClasse(c); setClasseForm({ nom: c.nom, section_ids: c.section_id ? [c.section_id] : [], option_ids: c.option_id ? [c.option_id] : [], niveau: c.niveau || '', designation: c.designation || '', description: c.description || '', is_active: c.is_active }); setShowClasseForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteClasse, c.id, 'Classe')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'motifs' && motifs.map((m: any) => <tr key={m.id}><td className="px-2 py-1.5 text-sm font-medium">{m.libelle}</td><td className="px-2 py-1.5 text-sm text-gray-500">{m.description}</td><td className="px-2 py-1.5">{m.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingMotif(m); setMotifForm({ libelle: m.libelle, description: m.description, is_active: m.is_active }); setShowMotifForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteMotif, m.id, 'Motif')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'types_paiement' && typesPaiement.map((t: any) => <tr key={t.id}><td className="px-2 py-1.5 text-sm font-medium">{t.libelle}</td><td className="px-2 py-1.5 text-sm text-gray-500">{t.description}</td><td className="px-2 py-1.5">{t.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingTypePaiement(t); setTypePaiementForm({ libelle: t.libelle, description: t.description, is_active: t.is_active }); setShowTypePaiementForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteTypePaiement, t.id, 'Type')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'annees_scolaires' && anneeScolaires.map((a: any) => <tr key={a.id}><td className="px-2 py-1.5 text-sm font-medium">{a.annee}</td><td className="px-2 py-1.5 text-sm text-gray-500">{a.date_debut || '—'}</td><td className="px-2 py-1.5 text-sm text-gray-500">{a.date_fin || '—'}</td><td className="px-2 py-1.5">{a.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingAnneeScolaire(a); setAnneeScolaireForm({ annee: a.annee, date_debut: a.date_debut || '', date_fin: a.date_fin || '', is_active: a.is_active }); setShowAnneeScolaireForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteAnneeScolaire, a.id, 'Année')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'prefixes_matricule' && sectionPrefixes.map((p: any) => <tr key={p.id}><td className="px-2 py-1.5 text-sm font-medium">{p.section}</td><td className="px-2 py-1.5 text-sm text-gray-500">{p.libelle}</td><td className="px-2 py-1.5 text-sm"><code className="bg-gray-100 px-2 py-0.5 rounded">{p.prefix}</code></td><td className="px-2 py-1.5">{p.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingPrefix(p); setPrefixForm({ section: p.section, libelle: p.libelle, prefix: p.prefix, is_active: p.is_active }); setShowPrefixForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deletePrefix, p.id, 'Préfixe')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
            {activeTab === 'types_uniforme' && typesUniforme.map((u: any) => <tr key={u.id}><td className="px-2 py-1.5 text-sm font-medium">{u.libelle}{u.sexe ? <span className="ml-1.5 text-xs font-medium text-blue-600">({u.sexe === 'M' ? 'M' : 'F'})</span> : null}</td><td className="px-2 py-1.5 text-sm text-gray-500">{u.description}</td><td className="px-2 py-1.5">{u.is_active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}</td><td className="px-2 py-1.5 text-right">{canManageConfiguration() && <><button onClick={() => { setEditingTypeUniforme(u); setTypeUniformeForm({ libelle: u.libelle, description: u.description, is_active: u.is_active, sexe: u.sexe || '' }); setShowTypeUniformeForm(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(deleteTypeUniforme, u.id, 'Type uniforme')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></>}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {/* ─── Modals (simplified) ───────────────────────────────────────────── */}
      {/* Section Modal */}
      {showSectionForm && <Modal title={editingSection ? 'Modifier Section' : 'Nouvelle Section'} onClose={() => setShowSectionForm(false)} onSubmit={e => { e.preventDefault(); handleSubmit(upsertSection, sectionForm, setShowSectionForm, () => setSectionForm(emptyForm()), 'Section', !!editingSection, { id: editingSection?.id, maxOrdre: Math.max(0, ...sections.map((s: any) => s.ordre)) }); }}>
        <Field label="Nom" value={sectionForm.nom} onChange={v => setSectionForm((p: any) => ({ ...p, nom: v }))} />
        <Field label="Description" value={sectionForm.description} onChange={v => setSectionForm((p: any) => ({ ...p, description: v }))} />
      </Modal>}

      {/* Option Modal */}
      {showOptionForm && <Modal title={editingOption ? "Modifier Option" : "Nouvelle Option"} onClose={() => setShowOptionForm(false)} onSubmit={e => { e.preventDefault(); handleSubmit(upsertOption, optionForm, setShowOptionForm, () => setOptionForm(emptyForm({ section_id: '' })), 'Option', !!editingOption, { id: editingOption?.id, maxOrdre: Math.max(0, ...options.map((o: any) => o.ordre)) }); }}>
        <Field label="Nom" value={optionForm.nom} onChange={v => setOptionForm((p: any) => ({ ...p, nom: v }))} />
        <div><label className="block text-sm font-medium mb-1">Section</label><select value={optionForm.section_id} onChange={e => setOptionForm((p: any) => ({ ...p, section_id: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm"><option value="">—</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
        <Field label="Description" value={optionForm.description} onChange={v => setOptionForm((p: any) => ({ ...p, description: v }))} />
      </Modal>}

      {/* Classe Modal */}
      {showClasseForm && <Modal title={editingClasse ? 'Modifier Classe' : 'Nouvelle Classe'} onClose={() => setShowClasseForm(false)} onSubmit={async e => {
        e.preventDefault();
        if (!classeForm.nom || classeForm.section_ids.length === 0) { alert('Nom et au moins une section requis'); return; }
        const combos: Array<{ section_id: string; option_id: string | null }> = [];
        for (const sid of classeForm.section_ids) {
          const opts = options.filter((o: any) => o.section_id === sid);
          if (classeForm.option_ids.length > 0) {
            for (const oid of classeForm.option_ids) { const o = opts.find((x: any) => x.id === oid); if (o) combos.push({ section_id: sid, option_id: oid }); }
          } else {
            combos.push({ section_id: sid, option_id: null });
          }
        }
        let errors: string[] = [];
        let created = 0;
        for (const combo of combos) {
          try {
            const { section_ids, option_ids, ...cleanForm } = classeForm as any;
            await upsertClasse({ ...cleanForm, section_id: combo.section_id, option_id: combo.option_id || '' } as any, undefined, 0);
            created++;
          } catch (err: any) {
            const msg = err?.message || '';
            if (!msg.includes('duplicate key')) errors.push(msg);
          }
        }
        if (errors.length > 0) alert(`${errors.length} erreur(s):\n${errors.join('\n')}`);
        else { setShowClasseForm(false); setClasseForm({ nom: '', section_ids: [], option_ids: [], niveau: '', designation: '', description: '', is_active: true }); alert(`${created} classe(s) créée(s)`); }
      }}>
         <Field label="Nom" value={classeForm.nom} onChange={v => setClasseForm((p: any) => ({ ...p, nom: v }))} />
        <div><label className="block text-sm font-medium mb-1">Sections (Ctrl+clic)</label><select multiple value={classeForm.section_ids} onChange={e => { const vals = Array.from(e.target.selectedOptions, o => o.value); setClasseForm((p: any) => ({ ...p, section_ids: vals, option_ids: [] })); }} className="w-full px-2 py-1.5 border rounded-lg text-sm min-h-[80px]">{sections.map((s: any) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></div>
        {classeForm.section_ids.length > 0 && (
          <div><label className="block text-sm font-medium mb-1">Options (Ctrl+clic)</label><select multiple value={classeForm.option_ids} onChange={e => setClasseForm((p: any) => ({ ...p, option_ids: Array.from(e.target.selectedOptions, o => o.value) }))} className="w-full px-2 py-1.5 border rounded-lg text-sm min-h-[80px]">{options.filter((o: any) => classeForm.section_ids.includes(o.section_id)).map((o: any) => <option key={o.id} value={o.id}>{o.nom}</option>)}</select></div>
        )}
        <Field label="Niveau" value={classeForm.niveau} onChange={v => setClasseForm((p: any) => ({ ...p, niveau: v }))} />
        <Field label="Désignation" value={classeForm.designation} onChange={v => setClasseForm((p: any) => ({ ...p, designation: v }))} />
        <Field label="Description" value={classeForm.description} onChange={v => setClasseForm((p: any) => ({ ...p, description: v }))} />
      </Modal>}

      {/* Motif / TypePaiement Modal */}
      {showMotifForm && <Modal title={editingMotif ? 'Modifier Motif' : 'Nouveau Motif'} onClose={() => setShowMotifForm(false)} onSubmit={e => { e.preventDefault(); handleSubmit(upsertMotif, motifForm, setShowMotifForm, () => setMotifForm(libForm()), 'Motif', !!editingMotif, { id: editingMotif?.id, maxOrdre: Math.max(0, ...motifs.map((m: any) => m.ordre)) }); }}>
        <Field label="Libellé" value={motifForm.libelle} onChange={v => setMotifForm(p => ({ ...p, libelle: v }))} />
        <Field label="Description" value={motifForm.description} onChange={v => setMotifForm(p => ({ ...p, description: v }))} />
      </Modal>}

      {showTypePaiementForm && <Modal title={editingTypePaiement ? 'Modifier Type' : 'Nouveau Type'} onClose={() => setShowTypePaiementForm(false)} onSubmit={e => { e.preventDefault(); handleSubmit(upsertTypePaiement, typePaiementForm, setShowTypePaiementForm, () => setTypePaiementForm(libForm()), 'Type', !!editingTypePaiement, { id: editingTypePaiement?.id, maxOrdre: Math.max(0, ...typesPaiement.map((t: any) => t.ordre)) }); }}>
        <Field label="Libellé" value={typePaiementForm.libelle} onChange={v => setTypePaiementForm(p => ({ ...p, libelle: v }))} />
        <Field label="Description" value={typePaiementForm.description} onChange={v => setTypePaiementForm(p => ({ ...p, description: v }))} />
      </Modal>}

      {/* Année Scolaire Modal */}
      {showAnneeScolaireForm && <Modal title={editingAnneeScolaire ? "Modifier Année" : "Nouvelle Année"} onClose={() => setShowAnneeScolaireForm(false)} onSubmit={e => { e.preventDefault(); handleSubmit(upsertAnneeScolaire, anneeScolaireForm, setShowAnneeScolaireForm, () => setAnneeScolaireForm({ annee: '', date_debut: '', date_fin: '', is_active: true }), 'Année', !!editingAnneeScolaire, { id: editingAnneeScolaire?.id, maxOrdre: Math.max(0, ...anneeScolaires.map((a: any) => a.ordre)) }); }}>
        <Field label="Année" value={anneeScolaireForm.annee} onChange={v => setAnneeScolaireForm(p => ({ ...p, annee: v }))} />
        <Field label="Date début" type="date" value={anneeScolaireForm.date_debut} onChange={v => setAnneeScolaireForm(p => ({ ...p, date_debut: v }))} />
        <Field label="Date fin" type="date" value={anneeScolaireForm.date_fin} onChange={v => setAnneeScolaireForm(p => ({ ...p, date_fin: v }))} />
      </Modal>}

      {/* Prefix Modal */}
      {showPrefixForm && <Modal title={editingPrefix ? 'Modifier Préfixe' : 'Nouveau Préfixe'} onClose={() => setShowPrefixForm(false)} onSubmit={async e => { e.preventDefault(); clearMsg(); try { await upsertPrefix(prefixForm, editingPrefix?.id); showSuccess('Préfixe enregistré'); setPrefixForm({ section: '', libelle: '', prefix: '', is_active: true }); setEditingPrefix(null); setShowPrefixForm(false); invalidatePrefixCache(); } catch { showError('Erreur'); } }}>
        <div><label className="block text-sm font-medium mb-1">Section</label><select value={prefixForm.section} onChange={e => setPrefixForm(p => ({ ...p, section: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm"><option value="">—</option>{sections.map((s: any) => <option key={s.id} value={s.nom}>{s.nom}</option>)}</select></div>
        <Field label="Libellé" value={prefixForm.libelle} onChange={v => setPrefixForm(p => ({ ...p, libelle: v }))} />
        <Field label="Préfixe" value={prefixForm.prefix} onChange={v => setPrefixForm(p => ({ ...p, prefix: v }))} />
      </Modal>}

      {/* Type Uniforme Modal */}
      {showTypeUniformeForm && <Modal title={editingTypeUniforme ? "Modifier" : "Nouveau Type Uniforme"} onClose={() => setShowTypeUniformeForm(false)} onSubmit={async e => { e.preventDefault(); clearMsg(); try { await upsertTypeUniforme(typeUniformeForm, editingTypeUniforme?.id); showSuccess('Enregistré'); setTypeUniformeForm({ libelle: '', description: '', is_active: true, sexe: '' }); setEditingTypeUniforme(null); setShowTypeUniformeForm(false); } catch { showError('Erreur'); } }}>
        <Field label="Libellé" value={typeUniformeForm.libelle} onChange={v => setTypeUniformeForm(p => ({ ...p, libelle: v }))} />
        <Field label="Description" value={typeUniformeForm.description} onChange={v => setTypeUniformeForm(p => ({ ...p, description: v }))} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sexe (filtrage à la distribution)</label>
          <select value={typeUniformeForm.sexe || ''} onChange={e => setTypeUniformeForm(p => ({ ...p, sexe: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Unisexe (tous)</option>
            <option value="M">Masculin (garçons)</option>
            <option value="F">Féminin (filles)</option>
          </select>
        </div>
      </Modal>}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>;
}

function Modal({ title, children, onClose, onSubmit }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button></div>
          <div className="p-4 space-y-3">{children}</div>
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}