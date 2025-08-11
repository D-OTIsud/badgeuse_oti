# Guide d'utilisation des fonctions SQL Badgeuse OTI

## Vue d'ensemble

Ce document décrit l'utilisation des fonctions SQL créées pour le dashboard de badgeuse OTI. Ces fonctions permettent de récupérer des KPIs (indicateurs de performance) sur le temps de travail des utilisateurs.

## Structure des données

### Tables utilisées
- `appbadge_utilisateurs` : Informations sur les utilisateurs (id, nom, prenom, service, lieux, role)
- `appbadge_badges` : Données de badgeage (utilisateur_id, jour_local, heure_arrivee, heure_depart, heure_horaire, heure_horaire_fin, pause_total_minutes, statut)

### KPIs calculés
- `travail_total_minutes` : Temps total entre arrivée et départ
- `pause_total_minutes` : Temps total des pauses
- `travail_net_minutes` : Temps de travail effectif (total - pauses)
- `retard_minutes` : Retard par rapport à l'horaire prévu
- `depart_anticipe_minutes` : Départ anticipé par rapport à l'horaire de fin

## 1. Fonctions Bundle (tout-en-un)

### 1.1 Fonction principale : `appbadge_kpi_bundle`

**Signature :**
```sql
appbadge_kpi_bundle(
    p_start_date DATE, 
    p_period TEXT, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
```

**Paramètres :**
- `p_start_date` : Date de début de la période
- `p_period` : Type de période ('week', 'month', 'year')
- `p_utilisateur_id` : ID de l'utilisateur (NULL pour tous)
- `p_lieux` : Lieu de travail (NULL pour tous)
- `p_service` : Service (NULL pour tous)
- `p_role` : Rôle (NULL pour tous)

**Retour :**
```sql
RETURNS TABLE (
    window_start DATE,      -- Début de la période
    window_end DATE,        -- Fin de la période
    period TEXT,            -- Type de période
    global JSONB,           -- KPIs globaux
    users JSONB,            -- KPIs par utilisateur
    meta JSONB              -- Métadonnées et sous-totaux
)
```

**Exemple d'utilisation :**
```sql
-- KPIs pour le mois de janvier 2025
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month'
);

-- KPIs pour le mois de janvier 2025, service "Service Accueil" uniquement
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month',
    NULL,                   -- p_utilisateur_id
    NULL,                   -- p_lieux
    'Service Accueil ',     -- p_service (attention aux espaces finaux)
    NULL                    -- p_role
);
```

### 1.2 Fonctions helpers

#### `appbadge_kpi_bundle_year`
```sql
-- KPIs pour l'année 2025
SELECT * FROM appbadge_kpi_bundle_year(2025);

-- KPIs pour l'année 2025, lieu "Siège" uniquement
SELECT * FROM appbadge_kpi_bundle_year(2025, NULL, 'Siège', NULL, NULL);
```

#### `appbadge_kpi_bundle_month`
```sql
-- KPIs pour janvier 2025
SELECT * FROM appbadge_kpi_bundle_month(2025, 1);

-- KPIs pour janvier 2025, rôle "Manager" uniquement
SELECT * FROM appbadge_kpi_bundle_month(2025, 1, NULL, NULL, NULL, 'Manager');
```

#### `appbadge_kpi_bundle_iso_week`
```sql
-- KPIs pour la semaine ISO 1 de 2025
SELECT * FROM appbadge_kpi_bundle_iso_week(2025, 1);

-- KPIs pour la semaine ISO 1 de 2025, service "Service Info" uniquement
SELECT * FROM appbadge_kpi_bundle_iso_week(2025, 1, NULL, NULL, 'Service Info ', NULL);
```

#### `appbadge_kpi_bundle_between`
```sql
-- KPIs pour la période du 1er au 31 janvier 2025
SELECT * FROM appbadge_kpi_bundle_between(
    DATE '2025-01-01',
    DATE '2025-01-31'
);

-- KPIs pour la période du 1er au 31 janvier 2025, lieu "Entre-Deux" uniquement
SELECT * FROM appbadge_kpi_bundle_between(
    DATE '2025-01-01',
    DATE '2025-01-31',
    NULL,       -- p_utilisateur_id
    'Entre-Deux', -- p_lieux
    NULL,       -- p_service
    NULL        -- p_role
);
```

