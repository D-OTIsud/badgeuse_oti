// =====================================================
// TYPES POUR L'API KPI - BADGEUSE OTI
// =====================================================

// Types pour les KPIs individuels
export interface KPI {
  retard_minutes: number;
  pause_total_minutes: number;
  travail_net_minutes: number;
  travail_total_minutes: number;
  depart_anticipe_minutes: number;
}

// Type pour un utilisateur avec ses KPIs
export interface UserKPI extends KPI {
  nom: string;
  prenom: string;
  role: string;
  lieux: string;
  service: string;
  utilisateur_id: string;
}

// Type pour les sous-totaux par catégorie
export interface SubtotalByCategory extends KPI {
  [key: string]: string | number; // Pour role, lieux, service
}

// Type pour les sous-totaux
export interface Subtotals {
  by_role: SubtotalByCategory[];
  by_lieux: SubtotalByCategory[];
  by_service: SubtotalByCategory[];
}

// Type pour les métadonnées
export interface KPIMeta {
  days: number;
  rows: number;
  lieux: string[];
  roles: string[];
  users: number;
  period: string;
  filters: {
    role: string | null;
    lieux: string | null;
    service: string | null;
    utilisateur_id: string | null;
  };
  services: string[];
  subtotals: Subtotals;
  window_start: string;
  window_end: string;
}

// Type pour la réponse complète d'une fonction KPI bundle
export interface KPIBundleResponse {
  window_start: string;
  window_end: string;
  period: string;
  global: KPI;
  users: UserKPI[];
  meta: KPIMeta;
}

// Type pour la réponse d'une fonction KPI (tableau)
export type KPIBundleResult = KPIBundleResponse[];

// Types pour les filtres
export interface KPIFilters {
  utilisateur_id?: string | null;
  lieux?: string | null;
  service?: string | null;
  role?: string | null;
}

// Types pour les filtres globaux (sans utilisateur_id)
export interface KPIGlobalFilters {
  lieux?: string | null;
  service?: string | null;
  role?: string | null;
}

// Types pour les réponses des fonctions globales et utilisateurs
export interface KPIGlobalResponse {
  retard_minutes: number;
  pause_total_minutes: number;
  travail_net_minutes: number;
  travail_total_minutes: number;
  depart_anticipe_minutes: number;
}

export interface KPIUsersResponse extends UserKPI {}

// Types pour les paramètres des fonctions
export interface KPIBundleYearParams {
  p_year: number;
  p_utilisateur_id?: string | null;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

export interface KPIBundleMonthParams {
  p_year: number;
  p_month: number;
  p_utilisateur_id?: string | null;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

export interface KPIBundleISOWeekParams {
  p_iso_year: number;
  p_iso_week: number;
  p_utilisateur_id?: string | null;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

export interface KPIBundleBetweenParams {
  p_start_date: string;
  p_end_date: string;
  p_utilisateur_id?: string | null;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

export interface KPIGlobalYearParams {
  p_year: number;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

export interface KPIUsersYearParams {
  p_year: number;
  p_utilisateur_id?: string | null;
  p_lieux?: string | null;
  p_service?: string | null;
  p_role?: string | null;
}

// Types pour les sessions utilisateur
export interface UserSession {
  utilisateur_id: string;
  nom: string;
  prenom: string;
  jour_local: string;
  entree_id: string;
  entree_ts: string;
  sortie_id: string;
  sortie_ts: string;
  lieux: string;
  duree_minutes: number;
}