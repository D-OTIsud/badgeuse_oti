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
 * Fetch team statistics for a date range (supports multiple months)
 * @param startDate - Start date (YYYY-MM-DD format or Date object)
 * @param endDate - End date (YYYY-MM-DD format or Date object)
 * @param service - Service name (optional, null for all services - admin only)
 * @returns Array of team statistics
 */
export const fetchMonthlyTeamStatsRange = async (
  startDate: string | Date,
  endDate: string | Date,
  service?: string | null
): Promise<MonthlyTeamStats[]> => {
  try {
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_monthly_team_stats_range', {
      p_start_date: start,
      p_end_date: end,
      p_service: service || null,
    });

    if (error) {
      console.error('Error fetching monthly team stats range:', error);
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
    console.error('Error in fetchMonthlyTeamStatsRange:', error);
    throw error;
  }
};

/**
 * Export monthly stats to CSV format
 * @param stats - Array of monthly team statistics
 * @param startDate - Start date for the report
 * @param endDate - End date for the report
 * @param service - Service name (optional)
 */
export const exportToCSV = (
  stats: MonthlyTeamStats[],
  startDate: Date,
  endDate: Date,
  service?: string | null
): void => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  // CSV header
  let csv = 'Rapport Mensuel - Badgeage\n';
  csv += `Période: ${formatDate(startDate)} - ${formatDate(endDate)}\n`;
  if (service) {
    csv += `Service: ${service}\n`;
  }
  csv += '\n';

  // For each service
  stats.forEach((serviceStats) => {
    csv += `Service: ${serviceStats.service}\n`;
    csv += `Total heures: ${formatDuration(serviceStats.total_hours)}\n`;
    csv += `Moyenne par utilisateur: ${formatDuration(serviceStats.avg_hours_per_user)}\n`;
    csv += `Total retards: ${formatMinutes(serviceStats.total_delays_minutes)}\n`;
    csv += `Absences: ${serviceStats.absences_count}\n`;
    csv += '\n';

    // User details table
    csv += 'Utilisateur,Email,Total heures,Moyenne/jour,Retards,Jours travaillés,Statut\n';
    serviceStats.users.forEach((user) => {
      const fullName = `${user.prenom} ${user.nom}`;
      const status = user.is_absent ? 'Absent' : 'Présent';
      csv += `"${fullName}","${user.email}",${formatDuration(user.total_hours)},${formatDuration(user.avg_hours_per_day)},${formatMinutes(user.total_delays_minutes)},${user.jours_travailles},"${status}"\n`;
    });
    csv += '\n';
  });

  // Create and download file
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  
  const filename = service
    ? `rapport_badgeage_${service}_${formatDate(startDate)}_${formatDate(endDate)}.csv`
    : `rapport_badgeage_${formatDate(startDate)}_${formatDate(endDate)}.csv`;
  link.setAttribute('download', filename.replace(/\//g, '-'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

