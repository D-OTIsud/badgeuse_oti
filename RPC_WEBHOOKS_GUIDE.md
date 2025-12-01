# Guide d'Utilisation des Fonctions RPC pour les Webhooks

Ce guide explique comment utiliser les fonctions RPC PostgreSQL pour appeler les webhooks de manière sécurisée.

## 🎯 Pourquoi les Fonctions RPC ?

**Avantages par rapport aux Edge Functions** :
- ✅ Plus simple : pas besoin de déployer des fonctions Deno, création directe dans l'éditeur SQL
- ✅ Direct : s'exécute dans la base de données
- ✅ Authentification automatique via `auth.uid()`
- ✅ Pas besoin de configuration supplémentaire (pas de CLI, pas de variables d'environnement)
- ✅ Moins de latence (pas de cold start, exécution directe)
- ✅ Utilise l'extension `http` déjà disponible dans votre projet

**Avantages par rapport aux appels directs** :
- ✅ URLs de webhook protégées (non exposées au client)
- ✅ Vérification d'authentification et d'autorisation
- ✅ Validation des données
- ✅ Gestion d'erreurs centralisée

## 📋 Installation

### 1. Vérifier l'extension http

L'extension `http` est déjà activée dans votre projet (voir `appbadge_full_monolithic.sql` ligne 10).

Si ce n'est pas le cas, exécutez dans l'éditeur SQL :

```sql
CREATE EXTENSION IF NOT EXISTS http;
```

### 2. Créer les fonctions RPC

Copiez et exécutez le contenu de `supabase_rpc_webhooks.sql` dans l'éditeur SQL de Supabase.

Les fonctions créées sont :
- `webhook_badge_code(p_utilisateur_id, p_badge_id, p_user_email)`
- `webhook_gps(p_webhook_data)`
- `webhook_oubli_badgeage(p_request_data)`

### 3. Configurer les URLs (optionnel)

Les URLs des webhooks sont hardcodées dans les fonctions. Si vous voulez les changer :

1. Allez dans l'éditeur SQL de Supabase
2. Exécutez `ALTER FUNCTION` pour modifier l'URL, ou
3. Recréez les fonctions avec les nouvelles URLs

**Exemple pour modifier une URL** :
```sql
-- Voir la fonction actuelle
SELECT pg_get_functiondef('webhook_badge_code'::regproc);

-- Recréer avec la nouvelle URL (remplacer dans le code)
-- (voir supabase_rpc_webhooks.sql pour le code complet)
```

## 🚀 Utilisation dans le Code Client

### Exemple 1 : Appeler le webhook badge code

**Avant** :
```typescript
const { callWebhook } = await import('./services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
  utilisateur_id: user.id,
  badge_id: badgeId,
  user_email: user.email,
});
```

**Après** :
```typescript
import { callWebhookBadgeCode } from './services/webhookService';

await callWebhookBadgeCode(user.id, badgeId, user.email);
```

### Exemple 2 : Appeler le webhook GPS

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
  user_email: user.email,
  user_name: `${user.prenom} ${user.nom}`,
  // ... autres données
});
```

**Après** :
```typescript
import { callWebhookGPS } from '../services/webhookService';

await callWebhookGPS({
  user_email: user.email,
  user_name: `${user.prenom} ${user.nom}`,
  user_role: user.role,
  badge_code: numero_badge,
  timestamp: new Date().toISOString(),
  message: 'Badgeage sans données GPS - notification envoyée',
  gps_error_code: gpsErrorCode,
  gps_error_reason: gpsErrorReason,
  device_info: {
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  }
});
```

### Exemple 3 : Appeler le webhook oubli badgeage

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59', requestData);
```

**Après** :
```typescript
import { callWebhookOubliBadgeage } from '../services/webhookService';

await callWebhookOubliBadgeage(requestData);
```

## 🔒 Sécurité

### Authentification

Les fonctions vérifient automatiquement :
1. Que l'utilisateur est authentifié (`auth.uid() IS NOT NULL`)
2. Que l'utilisateur existe dans `appbadge_utilisateurs`
3. Que l'utilisateur est actif

### Autorisation

Les fonctions vérifient que :
- L'utilisateur authentifié correspond à l'utilisateur demandé, OU
- L'utilisateur est Admin/Manager

### Validation

Toutes les fonctions :
- Valident les paramètres requis
- Vérifient les types de données
- Gèrent les erreurs proprement
- Retournent un JSON avec `success` et `error`

## 🧪 Tests

### Tester dans l'éditeur SQL

```sql
-- Tester le webhook badge code
SELECT webhook_badge_code(
  'uuid-de-l-utilisateur'::uuid,
  'uuid-du-badge'::uuid,
  'email@example.com'
);

-- Tester le webhook GPS
SELECT webhook_gps('{
  "user_email": "email@example.com",
  "user_name": "John Doe",
  "message": "Test"
}'::jsonb);

-- Tester le webhook oubli badgeage
SELECT webhook_oubli_badgeage('{
  "utilisateur_id": "uuid-de-l-utilisateur",
  "date_heure_entree": "2025-01-01T08:00:00Z",
  "date_heure_sortie": "2025-01-01T18:00:00Z",
  "raison": "oubli_badge"
}'::jsonb);
```

### Tester depuis le client

Les fonctions sont automatiquement disponibles via `supabase.rpc()` une fois créées.

## 📝 Checklist de Migration

- [ ] Vérifier que l'extension `http` est activée (déjà fait dans appbadge_full_monolithic.sql)
- [ ] Exécuter `supabase_rpc_webhooks.sql` dans l'éditeur SQL
- [ ] Vérifier que les fonctions sont créées (Dashboard > Database > Functions)
- [ ] Mettre à jour `App.tsx` pour utiliser `callWebhookBadgeCode()`
- [ ] Mettre à jour `BadgeForm.tsx` pour utiliser `callWebhookBadgeCode()`
- [ ] Mettre à jour `UserDeck.tsx` pour utiliser `callWebhookGPS()` (3 occurrences)
- [ ] Mettre à jour `SessionEditForm.tsx` pour utiliser `callWebhookOubliBadgeage()`
- [ ] Tester tous les appels webhook
- [ ] Vérifier les logs dans Supabase Dashboard

## 🔄 Rollback

Si vous devez revenir en arrière, les anciennes fonctions `callWebhook()` sont toujours disponibles dans `webhookService.ts`.

## ⚠️ Notes Importantes

1. **Extension http** : L'extension `http` est déjà activée dans votre projet (voir `appbadge_full_monolithic.sql`)
2. **Permissions** : Les fonctions utilisent `SECURITY DEFINER` pour pouvoir faire des requêtes HTTP
3. **Timeouts** : Les requêtes HTTP peuvent avoir des timeouts (configurables via `http_set_curlopt`)
4. **Logs** : Les erreurs sont loggées dans les logs Supabase (Dashboard > Logs > Postgres Logs)
5. **Authentification** : Les fonctions vérifient automatiquement `auth.uid()` - l'utilisateur doit être authentifié

## 📚 Ressources

- [Documentation extension http PostgreSQL](https://www.postgresql.org/docs/current/http.html)
- [Fonctions RPC Supabase](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

