-- =====================================================================
-- RGPD Data Purge Functions and Scheduled Jobs
-- =====================================================================
-- This file implements automatic data purging according to RGPD retention periods:
-- - GPS/Location data: 3 weeks (21 days)
-- - Badgeage data: 5 years
-- =====================================================================

BEGIN;

-- =====================================================================
-- Function: Purge GPS/Location data older than 3 weeks
-- =====================================================================
DROP FUNCTION IF EXISTS public.purge_old_gps_data() CASCADE;
CREATE OR REPLACE FUNCTION public.purge_old_gps_data()
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_deleted_count bigint;
BEGIN
  -- Calculate cutoff date: 3 weeks (21 days) ago
  v_cutoff_date := (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '21 days';
  
  -- Delete GPS coordinates (latitude, longitude) from badgeages older than 3 weeks
  -- Keep the badgeage record but anonymize the location data
  UPDATE public.appbadge_badgeages
  SET latitude = NULL,
      longitude = NULL
  WHERE date_heure < v_cutoff_date
    AND (latitude IS NOT NULL OR longitude IS NOT NULL);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================================
-- Function: Purge badgeage data older than 5 years
-- =====================================================================
DROP FUNCTION IF EXISTS public.purge_old_badgeage_data()
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_deleted_count bigint;
BEGIN
  -- Calculate cutoff date: 5 years ago
  v_cutoff_date := (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';
  
  -- Delete badgeage records older than 5 years
  -- Note: This will cascade delete related records in session_modifs if foreign keys are set up
  DELETE FROM public.appbadge_badgeages
  WHERE date_heure < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================================
-- Function: Purge old session modification requests (older than 5 years)
-- =====================================================================
DROP FUNCTION IF EXISTS public.purge_old_session_modifications()
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_deleted_count bigint;
BEGIN
  -- Calculate cutoff date: 5 years ago
  v_cutoff_date := (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';
  
  -- Delete session modification requests older than 5 years
  DELETE FROM public.appbadge_session_modifs
  WHERE created_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================================
-- Function: Purge old oubli badgeage requests (older than 5 years)
-- =====================================================================
DROP FUNCTION IF EXISTS public.purge_old_oubli_badgeages()
RETURNS TABLE(deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_deleted_count bigint;
BEGIN
  -- Calculate cutoff date: 5 years ago
  v_cutoff_date := (now() AT TIME ZONE 'Indian/Reunion') - INTERVAL '5 years';
  
  -- Delete oubli badgeage requests older than 5 years
  DELETE FROM public.appbadge_oubli_badgeages
  WHERE date_heure_saisie < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================================
-- Scheduled Jobs using pg_cron
-- =====================================================================

-- Job 1: Purge GPS data older than 3 weeks (runs daily at 3:00 AM)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd_purge_gps_data')
  THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'rgpd_purge_gps_data'))
END;
SELECT cron.schedule(
  'rgpd_purge_gps_data',
  '0 3 * * *',  -- Daily at 3:00 AM
  'SELECT public.purge_old_gps_data();'
);

-- Job 2: Purge badgeage data older than 5 years (runs daily at 3:30 AM)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd_purge_badgeage_data')
  THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'rgpd_purge_badgeage_data'))
END;
SELECT cron.schedule(
  'rgpd_purge_badgeage_data',
  '30 3 * * *',  -- Daily at 3:30 AM
  'SELECT public.purge_old_badgeage_data();'
);

-- Job 3: Purge session modifications older than 5 years (runs daily at 4:00 AM)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd_purge_session_modifications')
  THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'rgpd_purge_session_modifications'))
END;
SELECT cron.schedule(
  'rgpd_purge_session_modifications',
  '0 4 * * *',  -- Daily at 4:00 AM
  'SELECT public.purge_old_session_modifications();'
);

-- Job 4: Purge oubli badgeage requests older than 5 years (runs daily at 4:30 AM)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd_purge_oubli_badgeages')
  THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'rgpd_purge_oubli_badgeages'))
END;
SELECT cron.schedule(
  'rgpd_purge_oubli_badgeages',
  '30 4 * * *',  -- Daily at 4:30 AM
  'SELECT public.purge_old_oubli_badgeages();'
);

COMMIT;

-- =====================================================================
-- Notes
-- =====================================================================
-- 1. GPS data purge: Anonymizes (sets to NULL) latitude/longitude after 3 weeks
-- 2. Badgeage data purge: Deletes entire records after 5 years
-- 3. All jobs run during off-peak hours (3-5 AM) to minimize impact
-- 4. Functions use SECURITY DEFINER to bypass RLS for administrative operations
-- 5. The purge jobs are scheduled using pg_cron extension
-- =====================================================================

