import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserCheck, Clock, Search, FileDown, CalendarDays, CalendarRange, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { loadPointageConfig, compareHeures, formatDatePointage, type PointageConfig } from '../lib/hooks/usePointage';
import { generatePointageElevesReport, type PointageEleveRecord } from '../utils/pointageElevesReportGenerator';

interface EleveLigne {
  id: string;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  section: string;
  classe: string | null;
}

interface StatutJour {
  statut: string;   // '' | 'present' | 'retard' | 'absent'
  auto: boolean;
  rec: PointageEleveRecord | null;
}

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function workingDaysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day >= 1 && day <= 5) {
      days.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    }
  }
  return days;
}

const STATUT_LABEL: Record<string, string> = { present: 'Présent', retard: 'Retard', absent: 'Absent' };

export default function PointageEleves() {
  const { currentSchoolId } = useAuth();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [config, setConfig] = useState<PointageConfig>({ heureEntree: '08:00', heureSortie: '16:30', tauxChange: null, seuilRetards: 3 });
  const [eleves, setEleves] = useState<EleveLigne[]>([]);
  const [records, setRecords] = useState<PointageEleveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const today = todayStr();
  const [year, m] = month.split('-').map(Number);
  const workDays = useMemo(() => workingDaysOfMonth(year, m), [year, m]);

  const recByKey = useMemo(() => {
    const map = new Map<string, PointageEleveRecord>();
    for (const r of records) map.set(r.eleve_id + '_' + r.date_pointage, r);
    return map;
  }, [records]);

  const reload = useCallback(async () => {
    if (!currentSchoolId) return;
    setLoading(true);
    try {
      const [y, mo] = month.split('-').map(Number);
      const start = y + '-' + String(mo).padStart(2, '0') + '-01';
      const lastDay = new Date(y, mo, 0).getDate();
      const end = y + '-' + String(mo).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
      const [cfg, r] = await Promise.all([
        loadPointageConfig(currentSchoolId),
        supabase.from('pointages_eleves').select('*').eq('ecole_id', currentSchoolId).gte('date_pointage', start).lte('date_pointage', end),
      ]);
      setConfig(cfg);
      setRecords((r.data as PointageEleveRecord[]) || []);
      // Élèves (pagination 1000)
      const all: EleveLigne[] = [];
      let from = 0;
      while (true) {
        const to = from + 999;
        const { data } = await supabase
          .from('eleves')
          .select('id, matricule, nom, postnom, prenom, section, classe')
          .eq('ecole_id', currentSchoolId)
          .order('nom')
          .range(from, to);
        if (!data || data.length === 0) break;
        for (const e of data) all.push({ id: e.id, matricule: e.matricule, nom: e.nom, postnom: e.postnom, prenom: e.prenom, section: e.section, classe: e.classe });
        if (data.length < 1000) break;
        from += 1000;
      }
      setEleves(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchoolId, month]);

  useEffect(() => { reload(); }, [reload]);

  // ═══ Statut effectif d'un élève pour une date (source unique) ═══
  function getStatutJour(eleveId: string, date: string): StatutJour {
    const rec = recByKey.get(eleveId + '_' + date);
    if (rec) {
      if (rec.statut === 'present' && rec.heure_arrivee && compareHeures(rec.heure_arrivee.slice(0, 5), config.heureEntree) > 0) {
        return { statut: 'retard', auto: true, rec };
      }
      return { statut: rec.statut, auto: false, rec };
    }
    if (date <= today) return { statut: 'absent', auto: true, rec: null };
    return { statut: '', auto: true, rec: null };
  }

  const q = search.trim().toLowerCase();
  const list = eleves.filter(e => {
    if (!q) return true;
    return (e.nom + ' ' + (e.postnom || '') + ' ' + e.prenom + ' ' + e.matricule + ' ' + e.section).toLowerCase().includes(q);
  });

  // ═══ Bilan par élève ═══
  interface Bilan {
    e: EleveLigne;
    present: number;
    retard: number;
    absent: number;
    joursEcoules: number;
    tauxPresence: number | null;
  }
  const bilans = useMemo<Bilan[]>(() => {
    const pastWorkDays = workDays.filter(d => d <= today);
    return list.map(e => {
      let present = 0, retard = 0, absent = 0;
      for (const d of pastWorkDays) {
        const s = getStatutJour(e.id, d);
        if (s.statut === 'present') present++;
        else if (s.statut === 'retard') retard++;
        else if (s.statut === 'absent') absent++;
      }
      const joursEcoules = pastWorkDays.length;
      const tauxPresence = joursEcoules > 0 ? Math.round(((present + retard) / joursEcoules) * 100) : null;
      return { e, present, retard, absent, joursEcoules, tauxPresence };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, workDays, recByKey, config, today]);

  const stats = useMemo(() => {
    const s = { present: 0, retard: 0, absent: 0 };
    for (const b of bilans) {
      s.present += b.present;
      s.retard += b.retard;
      s.absent += b.absent;
    }
    return s;
  }, [bilans]);

  async function mark(eleveId: string, statut: string, date: string) {
    if (!currentSchoolId) return;
    setBusy(eleveId + '_' + date);
    const rec = recByKey.get(eleveId + '_' + date);
    const { error } = await supabase.from('pointages_eleves').upsert({
      ecole_id: currentSchoolId, eleve_id: eleveId, date_pointage: date,
      statut,
      heure_arrivee: rec?.heure_arrivee || null,
      heure_depart: rec?.heure_depart || null,
      note: rec?.note || null,
    }, { onConflict: 'eleve_id,date_pointage' });
    if (error) console.error(error);
    setBusy(null);
    reload();
  }

  async function setTime(eleveId: string, field: 'heure_arrivee' | 'heure_depart', value: string, date: string) {
    if (!currentSchoolId) return;
    setBusy(eleveId + '_' + date);
    const rec = recByKey.get(eleveId + '_' + date);
    let statut = rec?.statut || 'present';
    const heureArrivee = field === 'heure_arrivee' ? (value || null) : (rec?.heure_arrivee || null);
    if (heureArrivee && statut === 'present' && compareHeures(heureArrivee.slice(0, 5), config.heureEntree) > 0) statut = 'retard';
    const { error } = await supabase.from('pointages_eleves').upsert({
      ecole_id: currentSchoolId, eleve_id: eleveId, date_pointage: date,
      statut,
      heure_arrivee: heureArrivee,
      heure_depart: field === 'heure_depart' ? (value || null) : (rec?.heure_depart || null),
      note: rec?.note || null,
    }, { onConflict: 'eleve_id,date_pointage' });
    if (error) console.error(error);
    setBusy(null);
    reload();
  }

  async function exportMonthly() {
    if (!currentSchoolId) return;
    await generatePointageElevesReport({ month: m, year, eleves: list, pointages: records, heureEntree: config.heureEntree });
  }

  function cellBadge(s: StatutJour) {
    if (s.statut === 'present') return <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">P</span>;
    if (s.statut === 'retard') return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">R</span>;
    if (s.statut === 'absent') return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">A</span>;
    return <span className="text-gray-300 text-[10px]">·</span>;
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-blue-600" /> Pointage des Élèves
          </h1>
          <p className="text-gray-500 mt-1">
            Jours ouvrables (lun–ven) · Entrée {config.heureEntree}
            <a href="/portail-pointage-eleves" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-3 text-blue-600 hover:underline text-sm">Ouvrir le portail de pointage ↗</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          <button onClick={exportMonthly} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            <FileDown className="w-4 h-4" /> Rapport mensuel (PDF)
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Présences', value: stats.present, cls: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Retards', value: stats.retard, cls: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Absences (dont auto)', value: stats.absent, cls: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Élèves', value: eleves.length, cls: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={s.bg + ' rounded-xl border border-slate-100 p-4'}>
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className={'text-2xl font-bold ' + s.cls}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un élève (nom, matricule, section)..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* ═══ BILAN PAR ÉLÈVE ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarRange className="w-5 h-5 text-blue-600" /> Bilan du mois — {month}</h3>
          <span className="text-xs text-gray-500">{workDays.length} jours ouvrables · statuts en italique = déduits automatiquement</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Clock className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-50">Élève</th>
                  <th className="px-3 py-3 text-center">Présences</th>
                  <th className="px-3 py-3 text-center">Retards</th>
                  <th className="px-3 py-3 text-center">Absences</th>
                  <th className="px-3 py-3 w-56">Taux de présence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bilans.map(b => (
                  <tr key={b.e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{b.e.nom} {b.e.postnom ? b.e.postnom + ' ' : ''}{b.e.prenom}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{b.e.matricule} · {b.e.section}{b.e.classe ? ' · Classe ' + b.e.classe : ''}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">{b.present}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{b.retard}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">{b.absent}</span></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={'h-full rounded-full ' + (b.tauxPresence != null && b.tauxPresence >= 80 ? 'bg-green-500' : b.tauxPresence != null && b.tauxPresence >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: (b.tauxPresence ?? 0) + '%' }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-10 text-right">{b.tauxPresence != null ? b.tauxPresence + '%' : '—'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{b.joursEcoules} jour(s) écoulé(s) — présence = P + R</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {bilans.length === 0 && <tbody><tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun élève.</td></tr></tbody>}
            </table>
          </div>
        )}
      </div>

      {/* ═══ GRILLE DU MOIS ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Grille du mois — {month}</h3>
          <span className="text-xs text-gray-500">Cliquez sur un jour pour corriger le pointage</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Clock className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-50">Élève</th>
                  {workDays.map(d => (
                    <th key={d} className="px-1.5 py-2 text-center">
                      <button
                        onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                        className={'px-1 py-0.5 rounded text-[10px] font-bold ' + (selectedDay === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-blue-50')}
                        title={formatDatePointage(d)}
                      >
                        {Number(d.slice(8, 10))}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-1.5 sticky left-0 bg-white whitespace-nowrap">
                      <span className="font-medium text-gray-800">{e.nom} {e.prenom}</span>
                      <span className="text-[10px] text-gray-400 ml-1">{e.matricule}</span>
                    </td>
                    {workDays.map(d => (
                      <td key={d} className="px-1 py-1.5 text-center">
                        {cellBadge(getStatutJour(e.id, d))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {list.length === 0 && <tbody><tr><td colSpan={workDays.length + 1} className="text-center py-10 text-gray-400">Aucun élève.</td></tr></tbody>}
            </table>
          </div>
        )}
      </div>

      {/* ═══ DÉTAIL DU JOUR SÉLECTIONNÉ — corrections ═══ */}
      {selectedDay && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" /> Détail du {formatDatePointage(selectedDay)}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Heure d'entrée : {config.heureEntree} — après = Retard</span>
              <button onClick={() => setSelectedDay(null)} className="text-xs text-blue-600 hover:underline">← Fermer</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-3 py-3 text-center">Statut</th>
                  <th className="px-3 py-3 text-center">Arrivée</th>
                  <th className="px-3 py-3 text-center">Départ</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(e => {
                  const s = getStatutJour(e.id, selectedDay);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <span className="font-semibold text-gray-900">{e.nom} {e.postnom ? e.postnom + ' ' : ''}{e.prenom}</span>
                        <span className="text-[11px] text-gray-400 ml-2">{e.matricule} · {e.section}{e.classe ? ' · Classe ' + e.classe : ''}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.rec ? (
                          <span className={'px-2 py-0.5 rounded-full text-xs font-bold ' + (s.statut === 'present' ? 'bg-green-100 text-green-700' : s.statut === 'retard' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                            {STATUT_LABEL[s.statut] || s.statut}
                            {s.auto && <em className="text-[10px] opacity-70 ml-1">(auto)</em>}
                          </span>
                        ) : s.statut === 'absent' ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-400 text-xs italic">Absent (auto)</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="time" defaultValue={s.rec?.heure_arrivee?.slice(0, 5) || ''} onBlur={e2 => { if (e2.target.value) setTime(e.id, 'heure_arrivee', e2.target.value, selectedDay); }} className="px-2 py-1 border border-slate-200 rounded text-xs" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="time" defaultValue={s.rec?.heure_depart?.slice(0, 5) || ''} onBlur={e2 => { if (e2.target.value) setTime(e.id, 'heure_depart', e2.target.value, selectedDay); }} className="px-2 py-1 border border-slate-200 rounded text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          {(['present', 'retard', 'absent'] as const).map(st => (
                            <button key={st} onClick={() => mark(e.id, st, selectedDay)} disabled={busy === e.id + '_' + selectedDay} className={'px-2 py-1 rounded-lg text-[11px] font-semibold border disabled:opacity-40 ' + (s.statut === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-slate-200 hover:bg-slate-50')}>
                              {STATUT_LABEL[st]}
                            </button>
                          ))}
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
    </div>
  );
}
