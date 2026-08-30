import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDays, UserCheck, Clock, CheckCircle2, XCircle, Search, FileDown, Settings2, ShieldCheck, ShieldX, CalendarRange, User } from 'lucide-react';
import { usePersonnel } from '../lib/hooks/usePersonnel';
import { STATUT_POINTAGE, type PointageRecord, type PointageConfig, type FonctionHeures, loadPointageConfig, loadFonctionsHeures, heuresPourFonction, compareHeures, formatDatePointage } from '../lib/hooks/usePointage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generatePointageReport } from '../utils/pointageReportGenerator';
import { formatDateTime } from '../utils/calculations';
import { generatePointageSalaireReport } from '../utils/pointageSalaireReportGenerator';
import { generateBulletinPaie } from '../utils/bulletinPaieGenerator';
import { generateFichePresence } from '../utils/presenceReportGenerator';

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

// ─────────────────────────────────────────────────────────────────────────────
// Statut « effectif » d'un membre pour une date — SOURCE UNIQUE de vérité.
// Retourne toujours le statut affiché + son origine (saisi ou déduit auto),
// pour que grille, bilan, salaires et PDF soient parfaitement cohérents.
// ─────────────────────────────────────────────────────────────────────────────
interface StatutEffectif {
  statut: string;      // '' | 'present' | 'retard' | 'absent' | 'permission'
  auto: boolean;       // true si déduit automatiquement (absent sans pointage, retard par l'heure, permission approuvée)
  rec: PointageRecord | null;
  permissionPayee: boolean; // vrai si c'est une permission approuvée PAYÉE (comptée présente pour le salaire)
}

