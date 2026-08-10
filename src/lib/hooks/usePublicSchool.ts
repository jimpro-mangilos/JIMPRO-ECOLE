import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';

const STORAGE_KEY = 'jimpro_public_school';

interface PublicSchool {
  schoolId: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  loading: boolean;
  error: string | null;
  /** Change l'école (met à jour l'URL et le sessionStorage) */
  setSchoolCode: (code: string) => void;
}

/**
 * Hook pour les portails publics (anon).
 * Lit le code école depuis ?ecole=CODE dans l'URL.
 * Résout le code en ecole_id via la table ecoles.
 * Persiste dans sessionStorage pour les navigations futures.
 */
export function usePublicSchool(): PublicSchool {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolCode, setSchoolCodeState] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Résoudre le code école → UUID
  const resolveSchool = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('ecoles')
        .select('id, nom, code')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        setSchoolId(data.id);
        setSchoolCodeState(data.code);
        setSchoolName(data.nom);
        // Persister dans sessionStorage
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            id: data.id, code: data.code, nom: data.nom
          }));
        } catch { /* ignore */ }
      } else {
        setError(`École "${code}" introuvable`);
        setSchoolId(null);
        setSchoolCodeState(null);
        setSchoolName(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'école');
      setSchoolId(null);
      setSchoolCodeState(null);
      setSchoolName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Essayer ?ecole=CODE dans l'URL
    const urlCode = searchParams.get('ecole');
    if (urlCode) {
      resolveSchool(urlCode);
      return;
    }

    // 2. Essayer sessionStorage
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id && parsed.code) {
          setSchoolId(parsed.id);
          setSchoolCodeState(parsed.code);
          setSchoolName(parsed.nom || null);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    // 3. Pas d'école trouvée → résoudre automatiquement la première école active
    (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('ecoles')
          .select('id, nom, code')
          .eq('is_active', true)
          .order('nom')
          .limit(1)
          .maybeSingle();
        if (!queryError && data) {
          setSchoolId(data.id);
          setSchoolCodeState(data.code);
          setSchoolName(data.nom);
          setSearchParams({ ecole: data.code });
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
              id: data.id, code: data.code, nom: data.nom
            }));
          } catch { /* ignore */ }
        } else {
          setError('Aucune école trouvée. Contactez l\'administrateur.');
        }
      } catch {
        setError('Erreur lors du chargement des écoles.');
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, resolveSchool, setSearchParams]);

  const setSchoolCode = useCallback((code: string) => {
    // Mettre à jour l'URL
    setSearchParams({ ecole: code.toUpperCase() });
    // Résoudre immédiatement
    resolveSchool(code);
  }, [setSearchParams, resolveSchool]);

  return { schoolId, schoolCode, schoolName, loading, error, setSchoolCode };
}
