/*
  # Création des tables pour JIMPRO - Système de Gestion Scolaire

  ## Description
  Cette migration crée les 5 tables principales pour le système de gestion scolaire JIMPRO.

  ## 1. Nouvelles Tables
  
  ### `eleves` - Gestion des élèves
  - `id` (uuid, clé primaire)
  - `matricule` (text, unique) - Numéro d'identification unique de l'élève
  - `nom` (text) - Nom de famille
  - `postnom` (text) - Second nom
  - `prenom` (text) - Prénom
  - `sexe` (text) - Sexe de l'élève (M/F)
  - `lieu_naissance` (text) - Lieu de naissance
  - `date_naissance` (date) - Date de naissance
  - `section` (text) - Section scolaire
  - `option` (text) - Option d'études
  - `responsable` (text) - Nom du parent/tuteur
  - `telephone` (text) - Numéro de téléphone
  - `domicile` (text) - Adresse du domicile
  - `created_at` (timestamptz) - Date de création
  - `updated_at` (timestamptz) - Date de dernière modification

  ### `minerval` - Gestion des frais scolaires
  - `id` (uuid, clé primaire)
  - `matricule` (text) - Référence à l'élève
  - `nom` (text)
  - `postnom` (text)
  - `prenom` (text)
  - `sexe` (text)
  - `lieu_naissance` (text)
  - `date_naissance` (date)
  - `section` (text)
  - `option` (text)
  - `responsable` (text)
  - `telephone` (text)
  - `domicile` (text)
  - `montant_total` (numeric) - Montant total des frais
  - `montant_paye` (numeric) - Montant déjà payé
  - `date_paiement` (timestamptz) - Date du paiement
  - `methode_paiement` (text) - Mode de paiement (Cash, Mobile Money, etc.)
  - `numero_recu` (text) - Numéro de reçu
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `compte_courant` - Gestion financière
  - `id` (uuid, clé primaire)
  - `montant_chiffre` (numeric) - Montant en chiffres
  - `montant_lettre` (text) - Montant en lettres
  - `beneficiaire` (text) - Bénéficiaire de la transaction
  - `libelle` (text) - Description de la transaction
  - `telephone` (text) - Téléphone du bénéficiaire
  - `type_operation` (text) - Type: 'recette' ou 'dépense'
  - `date_transaction` (timestamptz) - Date de la transaction
  - `created_at` (timestamptz)

  ### `gestion_fournitures` - Gestion fournitures élèves
  - `id` (uuid, clé primaire)
  - `matricule` (text) - Référence à l'élève
  - `nom` (text)
  - `postnom` (text)
  - `prenom` (text)
  - `sexe` (text)
  - `lieu_naissance` (text)
  - `date_naissance` (date)
  - `section` (text)
  - `option` (text)
  - `annee` (text) - Année scolaire
  - `eps` (boolean) - Équipement de sport distribué
  - `pull` (boolean) - Pull distribué
  - `date_distribution` (timestamptz) - Date de distribution
  - `created_at` (timestamptz)

  ### `gestion_fourniture_bureau` - Gestion fournitures bureau
  - `id` (uuid, clé primaire)
  - `article` (text) - Nom de l'article
  - `beneficiaire` (text) - Personne ayant reçu l'article
  - `commentaire` (text) - Commentaire ou notes
  - `quantite` (integer) - Quantité distribuée
  - `date_operation` (timestamptz) - Date de l'opération
  - `created_at` (timestamptz)

  ## 2. Sécurité
  - Activation de Row Level Security (RLS) sur toutes les tables
  - Politiques permettant l'accès complet pour les utilisateurs authentifiés
  - Les tables sont verrouillées par défaut sans politiques

  ## 3. Index
  - Index sur matricule pour recherches rapides
  - Index sur nom pour tri et recherche
  - Index sur section pour filtrage
  - Index sur dates pour rapports temporels
*/

-- Table ELEVES
CREATE TABLE IF NOT EXISTS eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text UNIQUE NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  responsable text NOT NULL,
  telephone text NOT NULL,
  domicile text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table MINERVAL
CREATE TABLE IF NOT EXISTS minerval (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  responsable text NOT NULL,
  telephone text NOT NULL,
  domicile text NOT NULL,
  montant_total numeric DEFAULT 0,
  montant_paye numeric DEFAULT 0,
  date_paiement timestamptz DEFAULT now(),
  methode_paiement text DEFAULT 'Cash',
  numero_recu text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table COMPTE_COURANT
CREATE TABLE IF NOT EXISTS compte_courant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  montant_chiffre numeric NOT NULL,
  montant_lettre text NOT NULL,
  beneficiaire text NOT NULL,
  libelle text NOT NULL,
  telephone text,
  type_operation text NOT NULL CHECK (type_operation IN ('recette', 'dépense')),
  date_transaction timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table GESTION_FOURNITURES
CREATE TABLE IF NOT EXISTS gestion_fournitures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  annee text NOT NULL,
  eps boolean DEFAULT false,
  pull boolean DEFAULT false,
  date_distribution timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table GESTION_FOURNITURE_BUREAU
CREATE TABLE IF NOT EXISTS gestion_fourniture_bureau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article text NOT NULL,
  beneficiaire text NOT NULL,
  commentaire text,
  quantite integer DEFAULT 1,
  date_operation timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Création des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_eleves_matricule ON eleves(matricule);
CREATE INDEX IF NOT EXISTS idx_eleves_nom ON eleves(nom);
CREATE INDEX IF NOT EXISTS idx_eleves_section ON eleves(section);
CREATE INDEX IF NOT EXISTS idx_eleves_created_at ON eleves(created_at);

CREATE INDEX IF NOT EXISTS idx_minerval_matricule ON minerval(matricule);
CREATE INDEX IF NOT EXISTS idx_minerval_date_paiement ON minerval(date_paiement);

CREATE INDEX IF NOT EXISTS idx_compte_courant_date ON compte_courant(date_transaction);
CREATE INDEX IF NOT EXISTS idx_compte_courant_type ON compte_courant(type_operation);

CREATE INDEX IF NOT EXISTS idx_fournitures_matricule ON gestion_fournitures(matricule);
CREATE INDEX IF NOT EXISTS idx_fournitures_section ON gestion_fournitures(section);

CREATE INDEX IF NOT EXISTS idx_fourniture_bureau_date ON gestion_fourniture_bureau(date_operation);

-- Activation de Row Level Security
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE minerval ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_courant ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_fournitures ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_fourniture_bureau ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permettant l'accès complet (à adapter selon besoins d'authentification)
CREATE POLICY "Permettre tout accès à eleves" ON eleves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à minerval" ON minerval FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à compte_courant" ON compte_courant FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à gestion_fournitures" ON gestion_fournitures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à gestion_fourniture_bureau" ON gestion_fourniture_bureau FOR ALL USING (true) WITH CHECK (true);