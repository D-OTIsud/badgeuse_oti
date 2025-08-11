// =====================================================
// CONFIGURATION SUPABASE - BADGEUSE OTI
// =====================================================

import type {
  KPIBundleResult,
  KPIGlobalResponse,
  KPIUsersResponse,
  KPIFilters,
  KPIGlobalFilters
} from './types';

export const SUPABASE_CONFIG = {
  // URL de votre instance Supabase
  url: import.meta.env.VITE_SUPABASE_URL || 'https://supabertel.otisud.re',
  
  // Clé anonyme (anon key) - pour les requêtes publiques
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
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

  // =====================================================
  // FONCTIONS EXISTANTES - UTILISATION DIRECTE
  // =====================================================

  // Appel vers appbadge_kpi_bundle_year
  async getKPIBundleYear(year: number, filters?: KPIFilters): Promise<KPIBundleResult> {
    return this.callRPC('appbadge_kpi_bundle_year', {
      p_year: year,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_bundle_month
  async getKPIBundleMonth(year: number, month: number, filters?: KPIFilters): Promise<KPIBundleResult> {
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
  async getKPIBundleISOWeek(isoYear: number, isoWeek: number, filters?: KPIFilters): Promise<KPIBundleResult> {
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
  async getKPIBundleBetween(startDate: string, endDate: string, filters?: KPIFilters): Promise<KPIBundleResult> {
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
  async getKPIGlobalYear(year: number, filters?: KPIGlobalFilters): Promise<KPIGlobalResponse[]> {
    return this.callRPC('appbadge_kpi_global_filtres_year', {
      p_year: year,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // Appel vers appbadge_kpi_filtres_year
  async getKPIUsersYear(year: number, filters?: KPIFilters): Promise<KPIUsersResponse[]> {
    return this.callRPC('appbadge_kpi_filtres_year', {
      p_year: year,
      p_utilisateur_id: filters?.utilisateur_id || null,
      p_lieux: filters?.lieux || null,
      p_service: filters?.service || null,
      p_role: filters?.role || null
    });
  }

  // =====================================================
  // FONCTIONS UTILITAIRES POUR L'USAGE QUOTIDIEN
  // =====================================================

  // Fonction utilitaire pour obtenir les KPIs par défaut (remplace appbadge_kpi_bundle sans paramètres)
  async getKPIDefault(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<KPIBundleResult> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    switch (period) {
      case 'day':
        // Utiliser la période entre aujourd'hui et aujourd'hui
        const today = currentDate.toISOString().split('T')[0];
        return this.getKPIBundleBetween(today, today);
        
      case 'week':
        // Utiliser la semaine ISO en cours
        const currentWeek = this.getISOWeek(currentDate);
        return this.getKPIBundleISOWeek(currentYear, currentWeek);
        
      case 'month':
        // Utiliser le mois en cours
        const currentMonth = currentDate.getMonth() + 1;
        return this.getKPIBundleMonth(currentYear, currentMonth);
        
      case 'year':
        // Utiliser l'année en cours
        return this.getKPIBundleYear(currentYear);
        
      default:
        throw new Error(`Période non supportée: ${period}`);
    }
  }

  // Fonction utilitaire pour obtenir les KPIs de la période en cours
  async getKPICurrentPeriod(): Promise<KPIBundleResult> {
    return this.getKPIDefault('month'); // Par défaut, mois en cours
  }

  // Fonction utilitaire pour obtenir les KPIs d'aujourd'hui
  async getKPIToday(): Promise<KPIBundleResult> {
    return this.getKPIDefault('day');
  }

  // Fonction utilitaire pour obtenir les KPIs de la semaine en cours
  async getKPICurrentWeek(): Promise<KPIBundleResult> {
    return this.getKPIDefault('week');
  }

  // Fonction utilitaire pour obtenir les KPIs du mois en cours
  async getKPICurrentMonth(): Promise<KPIBundleResult> {
    return this.getKPIDefault('month');
  }

  // Fonction utilitaire pour obtenir les KPIs de l'année en cours
  async getKPICurrentYear(): Promise<KPIBundleResult> {
    return this.getKPIDefault('year');
  }

  // =====================================================
  // FONCTIONS UTILITAIRES POUR LES CALCULS DE DATES
  // =====================================================

  // Calculer la semaine ISO d'une date
  private getISOWeek(date: Date): number {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  // Obtenir la date de début et fin d'une période
  getDateRange(period: 'day' | 'week' | 'month' | 'year', days?: number) {
    const currentDate = new Date();
    
    if (period === 'day' && days) {
      // Période personnalisée en jours
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };
    }
    
    // Périodes prédéfinies
    switch (period) {
      case 'day':
        const today = currentDate.toISOString().split('T')[0];
        return { start: today, end: today };
        
      case 'week':
        // Retourner la semaine en cours
        const currentWeek = this.getISOWeek(currentDate);
        return { start: currentDate.toISOString().split('T')[0], end: currentDate.toISOString().split('T')[0] };
        
      case 'month':
        // Retourner le mois en cours
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        return { start: `${year}-${month.toString().padStart(2, '0')}-01`, end: currentDate.toISOString().split('T')[0] };
        
      case 'year':
        // Retourner l'année en cours
        const currentYear = currentDate.getFullYear();
        return { start: `${currentYear}-01-01`, end: currentDate.toISOString().split('T')[0] };
        
      default:
        throw new Error(`Période non supportée: ${period}`);
    }
  }
}

// =====================================================
// EXEMPLES D'UTILISATION
// =====================================================

// Créer une instance de l'API
export const supabaseAPI = new SupabaseAPI();

// Exemples d'utilisation :
/*
// =====================================================
// UTILISATION DES FONCTIONS EXISTANTES
// =====================================================

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

// =====================================================
// UTILISATION DES FONCTIONS UTILITAIRES
// =====================================================

// KPIs par défaut (mois en cours) - REMPLACE appbadge_kpi_bundle() sans paramètres
const defaultKPIs = await supabaseAPI.getKPIDefault();

// KPIs pour aujourd'hui
const todayKPIs = await supabaseAPI.getKPIToday();

// KPIs pour la semaine en cours
const weekKPIs = await supabaseAPI.getKPICurrentWeek();

// KPIs pour le mois en cours
const monthKPIs = await supabaseAPI.getKPICurrentMonth();

// KPIs pour l'année en cours
const yearKPIs = await supabaseAPI.getKPICurrentYear();

// Période personnalisée (7 derniers jours)
const customPeriod = await supabaseAPI.getKPIBundleBetween(
  supabaseAPI.getDateRange('day', 7).start,
  supabaseAPI.getDateRange('day', 7).end
);
*/
