# 🚀 Déploiement du pointage par empreinte — guide pas à pas

Ce guide couvre la mise en service complète : base de données, compte « borne »,
enrôlement des empreintes et test de bout en bout.

## Prérequis
- Accès au **SQL Editor** de Supabase (projet JIMPRO).
- Accès au **Dashboard Supabase** (Authentication).
- Pointeuses ZKTeco branchées sur le réseau (IP connues), réglées sur le
  fuseau `Africa/Lubumbashi`.

## Étape 1 — Appliquer les migrations SQL
Dans **Supabase → SQL Editor**, exécutez ces fichiers **dans l'ordre** :

1. `supabase/migrations/20260901170000_empreintes_pointage.sql`
   (table `empreintes_personnel`, colonne `source`, fonction `pointer_personnel_borne`).
2. `supabase/migrations/20261011000000_pointage_gestion_pauses.sql`
   (corrige la gestion des pointages multiples : le dernier pointage du jour = départ).

> Collez le contenu de chaque fichier directement dans le SQL Editor.

Vérification rapide :
```sql
SELECT to_regclass('public.empreintes_personnel') AS table_ok,
       to_regprocedure('public.pointer_personnel_borne(uuid,uuid,date,time,text)') AS fonction_ok;
```

## Étape 2 — Créer le compte « borne »
1. **Dashboard Supabase → Authentication → Users → Add user** :
   - Email : `borne@ecole.cd` (ou autre)
   - Mot de passe : robuste
   - Cochez **Auto Confirm User**.
2. Récupérez l'id de l'école :
   ```sql
   SELECT id, code, nom FROM public.ecoles;
   ```
3. Rattachez le compte borne à l'école (le rôle n'a pas d'importance pour la
   borne : elle n'utilise que le RPC + la lecture des empreintes) :
   ```sql
   UPDATE public.profiles
   SET ecole_id = '<ecole_id>'
   WHERE email = 'borne@ecole.cd';
   ```
4. Vérifiez :
   ```sql
   SELECT id, email, ecole_id, is_active FROM public.profiles WHERE email = 'borne@ecole.cd';
   ```

> ⚠️ Ne donnez **jamais** la clé *service role* à la borne. La borne utilise le
> compte dédié + la clé *anon*.

## Étape 3 — Configurer le poste de la borne
```bash
cd borne-pointage
pip install -r requirements.txt        # pour le script Python
cp .env.example .env                   # puis éditer .env
```
Renseigner dans `.env` :
- `SUPABASE_URL` (ex. `https://xxxx.supabase.co`)
- `SUPABASE_ANON_KEY` (la clé anon, la même que l'app)
- `BORNE_EMAIL` / `BORNE_PASSWORD` (le compte créé à l'étape 2)
- `ECOLE_ID` (l'id récupéré à l'étape 2)

Adapter la liste `DEVICES` dans `sync-pointeuses.py` (IP + `appareil_id` de
chaque pointeuse).

## Étape 4 — Enrôler les employés
1. Sur **chaque pointeuse** : enrôlez les doigts des employés (logiciel du
   fabricant) → notez le **user_id** (numéro) de chaque employé.
2. Dans l'app (**Pointage du personnel → bouton « Empreintes »**) :
   - **Membre** : l'employé ;
   - **Doigt** : le doigt enrôlé ;
   - **Référence lecteur** : le `user_id` noté à l'étape 1 ;
   - **Appareil** : l'identifiant de la pointeuse (`borne1`, `borne2`… — doit
     correspondre à la liste `DEVICES` du script).

## Étape 5 — Lancer et tester
```bash
python3 sync-pointeuses.py          # boucle continue
# ou une seule passe :
python3 sync-pointeuses.py --once
```

Test de bout en bout :
1. Posez un doigt enrôlé sur la pointeuse.
2. Le script affiche `✓ user_id X → arrivee:present (…)`.
3. Ouvrez la page **Pointage du personnel** : la ligne apparaît **instantanément**
   (temps réel), source `empreinte`.
4. Reposez le même doigt plus tard : le statut passe à **départ** (dernier pointage).

## Dépannage
| Symptôme | Cause probable | Solution |
|---|---|---|
| `✗ Connexion à … impossible` | IP/port/mot de passe pointeuse | Vérifiez `DEVICES` + `DEVICE_PASSWORD`, ping l'IP |
| `✋ user_id X non enrôlé` | Référence non liée dans l'app | Étape 4 : ajoutez la référence dans « Empreintes » |
| `Authentification du compte borne échouée` | Identifiants / ecole_id | Vérifiez `.env` + le SQL de l'étape 2 |
| Pointages en double | `last-sync.json` supprimé | Laissez le fichier en place (déduplication) |
