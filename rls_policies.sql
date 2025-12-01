-- =====================================================================
-- Supabase Row Level Security (RLS) Policies
-- =====================================================================
-- This file contains RLS policies for all application tables
-- Ensure that:
-- - Admins/Managers can access all data
-- - Regular users can only access their own data
-- - The app continues to work as expected
-- =====================================================================

BEGIN;

-- =====================================================================
-- Helper Functions for RLS
-- =====================================================================

-- Function to check if current user exists in appbadge_utilisateurs
-- Returns the user's ID if found, NULL otherwise
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM appbadge_utilisateurs
  WHERE id = auth.uid()
    AND actif = true
  LIMIT 1;
$$;

-- Function to check if current user is the owner of a record
-- Used for checking ownership by utilisateur_id
CREATE OR REPLACE FUNCTION public.is_own_record(p_utilisateur_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = p_utilisateur_id
    AND EXISTS (
      SELECT 1
      FROM appbadge_utilisateurs
      WHERE id = auth.uid()
        AND actif = true
    );
$$;

-- =====================================================================
-- Enable RLS on All Tables
-- =====================================================================

ALTER TABLE public.appbadge_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_badgeages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_horaires_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_oubli_badgeages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_session_modifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appbadge_session_modif_validations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on appbadge_lieux if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appbadge_lieux') THEN
    ALTER TABLE public.appbadge_lieux ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================================
-- Policies for appbadge_utilisateurs (Users)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own record" ON public.appbadge_utilisateurs;
DROP POLICY IF EXISTS "Users can read active users list" ON public.appbadge_utilisateurs;
DROP POLICY IF EXISTS "Admins can read all users" ON public.appbadge_utilisateurs;
DROP POLICY IF EXISTS "Admins can update all users" ON public.appbadge_utilisateurs;
DROP POLICY IF EXISTS "Admins can insert users" ON public.appbadge_utilisateurs;

-- Policy: Users can read their own record
CREATE POLICY "Users can read own record"
ON public.appbadge_utilisateurs
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  AND actif = true
);

-- Policy: All authenticated users can read active users list (for user selection)
CREATE POLICY "Users can read active users list"
ON public.appbadge_utilisateurs
FOR SELECT
TO authenticated
USING (actif = true);

-- Policy: Admins can read all users
CREATE POLICY "Admins can read all users"
ON public.appbadge_utilisateurs
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
ON public.appbadge_utilisateurs
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can insert new users
CREATE POLICY "Admins can insert users"
ON public.appbadge_utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_badgeages (Badge events)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own badgeages" ON public.appbadge_badgeages;
DROP POLICY IF EXISTS "Users can insert own badgeages" ON public.appbadge_badgeages;
DROP POLICY IF EXISTS "Admins can read all badgeages" ON public.appbadge_badgeages;
DROP POLICY IF EXISTS "Admins can insert badgeages" ON public.appbadge_badgeages;
DROP POLICY IF EXISTS "Admins can update badgeages" ON public.appbadge_badgeages;
DROP POLICY IF EXISTS "Admins can delete badgeages" ON public.appbadge_badgeages;

-- Policy: Users can read their own badgeages
CREATE POLICY "Users can read own badgeages"
ON public.appbadge_badgeages
FOR SELECT
TO authenticated
USING (public.is_own_record(utilisateur_id));

-- Policy: Users can insert their own badgeages
CREATE POLICY "Users can insert own badgeages"
ON public.appbadge_badgeages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_own_record(utilisateur_id)
  AND utilisateur_id = auth.uid()
);

