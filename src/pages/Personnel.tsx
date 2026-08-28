import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Users, UserCog, Pencil, Trash2, X, Phone, Mail, Loader2, CalendarDays, Banknote, Wand2, CreditCard, Eye, Printer,
} from 'lucide-react';
import {
  usePersonnel,
  type PersonnelInput,
  type PersonnelRecord,
  FONCTIONS_SUGGEREES,
  STATUT_PERSONNEL_LABELS,
  STATUT_PERSONNEL_COLORS,
  generatePersonnelMatricule,
  ETATS_CIVILS,
} from '../lib/hooks/usePersonnel';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateCarteService, generateCarteServiceBack, generateCartesService8PerSheet } from '../utils/carteServiceGenerator';
import CameraCapture from '../components/CameraCapture';
import { compressImage } from '../utils/compressImage';
import { formatDateTime, calculerAnciennete } from '../utils/calculations';

interface PersonnelForm {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  fonction: string;
  etat_civil: string;
  nombre_enfants: string;
  niveau_etude_id: string;
  piece_etude: string;
  photo_url: string;
  nationalite: string;
  date_naissance: string;
  intitule_compte: string;
  num_compte: string;
  telephone: string;
  email: string;
  date_embauche: string;
  salaire: string;
  adresse: string;
  domaine: string;
  statut: string;
}

const EMPTY_FORM: PersonnelForm = {
  matricule: '', nom: '', postnom: '', prenom: '', sexe: 'M', fonction: '',
  etat_civil: '', nombre_enfants: '', niveau_etude_id: '', piece_etude: '', photo_url: '',
  nationalite: '', date_naissance: '', intitule_compte: '', num_compte: '',
  telephone: '', email: '', date_embauche: '', salaire: '', adresse: '', domaine: '', statut: 'actif',
};

// Repli si l'école n'a pas encore défini ses listes dans Configuration → Personnel
const DEFAULT_DOMAINES = ['Enseignement', 'Administration', 'Comptabilité', 'Technique / Maintenance', 'Santé', 'Sécurité', 'Transport', 'Cuisine', 'Bibliothèque', 'Autre'];

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function formatSalaire(n?: number | null): string {
  if (n == null) return '—';
  return `${Number(n).toLocaleString('fr-FR')} FC`;
}



