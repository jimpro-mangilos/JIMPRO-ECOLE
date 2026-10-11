import { useEffect, useMemo, useState } from 'react';
import { Fingerprint, Trash2, Loader2, Info, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePersonnel, type PersonnelRecord } from '../lib/hooks/usePersonnel';
import { toast } from 'sonner';

interface Empreinte {
  id: string;
  ecole_id: string;
  personnel_id: string;
  appareil_id: string;
  empreinte_ref: string;
  doigt: string | null;
  created_at: string;
}

// Doigts usuels à enrôler (2 par membre recommandé : index + pouce)
const DOIGTS = [
  'droite-pouce', 'droite-index', 'droite-majeur', 'droite-annulaire', 'droite-auriculaire',
  'gauche-pouce', 'gauche-index', 'gauche-majeur', 'gauche-annulaire', 'gauche-auriculaire',
];

function labelDoigt(d: string | null | undefined): string {
  if (!d) return '—';
  return d.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function nomComplet(p: PersonnelRecord): string {
  return `${p.nom}${p.postnom ? ' ' + p.postnom : ''} ${p.prenom}`.trim();
}

/**
 * Gestion des empreintes digitales de la borne de pointage.
 * L'app ne capture PAS l'empreinte : elle relie la référence fournie par le
 * lecteur (empreinte_ref, ex. « slot 12 ») à un membre du personnel, afin que
 * l'agent local (borne-pointage/agent-pointage.mjs) le reconnaisse au pointage.
 */
export default function GestionEmpreintes() {
  const { currentSchoolId, isAdmin, isItManager, isPromoteur } = useAuth();
  const { personnel, loading: loadingPersonnel } = usePersonnel();
  const canManage = isAdmin() || isItManager() || isPromoteur();

  const [empreintes, setEmpreintes] = useState<Empreinte[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Formulaire d'enrôlement
  const [personnelId, setPersonnelId] = useState('');
  const [doigt, setDoigt] = useState('droite-index');
  const [empreinteRef, setEmpreinteRef] = useState('');
  const [appareilId, setAppareilId] = useState('borne1');

  const personnelById = useMemo(() => {
    const m = new Map<string, PersonnelRecord>();
    for (const p of personnel) m.set(p.id, p);
    return m;
  }, [personnel]);

  const membresSansEmpreinte = useMemo(
    () => personnel.filter(p => !empreintes.some(e => e.personnel_id === p.id)),
    [personnel, empreintes],
  );

  const load = async () => {
    if (!currentSchoolId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('empreintes_personnel')
      .select('*')
      .eq('ecole_id', currentSchoolId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message || 'Erreur lors du chargement des empreintes'); return; }
    setEmpreintes((data as Empreinte[]) || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentSchoolId]);

  const enroller = async () => {
    const ref = empreinteRef.trim();
    if (!personnelId) { toast.error('Sélectionnez un membre du personnel.'); return; }
    if (!ref) { toast.error("Saisissez la référence de l'empreinte (fournie par le lecteur)."); return; }
    setBusy(true);
    const { error } = await supabase.from('empreintes_personnel').insert({
      ecole_id: currentSchoolId,
      personnel_id: personnelId,
      appareil_id: appareilId.trim() || 'borne1',
      empreinte_ref: ref,
      doigt,
    });
    setBusy(false);
    if (error) {
      if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
        toast.error(`Référence « ${ref} » déjà enrôlée sur cet appareil.`);
      } else {
        toast.error(error.message || "Erreur lors de l'enrôlement");
      }
      return;
    }
    toast.success('Empreinte enrôlée');
    setEmpreinteRef('');
    await load();
  };

  const supprimer = async (e: Empreinte) => {
    const p = personnelById.get(e.personnel_id);
    const qui = p ? nomComplet(p) : 'membre';
    if (!window.confirm(`Supprimer l'empreinte « ${e.empreinte_ref} » (${labelDoigt(e.doigt)}) de ${qui} ?`)) return;
    const { error } = await supabase.from('empreintes_personnel').delete().eq('id', e.id);
    if (error) { toast.error(error.message || 'Erreur lors de la suppression'); return; }
    toast.success('Empreinte supprimée');
    await load();
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-blue-600" /> Empreintes digitales — borne de pointage
        </h3>
        <span className="text-xs text-gray-500">
          {empreintes.length} enrôlée{empreintes.length > 1 ? 's' : ''} · {membresSansEmpreinte.length} membre{membresSansEmpreinte.length > 1 ? 's' : ''} sans empreinte
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500 mb-4 flex items-start gap-2 leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
          <span>
            La <strong>référence</strong> (ex. « slot 12 ») est attribuée par le logiciel du lecteur
            lorsque vous enrôlez le doigt <em>sur l'appareil</em>. Cette page ne capture pas l'empreinte :
            elle relie la référence du lecteur à un membre, pour que la borne (agent local) le reconnaisse
            au pointage. Enrôlez de préférence <strong>2 doigts</strong> par membre.
          </span>
        </p>

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end bg-slate-50 rounded-lg p-3 mb-4">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Membre</span>
              <select value={personnelId} onChange={e => setPersonnelId(e.target.value)} className={inputCls} disabled={loadingPersonnel}>
                <option value="">— Choisir un membre —</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>{nomComplet(p)} — {p.fonction}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Doigt</span>
              <select value={doigt} onChange={e => setDoigt(e.target.value)} className={inputCls}>
                {DOIGTS.map(d => <option key={d} value={d}>{labelDoigt(d)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Référence lecteur</span>
              <input
                type="text"
                value={empreinteRef}
                onChange={e => setEmpreinteRef(e.target.value)}
                placeholder="ex : slot 12"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Appareil</span>
              <input
                type="text"
                value={appareilId}
                onChange={e => setAppareilId(e.target.value)}
                placeholder="borne1"
                className={inputCls}
              />
            </label>
            <button
              onClick={enroller}
              disabled={busy || loadingPersonnel}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Enrôler
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
          </div>
        ) : empreintes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucune empreinte enrôlée pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Membre</th>
                  <th className="px-4 py-3">Doigt</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Appareil</th>
                  <th className="px-4 py-3">Enrôlée le</th>
                  {canManage && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empreintes.map(e => {
                  const p = personnelById.get(e.personnel_id);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-900">{p ? nomComplet(p) : 'Membre supprimé'}</div>
                        <div className="text-[11px] text-gray-400">{p?.fonction}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{labelDoigt(e.doigt)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-xs">{e.empreinte_ref}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{e.appareil_id}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => supprimer(e)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            title="Supprimer cette empreinte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
