# Guide Rapide : Fonctions RPC pour Webhooks

## ✅ Avantages des Fonctions RPC

- **Plus simple** : Pas besoin de CLI, pas de déploiement - création directe dans l'éditeur SQL
- **Direct** : Création dans l'éditeur SQL de Supabase (pas de fichiers Deno)
- **Authentification automatique** : Utilise `auth.uid()` de Supabase
- **Moins de latence** : Exécution directe dans la base de données (pas de cold start)
- **Utilise l'extension http** : Déjà disponible dans votre projet

## 🚀 Installation en 3 Étapes

### Étape 1 : Ouvrir l'éditeur SQL

1. Allez dans votre projet Supabase (dashboard)
2. Cliquez sur **SQL Editor** dans le menu de gauche
3. Cliquez sur **New query** (ou utilisez le raccourci clavier)

### Étape 2 : Copier et exécuter le script

1. Ouvrez le fichier `supabase_rpc_webhooks.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **Run** (ou `Ctrl+Enter`)

### Étape 3 : Vérifier

Exécutez cette requête pour vérifier que les fonctions sont créées :

```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('webhook_badge_code', 'webhook_gps', 'webhook_oubli_badgeage')
ORDER BY proname;
```

Vous devriez voir 3 fonctions listées :
- `webhook_badge_code(uuid, uuid, text)`
- `webhook_gps(jsonb)`
- `webhook_oubli_badgeage(jsonb)`

## 📝 Utilisation dans le Code

### Exemple 1 : Webhook Badge Code

**Avant** :
```typescript
const { callWebhook } = await import('./services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/...', {
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

### Exemple 2 : Webhook GPS

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/...', webhookData);
```

**Après** :
```typescript
import { callWebhookGPS } from '../services/webhookService';
await callWebhookGPS(webhookData);
```

### Exemple 3 : Webhook Oubli Badgeage

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/...', requestData);
```

**Après** :
```typescript
import { callWebhookOubliBadgeage } from '../services/webhookService';
await callWebhookOubliBadgeage(requestData);
```

## 🧪 Test Direct dans SQL

Vous pouvez tester directement dans l'éditeur SQL :

```sql
-- Tester le webhook badge code (remplacez les UUIDs)
SELECT webhook_badge_code(
  'uuid-utilisateur'::uuid,
  'uuid-badge'::uuid,
  'email@example.com'
);

-- Tester le webhook GPS
SELECT webhook_gps('{
  "user_email": "email@example.com",
  "message": "Test"
}'::jsonb);
```

## 🔒 Sécurité

Les fonctions vérifient automatiquement :
- ✅ Authentification utilisateur (`auth.uid()`)
- ✅ Permissions (utilisateur lui-même ou Admin/Manager)
- ✅ Validation des paramètres

## 📚 Documentation Complète

Voir `RPC_WEBHOOKS_GUIDE.md` pour plus de détails.

