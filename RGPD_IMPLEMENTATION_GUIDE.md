# Guide d'implémentation RGPD

Ce guide explique comment les mentions RGPD et la purge automatique des données sont implémentées dans l'application.

## 1. Mentions RGPD dans l'interface

### Accès aux mentions
- Un lien "RGPD" est disponible dans le header de l'application (en haut à droite)
- Cliquer sur ce lien ouvre une modale avec toutes les informations RGPD

### Contenu des mentions
Les mentions RGPD incluent :
- **Responsable du traitement** : OTI du SUD avec contact référent
- **Finalités** : Gestion du temps de travail, contrôle d'accès, géolocalisation, etc.
- **Bases légales** : Mission d'intérêt public, obligation légale, intérêt légitime
- **Données collectées** : Identification, badgeage, localisation, administratives, connexion
- **Durées de conservation** :
  - Badgeage : 5 ans
  - Localisation GPS : 3 semaines (21 jours)
  - Identification : Pendant la relation contractuelle + 5 ans
  - Connexion : 12 mois
- **Destinataires** : Services RH, managers, prestataires techniques, autorités
- **Droits des utilisateurs** : Accès, rectification, effacement, limitation, opposition, portabilité
- **Contact** : Référent RGPD avec email et téléphone
- **Réclamation** : Informations pour contacter la CNIL

## 2. Purge automatique des données

### Fonctions de purge

Les fonctions SQL suivantes sont créées dans `rgpd_data_purge.sql` :

1. **`purge_old_gps_data()`**
   - Anonymise (met à NULL) les coordonnées GPS des badgeages
   - Période : données de plus de 3 semaines (21 jours)
   - Conserve les enregistrements de badgeage mais supprime les données de localisation

2. **`purge_old_badgeage_data()`**
   - Supprime complètement les enregistrements de badgeage
   - Période : données de plus de 5 ans
   - Suppression définitive des données

3. **`purge_old_session_modifications()`**
   - Supprime les demandes de modification de session
   - Période : données de plus de 5 ans

4. **`purge_old_oubli_badgeages()`**
   - Supprime les demandes d'oubli de badgeage
   - Période : données de plus de 5 ans

### Tâches planifiées (pg_cron)

Les tâches suivantes sont automatiquement planifiées :

| Tâche | Horaire | Fonction | Description |
|-------|---------|----------|-------------|
| `rgpd_purge_gps_data` | 3:00 AM (quotidien) | `purge_old_gps_data()` | Anonymise les GPS > 3 semaines |
| `rgpd_purge_badgeage_data` | 3:30 AM (quotidien) | `purge_old_badgeage_data()` | Supprime badgeages > 5 ans |
| `rgpd_purge_session_modifications` | 4:00 AM (quotidien) | `purge_old_session_modifications()` | Supprime modifs > 5 ans |
| `rgpd_purge_oubli_badgeages` | 4:30 AM (quotidien) | `purge_old_oubli_badgeages()` | Supprime oublis > 5 ans |

### Installation des fonctions de purge

1. Connectez-vous à Supabase SQL Editor
2. Exécutez le fichier `rgpd_data_purge.sql`
3. Vérifiez que les tâches sont créées :
   ```sql
   SELECT jobname, schedule, command 
   FROM cron.job 
   WHERE jobname LIKE 'rgpd_%';
   ```

## 3. Vues filtrées RGPD

### Vues disponibles

Des vues filtrées sont créées dans `rgpd_filtered_views.sql` pour garantir que les données ne sont pas accessibles après la période de conservation, même si elles n'ont pas encore été purgées :

1. **`appbadge_v_badgeages_gps_filtered`**
   - Affiche les badgeages avec GPS uniquement pour les 3 dernières semaines
   - Les coordonnées GPS sont NULL pour les données plus anciennes

2. **`appbadge_v_badgeages_retention_filtered`**
   - Affiche uniquement les badgeages des 5 dernières années

3. **`appbadge_v_session_modifs_retention_filtered`**
   - Affiche uniquement les modifications de session des 5 dernières années

4. **`appbadge_v_oubli_badgeages_retention_filtered`**
   - Affiche uniquement les demandes d'oubli de badgeage des 5 dernières années

### Installation des vues filtrées

1. Connectez-vous à Supabase SQL Editor
2. Exécutez le fichier `rgpd_filtered_views.sql`
3. Vérifiez que les vues sont créées :
   ```sql
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_schema = 'public' 
     AND table_name LIKE '%retention%' OR table_name LIKE '%gps_filtered%';
   ```

### Utilisation des vues filtrées

**Recommandation** : Utilisez ces vues dans vos requêtes au lieu d'accéder directement aux tables pour garantir la conformité RGPD.

Exemple :
```sql
-- Au lieu de :
SELECT * FROM appbadge_badgeages WHERE utilisateur_id = '...';

-- Utilisez :
SELECT * FROM appbadge_v_badgeages_retention_filtered WHERE utilisateur_id = '...';
```

## 4. Vérification et monitoring

### Vérifier les tâches de purge

```sql
-- Voir toutes les tâches RGPD
SELECT jobname, schedule, command, active
FROM cron.job 
WHERE jobname LIKE 'rgpd_%'
ORDER BY jobname;
```

### Vérifier l'exécution des purges

```sql
-- Voir l'historique d'exécution (si disponible)
SELECT * 
FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname LIKE 'rgpd_%'
)
ORDER BY start_time DESC
LIMIT 20;
```

### Tester manuellement les fonctions de purge

```sql
-- Tester la purge GPS (retourne le nombre d'enregistrements modifiés)
SELECT * FROM purge_old_gps_data();

-- Tester la purge badgeage (retourne le nombre d'enregistrements supprimés)
SELECT * FROM purge_old_badgeage_data();
```

### Vérifier les données restantes

```sql
-- Compter les badgeages avec GPS de plus de 3 semaines
SELECT COUNT(*) 
FROM appbadge_badgeages 
WHERE date_heure < (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '21 days'
  AND (latitude IS NOT NULL OR longitude IS NOT NULL);

-- Compter les badgeages de plus de 5 ans
SELECT COUNT(*) 
FROM appbadge_badgeages 
WHERE date_heure < (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';
```

## 5. Conformité et audit

### Points de contrôle

- ✅ Mentions RGPD accessibles dans l'interface
- ✅ Purge automatique des données GPS après 3 semaines
- ✅ Purge automatique des données de badgeage après 5 ans
- ✅ Vues filtrées pour garantir l'inaccessibilité des données expirées
- ✅ Tâches planifiées exécutées quotidiennement
- ✅ Documentation des durées de conservation

### Logs et traçabilité

Les fonctions de purge retournent le nombre d'enregistrements traités. Il est recommandé de :
- Logger les résultats des purges
- Surveiller régulièrement l'exécution des tâches
- Documenter toute exception ou modification des durées de conservation

## 6. Contact et support

Pour toute question relative à la conformité RGPD :
- **Email** : rgpd@otisud.re
- **Référent RGPD** : [Nom du référent]

---

**Dernière mise à jour** : Décembre 2025

