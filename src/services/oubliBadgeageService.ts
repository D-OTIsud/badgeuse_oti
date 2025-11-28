import { supabase } from '../supabaseClient';

export interface OubliBadgeageRequest {
  id: string;
  utilisateur_id: string;
  date_heure_saisie: string;
  date_heure_entree: string;
  date_heure_sortie: string;
  date_heure_pause_debut: string | null;
  date_heure_pause_fin: string | null;
  raison: string;
  commentaire: string | null;
  perte_badge: boolean;
  etat_validation: 'en attente' | 'validée' | 'refusée';
  date_validation: string | null;
  validateur_id: string | null;
  lieux: string | null;
  // User details (joined)
  utilisateur_nom: string | null;
  utilisateur_prenom: string | null;
  utilisateur_email: string | null;
}

export interface OubliBadgeageRequestWithDetails extends OubliBadgeageRequest {
  // No longer needed - single record now contains both times
}

/**
 * Fetch all pending oubli badgeage requests (not yet validated)
 * Now returns single records with both entrée and sortie times
 */
export const fetchPendingOubliRequests = async (): Promise<OubliBadgeageRequestWithDetails[]> => {
  // Fetch all pending requests with user details
  // Support both new format (date_heure_entree/date_heure_sortie) and old format (date_heure_badge + type_action)
  const { data: requests, error } = await supabase
    .from('appbadge_oubli_badgeages')
      .select(`
      id,
      utilisateur_id,
      date_heure_saisie,
      date_heure_entree,
      date_heure_sortie,
      date_heure_pause_debut,
      date_heure_pause_fin,
      raison,
      commentaire,
      perte_badge,
      etat_validation,
      date_validation,
      validateur_id,
      lieux,
      appbadge_utilisateurs:utilisateur_id (
        nom,
        prenom,
        email,
        lieux
      )
    `)
    .eq('etat_validation', 'en attente')
    .order('date_heure_saisie', { ascending: false });

  if (error) {
    console.error('Error fetching oubli badgeage requests:', error);
    return [];
  }

  if (!requests || requests.length === 0) {
    return [];
  }

  // Convert to result format, handling both new and old data formats
  const result: OubliBadgeageRequestWithDetails[] = [];

  // Group old format records (type_action-based) by date_heure_saisie
  const oldFormatGroups = new Map<string, { entree?: any; sortie?: any; utilisateur?: any }>();
  
  requests.forEach((req: any) => {
    const user = req.appbadge_utilisateurs;
    
      // New format: has date_heure_entree and date_heure_sortie
      if (req.date_heure_entree && req.date_heure_sortie) {
        result.push({
          id: req.id,
          utilisateur_id: req.utilisateur_id,
          date_heure_saisie: req.date_heure_saisie,
          date_heure_entree: req.date_heure_entree,
          date_heure_sortie: req.date_heure_sortie,
          date_heure_pause_debut: req.date_heure_pause_debut || null,
          date_heure_pause_fin: req.date_heure_pause_fin || null,
          raison: req.raison,
          commentaire: req.commentaire,
          perte_badge: req.perte_badge,
          etat_validation: req.etat_validation,
          date_validation: req.date_validation,
          validateur_id: req.validateur_id,
          lieux: req.lieux || user?.lieux || null,
          utilisateur_nom: user?.nom || null,
          utilisateur_prenom: user?.prenom || null,
          utilisateur_email: user?.email || null,
        });
      } else {
      // Old format: group by date_heure_saisie
      const dateKey = `${req.utilisateur_id}_${req.date_heure_saisie}`;
      if (!oldFormatGroups.has(dateKey)) {
        oldFormatGroups.set(dateKey, { utilisateur: user });
      }
      const group = oldFormatGroups.get(dateKey)!;
      if (req.type_action === 'entrée') {
        group.entree = req;
      } else if (req.type_action === 'sortie') {
        group.sortie = req;
      }
    }
  });

  // Process old format groups
  oldFormatGroups.forEach((group, dateKey) => {
    if (group.entree && group.sortie) {
      result.push({
        id: group.entree.id,
        utilisateur_id: group.entree.utilisateur_id,
        date_heure_saisie: group.entree.date_heure_saisie,
        date_heure_entree: group.entree.date_heure_badge,
        date_heure_sortie: group.sortie.date_heure_badge,
        date_heure_pause_debut: null, // Old format doesn't have pause info
        date_heure_pause_fin: null,
        raison: group.entree.raison,
        commentaire: group.entree.commentaire,
        perte_badge: group.entree.perte_badge,
        etat_validation: group.entree.etat_validation,
        date_validation: group.entree.date_validation,
        validateur_id: group.entree.validateur_id,
        lieux: group.utilisateur?.lieux || null,
        utilisateur_nom: group.utilisateur?.nom || null,
        utilisateur_prenom: group.utilisateur?.prenom || null,
        utilisateur_email: group.utilisateur?.email || null,
      });
    }
  });

  return result;
};

/**
 * Fetch all oubli badgeage requests for a specific user (all statuses)
 * Returns a set of dates (YYYY-MM-DD) that already have requests
 */
export const fetchUserOubliRequestDates = async (utilisateurId: string): Promise<Set<string>> => {
  const { data: requests, error } = await supabase
    .from('appbadge_oubli_badgeages')
    .select('date_heure_entree')
    .eq('utilisateur_id', utilisateurId);

  if (error) {
    console.error('Error fetching user oubli badgeage requests:', error);
    return new Set();
  }

  if (!requests || requests.length === 0) {
    return new Set();
  }

  // Extract dates from entree timestamps (format: YYYY-MM-DD)
  const dates = new Set<string>();
  requests.forEach((req: any) => {
    if (req.date_heure_entree) {
      const dateStr = req.date_heure_entree.split('T')[0]; // Extract YYYY-MM-DD
      dates.add(dateStr);
    }
  });

  return dates;
};

/**
 * Validate oubli badgeage request (approve or reject)
 * Now validates a single record
 */
export const validateOubliRequest = async (
  requestId: string,
  validateurId: string,
  approuve: boolean,
  commentaire?: string | null
): Promise<void> => {
  const now = new Date().toISOString();
  const etat = approuve ? 'validée' : 'refusée';

  // Update the single record
  const { error } = await supabase
    .from('appbadge_oubli_badgeages')
    .update({
      etat_validation: etat,
      date_validation: now,
      validateur_id: validateurId,
      commentaire: commentaire && commentaire.trim() !== '' ? commentaire.trim() : null
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error validating oubli badgeage request:', error);
    throw new Error('Erreur lors de la validation de la demande');
  }
};

