// Service for fetching monthly team reports
import { supabase } from '../supabaseClient';

export interface MonthlyTeamStats {
  service: string;
  total_hours: number;
  avg_hours_per_user: number;
  total_delays_minutes: number;
  absences_count: number;
  users: UserMonthlyStats[];
}

export interface UserMonthlyStats {
  utilisateur_id: string;
  nom: string;
  prenom: string;
  email: string;
  total_hours: number;
  avg_hours_per_day: number;
  total_delays_minutes: number;
  jours_travailles: number;
  is_absent: boolean;
}

/**
 * Fetch monthly team statistics for a specific service or all services
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param service - Service name (optional, null for all services - admin only)
 * @returns Array of monthly team statistics
 */
export const fetchMonthlyTeamStats = async (
  year: number,
  month: number,
  service?: string | null
): Promise<MonthlyTeamStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_monthly_team_stats', {
      p_year: year,
      p_month: month,
      p_service: service || null,
    });

    if (error) {
      console.error('Error fetching monthly team stats:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      service: item.service,
      total_hours: parseFloat(item.total_hours) || 0,
      avg_hours_per_user: parseFloat(item.avg_hours_per_user) || 0,
      total_delays_minutes: parseInt(item.total_delays_minutes) || 0,
      absences_count: parseInt(item.absences_count) || 0,
      users: (item.users || []).map((u: any) => ({
        utilisateur_id: u.utilisateur_id,
        nom: u.nom || '',
        prenom: u.prenom || '',
        email: u.email || '',
        total_hours: parseFloat(u.total_hours) || 0,
        avg_hours_per_day: parseFloat(u.avg_hours_per_day) || 0,
        total_delays_minutes: parseInt(u.total_delays_minutes) || 0,
        jours_travailles: parseInt(u.jours_travailles) || 0,
        is_absent: u.is_absent === true,
      })),
    }));
  } catch (error) {
    console.error('Error in fetchMonthlyTeamStats:', error);
    throw error;
  }
};

/**
 * Get list of available services for filtering
 */
export const getAvailableServices = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('appbadge_utilisateurs')
      .select('service')
      .eq('actif', true)
      .not('service', 'is', null);

    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }

    const services = [...new Set((data || []).map((u: any) => u.service).filter(Boolean))];
    return services.sort();
  } catch (error) {
    console.error('Error in getAvailableServices:', error);
    return [];
  }
};

