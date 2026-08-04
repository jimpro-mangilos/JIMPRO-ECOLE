import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export interface MenuConfigItem {
  id: string;
  menu_key: string;
  label: string;
  is_visible: boolean;
  ordre: number;
}

export function useMenuConfig(roleId: string | undefined) {
  const [menuItems, setMenuItems] = useState<MenuConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleId) {
      setMenuItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadConfig() {
      const { data, error } = await supabase
        .from('menu_visibility')
        .select('id, menu_key, label, is_visible, ordre')
        .eq('role_id', roleId)
        .order('ordre', { ascending: true });

      if (!cancelled) {
        if (error || !data || data.length === 0) {
          setMenuItems([]);
        } else {
          setMenuItems(data);
        }
        setLoading(false);
      }
    }

    loadConfig();

    const channel = supabase
      .channel(`menu-config:${roleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_visibility', filter: `role_id=eq.${roleId}` },
        () => { loadConfig(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roleId]);

  return { menuItems, loading };
}
