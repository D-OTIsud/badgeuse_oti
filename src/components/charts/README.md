# 📊 Composants de Graphiques pour le Dashboard KPI

Ce dossier contient tous les composants de graphiques avancés pour le dashboard des KPIs de badgeuse.

## 🎯 Composants Disponibles

### Composants de Base
- **`BarChart`** - Graphique en barres verticales
- **`LineChart`** - Graphique en ligne pour les tendances
- **`HorizontalBarChart`** - Graphique en barres horizontales pour les classements
- **`ScatterChart`** - Nuage de points pour les corrélations
- **`DonutChart`** - Graphique en donut pour les parts
- **`CalendarHeatmap`** - Calendrier heatmap pour l'intensité quotidienne
- **`ParetoChart`** - Graphique Pareto pour la concentration
- **`RealTimeStatus`** - Affichage du statut temps réel

### Écrans Spécifiques
- **`DayScreen`** - Tous les graphiques pour l'écran Jour
- **`WeekScreen`** - Tous les graphiques pour l'écran Semaine
- **`MonthScreen`** - Tous les graphiques pour l'écran Mois
- **`YearScreen`** - Tous les graphiques pour l'écran Année
- **`ChartsContainer`** - Conteneur principal qui gère l'affichage selon la période

## 🚀 Utilisation

### 1. Import des Composants
```tsx
import { 
  BarChart, 
  LineChart, 
  ChartsContainer 
} from './charts';
```

### 2. Utilisation Simple d'un Composant
```tsx
<BarChart 
  data={serviceData}
  title="Travail net par service"
  xAxisLabel="Service"
  yAxisLabel="Minutes"
/>
```

### 3. Utilisation du Conteneur Principal
```tsx
<ChartsContainer
  period={period}
  kpiData={kpiData}
  users={users}
  selectedYear={selectedYear}
  selectedMonth={selectedMonth}
  selectedWeek={selectedWeek}
  startDate={startDate}
  endDate={endDate}
  supabaseAPI={supabaseAPI}
/>
```

## 📋 Structure des Données

### Données pour BarChart/LineChart
```tsx
const data = [
  { name: 'IT', value: 480 },
  { name: 'RH', value: 360 },
  { name: 'Finance', value: 420 }
];
```

### Données pour ScatterChart
```tsx
const data = [
  { 
    name: 'Jean Dupont', 
    travail_net_minutes: 480, 
    retard_minutes: 45, 
    travail_total_minutes: 520 
  }
];
```

### Données pour CalendarHeatmap
```tsx
const data = [
  { date: '2025-08-01', value: 420 },
  { date: '2025-08-02', value: 480 }
];
```

## 🎨 Personnalisation

### Couleurs
Chaque composant accepte des props de personnalisation :
```tsx
<BarChart 
  data={data}
  title="Mon titre"
  colors={['#ff6b6b', '#4ecdc4', '#45b7d1']}
/>
```

### Tailles
Les composants sont responsifs et s'adaptent automatiquement à leur conteneur.

## 🔧 Fonctionnalités

### Formatage Automatique
- **Minutes** : Conversion automatique en format "XhYY" (ex: 480 → "8h00")
- **Pourcentages** : Calcul automatique des parts pour les graphiques en donut
- **Dates** : Formatage automatique selon la locale française

### Interactivité
- **Tooltips** : Informations détaillées au survol
- **Légendes** : Affichage des données avec pourcentages
- **Responsive** : Adaptation automatique aux différentes tailles d'écran

## 📱 Responsive Design

Les graphiques s'adaptent automatiquement :
- **Desktop** : Affichage en grille 2x2
- **Tablet** : Passage en grille 1x2
- **Mobile** : Affichage en colonne unique

## 🎯 Écrans par Période

### Écran Jour
- Barres : Travail net par service, lieu, rôle
- Classement : Top retards
- Nuage de points : Retard vs travail net
- Donut : Part des services
- Statut temps réel

### Écran Semaine
- Courbes : Travail net et retard par jour (7 points)
- Barres : Travail net par service
- Classement : Top retards
- Pareto : Concentration du travail

### Écran Mois
- Courbes : Travail net et retard par jour (1..N)
- Calendrier heatmap : Intensité du travail
- Barres : Travail net par service, lieu, rôle
- Classement : Top retards
- Donut : Part des services

### Écran Année
- Courbes : Travail net et retard par mois (12 points)
- Barres : Travail net par service, lieu, rôle
- Classement : Top retards
- Donut : Part des services
- Comparatif YTD vs N-1 (en développement)

## 🚨 Dépannage

### Graphiques qui ne s'affichent pas
1. Vérifiez que `recharts` est installé : `npm install recharts`
2. Vérifiez que les données sont dans le bon format
3. Vérifiez la console pour les erreurs JavaScript

### Données manquantes
1. Vérifiez que `kpiData` contient les bonnes données
2. Vérifiez que les fonctions SQL retournent les données attendues
3. Vérifiez que les filtres sont correctement appliqués

## 🔮 Évolutions Futures

- [ ] Comparatif YTD vs N-1 pour l'écran Année
- [ ] Export des graphiques en PDF/PNG
- [ ] Filtres avancés sur les graphiques
- [ ] Animations et transitions
- [ ] Mode sombre/clair
- [ ] Personnalisation des thèmes

## 📚 Ressources

- [Documentation Recharts](https://recharts.org/)
- [Fonctions SQL KPI](../database_functions.sql)
- [Configuration Supabase](../supabase.config.ts)
