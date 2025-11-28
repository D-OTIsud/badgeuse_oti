import { supabase } from '../supabaseClient';

export interface OubliBadgeageRequest {
  id: string;
  utilisateur_id: string;
  date_heure_saisie: string;
  date_heure_badge: string;
  type_action: 'entrée' | 'sortie' | 'pause' | 'retour';
  raison: string;
  commentaire: string | null;
  perte_badge: boolean;
  etat_validation: 'en attente' | 'validée' | 'refusée';
  date_validation: string | null;
  validateur_id: string | null;
  // User details (joined)
  utilisateur_nom: string | null;
  utilisateur_prenom: string | null;
  utilisateur_email: string | null;
}

export interface OubliBadgeageRequestWithDetails extends OubliBadgeageRequest {
  // Grouped by session (entrée + sortie pairs)
  entree_id?: string;
  sortie_id?: string;
  entree_date_heure_badge?: string;
  sortie_date_heure_badge?: string;
  lieux?: string | null;
}

/**
 * Fetch all pending oubli badgeage requests (not yet validated)
 * Groups entrée and sortie pairs together
 */
export const fetchPendingOubliRequests = async (): Promise<OubliBadgeageRequestWithDetails[]> => {
  // Fetch all pending requests with user details
  const { data: requests, error } = await supabase
    .from('appbadge_oubli_badgeages')
    .select(`
      id,
      utilisateur_id,
      date_heure_saisie,
      date_heure_badge,
      type_action,
      raison,
      commentaire,
      perte_badge,
      etat_validation,
      date_validation,
      validateur_id,
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

  // Group entrée and sortie pairs by user and date_heure_saisie (they're created together)
  const grouped = new Map<string, {
    entree?: any;
    sortie?: any;
    utilisateur: any;
  }>();

  requests.forEach((req: any) => {
    const user = req.appbadge_utilisateurs;
    // Group by utilisateur_id and date_heure_saisie (same timestamp = same request)
    const dateKey = `${req.utilisateur_id}_${req.date_heure_saisie}`;
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        utilisateur: user
      });
    }

    const group = grouped.get(dateKey)!;
    if (req.type_action === 'entrée') {
      group.entree = req;
    } else if (req.type_action === 'sortie') {
      group.sortie = req;
    }
  });

  // Convert to array format, only include pairs that have both entrée and sortie
  const result: OubliBadgeageRequestWithDetails[] = [];

  grouped.forEach((group, dateKey) => {
    if (group.entree && group.sortie) {
      // Use the entrée record as the base, but include both IDs
      result.push({
        id: group.entree.id, // Use entrée ID as primary
        entree_id: group.entree.id,
        sortie_id: group.sortie.id,
        utilisateur_id: group.entree.utilisateur_id,
        date_heure_saisie: group.entree.date_heure_saisie,
        date_heure_badge: group.entree.date_heure_badge, // Entrée time
        entree_date_heure_badge: group.entree.date_heure_badge,
        sortie_date_heure_badge: group.sortie.date_heure_badge,
        type_action: group.entree.type_action,
        raison: group.entree.raison,
        commentaire: group.entree.commentaire,
        perte_badge: group.entree.perte_badge,
        etat_validation: group.entree.etat_validation,
        date_validation: group.entree.date_validation,
        validateur_id: group.entree.validateur_id,
        utilisateur_nom: group.utilisateur?.nom || null,
        utilisateur_prenom: group.utilisateur?.prenom || null,
        utilisateur_email: group.utilisateur?.email || null,
        lieux: group.utilisateur?.lieux || null,
      });
    }
  });

  return result;
};

/**
 * Validate oubli badgeage requests (approve or reject)
 * Validates both entrée and sortie records
 */
export const validateOubliRequest = async (
  entreeId: string,
  sortieId: string,
  validateurId: string,
  approuve: boolean,
  commentaire?: string | null
): Promise<void> => {
  const now = new Date().toISOString();
  const etat = approuve ? 'validée' : 'refusée';

  // Update both entrée and sortie records
  const { error: entreeError } = await supabase
    .from('appbadge_oubli_badgeages')
    .update({
      etat_validation: etat,
      date_validation: now,
      validateur_id: validateurId,
      commentaire: commentaire && commentaire.trim() !== '' ? commentaire.trim() : null
    })
    .eq('id', entreeId);

  if (entreeError) {
    console.error('Error validating entrée oubli badgeage:', entreeError);
    throw new Error('Erreur lors de la validation de la demande d\'entrée');
  }

  const { error: sortieError } = await supabase
    .from('appbadge_oubli_badgeages')
    .update({
      etat_validation: etat,
      date_validation: now,
      validateur_id: validateurId,
      commentaire: commentaire && commentaire.trim() !== '' ? commentaire.trim() : null
    })
    .eq('id', sortieId);

  if (sortieError) {
    console.error('Error validating sortie oubli badgeage:', sortieError);
    throw new Error('Erreur lors de la validation de la demande de sortie');
  }
};

