import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { invalidateLogoCache } from '../utils/pdfTheme';

interface LogoContextType {
  logoUrl: string;
  logoBase64: string | null;
  refreshLogo: () => Promise<void>;
}

const DEFAULT_LOGO = '';

const LogoContext = createContext<LogoContextType>({
  logoUrl: DEFAULT_LOGO,
  logoBase64: null,
  refreshLogo: async () => {},
});

export function LogoProvider({ children }: { children: ReactNode }) {
  const { currentSchoolId } = useAuth();
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const loadBase64FromUrl = useCallback(async (url: string) => {
    if (!url) return null;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, []);

  const refreshLogo = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('ecole_id', currentSchoolId)
        .eq('key', 'logo_url')
        .maybeSingle();

      const url = data?.value || '';
      setLogoUrl(url);
      invalidateLogoCache();
      setLogoBase64(url ? await loadBase64FromUrl(url) : null);
    } catch {
      setLogoUrl('');
      setLogoBase64(null);
    }
  }, [loadBase64FromUrl, currentSchoolId]);

  useEffect(() => {
    refreshLogo();
  }, [refreshLogo]);

  return (
    <LogoContext.Provider value={{ logoUrl, logoBase64, refreshLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  return useContext(LogoContext);
}
