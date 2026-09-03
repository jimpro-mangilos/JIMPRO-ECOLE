# 🖐️ Pointage par EMPREINTE — couplage borne ↔ JIMPRO

Ce dossier contient **tout ce qu'il faut** pour relier un **lecteur d'empreintes physique**
à votre module de pointage du personnel, avec des données **en temps réel**.

Architecture :

```
[Lecteur d'empreintes (USB/TCP)]
        │  capture + identification (SDK du lecteur)
        ▼
[Agent local (node, ce dossier) — poste à l'entrée de l'école]
        │  appelle pointer_personnel_borne(...) (RPC Supabase)
        ▼
Supabase  →  table pointages_personnel (source = 'empreinte')
        │  Realtime (abonnement déjà ajouté à la page Pointage)
        ▼
App web : la page Pointage / le Dashboard se mettent à jour INSTANTANÉMENT
```

## 1) Matériel & SDK (à choisir AVANT)
Le lecteur ne parle pas directement à une app web : il faut un **SDK** fourni par le
fabricant. Avant d'acheter, demandez au vendeur :
- le SDK (Windows C#/C++ le plus courant ; certains proposent Python/Linux) ;
- la possibilité d'**enrôler** les empreintes ET de faire un **match** (identification) par code ;
- conseil : enrôler **2 doigts** par membre (fiabilité).

Catégories usuelles :
- **ZKTeco / FingerTec** (pointeuses réseau ou USB, très répandues en Afrique) ;
- **DigitalPersona 4500 / SecuGen / Futronic** (petits lecteurs USB Windows).

## 2) Base de données (1 fois)
Dans **Supabase → SQL Editor**, exécutez :
`supabase/migrations/20260901170000_empreintes_pointage.sql`
- table `empreintes_personnel` (correspondance empreinte ↔ membre — **aucune donnée
  biométrique**, uniquement la référence d'empreinte côté lecteur) ;
- colonne `pointages_personnel.source` (`qr` / `manuel` / `empreinte`) ;
- fonction `pointer_personnel_borne(...)` : **une seule logique** arrivée → départ →
  déjà complet (mêmes règles que le portail : retard si après l'heure d'entrée).

## 3) Compte « borne » (sécurité)
1. Créez un **utilisateur dédié** dans l'app (ex. email `borne@ecole.cd`) avec un rôle
   simple (jamais la clé *service role* sur la borne !).
2. Récupérez l'id de l'école :
   ```sql
   SELECT id, code, nom FROM public.ecoles;
   ```

## 4) Enrôlement des empreintes
1. Enrôlez chaque doigt **dans le lecteur** (logiciel du fabricant) → notez la référence
   retournée (ex. `slot 12`).
2. Liez la référence au membre :
   ```sql
   INSERT INTO public.empreintes_personnel (ecole_id, personnel_id, appareil_id, empreinte_ref, doigt)
   VALUES ('<ecole_id>', '<personnel_id>', 'borne1', 'slot 12', 'droite-index');
   ```
   (*personnel_id* = id du membre dans la table `personnel`.)

## 5) Agent local
1. `cd borne-pointage && npm install`
2. Copiez `.env.example` → `.env` et remplissez (URL Supabase, clé anon, email/mot de
   passe du compte borne, id de l'école).
3. Adaptez `agent-pointage.mjs` → fonction `identifierParEmpreinte()` : remplacez le
   commentaire par l'appel SDK de votre lecteur (capture → match → retourne
   `personnel_id` ou `empreinte_ref`). Exemple avec la référence :
   ```js
   const ref = await lecteur.match();            // ex : 'slot 12'
   const { data } = await supabase
     .from('empreintes_personnel')
     .select('personnel_id')
     .eq('ecole_id', ECOLE_ID).eq('empreinte_ref', ref).eq('appareil_id', 'borne1')
     .maybeSingle();
   return data?.personnel_id;
   ```
4. Lancez : `node agent-pointage.mjs` (ou `pm2 start agent-pointage.mjs` pour le garder actif).

## 6) Test temps réel
- Ouvrez la page **Pointage du personnel** (admin) et la borne en même temps.
- Posez un doigt enrôlé : la ligne apparaît **instantanément** (abonnement Realtime déjà en place),
  arrivée ou départ selon l'heure, source `empreinte`.

## Sécurité & fiabilité
- **Jamais de clé *service role* sur la borne** : compte dédié + RLS + fonction SECURITY DEFINER.
- Gardez le **QR / code manuel** (portail existant) en secours si le lecteur tombe en panne.
- Le fuseau de l'agent est `Africa/Lubumbashi` par défaut dans la fonction SQL (ajustable).
- En cas de coupure réseau : l'agent met les échecs en file `queue-offline.json` et les
  retente à la reconnexion (voir `fileAttente` dans l'agent).
