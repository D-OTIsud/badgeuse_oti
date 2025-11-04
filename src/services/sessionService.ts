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

// Fetch sessions with modifications (pending or approved) for a user
export const fetchSessionsWithModifications = async (
  utilisateurId: string
): Promise<UserSession[]> => {
  // Get all modifications with their IDs
  const { data: modifs, error: modifError } = await supabase
    .from('appbadge_session_modifs')
    .select('id, entree_id')
    .eq('utilisateur_id', utilisateurId)
    .order('created_at', { ascending: false });

  if (modifError) {
    console.error('Error fetching sessions with modifications:', modifError);
    return [];
  }

  if (!modifs || modifs.length === 0) {
    return [];
  }

  // Get modif_ids to check validations
  const modifIds = modifs.map(m => m.id);
  const { data: validations } = await supabase
    .from('appbadge_session_modif_validations')
    .select('modif_id, approuve')
    .in('modif_id', modifIds);

  // Create a set of entree_ids that have pending or approved modifications
  const validationsByModif = new Map<string, boolean>();
  validations?.forEach(v => {
    validationsByModif.set(v.modif_id, v.approuve);
  });

  // Filter to only pending or approved
  const relevantEntreeIds = modifs
    .filter(m => {
      const validation = validationsByModif.get(m.id);
      // Include if no validation (pending) or if approved
      return validation === undefined || validation === true;
    })
    .map(m => m.entree_id);

  if (relevantEntreeIds.length === 0) {
    return [];
  }

  // Fetch sessions for these entree_ids
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('appbadge_v_sessions')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .in('entree_id', relevantEntreeIds)
    .order('jour_local', { ascending: false });

  if (sessionsError) {
    console.error('Error fetching modified sessions:', sessionsError);
    return [];
  }

  return sessionsData || [];
};

// Fetch total recorded pause minutes for a given session (by entree_id)
export const fetchSessionPauseMinutes = async (
  entreeId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from('appbadge_v_session_pause_totals')
    .select('total_pause_minutes')
    .eq('entree_id', entreeId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching session pause minutes:', error);
    return 0;
  }

  // total_pause_minutes can be numeric; cast to number
  const minutes = (data?.total_pause_minutes as unknown) as number | null;
  return typeof minutes === 'number' ? Math.round(minutes) : 0;
};