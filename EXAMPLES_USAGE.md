# Exemples d'utilisation - Badgeuse OTI

## 🎯 **Remplacer `appbadge_kpi_bundle()` sans paramètres**

### ❌ **Avant (ne fonctionne pas)**
```typescript
// Cette fonction n'existe pas et génère une erreur
const kpiData = await supabase.rpc('appbadge_kpi_bundle');
// Erreur: Could not find the function public.appbadge_kpi_bundle without parameters
```

### ✅ **Après (utilise les fonctions existantes)**

```typescript
import { supabaseAPI } from './supabase.config';

// Option 1: KPIs par défaut (mois en cours)
const defaultKPIs = await supabaseAPI.getKPIDefault();
// Utilise automatiquement appbadge_kpi_bundle_month avec le mois en cours

// Option 2: KPIs pour aujourd'hui
const todayKPIs = await supabaseAPI.getKPIToday();
// Utilise appbadge_kpi_bundle_between avec la date d'aujourd'hui

// Option 3: KPIs pour la semaine en cours
const weekKPIs = await supabaseAPI.getKPICurrentWeek();
// Utilise appbadge_kpi_bundle_iso_week avec la semaine ISO en cours

// Option 4: KPIs pour l'année en cours
const yearKPIs = await supabaseAPI.getKPICurrentYear();
// Utilise appbadge_kpi_bundle_year avec l'année en cours
```

## 🚀 **Utilisation des fonctions existantes**

### **1. Fonctions de base (appel direct)**

```typescript
// KPIs pour une année spécifique
const kpi2025 = await supabaseAPI.getKPIBundleYear(2025);

// KPIs pour un mois spécifique
const kpiJanvier2025 = await supabaseAPI.getKPIBundleMonth(2025, 1);

// KPIs pour une semaine ISO spécifique
const kpiSemaine1_2025 = await supabaseAPI.getKPIBundleISOWeek(2025, 1);

// KPIs pour une période personnalisée
const kpiPeriode = await supabaseAPI.getKPIBundleBetween('2025-01-01', '2025-01-31');
```

### **2. Fonctions avec filtres**

```typescript
// KPIs pour 2025, service "Service Accueil"
const kpiServiceAccueil = await supabaseAPI.getKPIBundleYear(2025, {
  service: 'Service Accueil ',
  lieux: 'Siège',
  role: 'Agent'
});

// KPIs pour janvier 2025, utilisateur spécifique
const kpiUtilisateur = await supabaseAPI.getKPIBundleMonth(2025, 1, {
  utilisateur_id: 'uuid-utilisateur-ici',
  service: 'Service Info '
});
```

### **3. KPIs globaux (sans utilisateur)**

```typescript
// KPIs globaux pour 2025
const kpiGlobal = await supabaseAPI.getKPIGlobalYear(2025, {
  service: 'Service Accueil ',
  lieux: 'Siège'
});

// KPIs par utilisateur pour 2025
const kpiParUtilisateur = await supabaseAPI.getKPIUsersYear(2025, {
  service: 'Service Info '
});
```

## 🔧 **Fonctions utilitaires intelligentes**

### **`getKPIDefault(period)` - Remplace l'appel sans paramètres**

```typescript
// Par défaut: mois en cours (remplace appbadge_kpi_bundle())
const kpiMoisEnCours = await supabaseAPI.getKPIDefault();

// Jour en cours
const kpiAujourdhui = await supabaseAPI.getKPIDefault('day');

// Semaine en cours
const kpiSemaineEnCours = await supabaseAPI.getKPIDefault('week');

// Année en cours
const kpiAnneeEnCours = await supabaseAPI.getKPIDefault('year');
```

### **Fonctions de commodité**

