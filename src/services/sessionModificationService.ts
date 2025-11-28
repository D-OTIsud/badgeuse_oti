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
 * Note: The entree_id comes from appbadge_v_sessions view which already validates its existence.
 * The backend trigger will perform additional validation if needed.
 */
export const createSessionModificationRequest = async (
  request: SessionModificationRequest
): Promise<SessionModificationRequest> => {
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
      // This is the trigger error when entree_id doesn't exist
      userMessage = 'La session sélectionnée n\'existe plus ou n\'est plus accessible. Veuillez actualiser la page et réessayer.';
    } else if (error.code === '23503') {
      // Foreign key violation
      userMessage = 'La session sélectionnée n\'existe plus. Veuillez actualiser la page et réessayer.';
    } else if (error.code === '23505') {
      // Unique constraint violation
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

  // Ensure approuve is treated as a boolean
  const approuveValue = validation.approuve;
  const isApproved = approuveValue === true || approuveValue === 'true' || approuveValue === 1;

  return {
    modif_id: modif.id,
    status: isApproved ? 'approved' : 'rejected',
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

  // Fetch validations - ensure we get all validations even if there are errors
  const { data: validations, error: validationError } = await supabase
    .from('appbadge_session_modif_validations')
    .select('modif_id, approuve, commentaire as validator_comment, validated_at')
    .in('modif_id', modifIds);

  if (validationError) {
    console.error('Error fetching validations:', validationError);
    // Don't return early - we'll treat all as pending if we can't fetch validations
  }

  // Group modifs by entree_id (take the latest one per entree_id based on created_at)
  // Since we ordered by created_at DESC, the first one we encounter is the latest
  const modifsByEntree = new Map<string, typeof modifs[0]>();
  modifs.forEach(modif => {
    if (!modifsByEntree.has(modif.entree_id)) {
      modifsByEntree.set(modif.entree_id, modif);
    }
  });

  // Create validation lookup map - ensure we handle the case where validations might be null/undefined
  const validationsByModif = new Map<string, typeof validations?.[0]>();
  if (validations && Array.isArray(validations)) {
    validations.forEach(validation => {
      if (validation && validation.modif_id) {
        validationsByModif.set(validation.modif_id, validation);
      }
    });
  }

  // Build status map for all entree_ids
  entree_ids.forEach(entree_id => {
    const modif = modifsByEntree.get(entree_id);
    if (!modif) {
      statusMap.set(entree_id, { status: 'none' });
      return;
    }

    const validation = validationsByModif.get(modif.id);
    if (!validation) {
      // No validation found - check if this is because of an error or truly pending
      // If we had an error fetching validations, we can't be sure, so mark as pending
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

    // Validation exists - determine status based on approuve field
    // Ensure approuve is treated as a boolean (handle string "true"/"false" or boolean)
    const approuveValue = validation.approuve;
    const isApproved = approuveValue === true || approuveValue === 'true' || approuveValue === 1;
    
    statusMap.set(entree_id, {
      modif_id: modif.id,
      status: isApproved ? 'approved' : 'rejected',
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

/**
 * Interface for a modification request with user and session details
 */
export interface ModificationRequestWithDetails {
  id: string;
  entree_id: string;
  utilisateur_id: string;
  proposed_entree_ts: string | null;
  proposed_sortie_ts: string | null;
  pause_delta_minutes: number;
  motif: string | null;
  commentaire: string | null;
  created_at: string;
  // User details
  utilisateur_nom: string;
  utilisateur_prenom: string;
  utilisateur_email: string | null;
  // Session details
  session_jour_local: string;
  session_entree_ts: string;
  session_sortie_ts: string;
  session_duree_minutes: number;
  session_lieux: string | null;
}

/**
 * Fetch all pending modification requests (not yet validated)
 */
export const fetchPendingModificationRequests = async (): Promise<ModificationRequestWithDetails[]> => {
  // First, get all modification requests
  const { data: modifs, error: modifError } = await supabase
    .from('appbadge_session_modifs')
    .select('id, entree_id, utilisateur_id, proposed_entree_ts, proposed_sortie_ts, pause_delta_minutes, motif, commentaire, created_at')
    .order('created_at', { ascending: false });

  if (modifError) {
    console.error('Error fetching modification requests:', modifError);
    return [];
  }

  if (!modifs || modifs.length === 0) {
    return [];
  }

  // Get all validation IDs to filter out already validated requests
  const modifIds = modifs.map(m => m.id);
  const { data: validations } = await supabase
    .from('appbadge_session_modif_validations')
    .select('modif_id')
    .in('modif_id', modifIds);

  const validatedModifIds = new Set(validations?.map(v => v.modif_id) || []);

  // Filter to only pending requests
  const pendingModifs = modifs.filter(m => !validatedModifIds.has(m.id));

  if (pendingModifs.length === 0) {
    return [];
  }

  // Get user details
  const userIds = [...new Set(pendingModifs.map(m => m.utilisateur_id))];
  const { data: users, error: usersError } = await supabase
    .from('appbadge_utilisateurs')
    .select('id, nom, prenom, email')
    .in('id', userIds);

  if (usersError) {
    console.error('Error fetching user details:', usersError);
    return [];
  }

  // Create a map of users by id
  const usersById = new Map(
    (users || []).map(u => [u.id, u])
  );

  // Get session details for each entree_id
  const entreeIds = pendingModifs.map(m => m.entree_id);
  const { data: sessions, error: sessionsError } = await supabase
    .from('appbadge_v_sessions')
    .select('entree_id, jour_local, entree_ts, sortie_ts, duree_minutes, lieux')
    .in('entree_id', entreeIds);

  if (sessionsError) {
    console.error('Error fetching session details:', sessionsError);
    return [];
  }

  // Create a map of sessions by entree_id
  const sessionsByEntree = new Map(
    (sessions || []).map(s => [s.entree_id, s])
  );

  // Combine modification requests with user and session details
  const result: ModificationRequestWithDetails[] = pendingModifs
    .map(modif => {
      const user = usersById.get(modif.utilisateur_id);
      const session = sessionsByEntree.get(modif.entree_id);

      if (!session || !user) {
        return null; // Skip if session or user not found
      }

      return {
        id: modif.id,
        entree_id: modif.entree_id,
        utilisateur_id: modif.utilisateur_id,
        proposed_entree_ts: modif.proposed_entree_ts,
        proposed_sortie_ts: modif.proposed_sortie_ts,
        pause_delta_minutes: modif.pause_delta_minutes,
        motif: modif.motif,
        commentaire: modif.commentaire,
        created_at: modif.created_at,
        utilisateur_nom: user.nom || '',
        utilisateur_prenom: user.prenom || '',
        utilisateur_email: user.email || null,
        session_jour_local: session.jour_local,
        session_entree_ts: session.entree_ts,
        session_sortie_ts: session.sortie_ts,
        session_duree_minutes: session.duree_minutes,
        session_lieux: session.lieux,
      };
    })
    .filter((item): item is ModificationRequestWithDetails => item !== null);

  return result;
};

/**
 * Validate a modification request (approve or reject)
 */
export const validateModificationRequest = async (
  modifId: string,
  validateurId: string,
  approuve: boolean,
  commentaire?: string | null
): Promise<void> => {
  // Ensure proper data types and format
  const insertData: any = {
    modif_id: modifId,
    validateur_id: validateurId,
    approuve: Boolean(approuve), // Ensure it's a boolean
  };
  
  // Only include commentaire if it's not empty
  if (commentaire && commentaire.trim() !== '') {
    insertData.commentaire = commentaire.trim();
  } else {
    insertData.commentaire = null;
  }

  console.log('Inserting validation:', insertData);

  const { data, error } = await supabase
    .from('appbadge_session_modif_validations')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error validating modification request:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Provide user-friendly error messages
    let userMessage = 'Une erreur est survenue lors de la validation de la demande.';
    
    if (error.message) {
      // Check for specific database trigger errors
      if (error.message.includes('cannot validate their own') || error.message.includes('ne peut pas valider')) {
        userMessage = 'Un utilisateur ne peut pas valider sa propre demande de modification.';
      } else if (error.message.includes('not found') || error.message.includes('n\'existe pas')) {
        userMessage = 'La demande de modification n\'existe plus.';
      } else if (error.message.includes('UNIQUE constraint') || error.message.includes('déjà été validée')) {
        userMessage = 'Cette demande a déjà été validée.';
      } else if (error.message.includes('foreign key') || error.message.includes('clé étrangère')) {
        userMessage = 'Erreur de référence: l\'administrateur ou la demande n\'existe pas.';
      } else {
        userMessage = error.message;
      }
    }
    
    // Include details and hint if available
    if (error.details) {
      userMessage += ` (${error.details})`;
    }
    if (error.hint) {
      userMessage += ` - ${error.hint}`;
    }
    
    const customError = new Error(userMessage);
    (customError as any).code = error.code;
    (customError as any).details = error.details;
    (customError as any).hint = error.hint;
    throw customError;
  }

  return data;
};

