-- Keep current timezone behavior for appbadge_badgeages table
-- The current default stores local time with +00 marker, which works with existing logic
-- No changes needed - the application handles this correctly with regex extraction

-- Current behavior is correct:
-- - Database stores local time with +00 marker
-- - Application extracts time directly from timestamp string
-- - This avoids timezone conversion issues

-- If you want to change this in the future, you would need to:
-- 1. Update all existing logic to handle proper timezone markers
-- 2. Migrate existing data
-- 3. Update the default to store proper timezone



