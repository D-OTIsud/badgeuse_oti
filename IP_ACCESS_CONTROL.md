# Système de Contrôle d'Accès par IP

## Vue d'ensemble

Le système de contrôle d'accès par IP vérifie automatiquement si l'IP de l'utilisateur est autorisée. Si l'IP n'est pas dans la liste des IPs autorisées, l'utilisateur est redirigé vers un formulaire de justification.

## Fonctionnalités

### 1. Vérification IP Automatique
- Vérification de l'IP de l'utilisateur au chargement de l'application
- Comparaison avec la liste des plages IP autorisées
- Affichage d'un message de chargement pendant la vérification

### 2. Formulaire pour IP Non Autorisée
- Formulaire dédié pour les utilisateurs avec IP non autorisée
- Champ de commentaire obligatoire pour justifier l'accès
- Enregistrement dans la table `appbadge_horaires_standards`
- Message de succès après enregistrement

### 3. Messages de Bienvenue Personnalisés
- Affichage du nom de l'emplacement dans le header
- Format : "Bienvenue au kit de badgeage - [Nom de l'emplacement]"

### 4. Contrôle NFC
- Vérification IP avant traitement des badges NFC
- Blocage des badges si IP non autorisée
- Messages d'erreur appropriés

## Configuration

### Emplacements Autorisés
Les adresses IP autorisées sont stockées dans la colonne `ip_address` de la table `appbadge_horaires_standards`. 

L'application vérifie automatiquement si l'IP de l'utilisateur est dans la liste des IPs autorisées et affiche le formulaire approprié.

### Structure de Base de Données

#### Table `appbadge_horaires_standards`
```sql
table public.appbadge_horaires_standards (
  id serial not null,
  lieux text not null,
  heure_debut time without time zone not null,
  heure_fin time without time zone null,
  ip_address text null,
  constraint appbadge_horaires_standards_pkey primary key (id),
  constraint appbadge_horaires_standards_lieux_key unique (lieux)
)
```

La colonne `ip_address` est utilisée pour stocker les adresses IP autorisées.

## Flux d'Utilisation

### 1. Accès Autorisé
1. L'utilisateur accède à l'application
2. Vérification automatique de l'IP
3. Affichage du message de bienvenue avec le nom de l'emplacement
4. Accès normal à l'application

### 2. Accès Non Autorisé
1. L'utilisateur accède à l'application
2. Vérification automatique de l'IP
3. Redirection vers le formulaire de justification
4. L'utilisateur doit expliquer pourquoi il accède depuis cet emplacement
5. Enregistrement de la demande avec l'IP et le commentaire
6. Message de succès et retour à l'accueil

### 3. Badge NFC
1. L'utilisateur scanne un badge NFC
2. Vérification IP avant traitement
3. Si autorisé : traitement normal du badge
4. Si non autorisé : message d'erreur et blocage

## Composants

### `UnauthorizedIPForm.tsx`
- Formulaire pour les utilisateurs avec IP non autorisée
- Champ de commentaire obligatoire
- Enregistrement dans Supabase
- Interface utilisateur intuitive

### `ipService.ts`
- Service de détection d'IP
- Récupération des IPs autorisées depuis la base de données
- Fonctions de vérification et de comparaison IP
- Messages de bienvenue personnalisés

### Modifications App.tsx
- Intégration de la vérification IP
- Gestion des états de chargement
- Routage conditionnel selon l'autorisation IP

### Modifications Header.tsx
- Support des messages de bienvenue personnalisés
- Affichage responsive du nom de l'emplacement

### Modifications UserDeck.tsx
- Vérification IP avant traitement NFC
- Messages d'erreur appropriés

## Sécurité

### Limitations
- La vérification IP côté client peut être contournée
- Pour une sécurité renforcée, implémentez la vérification côté serveur
- Les plages IP peuvent changer, nécessitant une mise à jour de la configuration

### Recommandations
1. Utilisez des plages IP privées pour les réseaux internes
2. Configurez correctement les plages IP selon vos emplacements
3. Surveillez les tentatives d'accès non autorisées
4. Considérez l'ajout d'une authentification supplémentaire

## Personnalisation

### Gestion des IPs Autorisées
La gestion des IPs autorisées se fait directement dans la base de données. L'application se contente de vérifier si l'IP de l'utilisateur est autorisée et affiche le formulaire approprié.

### Modification des Messages
- Modifiez les messages dans `ipService.ts` (fonction `getWelcomeMessage`)
- Personnalisez les messages d'erreur dans les composants

### Style et Interface
- Les composants utilisent des styles inline pour la simplicité
- Personnalisez les couleurs et styles selon votre charte graphique
- L'interface est responsive et s'adapte aux différentes tailles d'écran

## Dépannage

### Problèmes Courants
1. **IP non détectée** : Vérifiez la connectivité réseau
2. **Accès bloqué incorrectement** : Vérifiez les plages IP configurées
3. **Erreurs de base de données** : Vérifiez la structure de la table

### Logs et Debug
- Les erreurs sont loggées dans la console du navigateur
- Utilisez les outils de développement pour déboguer
- Vérifiez les requêtes réseau dans l'onglet Network 