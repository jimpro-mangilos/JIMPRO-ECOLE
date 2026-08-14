import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'jimpro_active_school_id';

interface ActiveSchool {
  /** L'ID effectif de l'école à utiliser dans toutes les queries */
  schoolId: string | null;
  /** Le code de l'école active (ex: "CSGA") */
  schoolCode: string | null;
  /** Le nom de l'école active (ex: "C.S_GOLDEN_ACADEMY") */
  schoolName: string | null;
  /** L'ID de l'école d'origine de l'utilisateur (depuis son profil) */
  homeSchoolId: string | null;
  /** Vrai si l'utilisateur peut switcher d'école (admin/it_manager) */
  canSwitchSchool: boolean;
  /** Changer l'école active (admin seulement). Stocké dans localStorage. */
  switchSchool: (schoolId: string | null) => void;
  /** Revenir à l'école d'origine */
  resetToHomeSchool: () => void;
}

/**
 * Hook fournissant l'école active.
 * - Utilisateur normal : son école de profil (AuthContext.currentSchoolId)
 * - Admin/it_manager : peut overrider via switchSchool() → stocké dans localStorage
 */
export function useActiveSchool(): ActiveSchool {
  const { currentSchoolCode, homeSchoolId, isItManager, isAdmin, isPromoteur } = useAuth();
  const canSwitchSchool = isItManager() || isAdmin() || isPromoteur(); // admin, it_manager, promoteur

  // Récupérer l'override localStorage
  const getOverrideId = useCallback((): string | null => {
    if (!canSwitchSchool) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== 'null' && stored !== homeSchoolId) {
        return stored;
      }
    } catch { /* localStorage indisponible */ }
    return null;
  }, [canSwitchSchool, homeSchoolId]);

  const overrideId = getOverrideId();
  const effectiveSchoolId = overrideId ?? homeSchoolId;

  // Pour récupérer le nom/code de l'école override, on utilise une query
  // (pour l'instant, on utilise currentSchoolCode comme fallback)
  const schoolCode = overrideId ? null : currentSchoolCode; // sera résolu via le sélecteur
  const schoolName = null; // sera résolu via le sélecteur

  const switchSchool = useCallback((schoolId: string | null) => {
    if (!canSwitchSchool) return;
    try {
      if (schoolId && schoolId !== homeSchoolId) {
        localStorage.setItem(STORAGE_KEY, schoolId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      // Recharger la page pour propager le changement
      window.location.reload();
    } catch { /* localStorage indisponible */ }
  }, [canSwitchSchool, homeSchoolId]);

  const resetToHomeSchool = useCallback(() => {
    switchSchool(null);
  }, [switchSchool]);

  return {
    schoolId: effectiveSchoolId,
    schoolCode,
    schoolName,
    homeSchoolId,
    canSwitchSchool,
    switchSchool,
    resetToHomeSchool,
  };
}

/**
 * Hook pour charger la liste des écoles (pour le sélecteur admin).
 * Retourne la liste + l'école sélectionnée.
 */
export function useSchoolsList() {
  const { currentSchoolId, currentSchoolCode, isItManager, isAdmin, isPromoteur } = useAuth();
  const canSwitchSchool = isItManager() || isAdmin() || isPromoteur();

  // Récupérer l'override localStorage
  const getOverrideId = (): string | null => {
    if (!canSwitchSchool) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && stored !== 'null' ? stored : null;
    } catch { return null; }
  };

  const activeId = getOverrideId() ?? currentSchoolId;
  const activeCode = currentSchoolCode;

  return { activeId, activeCode, canSwitchSchool };
}