## 2. Fonctions KPIs globaux (sans détails utilisateurs)

### 2.1 Fonction principale : `appbadge_kpi_global_filtres`

**Signature :**
```sql
appbadge_kpi_global_filtres(
    p_start_date DATE, 
    p_period TEXT, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
```

**Retour :**
```sql
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
```

**Exemple d'utilisation :**
```sql
-- KPIs globaux pour le mois de janvier 2025
SELECT * FROM appbadge_kpi_global_filtres(
    DATE '2025-01-01',
    'month'
);

-- KPIs globaux pour le mois de janvier 2025, service "Service Accueil"
SELECT * FROM appbadge_kpi_global_filtres(
    DATE '2025-01-01',
    'month',
    NULL,                   -- p_lieux
    'Service Accueil ',     -- p_service
    NULL                    -- p_role
);
```

### 2.2 Fonctions helpers

#### `appbadge_kpi_global_filtres_year`
```sql
-- KPIs globaux pour l'année 2025
SELECT * FROM appbadge_kpi_global_filtres_year(2025);

-- KPIs globaux pour l'année 2025, lieu "Siège", rôle "Manager"
SELECT * FROM appbadge_kpi_global_filtres_year(2025, 'Siège', NULL, 'Manager');
```

#### `appbadge_kpi_global_filtres_month`
```sql
-- KPIs globaux pour janvier 2025
SELECT * FROM appbadge_kpi_global_filtres_month(2025, 1);

-- KPIs globaux pour janvier 2025, lieu "Siège"
SELECT * FROM appbadge_kpi_global_filtres_month(2025, 1, 'Siège', NULL, NULL);
```

#### `appbadge_kpi_global_filtres_iso_week`
```sql
-- KPIs globaux pour la semaine ISO 1 de 2025
SELECT * FROM appbadge_kpi_global_filtres_iso_week(2025, 1);

-- KPIs globaux pour la semaine ISO 1 de 2025, service "Service Info"
SELECT * FROM appbadge_kpi_global_filtres_iso_week(2025, 1, NULL, 'Service Info ', NULL);
```

#### `appbadge_kpi_global_filtres_between`
```sql
-- KPIs globaux pour la période du 1er au 31 janvier 2025
SELECT * FROM appbadge_kpi_global_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-31'
);

-- KPIs globaux pour la période du 1er au 31 janvier 2025, lieu "Entre-Deux"
SELECT * FROM appbadge_kpi_global_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-31',
    'Entre-Deux' -- p_lieux
);
```

## 3. Fonctions KPIs par utilisateur (groupé par user)

### 3.1 Fonction principale : `appbadge_kpi_filtres`

**Signature :**
```sql
appbadge_kpi_filtres(
    p_start_date DATE, 
    p_period TEXT, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
```

**Retour :**
```sql
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
```

**Exemple d'utilisation :**
```sql
-- KPIs par utilisateur pour le mois de janvier 2025
SELECT * FROM appbadge_kpi_filtres(
    DATE '2025-01-01',
    'month'
);

-- KPIs par utilisateur pour le mois de janvier 2025, lieu "Siège", rôle "Manager"
SELECT * FROM appbadge_kpi_filtres(
    DATE '2025-01-01',
    'month',
    NULL,       -- p_utilisateur_id
    'Siège',    -- p_lieux
    NULL,       -- p_service
    'Manager'   -- p_role
);
```

### 3.2 Fonctions helpers

#### `appbadge_kpi_filtres_year`
```sql
-- KPIs par utilisateur pour l'année 2025
SELECT * FROM appbadge_kpi_filtres_year(2025);

-- KPIs par utilisateur pour l'année 2025, service "Service Accueil"
SELECT * FROM appbadge_kpi_filtres_year(2025, NULL, NULL, 'Service Accueil ', NULL);
```

