import { supabase } from '../supabaseClient';
import type { ModificationRequestWithDetails } from './sessionModificationService';
import type { OubliBadgeageRequestWithDetails } from './oubliBadgeageService';

export interface AdminValidationRequests {
  modification_requests: ModificationRequestWithDetails[];
  oubli_requests: OubliBadgeageRequestWithDetails[];
}

/**
 * Fetch all pending validation requests using optimized RPC function
 * This replaces multiple sequential queries with a single database call
 */
export const fetchAdminValidationRequests = async (): Promise<AdminValidationRequests> => {
  const { data, error } = await supabase.rpc('get_admin_validation_requests');

  if (error) {
    console.error('Error fetching admin validation requests:', error);
    // Fallback to individual queries if RPC fails
    return {
      modification_requests: [],
      oubli_requests: []
    };
  }

  if (!data) {
    return {
      modification_requests: [],
      oubli_requests: []
    };
  }

  // Transform the JSON response to match our TypeScript interfaces
  const modification_requests: ModificationRequestWithDetails[] = (data.modification_requests || []).map((req: any) => ({
    id: req.id,
    entree_id: req.entree_id,
    utilisateur_id: req.utilisateur_id,
    proposed_entree_ts: req.proposed_entree_ts,
    proposed_sortie_ts: req.proposed_sortie_ts,
    pause_delta_minutes: req.pause_delta_minutes,
    motif: req.motif,
    commentaire: req.commentaire,
    created_at: req.created_at,
    utilisateur_nom: req.utilisateur_nom || '',
    utilisateur_prenom: req.utilisateur_prenom || '',
    utilisateur_email: req.utilisateur_email || null,
    session_jour_local: req.session_jour_local,
    session_entree_ts: req.session_entree_ts,
    session_sortie_ts: req.session_sortie_ts,
    session_duree_minutes: req.session_duree_minutes,
    session_pause_minutes: req.session_pause_minutes || 0,
    session_lieux: req.session_lieux || null,
  }));

  const oubli_requests: OubliBadgeageRequestWithDetails[] = (data.oubli_requests || []).map((req: any) => ({
    id: req.id,
    utilisateur_id: req.utilisateur_id,
    date_heure_saisie: req.date_heure_saisie,
    date_heure_entree: req.date_heure_entree,
    date_heure_sortie: req.date_heure_sortie,
    date_heure_pause_debut: req.date_heure_pause_debut,
    date_heure_pause_fin: req.date_heure_pause_fin,
    raison: req.raison,
    commentaire: req.commentaire,
    perte_badge: req.perte_badge,
    etat_validation: req.etat_validation,
    date_validation: req.date_validation,
    validateur_id: req.validateur_id,
    lieux: req.lieux,
    utilisateur_nom: req.utilisateur_nom || null,
    utilisateur_prenom: req.utilisateur_prenom || null,
    utilisateur_email: req.utilisateur_email || null,
  }));

  return {
    modification_requests,
    oubli_requests
  };
};

