import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { invalidateLogoCache, setUiLogoBase64 } from '../utils/pdfTheme';

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

const LOGO_CACHE_PREFIX = 'jimpro_logo_';

/** Supprime l'URL du logo en cache local pour une école donnée. */
export function clearLogoCache(schoolId: string | null | undefined) {
  if (!schoolId) return;
  try {
    localStorage.removeItem(`${LOGO_CACHE_PREFIX}${schoolId}`);
  } catch {
    /* ignore */
  }
}

function readCache(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function LogoProvider({ children }: { children: ReactNode }) {
  const { currentSchoolId } = useAuth();
  // Le logo est initialisé DEPUIS LE CACHE LOCAL : au rafraîchissement, il est
  // affiché immédiatement (base64 = data URL, jamais de perte), avant même que
  // l'auth ne soit prête. La query ne fait que rafraîchir ensuite.
  const [logoUrl, setLogoUrl] = useState<string>(() => readCache('jimpro_logo_current'));
  const [logoBase64, setLogoBase64] = useState<string | null>(() => readCache('jimpro_logo_b64_current') || null);

  const cacheKey = currentSchoolId ? `${LOGO_CACHE_PREFIX}${currentSchoolId}` : null;

  const loadBase64FromUrl = useCallback(async (url: string) => {
    if (!url) return null;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
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
    // Tant que l'école n'est pas connue (auth en cours), on ne touche à RIEN :
    // le logo initial (venu du cache) reste affiché — il n'est plus effacé.
    if (!currentSchoolId) return;

    // Cache local école : le logo reste en place même si la query échoue.
    let cached = '';
    try {
      if (cacheKey) cached = localStorage.getItem(cacheKey) || '';
    } catch {
      /* ignore */
    }
    const cachedB64 = readCache(`jimpro_logo_b64_${currentSchoolId}`);
    if (cachedB64) {
      setLogoBase64(cachedB64);
      setUiLogoBase64(cachedB64);
    }

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('ecole_id', currentSchoolId)
        .eq('key', 'logo_url')
        .maybeSingle();

      const url = data?.value || cached;
      setLogoUrl(url);
      invalidateLogoCache();
      const b64 = url ? await loadBase64FromUrl(url) : cachedB64 || null;
      setLogoBase64(b64);
      setUiLogoBase64(b64);

      try {
        if (cacheKey && data?.value) localStorage.setItem(cacheKey, data.value);
        if (data?.value) localStorage.setItem('jimpro_logo_current', data.value);
        // Cache du base64 — réutilisé par les générateurs PDF (reçu, rapports…)
        if (cacheKey && b64) localStorage.setItem(`jimpro_logo_b64_${currentSchoolId}`, b64);
        if (b64) localStorage.setItem('jimpro_logo_b64_current', b64);
        if (cacheKey && !b64) localStorage.removeItem(`jimpro_logo_b64_${currentSchoolId}`);
        if (!b64) localStorage.removeItem('jimpro_logo_b64_current');
      } catch {
        /* ignore */
      }
    } catch {
      setLogoUrl(cached || readCache('jimpro_logo_current'));
      setLogoBase64(readCache('jimpro_logo_b64_current') || null);
      setUiLogoBase64(readCache('jimpro_logo_b64_current') || null);
    }
  }, [loadBase64FromUrl, currentSchoolId, cacheKey]);

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