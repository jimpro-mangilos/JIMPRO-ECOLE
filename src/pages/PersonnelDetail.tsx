import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Loader2, Phone, Mail, MapPin, CalendarDays, UserCog, Users, GraduationCap, Banknote, Baby, Heart, Flag, BadgeCheck, Briefcase, ClipboardList,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateCarteService } from '../utils/carteServiceGenerator';
import { formatDate, calculerAnciennete } from '../utils/calculations';
import type { PersonnelRecord } from '../lib/hooks/usePersonnel';
import { STATUT_PERSONNEL_LABELS, STATUT_PERSONNEL_COLORS } from '../lib/hooks/usePersonnel';
import { STATUT_POINTAGE, type PointageRecord } from '../lib/hooks/usePointage';

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5"><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function PersonnelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<PersonnelRecord | null>(null);
  const [niveaux, setNiveaux] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [pointages, setPointages] = useState<PointageRecord[]>([]);
  const [pointagesLoading, setPointagesLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).from('personnel').select('*').eq('id', id).maybeSingle();
      if (!cancelled) {
        if (error || !data) setNotFound(true);
        else {
          setMember(data as PersonnelRecord);
          // libellés des niveaux d'étude
          const { data: niveauxData } = await (supabase as any).from('niveaux_etude').select('id, libelle');
          if (niveauxData) {
            const map: Record<string, string> = {};
            niveauxData.forEach((n: any) => { map[n.id] = n.libelle; });
            setNiveaux(map);
          }
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handlePrint() {
    if (!member) return;
    setPrinting(true);
    try {
      await generateCarteService(member);
    } catch (e) {
      alert('Erreur lors de la génération de la carte de service.');
    } finally {
      setPrinting(false);
    }
  }

  // ─── Pointage / liste de présence du membre ───────────────────────────
  useEffect(() => {
    if (!member?.id) return;
    let cancelled = false;
    (async () => {
      setPointagesLoading(true);
      const { data } = await (supabase as any)
        .from('pointages_personnel')
        .select('*')
        .eq('personnel_id', member.id)
        .order('date_pointage', { ascending: false })
        .limit(60);
      if (!cancelled) setPointages((data as PointageRecord[]) || []);
      if (!cancelled) setPointagesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [member?.id]);

  const pointageStats = useMemo(() => {
    const stats = { total: pointages.length, present: 0, retard: 0, absent: 0, permission: 0 };
    pointages.forEach(p => {
      if (p.statut === 'present') stats.present++;
      else if (p.statut === 'retard') stats.retard++;
      else if (p.statut === 'absent') stats.absent++;
      else if (p.statut === 'permission') stats.permission++;
    });
    return stats;
  }, [pointages]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Membre introuvable</h2>
          <p className="text-gray-500 mb-6">Ce membre du personnel n'existe pas ou a été supprimé.</p>
          <button onClick={() => navigate('/personnel')} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Retour à la liste</button>
        </div>
      </div>
    );
  }

  const nomComplet = `${member.nom} ${member.postnom ? member.postnom + ' ' : ''}${member.prenom}`;
  const statutColor = STATUT_PERSONNEL_COLORS[member.statut] || 'bg-gray-100 text-gray-600';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/personnel')} className="p-2 rounded-lg bg-white border border-slate-200 text-gray-500 hover:text-gray-800 hover:border-slate-300" title="Retour à la liste">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-7 h-7 text-blue-600" /> Fiche du personnel
            </h1>
            <p className="text-gray-500 mt-1">Détails et carte de service de {nomComplet}.</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-semibold shadow-sm disabled:opacity-50 transition-colors"
        >
          {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
          {printing ? 'Génération...' : 'Générer la carte'}
        </button>
      </div>

      {/* Carte profil */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {member.photo_url ? (
            <img src={member.photo_url} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg ring-1 ring-slate-200" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-blue-50 border-4 border-white shadow-lg ring-1 ring-slate-200 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-700">{(member.nom.charAt(0) + member.prenom.charAt(0)).toUpperCase()}</span>
            </div>
          )}
          <div className="text-center sm:text-left flex-1">
            <div className="text-2xl font-bold text-gray-900">{member.nom.toUpperCase()}{member.postnom ? ' ' + member.postnom.toUpperCase() : ''}</div>
            <div className="text-lg text-gray-600 mt-0.5">{member.prenom}</div>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 uppercase tracking-wide">{member.fonction}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColor}`}>{STATUT_PERSONNEL_LABELS[member.statut] || member.statut}</span>
            </div>
            <div className="mt-2 text-sm text-gray-400">{member.matricule || '—'}</div>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Info icon={BadgeCheck} label="Matricule" value={member.matricule || '—'} />
        <Info icon={Phone} label="Téléphone" value={member.telephone || '—'} />
        <Info icon={Mail} label="E-mail" value={member.email || '—'} />
        <Info icon={MapPin} label="Adresse" value={member.adresse || '—'} />
        <Info icon={Flag} label="Nationalité" value={member.nationalite || '—'} />
        <Info icon={CalendarDays} label="Naissance" value={member.date_naissance ? formatDate(member.date_naissance) : '—'} />
        <Info icon={CalendarDays} label="Embauche" value={member.date_embauche ? formatDate(member.date_embauche) : '—'} />
        <Info icon={Users} label="Sexe" value={member.sexe || '—'} />
        <Info icon={Heart} label="État civil" value={member.etat_civil || '—'} />
        <Info icon={Baby} label="Enfants" value={member.nombre_enfants != null ? String(member.nombre_enfants) : '—'} />
        <Info icon={GraduationCap} label="Niveau d'étude" value={member.niveau_etude_id ? (niveaux[member.niveau_etude_id] || '—') : '—'} />
        <Info icon={Banknote} label="Salaire" value={member.salaire != null ? `${Number(member.salaire).toLocaleString('fr-FR')} FC` : '—'} />
        <Info icon={Briefcase} label="Domaine" value={member.domaine || '—'} />
        <Info icon={CalendarDays} label="Ancienneté" value={member.date_embauche ? calculerAnciennete(member.date_embauche) : '—'} />
      </div>

      {/* ═══ Présence / Pointage — référence à la liste de présence ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" /> Présence / Pointage
          </h2>
          <button
            onClick={() => navigate('/pointage')}
            className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            Voir le pointage complet <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Jours pointés', value: pointageStats.total, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Présents', value: pointageStats.present, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Retards', value: pointageStats.retard, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Absents', value: pointageStats.absent, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Permissions', value: pointageStats.permission, color: 'text-blue-700', bg: 'bg-blue-50' },
          ].map(st => (
            <div key={st.label} className={`${st.bg} rounded-xl p-3 text-center border border-slate-100`}>
              <div className={`text-xl font-bold ${st.color}`}>{st.value}</div>
              <div className="text-[11px] font-medium text-gray-500 mt-0.5">{st.label}</div>
            </div>
          ))}
        </div>

        {/* Historique récent */}
        {pointagesLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Chargement du pointage...
          </div>
        ) : pointages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-slate-200 rounded-xl">
            Aucun pointage enregistré pour ce membre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Arrivée</th>
                  <th className="px-3 py-2">Départ</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pointages.slice(0, 15).map(p => {
                  const st = STATUT_POINTAGE[p.statut] || { label: p.statut, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDate(p.date_pointage)}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                      <td className="px-3 py-2 text-gray-600">{p.heure_arrivee || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{p.heure_depart || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{p.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pointages.length > 15 && (
              <p className="text-xs text-gray-400 text-center mt-3">… et {pointages.length - 15} autres jours (voir le pointage complet).</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}