#### `appbadge_kpi_filtres_month`
```sql
-- KPIs par utilisateur pour janvier 2025
SELECT * FROM appbadge_kpi_filtres_month(2025, 1);

-- KPIs par utilisateur pour janvier 2025, service "Service Accueil"
SELECT * FROM appbadge_kpi_filtres_month(2025, 1, NULL, NULL, 'Service Accueil ', NULL);
```

#### `appbadge_kpi_filtres_iso_week`
```sql
-- KPIs par utilisateur pour la semaine ISO 1 de 2025
SELECT * FROM appbadge_kpi_filtres_iso_week(2025, 1);

-- KPIs par utilisateur pour la semaine ISO 1 de 2025, service "Service Info"
SELECT * FROM appbadge_kpi_filtres_iso_week(2025, 1, NULL, NULL, 'Service Info ', NULL);
```

#### `appbadge_kpi_filtres_between`
```sql
-- KPIs par utilisateur pour la période du 1er au 16 janvier 2025
SELECT * FROM appbadge_kpi_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-16'
);

-- KPIs par utilisateur pour la période du 1er au 16 janvier 2025, lieu "Manapany"
SELECT * FROM appbadge_kpi_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-16',
    NULL,       -- p_utilisateur_id
    'Manapany'  -- p_lieux
);
```

## 4. Utilisation via PostgREST/Supabase

### 4.1 Exemple avec curl

```bash
# KPIs pour la semaine ISO 33 de 2025
curl -X POST 'https://supabertel.otisud.re/rest/v1/rpc/appbadge_kpi_bundle_iso_week' \
-d '{ 
  "p_iso_year": 2025, 
  "p_iso_week": 33, 
  "p_service": "Service Info ", 
  "p_lieux": null, 
  "p_role": null, 
  "p_utilisateur_id": null 
}' \
-H "Content-Type: application/json" \
-H "apikey: YOUR_API_KEY" \
-H "Authorization: Bearer YOUR_BEARER_TOKEN"
```

### 4.2 Exemple avec JavaScript/TypeScript

```typescript
// KPIs pour le mois de janvier 2025
const response = await supabase.rpc('appbadge_kpi_bundle_month', {
  p_year: 2025,
  p_month: 1,
  p_service: 'Service Accueil ',
  p_lieux: null,
  p_role: null,
  p_utilisateur_id: null
});

if (response.data) {
  const { window_start, window_end, period, global, users, meta } = response.data[0];
  console.log('KPIs globaux:', global);
  console.log('Utilisateurs:', users);
  console.log('Métadonnées:', meta);
}
```

## 5. Format de sortie

### 5.1 Structure JSON des fonctions bundle

```json
{
  "window_start": "2025-01-01",
  "window_end": "2025-02-01",
  "period": "month",
  "global": {
    "travail_total_minutes": 48000,
    "pause_total_minutes": 4800,
    "travail_net_minutes": 43200,
    "retard_minutes": 120,
    "depart_anticipe_minutes": 60
  },
  "users": [
    {
      "utilisateur_id": "uuid-123",
      "nom": "Dupont",
      "prenom": "Jean",
      "lieux": "Siège",
      "service": "Service Accueil ",
      "role": "Manager",
      "travail_total_minutes": 2400,
      "pause_total_minutes": 240,
      "travail_net_minutes": 2160,
      "retard_minutes": 10,
      "depart_anticipe_minutes": 5
    }
  ],
  "meta": {
    "filters": {
      "utilisateur_id": null,
      "lieux": null,
      "service": null,
      "role": null
    },
    "days": 31,
    "rows": 100,
    "users": 20,
    "services": ["Service Accueil ", "Service Info "],
    "lieux": ["Siège", "Entre-Deux"],
    "roles": ["Manager", "Employé"],
    "subtotals": {
      "by_service": [
        {
          "service": "Service Accueil ",
          "travail_net_minutes": 21600,
          "retard_minutes": 60,
          "depart_anticipe_minutes": 30
        }
      ],
      "by_lieux": [
        {
          "lieux": "Siège",
          "travail_net_minutes": 24000,
          "retard_minutes": 80,
          "depart_anticipe_minutes": 40
        }
      ],
      "by_role": [
        {
          "role": "Manager",
          "travail_net_minutes": 12000,
          "retard_minutes": 40,
          "depart_anticipe_minutes": 20
        }
      ]
    }
  }
}
```

