-- Performance Indexes for Session Loading
-- Run this in your Supabase SQL Editor to improve query performance

-- Indexes for appbadge_session_modifs table
-- These are critical for fetching user modification requests
CREATE INDEX IF NOT EXISTS idx_session_modifs_utilisateur_id 
ON appbadge_session_modifs (utilisateur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_modifs_entree_id 
ON appbadge_session_modifs (entree_id);

-- Composite index for common query pattern (user + entree_id lookup)
CREATE INDEX IF NOT EXISTS idx_session_modifs_user_entree 
ON appbadge_session_modifs (utilisateur_id, entree_id);

-- Index for appbadge_session_modif_validations
-- modif_id already has a UNIQUE constraint which creates an index, but we can add a covering index
CREATE INDEX IF NOT EXISTS idx_session_modif_validations_modif_id_covering 
ON appbadge_session_modif_validations (modif_id) 
INCLUDE (approuve, commentaire, validated_at);

-- Index for appbadge_badgeages lookups in getSessionModificationStatuses
-- This helps when checking entry badges for oubli badgeage comments
CREATE INDEX IF NOT EXISTS idx_badgeages_id_type_action 
ON appbadge_badgeages (id, type_action) 
WHERE type_action = 'entrée';

-- Index for oubli badgeage requests
CREATE INDEX IF NOT EXISTS idx_oubli_badgeages_utilisateur_pending 
ON appbadge_oubli_badgeages (utilisateur_id, validateur_id) 
WHERE validateur_id IS NULL;

-- Note: appbadge_v_session_pause_totals is a view, so we cannot create indexes on it directly.
-- The underlying tables (appbadge_badgeages) already have indexes that will help with view queries.

-- Additional index for appbadge_badgeages to optimize the view queries
-- This helps with the jour_local filtering in appbadge_v_sessions
CREATE INDEX IF NOT EXISTS idx_badgeages_utilisateur_type_date 
ON appbadge_badgeages (utilisateur_id, type_action, date_heure DESC);

-- Analyze tables to update statistics (helps query planner)
ANALYZE appbadge_session_modifs;
ANALYZE appbadge_session_modif_validations;
ANALYZE appbadge_badgeages;
ANALYZE appbadge_oubli_badgeages;

