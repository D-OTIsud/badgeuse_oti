-- Migration: Update appbadge_oubli_badgeages to store entrée and sortie in single record
-- This replaces the old structure where each request created two records (one for entrée, one for sortie)

-- Step 1: Add new columns for entrée and sortie times
ALTER TABLE public.appbadge_oubli_badgeages
  ADD COLUMN IF NOT EXISTS date_heure_entree timestamp with time zone,
  ADD COLUMN IF NOT EXISTS date_heure_sortie timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lieux text;

-- Step 2: Migrate existing data (if any)
-- For existing records with type_action='entrée', set date_heure_entree
UPDATE public.appbadge_oubli_badgeages
SET date_heure_entree = date_heure_badge
WHERE type_action = 'entrée' AND date_heure_entree IS NULL;

-- For existing records with type_action='sortie', we need to find the matching entrée
-- and update both records. This is complex, so we'll handle it separately.
-- For now, we'll just set date_heure_sortie for sortie records
UPDATE public.appbadge_oubli_badgeages
SET date_heure_sortie = date_heure_badge
WHERE type_action = 'sortie' AND date_heure_sortie IS NULL;

-- Step 3: Remove the type_action constraint and column (we'll keep it for now for backward compatibility)
-- ALTER TABLE public.appbadge_oubli_badgeages DROP COLUMN IF EXISTS type_action;

-- Step 4: Make date_heure_entree and date_heure_sortie required for new records
-- We'll add a check constraint to ensure at least one time is provided
ALTER TABLE public.appbadge_oubli_badgeages
  ADD CONSTRAINT appbadge_oubli_badgeages_times_check 
  CHECK (
    (date_heure_entree IS NOT NULL AND date_heure_sortie IS NOT NULL) OR
    (date_heure_badge IS NOT NULL)  -- Allow old format during migration
  );

-- Note: After migration is complete and all old records are migrated,
-- you can remove the old columns:
-- ALTER TABLE public.appbadge_oubli_badgeages DROP COLUMN IF EXISTS date_heure_badge;
-- ALTER TABLE public.appbadge_oubli_badgeages DROP COLUMN IF EXISTS type_action;

