# Badgeuse OTI

Application de badgeage pour l'OTI du SUD avec support NFC et géolocalisation.

## Fonctionnalités

### Badgeage
- **Badgeage manuel** : Saisie d'un code à 4 chiffres
- **Badgeage NFC** : Scan automatique des badges NFC
- **Géolocalisation** : Enregistrement automatique de la position GPS
- **Gestion des rôles** : Différents comportements selon le rôle utilisateur
- **Permissions** : Vérification automatique des permissions GPS et NFC

### Administration
- **Association de badges NFC** : Lier un tag NFC à un utilisateur
- **Gestion des lieux** : Ajout de nouveaux lieux avec coordonnées GPS
- **Tableau de bord** : Visualisation des présences et retards en temps réel

### Tableau de bord (Nouveau)
- **KPIs en temps réel** : Présents, pauses, retards, travail net
- **Statuts en direct** : Vue d'ensemble des utilisateurs connectés
- **Anomalies** : Détection automatique des problèmes de badgeage
- **Graphiques** : Tendances des retards et du travail
- **Occupation par lieu** : Répartition des utilisateurs par site
- **Arrivées vs horaire** : Distribution des retards

## Types d'utilisateurs

### Admin
- Accès complet à toutes les fonctionnalités
- Précision GPS réduite pour la confidentialité
- Badgeage direct sans formulaire sur réseau autorisé

### Manager
- Accès aux fonctions d'administration
- Précision GPS réduite
- Badgeage simplifié

### A-E (Agents d'Exploitation)
- Badgeage automatique avec code pré-rempli
- Premier badgeage : entrée automatique
- Badgeages suivants : choix du type d'action

### Autres utilisateurs
- Badgeage standard avec code manuel
- Commentaire obligatoire sur réseau non autorisé
- Géolocalisation avec consentement

## Installation

```bash
npm install
```

### Configuration des Variables d'Environnement

**⚠️ IMPORTANT** : Avant de lancer l'application, configurez les variables d'environnement.

1. Copiez le fichier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Remplissez les valeurs dans `.env` :
   - `VITE_SUPABASE_URL` : URL de votre projet Supabase
   - `VITE_SUPABASE_ANON_KEY` : Clé anon de Supabase
   - `VITE_WEBHOOK_*_URL` : URLs des webhooks n8n (optionnel, pour compatibilité legacy)

3. Configurez les webhooks dans Supabase (pour les fonctions RPC) :
   - Voir `ENV_SETUP.md` pour les instructions détaillées

4. Lancez l'application :
   ```bash
   npm run dev
   ```

Pour plus de détails, consultez `ENV_SETUP.md`.

## Dépendances

- **React 18** : Interface utilisateur
- **Supabase** : Base de données et authentification
- **Recharts** : Graphiques pour le tableau de bord
- **Lottie React** : Animations de chargement

## Structure de la base de données

### Vues principales
- `appbadge_v_dashboard_jour` : Synthèse quotidienne par utilisateur
- `appbadge_v_statut_courant` : Statut actuel des utilisateurs
- `appbadge_v_anomalies` : Détection des anomalies
- `appbadge_v_sessions` : Détail des sessions de travail
- `appbadge_v_pauses` : Détail des pauses

### Tables
- `appbadge_utilisateurs` : Utilisateurs du système
- `appbadge_badges` : Badges NFC associés
- `appbadge_badgeages` : Historique des badgeages
- `appbadge_lieux` : Lieux de travail
- `appbadge_horaires_standards` : Horaires par lieu

## Couleurs du thème

- **Vert principal** : `#3ba27c` (OTI du SUD)
- **Fond crème** : `#faf7f2`
- **Anneau avatar** : `#4AA3FF`
- **Présent** : `#4caf50`
- **Pause** : `#ff9800`
- **Absent** : `#cccccc`

## Déploiement

L'application est configurée pour être déployée avec Docker :

```bash
docker build -t badgeuse-oti .
docker run -p 3000:3000 badgeuse-oti
```

## Support

Pour toute question ou problème, contactez l'équipe IT de l'OTI du SUD. 

## Documentation

La documentation détaillée est organisée par thème:

- Démarrage et configuration: `README_CONFIG.md`
- Fonctions SQL et exemples: `README_FUNCTIONS.md`, `test_functions.sql`, `database_functions.sql`
- Guide de déploiement: `DEPLOYMENT_GUIDE.md`, `Dockerfile`, `nginx.conf`
- Contrôle d'accès IP: `IP_ACCESS_CONTROL.md`
- Améliorations Dashboard: `DASHBOARD_IMPROVEMENTS.md`, `GRAPHIQUES_IMPLEMENTATION.md`
- Exemples d'usage et typings: `EXAMPLES_USAGE.md`, `EXAMPLES_TYPED.md`

Astuce: utilisez la recherche du dépôt pour retrouver rapidement un sujet.