-- Policy: Admins can read all badgeages
CREATE POLICY "Admins can read all badgeages"
ON public.appbadge_badgeages
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can insert badgeages for any user
CREATE POLICY "Admins can insert badgeages"
ON public.appbadge_badgeages
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can update badgeages
CREATE POLICY "Admins can update badgeages"
ON public.appbadge_badgeages
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can delete badgeages
CREATE POLICY "Admins can delete badgeages"
ON public.appbadge_badgeages
FOR DELETE
TO authenticated
USING (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_badges (Physical badges)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own badges" ON public.appbadge_badges;
DROP POLICY IF EXISTS "Admins can read all badges" ON public.appbadge_badges;
DROP POLICY IF EXISTS "Admins can insert badges" ON public.appbadge_badges;
DROP POLICY IF EXISTS "Admins can update badges" ON public.appbadge_badges;
DROP POLICY IF EXISTS "Admins can delete badges" ON public.appbadge_badges;

-- Policy: Users can read their own badges
CREATE POLICY "Users can read own badges"
ON public.appbadge_badges
FOR SELECT
TO authenticated
USING (public.is_own_record(utilisateur_id));

-- Policy: Admins can read all badges
CREATE POLICY "Admins can read all badges"
ON public.appbadge_badges
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can insert badges
CREATE POLICY "Admins can insert badges"
ON public.appbadge_badges
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can update badges
CREATE POLICY "Admins can update badges"
ON public.appbadge_badges
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can delete badges
CREATE POLICY "Admins can delete badges"
ON public.appbadge_badges
FOR DELETE
TO authenticated
USING (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_horaires_standards (Standard schedules)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All authenticated can read schedules" ON public.appbadge_horaires_standards;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.appbadge_horaires_standards;

-- Policy: All authenticated users can read schedules
CREATE POLICY "All authenticated can read schedules"
ON public.appbadge_horaires_standards
FOR SELECT
TO authenticated
USING (true);

-- Policy: Admins can insert/update/delete schedules
CREATE POLICY "Admins can manage schedules"
ON public.appbadge_horaires_standards
FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_oubli_badgeages (Missed badge requests)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own oubli requests" ON public.appbadge_oubli_badgeages;
DROP POLICY IF EXISTS "Users can insert own oubli requests" ON public.appbadge_oubli_badgeages;
DROP POLICY IF EXISTS "Admins can read all oubli requests" ON public.appbadge_oubli_badgeages;
DROP POLICY IF EXISTS "Admins can update oubli requests" ON public.appbadge_oubli_badgeages;

-- Policy: Users can read their own oubli badgeage requests
CREATE POLICY "Users can read own oubli requests"
ON public.appbadge_oubli_badgeages
FOR SELECT
TO authenticated
USING (public.is_own_record(utilisateur_id));

-- Policy: Users can insert their own oubli badgeage requests
CREATE POLICY "Users can insert own oubli requests"
ON public.appbadge_oubli_badgeages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_own_record(utilisateur_id)
  AND utilisateur_id = auth.uid()
);

-- Policy: Admins can read all oubli badgeage requests
CREATE POLICY "Admins can read all oubli requests"
ON public.appbadge_oubli_badgeages
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can update oubli badgeage requests (for validation)
CREATE POLICY "Admins can update oubli requests"
ON public.appbadge_oubli_badgeages
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_session_modifs (Session modification requests)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own modif requests" ON public.appbadge_session_modifs;
DROP POLICY IF EXISTS "Users can insert own modif requests" ON public.appbadge_session_modifs;
DROP POLICY IF EXISTS "Admins can read all modif requests" ON public.appbadge_session_modifs;
DROP POLICY IF EXISTS "Admins can update modif requests" ON public.appbadge_session_modifs;

-- Policy: Users can read their own modification requests
CREATE POLICY "Users can read own modif requests"
ON public.appbadge_session_modifs
FOR SELECT
TO authenticated
USING (public.is_own_record(utilisateur_id));

-- Policy: Users can insert their own modification requests
CREATE POLICY "Users can insert own modif requests"
ON public.appbadge_session_modifs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_own_record(utilisateur_id)
  AND utilisateur_id = auth.uid()
);

-- Policy: Admins can read all modification requests
CREATE POLICY "Admins can read all modif requests"
ON public.appbadge_session_modifs
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can update modification requests
CREATE POLICY "Admins can update modif requests"
ON public.appbadge_session_modifs
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_session_modif_validations (Modification validations)
-- =====================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own validations" ON public.appbadge_session_modif_validations;
DROP POLICY IF EXISTS "Admins can read all validations" ON public.appbadge_session_modif_validations;
DROP POLICY IF EXISTS "Admins can insert validations" ON public.appbadge_session_modif_validations;
DROP POLICY IF EXISTS "Admins can update validations" ON public.appbadge_session_modif_validations;

-- Policy: Users can read validations for their own modification requests
CREATE POLICY "Users can read own validations"
ON public.appbadge_session_modif_validations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM appbadge_session_modifs m
    WHERE m.id = appbadge_session_modif_validations.modif_id
      AND public.is_own_record(m.utilisateur_id)
  )
);

-- Policy: Admins can read all validations
CREATE POLICY "Admins can read all validations"
ON public.appbadge_session_modif_validations
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Policy: Admins can insert validations
CREATE POLICY "Admins can insert validations"
ON public.appbadge_session_modif_validations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

-- Policy: Admins can update validations
CREATE POLICY "Admins can update validations"
ON public.appbadge_session_modif_validations
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- =====================================================================
-- Policies for appbadge_lieux (Locations - if exists)
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appbadge_lieux') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "All authenticated can read locations" ON public.appbadge_lieux;
    DROP POLICY IF EXISTS "Admins can manage locations" ON public.appbadge_lieux;

    -- Policy: All authenticated users can read locations
    CREATE POLICY "All authenticated can read locations"
    ON public.appbadge_lieux
    FOR SELECT
    TO authenticated
    USING (true);

    -- Policy: Admins can manage locations
    CREATE POLICY "Admins can manage locations"
    ON public.appbadge_lieux
    FOR ALL
    TO authenticated
    USING (public.is_admin() = true)
    WITH CHECK (public.is_admin() = true);
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- Notes
-- =====================================================================
-- 1. All policies use the existing is_admin() function which checks
--    if the authenticated user has role 'Admin' or 'Manager'
--
-- 2. The is_own_record() helper function checks if the current user
--    is the owner of a record by comparing auth.uid() with utilisateur_id
--
-- 3. Users must have their Supabase Auth user ID matching their
--    appbadge_utilisateurs.id for the policies to work correctly
--
-- 4. The policies ensure that:
--    - Regular users can only access their own data
--    - Admins/Managers can access all data
--    - All authenticated users can read public data (schedules, locations)
-- =====================================================================