export default function PointagePersonnel() {
  const { currentSchoolId, user, isAdmin, isItManager, isPromoteur } = useAuth();
  const isApprover = isAdmin() || isItManager() || isPromoteur();
  const { personnel, loading: loadingPersonnel } = usePersonnel();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [config, setConfig] = useState<PointageConfig>({ heureEntree: '08:00', heureSortie: '16:30', tauxChange: null, seuilRetards: 3 });
  const [fonctHeures, setFonctHeures] = useState<Map<string, FonctionHeures>>(new Map());
  const [records, setRecords] = useState<PointageRecord[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [permBusy, setPermBusy] = useState<string | null>(null);
  const [paiementsSalaires, setPaiementsSalaires] = useState<Record<string, { montant_fc: number; montant_usd: number; paye_le: string }>>({});

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
    const [cfg, fh, r, p, ps] = await Promise.all([
      loadPointageConfig(currentSchoolId),
      loadFonctionsHeures(currentSchoolId),
      supabase.from('pointages_personnel').select('*').eq('ecole_id', currentSchoolId).gte('date_pointage', start).lte('date_pointage', end),
      supabase.from('permissions_personnel').select('*').eq('ecole_id', currentSchoolId),
      supabase.from('paiements_salaires').select('*').eq('ecole_id', currentSchoolId).eq('mois', month),
    ]);
    setConfig(cfg);
    setFonctHeures(fh);
    setRecords((r.data as PointageRecord[]) || []);
    setPermissions((p.data as Permission[]) || []);
    const psMap: Record<string, { montant_fc: number; montant_usd: number; paye_le: string }> = {};
    for (const row of (ps.data || []) as any[]) psMap[row.personnel_id] = { montant_fc: Number(row.montant_fc), montant_usd: Number(row.montant_usd), paye_le: row.paye_le };
    setPaiementsSalaires(psMap);
    setLoading(false);
  }, [currentSchoolId, month]);

  useEffect(() => { reload(); }, [reload]);

  // Maps d'accès
  const recByKey = useMemo(() => {
    const map = new Map<string, PointageRecord>();
    for (const rec of records) map.set(`${rec.personnel_id}_${rec.date_pointage}`, rec);
    return map;
  }, [records]);

  // Permissions approuvées couvrant une date
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

  // Heure d'entrée effective d'un membre : celle de sa FONCTION si définie,
  // sinon l'heure globale de l'école.
  function heureEntreeMembre(p: typeof personnel[number]): string {
    return heuresPourFonction(p.fonction, fonctHeures, config).heureEntree;
  }

  // ═══ SOURCE UNIQUE : statut effectif d'un membre pour une date ═══
  function getStatutEffectif(pId: string, date: string): StatutEffectif {
    const membre = personnel.find(x => x.id === pId);
    const heureEntree = membre ? heureEntreeMembre(membre) : config.heureEntree;
    const rec = recByKey.get(`${pId}_${date}`);
    if (rec) {
      // Retard automatique si arrivée après l'heure d'entrée de la FONCTION du membre
      if (rec.statut === 'present' && rec.heure_arrivee && compareHeures(rec.heure_arrivee.slice(0, 5), heureEntree) > 0) {
        return { statut: 'retard', auto: true, rec, permissionPayee: false };
      }
      return { statut: rec.statut, auto: false, rec, permissionPayee: false };
    }
    if (permDates.has(`${pId}_${date}`)) {
      return { statut: 'permission', auto: true, rec: null, permissionPayee: permPayeesDates.has(`${pId}_${date}`) };
    }
    if (date <= today) return { statut: 'absent', auto: true, rec: null, permissionPayee: false };
    return { statut: '', auto: true, rec: null, permissionPayee: false };
  }

  // Compatibilité exports PDF (ancienne signature)
  function cellStatus(pId: string, date: string): { statut: string; implied: boolean } {
    const s = getStatutEffectif(pId, date);
    return { statut: s.statut, implied: s.auto };
  }

  const q = search.trim().toLowerCase();
  const list = personnel.filter(p => {
    if (!q) return true;
    return `${p.nom} ${p.postnom || ''} ${p.prenom} ${p.fonction}`.toLowerCase().includes(q);
  });

  // ═══ Bilan par membre : compteurs du mois + taux de présence ═══
  interface BilanMembre {
    p: typeof personnel[number];
    present: number; retard: number; absent: number;
    permissionPayee: number; permissionNonPayee: number;
    joursEcoules: number; tauxPresence: number | null;
  }
  const bilans = useMemo<BilanMembre[]>(() => {
    const pastWorkDays = workDays.filter(d => d <= today);
    return list.map(p => {
      let present = 0, retard = 0, absent = 0, permPayee = 0, permNonPayee = 0;
      for (const d of pastWorkDays) {
        const s = getStatutEffectif(p.id, d);
        if (s.statut === 'present') present++;
        else if (s.statut === 'retard') retard++;
        else if (s.statut === 'absent') absent++;
        else if (s.statut === 'permission') { if (s.permissionPayee) permPayee++; else permNonPayee++; }
      }
      const joursEcoules = pastWorkDays.length;
      const tauxPresence = joursEcoules > 0 ? Math.round(((present + retard + permPayee) / joursEcoules) * 100) : null;
      return { p, present, retard, absent, permissionPayee: permPayee, permissionNonPayee: permNonPayee, joursEcoules, tauxPresence };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, workDays, recByKey, permDates, permPayeesDates, config, today]);

  // Statistiques globales (dérivées du bilan — cohérence garantie)
  const stats = useMemo(() => {
    const s = { present: 0, retard: 0, absent: 0, permission: 0 };
    for (const b of bilans) {
      s.present += b.present;
      s.retard += b.retard;
      s.absent += b.absent;
      s.permission += b.permissionPayee + b.permissionNonPayee;
    }
    return s;
  }, [bilans]);

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
    const membre = personnel.find(x => x.id === pId);
    const heureEntree = membre ? heureEntreeMembre(membre) : config.heureEntree;
    const rec = recByKey.get(`${pId}_${selectedDay}`);
    let statut = rec?.statut || 'present';
    const heureArrivee = field === 'heure_arrivee' ? (value || null) : (rec?.heure_arrivee || null);
    if (heureArrivee && statut === 'present' && compareHeures(heureArrivee.slice(0, 5), heureEntree) > 0) statut = 'retard';
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

  async function marquerPaye(ligne: typeof salaires[number]) {
    if (!user || !currentSchoolId) return;
    if (!ligne.salaireMois) { alert('Aucun salaire calculé pour ce membre.'); return; }
    if (!confirm(`Marquer le salaire de ${ligne.p.nom} ${ligne.p.prenom} comme payé (${formatMontant(ligne.salaireMois)}) ?`)) return;
    const { error } = await supabase.from('paiements_salaires').upsert(
      {
        ecole_id: currentSchoolId, personnel_id: ligne.p.id, mois: month,
        montant_fc: Math.round(ligne.salaireMois),
        montant_usd: config.tauxChange && config.tauxChange > 0 && ligne.salaireMois != null ? Math.round((ligne.salaireMois / config.tauxChange) * 100) / 100 : 0,
        taux_change: config.tauxChange,
        jours_presents: ligne.joursPresent,
        paye_par: user.id,
        paye_le: new Date().toISOString(),
      },
      { onConflict: 'ecole_id,personnel_id,mois' }
    );
    if (!error) reload();
    else alert('Erreur : ' + error.message);
  }

  async function exporterFichePresence(p: typeof personnel[number]) {
    const moisLabel = new Date(year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    await generateFichePresence({
      membre: { id: p.id, nom: p.nom, postnom: p.postnom, prenom: p.prenom, matricule: p.matricule, fonction: p.fonction },
      moisLabel,
      workDays,
      records,
      config,
      statutDe: cellStatus,
    });
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
  // Cohérent avec getStatutEffectif : présent + retard + permission payée = jours présents.
  const salaires = useMemo(() => {
    const nbJours = workDays.length;
    return list.map(p => {
      let joursPresent = 0;
      let joursAbsent = 0;
      let joursPermissionPayee = 0;
      let joursPermissionNonPayee = 0;
      for (const d of workDays) {
        const s = getStatutEffectif(p.id, d);
        if (s.statut === 'present' || s.statut === 'retard') joursPresent++;
        else if (s.statut === 'absent') joursAbsent++;
        else if (s.statut === 'permission') { if (s.permissionPayee) { joursPermissionPayee++; joursPresent++; } else joursPermissionNonPayee++; }
      }
      const salaireMensuel = p.salaire ?? null;
      const salaireJournalier = salaireMensuel != null && nbJours > 0 ? salaireMensuel / nbJours : null;
      const salaireMois = joursPresent > 0 && salaireJournalier != null ? joursPresent * salaireJournalier : null;
      return { p, joursPresent, joursAbsent, joursPermissionPayee, joursPermissionNonPayee, salaireMensuel, salaireJournalier, salaireMois };
    });
  }, [list, workDays, recByKey, config, permDates, permPayeesDates, today]);

  const totalSalaires = salaires.reduce((acc, x) => acc + (x.salaireMois || 0), 0);

  const totalPayeFC = Object.values(paiementsSalaires).reduce((acc, p) => acc + p.montant_fc, 0);
  const totalPayeUSD = Object.values(paiementsSalaires).reduce((acc, p) => acc + p.montant_usd, 0);

  // ─── Alertes retards récurrents ─────────────────────────────────────────
  const membresAlerte = useMemo(() => {
    return bilans.filter(b => b.retard >= config.seuilRetards).map(b => ({ nom: b.p.nom, prenom: b.p.prenom, retards: b.retard }));
  }, [bilans, config.seuilRetards]);

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

// Rendu d'une pastille de statut dans la grille / bilan
function StatutChip({ statut, auto, permissionPayee, size = 'md' }: { statut: string; auto?: boolean; permissionPayee?: boolean; size?: 'sm' | 'md' }) {
  if (!statut) return <span className={`${size === 'md' ? 'w-7 h-7' : 'w-5 h-5'} inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-300`}>·</span>;
  const meta = STATUT_POINTAGE[statut] || { label: statut, color: 'bg-gray-100 text-gray-600' };
  const isPerm = statut === 'permission';
  const isPermPayee = isPerm && permissionPayee;
  const cls = meta.color.split(' ');
  return (
    <span
      title={`${meta.label}${auto ? ' (auto)' : ''}${isPerm ? (isPermPayee ? ' — payée' : ' — non payée') : ''}`}
      className={`${size === 'md' ? 'w-7 h-7 text-[10px]' : 'w-5 h-5 text-[9px]'} inline-flex items-center justify-center rounded-full font-bold ${cls[0]} ${cls[1]} ${auto ? 'ring-1 ring-inset ring-current/30 border border-current/40' : ''} ${isPerm && isPermPayee ? 'ring-2 ring-emerald-300' : ''}`}
    >
      {statut === 'present' && <CheckCircle2 className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'}`} />}
      {statut === 'retard' && <Clock className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'}`} />}
      {statut === 'absent' && <XCircle className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'}`} />}
      {statut === 'permission' && <UserCheck className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'}`} />}
    </span>
  );
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
            Jours ouvrables (lun–ven) · Entrée {config.heureEntree} · Sortie {config.heureSortie}
            {fonctHeures.size > 0 && <span className="text-gray-400"> · heures par fonction activées</span>}
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
          { label: 'Présences', value: stats.present, cls: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Retards', value: stats.retard, cls: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Absences (dont auto)', value: stats.absent, cls: 'text-red-600', bg: 'bg-red-50' },
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

      {/* ═══ BILAN PAR MEMBRE — vue synthétique et lisible ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarRange className="w-5 h-5 text-blue-600" /> Bilan du mois — {month}</h3>
          <span className="text-xs text-gray-500">{workDays.length} jours ouvrables · statuts en italique = déduits automatiquement</span>
        </div>
        {loading || loadingPersonnel ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Clock className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-50">Personnel</th>
                  <th className="px-3 py-3 text-center">Présences</th>
                  <th className="px-3 py-3 text-center">Retards</th>
                  <th className="px-3 py-3 text-center">Absences</th>
                  <th className="px-3 py-3 text-center">Perm. payées</th>
                  <th className="px-3 py-3 text-center">Perm. non payées</th>
                  <th className="px-3 py-3 w-48">Taux de présence</th>
                  <th className="px-3 py-3 text-right">Salaire du mois</th>
                  <th className="px-3 py-3 text-center">Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bilans.map(b => {
                  const paie = paiementsSalaires[b.p.id];
                  const sal = salaires.find(x => x.p.id === b.p.id);
                  return (
                    <tr key={b.p.id} className={`hover:bg-slate-50 cursor-pointer ${selectedMember === b.p.id ? 'bg-blue-50/50' : ''}`} onClick={() => { setSelectedMember(selectedMember === b.p.id ? null : b.p.id); setSelectedDay(null); }}>
                      <td className="px-4 py-2.5 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{b.p.nom} {b.p.postnom ? b.p.postnom + ' ' : ''}{b.p.prenom}</span>
                          {membresAlerte.some(x => x.nom === b.p.nom && x.prenom === b.p.prenom) && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold" title="Retards récurrents">⚠</span>}
                        </div>
                        <div className="text-[11px] text-gray-400">{b.p.fonction}{paie ? ' · ' : ''}{paie ? <span className="text-green-600 font-medium">✓ payé</span> : null}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">{b.present}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{b.retard}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">{b.absent}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">{b.permissionPayee}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{b.permissionNonPayee}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${b.tauxPresence != null && b.tauxPresence >= 80 ? 'bg-green-500' : b.tauxPresence != null && b.tauxPresence >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${b.tauxPresence ?? 0}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-10 text-right">{b.tauxPresence != null ? `${b.tauxPresence}%` : '—'}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{b.joursEcoules} jour(s) écoulé(s) — présence = P + R + perm. payée</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-blue-700 whitespace-nowrap">{sal ? formatMontant(sal.salaireMois) : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={(e) => { e.stopPropagation(); exporterFichePresence(b.p); }} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 border border-teal-200" title="Fiche de présence PDF du mois">Fiche PDF</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {bilans.length === 0 && <tbody><tr><td colSpan={9} className="text-center py-10 text-gray-400">Aucun personnel.</td></tr></tbody>}
            </table>
          </div>
        )}
      </div>

      {/* ═══ Détail jour par jour du membre sélectionné (ou grille complète) ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            {selectedMember ? (() => { const p = personnel.find(x => x.id === selectedMember); return p ? `Présence de ${p.nom} ${p.prenom} — ${month}` : 'Présence du mois'; })() : 'Grille du mois — tous les membres'}
          </h3>
          <div className="flex items-center gap-3">
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="text-xs text-blue-600 hover:underline">← Fermer le détail du jour</button>
            )}
            {selectedMember && (
              <button onClick={() => setSelectedMember(null)} className="text-xs text-blue-600 hover:underline">← Voir tous les membres</button>
            )}
          </div>
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
                    <th key={d} className={`px-1.5 py-2 text-center min-w-[52px] ${selectedDay === d ? 'bg-blue-50 text-blue-700' : ''}`}>
                      <button onClick={() => setSelectedDay(selectedDay === d ? null : d)} className="hover:text-blue-600">
                        {formatDatePointage(d).split(' ')[0]}<br /><span className="text-[10px] font-normal">{formatDatePointage(d).split(' ').slice(1).join(' ')}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedMember ? list.filter(p => p.id === selectedMember) : list).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{p.fonction}</div>
                    </td>
                    {workDays.map(d => {
                      const s = getStatutEffectif(p.id, d);
                      const rec = s.rec;
                      return (
                        <td key={d} className={`px-1.5 py-2 text-center border-l border-slate-50 ${selectedDay === d ? 'bg-blue-50/60' : ''}`}>
                          <button
                            onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                            title={`${d} — ${s.statut ? (STATUT_POINTAGE[s.statut]?.label || s.statut) + (s.auto ? ' (auto)' : '') + (s.statut === 'permission' ? (s.permissionPayee ? ' — payée' : ' — non payée') : '') : '—'}${rec && rec.heure_arrivee ? ` · ${rec.heure_arrivee.slice(0,5)}→${rec.heure_depart ? rec.heure_depart.slice(0,5) : '…'}` : ''}`}
                            className="inline-block"
                          >
                            <StatutChip statut={s.statut} auto={s.auto} permissionPayee={s.permissionPayee} />
                          </button>
                          {rec && rec.heure_arrivee && (
                            <div className="text-[9px] text-gray-400 mt-0.5 leading-none">{rec.heure_arrivee.slice(0, 5)}→{rec.heure_depart ? rec.heure_depart.slice(0, 5) : '…'}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {(selectedMember ? list.filter(p => p.id === selectedMember) : list).length === 0 && <tbody><tr><td colSpan={workDays.length + 1} className="text-center py-10 text-gray-400">Aucun personnel.</td></tr></tbody>}
            </table>
          </div>
        )}
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-gray-800">Détail — {formatDatePointage(selectedDay)}</h3>
            <p className="text-xs text-gray-500">Marquez le statut ou ajustez les heures. Un jour ouvrable passé sans pointage = <span className="font-semibold text-red-600">absent (auto)</span> ; un retard est déduit de l'heure d'arrivée si elle dépasse l'heure d'entrée de la fonction du membre (repli : {config.heureEntree}).</p>
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
                  const s = getStatutEffectif(p.id, selectedDay);
                  const rec = s.rec;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</div>
                        <div className="text-xs text-gray-400">{p.matricule || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {s.statut ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_POINTAGE[s.statut]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {STATUT_POINTAGE[s.statut]?.label}{s.auto ? ' (auto)' : ''}{s.statut === 'permission' && s.permissionPayee ? ' — payée' : ''}
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
                          <button onClick={() => mark(p.id, 'present')} title="Présent" className={`p-1.5 rounded-lg ${s.statut === 'present' && !s.auto ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'retard')} title="Retard" className={`p-1.5 rounded-lg ${s.statut === 'retard' && !s.auto ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}><Clock className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'absent')} title="Absent" className={`p-1.5 rounded-lg ${s.statut === 'absent' && !s.auto ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}><XCircle className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'permission')} title="Permission" className={`p-1.5 rounded-lg ${s.statut === 'permission' && !s.auto ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><UserCheck className="w-4 h-4" /></button>
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
                <th className="px-4 py-3 text-center">Paie</th>
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
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => exporterBulletin(l)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 border border-blue-200" title="Générer le bulletin de paie PDF">Bulletin</button>
                      <button onClick={() => exporterFichePresence(l.p)} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 border border-teal-200" title="Fiche de présence PDF du mois">Fiche</button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {paiementsSalaires[l.p.id] ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold" title={`Payé le ${formatDateTime(paiementsSalaires[l.p.id].paye_le)}`}>✓ Payé</span>
                    ) : (
                      <button onClick={() => marquerPaye(l)} disabled={!l.salaireMois} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40" title="Enregistrer le paiement du salaire">Marquer payé</button>
                    )}
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

      {/* ═══ Historique des salaires payés du mois ═══ */}
      {Object.keys(paiementsSalaires).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
            <span>Salaires payés — {month}</span>
            <span className="text-sm font-semibold text-emerald-700">{Object.keys(paiementsSalaires).length} membre(s) · {formatMontant(totalPayeFC)}{totalPayeUSD > 0 ? ` (${totalPayeUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$)` : ''}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {salaires.filter(x => paiementsSalaires[x.p.id]).map(x => (
              <span key={x.p.id} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs text-gray-700">
                ✓ {x.p.nom} {x.p.prenom} — <span className="font-semibold text-green-700">{formatMontant(paiementsSalaires[x.p.id].montant_fc)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        {(Object.entries(STATUT_POINTAGE)).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${v.color.split(' ')[0]}`} /> {v.label}</span>
        ))}
        <span className="text-gray-400">— Anneau = statut déduit automatiquement (absent sans pointage, retard selon l'heure d'entrée, permission approuvée). Permissions payées = comptées comme présentes.</span>
      </div>
    </div>
  );
}
