-- Fix timezone for appbadge_badgeages table
-- Convert UTC server time to Reunion local time
-- Keep the column type as timestamp with time zone (required by views)

ALTER TABLE public.appbadge_badgeages 
ALTER COLUMN date_heure SET DEFAULT (now() AT TIME ZONE 'Indian/Reunion');

-- This will convert server UTC time to Reunion timezone (+04)
-- so timestamps will be stored correctly as Reunion local time



