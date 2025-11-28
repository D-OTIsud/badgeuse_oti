-- Migration: Update appbadge_oubli_badgeages to store entrée and sortie in single record
-- This replaces the old structure where each request created two records (one for entrée, one for sortie)

-- Step 1: Add new columns for entrée, sortie times, and pause times
ALTER TABLE public.appbadge_oubli_badgeages
  ADD COLUMN IF NOT EXISTS date_heure_entree timestamp with time zone,
  ADD COLUMN IF NOT EXISTS date_heure_sortie timestamp with time zone,
  ADD COLUMN IF NOT EXISTS date_heure_pause_debut timestamp with time zone,
  ADD COLUMN IF NOT EXISTS date_heure_pause_fin timestamp with time zone,
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

-- Step 4: Add constraint for pause times (both or neither, and fin > debut)
ALTER TABLE public.appbadge_oubli_badgeages
  DROP CONSTRAINT IF EXISTS appbadge_oubli_badgeages_pause_check;
  
ALTER TABLE public.appbadge_oubli_badgeages
  ADD CONSTRAINT appbadge_oubli_badgeages_pause_check 
  CHECK (
    (date_heure_pause_debut IS NULL AND date_heure_pause_fin IS NULL) OR
    (date_heure_pause_debut IS NOT NULL AND date_heure_pause_fin IS NOT NULL AND date_heure_pause_fin > date_heure_pause_debut)
  );

-- Note: After migration is complete and all old records are migrated,
-- you can remove the old columns:
-- ALTER TABLE public.appbadge_oubli_badgeages DROP COLUMN IF EXISTS date_heure_badge;
-- ALTER TABLE public.appbadge_oubli_badgeages DROP COLUMN IF EXISTS type_action;

