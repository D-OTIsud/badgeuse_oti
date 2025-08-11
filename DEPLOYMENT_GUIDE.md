# Guide de Déploiement des Fonctions SQL pour le Dashboard Badgeuse OTI

## Vue d'ensemble

Ce guide vous accompagne dans le déploiement des fonctions SQL PostgreSQL dans votre base de données Supabase pour améliorer les performances et la précision du dashboard.

## Prérequis

- Accès à votre projet Supabase
- Permissions d'administrateur sur la base de données
- Connaissance de base de PostgreSQL (optionnel, les commandes sont fournies)

## Étape 1: Accéder à l'éditeur SQL de Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans la section **SQL Editor** (éditeur SQL)
3. Cliquez sur **New query** (nouvelle requête)

## Étape 2: Déployer les fonctions

### Option A: Déploiement complet (recommandé)

1. Copiez tout le contenu du fichier `database_functions.sql`
2. Collez-le dans l'éditeur SQL de Supabase
3. Cliquez sur **Run** (exécuter)

### Option B: Déploiement par sections

Si vous préférez déployer par étapes, vous pouvez exécuter les sections une par une :

1. **Fonctions principales** : `appbadge_kpi_bundle` et ses variantes
2. **Fonctions globales** : `appbadge_kpi_global` et ses variantes  
3. **Fonctions de filtrage** : `appbadge_kpi_filtres` et `appbadge_kpi_global_filtres`

## Étape 3: Vérifier le déploiement

Après avoir exécuté le script, vérifiez que les fonctions ont été créées :

```sql
-- Lister toutes les fonctions créées
SELECT 
    proname as nom_fonction,
    prosrc as source
FROM pg_proc 
WHERE proname LIKE 'appbadge_kpi%'
ORDER BY proname;
```

## Étape 4: Tester les fonctions

### Test de base

```sql
-- Tester la fonction principale pour aujourd'hui
SELECT appbadge_kpi_bundle(CURRENT_DATE);

-- Tester pour une date spécifique
SELECT appbadge_kpi_bundle('2024-01-15');

-- Tester la fonction semaine ISO
SELECT appbadge_kpi_bundle_iso_week(2024, 3);

-- Tester la fonction mois
SELECT appbadge_kpi_bundle_month(2024, 1);

-- Tester la fonction année
SELECT appbadge_kpi_bundle_year(2024);
```

### Test avec filtres

```sql
-- Tester avec des filtres
SELECT appbadge_kpi_filtres('2024-01-15', 'IT', 'Bureau', 'Développeur');

-- Tester les fonctions globales avec filtres
SELECT appbadge_kpi_global_filtres('2024-01-15', 'IT');
```

## Étape 5: Intégration avec le frontend

Une fois les fonctions déployées, votre dashboard React est déjà configuré pour les utiliser. Vous pouvez :

1. **Tester l'intégration** : Utilisez le bouton "Tester SQL" dans le dashboard
2. **Actualiser les KPIs** : Utilisez le bouton "Actualiser KPIs" 
3. **Vérifier les données** : Les KPIs devraient maintenant afficher "(SQL)" pour indiquer qu'ils utilisent les nouvelles fonctions

## Structure des données retournées

### Format de réponse des fonctions `_bundle`

```json
{
  "global": {
    "retard_cumule_minutes": 45,
    "travail_net_moyen_minutes": 420,
    "total_utilisateurs": 25,
    "utilisateurs_presents": 22,
    "utilisateurs_absents": 3,
    "utilisateurs_en_pause": 2,
    "total_pause_minutes": 120
  },
  "utilisateurs": [
    {
      "utilisateur_id": 1,
      "nom": "Dupont",
      "prenom": "Jean",
      "service": "IT",
      "lieux": "Bureau",
      "role": "Développeur",
      "retard_minutes": 5,
      "travail_net_minutes": 450,
      "pause_total_minutes": 30,
      "statut": "Présent"
    }
  ],
  "metadata": {
    "date_debut": "2024-01-15T00:00:00",
    "date_fin": "2024-01-16T00:00:00",
    "periode_type": "jour",
    "jours_avec_donnees": 1,
    "fonction_appelee": "appbadge_kpi_bundle"
  }
}
```

### Format de réponse des fonctions `_global`

```json
{
  "retard_cumule_minutes": 45,
  "travail_net_moyen_minutes": 420,
  "total_utilisateurs": 25,
  "utilisateurs_presents": 22,
  "utilisateurs_absents": 3,
  "utilisateurs_en_pause": 2,
  "total_pause_minutes": 120,
  "date": "2024-01-15",
  "fonction_appelee": "appbadge_kpi_global"
}
```

## Conventions importantes

- **Intervalles semi-ouverts** : Toutes les fonctions utilisent des intervalles `[start, end)` pour éviter les doublons
- **Timezone** : Les calculs sont effectués en `Indian/Reunion` timezone
- **Gestion des NULL** : Les valeurs manquantes sont gérées avec `COALESCE` et des valeurs par défaut
- **Filtres optionnels** : Les paramètres de filtrage sont optionnels (NULL = pas de filtre)

## Dépannage

### Erreur commune : "function does not exist"

Si vous obtenez cette erreur, vérifiez que :
1. Le script SQL a été exécuté avec succès
2. Vous êtes connecté à la bonne base de données
3. Les permissions sont correctes

### Erreur : "relation does not exist"

Vérifiez que vos tables existent avec les noms exacts :
- `appbadge_utilisateurs`
- `appbadge_badges`

### Erreur de timezone

Si vous avez des problèmes de timezone, vérifiez que la commande `SET timezone = 'Indian/Reunion';` a été exécutée.

## Performance et optimisation

- **Index recommandés** : Assurez-vous d'avoir des index sur `jour_local`, `utilisateur_id`, et les colonnes de filtrage
- **Monitoring** : Surveillez les temps d'exécution des fonctions
- **Cache** : Considérez l'utilisation du cache Supabase si nécessaire

## Support

En cas de problème :
1. Vérifiez les logs d'erreur dans Supabase
2. Testez les fonctions une par une
3. Vérifiez la structure de vos tables
4. Consultez la documentation PostgreSQL pour les erreurs spécifiques

## Prochaines étapes

Après le déploiement réussi :
1. Testez toutes les fonctions dans le dashboard
2. Vérifiez la cohérence des données
3. Optimisez les performances si nécessaire
4. Documentez les spécificités de votre environnement
