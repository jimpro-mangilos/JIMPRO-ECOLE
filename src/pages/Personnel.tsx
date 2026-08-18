import { useState, useMemo } from 'react';
import {
  Plus, Search, Users, UserCog, Pencil, Trash2, X, Phone, Mail, Loader2, CalendarDays, Banknote,
} from 'lucide-react';
import {
  usePersonnel,
  type PersonnelInput,
  type PersonnelRecord,
  FONCTIONS_SUGGEREES,
  STATUT_PERSONNEL_LABELS,
  STATUT_PERSONNEL_COLORS,
} from '../lib/hooks/usePersonnel';

interface PersonnelForm {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  fonction: string;
  telephone: string;
  email: string;
  date_embauche: string;
  salaire: string;
  adresse: string;
  statut: string;
}

const EMPTY_FORM: PersonnelForm = {
  matricule: '', nom: '', postnom: '', prenom: '', sexe: 'M', fonction: '',
  telephone: '', email: '', date_embauche: '', salaire: '', adresse: '', statut: 'actif',
};

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
  const [form, setForm] = useState<PersonnelForm>(EMPTY_FORM);

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
      sexe: p.sexe || 'M', fonction: p.fonction, telephone: p.telephone || '', email: p.email || '',
      date_embauche: p.date_embauche || '', salaire: p.salaire != null ? String(p.salaire) : '',
      adresse: p.adresse || '', statut: p.statut || 'actif',
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
    setSaving(true);
    const payload: PersonnelInput = {
      matricule: form.matricule.trim() || null,
      nom: form.nom.trim(),
      postnom: form.postnom.trim() || null,
      prenom: form.prenom.trim(),
      sexe: form.sexe || null,
      fonction: form.fonction.trim(),
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      date_embauche: form.date_embauche || null,
      salaire: form.salaire ? Number(form.salaire) : null,
      adresse: form.adresse.trim() || null,
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
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">Fonction</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Embauche</th>
                  <th className="px-4 py-3 text-right">Salaire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
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
                      <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </td>
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
                <label className={labelClass}>Matricule</label>
                <input className={inputClass} value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="Optionnel" />
              </div>
              <div>
                <label className={labelClass}>Fonction *</label>
                <input className={inputClass} value={form.fonction} onChange={e => set('fonction', e.target.value)} list="fonctions-list" placeholder="Ex : Enseignant" required />
                <datalist id="fonctions-list">
                  {FONCTIONS_SUGGEREES.map(f => <option key={f} value={f} />)}
                </datalist>
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
                <input type="date" className={inputClass} value={form.date_embauche} onChange={e => set('date_embauche', e.target.value)} />
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
