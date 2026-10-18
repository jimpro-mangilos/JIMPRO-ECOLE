import { useEffect, useMemo, useState } from 'react';
import { MonitorSmartphone, CheckCircle2, Ban, Trash2, Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserDevice {
  id: string;
  ecole_id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  status: string;
  last_seen_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface UserInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Approuvé', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  blocked: { label: 'Bloqué', cls: 'bg-red-100 text-red-700' },
};

function formatDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Gestion des appareils de confiance.
 * Affiche le nombre d'appareils par compte et permet à l'IT Manager
 * d'approuver / bloquer / révoquer un appareil.
 */
export default function GestionAppareils() {
  const { currentSchoolId, user } = useAuth();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!currentSchoolId) return;
    setLoading(true);
    const [d, u] = await Promise.all([
      supabase.from('user_devices').select('*').eq('ecole_id', currentSchoolId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nom, prenom, email').eq('ecole_id', currentSchoolId).order('nom'),
    ]);
    if (d.error) toast.error(d.error.message || 'Erreur lors du chargement des appareils');
    else setDevices((d.data as UserDevice[]) || []);
    if (u.error) toast.error(u.error.message || 'Erreur lors du chargement des utilisateurs');
    else setUsers((u.data as UserInfo[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentSchoolId]);

  const userById = useMemo(() => {
    const m = new Map<string, UserInfo>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const stats = useMemo(() => {
    const byUser = new Map<string, number>();
    let pending = 0;
    let blocked = 0;
    for (const d of devices) {
      byUser.set(d.user_id, (byUser.get(d.user_id) || 0) + 1);
      if (d.status === 'pending') pending++;
      else if (d.status === 'blocked') blocked++;
    }
    return { total: devices.length, usersWithDevices: byUser.size, pending, blocked, byUser };
  }, [devices]);

  const setStatus = async (d: UserDevice, status: 'approved' | 'blocked') => {
    setBusyId(d.id);
    const { error } = await supabase.from('user_devices').update({
      status,
      approved_by: status === 'approved' ? (user?.id || null) : null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    }).eq('id', d.id);
    setBusyId(null);
    if (error) { toast.error(error.message || 'Erreur lors de la mise à jour'); return; }
    toast.success(status === 'approved' ? 'Appareil approuvé' : 'Appareil bloqué');
    load();
  };

  const remove = async (d: UserDevice) => {
    if (!window.confirm("Révoquer cet appareil ? L'utilisateur devra le faire ré-approuver pour le réutiliser.")) return;
    setBusyId(d.id);
    const { error } = await supabase.from('user_devices').delete().eq('id', d.id);
    setBusyId(null);
    if (error) { toast.error(error.message || 'Erreur lors de la révocation'); return; }
    toast.success('Appareil révoqué');
    load();
  };

  const cardCls = 'rounded-xl border border-slate-100 p-4';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-blue-600" /> Appareils connectés
        </h2>
        <span className="text-xs text-gray-500">
          {stats.total} appareil{stats.total > 1 ? 's' : ''} · {stats.usersWithDevices} compte{stats.usersWithDevices > 1 ? 's' : ''} · {stats.pending} en attente
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className={cardCls}>
            <div className="text-sm text-gray-500">Appareils connectés</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className={cardCls}>
            <div className="text-sm text-gray-500">Comptes concernés</div>
            <div className="text-2xl font-bold text-gray-800">{stats.usersWithDevices}</div>
          </div>
          <div className={cardCls + ' bg-amber-50'}>
            <div className="text-sm text-gray-500">En attente d'approbation</div>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </div>
          <div className={cardCls + ' bg-red-50'}>
            <div className="text-sm text-gray-500">Bloqués</div>
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucun appareil enregistré pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-3">Utilisateur</th>
                  <th className="px-3 py-3">Appareil</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Dernière activité</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map(d => {
                  const u = userById.get(d.user_id);
                  const meta = STATUS_META[d.status] || { label: d.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-900">{u ? (u.nom + ' ' + u.prenom) : 'Utilisateur supprimé'}</div>
                        <div className="text-[11px] text-gray-400">{u?.email}</div>
                        <div className="text-[11px] text-gray-400">{stats.byUser.get(d.user_id) || 0} appareil(s) au total</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-gray-800">{d.device_name || 'Appareil inconnu'}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[220px]" title={d.user_agent || ''}>{d.user_agent || ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={'px-2 py-1 rounded-full text-xs font-medium ' + meta.cls}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(d.last_seen_at)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.status !== 'approved' && (
                            <button
                              onClick={() => setStatus(d, 'approved')}
                              disabled={busyId === d.id}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                              title="Approuver cet appareil"
                            >
                              {busyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          {d.status !== 'blocked' && (
                            <button
                              onClick={() => setStatus(d, 'blocked')}
                              disabled={busyId === d.id}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                              title="Bloquer cet appareil"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => remove(d)}
                            disabled={busyId === d.id}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            title="Révoquer (supprimer) cet appareil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
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
