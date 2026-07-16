# JIMPRO - Système de Gestion Scolaire

Application moderne de gestion scolaire développée avec React, TypeScript, Tailwind CSS et Supabase.

## Fonctionnalités

### 1. Tableau de Bord
- Vue d'ensemble des statistiques clés
- Nombre total d'élèves
- Recettes totales
- Paiements en attente
- Fournitures distribuées
- Graphiques et visualisations

### 2. Gestion des Élèves
- Inscription des nouveaux élèves
- Liste complète avec recherche et filtres
- Modification et suppression des élèves
- Stockage des informations complètes (nom, postnom, prénom, sexe, date de naissance, section, option, responsable, contacts)

### 3. Gestion du Minerval
- Enregistrement des paiements
- Suivi des frais scolaires
- Calcul automatique des soldes
- Statuts de paiement (Payé, Partiel, En Attente)
- Historique complet des paiements

### 4. Gestion Financière
- Enregistrement des recettes et dépenses
- Suivi du compte courant
- Calcul automatique du solde
- Historique des transactions
- Visualisation des flux financiers

### 5. Fournitures Élèves
- Distribution des équipements de sport (EPS)
- Distribution des pulls
- Suivi par élève et par section
- Statistiques de distribution

### 6. Fournitures Bureau
- Gestion des fournitures de bureau
- Suivi des distributions
- Historique des bénéficiaires
- Quantités distribuées

### 7. Rapports
- Génération de rapports personnalisés
- Export en différents formats
- Rapports par période
- Statistiques détaillées

## Technologies Utilisées

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool moderne
- **Tailwind CSS** - Framework CSS
- **Supabase** - Base de données PostgreSQL
- **React Router** - Navigation
- **Lucide React** - Icônes

## Structure de la Base de Données

### Tables

1. **eleves** - Informations des élèves
2. **minerval** - Paiements des frais scolaires
3. **compte_courant** - Transactions financières
4. **gestion_fournitures** - Fournitures élèves
5. **gestion_fourniture_bureau** - Fournitures bureau

## Installation

```bash
npm install
```

## Démarrage

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Configuration

L'application utilise Supabase pour la persistance des données. Les variables d'environnement sont configurées dans le fichier `.env`.

## Caractéristiques du Design

- Interface moderne et professionnelle
- Design responsive (desktop et tablette)
- Navigation intuitive avec sidebar
- Formulaires avec validation
- Modales pour les actions
- Tableaux avec recherche et filtres
- Cartes statistiques colorées
- Transitions fluides

## Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Validation des données côté client et serveur
- Protection contre les injections SQL
- Gestion sécurisée des transactions

---

Développé pour faciliter la gestion quotidienne des établissements scolaires.