export default function Personnel() {
  const { personnel, loading, create, update, remove } = usePersonnel();
  const [search, setSearch] = useState('');
  const [filterFonction, setFilterFonction] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PersonnelRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [form, setForm] = useState<PersonnelForm>(EMPTY_FORM);
  const { currentSchoolId } = useAuth();
  const [niveaux, setNiveaux] = useState<{ id: string; libelle: string }[]>([]);
  const [configFonctions, setConfigFonctions] = useState<string[]>([]);
  const [configDomaines, setConfigDomaines] = useState<string[]>([]);

  useEffect(() => {
    if (!currentSchoolId) return;
    supabase.from('niveaux_etude').select('id, libelle').eq('ecole_id', currentSchoolId).order('ordre').then((res: any) => setNiveaux(res.data || []));
  }, [currentSchoolId]);

  // Fonctions & domaines définis par l'école (Configuration → Personnel)
  useEffect(() => {
    if (!currentSchoolId) return;
    (async () => {
      // Le builder Supabase est un "thenable" (pas de .catch) : Promise.resolve l'assimile
      const safe = (p: PromiseLike<any>) => Promise.resolve(p).catch(() => ({ data: null, error: null }));
      const [f, d] = await Promise.all([
        safe(supabase.from('fonctions_personnel').select('libelle').eq('ecole_id', currentSchoolId).eq('is_active', true).order('ordre') as any),
        safe(supabase.from('domaines_personnel').select('libelle').eq('ecole_id', currentSchoolId).eq('is_active', true).order('ordre') as any),
      ]);
      setConfigFonctions(((f.data as any[]) || []).map((r: any) => r.libelle as string).filter(Boolean));
      setConfigDomaines(((d.data as any[]) || []).map((r: any) => r.libelle as string).filter(Boolean));
    })();
  }, [currentSchoolId]);

  const fonctionOptions = configFonctions.length ? configFonctions : FONCTIONS_SUGGEREES;
  const domaineOptions = configDomaines.length ? configDomaines : DEFAULT_DOMAINES;

  async function genMatricule() {
    if (!currentSchoolId) return;
    const m = await generatePersonnelMatricule(currentSchoolId, form.date_embauche);
    set('matricule', m);
  }

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('personnel-docs').upload(path, file);
    if (error) { alert('Erreur upload : ' + error.message); return null; }
    return supabase.storage.from('personnel-docs').getPublicUrl(path).data.publicUrl;
  }

  async function onPhoto(file: File) {
    // Compression forcée : photo < 50 Ko (caméra ou upload)
    let toUpload = file;
    try {
      toUpload = await compressImage(file);
    } catch {
      // Si la compression échoue, on conserve le fichier d'origine
    }
    const url = await uploadFile(toUpload, 'photos');
    if (url) set('photo_url', url);
  }

  async function onPieceEtude(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await uploadFile(f, 'docs');
    if (url) set('piece_etude', url);
  }

  async function printCarte(p: PersonnelRecord) {
    try {
      await generateCarteService(p);
    } catch {
      alert('Erreur lors de la génération de la carte de service.');
    }
  }

  async function printCarteBack(p: PersonnelRecord) {
    try {
      await generateCarteServiceBack(p);
    } catch {
      alert('Erreur lors de la génération du verso de la carte.');
    }
  }

  async function printSelectedCartes() {
    const selected = filtered.filter(p => selectedIds.has(p.id));
    if (!selected.length) {
      alert('Sélectionnez au moins un membre à imprimer (cases à cocher).');
      return;
    }
    if (!confirm(`Imprimer ${selected.length} carte(s) de service (8 par feuille A4) ?`)) return;
    setPrintingAll(true);
    try {
      await generateCartesService8PerSheet(selected);
    } catch {
      alert('Erreur lors de la génération des cartes.');
    } finally {
      setPrintingAll(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const fonctions = useMemo(() => {
    const set = new Set(personnel.map(p => p.fonction).filter(Boolean));
    return Array.from(set).sort();
  }, [personnel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return personnel.filter(p => {
      if (q) {
        const hay = `${p.nom} ${p.postnom || ''} ${p.prenom} ${p.matricule || ''} ${p.fonction}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterFonction && p.fonction !== filterFonction) return false;
      if (filterStatut && p.statut !== filterStatut) return false;
      return true;
    });
  }, [personnel, search, filterFonction, filterStatut]);

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
  function toggleSelectAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach(p => next.delete(p.id));
      } else {
        filtered.forEach(p => next.add(p.id));
      }
      return next;
    });
  }

  const stats = useMemo(() => ({
    total: personnel.length,
    actifs: personnel.filter(p => p.statut === 'actif').length,
    inactifs: personnel.filter(p => p.statut !== 'actif').length,
    fonctions: new Set(personnel.map(p => p.fonction)).size,
  }), [personnel]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(p: PersonnelRecord) {
    setEditing(p);
    setForm({
      matricule: p.matricule || '', nom: p.nom, postnom: p.postnom || '', prenom: p.prenom,
      sexe: p.sexe || 'M', fonction: p.fonction,
      etat_civil: p.etat_civil || '', nombre_enfants: p.nombre_enfants != null ? String(p.nombre_enfants) : '',
      niveau_etude_id: p.niveau_etude_id || '', piece_etude: p.piece_etude || '', photo_url: p.photo_url || '',
      nationalite: p.nationalite || '', date_naissance: p.date_naissance || '',
      intitule_compte: p.intitule_compte || '', num_compte: p.num_compte || '',
      telephone: p.telephone || '', email: p.email || '',
      date_embauche: p.date_embauche || '', salaire: p.salaire != null ? String(p.salaire) : '',
      adresse: p.adresse || '', domaine: p.domaine || '', statut: p.statut || 'actif',
    });
    setShowModal(true);
  }

  function set<K extends keyof PersonnelForm>(key: K, value: PersonnelForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.fonction.trim()) {
      alert('Nom, prénom et fonction sont requis.');
      return;
    }
    if (!form.matricule.trim()) {
      alert('Le matricule est obligatoire : renseignez la date d\'embauche puis générez le matricule.');
      return;
    }
    setSaving(true);
    const payload: PersonnelInput = {
      matricule: form.matricule.trim() || null,
      nom: form.nom.trim(),
      postnom: form.postnom.trim() || null,
      prenom: form.prenom.trim(),
      sexe: form.sexe || null,
      fonction: form.fonction.trim(),
      etat_civil: form.etat_civil || null,
      nombre_enfants: form.nombre_enfants ? Number(form.nombre_enfants) : null,
      niveau_etude_id: form.niveau_etude_id || null,
      piece_etude: form.piece_etude || null,
      photo_url: form.photo_url || null,
      nationalite: form.nationalite.trim() || null,
      date_naissance: form.date_naissance || null,
      intitule_compte: form.intitule_compte.trim() || null,
      num_compte: form.num_compte.trim() || null,
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      date_embauche: form.date_embauche || null,
      salaire: form.salaire ? Number(form.salaire) : null,
      adresse: form.adresse.trim() || null,
      domaine: form.domaine.trim() || null,
      statut: form.statut || 'actif',
    };
    const ok = editing ? await update(editing.id, payload) : await create(payload);
    setSaving(false);
    if (ok) setShowModal(false);
  }

  async function handleDelete(p: PersonnelRecord) {
    if (!confirm(`Supprimer ${p.nom} ${p.prenom} ?`)) return;
    await remove(p.id);
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-blue-600" /> Gestion du Personnel
          </h1>
          <p className="text-gray-500 mt-1">Enseignants, administratifs et autre personnel de l'établissement.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Ajouter un membre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Actifs', value: stats.actifs, icon: UserCog, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Inactifs / suspendus', value: stats.inactifs, icon: UserCog, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Fonctions', value: stats.fonctions, icon: Banknote, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (nom, matricule, fonction...)"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select value={filterFonction} onChange={e => setFilterFonction(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">Toutes les fonctions</option>
          {fonctions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_PERSONNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={printSelectedCartes}
          disabled={printingAll || filtered.length === 0}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50 whitespace-nowrap transition-colors"
          title="Imprimer les cartes des membres sélectionnés (8 par feuille A4)"
        >
          {printingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Imprimer les cartes sélectionnées ({selectedIds.size}) — 8/feuille
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Aucun membre du personnel trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Tout sélectionner / désélectionner" className="accent-emerald-600" />
                  </th>
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">Fonction</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Embauche</th>
                  <th className="px-4 py-3 text-right">Salaire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                  <th className="px-4 py-3">Horodatage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="accent-emerald-600" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</div>
                      <div className="text-xs text-gray-400">{p.matricule || '—'}{p.sexe ? ` · ${p.sexe}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.fonction}</td>
                    <td className="px-4 py-3">
                      {p.telephone && <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" /> {p.telephone}</div>}
                      {p.email && <div className="flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3" /> {p.email}</div>}
                      {!p.telephone && !p.email && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600"><div className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-gray-400" /> {formatDate(p.date_embauche)}</div></td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{formatSalaire(p.salaire)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_PERSONNEL_COLORS[p.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUT_PERSONNEL_LABELS[p.statut] || p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => navigate(`/personnel/${p.id}`)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Fiche du membre"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => printCarte(p)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Carte de service (recto)"><CreditCard className="w-4 h-4" /></button>
                      <button onClick={() => printCarteBack(p)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Verso de la carte de service"><CreditCard className="w-4 h-4 rotate-180" /></button>
                      <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.created_at ? formatDateTime(p.created_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier' : 'Ajouter'} un membre du personnel</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Matricule {form.date_embauche || form.matricule ? '*' : ''}</label>
                {form.date_embauche || form.matricule ? (
                  <div className="flex gap-2">
                    <input className={inputClass} value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="Généré ou saisi" />
                    <button type="button" onClick={genMatricule} className="px-3 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 whitespace-nowrap flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5" /> Générer
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Renseignez d'abord la <b>date d'embauche</b> pour débloquer le matricule.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Fonction *</label>
                <select className={inputClass} value={form.fonction} onChange={e => set('fonction', e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {form.fonction && !fonctionOptions.includes(form.fonction) ? <option value={form.fonction}>{form.fonction} (non listée)</option> : null}
                  {fonctionOptions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Liste définie dans Configuration → Personnel</p>
              </div>
              <div>
                <label className={labelClass}>Domaine</label>
                <select className={inputClass} value={form.domaine} onChange={e => set('domaine', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {form.domaine && !domaineOptions.includes(form.domaine) ? <option value={form.domaine}>{form.domaine} (non listé)</option> : null}
                  {domaineOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Liste définie dans Configuration → Personnel</p>
              </div>
              <div>
                <label className={labelClass}>État-civil</label>
                <select className={inputClass} value={form.etat_civil} onChange={e => set('etat_civil', e.target.value)}>
                  <option value="">—</option>
                  {ETATS_CIVILS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Nombre d'enfants</label>
                <input type="number" min="0" className={inputClass} value={form.nombre_enfants} onChange={e => set('nombre_enfants', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Niveau d'étude</label>
                <select className={inputClass} value={form.niveau_etude_id} onChange={e => set('niveau_etude_id', e.target.value)}>
                  <option value="">—</option>
                  {niveaux.map(n => <option key={n.id} value={n.id}>{n.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Photo</label>
                <CameraCapture onCapture={onPhoto} compact />
                {form.photo_url && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <a href={form.photo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Voir la photo</a>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Pièce d'étude (document)</label>
                <div className="flex items-center gap-2">
                  <input type="file" onChange={onPieceEtude} className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs hover:file:bg-blue-100" />
                  {form.piece_etude && <a href={form.piece_etude} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline whitespace-nowrap">Voir</a>}
                </div>
              </div>
              <div>
                <label className={labelClass}>Nationalité</label>
                <input className={inputClass} value={form.nationalite} onChange={e => set('nationalite', e.target.value)} placeholder="Ex : Congolaise" />
              </div>
              <div>
                <label className={labelClass}>Date de naissance</label>
                <input type="date" className={inputClass} value={form.date_naissance} onChange={e => set('date_naissance', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Intitulé du compte</label>
                <input className={inputClass} value={form.intitule_compte} onChange={e => set('intitule_compte', e.target.value)} placeholder="Ex : Salaire mensuel" />
              </div>
              <div>
                <label className={labelClass}>Numéro de compte</label>
                <input className={inputClass} value={form.num_compte} onChange={e => set('num_compte', e.target.value)} placeholder="Numéro bancaire" />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <input className={inputClass} value={form.nom} onChange={e => set('nom', e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Postnom</label>
                <input className={inputClass} value={form.postnom} onChange={e => set('postnom', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Prénom *</label>
                <input className={inputClass} value={form.prenom} onChange={e => set('prenom', e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Sexe</label>
                <select className={inputClass} value={form.sexe} onChange={e => set('sexe', e.target.value)}>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input className={inputClass} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+243..." />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Date d'embauche</label>
                <input type="date" className={inputClass} value={form.date_embauche} onChange={e => { const d = e.target.value; set('date_embauche', d); if (d && !form.matricule.trim() && currentSchoolId) generatePersonnelMatricule(currentSchoolId, d).then(m => set('matricule', m)).catch(() => {}); }} />
              </div>
              <div>
                <label className={labelClass}>Ancienneté</label>
                <input className={inputClass} value={calculerAnciennete(form.date_embauche)} readOnly disabled title="Calculée automatiquement depuis la date d'embauche" />
              </div>
              <div>
                <label className={labelClass}>Salaire (FC)</label>
                <input type="number" min="0" step="0.01" className={inputClass} value={form.salaire} onChange={e => set('salaire', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Statut</label>
                <select className={inputClass} value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {Object.entries(STATUT_PERSONNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Adresse</label>
                <input className={inputClass} value={form.adresse} onChange={e => set('adresse', e.target.value)} />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">Annuler</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}