import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Pencil, Trash2, Check, X, Save, Loader2 } from 'lucide-react';

type Item = { id: string; libelle: string; ordre: number; is_active: boolean };

export default function PersonnelConfigTab() {
  const { currentSchoolId } = useAuth();
  const [fonctions, setFonctions] = useState<Item[]>([]);
  const [domaines, setDomaines] = useState<Item[]>([]);
  const [niveaux, setNiveaux] = useState<Item[]>([]);
  const [prefix, setPrefix] = useState('');
  const [prefixSaving, setPrefixSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const schoolId = currentSchoolId!;

  const load = useCallback(async () => {
    setLoading(true);
    console.log('[ConfigPersonnel] chargement ecole', schoolId);
    // Résilience : une table absente (ex. domaines_personnel avant migration)
    // ou une erreur RLS ne doit jamais faire planter l'onglet.
    const safe = (p: Promise<{ data: any; error: any }>) => p.catch(() => ({ data: null, error: null }));
    // Filet de sécurité : même si une requête ne répond pas, l'onglet s'affiche
    const timer = setTimeout(() => {
      console.warn('[ConfigPersonnel] TIMEOUT 8s - requetes toujours en cours');
      setLoading(false);
    }, 8000);
    try {
      const [f, d, n, p] = await Promise.all([
        safe(supabase.from('fonctions_personnel').select('*').eq('ecole_id', schoolId).order('ordre') as any),
        safe(supabase.from('domaines_personnel').select('*').eq('ecole_id', schoolId).order('ordre') as any),
        safe(supabase.from('niveaux_etude').select('*').eq('ecole_id', schoolId).order('ordre') as any),
        safe(supabase.from('app_settings').select('value').eq('ecole_id', schoolId).eq('key', 'personnel_matricule_prefix').maybeSingle() as any),
      ]);
      console.log('[ConfigPersonnel] resultats:', {
        fonctions: (f.data || []).length, domaines: (d.data || []).length,
        niveaux: (n.data || []).length, prefix: (p.data as any)?.value || '',
      });
      setFonctions((f.data as Item[]) || []);
      setDomaines((d.data as Item[]) || []);
      setNiveaux((n.data as Item[]) || []);
      setPrefix((p.data as any)?.value || '');
    } catch (err) {
      console.error('[ConfigPersonnel] erreur chargement:', err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  async function savePrefix() {
    setPrefixSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ ecole_id: schoolId, key: 'personnel_matricule_prefix', value: prefix.trim() }, { onConflict: 'ecole_id,key' });
    setPrefixSaving(false);
    alert(error ? 'Erreur enregistrement' : 'Préfixe enregistré');
  }

  async function addItem(table: 'fonctions_personnel' | 'domaines_personnel' | 'niveaux_etude', source: Item[], setSource: (v: Item[]) => void) {
    const libelle = prompt(table === 'fonctions_personnel' ? 'Nouvelle fonction' : table === 'domaines_personnel' ? 'Nouveau domaine' : 'Nouveau niveau d\'étude');
    if (!libelle?.trim()) return;
    const maxOrdre = source.reduce((m, x) => Math.max(m, x.ordre || 0), 0) + 1;
    const { error } = await supabase.from(table).insert({ ecole_id: schoolId, libelle: libelle.trim(), ordre: maxOrdre, is_active: true });
    if (error) alert(error.message);
    setSource([]); // placeholder (load() sera rappelé)
    await load();
  }

  async function renameItem(table: 'fonctions_personnel' | 'domaines_personnel' | 'niveaux_etude', item: Item) {
    const libelle = prompt('Libellé', item.libelle);
    if (!libelle?.trim() || libelle === item.libelle) return;
    const { error } = await supabase.from(table).update({ libelle: libelle.trim() }).eq('id', item.id);
    if (error) alert(error.message);
    await load();
  }

  async function toggleItem(table: 'fonctions_personnel' | 'domaines_personnel' | 'niveaux_etude', item: Item) {
    await supabase.from(table).update({ is_active: !item.is_active }).eq('id', item.id);
    await load();
  }

  async function deleteItem(table: 'fonctions_personnel' | 'domaines_personnel' | 'niveaux_etude', item: Item) {
    if (!confirm(`Supprimer « ${item.libelle} » ?`)) return;
    await supabase.from(table).delete().eq('id', item.id);
    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Préfixe matricule personnel */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-1">Préfixe matricule personnel</h2>
        <p className="text-sm text-gray-500 mb-3">Préfixe utilisé pour générer les matricules du personnel (ex : PER, STF...).</p>
        <div className="flex items-center gap-3">
          <input
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            placeholder="Ex : PER"
            className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button onClick={savePrefix} disabled={prefixSaving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {prefixSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
          </button>
        </div>
      </div>

      {/* Fonctions */}
      <ConfigList
        title="Fonctions"
        description="Postes / fonctions du personnel (Enseignant, Directeur, Comptable...)."
        items={fonctions}
        onAdd={() => addItem('fonctions_personnel', fonctions, setFonctions)}
        onRename={(item) => renameItem('fonctions_personnel', item)}
        onToggle={(item) => toggleItem('fonctions_personnel', item)}
        onDelete={(item) => deleteItem('fonctions_personnel', item)}
      />

      {/* Domaines */}
      <ConfigList
        title="Domaines"
        description="Domaines d'activité du personnel (Enseignement, Administration, Comptabilité...)."
        items={domaines}
        onAdd={() => addItem('domaines_personnel', domaines, setDomaines)}
        onRename={(item) => renameItem('domaines_personnel', item)}
        onToggle={(item) => toggleItem('domaines_personnel', item)}
        onDelete={(item) => deleteItem('domaines_personnel', item)}
      />

      {/* Niveaux d'étude */}
      <ConfigList
        title="Niveaux d'étude"
        description="Diplômes / niveaux (Licence, Master, Doctorat...)."
        items={niveaux}
        onAdd={() => addItem('niveaux_etude', niveaux, setNiveaux)}
        onRename={(item) => renameItem('niveaux_etude', item)}
        onToggle={(item) => toggleItem('niveaux_etude', item)}
        onDelete={(item) => deleteItem('niveaux_etude', item)}
      />
    </div>
  );
}

function ConfigList({ title, description, items, onAdd, onRename, onToggle, onDelete }: {
  title: string;
  description: string;
  items: Item[];
  onAdd: () => void;
  onRename: (item: Item) => void;
  onToggle: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Aucun élément.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between py-2">
              <span className={`text-sm ${item.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{item.libelle}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => onToggle(item)} className={`p-1.5 rounded ${item.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={item.is_active ? 'Désactiver' : 'Activer'}>
                  {item.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button onClick={() => onRename(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Renommer"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(item)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
