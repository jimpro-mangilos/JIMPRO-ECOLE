import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDays, UserCheck, Clock, CheckCircle2, XCircle, Search, FileDown, Settings2, ShieldCheck, ShieldX } from 'lucide-react';
import { usePersonnel } from '../lib/hooks/usePersonnel';
import { STATUT_POINTAGE, type PointageRecord, type PointageConfig, loadPointageConfig, compareHeures, formatDatePointage } from '../lib/hooks/usePointage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generatePointageReport } from '../utils/pointageReportGenerator';
import { generatePointageSalaireReport } from '../utils/pointageSalaireReportGenerator';
import { generateBulletinPaie } from '../utils/bulletinPaieGenerator';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function workingDaysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month - 1, d);
    const day = date.getDay();
    if (day >= 1 && day <= 5) days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

interface Permission {
  id: string; ecole_id: string; personnel_id: string; date_debut: string; date_fin: string;
  motif: string | null; statut: string; created_at: string; decision_note: string | null;
  paye: boolean | null;
}

export default function PointagePersonnel() {
  const { currentSchoolId, user, isAdmin, isItManager, isPromoteur } = useAuth();
  const isApprover = isAdmin() || isItManager() || isPromoteur();
  const { personnel, loading: loadingPersonnel } = usePersonnel();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [config, setConfig] = useState<PointageConfig>({ heureEntree: '08:00', heureSortie: '16:30', tauxChange: null, seuilRetards: 3 });
  const [records, setRecords] = useState<PointageRecord[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [permBusy, setPermBusy] = useState<string | null>(null);

  const today = todayStr();
  const [year, m] = month.split('-').map(Number);
  const workDays = useMemo(() => workingDaysOfMonth(year, m), [year, m]);

  const reload = useCallback(async () => {
    if (!currentSchoolId) return;
    setLoading(true);
    const [y, mo] = month.split('-').map(Number);
    const start = `${y}-${String(mo).padStart(2, '0')}-01`;
    const lastDay = new Date(y, mo, 0).getDate();
    const end = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const [cfg, r, p] = await Promise.all([
      loadPointageConfig(currentSchoolId),
      supabase.from('pointages_personnel').select('*').eq('ecole_id', currentSchoolId).gte('date_pointage', start).lte('date_pointage', end),
      supabase.from('permissions_personnel').select('*').eq('ecole_id', currentSchoolId),
    ]);
    setConfig(cfg);
    setRecords((r.data as PointageRecord[]) || []);
    setPermissions((p.data as Permission[]) || []);
    setLoading(false);
  }, [currentSchoolId, month]);

  useEffect(() => { reload(); }, [reload]);

  // Maps d'accès
  const recByKey = useMemo(() => {
    const map = new Map<string, PointageRecord>();
    for (const rec of records) map.set(`${rec.personnel_id}_${rec.date_pointage}`, rec);
    return map;
  }, [records]);

  // Permissions approuvées couvrant une date (affichage grille)
  const permDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      if (p.statut !== 'approuvee') continue;
      const start = new Date(p.date_debut + 'T00:00:00');
      const end = new Date(p.date_fin + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(`${p.personnel_id}_${d.toISOString().slice(0, 10)}`);
      }
    }
    return set;
  }, [permissions]);

  // Permissions approuvées PAYÉES (comptées comme présentes pour le salaire)
  const permPayeesDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      if (p.statut !== 'approuvee' || p.paye !== true) continue;
      const start = new Date(p.date_debut + 'T00:00:00');
      const end = new Date(p.date_fin + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(`${p.personnel_id}_${d.toISOString().slice(0, 10)}`);
      }
    }
    return set;
  }, [permissions]);

  // Statut d'un membre pour une date (dérivé : absent si pas de pointage un jour ouvrable passé/présent)
  function cellStatus(pId: string, date: string): { statut: string; implied: boolean } {
    const rec = recByKey.get(`${pId}_${date}`);
    if (rec) {
      // Retard automatique si arrivée après l'heure d'entrée configurée
      if (rec.statut === 'present' && rec.heure_arrivee && compareHeures(rec.heure_arrivee.slice(0, 5), config.heureEntree) > 0) {
        return { statut: 'retard', implied: true };
      }
      return { statut: rec.statut, implied: false };
    }
    if (permDates.has(`${pId}_${date}`)) return { statut: 'permission', implied: true };
    if (date <= today) return { statut: 'absent', implied: true };
    return { statut: '', implied: true };
  }

  const q = search.trim().toLowerCase();
  const list = personnel.filter(p => {
    if (!q) return true;
    return `${p.nom} ${p.postnom || ''} ${p.prenom} ${p.fonction}`.toLowerCase().includes(q);
  });

  // Statistiques (sur les jours ouvrables écoulés)
  const stats = useMemo(() => {
    const s = { present: 0, retard: 0, absent: 0, permission: 0 };
    const pastWorkDays = workDays.filter(d => d <= today);
    for (const p of list) {
      for (const d of pastWorkDays) {
        const st = cellStatus(p.id, d).statut;
        if (st === 'present') s.present++;
        else if (st === 'retard') s.retard++;
        else if (st === 'absent') s.absent++;
        else if (st === 'permission') s.permission++;
      }
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDays, list, recByKey, permDates, config, today]);

  // Marquage rapide d'un statut pour le jour sélectionné
  async function mark(pId: string, statut: string) {
    if (!selectedDay) return;
    const rec = recByKey.get(`${pId}_${selectedDay}`);
    const { error } = await supabase.from('pointages_personnel').upsert(
      {
        ecole_id: currentSchoolId, personnel_id: pId, date_pointage: selectedDay,
        statut,
        heure_arrivee: rec?.heure_arrivee || null,
        heure_depart: rec?.heure_depart || null,
        note: rec?.note || null,
      },
      { onConflict: 'personnel_id,date_pointage' }
    );
    if (!error) reload();
  }

  async function setTime(pId: string, field: 'heure_arrivee' | 'heure_depart', value: string) {
    if (!selectedDay) return;
    const rec = recByKey.get(`${pId}_${selectedDay}`);
    let statut = rec?.statut || 'present';
    const heureArrivee = field === 'heure_arrivee' ? (value || null) : (rec?.heure_arrivee || null);
    if (heureArrivee && statut === 'present' && compareHeures(heureArrivee.slice(0, 5), config.heureEntree) > 0) statut = 'retard';
    const { error } = await supabase.from('pointages_personnel').upsert(
      {
        ecole_id: currentSchoolId, personnel_id: pId, date_pointage: selectedDay,
        statut,
        heure_arrivee: heureArrivee,
        heure_depart: field === 'heure_depart' ? (value || null) : (rec?.heure_depart || null),
        note: rec?.note || null,
      },
      { onConflict: 'personnel_id,date_pointage' }
    );
    if (!error) reload();
  }

  async function exporterBulletin(ligne: typeof salaires[number]) {
    const moisLabel = new Date(year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    await generateBulletinPaie({
      nom: ligne.p.nom, postnom: ligne.p.postnom, prenom: ligne.p.prenom,
      matricule: ligne.p.matricule, fonction: ligne.p.fonction,
      moisLabel,
      joursOuvrables: workDays.length,
      joursPresent: ligne.joursPresent,
      joursAbsent: ligne.joursAbsent,
      joursPermissionPayee: ligne.joursPermissionPayee,
      joursPermissionNonPayee: ligne.joursPermissionNonPayee,
      salaireMensuel: ligne.salaireMensuel,
      salaireJournalier: ligne.salaireJournalier,
      salaireMois: ligne.salaireMois,
      tauxChange: config.tauxChange,
    });
  }

  async function exportSalaires() {
    await generatePointageSalaireReport({
      month: m, year,
      tauxChange: config.tauxChange,
      rows: salaires.map(({ p, joursPresent, salaireMensuel, salaireJournalier, salaireMois }) => ({
        nom: p.nom, postnom: p.postnom, prenom: p.prenom, fonction: p.fonction, matricule: p.matricule,
        joursPresent, salaireMensuel, salaireJournalier, salaireMois,
      })),
    });
  }

  async function exportMonthly() {
    if (!currentSchoolId) return;
    const [y, mo] = month.split('-').map(Number);
    const start = `${y}-${String(mo).padStart(2, '0')}-01`;
    const lastDay = new Date(y, mo, 0).getDate();
    const end = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await supabase.from('pointages_personnel').select('*').eq('ecole_id', currentSchoolId).gte('date_pointage', start).lte('date_pointage', end);
    await generatePointageReport({ month: mo, year: y, personnel, pointages: (data as PointageRecord[]) || [] });
  }

  // Approbation d'une permission
  async function decidePermission(p: Permission, approuve: boolean, paye?: boolean) {
    if (!user) return;
    setPermBusy(p.id);
    const { error } = await supabase.from('permissions_personnel').update({
      statut: approuve ? 'approuvee' : 'refusee',
      paye: approuve ? (paye ?? true) : null,
      decide_par: user.id,
      decided_at: new Date().toISOString(),
    }).eq('id', p.id);
    if (!error) reload();
    setPermBusy(null);
  }

  // ─── Salaires du mois : jours présents × salaire journalier ─────────────
  // salaire journalier = salaire mensuel ÷ jours ouvrables du mois
  const salaires = useMemo(() => {
    const nbJours = workDays.length;
    return list.map(p => {
      let joursPresent = 0;
      let joursAbsent = 0;
      let joursPermissionPayee = 0;
      let joursPermissionNonPayee = 0;
      for (const d of workDays) {
        const rec = recByKey.get(`${p.id}_${d}`);
        if (!rec) {
          if (permPayeesDates.has(`${p.id}_${d}`)) { joursPermissionPayee++; joursPresent++; }
          else if (permDates.has(`${p.id}_${d}`)) { joursPermissionNonPayee++; }
          else if (d <= today) { joursAbsent++; }
          continue;
        }
        const st = (rec.statut === 'present' && rec.heure_arrivee && compareHeures(rec.heure_arrivee.slice(0, 5), config.heureEntree) > 0) ? 'retard' : rec.statut;
        if (st === 'present' || st === 'retard') joursPresent++;
        else if (st === 'absent') joursAbsent++;
        else if (st === 'permission') joursPermissionNonPayee++;
      }
      const salaireMensuel = p.salaire ?? null;
      const salaireJournalier = salaireMensuel != null && nbJours > 0 ? salaireMensuel / nbJours : null;
      const salaireMois = joursPresent > 0 && salaireJournalier != null ? joursPresent * salaireJournalier : null;
      return { p, joursPresent, joursAbsent, joursPermissionPayee, joursPermissionNonPayee, salaireMensuel, salaireJournalier, salaireMois };
    });
  }, [list, workDays, recByKey, config, permDates, permPayeesDates, today]);

  const totalSalaires = salaires.reduce((acc, x) => acc + (x.salaireMois || 0), 0);

  // ─── Alertes retards récurrents ─────────────────────────────────────────
  const retardsParMembre = useMemo(() => {
    const map = new Map<string, { nom: string; prenom: string; retards: number }>();
    const pastDays = workDays.filter(d => d <= today);
    for (const p of list) {
      let retards = 0;
      for (const d of pastDays) {
        if (cellStatus(p.id, d).statut === 'retard') retards++;
      }
      if (retards > 0) map.set(p.id, { nom: p.nom, prenom: p.prenom, retards });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, workDays, recByKey, permDates, config, today]);

  const membresAlerte = [...retardsParMembre.values()].filter(m => m.retards >= config.seuilRetards);

  const pendingPerms = permissions.filter(p => p.statut === 'en_attente');
  const permById = useMemo(() => {
    const map = new Map<string, { nom: string; prenom: string }>();
    for (const p of personnel) map.set(p.id, { nom: p.nom, prenom: p.prenom });
    return map;
  }, [personnel]);

  const timeInput = 'w-24 px-2 py-1.5 border border-slate-200 rounded-md text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function formatMontant(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} FC`;
}

function formatUSD(n: number | null | undefined, taux: number | null): string {
  if (n == null || !taux || taux <= 0) return '—';
  return `${(n / taux).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-blue-600" /> Pointage du Personnel
          </h1>
          <p className="text-gray-500 mt-1">
            Jours ouvrables (lun–ven) : toute absence de pointage = <span className="font-semibold text-red-600">absent</span>.
            Entrée {config.heureEntree} · Sortie {config.heureSortie}
            <a href="/configuration" className="inline-flex items-center gap-1 ml-2 text-blue-600 hover:underline text-sm"><Settings2 className="w-3.5 h-3.5" /> Configurer</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          <button onClick={exportSalaires} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700" title="Exporter le tableau des salaires du mois (PDF)">
            <FileDown className="w-4 h-4" /> Salaires (PDF)
          </button>
          <button onClick={exportMonthly} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            <FileDown className="w-4 h-4" /> Rapport mensuel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Présents', value: stats.present, cls: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Retards', value: stats.retard, cls: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Absents (sans pointage)', value: stats.absent, cls: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Permissions', value: stats.permission, cls: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 p-4`}>
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alertes retards récurrents */}
      {membresAlerte.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-red-700 flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5" /> Retards récurrents ({config.seuilRetards} retards ou plus ce mois)
          </h3>
          <ul className="space-y-1">
            {membresAlerte.map(m => (
              <li key={m.nom + m.prenom} className="text-sm text-red-700">
                ⚠ {m.nom} {m.prenom} — <span className="font-semibold">{m.retards} retards</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Permissions en attente (approbation IT manager / promoteur) */}
      {isApprover && pendingPerms.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5" /> Permissions en attente d'approbation ({pendingPerms.length})
          </h3>
          <p className="text-xs text-amber-700/80 mb-3">Payé = jours comptés comme présents dans le salaire du mois · Non payé = jours déduits.</p>
          <div className="space-y-2">
            {pendingPerms.map(p => {
              const m = permById.get(p.personnel_id);
              return (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">{m ? `${m.nom} ${m.prenom}` : 'Membre'}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatDatePointage(p.date_debut)} → {formatDatePointage(p.date_fin)}{p.motif ? ` — ${p.motif}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => decidePermission(p, true, true)} disabled={permBusy === p.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50" title="Les jours seront payés (comptés comme présents)">
                      <ShieldCheck className="w-3.5 h-3.5" /> Approuver (payé)
                    </button>
                    <button onClick={() => decidePermission(p, true, false)} disabled={permBusy === p.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50" title="Les jours ne seront pas payés (déduits du salaire)">
                      <ShieldCheck className="w-3.5 h-3.5" /> Approuver (non payé)
                    </button>
                    <button onClick={() => decidePermission(p, false)} disabled={permBusy === p.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                      <ShieldX className="w-3.5 h-3.5" /> Refuser
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Grille mensuelle */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Grille du mois — jours ouvrables (lun–ven)</h3>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="text-xs text-blue-600 hover:underline">← Fermer le détail du jour</button>
          )}
        </div>
        {loading || loadingPersonnel ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Clock className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 sticky left-0 bg-gray-50">Personnel</th>
                  {workDays.map(d => (
                    <th key={d} className={`px-1.5 py-2 text-center min-w-[64px] ${selectedDay === d ? 'bg-blue-50 text-blue-700' : ''}`}>
                      <button onClick={() => setSelectedDay(selectedDay === d ? null : d)} className="hover:text-blue-600">
                        {formatDatePointage(d).split(' ')[0]}<br /><span className="text-[10px] font-normal">{formatDatePointage(d).split(' ').slice(1).join(' ')}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</span>
                        {(() => { const r = retardsParMembre.get(p.id); return r && r.retards >= config.seuilRetards ? <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold" title="Retards récurrents">⚠ {r.retards}</span> : null; })()}
                      </div>
                      <div className="text-[11px] text-gray-400">{p.fonction}</div>
                    </td>
                    {workDays.map(d => {
                      const st = cellStatus(p.id, d);
                      const rec = recByKey.get(`${p.id}_${d}`);
                      const dot = st.statut ? STATUT_POINTAGE[st.statut]?.color.split(' ')[0] || 'bg-gray-200' : 'bg-transparent';
                      return (
                        <td key={d} className={`px-1.5 py-2 text-center border-l border-slate-50 ${selectedDay === d ? 'bg-blue-50/60' : ''}`}>
                          <button
                            onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                            title={`${d} — ${st.statut ? STATUT_POINTAGE[st.statut]?.label : ''}${rec && rec.heure_arrivee ? ` (${rec.heure_arrivee}→${rec.heure_depart || '…'})` : ''}`}
                            className={`w-7 h-7 rounded-full inline-flex items-center justify-center ${dot} ${st.implied ? 'opacity-40' : ''} ${st.statut ? 'ring-1 ring-black/5' : ''}`}
                          >
                            {st.statut === 'present' && <CheckCircle2 className="w-4 h-4 text-white" />}
                            {st.statut === 'retard' && <Clock className="w-4 h-4 text-white" />}
                            {st.statut === 'absent' && <XCircle className="w-4 h-4 text-white" />}
                            {st.statut === 'permission' && <UserCheck className="w-4 h-4 text-white" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div className="text-center py-12 text-gray-400">Aucun personnel.</div>}
          </div>
        )}
      </div>

      {/* ═══ Salaires du mois — jours présents × salaire journalier ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Salaires du mois — {month}</h3>
          <span className="text-xs text-gray-500">
            {workDays.length} jours ouvrables (lun–ven) · salaire journalier = salaire mensuel ÷ {workDays.length}{config.tauxChange ? ` · 1 $ = ${config.tauxChange} FC` : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Personnel</th>
                <th className="px-4 py-3 text-center">Jours présents</th>
                <th className="px-4 py-3 text-right">Salaire mensuel</th>
                <th className="px-4 py-3 text-right">Salaire journalier</th>
                <th className="px-4 py-3 text-right">Salaire du mois (FC)</th>
                <th className="px-4 py-3 text-right">Salaire du mois ($)</th>
                <th className="px-4 py-3 text-center">Bulletin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaires.map((l) => {
                const { p, joursPresent, salaireMensuel, salaireJournalier, salaireMois } = l;
                return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</div>
                    <div className="text-[11px] text-gray-400">{p.fonction}</div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${joursPresent > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{joursPresent}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{formatMontant(salaireMensuel)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{formatMontant(salaireJournalier)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-700 whitespace-nowrap">{formatMontant(salaireMois)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">{formatUSD(salaireMois, config.tauxChange)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => exporterBulletin(l)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 border border-blue-200" title="Générer le bulletin de paie PDF">Bulletin</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-2.5 font-bold text-gray-700">Total salaires du mois</td>
                <td colSpan={3} />
                <td className="px-4 py-2.5 text-right font-bold text-blue-700 whitespace-nowrap">{formatMontant(totalSalaires)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">{formatUSD(totalSalaires, config.tauxChange)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-gray-800">Détail — {formatDatePointage(selectedDay)}</h3>
            <p className="text-xs text-gray-500">Marquez le statut ou ajustez les heures. L'absence de pointage sur un jour ouvrable passé/présent est comptée « absent ».</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Arrivée</th>
                  <th className="px-4 py-3">Départ</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(p => {
                  const st = cellStatus(p.id, selectedDay);
                  const rec = recByKey.get(`${p.id}_${selectedDay}`);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</div>
                        <div className="text-xs text-gray-400">{p.matricule || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {st.statut ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_POINTAGE[st.statut]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {STATUT_POINTAGE[st.statut]?.label}{st.implied ? ' (auto)' : ''}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <input type="time" className={timeInput} value={rec?.heure_arrivee || ''} onChange={e => setTime(p.id, 'heure_arrivee', e.target.value)} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="time" className={timeInput} value={rec?.heure_depart || ''} onChange={e => setTime(p.id, 'heure_depart', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => mark(p.id, 'present')} title="Présent" className={`p-1.5 rounded-lg ${st.statut === 'present' && !st.implied ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'retard')} title="Retard" className={`p-1.5 rounded-lg ${st.statut === 'retard' && !st.implied ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}><Clock className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'absent')} title="Absent" className={`p-1.5 rounded-lg ${st.statut === 'absent' && !st.implied ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}><XCircle className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'permission')} title="Permission" className={`p-1.5 rounded-lg ${st.statut === 'permission' && !st.implied ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><UserCheck className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        {(Object.entries(STATUT_POINTAGE)).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${v.color.split(' ')[0]}`} /> {v.label}</span>
        ))}
        <span className="text-gray-400">— Pastilles estompées = statut automatique (absent sans pointage, retard selon l'heure d'entrée, permission approuvée).</span>
      </div>
    </div>
  );
}