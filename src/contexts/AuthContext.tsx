import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role_id: string;
  ecole_id: string;
  photo_url?: string;
  last_login?: string;
  is_active: boolean;
  role?: {
    nom: string;
    description: string;
    permissions: any;
  };
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nom: string, prenom: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isSecretary: () => boolean;
  isComptable: () => boolean;
  canEncaisser: () => boolean;
  canCreatePaiement: () => boolean;
  canManageConfiguration: () => boolean;
  canAnnulerPaiement: () => boolean;
  canSupprimerPaiement: () => boolean;
  isItManager: () => boolean;
  isCoordonnateur: () => boolean;
  isPromoteur: () => boolean;
  isGestionnaireUniforme: () => boolean;
  isRevoque: () => boolean;
  isReadOnly: () => boolean;
  userProfile: Profile | null;
  currentSchoolId: string | null;
  currentSchoolCode: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
          await updateLastLogin(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          role:roles(nom, description, permissions)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLastLogin(userId: string) {
    try {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, nom: string, prenom: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom,
        },
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    await loadProfile(user.id);
  }

  function isItManager(): boolean {
    return profile?.role?.nom === 'it_manager';
  }

  function isCoordonnateur(): boolean {
    return profile?.role?.nom === 'coordonnateur';
  }

  function isPromoteur(): boolean {
    return profile?.role?.nom === 'promoteur';
  }

  function isGestionnaireUniforme(): boolean {
    return profile?.role?.nom === 'gestionnaire_uniforme';
  }

  function isRevoque(): boolean {
    return profile?.role?.nom === 'revoque';
  }

  function isReadOnly(): boolean {
    return isCoordonnateur() || isGestionnaireUniforme();
  }

  function hasPermission(_permission: string): boolean {
    if (!profile?.role) return false;
    if (isItManager()) return true;
    const permissions = profile.role.permissions;
    return permissions?.all === true || permissions?.[_permission] === true;
  }

  function isAdmin(): boolean {
    return profile?.role?.nom === 'admin' || isItManager();
  }

  function isSecretary(): boolean {
    return profile?.role?.nom === 'secretaire' || isItManager();
  }

  function isComptable(): boolean {
    return profile?.role?.nom === 'comptable' || isItManager();
  }

  function canEncaisser(): boolean {
    return isItManager() || isPromoteur() || profile?.role?.nom === 'admin' || profile?.role?.nom === 'comptable';
  }

  function canCreatePaiement(): boolean {
    return isItManager() || profile?.role?.nom === 'admin' || profile?.role?.nom === 'secretaire';
  }

  function canManageConfiguration(): boolean {
    return isItManager() || profile?.role?.nom === 'admin';
  }

  function canAnnulerPaiement(): boolean {
    return isItManager() || profile?.role?.nom === 'admin' || profile?.role?.nom === 'comptable';
  }

  function canSupprimerPaiement(): boolean {
    return isItManager() || profile?.role?.nom === 'admin';
  }

  // École courante : priorité au profile, fallback au JWT app_metadata
  const currentSchoolId: string | null =
    profile?.ecole_id ??
    (user?.app_metadata?.ecole_id as string | undefined) ??
    null;

  const currentSchoolCode: string | null =
    (user?.app_metadata?.ecole_code as string | undefined) ?? null;

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasPermission,
    isAdmin,
    isSecretary,
    isComptable,
    canEncaisser,
    canCreatePaiement,
    canManageConfiguration,
    canAnnulerPaiement,
    canSupprimerPaiement,
    isItManager,
    isCoordonnateur,
    isPromoteur,
    isGestionnaireUniforme,
    isRevoque,
    isReadOnly,
    userProfile: profile,
    currentSchoolId,
    currentSchoolCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
