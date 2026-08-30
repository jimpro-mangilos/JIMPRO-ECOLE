import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Pencil, Trash2, Check, X, Save, Loader2, Clock } from 'lucide-react';

type Item = { id: string; libelle: string; ordre: number; is_active: boolean };
type FonctionHeure = { id: string; libelle: string; heure_entree: string | null; heure_sortie: string | null };

export default function PersonnelConfigTab() {
  const { currentSchoolId } = useAuth();
  const [fonctions, setFonctions] = useState<Item[]>([]);
  const [domaines, setDomaines] = useState<Item[]>([]);
  const [niveaux, setNiveaux] = useState<Item[]>([]);
  const [fonctionHeures, setFonctionHeures] = useState<Record<string, FonctionHeure>>({});
  const [heuresSaving, setHeuresSaving] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [prefixSaving, setPrefixSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const schoolId = currentSchoolId!;

  const load = useCallback(async () => {
    setLoading(true);
    console.log('[ConfigPersonnel] chargement ecole', schoolId);
    // Résilience : une table absente (ex. domaines_personnel avant migration)
    // ou une erreur RLS ne doit jamais faire planter l'onglet.
    // Le builder Supabase est un "thenable" (pas de .catch) : Promise.resolve l'assimile
    const safe = (p: PromiseLike<any>) => Promise.resolve(p).catch(() => ({ data: null, error: null }));
    // Filet de sécurité : même si une requête ne répond pas, l'onglet s'affiche
    const timer = setTimeout(() => {
      console.warn('[ConfigPersonnel] TIMEOUT 8s - requetes toujours en cours');
      setLoadError('Délai dépassé : une requête Supabase ne répond pas. Rechargez la page.');
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
      // Heures de service par fonction
      const heuresMap: Record<string, FonctionHeure> = {};
      for (const fn of (f.data as any[]) || []) {
        heuresMap[fn.id] = { id: fn.id, libelle: fn.libelle, heure_entree: fn.heure_entree || null, heure_sortie: fn.heure_sortie || null };
      }
      setFonctionHeures(heuresMap);
      setPrefix((p.data as any)?.value || '');
      setLoadError('');
    } catch (err) {
      console.error('[ConfigPersonnel] erreur chargement:', err);
      setLoadError((err as Error)?.message || 'Erreur lors du chargement.');
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
    if (error) {
      console.error('[ConfigPersonnel] insertion refusée:', error);
      setLoadError('Insertion refusée : ' + error.message);
      return;
    }
    setLoadError('');
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

  async function saveFonctionHeures() {
    setHeuresSaving(true);
    let erreur = '';
    for (const f of Object.values(fonctionHeures)) {
      const { error } = await supabase
        .from('fonctions_personnel')
        .update({ heure_entree: f.heure_entree || null, heure_sortie: f.heure_sortie || null })
        .eq('id', f.id);
      if (error) { erreur = error.message; break; }
    }
    setHeuresSaving(false);
    if (erreur) {
      // Cas fréquent : migration SQL non appliquée (colonnes heure_entree/heure_sortie absentes)
      alert(
        /does not exist|column/.test(erreur)
          ? "Heures non enregistrées : la mise à jour de la base n'est pas appliquée. Exécutez la migration « ajouter_heures_fonctions » dans Supabase (SQL Editor), puis réessayez."
          : 'Erreur enregistrement : ' + erreur
      );
    } else {
      alert('Heures de service enregistrées');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <b>Erreur :</b> {loadError}
        </div>
      )}

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

      {/* Heures de service par fonction */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" /> Heures de service par fonction</h2>
          <button onClick={saveFonctionHeures} disabled={heuresSaving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {heuresSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Fixez l'heure d'entrée et de sortie de chaque fonction. Ces heures sont utilisées par le portail de
          pointage pour déterminer les <b>retards</b> (arrivée après l'heure d'entrée) et les <b>absences</b>.
          Une fonction sans heure utilise les heures globales de l'école (Configuration → pointage).
        </p>
        {fonctions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Ajoutez d'abord des fonctions ci-dessous.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Fonction</th>
                  <th className="px-3 py-2">Heure d'entrée</th>
                  <th className="px-3 py-2">Heure de sortie</th>
                  <th className="px-3 py-2 text-gray-400 font-normal normal-case">(vide = heures globales)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fonctions.map(f => {
                  const h = fonctionHeures[f.id];
                  return (
                    <tr key={f.id} className={f.is_active ? '' : 'opacity-50'}>
                      <td className="px-3 py-2 font-medium text-gray-800">{f.libelle}</td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={h?.heure_entree || ''}
                          onChange={e => setFonctionHeures(prev => ({ ...prev, [f.id]: { ...prev[f.id], id: f.id, libelle: f.libelle, heure_entree: e.target.value || null } }))}
                          className="px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={h?.heure_sortie || ''}
                          onChange={e => setFonctionHeures(prev => ({ ...prev, [f.id]: { ...prev[f.id], id: f.id, libelle: f.libelle, heure_sortie: e.target.value || null } }))}
                          className="px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {h?.heure_entree || h?.heure_sortie ? (
                          <span className="text-emerald-600 font-medium">{h.heure_entree || '—'} → {h.heure_sortie || '—'}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
