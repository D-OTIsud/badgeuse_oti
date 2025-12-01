-- =====================================================================
-- RGPD Filtered Views
-- =====================================================================
-- These views automatically filter data based on RGPD retention periods
-- to ensure data older than retention periods is not accessible even
-- if it hasn't been purged yet
-- =====================================================================

BEGIN;

-- =====================================================================
-- View: Badgeages with GPS data filtered (only last 3 weeks)
-- =====================================================================
CREATE OR REPLACE VIEW public.appbadge_v_badgeages_gps_filtered AS
SELECT 
  id,
  utilisateur_id,
  type_action,
  code,
  lieux,
  commentaire,
  date_heure,
  -- GPS data only shown if within 3 weeks
  CASE 
    WHEN date_heure >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '21 days'
    THEN latitude
    ELSE NULL
  END AS latitude,
  CASE 
    WHEN date_heure >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '21 days'
    THEN longitude
    ELSE NULL
  END AS longitude
FROM public.appbadge_badgeages
WHERE date_heure >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';

-- =====================================================================
-- View: Badgeages filtered by retention period (5 years)
-- =====================================================================
CREATE OR REPLACE VIEW public.appbadge_v_badgeages_retention_filtered AS
SELECT *
FROM public.appbadge_badgeages
WHERE date_heure >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';

-- =====================================================================
-- View: Session modifications filtered by retention period (5 years)
-- =====================================================================
CREATE OR REPLACE VIEW public.appbadge_v_session_modifs_retention_filtered AS
SELECT *
FROM public.appbadge_session_modifs
WHERE created_at >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';

-- =====================================================================
-- View: Oubli badgeage requests filtered by retention period (5 years)
-- =====================================================================
CREATE OR REPLACE VIEW public.appbadge_v_oubli_badgeages_retention_filtered AS
SELECT *
FROM public.appbadge_oubli_badgeages
WHERE date_heure_saisie >= (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';

COMMIT;

-- =====================================================================
-- Notes
-- =====================================================================
-- 1. These views automatically filter data based on RGPD retention periods
-- 2. GPS data is filtered to show only last 3 weeks (21 days)
-- 3. Badgeage data is filtered to show only last 5 years
-- 4. These views should be used in place of direct table access when
--    RGPD compliance is required
-- 5. The purge functions will physically delete data, but these views
--    provide an additional layer of protection
-- =====================================================================

