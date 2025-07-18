# Badgeuse OTI

Application de badgeuse avec interface web (React + Vite) connectée à Supabase.

## Prérequis
- Node.js >= 18
- Accès à un projet Supabase (URL + clé anonyme)

## Lancement en local

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Copier `.env.example` en `.env` et remplir les variables Supabase.
3. Lancer le serveur de dev :
   ```bash
   npm run dev
   ```

## Build production

```bash
npm run build
```

## Lancer avec Docker

1. Construire l'image :
   ```bash
   docker build -t badgeuse-oti .
   ```
2. Lancer le conteneur :
   ```bash
   docker run -p 8080:80 --env-file .env badgeuse-oti
   ```

## Variables d'environnement

Créer un fichier `.env` à la racine avec :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Fonctionnalités
- Connexion utilisateur (Supabase Auth)
- Vue deck de tous les utilisateurs
- Badgeage avec code à 4 chiffres
- Message de succès/échec 