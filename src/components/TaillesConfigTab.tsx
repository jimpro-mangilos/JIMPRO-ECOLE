import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

type Taille = { id: string; libelle: string; ordre: number; is_active: boolean };

export default function TaillesConfigTab() {
  const { currentSchoolId } = useAuth();
  const [tailles, setTailles] = useState<Taille[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('tailles_uniforme').select('*').eq('ecole_id', currentSchoolId).order('ordre');
    setTailles((data as Taille[]) || []);
    setLoading(false);
  }, [currentSchoolId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    const libelle = prompt('Nouvelle taille (ex : 3XL, 4XL…)');
    if (!libelle?.trim()) return;
    const ordre = tailles.reduce((m, t) => Math.max(m, t.ordre || 0), 0) + 1;
    const { error } = await supabase.from('tailles_uniforme').insert({ ecole_id: currentSchoolId, libelle: libelle.trim().toUpperCase(), ordre, is_active: true });
    if (error) alert(error.message);
    await load();
  }

  async function rename(t: Taille) {
    const libelle = prompt('Libellé', t.libelle);
    if (!libelle?.trim() || libelle === t.libelle) return;
    await supabase.from('tailles_uniforme').update({ libelle: libelle.trim().toUpperCase() }).eq('id', t.id);
    await load();
  }

  async function toggle(t: Taille) {
    await supabase.from('tailles_uniforme').update({ is_active: !t.is_active }).eq('id', t.id);
    await load();
  }

  async function remove(t: Taille) {
    if (!confirm(`Supprimer la taille « ${t.libelle} » ?`)) return;
    await supabase.from('tailles_uniforme').delete().eq('id', t.id);
    await load();
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Tailles d'uniformes</h2>
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">Tailles disponibles pour le stock et la distribution des uniformes.</p>
      {tailles.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Aucune taille.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tailles.map(t => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span className={`text-sm font-medium ${t.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{t.libelle}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(t)} className={`p-1.5 rounded ${t.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title="Activer/Désactiver">
                  {t.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button onClick={() => rename(t)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Renommer"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(t)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
