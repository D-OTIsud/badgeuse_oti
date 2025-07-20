# Système de Contrôle d'Accès par IP

## Vue d'ensemble

Le système de contrôle d'accès par IP vérifie automatiquement si l'IP de l'utilisateur est autorisée. Le comportement de badgeage et l'appel du webhook varient selon l'autorisation IP.

## Fonctionnalités

### 1. Vérification IP Automatique
- Vérification de l'IP de l'utilisateur au chargement de l'application
- Comparaison avec la liste des plages IP autorisées
- Affichage d'un message de chargement pendant la vérification

### 2. Badgeage selon Autorisation IP
- **IP autorisée** : Badgeage standard sans commentaire obligatoire
- **IP non autorisée** : Badgeage avec commentaire obligatoire
- Enregistrement dans la table `appbadge_badgeages`

### 3. Appel du Webhook
- **IP autorisée** : Webhook appelé uniquement pour sélection manuelle
- **IP non autorisée** : Webhook appelé pour tous les badgeages (NFC et manuel)

### 4. Messages de Bienvenue Personnalisés
- Affichage du nom de l'emplacement dans le header
- Format : "Bienvenue au kit de badgeage - [Nom de l'emplacement]"

### 5. Contrôle NFC
- **IP autorisée** : Badgeage direct sans formulaire, sans webhook
- **IP non autorisée** : Redirection vers formulaire avec commentaire obligatoire

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

### 1. IP Autorisée - Sélection Manuelle
1. L'utilisateur accède à l'application
2. Vérification automatique de l'IP
3. Affichage du message de bienvenue
4. Sélection manuelle de l'utilisateur
5. **Appel du webhook**
6. Formulaire de saisie du code
7. Enregistrement dans la base de données

### 2. IP Autorisée - Badge NFC
1. L'utilisateur scanne un badge NFC
2. **Badgeage direct sans formulaire**
3. **Aucun appel du webhook**
4. Enregistrement direct dans la base de données

### 3. IP Non Autorisée - Sélection Manuelle
1. L'utilisateur accède à l'application
2. Vérification automatique de l'IP
3. Sélection manuelle de l'utilisateur
4. **Appel du webhook**
5. Formulaire avec code + commentaire obligatoire
6. Enregistrement dans la base de données

### 4. IP Non Autorisée - Badge NFC
1. L'utilisateur scanne un badge NFC
2. **Redirection vers formulaire avec commentaire obligatoire**
3. **Appel du webhook**
4. Enregistrement dans la base de données

## Composants

### `BadgeForm.tsx` (Modifié)
- Formulaire de badgeage adaptatif selon l'autorisation IP
- Champ de commentaire obligatoire pour IP non autorisée
- **Appel du webhook pour IP non autorisée**
- Enregistrement dans la table `appbadge_badgeages`
- Interface utilisateur intuitive

### `ipService.ts`
- Service de détection d'IP
- Récupération des IPs autorisées depuis la base de données
- Fonctions de vérification et de comparaison IP
- Messages de bienvenue personnalisés

### Modifications App.tsx
- Intégration de la vérification IP
- Gestion des états de chargement
- **Appel du webhook uniquement pour IP non autorisée lors de la sélection manuelle**

### Modifications Header.tsx
- Support des messages de bienvenue personnalisés
- Affichage responsive du nom de l'emplacement

### Modifications UserDeck.tsx
- **IP autorisée** : Badgeage NFC direct sans webhook
- **IP non autorisée** : Redirection vers formulaire avec commentaire obligatoire

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