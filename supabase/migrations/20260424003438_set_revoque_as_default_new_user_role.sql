/*
  # Définir le rôle "revoque" comme rôle par défaut des nouveaux utilisateurs

  ## Description
  Cette migration met à jour la fonction `handle_new_user()` afin que tout nouvel utilisateur
  inscrit reçoive automatiquement le rôle `revoque` (au lieu de `secretaire`).
  Un administrateur devra ensuite lui attribuer un rôle effectif.

  ## 1. Modifications
  - Redéfinition de la fonction `handle_new_user()` via `CREATE OR REPLACE`
  - Le rôle attribué par défaut devient `revoque`
  - Le trigger `on_auth_user_created` reste inchangé et appellera la nouvelle version

  ## 2. Notes Importantes
  - Aucun profil existant n'est modifié
  - Si le rôle `revoque` n'existe pas (cas improbable), `role_id` sera NULL
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    (SELECT id FROM roles WHERE nom = 'revoque' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
