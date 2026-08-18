import { useState } from 'react';
import { CalendarDays, UserCheck, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { usePersonnel } from '../lib/hooks/usePersonnel';
import { usePointage, STATUT_POINTAGE, type PointageRecord } from '../lib/hooks/usePointage';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PointagePersonnel() {
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState('');
  const { personnel, loading: loadingPersonnel } = usePersonnel();
  const { pointages, save } = usePointage(date);

  const byPersonnel = new Map<string, PointageRecord>();
  for (const p of pointages) byPersonnel.set(p.personnel_id, p);

  const q = search.trim().toLowerCase();
  const list = personnel.filter(p => {
    if (!q) return true;
    return `${p.nom} ${p.postnom || ''} ${p.prenom} ${p.fonction}`.toLowerCase().includes(q);
  });

  const stats = {
    total: list.length,
    present: list.filter(p => byPersonnel.get(p.id)?.statut === 'present').length,
    retard: list.filter(p => byPersonnel.get(p.id)?.statut === 'retard').length,
    absent: list.filter(p => byPersonnel.get(p.id)?.statut === 'absent').length,
    permission: list.filter(p => byPersonnel.get(p.id)?.statut === 'permission').length,
  };

  function current(pId: string): PointageRecord | undefined {
    return byPersonnel.get(pId);
  }

  async function mark(pId: string, statut: string) {
    const cur = current(pId);
    await save({
      personnel_id: pId,
      date_pointage: date,
      statut,
      heure_arrivee: cur?.heure_arrivee || null,
      heure_depart: cur?.heure_depart || null,
      note: cur?.note || null,
    });
  }

  async function setTime(pId: string, field: 'heure_arrivee' | 'heure_depart', value: string) {
    const cur = current(pId);
    await save({
      personnel_id: pId,
      date_pointage: date,
      statut: cur?.statut || 'present',
      heure_arrivee: field === 'heure_arrivee' ? (value || null) : (cur?.heure_arrivee || null),
      heure_depart: field === 'heure_depart' ? (value || null) : (cur?.heure_depart || null),
      note: cur?.note || null,
    });
  }

  const timeInput = 'w-24 px-2 py-1.5 border border-slate-200 rounded-md text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-blue-600" /> Pointage du Personnel
          </h1>
          <p className="text-gray-500 mt-1">Présence et horaires du personnel par jour.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, cls: 'text-gray-700' },
          { label: 'Présents', value: stats.present, cls: 'text-green-600' },
          { label: 'Retards', value: stats.retard, cls: 'text-amber-600' },
          { label: 'Absents', value: stats.absent, cls: 'text-red-600' },
          { label: 'Permissions', value: stats.permission, cls: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loadingPersonnel ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Clock className="w-6 h-6 animate-spin mr-2" /> Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">Fonction</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Arrivée</th>
                  <th className="px-4 py-3">Départ</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(p => {
                  const cur = current(p.id);
                  const st = cur?.statut;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.nom} {p.postnom ? p.postnom + ' ' : ''}{p.prenom}</div>
                        <div className="text-xs text-gray-400">{p.matricule || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.fonction}</td>
                      <td className="px-4 py-3">
                        {st ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_POINTAGE[st]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {STATUT_POINTAGE[st]?.label || st}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input type="time" className={timeInput} value={cur?.heure_arrivee || ''} onChange={e => setTime(p.id, 'heure_arrivee', e.target.value)} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="time" className={timeInput} value={cur?.heure_depart || ''} onChange={e => setTime(p.id, 'heure_depart', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => mark(p.id, 'present')} title="Présent" className={`p-1.5 rounded-lg ${st === 'present' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'retard')} title="Retard" className={`p-1.5 rounded-lg ${st === 'retard' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}><Clock className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'absent')} title="Absent" className={`p-1.5 rounded-lg ${st === 'absent' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}><XCircle className="w-4 h-4" /></button>
                          <button onClick={() => mark(p.id, 'permission')} title="Permission" className={`p-1.5 rounded-lg ${st === 'permission' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><UserCheck className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length === 0 && <div className="text-center py-12 text-gray-400">Aucun personnel.</div>}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        {(Object.entries(STATUT_POINTAGE)).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${v.color.split(' ')[0]}`} /> {v.label}</span>
        ))}
        <span className="text-gray-400">— Cliquez sur une icône pour marquer le statut ; les heures s'enregistrent automatiquement.</span>
      </div>
    </div>
  );
}
