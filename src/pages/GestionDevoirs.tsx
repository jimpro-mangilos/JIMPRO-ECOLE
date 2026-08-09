import { useState, useMemo } from 'react';
import { Plus, FileText, Edit, Trash2, Loader2, X, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSections, useClasses } from '../lib/hooks/useReferenceData';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface DevoirItem { id: string; titre: string; description: string; professeur_id: string; classe_id: string | null; date_limite: string | null; fichier_url: string | null; fichier_nom: string | null; created_at: string; classes?: { nom: string } | null; profiles?: { nom: string; prenom: string } | null; }

export default function GestionDevoirs() {
  const queryClient = useQueryClient();
  const { currentSchoolId } = useAuth();
  const { data: sections = [] } = useSections(currentSchoolId);
  const { data: classes = [] } = useClasses(currentSchoolId);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ titre: '', description: '', classe_id: '', date_limite: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: devoirs = [], isLoading } = useQuery({
    queryKey: ['devoirs'],
    queryFn: async () => {
      const { data } = await supabase.from('devoirs').select('*, classes(nom), profiles!professeur_id(nom, prenom)').eq('ecole_id', currentSchoolId).order('created_at', { ascending: false });
      return (data ?? []) as DevoirItem[];
    },
  });

  const filtered = useMemo(() => devoirs.filter(d => {
    if (search && !d.titre.toLowerCase().includes(search.toLowerCase()) && !(d.profiles?.nom || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSection && (d as any).section_id !== filterSection) return false;
    if (filterClasse && d.classe_id !== filterClasse) return false;
    return true;
  }), [devoirs, search, filterSection, filterClasse]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['devoirs'] });

  const openCreate = () => { setEditingId(null); setForm({ titre: '', description: '', classe_id: '', date_limite: '' }); setShowForm(true); setError(''); };
  const openEdit = (d: DevoirItem) => { setEditingId(d.id); setForm({ titre: d.titre, description: d.description || '', classe_id: d.classe_id || '', date_limite: d.date_limite ? d.date_limite.split('T')[0] : '' }); setShowForm(true); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) { setError('Titre requis'); return; }
    setSaving(true);
    const payload = { titre: form.titre, description: form.description, classe_id: form.classe_id || null, date_limite: form.date_limite || null, ecole_id: currentSchoolId };
    const result = editingId ? await supabase.from('devoirs').update(payload).eq('id', editingId).select() : await supabase.from('devoirs').insert(payload).select();
    if (result.error) { toast.error(result.error.message); setSaving(false); return; }
    setShowForm(false); invalidate(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devoir ?')) return;
    await supabase.from('devoirs').delete().eq('id', id);
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><FileText className="w-8 h-8 text-amber-600" /> Gestion des Devoirs</h1><p className="text-gray-600 mt-1">Administrez tous les devoirs</p></div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" /></div>
        <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setFilterClasse(''); }} className="px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"><option value="">Toutes les sections</option>{(sections as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
        <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className="px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"><option value="">Toutes les classes</option>{(classes as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
        <button onClick={openCreate} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium"><Plus className="w-4 h-4" /> Nouveau devoir</button>
      </div>

      {isLoading ? <div className="flex items-center gap-2 text-gray-500 py-12"><Loader2 className="w-5 h-5 animate-spin" /> Chargement...</div>
        : filtered.length === 0 ? <p className="text-gray-400 py-12 text-center">Aucun devoir trouvé.</p>
        : <div className="bg-white rounded-lg shadow-sm border overflow-hidden"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Titre</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Classe</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Professeur</th><th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date limite</th><th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{filtered.map(d => (
            <tr key={d.id} className="hover:bg-gray-50 cursor-pointer"><td className="px-4 py-3 font-medium text-gray-900">{d.titre}</td><td className="px-4 py-3 text-gray-600">{d.classes?.nom || '—'}</td><td className="px-4 py-3 text-gray-600">{d.profiles ? `${d.profiles.prenom} ${d.profiles.nom}` : '—'}</td><td className="px-4 py-3 text-gray-500 text-xs">{d.date_limite ? new Date(d.date_limite).toLocaleDateString('fr-FR') : '—'}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">{d.fichier_url && <a href={d.fichier_url} target="_blank" rel="noopener" className="text-xs text-amber-600 hover:underline px-2">📎</a>}<button onClick={() => openEdit(d)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td></tr>
          ))}</tbody>
        </table></div>
      }

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b"><h3 className="font-bold">{editingId ? 'Modifier' : 'Créer'} un devoir</h3><button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-3 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
              <div><label className="block text-sm font-medium mb-1">Titre *</label><input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" required /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" /></div>
              <div><label className="block text-sm font-medium mb-1">Classe</label><select value={form.classe_id} onChange={e => setForm(p => ({ ...p, classe_id: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"><option value="">Toutes</option>{(classes as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Date limite</label><input type="date" value={form.date_limite} onChange={e => setForm(p => ({ ...p, date_limite: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" /></div>
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50">{saving ? '...' : editingId ? 'Enregistrer' : 'Créer'}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Annuler</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
