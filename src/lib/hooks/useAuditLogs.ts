import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryKeys } from '../queryKeys';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_data: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_data: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
  ecole_id: string | null;
}

export interface AuditFilters {
  tableName: string; // 'all' | 'paiements' | 'compte_courant' | 'eleves'
  action: string;    // 'all' | 'INSERT' | 'UPDATE' | 'DELETE'
  search: string;
}

/**
 * Lit le journal d'audit (table audit_logs) — réservé admin / it_manager
 * (la politique RLS filtre déjà les autres rôles → résultat vide).
 */
export function useAuditLogs(filters: AuditFilters) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKeys.auditLogs.all, filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(300);

      if (filters.tableName && filters.tableName !== 'all') {
        q = q.eq('table_name', filters.tableName);
      }
      if (filters.action && filters.action !== 'all') {
        q = q.eq('action', filters.action);
      }

      const s = (filters.search || '').trim().replace(/[%,()']/g, '');
      if (s) {
        q = q.or(
          'old_data->>numero_recu.ilike.%' + s + '%,' +
          'new_data->>numero_recu.ilike.%' + s + '%,' +
          'old_data->>matricule.ilike.%' + s + '%,' +
          'new_data->>matricule.ilike.%' + s + '%,' +
          'old_data->>nom_eleve.ilike.%' + s + '%,' +
          'new_data->>nom_eleve.ilike.%' + s + '%,' +
          'old_data->>nom.ilike.%' + s + '%,' +
          'new_data->>nom.ilike.%' + s + '%,' +
          'old_data->>prenom.ilike.%' + s + '%,' +
          'new_data->>prenom.ilike.%' + s + '%,' +
          'old_data->>postnom.ilike.%' + s + '%,' +
          'new_data->>postnom.ilike.%' + s + '%,' +
          'old_data->>classe.ilike.%' + s + '%,' +
          'new_data->>classe.ilike.%' + s + '%'
        );
      }

      const { data: logs, error } = await q;
      if (error) throw error;
      const rows = (logs ?? []) as AuditLog[];

      // Résoudre les noms des auteurs (changed_by → profiles)
      const ids = Array.from(new Set(rows.map((l) => l.changed_by).filter(Boolean))) as string[];
      const nameMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', ids);
        for (const p of (profs ?? [])) {
          nameMap.set(p.id, `${p.nom || ''} ${p.prenom || ''}`.trim() || p.id);
        }
      }
      return { rows, nameMap };
    },
    staleTime: 30_000,
  });

  return {
    logs: data?.rows ?? [],
    nameMap: data?.nameMap ?? new Map<string, string>(),
    isLoading,
    isFetching,
  };
}
