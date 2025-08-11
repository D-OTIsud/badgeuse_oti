# Exemples d'utilisation typés - Badgeuse OTI

## 🎯 **Utilisation avec types TypeScript**

Maintenant que vos fonctions sont typées, vous avez un support complet de l'autocomplétion et de la vérification de types !

### **1. Récupération des KPIs avec types**

```typescript
import { supabaseAPI } from './supabase.config';
import type { KPIBundleResult, UserKPI } from './types';

// KPIs par défaut (mois en cours) - REMPLACE appbadge_kpi_bundle()
const kpiData: KPIBundleResult = await supabaseAPI.getKPIDefault();

// Accès typé aux données
const firstResult = kpiData[0];
console.log(`Période: ${firstResult.period}`);
console.log(`Début: ${firstResult.window_start}`);
console.log(`Fin: ${firstResult.window_end}`);

// KPIs globaux
const globalKPIs = firstResult.global;
console.log(`Travail total: ${globalKPIs.travail_total_minutes} minutes`);
console.log(`Pause totale: ${globalKPIs.pause_total_minutes} minutes`);
console.log(`Travail net: ${globalKPIs.travail_net_minutes} minutes`);

// KPIs par utilisateur
const users: UserKPI[] = firstResult.users;
users.forEach(user => {
  console.log(`${user.prenom} ${user.nom} (${user.service})`);
  console.log(`  - Travail: ${user.travail_total_minutes} minutes`);
  console.log(`  - Pause: ${user.pause_total_minutes} minutes`);
  console.log(`  - Retard: ${user.retard_minutes} minutes`);
});

// Métadonnées
const meta = firstResult.meta;
console.log(`Nombre d'utilisateurs: ${meta.users}`);
console.log(`Services: ${meta.services.join(', ')}`);
console.log(`Lieux: ${meta.lieux.join(', ')}`);
```

### **2. KPIs pour une période spécifique**

```typescript
// KPIs pour aujourd'hui (remplace appbadge_kpi_bundle() sans paramètres)
const todayKPIs: KPIBundleResult = await supabaseAPI.getKPIToday();

// KPIs pour la semaine en cours
const weekKPIs: KPIBundleResult = await supabaseAPI.getKPICurrentWeek();

// KPIs pour le mois en cours
const monthKPIs: KPIBundleResult = await supabaseAPI.getKPICurrentMonth();

// KPIs pour l'année en cours
const yearKPIs: KPIBundleResult = await supabaseAPI.getKPICurrentYear();
```

### **3. KPIs avec filtres**

```typescript
// KPIs pour 2025, service "Service Accueil"
const kpiServiceAccueil: KPIBundleResult = await supabaseAPI.getKPIBundleYear(2025, {
  service: 'Service Accueil ',
  lieux: 'Siège',
  role: 'Agent'
});

// KPIs pour janvier 2025, utilisateur spécifique
const kpiUtilisateur: KPIBundleResult = await supabaseAPI.getKPIBundleMonth(2025, 1, {
  utilisateur_id: 'dc8f30c0-cb55-4c70-a3db-d281a82f76d8',
  service: 'Pôle Support '
});

// KPIs pour une période personnalisée
const customPeriodKPIs: KPIBundleResult = await supabaseAPI.getKPIBundleBetween(
  '2025-08-11',
  '2025-08-12',
  { role: 'Admin' }
);
```

### **4. KPIs globaux et par utilisateur**

```typescript
// KPIs globaux pour 2025
const kpiGlobal = await supabaseAPI.getKPIGlobalYear(2025, {
  service: 'Service Accueil ',
  lieux: 'Siège'
});

// KPIs par utilisateur pour 2025
const kpiUsers = await supabaseAPI.getKPIUsersYear(2025, {
  service: 'Pôle Support '
});
```

## 🎨 **Exemples d'intégration dans React**

### **Hook personnalisé typé**

```typescript
import { useState, useEffect } from 'react';
import { supabaseAPI } from './supabase.config';
import type { KPIBundleResult } from './types';

export function useKPIs(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const [kpiData, setKpiData] = useState<KPIBundleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        setLoading(true);
        const data = await supabaseAPI.getKPIDefault(period);
        setKpiData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, [period]);

  return { kpiData, loading, error };
}

// Utilisation dans un composant
function Dashboard() {
  const { kpiData, loading, error } = useKPIs('month');

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!kpiData || kpiData.length === 0) return <div>Aucune donnée</div>;

  const firstResult = kpiData[0];
  
  return (
    <div>
      <h2>KPIs du mois en cours</h2>
      <p>Période: {firstResult.window_start} à {firstResult.window_end}</p>
      
      {/* KPIs globaux */}
      <div>
        <h3>Vue d'ensemble</h3>
        <p>Travail total: {firstResult.global.travail_total_minutes} minutes</p>
        <p>Travail net: {firstResult.global.travail_net_minutes} minutes</p>
        <p>Pause totale: {firstResult.global.pause_total_minutes} minutes</p>
      </div>

      {/* KPIs par utilisateur */}
      <div>
        <h3>Par utilisateur</h3>
        {firstResult.users.map(user => (
          <div key={user.utilisateur_id}>
            <h4>{user.prenom} {user.nom}</h4>
            <p>Service: {user.service}</p>
            <p>Travail: {user.travail_total_minutes} minutes</p>
            <p>Pause: {user.pause_total_minutes} minutes</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🚀 **Exemples d'utilisation dans Vue**

### **Composition API typée**

```typescript
import { ref, onMounted } from 'vue';
import { supabaseAPI } from './supabase.config';
import type { KPIBundleResult } from './types';

export function useKPIs(period = 'month') {
  const kpiData = ref<KPIBundleResult | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetchKPIs() {
    try {
      loading.value = true;
      const data = await supabaseAPI.getKPIDefault(period);
      kpiData.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Erreur inconnue');
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchKPIs);

  return { kpiData, loading, error, fetchKPIs };
}
```

## 🎯 **Avantages du typage**

1. **Autocomplétion** : VSCode/IntelliJ suggère les propriétés disponibles
2. **Vérification de types** : Erreurs détectées à la compilation
3. **Documentation** : Les types servent de documentation
4. **Refactoring** : Plus facile de modifier le code
5. **Debugging** : Meilleure compréhension des structures de données

## 📋 **Résumé des types**

- **`KPIBundleResult`** : Réponse des fonctions bundle (tableau)
- **`KPIBundleResponse`** : Un élément de la réponse
- **`UserKPI`** : KPIs d'un utilisateur spécifique
- **`KPI`** : KPIs de base (global ou utilisateur)
- **`KPIFilters`** : Filtres pour les requêtes
- **`KPIMeta`** : Métadonnées de la réponse

Maintenant votre code est parfaitement typé et correspond exactement à la structure de réponse de votre API ! 🎉
