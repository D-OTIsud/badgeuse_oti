# Nettoyage de l'Historique Git - Informations Sensibles

> **Note** : Si vous préférez changer les secrets plutôt que de nettoyer l'historique Git, consultez `SECRETS_TO_CHANGE.md` pour une approche plus simple et moins risquée.

## ⚠️ Problème Identifié

Si des informations sensibles (URLs de webhook, clés API, etc.) ont été commitées dans l'historique Git, elles restent accessibles même après avoir été supprimées dans les commits récents.

**Deux approches possibles** :
1. **Changer les secrets** (recommandé) : Plus simple, moins risqué. Voir `SECRETS_TO_CHANGE.md`
2. **Nettoyer l'historique Git** : Plus complexe, destructif, nécessite coordination avec l'équipe. Voir ci-dessous.

## 🔍 Vérification de l'Historique

Pour vérifier si des informations sensibles sont présentes dans l'historique :

```bash
# Chercher les URLs de webhook n8n
git log --all --full-history -S "n8n.otisud.re" --pretty=format:"%H %s"

# Chercher les IDs de webhook spécifiques
git log --all --full-history -S "a83f4c49-f3a5-4573-9dfd-4ab52fed6874" --pretty=format:"%H %s"
git log --all --full-history -S "09c6d45a-fe1a-46ea-a951-1fb833065b55" --pretty=format:"%H %s"
git log --all --full-history -S "c76763d6-d579-4d20-975f-b70939b82c59" --pretty=format:"%H %s"

# Chercher les clés Supabase
git log --all --full-history -S "VITE_SUPABASE_ANON_KEY" --pretty=format:"%H %s"
git log --all --full-history -S "SUPABASE.*KEY" --pretty=format:"%H %s" -i

# Voir le contenu d'un commit spécifique
git show <commit-hash>
```

## 🛠️ Solutions pour Nettoyer l'Historique

### Option 1 : BFG Repo-Cleaner (Recommandé - Plus Simple)

BFG est un outil spécialisé pour nettoyer l'historique Git de manière sécurisée.

#### Installation

```bash
# Windows (avec Chocolatey)
choco install bfg

# Ou télécharger depuis https://rtyley.github.io/bfg-repo-cleaner/
```

#### Utilisation

1. **Créer une liste de fichiers/mots à supprimer** :

Créez un fichier `sensitive-data.txt` :
```
n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874
n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55
n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59
supabertel.otisud.re
```

2. **Nettoyer l'historique** :

```bash
# Cloner le repo en miroir (nécessaire pour BFG)
git clone --mirror https://github.com/votre-username/badgeuse_oti.git badgeuse_oti-clean.git

# Nettoyer avec BFG
cd badgeuse_oti-clean.git
bfg --replace-text ../sensitive-data.txt

# Nettoyer les références
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Pousser les changements (⚠️ DESTRUCTIF - nécessite force push)
git push --force
```

### Option 2 : git filter-branch (Natif Git)

```bash
# Supprimer un fichier spécifique de tout l'historique
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Remplacer du texte dans tout l'historique
git filter-branch --force --tree-filter \
  'find . -type f -exec sed -i "s/old-sensitive-url/new-placeholder/g" {} \;' \
  --prune-empty --tag-name-filter cat -- --all

# Nettoyer
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 3 : git-filter-repo (Moderne, Recommandé par Git)

```bash
# Installation
pip install git-filter-repo

# Supprimer un fichier de tout l'historique
git filter-repo --path .env --invert-paths

# Remplacer du texte
git filter-repo --replace-text sensitive-replacements.txt
```

Où `sensitive-replacements.txt` contient :
```
n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874==>REDACTED_WEBHOOK_URL_1
n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55==>REDACTED_WEBHOOK_URL_2
n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59==>REDACTED_WEBHOOK_URL_3
```

## ⚠️ Avertissements Importants

### Avant de Nettoyer

1. **Sauvegarder le repository** :
   ```bash
   git clone --mirror https://github.com/votre-username/badgeuse_oti.git backup-badgeuse-oti.git
   ```

2. **Coordonner avec l'équipe** : Tous les développeurs devront re-cloner le repository après le nettoyage.

3. **Vérifier les branches** : Assurez-vous de nettoyer toutes les branches (y compris les branches distantes).

### Après le Nettoyage

1. **Tous les développeurs doivent** :
   ```bash
   # Supprimer l'ancien clone local
   rm -rf badgeuse_oti
   
   # Re-cloner le repository
   git clone https://github.com/votre-username/badgeuse_oti.git
   ```

2. **Vérifier que le nettoyage a fonctionné** :
   ```bash
   git log --all --full-history -S "n8n.otisud.re" --pretty=format:"%H %s"
   # Ne devrait rien retourner
   ```

3. **Changer les secrets exposés** :
   - Si des URLs de webhook ont été exposées, **changez-les dans n8n**
   - Si des clés API ont été exposées, **régénérez-les dans Supabase**

## 🔒 Prévention Future

1. **Utiliser `.gitignore`** (déjà fait) :
   - `.env`
   - `.env.*`
   - `*.key`
   - `*.pem`

2. **Utiliser Git Hooks** :
   Créez `.git/hooks/pre-commit` :
   ```bash
   #!/bin/sh
   # Empêcher les commits avec des patterns sensibles
   if git diff --cached | grep -E "(n8n\.otisud\.re|VITE_SUPABASE_ANON_KEY|webhook/[a-f0-9-]{36})"; then
     echo "❌ ERREUR: Tentative de commit d'informations sensibles détectée!"
     exit 1
   fi
   ```

3. **Utiliser `git-secrets`** (AWS) :
   ```bash
   git secrets --install
   git secrets --register-aws
   git secrets --add 'n8n\.otisud\.re'
   ```

4. **Scanner avant de pousser** :
   ```bash
   # Ajouter dans package.json
   "scripts": {
     "pre-push": "git-secrets --scan"
   }
   ```

## 📋 Checklist de Nettoyage

- [ ] Vérifier l'historique pour les informations sensibles
- [ ] Créer une sauvegarde complète du repository
- [ ] Choisir une méthode de nettoyage (BFG recommandé)
- [ ] Exécuter le nettoyage
- [ ] Vérifier que le nettoyage a fonctionné
- [ ] Force push vers GitHub (⚠️ DESTRUCTIF)
- [ ] Informer l'équipe de re-cloner
- [ ] Changer tous les secrets exposés (webhooks, clés API)
- [ ] Mettre en place des protections (git hooks, git-secrets)

## 🆘 En Cas de Problème

Si le nettoyage échoue ou cause des problèmes :

1. **Restaurer depuis la sauvegarde** :
   ```bash
   git clone backup-badgeuse-oti.git badgeuse_oti-restored
   ```

2. **Consulter la documentation** :
   - [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
   - [git-filter-repo](https://github.com/newren/git-filter-repo)
   - [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## 📝 Notes

- Le nettoyage de l'historique Git est **irréversible** et **destructif**
- Tous les développeurs devront re-cloner le repository
- Les Pull Requests ouvertes devront être re-créées
- Les secrets exposés doivent être **changés immédiatement**, même après le nettoyage