### 5.2 Structure des fonctions KPIs globaux

```sql
-- Retourne une ligne avec 5 colonnes
travail_total_minutes | pause_total_minutes | travail_net_minutes | retard_minutes | depart_anticipe_minutes
48000                | 4800                | 43200               | 120            | 60
```

### 5.3 Structure des fonctions KPIs par utilisateur

```sql
-- Retourne une ligne par utilisateur avec 11 colonnes
utilisateur_id | nom     | prenom | lieux | service            | role     | travail_total_minutes | pause_total_minutes | travail_net_minutes | retard_minutes | depart_anticipe_minutes
uuid-123       | Dupont  | Jean   | Siège | Service Accueil   | Manager  | 2400                 | 240                 | 2160                | 10             | 5
```

## 6. Notes importantes

### 6.1 Gestion des filtres
- **NULL** : Ignore le filtre (tous les utilisateurs/services/lieux/rôles)
- **Valeur exacte** : Applique le filtre strict
- **Espaces finaux** : Attention aux espaces finaux dans les libellés (ex: "Service Accueil ")

### 6.2 Gestion des dates
- **Périodes** : 'week', 'month', 'year' (en minuscules)
- **Format des dates** : 'YYYY-MM-DD'
- **Semaines ISO** : Commencent le lundi
- **Intervalles** : Semi-ouverts [start, end)

### 6.3 Gestion des erreurs
- **Période invalide** : Lève une exception si p_period n'est pas 'week', 'month' ou 'year'
- **Aucun résultat** : Retourne des tableaux vides ou des valeurs 0 selon la fonction

### 6.4 Performance
- **Index recommandés** : Sur `jour_local`, `utilisateur_id`, `service`, `lieux`, `role`
- **Périodes longues** : Les années complètes peuvent être plus lentes
- **Filtres** : Les filtres améliorent les performances en réduisant les données traitées

## 7. Cas d'usage recommandés

### 7.1 Dashboard principal
```sql
-- Utiliser appbadge_kpi_bundle_* pour avoir tout en une fois
SELECT * FROM appbadge_kpi_bundle_month(2025, 1);
```

### 7.2 KPIs globaux uniquement
```sql
-- Utiliser appbadge_kpi_global_filtres_* pour les totaux
SELECT * FROM appbadge_kpi_global_filtres_month(2025, 1);
```

### 7.3 Tableau des utilisateurs
```sql
-- Utiliser appbadge_kpi_filtres_* pour la liste détaillée
SELECT * FROM appbadge_kpi_filtres_month(2025, 1);
```

### 7.4 Périodes personnalisées
```sql
-- Utiliser *_between pour des intervalles spécifiques
SELECT * FROM appbadge_kpi_bundle_between(
    DATE '2025-01-01',
    DATE '2025-01-15'
);
```

## 8. Dépannage

### 8.1 Erreurs courantes
- **Période invalide** : Vérifiez que p_period est 'week', 'month' ou 'year'
- **Dates invalides** : Vérifiez le format 'YYYY-MM-DD'
- **Filtres non trouvés** : Vérifiez l'existence des valeurs dans la base

### 8.2 Vérifications
```sql
-- Vérifier l'existence des fonctions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'appbadge_kpi%';

-- Vérifier les données disponibles
SELECT DISTINCT service FROM appbadge_utilisateurs;
SELECT DISTINCT lieux FROM appbadge_utilisateurs;
SELECT DISTINCT role FROM appbadge_utilisateurs;
```

## 9. Support

Pour toute question ou problème avec ces fonctions, consultez :
1. La documentation de la base de données
2. Les logs d'erreur PostgreSQL
3. L'équipe de développement OTI
