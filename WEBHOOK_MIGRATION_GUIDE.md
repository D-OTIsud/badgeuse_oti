# Guide de Migration des Webhooks vers des Fonctions RPC PostgreSQL

> **⚠️ Note** : Ce guide a été remplacé par `RPC_WEBHOOKS_GUIDE.md` et `RPC_WEBHOOKS_QUICK_START.md`.
> Les fonctions RPC PostgreSQL sont la méthode recommandée car elles sont plus simples et plus directes.

## Méthode Recommandée : Fonctions RPC PostgreSQL

**Voir** :
- `RPC_WEBHOOKS_QUICK_START.md` - Guide rapide (3 minutes)
- `RPC_WEBHOOKS_GUIDE.md` - Guide complet

Les fonctions RPC peuvent être créées directement dans l'éditeur SQL de Supabase, sans besoin de CLI ou de déploiement.

---

## Ancienne Méthode : Edge Functions (Dépréciée)

> ⚠️ Cette méthode est dépréciée. Utilisez les fonctions RPC à la place.

Ce guide explique comment migrer les appels webhook directs vers des Supabase Edge Functions sécurisées.

## 🎯 Pourquoi migrer ?

**Avant** : Les webhooks étaient appelés directement depuis le client, ce qui permettait :
- La manipulation via DevTools
- L'usurpation d'identité
- Le contournement du rate limiting
- L'exposition des URLs de webhook

**Après** : Les webhooks sont appelés via des Edge Functions qui :
- Vérifient l'authentification
- Valident les permissions utilisateur
- Protègent les URLs de webhook
- Implémentent un rate limiting côté serveur

## 📋 Prérequis

1. **Supabase CLI installé** :
   ```bash
   npm install -g supabase
   ```

2. **Authentification Supabase configurée** :
   - Les utilisateurs doivent être authentifiés via Supabase Auth
   - Les tokens JWT sont utilisés pour l'authentification

## 🚀 Étapes de Migration

### 1. Déployer les Edge Functions

Les fonctions Edge ont été créées dans `supabase/functions/` :

- `webhook-badge-code` : Pour la génération de code badge
- `webhook-gps` : Pour les notifications GPS
- `webhook-oubli-badgeage` : Pour les oublis de badgeage

#### Déployer les fonctions :

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref your-project-ref

# Déployer toutes les fonctions
supabase functions deploy webhook-badge-code
supabase functions deploy webhook-gps
supabase functions deploy webhook-oubli-badgeage
```

### 2. Configurer les Variables d'Environnement

Dans le dashboard Supabase, allez dans **Settings > Edge Functions** et ajoutez :

```
WEBHOOK_BADGE_CODE_URL=https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874
WEBHOOK_GPS_URL=https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55
WEBHOOK_OUBLI_BADGEAGE_URL=https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59
```

### 3. Mettre à jour le Code Client

#### Exemple : App.tsx

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
const { callWebhookViaFunction } = await import('./services/webhookService');
await callWebhookViaFunction('webhook-badge-code', {
  utilisateur_id: user.id,
  badge_id: badgeId,
  user_email: user.email,
});
```

#### Exemple : UserDeck.tsx (webhook GPS)

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
  user_email: user.email,
  // ... autres données
});
```

**Après** :
```typescript
const { callWebhookViaFunction } = await import('../services/webhookService');
await callWebhookViaFunction('webhook-gps', {
  user_email: user.email,
  // ... autres données
});
```

#### Exemple : SessionEditForm.tsx (oubli badgeage)

**Avant** :
```typescript
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59', requestData);
```

**Après** :
```typescript
const { callWebhookViaFunction } = await import('../services/webhookService');
await callWebhookViaFunction('webhook-oubli-badgeage', requestData);
```

## 🔒 Sécurité

### Authentification

Les Edge Functions vérifient :
1. La présence d'un token JWT dans le header `Authorization`
2. La validité du token via `supabase.auth.getUser()`
3. Que l'utilisateur existe dans la base de données

### Autorisation

Les fonctions vérifient que :
- L'utilisateur authentifié correspond à l'utilisateur demandé, OU
- L'utilisateur est Admin/Manager

### Validation

Toutes les fonctions :
- Valident les champs requis
- Vérifient les types de données
- Gèrent les erreurs proprement

## 🧪 Tests

### Tester localement

```bash
# Démarrer Supabase localement
supabase start

# Tester une fonction
supabase functions serve webhook-badge-code

# Appeler la fonction
curl -X POST http://localhost:54321/functions/v1/webhook-badge-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"utilisateur_id": "...", "badge_id": "...", "user_email": "..."}'
```

### Tester en production

Utilisez le dashboard Supabase ou Postman avec votre token JWT.

## 📝 Checklist de Migration

- [ ] Déployer les Edge Functions
- [ ] Configurer les variables d'environnement
- [ ] Mettre à jour `App.tsx` (webhook badge-code)
- [ ] Mettre à jour `UserDeck.tsx` (webhook GPS - 3 occurrences)
- [ ] Mettre à jour `SessionEditForm.tsx` (webhook oubli-badgeage)
- [ ] Mettre à jour `BadgeForm.tsx` (webhook badge-code)
- [ ] Tester tous les appels webhook
- [ ] Vérifier les logs dans Supabase Dashboard
- [ ] Désactiver les anciens appels directs (optionnel)

## 🔄 Rollback

Si vous devez revenir en arrière, les anciennes fonctions `callWebhook()` sont toujours disponibles dans `webhookService.ts`. Il suffit de remplacer `callWebhookViaFunction()` par `callWebhook()`.

## 📚 Ressources

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Exemples de Edge Functions](https://github.com/supabase/supabase/tree/master/examples/edge-functions)
- [Authentification dans Edge Functions](https://supabase.com/docs/guides/functions/auth)

