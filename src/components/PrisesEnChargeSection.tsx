import { useCallback, useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, ShieldX, Loader2, X, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { chargerPrisesEnCharge, creerPriseEnCharge, deciderPriseEnCharge, type PriseEnCharge } from '../lib/hooks/usePrisesEnCharge';

const STATUT_LABEL: Record<string, string> = { en_attente: 'En attente', active: 'Active', refusee: 'Refusée', cloturee: 'Clôturée' };
const STATUT_CLS: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
  cloturee: 'bg-slate-200 text-slate-600',
};

export default function PrisesEnChargeSection({ ecoleId, personnelId, membreNom, isApprover, userId }: {
  ecoleId: string; personnelId: string; membreNom: string; isApprover: boolean; userId: string | null;
}) {
  const [items, setItems] = useState<(PriseEnCharge & { eleveNom: string; eleveMatricule: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const [eleveSearch, setEleveSearch] = useState('');
  const [eleveOptions, setEleveOptions] = useState<any[]>([]);
  const [chosen, setChosen] = useState<any | null>(null);
  const [type, setType] = useState('enfant');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const list = await chargerPrisesEnCharge(ecoleId);
    const mine = list.filter(p => p.personnel_id === personnelId);
    const eleves = mine.length ? await (supabase as any)
      .from('eleves').select('id, nom, postnom, prenom, matricule, classe')
      .in('id', mine.map(p => p.eleve_id)) : [];
    const map = new Map((eleves.data || []).map((e: any) => [e.id, e]));
    setItems(mine.map(p => {
      const e = (map.get(p.eleve_id) as any) || {};
      return { ...p, eleveNom: (e.nom || '') + ' ' + (e.postnom || '') + ' ' + (e.prenom || ''), eleveMatricule: e.matricule || '' };
    }));
    setLoading(false);
  }, [ecoleId, personnelId]);

  useEffect(() => { load(); }, [load]);

  // Recherche d'élève (matricule tolérant ou nom)
  const chercherEleves = async (q: string) => {
    if (!q.trim() || !ecoleId) return;
    setChosen(null);
    const t = q.trim();
    const { data } = await (supabase as any)
      .from('eleves')
      .select('id, nom, postnom, prenom, matricule, classe')
      .eq('ecole_id', ecoleId)
      .or('nom.ilike.%' + t + '%,postnom.ilike.%' + t + '%,prenom.ilike.%' + t + '%,matricule.ilike.%' + t + '%')
      .limit(15);
    setEleveOptions((data || []).map((e: any) => ({ ...e, label: (e.nom + ' ' + (e.postnom || '') + ' ' + e.prenom + ' — ' + e.matricule).trim() })));
  };

  const ajouter = async () => {
    if (!chosen) { setErr('Choisissez un élève.'); return; }
    setSaving(true); setErr('');
    const r = await creerPriseEnCharge({
      ecoleId, personnelId, eleveId: chosen.id, type,
      dateDebut, motif: motif || undefined, userId,
    });
    if (r.error) { setErr(r.error); setSaving(false); return; }
    setSaving(false);
    setShowForm(false); setEleveSearch(''); setChosen(null); setMotif(''); setType('enfant');
    load();
  };

  const decider = async (id: string, statut: 'active' | 'refusee' | 'cloturee') => {
    setBusy(id);
    await deciderPriseEnCharge(id, statut, userId);
    setBusy(null);
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600" /> Élèves pris en charge par {membreNom}</h3>
        <button onClick={() => { setShowForm(!showForm); setErr(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} {showForm ? 'Fermer' : 'Nouvelle prise en charge'}
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-indigo-50/40 border-b border-slate-100 space-y-3">
          <p className="text-xs text-gray-500">La fiche part en « En attente » — elle ne s'active qu'après approbation (IT Manager / Promoteur / Admin).</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input value={eleveSearch} onChange={e => { setEleveSearch(e.target.value); chercherEleves(e.target.value); }} placeholder="Rechercher un élève (matricule, nom...)" className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" />
              {eleveOptions.length > 0 && !chosen && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-52 overflow-auto">
                  {eleveOptions.map((e: any) => (
                    <button key={e.id} type="button" onClick={() => { setChosen(e); setEleveOptions([]); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-50">
                      {e.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {chosen && (
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-white border rounded-lg px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> {chosen.nom} {chosen.postnom || ''} {chosen.prenom} — {chosen.matricule}
              </div>
            )}
            <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-2 border rounded-lg text-sm">
              <option value="enfant">Enfant</option>
              <option value="boursier">Boursier</option>
              <option value="autre">Autre</option>
            </select>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-2 py-2 border rounded-lg text-sm" />
            <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif (optionnel)" className="px-2 py-2 border rounded-lg text-sm flex-1" />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button onClick={ajouter} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Soumettre la fiche
          </button>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aucune prise en charge pour ce membre.</p>
        ) : (
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{p.eleveNom || 'Élève'}</div>
                  <div className="text-xs text-gray-400">{p.eleveMatricule} · {p.type} · depuis le {p.date_debut}{p.date_fin ? ' → ' + p.date_fin : ''}{p.motif ? ' — ' + p.motif : ''}</div>
                </div>
                <span className={'px-2 py-0.5 rounded-full text-[11px] font-bold ' + (STATUT_CLS[p.statut] || 'bg-gray-100 text-gray-600')}>{STATUT_LABEL[p.statut] || p.statut}</span>
                {isApprover && p.statut === 'en_attente' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => decider(p.id, 'active')} disabled={busy === p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-[11px] font-semibold hover:bg-green-700 disabled:opacity-50"><ShieldCheck className="w-3 h-3" /> Approuver</button>
                    <button onClick={() => decider(p.id, 'refusee')} disabled={busy === p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 disabled:opacity-50"><ShieldX className="w-3 h-3" /> Refuser</button>
                  </div>
                )}
                {isApprover && p.statut === 'active' && (
                  <button onClick={() => decider(p.id, 'cloturee')} disabled={busy === p.id} className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-300 disabled:opacity-50">Clôturer</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
