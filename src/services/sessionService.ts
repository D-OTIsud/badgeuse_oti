import { supabase } from '../supabaseClient';
import type { UserSession } from '../../types';

export const fetchUserSessions = async (
  utilisateurId: string, 
  limit: number = 10,
  beforeDate?: string // ISO date string (YYYY-MM-DD), fetch sessions before this date
): Promise<UserSession[]> => {
  let query = supabase
    .from('appbadge_v_sessions')
    .select('*')
    .eq('utilisateur_id', utilisateurId);

  if (beforeDate) {
    // Fetch sessions before the specified date
    query = query.lt('jour_local', beforeDate);
  }

  query = query
    .order('jour_local', { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user sessions:', error);
    throw error;
  }

  return data || [];
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }
  return `${mins}min`;
};

export const formatTime = (timestamp: string): string => {
  // Extract time directly from timestamp string since database stores local time with +00 marker
  // Format: "2025-10-27T09:02:37.114865+00" -> extract "09:02"
  const timeMatch = timestamp.match(/(\d{2}):(\d{2})/);
  if (timeMatch) {
    return timeMatch[0]; // Returns "09:02"
  }
  // Fallback if format is unexpected
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (dateString: string): string => {
  // Extract date directly from timestamp string since database stores local time with +00 marker
  // Format: "2025-10-27T09:02:37.114865+00" -> extract "2025-10-27"
  const dateMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const date = new Date(dateMatch[0]);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  // Fallback if format is unexpected
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
