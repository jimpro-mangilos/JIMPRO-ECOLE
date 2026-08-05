import { useState, useEffect, useRef } from 'react';
import { Plus, BookOpen, FileText, Edit, Trash2, Loader2, Upload, X, Calendar, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ClasseInfo { id: string; nom: string; section_nom: string; option_id: string | null; }
interface CoursItem { id: string; titre: string; description: string; professeur_id: string; classe_id: string | null; fichier_url: string | null; fichier_nom: string | null; created_at: string; classes?: { nom: string; sections?: { nom: string } } | null; }
interface DevoirItem { id: string; titre: string; description: string; professeur_id: string; classe_id: string | null; cours_id: string | null; date_limite: string | null; fichier_url: string | null; fichier_nom: string | null; created_at: string; classes?: { nom: string; sections?: { nom: string } } | null; cours?: { titre: string } | null; }
interface FormData { titre: string; description: string; classe_id: string; section_id: string; option_id: string; cours_id: string; date_limite: string; fichier: File | null; }

const EMPTY_FORM: FormData = { titre: '', description: '', classe_id: '', section_id: '', option_id: '', cours_id: '', date_limite: '', fichier: null };

export default function PortailProfesseur() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'cours' | 'devoirs'>('cours');
  const [cours, setCours] = useState<CoursItem[]>([]);
  const [devoirs, setDevoirs] = useState<DevoirItem[]>([]);
  const [sections, setSections] = useState<{ id: string; nom: string }[]>([]);
  const [options, setOptions] = useState<{ id: string; nom: string; section_id: string }[]>([]);
  const [classes, setClasses] = useState<ClasseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSections(); loadOptions(); loadClasses(); loadCours(); loadDevoirs(); }, []);

  const loadSections = async () => {
    const { data } = await supabase.from('sections').select('id, nom').eq('is_active', true).order('ordre');
    if (data) setSections(data);
  };

  const loadOptions = async () => {
    const { data } = await supabase.from('options').select('id, nom, section_id').eq('is_active', true).order('ordre');
    if (data) setOptions(data);
  };

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('id, nom, sections(nom), option_id').eq('is_active', true).order('nom');
    if (data) setClasses((data as any[]).map(c => ({ id: c.id, nom: c.nom, section_nom: c.sections?.nom || '', option_id: c.option_id || null })));
  };

  const loadCours = async () => {
    const { data } = await supabase.from('cours').select('*, classes(nom, sections(nom))').order('created_at', { ascending: false });
    setCours((data || []) as any);
    setLoading(false);
  };

  const loadDevoirs = async () => {
    const { data } = await supabase.from('devoirs').select('*, classes(nom, sections(nom)), cours(titre)').order('created_at', { ascending: false });
    setDevoirs((data || []) as any);
  };

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); setError(''); };
  const openEdit = (item: any, isDevoir: boolean) => {
    setEditingId(item.id);
    const sectionId = (item as any).section_id || '';
    const optionId = (item as any).option_id || '';
    setForm({ titre: item.titre || '', description: item.description || '', classe_id: item.classe_id || '', section_id: sectionId, option_id: optionId, cours_id: item.cours_id || '', date_limite: item.date_limite ? item.date_limite.split('T')[0] : '', fichier: null });
    setShowForm(true);
    setError('');
  };

  const uploadFile = async (file: File): Promise<{ url: string; nom: string } | null> => {
    try {
      const path = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('cours-files').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('cours-files').getPublicUrl(path);
      return { url: publicUrl, nom: file.name };
    } catch (e) { console.error('Upload error:', e); return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) { setError('Le titre est requis'); return; }
    setSaving(true); setError('');

    let fichier_url = editingId ? (activeTab === 'cours' ? cours.find(c => c.id === editingId)?.fichier_url : devoirs.find(d => d.id === editingId)?.fichier_url) || null : null;
    let fichier_nom = editingId ? (activeTab === 'cours' ? cours.find(c => c.id === editingId)?.fichier_nom : devoirs.find(d => d.id === editingId)?.fichier_nom) || null : null;

    if (form.fichier) {
      const uploaded = await uploadFile(form.fichier);
      if (uploaded) { fichier_url = uploaded.url; fichier_nom = uploaded.nom; }
    }

    const payload = { titre: form.titre, description: form.description, professeur_id: user!.id, classe_id: form.classe_id || null, section_id: form.section_id || null, option_id: form.option_id || null, fichier_url, fichier_nom };

    try {
      if (activeTab === 'cours') {
        if (editingId) await supabase.from('cours').update(payload).eq('id', editingId);
        else await supabase.from('cours').insert(payload);
        await loadCours();
      } else {
        const devoirPayload = { ...payload, cours_id: form.cours_id || null, date_limite: form.date_limite || null } as any;
        if (editingId) await supabase.from('devoirs').update(devoirPayload).eq('id', editingId);
        else await supabase.from('devoirs').insert(devoirPayload);
        await loadDevoirs();
      }
      setShowForm(false); setSuccess(editingId ? 'Modifié avec succès' : 'Créé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, isDevoir: boolean) => {
    if (!confirm('Confirmer la suppression ?')) return;
    if (isDevoir) { await supabase.from('devoirs').delete().eq('id', id); await loadDevoirs(); }
    else { await supabase.from('cours').delete().eq('id', id); await loadCours(); }
    setSuccess('Supprimé');
    setTimeout(() => setSuccess(''), 3000);
  };

  const isOwner = (professeur_id: string) => user?.id === professeur_id;

  const canDeleteFile = (item: any) => isOwner(item.professeur_id) && (item.fichier_url || item.fichier_nom);

  const classLabel = (item: any) => {
    const cls = item.classes;
    if (!cls?.nom) return '—';
    return cls.sections?.nom ? `${cls.sections.nom} - ${cls.nom}` : cls.nom;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-purple-600" />
          Portail Professeur
        </h1>
        <p className="text-gray-600 mt-1">Gérez vos cours et devoirs</p>
      </div>

      {success && <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-2 text-sm">{success}</div>}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {(['cours', 'devoirs'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab === 'cours' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {tab === 'cours' ? 'Mes Cours' : 'Mes Devoirs'}
          </button>
        ))}
      </div>

      <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
        <Plus className="w-4 h-4" /> {activeTab === 'cours' ? 'Nouveau cours' : 'Nouveau devoir'}
      </button>

      {loading ? <div className="flex items-center gap-2 text-gray-500 py-12"><Loader2 className="w-5 h-5 animate-spin" /> Chargement...</div>
        : (activeTab === 'cours' ? cours : devoirs).length === 0 ? <p className="text-gray-400 py-12 text-center">Aucun {activeTab === 'cours' ? 'cours' : 'devoir'} pour le moment.</p>
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'cours' ? cours : devoirs).map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-900 mb-1">{item.titre}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description || '—'}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <Calendar className="w-3.5 h-3.5" />
                {classLabel(item)}
              </div>
              {'date_limite' in item && (item as DevoirItem).date_limite && (
                <div className="text-xs text-amber-600 font-medium mb-2">Date limite : {new Date((item as DevoirItem).date_limite!).toLocaleDateString('fr-FR')}</div>
              )}
              {'cours' in item && (item as DevoirItem).cours?.titre && (
                <div className="text-xs text-blue-600 mb-2">Cours : {(item as DevoirItem).cours!.titre}</div>
              )}
              {item.fichier_url && (
                <a href={item.fichier_url} target="_blank" rel="noopener" className="text-xs text-purple-600 hover:underline flex items-center gap-1 mb-3">
                  <Upload className="w-3 h-3" /> {item.fichier_nom || 'Fichier'}
                </a>
              )}
              <div className="text-xs text-gray-400 mb-3">{new Date(item.created_at).toLocaleDateString('fr-FR')}</div>
              {isOwner(item.professeur_id) && (
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => openEdit(item, activeTab === 'devoirs')} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"><Edit className="w-3.5 h-3.5" /> Modifier</button>
                  <button onClick={() => handleDelete(item.id, activeTab === 'devoirs')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      }

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold">{editingId ? 'Modifier' : 'Créer'} {activeTab === 'cours' ? 'un cours' : 'un devoir'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select value={form.section_id} onChange={e => setForm(p => ({ ...p, section_id: e.target.value, option_id: '', classe_id: '' }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Toutes les sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option</label>
                <select value={form.option_id} onChange={e => setForm(p => ({ ...p, option_id: e.target.value, classe_id: '' }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Toutes les options</option>
                  {options.filter(o => !form.section_id || o.section_id === form.section_id).map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select value={form.classe_id} onChange={e => setForm(p => ({ ...p, classe_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Toutes les classes</option>
                  {classes.filter(c => {
                    if (!form.option_id) return true;
                    return c.option_id === form.option_id;
                    return (!form.section_id || sec?.id === form.section_id);
                  }).map(c => <option key={c.id} value={c.id}>{c.section_nom ? `${c.section_nom} - ` : ''}{c.nom}</option>)}
                </select>
              </div>
              {activeTab === 'devoirs' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cours lié (optionnel)</label>
                    <select value={form.cours_id} onChange={e => setForm(p => ({ ...p, cours_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="">Aucun</option>
                      {cours.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                    <input type="date" value={form.date_limite} onChange={e => setForm(p => ({ ...p, date_limite: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                <input type="file" ref={fileRef} onChange={e => setForm(p => ({ ...p, fichier: e.target.files?.[0] || null }))} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? 'Enregistrer' : 'Créer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
