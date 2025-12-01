# Recommandations de Sécurité

Ce document décrit les améliorations de sécurité apportées et les recommandations pour renforcer la sécurité de l'application.

## ✅ Corrections Apportées

### 1. Contrôle d'accès administrateur
- **Avant** : `isAdmin` était forcé à `true`, rendant l'interface d'administration accessible à tous
- **Après** : Utilisation de `checkIsAdmin()` qui vérifie le rôle via Supabase Auth et la fonction RPC `is_admin()`
- **Fichiers modifiés** :
  - `src/App.tsx` : Remplacement de `const isAdmin = true` par un état dynamique vérifié via `checkIsAdmin()`
  - `src/services/authService.ts` : Nouveau service pour vérifier les rôles utilisateur

### 2. Protection des webhooks
- **Avant** : Appels webhook non authentifiés, sans rate limiting
- **Après** : Service `webhookService.ts` avec :
  - Rate limiting (10 appels/minute par URL)
  - Validation des URLs (HTTPS uniquement)
  - Timeout (10 secondes max)
  - Gestion d'erreurs améliorée
- **Fichiers modifiés** :
  - `src/services/webhookService.ts` : Nouveau service
  - `src/App.tsx`, `src/components/BadgeForm.tsx`, `src/components/UserDeck.tsx`, `src/components/SessionEditForm.tsx` : Utilisation du service sécurisé

### 3. Vérification IP renforcée
- **Avant** : Autorisation par défaut en cas d'erreur, logique CIDR simplifiée
- **Après** :
  - Principe de moindre privilège : refus d'accès par défaut en cas d'erreur
  - Timeout sur les requêtes IP (5 secondes)
  - Gestion d'erreurs améliorée
- **Fichiers modifiés** :
  - `src/services/ipService.ts` : Amélioration de `getUserIP()` et `checkIPAuthorization()`
  - `src/App.tsx` : Gestion d'erreur améliorée

## ⚠️ Recommandations Prioritaires

### 1. Politiques RLS (Row Level Security) Supabase

**CRITIQUE** : Vérifier et renforcer les politiques RLS pour toutes les tables sensibles.

#### Tables à sécuriser :
- `appbadge_badgeages` : Les utilisateurs ne doivent pouvoir voir/modifier que leurs propres badgeages
- `appbadge_utilisateurs` : Limiter l'accès aux informations sensibles
- `appbadge_session_modifs` : Les utilisateurs ne doivent voir que leurs propres modifications
- `appbadge_oubli_badgeages` : Les utilisateurs ne doivent voir que leurs propres demandes
- `appbadge_badges` : Limiter l'accès aux codes de badge

#### Exemple de politique RLS recommandée :

```sql
-- Exemple pour appbadge_badgeages
ALTER TABLE appbadge_badgeages ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres badgeages
CREATE POLICY "Users can view own badgeages"
  ON appbadge_badgeages
  FOR SELECT
  USING (auth.uid() = utilisateur_id);

-- Les utilisateurs peuvent insérer leurs propres badgeages
CREATE POLICY "Users can insert own badgeages"
  ON appbadge_badgeages
  FOR INSERT
  WITH CHECK (auth.uid() = utilisateur_id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all badgeages"
  ON appbadge_badgeages
  FOR SELECT
  USING (is_admin());

-- Les admins peuvent modifier
CREATE POLICY "Admins can update all badgeages"
  ON appbadge_badgeages
  FOR UPDATE
  USING (is_admin());
```

#### Vérification des politiques existantes :
```sql
-- Lister toutes les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 2. Webhooks côté serveur ✅ IMPLÉMENTÉ

**Solution implémentée** : Fonctions RPC PostgreSQL pour appeler les webhooks

**Avantages** :
- ✅ URLs de webhook protégées (non exposées au client)
- ✅ Vérification d'authentification et d'autorisation automatique
- ✅ Validation des données
- ✅ Gestion d'erreurs centralisée
- ✅ Simple à déployer (éditeur SQL de Supabase)

**Architecture** :
```
Client → Supabase RPC Function (authentifiée via auth.uid()) → Webhook n8n
```

**Fichiers** :
- `supabase_rpc_webhooks.sql` - Fonctions RPC à créer dans l'éditeur SQL
- `src/services/webhookService.ts` - Service client pour appeler les RPC
- `RPC_WEBHOOKS_QUICK_START.md` - Guide d'installation rapide

**Recommandations supplémentaires** :
1. Ajouter une signature HMAC côté n8n pour vérifier l'origine des requêtes
2. Implémenter un rate limiting côté serveur (peut être ajouté dans les fonctions RPC)
3. Monitorer les appels webhook dans les logs Supabase

### 3. Amélioration du contrôle IP

**Problèmes restants** :
- Dépendance à un service externe (`api.ipify.org`)
- Logique CIDR simplifiée (comparaison d'octets seulement)
- Pas de vérification de l'intégrité de la réponse

**Recommandations** :
1. Utiliser une bibliothèque fiable pour la vérification CIDR (ex: `ip-range-check`)
2. Implémenter un cache côté serveur pour les vérifications IP
3. Ajouter une vérification de signature pour les réponses du service IP
4. Considérer l'utilisation d'un service IP géolocalisé plus fiable (ex: MaxMind, Cloudflare)

### 4. Authentification renforcée

**Recommandations** :
1. Implémenter une authentification obligatoire pour toutes les actions sensibles
2. Utiliser Supabase Auth avec vérification de session à chaque requête
3. Ajouter des tokens JWT avec expiration courte
4. Implémenter un refresh token sécurisé

### 5. Validation des données

**Recommandations** :
1. Valider toutes les entrées utilisateur côté serveur (pas seulement côté client)
2. Utiliser des schémas de validation (ex: Zod, Yup)
3. Sanitizer les données avant insertion en base
4. Implémenter des limites de taille pour les champs texte

### 6. Logging et monitoring

**Recommandations** :
1. Logger toutes les tentatives d'accès non autorisées
2. Monitorer les appels webhook suspects
3. Alerter en cas de rate limiting déclenché
4. Tracer les modifications de données sensibles

### 7. Secrets et configuration

**Recommandations** :
1. Ne jamais exposer les clés API dans le code client
2. Utiliser des variables d'environnement pour tous les secrets
3. Implémenter une rotation régulière des secrets
4. Utiliser Supabase Vault pour les secrets sensibles

## 📋 Checklist de Sécurité

- [x] Correction de `isAdmin` forcé à `true`
- [x] Ajout de rate limiting pour les webhooks
- [x] Amélioration de la vérification IP (principe de moindre privilège)
- [ ] Vérification et renforcement des politiques RLS
- [ ] Déplacement des webhooks côté serveur
- [ ] Amélioration de la logique CIDR
- [ ] Ajout de logging et monitoring
- [ ] Audit de sécurité complet

## 🔒 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)