```typescript
// KPIs du mois en cours
const kpiMois = await supabaseAPI.getKPICurrentMonth();

// KPIs de la semaine en cours
const kpiSemaine = await supabaseAPI.getKPICurrentWeek();

// KPIs d'aujourd'hui
const kpiAujourdhui = await supabaseAPI.getKPIToday();

// KPIs de l'année en cours
const kpiAnnee = await supabaseAPI.getKPICurrentYear();
```

## 📅 **Gestion des dates et périodes**

### **Calcul automatique des périodes**

```typescript
// Obtenir la plage de dates pour une période
const { start, end } = supabaseAPI.getDateRange('month');
// start: "2025-01-01", end: "2025-01-15" (si on est le 15 janvier)

// Période personnalisée (7 derniers jours)
const { start: start7, end: end7 } = supabaseAPI.getDateRange('day', 7);
// start7: "2025-01-08", end7: "2025-01-15"

// Utiliser avec getKPIBundleBetween
const kpi7Jours = await supabaseAPI.getKPIBundleBetween(start7, end7);
```

## 🎨 **Exemples d'intégration dans React/Vue**

### **React Hook personnalisé**

```typescript
import { useState, useEffect } from 'react';
import { supabaseAPI } from './supabase.config';

export function useKPIs(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        setLoading(true);
        const data = await supabaseAPI.getKPIDefault(period);
        setKpiData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, [period]);

  return { kpiData, loading, error };
}

// Utilisation
function Dashboard() {
  const { kpiData, loading, error } = useKPIs('month');

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      <h2>KPIs du mois en cours</h2>
      {/* Afficher vos données */}
    </div>
  );
}
```

### **Vue Composition API**

```typescript
import { ref, onMounted } from 'vue';
import { supabaseAPI } from './supabase.config';

export function useKPIs(period = 'month') {
  const kpiData = ref(null);
  const loading = ref(true);
  const error = ref(null);

  async function fetchKPIs() {
    try {
      loading.value = true;
      const data = await supabaseAPI.getKPIDefault(period);
      kpiData.value = data;
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchKPIs);

  return { kpiData, loading, error, fetchKPIs };
}
```

## 🚨 **Gestion des erreurs**

### **Gestion robuste des erreurs**

```typescript
try {
  // KPIs par défaut (remplace appbadge_kpi_bundle())
  const kpiData = await supabaseAPI.getKPIDefault();
  console.log('KPIs récupérés:', kpiData);
} catch (error) {
  if (error.message.includes('Could not find the function')) {
    console.error('Fonction non trouvée. Vérifiez que les fonctions SQL sont déployées.');
  } else if (error.message.includes('401')) {
    console.error('Erreur d\'authentification. Vérifiez vos clés Supabase.');
  } else if (error.message.includes('403')) {
    console.error('Accès interdit. Vérifiez les permissions RLS.');
  } else {
    console.error('Erreur inattendue:', error);
  }
}
```

## 📋 **Résumé des remplacements**

| ❌ **Ancien (ne fonctionne pas)** | ✅ **Nouveau (fonctions existantes)** |
|-----------------------------------|----------------------------------------|
| `appbadge_kpi_bundle()` | `supabaseAPI.getKPIDefault()` |
| `appbadge_kpi_bundle()` | `supabaseAPI.getKPICurrentMonth()` |
| `appbadge_kpi_bundle()` | `supabaseAPI.getKPIToday()` |
| `appbadge_kpi_bundle()` | `supabaseAPI.getKPICurrentWeek()` |
| `appbadge_kpi_bundle()` | `supabaseAPI.getKPICurrentYear()` |

## 🎯 **Recommandations**

1. **Utilisez `getKPIDefault()`** pour remplacer `appbadge_kpi_bundle()` sans paramètres
2. **Utilisez les fonctions spécifiques** pour des périodes précises
3. **Ajoutez des filtres** pour affiner les résultats
4. **Gérez les erreurs** de manière appropriée
5. **Utilisez les hooks personnalisés** pour une meilleure organisation du code

Maintenant vous pouvez utiliser uniquement les fonctions existantes sans erreur ! 🎉
