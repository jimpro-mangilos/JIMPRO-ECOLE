import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, AlertTriangle, Bell, Phone, MessageCircle, Loader2, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaiementRow {
  id: string; numero_recu: string; nom_eleve: string; postnom: string; prenom: string;
  matricule: string; telephone: string; classe: string; montant_paye: number;
  type_paiement: string; statut: string; est_encaisse: boolean; date_encaissement: string | null;
  date_paiement: string; created_at: string;
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Recouvrement() {
  const { currentSchoolId } = useAuth();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSchoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const [rp, rt] = await Promise.all([
        supabase.from('paiements').select('*').eq('ecole_id', currentSchoolId).gte('date_paiement', start).lte('date_paiement', end),
        supabase.from('types_paiement').select('id, libelle'),
      ]);
      if (!cancelled) {
        setPaiements((rp.data as PaiementRow[]) || []);
        const map: Record<string, string> = {};
        (rt.data || []).forEach((t: any) => { map[t.id] = t.libelle; });
        setTypes(map);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentSchoolId, month]);

  // ─── Taux de recouvrement ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const encaisse = paiements.filter(p => p.statut === 'encaisse').reduce((a, p) => a + Number(p.montant_paye || 0), 0);
    const attendu = paiements.filter(p => p.statut !== 'annule').reduce((a, p) => a + Number(p.montant_paye || 0), 0);
    const parMotif: Record<string, { encaisse: number; attendu: number }> = {};
    for (const p of paiements) {
      if (p.statut === 'annule') continue;
      const label = types[p.type_paiement] || p.type_paiement;
      parMotif[label] = parMotif[label] || { encaisse: 0, attendu: 0 };
      parMotif[label].attendu += Number(p.montant_paye || 0);
      if (p.statut === 'encaisse') parMotif[label].encaisse += Number(p.montant_paye || 0);
    }
    const taux = attendu > 0 ? Math.round((encaisse / attendu) * 1000) / 10 : 0;
    return { encaisse, attendu, taux, parMotif };
  }, [paiements, types]);

  // ─── Impayés (enregistrés mais non encaissés) ────────────────────────────
  const impayes = useMemo(() => paiements.filter(p => p.statut !== 'encaisse' && p.statut !== 'annule'), [paiements]);
  const recents = useMemo(() => paiements.filter(p => p.statut === 'encaisse').slice(0, 10), [paiements]);

  function waLink(phone: string, msg: string): string {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean) return '';
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  }

  function messageRelance(p: PaiementRow): string {
    return `Bonjour, ${p.nom_eleve} ${p.postnom} ${p.prenom} (matricule ${p.matricule}) a encore un paiement en attente de ${Number(p.montant_paye).toLocaleString('fr-FR')} FC (reçu ${p.numero_recu}). Merci de régulariser. — École`;
  }

  function messageReçu(p: PaiementRow): string {
    return `Bonjour, le paiement de ${Number(p.montant_paye).toLocaleString('fr-FR')} FC (${types[p.type_paiement] || 'paiement'}) a été enregistré pour ${p.nom_eleve} ${p.postnom} ${p.prenom}. Reçu : ${p.numero_recu}. — École`;
  }

  const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FC`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-7 h-7 text-blue-600" /> Recouvrement</h1>
          <p className="text-gray-500 mt-1">Taux de recouvrement, relances des impayés et notifications aux parents.</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      </div>

      {/* Taux de recouvrement */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-gray-500 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500" /> Encaissé</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(stats.encaisse)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-gray-500">Attendu (enregistré)</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{fmt(stats.attendu)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-gray-500">Taux de recouvrement</div>
          <div className={`text-2xl font-bold mt-1 ${stats.taux >= 80 ? 'text-green-600' : stats.taux >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{stats.taux} %</div>
        </div>
      </div>

      {/* Par motif */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">Recouvrement par motif — {month}</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...</div>
        ) : Object.keys(stats.parMotif).length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun paiement enregistré ce mois.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.parMotif).map(([label, v]) => {
              const taux = v.attendu > 0 ? Math.round((v.encaisse / v.attendu) * 1000) / 10 : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-medium text-gray-700 truncate">{label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${taux >= 80 ? 'bg-green-500' : taux >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${taux}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 w-44 text-right">{fmt(v.encaisse)} / {fmt(v.attendu)} · <span className="font-semibold">{taux}%</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relances impayés */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-500" /> Relances des impayés ({impayes.length})</h3>
          {impayes.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun paiement en attente ce mois.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {impayes.map(p => {
                const link = waLink(p.telephone, messageRelance(p));
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{p.nom_eleve} {p.postnom} {p.prenom}</div>
                      <div className="text-[11px] text-gray-400">{p.classe} · {types[p.type_paiement] || p.type_paiement} · {fmt(p.montant_paye)}</div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 shrink-0">
                        <MessageCircle className="w-3.5 h-3.5" /> Relancer
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-300 flex items-center gap-1"><Phone className="w-3 h-3" /> n° absent</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications parents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-blue-500" /> Notifier les parents — paiements récents</h3>
          {recents.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun paiement encaissé ce mois.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recents.map(p => {
                const link = waLink(p.telephone, messageReçu(p));
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{p.nom_eleve} {p.postnom} {p.prenom}</div>
                      <div className="text-[11px] text-gray-400">{p.numero_recu} · {fmt(p.montant_paye)}</div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shrink-0">
                        <MessageCircle className="w-3.5 h-3.5" /> Notifier
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-300 flex items-center gap-1"><Phone className="w-3 h-3" /> n° absent</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
