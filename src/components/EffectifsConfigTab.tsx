import { useCallback, useEffect, useState } from 'react';
import { Users, Save, Loader2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const CLEF_EFFECTIF_MAX = 'effectif_max_classes';

export function cleClasse(section: string, option: string, classe: string): string {
  return (section + '|' + (option || '') + '|' + (classe || '')).toLowerCase().trim();
}

interface Combo { section: string; option: string; classe: string; count: number; }

/** Lit les capacités (JSON) : { cleClasse: effectifMax } */
export async function chargerEffectifsMax(ecoleId: string): Promise<Record<string, number>> {
  try {
    const { data } = await (supabase as any).from('app_settings').select('value').eq('ecole_id', ecoleId).eq('key', CLEF_EFFECTIF_MAX).maybeSingle();
    if (data?.value) return JSON.parse(data.value);
  } catch { /* ignore */ }
  return {};
}

export async function sauverEffectifsMax(ecoleId: string, map: Record<string, number>): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).from('app_settings').upsert(
    { ecole_id: ecoleId, key: CLEF_EFFECTIF_MAX, value: JSON.stringify(map) },
    { onConflict: 'ecole_id,key' }
  );
  return { error: error ? error.message : null };
}

export default function EffectifsConfigTab() {
  const { currentSchoolId } = useAuth();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  // nouvelle ligne
  const [secs, setSecs] = useState<string[]>([]);
  const [newSection, setNewSection] = useState('');
  const [newOption, setNewOption] = useState('');
  const [newClasse, setNewClasse] = useState('');
  const [newCap, setNewCap] = useState('');

  const load = useCallback(async () => {
    if (!currentSchoolId) return;
    setLoading(true);
    try {
      // Élèves (pagination) → combos section|option|classe + comptage
      const mapCount = new Map<string, number>();
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const to = from + PAGE - 1;
        const { data } = await (supabase as any)
          .from('eleves')
          .select('section, option, classe')
          .eq('ecole_id', currentSchoolId)
          .range(from, to);
        if (!data || data.length === 0) break;
        for (const e of data) {
          const s = e.section || ''; const o = e.option || ''; const c = e.classe || '';
          const key = cleClasse(s, o, c);
          mapCount.set(key, (mapCount.get(key) || 0) + 1);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const list: Combo[] = [];
      for (const [key, count] of mapCount) {
        const [s, o, c] = key.split('|');
        list.push({ section: s, option: o, classe: c, count });
      }
      list.sort((a, b) => a.section.localeCompare(b.section) || a.classe.localeCompare(b.classe));
      setCombos(list);
      setSecs(Array.from(new Set(list.map(x => x.section))).sort());
      setCaps(await chargerEffectifsMax(currentSchoolId));
    } finally {
      setLoading(false);
    }
  }, [currentSchoolId]);

  useEffect(() => { load(); }, [load]);

  const setCap = (key: string, val: string) => {
    const n = parseInt(val, 10);
    setCaps(p => {
      const next = { ...p };
      if (!val || isNaN(n) || n <= 0) delete next[key];
      else next[key] = n;
      return next;
    });
  };

  const save = async () => {
    if (!currentSchoolId) return;
    setSaving(true);
    const { error } = await sauverEffectifsMax(currentSchoolId, caps);
    setMsg(error ? 'Erreur : ' + error : 'Capacités enregistrées. Toute nouvelle inscription au-delà de la capacité sera bloquée.');
    if (!error) setTimeout(() => setMsg(''), 3500);
    setSaving(false);
  };

  const addLigne = () => {
    const s = newSection.trim(); const c = newClasse.trim();
    if (!s || !c) { setMsg('Renseignez au moins une section et un nom de classe.'); return; }
    const o = newOption.trim();
    const key = cleClasse(s, o, c);
    setCaps(p => ({ ...p, [key]: parseInt(newCap, 10) > 0 ? parseInt(newCap, 10) : 0 }));
    if (!combos.some(x => cleClasse(x.section, x.option, x.classe) === key)) {
      setCombos(prev => [...prev, { section: s, option: o, classe: c, count: 0 }].sort((a, b) => a.section.localeCompare(b.section) || a.classe.localeCompare(b.classe)));
    }
    setMsg(''); setNewSection(''); setNewOption(''); setNewClasse(''); setNewCap('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Limiteur d'effectif par classe</h2>
      <p className="text-sm text-gray-500 mb-5">
        Définissez la <b>capacité maximale</b> de chaque classe (0 ou vide = illimité). Dès qu'une classe atteint sa capacité, <b>les nouvelles inscriptions sont bloquées</b> (section + option + classe). L'effectif actuel est calculé sur les élèves enregistrés.
      </p>

      {msg && <div className="mb-3 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">{msg}</div>}

      {/* Nouvelle ligne */}
      <div className="flex flex-wrap items-end gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div><label className="block text-[11px] text-gray-500 mb-1">Section</label>
          <select value={newSection} onChange={e => setNewSection(e.target.value)} className="px-2 py-1.5 border rounded-lg text-sm">
            <option value="">Choisir...</option>
            {secs.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div><label className="block text-[11px] text-gray-500 mb-1">Option (facultatif)</label>
          <input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="ex. Scientifique" className="px-2 py-1.5 border rounded-lg text-sm w-40" /></div>
        <div><label className="block text-[11px] text-gray-500 mb-1">Classe *</label>
          <input value={newClasse} onChange={e => setNewClasse(e.target.value)} placeholder="ex. 1ère" className="px-2 py-1.5 border rounded-lg text-sm w-32" /></div>
        <div><label className="block text-[11px] text-gray-500 mb-1">Capacité max</label>
          <input type="number" min={1} value={newCap} onChange={e => setNewCap(e.target.value)} placeholder="ex. 40" className="px-2 py-1.5 border rounded-lg text-sm w-24" /></div>
        <button onClick={addLigne} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
      ) : combos.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucune classe enregistrée (les classes apparaissent dès qu'elles contiennent des élèves ou sont ajoutées ci-dessus).</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Option</th>
                <th className="px-4 py-2">Classe</th>
                <th className="px-4 py-2 text-center">Effectif actuel</th>
                <th className="px-4 py-2 text-center w-28">Capacité max</th>
                <th className="px-4 py-2 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combos.map(cb => {
                const key = cleClasse(cb.section, cb.option, cb.classe);
                const max = caps[key];
                const full = max != null && max > 0 && cb.count >= max;
                return (
                  <tr key={key} className={full ? 'bg-red-50' : cb.count >= (max || 0) && max ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2">{cb.section}</td>
                    <td className="px-4 py-2 text-gray-500">{cb.option || '—'}</td>
                    <td className="px-4 py-2 font-semibold">{cb.classe || '—'}</td>
                    <td className="px-4 py-2 text-center"><span className={'px-2 py-0.5 rounded-full text-xs font-bold ' + (full ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>{cb.count}</span></td>
                    <td className="px-4 py-2 text-center">
                      <input type="number" min={0} value={max ?? ''} placeholder="∞" onChange={e => setCap(key, e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm text-center" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {max != null && max > 0 ? (
                        full
                          ? <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">Complète — inscriptions bloquées</span>
                          : <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">{cb.count}/{max} place(s)</span>
                      ) : <span className="text-gray-300 text-xs">Illimité</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={save} disabled={saving || loading} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 text-sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer les capacités
      </button>
      <p className="text-[11px] text-gray-400 mt-2">0 ou vide = illimité. Les classes supprimées de la liste réapparaîtront si elles contiennent des élèves.</p>
    </div>
  );
}
