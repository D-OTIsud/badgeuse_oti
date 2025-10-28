import { supabase } from '../supabaseClient';
import type { UserSession } from '../types';

export const fetchUserSessions = async (utilisateurId: string, limit: number = 10): Promise<UserSession[]> => {
  const { data, error } = await supabase
    .from('appbadge_v_sessions')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .order('jour_local', { ascending: false })
    .limit(limit);

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
  // Extract time directly from the timestamp string to avoid timezone conversion
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
  // The date is already in Reunion local time despite the +00 marker
  // Parse it directly without timezone conversion
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
