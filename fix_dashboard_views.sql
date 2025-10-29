-- Fix Dashboard views that are not working
-- This script updates the existing views to match the new database structure

-- Fix appbadge_v_dashboard_jour to handle NULL statut_presence
CREATE OR REPLACE VIEW public.appbadge_v_dashboard_jour(
  utilisateur_id, nom, prenom, jour_local, travail_total_minutes, pause_total_minutes,
  travail_net_minutes, lieux, heure_debut, heure_fin, retard_minutes, depart_anticipe_minutes,
  statut_presence, dernier_badgeage
) AS
SELECT s.utilisateur_id, s.nom, s.prenom, s.jour_local,
       s.travail_total_minutes, s.pause_total_minutes, s.travail_net_minutes,
       s.lieux, s.heure_debut, s.heure_fin, s.retard_minutes, s.depart_anticipe_minutes,
       COALESCE(st.statut_presence, 'absent') AS statut_presence,
       st.dernier_badgeage
FROM appbadge_v_synthese_journaliere s
LEFT JOIN appbadge_v_statut_courant st ON st.utilisateur_id = s.utilisateur_id;

-- Ensure the view exists and is accessible
GRANT SELECT ON public.appbadge_v_dashboard_jour TO authenticated;
GRANT SELECT ON public.appbadge_v_dashboard_jour TO anon;

