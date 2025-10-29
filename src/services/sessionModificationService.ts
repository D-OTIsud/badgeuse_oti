import { supabase } from '../supabaseClient';

export interface SessionModificationRequest {
  id?: string;
  entree_id: string;
  utilisateur_id: string;
  proposed_entree_ts?: string | null;
  proposed_sortie_ts?: string | null;
  pause_delta_minutes?: number;
  motif?: string | null;
  commentaire?: string | null;
  created_at?: string;
}

export interface SessionModificationStatus {
  modif_id?: string;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  proposed_entree_ts?: string | null;
  proposed_sortie_ts?: string | null;
  pause_delta_minutes?: number;
  motif?: string | null;
  commentaire?: string | null;
  validated_at?: string | null;
  validator_comment?: string | null;
}

/**
 * Create a session modification request
 */
export const createSessionModificationRequest = async (
  request: SessionModificationRequest
): Promise<SessionModificationRequest> => {
  // First, verify that the entree_id exists and belongs to the user
  const { data: badgeage, error: checkError } = await supabase
    .from('appbadge_badgeages')
    .select('id, type_action, utilisateur_id')
    .eq('id', request.entree_id)
    .eq('utilisateur_id', request.utilisateur_id)
    .single();

  if (checkError || !badgeage) {
    const errorMessage = checkError?.code === 'PGRST116' 
      ? 'La session sélectionnée n\'existe plus ou n\'est plus accessible. Veuillez actualiser la page.'
      : 'Erreur lors de la vérification de la session. Veuillez réessayer.';
    const error = new Error(errorMessage);
    (error as any).code = checkError?.code || 'SESSION_NOT_FOUND';
    console.error('Error verifying entree_id:', checkError, 'Request:', request);
    throw error;
  }

  if (badgeage.type_action !== 'entrée') {
    const error = new Error('L\'ID fourni ne correspond pas à une entrée de session.');
    (error as any).code = 'INVALID_ENTREE_TYPE';
    console.error('Invalid entree type:', badgeage.type_action);
    throw error;
  }

  // Now insert the modification request
  const { data, error } = await supabase
    .from('appbadge_session_modifs')
    .insert({
      entree_id: request.entree_id,
      utilisateur_id: request.utilisateur_id,
      proposed_entree_ts: request.proposed_entree_ts || null,
      proposed_sortie_ts: request.proposed_sortie_ts || null,
      pause_delta_minutes: request.pause_delta_minutes || 0,
      motif: request.motif || null,
      commentaire: request.commentaire || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session modification request:', error);
    // Provide a more user-friendly error message
    let userMessage = 'Une erreur est survenue lors de la soumission de la demande.';
    if (error.code === 'P0001') {
      userMessage = 'La session sélectionnée n\'existe plus ou n\'est plus accessible. Veuillez actualiser la page et réessayer.';
    } else if (error.code === '23505') {
      userMessage = 'Une demande de modification existe déjà pour cette session.';
    } else if (error.message) {
      userMessage = error.message;
    }
    const customError = new Error(userMessage);
    (customError as any).code = error.code;
    throw customError;
  }

  return data;
};

/**
 * Get modification status for a session (entree_id)
 */
export const getSessionModificationStatus = async (
  entree_id: string
): Promise<SessionModificationStatus | null> => {
  // First, check if there's a modification request
  const { data: modif, error: modifError } = await supabase
    .from('appbadge_session_modifs')
    .select('id, proposed_entree_ts, proposed_sortie_ts, pause_delta_minutes, motif, commentaire, created_at')
    .eq('entree_id', entree_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (modifError && modifError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching modification request:', modifError);
    return null;
  }

  if (!modif) {
    return { status: 'none' };
  }

  // Check if there's a validation
  const { data: validation, error: validationError } = await supabase
    .from('appbadge_session_modif_validations')
    .select('approuve, commentaire as validator_comment, validated_at')
    .eq('modif_id', modif.id)
    .single();

  if (validationError && validationError.code !== 'PGRST116') {
    console.error('Error fetching validation:', validationError);
    // Still return pending status if we have a modification
    return {
      modif_id: modif.id,
      status: 'pending',
      proposed_entree_ts: modif.proposed_entree_ts,
      proposed_sortie_ts: modif.proposed_sortie_ts,
      pause_delta_minutes: modif.pause_delta_minutes,
      motif: modif.motif,
      commentaire: modif.commentaire,
    };
  }

  if (!validation) {
    return {
      modif_id: modif.id,
      status: 'pending',
      proposed_entree_ts: modif.proposed_entree_ts,
      proposed_sortie_ts: modif.proposed_sortie_ts,
      pause_delta_minutes: modif.pause_delta_minutes,
      motif: modif.motif,
      commentaire: modif.commentaire,
    };
  }

  return {
    modif_id: modif.id,
    status: validation.approuve ? 'approved' : 'rejected',
    proposed_entree_ts: modif.proposed_entree_ts,
    proposed_sortie_ts: modif.proposed_sortie_ts,
    pause_delta_minutes: modif.pause_delta_minutes,
    motif: modif.motif,
    commentaire: modif.commentaire,
    validated_at: validation.validated_at,
    validator_comment: validation.validator_comment,
  };
};

/**
 * Get modification statuses for multiple sessions
 */
export const getSessionModificationStatuses = async (
  entree_ids: string[]
): Promise<Map<string, SessionModificationStatus>> => {
  const statusMap = new Map<string, SessionModificationStatus>();

  if (entree_ids.length === 0) {
    return statusMap;
  }

  // Fetch all modification requests for these entree_ids
  const { data: modifs, error: modifError } = await supabase
    .from('appbadge_session_modifs')
    .select('id, entree_id, proposed_entree_ts, proposed_sortie_ts, pause_delta_minutes, motif, commentaire, created_at')
    .in('entree_id', entree_ids)
    .order('created_at', { ascending: false });

  if (modifError) {
    console.error('Error fetching modification requests:', modifError);
    // Return empty map on error, all sessions will show 'none'
    return statusMap;
  }

  if (!modifs || modifs.length === 0) {
    // No modifications found, return map with 'none' status for all
    entree_ids.forEach(id => statusMap.set(id, { status: 'none' }));
    return statusMap;
  }

  // Get modif_ids for validation lookup
  const modifIds = modifs.map(m => m.id);

  // Fetch validations
  const { data: validations, error: validationError } = await supabase
    .from('appbadge_session_modif_validations')
    .select('modif_id, approuve, commentaire as validator_comment, validated_at')
    .in('modif_id', modifIds);

  if (validationError) {
    console.error('Error fetching validations:', validationError);
  }

  // Group modifs by entree_id (take the latest one per entree_id)
  const modifsByEntree = new Map<string, typeof modifs[0]>();
  modifs.forEach(modif => {
    if (!modifsByEntree.has(modif.entree_id)) {
      modifsByEntree.set(modif.entree_id, modif);
    }
  });

  // Create validation lookup map
  const validationsByModif = new Map<string, typeof validations[0]>();
  validations?.forEach(validation => {
    validationsByModif.set(validation.modif_id, validation);
  });

  // Build status map for all entree_ids
  entree_ids.forEach(entree_id => {
    const modif = modifsByEntree.get(entree_id);
    if (!modif) {
      statusMap.set(entree_id, { status: 'none' });
      return;
    }

    const validation = validationsByModif.get(modif.id);
    if (!validation) {
      statusMap.set(entree_id, {
        modif_id: modif.id,
        status: 'pending',
        proposed_entree_ts: modif.proposed_entree_ts,
        proposed_sortie_ts: modif.proposed_sortie_ts,
        pause_delta_minutes: modif.pause_delta_minutes,
        motif: modif.motif,
        commentaire: modif.commentaire,
      });
      return;
    }

    statusMap.set(entree_id, {
      modif_id: modif.id,
      status: validation.approuve ? 'approved' : 'rejected',
      proposed_entree_ts: modif.proposed_entree_ts,
      proposed_sortie_ts: modif.proposed_sortie_ts,
      pause_delta_minutes: modif.pause_delta_minutes,
      motif: modif.motif,
      commentaire: modif.commentaire,
      validated_at: validation.validated_at,
      validator_comment: validation.validator_comment,
    });
  });

  return statusMap;
};

