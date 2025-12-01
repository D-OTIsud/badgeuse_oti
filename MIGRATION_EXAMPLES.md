# Exemples de Migration des Webhooks vers les Fonctions RPC

> **Note** : Utilisez les fonctions RPC PostgreSQL (voir `RPC_WEBHOOKS_QUICK_START.md`).
> Ce fichier montre comment migrer vers les nouvelles fonctions RPC.

Ce fichier contient des exemples concrets pour migrer chaque appel webhook vers les fonctions RPC.

## 1. App.tsx - Webhook Badge Code

### Avant
```typescript
// App.tsx ligne ~113
const { callWebhook } = await import('./services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
  utilisateur_id: user.id,
  badge_id: badgeId,
  user_email: user.email,
});
```

### Après (Fonctions RPC)
```typescript
// App.tsx ligne ~113
import { callWebhookBadgeCode } from './services/webhookService';
await callWebhookBadgeCode(user.id, badgeId, user.email);
```

## 2. BadgeForm.tsx - Webhook Badge Code

### Avant
```typescript
// BadgeForm.tsx ligne ~266
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
  utilisateur_id: utilisateur.id,
  badge_id: activeBadgeId,
  user_email: utilisateur.email,
});
```

### Après (Fonctions RPC)
```typescript
// BadgeForm.tsx ligne ~266
import { callWebhookBadgeCode } from '../services/webhookService';
await callWebhookBadgeCode(utilisateur.id, activeBadgeId, utilisateur.email);
```

## 3. UserDeck.tsx - Webhook GPS (3 occurrences)

### Avant
```typescript
// UserDeck.tsx ligne ~500, ~560, ~612
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
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

### Après (Fonctions RPC)
```typescript
// UserDeck.tsx ligne ~500, ~560, ~612
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

## 4. SessionEditForm.tsx - Webhook Oubli Badgeage

### Avant
```typescript
// SessionEditForm.tsx ligne ~213
const { callWebhook } = await import('../services/webhookService');
await callWebhook('https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59', requestData).catch(err => {
  console.error('Error sending to n8n webhook:', err);
  // Don't fail the request if n8n fails
});
```

### Après (Fonctions RPC)
```typescript
// SessionEditForm.tsx ligne ~213
import { callWebhookOubliBadgeage } from '../services/webhookService';
await callWebhookOubliBadgeage(requestData).catch(err => {
  console.error('Error sending to n8n webhook:', err);
  // Don't fail the request if n8n fails
});
```

## 🔄 Script de Remplacement Automatique

Si vous utilisez un éditeur avec recherche/remplacement :

1. **Ajouter les imports en haut du fichier** :
   ```typescript
   import { callWebhookBadgeCode, callWebhookGPS, callWebhookOubliBadgeage } from './services/webhookService';
   ```

2. **Remplacer les appels badge-code** :
   - Rechercher : `await callWebhook('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874'`
   - Remplacer par : `await callWebhookBadgeCode(`
   - Ajuster les paramètres : `user.id, badgeId, user.email`
   
3. **Remplacer les appels GPS** :
   - Rechercher : `await callWebhook('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55'`
   - Remplacer par : `await callWebhookGPS(`
   - Garder l'objet de données tel quel
   
4. **Remplacer les appels oubli-badgeage** :
   - Rechercher : `await callWebhook('https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59'`
   - Remplacer par : `await callWebhookOubliBadgeage(`
   - Garder l'objet requestData tel quel

## ⚠️ Notes Importantes

- **Authentification requise** : Les utilisateurs doivent être authentifiés via Supabase Auth pour que les fonctions fonctionnent
- **Gestion d'erreurs** : Les fonctions retournent `null` en cas d'erreur, vérifiez les logs dans la console
- **Rate limiting** : Le rate limiting côté client est toujours actif, mais les fonctions Edge peuvent aussi implémenter leur propre rate limiting

