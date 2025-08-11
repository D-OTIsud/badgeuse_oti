# Configuration Supabase - Badgeuse OTI

## 📁 Fichiers de configuration créés

### 1. `supabase_config.env` - Variables d'environnement
Fichier contenant toutes vos clés Supabase et configurations.

### 2. `supabase.config.ts` - Configuration TypeScript
Fichier de configuration avec classe utilitaire pour les appels API.

### 3. `.gitignore` - Protection des clés
Empêche le commit accidentel de vos clés sensibles.

## 🚀 Installation et configuration

### Étape 1 : Copier le fichier de configuration
```bash
# Copier le fichier d'exemple
cp supabase_config.env .env

# Ou créer un fichier .env.local pour le développement
cp supabase_config.env .env.local
```

### Étape 2 : Remplir vos vraies clés
Éditez le fichier `.env` et remplacez les valeurs par vos vraies clés :

```env
# URL de votre instance Supabase
SUPABASE_URL=https://supabertel.otisud.re

# Clé anonyme (anon key) - OBLIGATOIRE
SUPABASE_ANON_KEY=votre_vraie_clé_anon_ici

# Clé de service (service_role key) - OPTIONNEL
SUPABASE_SERVICE_ROLE_KEY=votre_vraie_clé_service_role_ici

# Clé JWT secrète - OPTIONNEL
SUPABASE_JWT_SECRET=votre_vraie_jwt_secret_ici
```

### Étape 3 : Récupérer vos clés Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre projet
3. Allez dans **Settings** → **API**
4. Copiez :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

## 💻 Utilisation dans votre code

### Option 1 : Utiliser la classe SupabaseAPI

```typescript
import { supabaseAPI } from './supabase.config';

// Récupérer les KPIs pour l'année 2025
try {
  const kpiData = await supabaseAPI.getKPIBundleYear(2025);
  console.log('KPIs reçus:', kpiData);
} catch (error) {
  console.error('Erreur:', error);
}

// Récupérer les KPIs pour janvier 2025, service spécifique
const kpiMonth = await supabaseAPI.getKPIBundleMonth(2025, 1, {
  service: 'Service Accueil ',
  lieux: 'Siège'
});
```

### Option 2 : Utiliser directement fetch

```typescript
import { SUPABASE_CONFIG } from './supabase.config';

const response = await fetch(`${SUPABASE_CONFIG.rpcEndpoint}/appbadge_kpi_bundle_year`, {
  method: 'POST',
  headers: SUPABASE_CONFIG.defaultHeaders,
  body: JSON.stringify({
    p_year: 2025,
    p_utilisateur_id: null,
    p_lieux: null,
    p_service: null,
    p_role: null
  })
});

const data = await response.json();
```

### Option 3 : Utiliser le client Supabase officiel

```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';

const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Appel vers une fonction RPC
const { data, error } = await supabase.rpc('appbadge_kpi_bundle_year', {
  p_year: 2025,
  p_utilisateur_id: null,
  p_lieux: null,
  p_service: null,
  p_role: null
});
```

## 🔧 Configuration pour différents environnements

### Développement (.env.local)
```env
SUPABASE_URL=https://supabertel.otisud.re
SUPABASE_ANON_KEY=votre_clé_dev
NODE_ENV=development
```

### Production (.env.production)
```env
SUPABASE_URL=https://supabertel.otisud.re
SUPABASE_ANON_KEY=votre_clé_prod
NODE_ENV=production
```

## 🛡️ Sécurité

### ✅ À faire
- Utiliser des variables d'environnement
- Limiter l'accès aux clés sensibles
- Utiliser des clés différentes par environnement
- Vérifier les permissions RLS dans Supabase

### ❌ À ne pas faire
- Commiter les clés dans Git
- Exposer les clés dans le code client
- Utiliser la clé service_role côté client
- Partager les clés publiquement

## 🧪 Test de la configuration

### Test simple avec curl
```bash
curl -X POST 'https://supabertel.otisud.re/rest/v1/rpc/appbadge_kpi_bundle_year' \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_CLÉ_ANON" \
  -H "Authorization: Bearer VOTRE_CLÉ_ANON" \
  -d '{"p_year": 2025}'
```

### Test dans le navigateur
```javascript
// Dans la console du navigateur
fetch('https://supabertel.otisud.re/rest/v1/rpc/appbadge_kpi_bundle_year', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'VOTRE_CLÉ_ANON',
    'Authorization': 'Bearer VOTRE_CLÉ_ANON'
  },
  body: JSON.stringify({ p_year: 2025 })
})
.then(response => response.json())
.then(data => console.log('Succès:', data))
.catch(error => console.error('Erreur:', error));
```

## 🚨 Dépannage

### Erreur "Les fonctions SQL ne sont pas encore disponibles"
1. Vérifiez que vos clés sont correctes
2. Vérifiez que les fonctions existent dans Supabase
3. Vérifiez les permissions RLS
4. Vérifiez la console du navigateur pour les erreurs

### Erreur 401 (Unauthorized)
- Vérifiez votre clé anon
- Vérifiez que la clé n'a pas expiré

### Erreur 403 (Forbidden)
- Vérifiez les politiques RLS
- Vérifiez les permissions de votre utilisateur

### Erreur 404 (Not Found)
- Vérifiez l'URL de votre instance
- Vérifiez que les fonctions existent

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez la console du navigateur
2. Vérifiez les logs Supabase
3. Testez avec curl ou Postman
4. Consultez la documentation Supabase

## 🔄 Mise à jour

Pour mettre à jour la configuration :
1. Modifiez `supabase_config.env`
2. Copiez vers `.env` ou `.env.local`
3. Redémarrez votre application
4. Testez avec une fonction simple
