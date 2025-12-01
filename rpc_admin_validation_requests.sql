-- RPC Function for Admin Validation Page
-- This function fetches all pending modification and oubli badgeage requests in a single optimized query

CREATE OR REPLACE FUNCTION get_admin_validation_requests()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'modification_requests', (
      SELECT json_agg(
        json_build_object(
          'id', m.id,
          'entree_id', m.entree_id,
          'utilisateur_id', m.utilisateur_id,
          'proposed_entree_ts', m.proposed_entree_ts,
          'proposed_sortie_ts', m.proposed_sortie_ts,
          'pause_delta_minutes', m.pause_delta_minutes,
          'motif', m.motif,
          'commentaire', m.commentaire,
          'created_at', m.created_at,
          'utilisateur_nom', u.nom,
          'utilisateur_prenom', u.prenom,
          'utilisateur_email', u.email,
          'session_jour_local', s.jour_local,
          'session_entree_ts', s.entree_ts,
          'session_sortie_ts', s.sortie_ts,
          'session_duree_minutes', s.duree_minutes,
          'session_pause_minutes', COALESCE(pt.total_pause_minutes, 0),
          'session_lieux', s.lieux
        )
        ORDER BY m.created_at DESC
      )
      FROM appbadge_session_modifs m
      LEFT JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
      INNER JOIN appbadge_utilisateurs u ON u.id = m.utilisateur_id
      INNER JOIN appbadge_v_sessions s ON s.entree_id = m.entree_id
      LEFT JOIN appbadge_v_session_pause_totals pt ON pt.entree_id = m.entree_id
      WHERE v.modif_id IS NULL  -- Only pending (not validated)
    ),
    'oubli_requests', (
      SELECT json_agg(
        json_build_object(
          'id', o.id,
          'utilisateur_id', o.utilisateur_id,
          'date_heure_saisie', o.date_heure_saisie,
          'date_heure_entree', o.date_heure_entree,
          'date_heure_sortie', o.date_heure_sortie,
          'date_heure_pause_debut', o.date_heure_pause_debut,
          'date_heure_pause_fin', o.date_heure_pause_fin,
          'raison', o.raison,
          'commentaire', o.commentaire,
          'perte_badge', o.perte_badge,
          'etat_validation', o.etat_validation,
          'date_validation', o.date_validation,
          'validateur_id', o.validateur_id,
          'lieux', COALESCE(o.lieux, u.lieux),
          'utilisateur_nom', u.nom,
          'utilisateur_prenom', u.prenom,
          'utilisateur_email', u.email
        )
        ORDER BY o.date_heure_saisie DESC
      )
      FROM appbadge_oubli_badgeages o
      INNER JOIN appbadge_utilisateurs u ON u.id = o.utilisateur_id
      WHERE o.etat_validation = 'en attente'
    )
  ) INTO result;
  
  RETURN COALESCE(result, json_build_object('modification_requests', json_build_array(), 'oubli_requests', json_build_array()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_validation_requests() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_validation_requests() IS 'Fetches all pending modification and oubli badgeage requests for admin validation page in a single optimized query';

