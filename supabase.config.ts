// =====================================================
// CONFIGURATION SUPABASE - BADGEUSE OTI
// =====================================================

export const SUPABASE_CONFIG = {
  // URL de votre instance Supabase
  url: import.meta.env.VITE_SUPABASE_URL || 'https://supabertel.otisud.re',
  
  // Clé anonyme (anon key) - pour les requêtes publiques
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Clé de service (service_role key) - pour les opérations admin
  serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  
  // Configuration de l'API
  apiBaseUrl: import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/rest/v1` : 'https://supabertel.otisud.re/rest/v1',
  apiVersion: 'v1',
  
  // Configuration des fonctions RPC
  rpcEndpoint: import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc` : 'https://supabertel.otisud.re/rest/v1/rpc',
  
  // Configuration des headers par défaut
  get defaultHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.anonKey}`
    };
  }
};

// =====================================================
// FONCTIONS UTILITAIRES POUR LES APPELS API
// =====================================================

export class SupabaseAPI {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = SUPABASE_CONFIG.rpcEndpoint;
    this.headers = SUPABASE_CONFIG.defaultHeaders;
  }

  // Appel générique vers une fonction RPC
  async callRPC<T>(
    functionName: string, 
    params: Record<string, any>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${functionName}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Appel vers appbadge_kpi_bundle_year
  async getKPIBundleYear(year: number, filters?: {
    utilisateur_id?: string | null;
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_bundle_year', {
      p_year: year,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_bundle_month
  async getKPIBundleMonth(year: number, month: number, filters?: {
    utilisateur_id?: string | null;
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_bundle_month', {
      p_year: year,
      p_month: month,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_bundle_iso_week
  async getKPIBundleISOWeek(isoYear: number, isoWeek: number, filters?: {
    utilisateur_id?: string | null;
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_bundle_iso_week', {
      p_iso_year: isoYear,
      p_iso_week: isoWeek,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_bundle_between
  async getKPIBundleBetween(startDate: string, endDate: string, filters?: {
    utilisateur_id?: string | null;
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_bundle_between', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_global_filtres_year
  async getKPIGlobalYear(year: number, filters?: {
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_global_filtres_year', {
      p_year: year,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_filtres_year
  async getKPIUsersYear(year: number, filters?: {
    utilisateur_id?: string | null;
    lieux?: string | null;
    service?: string | null;
    role?: string | null;
  }): Promise<any> {
    return this.callRPC('appbadge_kpi_filtres_year', {
      p_year: year,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }
}

// =====================================================
// EXEMPLES D'UTILISATION
// =====================================================

// Créer une instance de l'API
export const supabaseAPI = new SupabaseAPI();

// Exemples d'utilisation :
/*
// Récupérer les KPIs pour l'année 2025
const kpiData = await supabaseAPI.getKPIBundleYear(2025);

// Récupérer les KPIs pour janvier 2025, service "Service Accueil"
const kpiMonth = await supabaseAPI.getKPIBundleMonth(2025, 1, {
  service: 'Service Accueil '
});

// Récupérer les KPIs pour la semaine ISO 1 de 2025
const kpiWeek = await supabaseAPI.getKPIBundleISOWeek(2025, 1);

// Récupérer les KPIs pour une période spécifique
const kpiPeriod = await supabaseAPI.getKPIBundleBetween('2025-01-01', '2025-01-31');

// Récupérer les KPIs globaux pour 2025
const kpiGlobal = await supabaseAPI.getKPIGlobalYear(2025);

// Récupérer les KPIs par utilisateur pour 2025
const kpiUsers = await supabaseAPI.getKPIUsersYear(2025);
*/
