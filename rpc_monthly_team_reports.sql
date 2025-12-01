-- =====================================================================
-- Monthly Team Reports RPC Function
-- =====================================================================
-- This function provides monthly badgeage statistics for managers and admins
-- Managers can only see their service, Admins can see all services
-- =====================================================================

BEGIN;

-- Function to get monthly team statistics
DROP FUNCTION IF EXISTS public.get_monthly_team_stats(integer, integer, text) CASCADE;
CREATE OR REPLACE FUNCTION public.get_monthly_team_stats(
  p_year integer,
  p_month integer,
  p_service text DEFAULT NULL
)
RETURNS TABLE (
  service text,
  total_hours numeric,
  avg_hours_per_user numeric,
  total_delays_minutes bigint,
  absences_count bigint,
  users jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_service_filter text;
BEGIN
  -- Calculate start and end dates for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month')::date;
  
  -- If p_service is provided, use it; otherwise return all services (admin access)
  v_service_filter := p_service;
  
  -- Return aggregated statistics
  RETURN QUERY
  WITH month_data AS (
    SELECT 
      u.service,
      u.id AS utilisateur_id,
      u.nom,
      u.prenom,
      u.email,
      COALESCE(SUM(s.travail_net_minutes), 0)::bigint AS total_travail_net_minutes,
      COALESCE(SUM(s.retard_minutes), 0)::bigint AS total_retard_minutes,
      COUNT(DISTINCT CASE WHEN s.utilisateur_id IS NULL THEN NULL ELSE s.jour_local END) AS jours_travailles,
      COUNT(DISTINCT CASE 
        WHEN s.utilisateur_id IS NULL THEN NULL 
        ELSE s.jour_local 
      END) AS jours_presents
    FROM public.appbadge_utilisateurs u
    LEFT JOIN public.appbadge_v_synthese_journaliere s 
      ON s.utilisateur_id = u.id
      AND s.jour_local >= v_start_date
      AND s.jour_local < v_end_date
    WHERE u.actif = true
      AND (v_service_filter IS NULL OR u.service = v_service_filter)
    GROUP BY u.id, u.service, u.nom, u.prenom, u.email
  ),
  service_agg AS (
    SELECT 
      md.service,
      SUM(md.total_travail_net_minutes)::numeric / 60.0 AS total_hours,
      AVG(md.total_travail_net_minutes)::numeric / 60.0 AS avg_hours_per_user,
      COALESCE(SUM(md.total_retard_minutes), 0)::bigint AS total_delays_minutes,
      COALESCE(COUNT(*) FILTER (WHERE md.jours_presents = 0), 0)::bigint AS absences_count,
      jsonb_agg(
        jsonb_build_object(
          'utilisateur_id', md.utilisateur_id,
          'nom', md.nom,
          'prenom', md.prenom,
          'email', md.email,
          'total_hours', ROUND((md.total_travail_net_minutes::numeric / 60.0)::numeric, 2),
          'avg_hours_per_day', CASE 
            WHEN md.jours_travailles > 0 
            THEN ROUND((md.total_travail_net_minutes::numeric / 60.0 / md.jours_travailles)::numeric, 2)
            ELSE 0
          END,
          'total_delays_minutes', md.total_retard_minutes,
          'jours_travailles', md.jours_travailles,
          'is_absent', (md.jours_presents = 0)
        )
        ORDER BY md.nom, md.prenom
      ) AS users
    FROM month_data md
    WHERE md.service IS NOT NULL
    GROUP BY md.service
  )
  SELECT 
    sa.service,
    ROUND(sa.total_hours, 2) AS total_hours,
    ROUND(sa.avg_hours_per_user, 2) AS avg_hours_per_user,
    sa.total_delays_minutes,
    sa.absences_count,
    sa.users
  FROM service_agg sa
  ORDER BY sa.service;
END;
$$;

COMMIT;

-- =====================================================================
-- Notes
-- =====================================================================
-- 1. This function uses SECURITY DEFINER to bypass RLS for admin access
-- 2. Managers should call this with their service, Admins with NULL
-- 3. The function aggregates data from appbadge_v_synthese_journaliere
-- 4. Returns service-level aggregates and user-level details as JSONB
-- =====================================================================

