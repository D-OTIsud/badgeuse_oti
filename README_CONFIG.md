# Configuration Supabase - Badgeuse OTI (Vite)

## 📁 Fichiers de configuration créés

### 1. `supabase_config.env` - Variables d'environnement Vite
Fichier contenant toutes vos clés Supabase avec le préfixe `VITE_`.

### 2. `supabase.config.ts` - Configuration TypeScript
Fichier de configuration avec classe utilitaire pour les appels API, utilisant `import.meta.env`.

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
VITE_SUPABASE_URL=https://supabertel.otisud.re

# Clé anonyme (anon key) - OBLIGATOIRE
VITE_SUPABASE_ANON_KEY=votre_vraie_clé_anon_ici

# Clé de service (service_role key) - OPTIONNEL
VITE_SUPABASE_SERVICE_ROLE_KEY=votre_vraie_clé_service_role_ici

# Clé JWT secrète - OPTIONNEL
VITE_SUPABASE_JWT_SECRET=votre_vraie_jwt_secret_ici
```

**⚠️ IMPORTANT :** Avec Vite, toutes les variables d'environnement doivent commencer par `VITE_` pour être accessibles côté client.

### Étape 3 : Récupérer vos clés Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre projet
3. Allez dans **Settings** → **API**
4. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

## 💻 Utilisation dans votre code

### Option 1 : Utiliser la classe SupabaseAPI (Recommandé)

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

### Option 2 : Utiliser directement les variables Vite

```typescript
// Accès direct aux variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/appbadge_kpi_bundle_year`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  },
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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
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
VITE_SUPABASE_URL=https://supabertel.otisud.re
VITE_SUPABASE_ANON_KEY=votre_clé_dev
NODE_ENV=development
```

### Production (.env.production)
```env
VITE_SUPABASE_URL=https://supabertel.otisud.re
VITE_SUPABASE_ANON_KEY=votre_clé_prod
NODE_ENV=production
```

## 🛡️ Sécurité

### ✅ À faire
- Utiliser des variables d'environnement avec préfixe `VITE_`
- Limiter l'accès aux clés sensibles
- Utiliser des clés différentes par environnement
- Vérifier les permissions RLS dans Supabase

### ❌ À ne pas faire
- Commiter les clés dans Git
- Exposer les clés dans le code client
- Utiliser la clé service_role côté client
- Partager les clés publiquement
- Oublier le préfixe `VITE_` pour les variables côté client

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

### Test des variables Vite
```typescript
// Dans votre composant React/Vue
console.log('URL Supabase:', import.meta.env.VITE_SUPABASE_URL);
console.log('Clé anon:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// Vérifiez que les variables sont bien définies
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('VITE_SUPABASE_ANON_KEY n\'est pas définie !');
}
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
- Vérifiez que `VITE_SUPABASE_ANON_KEY` est bien définie

### Erreur 403 (Forbidden)
- Vérifiez les politiques RLS
- Vérifiez les permissions de votre utilisateur

### Erreur 404 (Not Found)
- Vérifiez l'URL de votre instance
- Vérifiez que les fonctions existent

### Variables d'environnement non définies
- Vérifiez que vos variables commencent par `VITE_`
- Vérifiez que le fichier `.env` est bien chargé
- Redémarrez votre serveur de développement

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez la console du navigateur
2. Vérifiez les logs Supabase
3. Testez avec curl ou Postman
4. Consultez la documentation Supabase
5. Vérifiez que vos variables Vite sont bien définies

## 🔄 Mise à jour

Pour mettre à jour la configuration :
1. Modifiez `supabase_config.env`
2. Copiez vers `.env` ou `.env.local`
3. Redémarrez votre serveur de développement
4. Testez avec une fonction simple

## 🌟 Avantages de Vite

- **Hot Reload** : Les changements dans `.env` sont automatiquement pris en compte
- **Sécurité** : Seules les variables `VITE_` sont exposées côté client
- **Performance** : Variables d'environnement optimisées pour le build
- **Développement** : Support natif des fichiers `.env.local`
