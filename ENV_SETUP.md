# Configuration des Variables d'Environnement

## 🔒 Sécurité

**⚠️ IMPORTANT** : Ne jamais commiter les fichiers `.env` avec des valeurs réelles sur GitHub.

Les fichiers suivants sont ignorés par Git (voir `.gitignore`) :
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`

## 📋 Configuration Requise

### 1. Variables d'Environnement Client (Vite)

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici

# Webhooks n8n (pour les appels directs - legacy)
# Note: Les fonctions RPC utilisent leurs propres URLs configurées dans Supabase
VITE_WEBHOOK_BADGE_CODE_URL=https://n8n.otisud.re/webhook/xxx
VITE_WEBHOOK_GPS_URL=https://n8n.otisud.re/webhook/xxx
VITE_WEBHOOK_OUBLI_BADGEAGE_URL=https://n8n.otisud.re/webhook/xxx
```

**Note** : Toutes les variables côté client doivent commencer par `VITE_` pour être accessibles dans le navigateur.

### 2. Configuration des Webhooks dans Supabase (Fonctions RPC)

Les fonctions RPC PostgreSQL utilisent des variables de configuration Supabase pour les URLs de webhook.

#### Option A : Via l'éditeur SQL (Recommandé)

Exécutez ces commandes dans l'éditeur SQL de Supabase :

```sql
-- Configurer les URLs des webhooks
ALTER DATABASE postgres SET app.webhook_badge_code_url = 'https://n8n.otisud.re/webhook/votre-url-badge-code';
ALTER DATABASE postgres SET app.webhook_gps_url = 'https://n8n.otisud.re/webhook/votre-url-gps';
ALTER DATABASE postgres SET app.webhook_oubli_badgeage_url = 'https://n8n.otisud.re/webhook/votre-url-oubli-badgeage';
```

#### Option B : Via une Table de Configuration

Créez une table de configuration dans Supabase :

```sql
CREATE TABLE IF NOT EXISTS appbadge_webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_name text UNIQUE NOT NULL,
  webhook_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insérer les URLs
INSERT INTO appbadge_webhook_config (webhook_name, webhook_url) VALUES
  ('badge_code', 'https://n8n.otisud.re/webhook/votre-url-badge-code'),
  ('gps', 'https://n8n.otisud.re/webhook/votre-url-gps'),
  ('oubli_badgeage', 'https://n8n.otisud.re/webhook/votre-url-oubli-badgeage')
ON CONFLICT (webhook_name) DO UPDATE SET webhook_url = EXCLUDED.webhook_url;
```

Puis modifiez les fonctions RPC pour lire depuis cette table au lieu de `current_setting()`.

## 🚀 Déploiement

### Développement Local

1. Copiez `.env.example` vers `.env`
2. Remplissez les valeurs avec vos clés de développement
3. Redémarrez le serveur de développement Vite

### Production

1. Configurez les variables d'environnement dans votre plateforme de déploiement :
   - **Vercel** : Settings > Environment Variables
   - **Netlify** : Site settings > Environment variables
   - **Docker** : Variables d'environnement du conteneur

2. Configurez les variables Supabase pour les fonctions RPC (voir Option A ci-dessus)

## ✅ Vérification

Pour vérifier que les variables sont correctement configurées :

```typescript
// Dans la console du navigateur
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Webhook Badge Code:', import.meta.env.VITE_WEBHOOK_BADGE_CODE_URL);
```

## 🔍 Dépannage

### Variables non accessibles

- Vérifiez que les variables commencent par `VITE_`
- Redémarrez le serveur de développement après modification de `.env`
- Vérifiez que `.env` est bien à la racine du projet

### Erreurs de webhook

- Vérifiez que les URLs sont correctes et accessibles
- Vérifiez que les variables Supabase sont configurées pour les fonctions RPC
- Consultez les logs Supabase (Dashboard > Logs > Postgres Logs)

