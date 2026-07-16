/*
  # Correctifs de sécurité - search_path et politiques RLS permissives

  ## Description
  Cette migration corrige deux familles de problèmes de sécurité détectés :

  ### 1. Fonctions avec `search_path` mutable
  Toutes les fonctions PL/pgSQL du schéma `public` reçoivent un `search_path`
  figé (`public, pg_temp`) via `ALTER FUNCTION ... SET search_path`. Cela empêche
  un attaquant de manipuler le schéma de résolution des objets utilisés par
  les fonctions SECURITY DEFINER notamment.

  Fonctions corrigées :
  - `set_numero_recu()`
  - `update_paiements_updated_at()`
  - `generate_numero_recu()`
  - `get_comptable_stats(uuid, date, date)`
  - `get_period_stats(uuid, text)`
  - `update_classes_updated_at()`
  - `update_motif_updated_at()`
  - `check_and_decrement_uniforme_stock()`
  - `update_updated_at_column()`
  - `handle_new_user()`

  ### 2. Politiques RLS avec WITH CHECK = true
  Deux politiques INSERT étaient permissives (`WITH CHECK (true)`) :

  - `profiles.Permettre insertion de profils` : remplacée par une politique
    exigeant que l'utilisateur n'insère qu'un profil dont l'`id` correspond
    à son propre `auth.uid()`. Cela permet au flux d'inscription (et au
    trigger `handle_new_user` qui reste SECURITY DEFINER) de fonctionner sans
    accorder d'insertion arbitraire aux utilisateurs authentifiés.

  - `user_activity_logs.Système peut créer des logs` : remplacée par une
    politique exigeant que `user_id = auth.uid()`, afin qu'un utilisateur ne
    puisse créer un log qu'à son propre nom.

  ## 2. Notes Importantes
  - Aucune donnée n'est modifiée
  - Les politiques sont recréées avec `DROP POLICY IF EXISTS` puis `CREATE POLICY`
  - Le trigger `handle_new_user` reste en SECURITY DEFINER, il contourne donc
    les politiques RLS — son fonctionnement n'est pas impacté
*/

-- 1. Fixer le search_path de toutes les fonctions concernées
ALTER FUNCTION public.set_numero_recu() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_paiements_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_numero_recu() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_comptable_stats(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_period_stats(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_classes_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_motif_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_decrement_uniforme_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 2. Remplacer les politiques INSERT trop permissives

-- profiles
DROP POLICY IF EXISTS "Permettre insertion de profils" ON public.profiles;

CREATE POLICY "Utilisateur peut inserer son propre profil"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_activity_logs
DROP POLICY IF EXISTS "Système peut créer des logs" ON public.user_activity_logs;

CREATE POLICY "Utilisateur peut creer ses propres logs"
  ON public.user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
