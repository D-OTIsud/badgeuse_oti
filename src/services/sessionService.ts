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
  // Convert UTC timestamp to Reunion local time (UTC+4)
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Indian/Reunion'
  });
};

export const formatDate = (dateString: string): string => {
  // Convert UTC date to Reunion local time (UTC+4)
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Indian/Reunion'
  });
};
