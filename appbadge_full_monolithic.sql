-- =====================================================================
-- AppBadge — FULL MONOLITHIC INSTALL, tables, views, functions, triggers, pg_cron
-- Safe to re-run. Generated 2025-10-29 07:48:35.
-- =====================================================================

BEGIN;

-- Core extensions required by this stack, idempotent
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================================
-- Monolithic SQL: AppBadge + Extensions Views (creation order correct)
-- Environment assumptions: PostgreSQL 14+, timezone Indian/Reunion
-- =====================================================================

-- ---------------------------------------------------------------------
-- Schemas and extensions (safe if already present)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS vault;

-- Enable useful extensions if allowed (comment out if not permitted)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- ---------------------------------------------------------------------
-- Sequences required by tables
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.appbadge_horaires_standards_id_seq;

-- ---------------------------------------------------------------------
-- Tables (FK dependencies respected)
-- ---------------------------------------------------------------------

-- Users
CREATE TABLE IF NOT EXISTS public.appbadge_utilisateurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text,
  service text,
  actif boolean NOT NULL DEFAULT true,
  date_creation timestamp with time zone NOT NULL DEFAULT now(),
  nom text,
  prenom text,
  avatar text,
  status text,
  lieux text,
  heures_contractuelles_semaine numeric DEFAULT 35.0, -- Heures contractuelles par semaine (défaut 35h)
  CONSTRAINT appbadge_utilisateurs_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_utilisateurs_heures_contractuelles_check CHECK (heures_contractuelles_semaine > 0 AND heures_contractuelles_semaine <= 60)
);

-- Badge events
CREATE TABLE IF NOT EXISTS public.appbadge_badgeages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL,
  latitude numeric,
  longitude numeric,
  type_action text CHECK (type_action = ANY (ARRAY['entrée'::text, 'sortie'::text, 'pause'::text, 'retour'::text])),
  code text,
  lieux text,
  commentaire text,
  -- note: default stores local-now as timestamp without time zone; column is timestamptz
  date_heure timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'Indian/Reunion'::text),
  CONSTRAINT appbadge_badgeages_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_badgeages_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.appbadge_utilisateurs(id)
);

-- Physical badges
CREATE TABLE IF NOT EXISTS public.appbadge_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  date_attribution timestamp with time zone NOT NULL DEFAULT now(),
  uid_tag text,
  numero_badge text NOT NULL DEFAULT '0000'::text UNIQUE,
  numero_badge_history text[] DEFAULT '{}'::text[],
  CONSTRAINT appbadge_badges_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_badges_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.appbadge_utilisateurs(id)
);

-- Standard schedules per location
CREATE TABLE IF NOT EXISTS public.appbadge_horaires_standards (
  id integer NOT NULL DEFAULT nextval('appbadge_horaires_standards_id_seq'::regclass),
  lieux text NOT NULL UNIQUE,
  heure_debut time without time zone NOT NULL,
  heure_fin time without time zone,
  ip_address text,
  latitude text,
  longitude text,
  color text DEFAULT '#F0F0F2'::text,
  CONSTRAINT appbadge_horaires_standards_pkey PRIMARY KEY (id)
);
ALTER SEQUENCE public.appbadge_horaires_standards_id_seq OWNED BY public.appbadge_horaires_standards.id;

-- Manual declarations of missed badge events
CREATE TABLE IF NOT EXISTS public.appbadge_oubli_badgeages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL,
  date_heure_saisie timestamp with time zone NOT NULL DEFAULT now(),
  date_heure_badge timestamp with time zone NOT NULL,
  type_action text NOT NULL CHECK (type_action = ANY (ARRAY['entrée'::text, 'sortie'::text, 'pause'::text, 'retour'::text])),
  raison text NOT NULL,
  commentaire text,
  perte_badge boolean NOT NULL DEFAULT false,
  etat_validation text NOT NULL DEFAULT 'en attente'::text CHECK (etat_validation = ANY (ARRAY['en attente'::text, 'validée'::text, 'refusée'::text])),
  date_validation timestamp with time zone,
  validateur_id uuid,
  CONSTRAINT appbadge_oubli_badgeages_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_oubli_badgeages_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.appbadge_utilisateurs(id),
  CONSTRAINT appbadge_oubli_badgeages_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.appbadge_utilisateurs(id)
);

-- Session modification requests
CREATE TABLE IF NOT EXISTS public.appbadge_session_modifs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entree_id uuid NOT NULL,
  utilisateur_id uuid NOT NULL,
  proposed_entree_ts timestamp with time zone,
  proposed_sortie_ts timestamp with time zone,
  pause_delta_minutes integer NOT NULL DEFAULT 0 CHECK (pause_delta_minutes >= '-480'::integer AND pause_delta_minutes <= 480),
  motif text,
  commentaire text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT appbadge_session_modifs_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_session_modifs_entree_id_fkey FOREIGN KEY (entree_id) REFERENCES public.appbadge_badgeages(id),
  CONSTRAINT appbadge_session_modifs_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.appbadge_utilisateurs(id)
);

-- Validation of modification requests
CREATE TABLE IF NOT EXISTS public.appbadge_session_modif_validations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  modif_id uuid NOT NULL UNIQUE,
  validateur_id uuid NOT NULL,
  approuve boolean NOT NULL,
  commentaire text,
  validated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT appbadge_session_modif_validations_pkey PRIMARY KEY (id),
  CONSTRAINT appbadge_session_modif_validations_modif_id_fkey FOREIGN KEY (modif_id) REFERENCES public.appbadge_session_modifs(id),
  CONSTRAINT appbadge_session_modif_validations_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.appbadge_utilisateurs(id)
);

-- ---------------------------------------------------------------------
-- Performance indexes for date conversions and filtering
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_badgeages_jour_local 
ON appbadge_badgeages (((date_heure AT TIME ZONE 'Indian/Reunion')::date));

CREATE INDEX IF NOT EXISTS idx_badgeages_jour_user_type 
ON appbadge_badgeages (utilisateur_id, type_action, date_heure);

CREATE INDEX IF NOT EXISTS idx_badgeages_jour_local_user_type 
ON appbadge_badgeages (((date_heure AT TIME ZONE 'Indian/Reunion')::date), utilisateur_id, type_action);

-- ---------------------------------------------------------------------
-- Core views used by many others (build in dependency order)
-- ---------------------------------------------------------------------

-- Sessions (entrée -> sortie pairs) - OPTIMIZED with efficient JOINs
CREATE OR REPLACE VIEW public.appbadge_v_sessions(
  utilisateur_id, nom, prenom, jour_local,
  entree_id, entree_ts, sortie_id, sortie_ts, lieux, duree_minutes
) AS
WITH e AS (
  SELECT b1.id AS entree_id,
         b1.utilisateur_id,
         (b1.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local,
         b1.date_heure AS entree_ts,
         COALESCE(b1.lieux, u.lieux) AS lieux,
         u.nom,
         u.prenom
  FROM appbadge_badgeages b1
  JOIN appbadge_utilisateurs u ON u.id = b1.utilisateur_id
  WHERE b1.type_action = 'entrée'::text
),
sorties_with_rank AS (
  SELECT 
    b.id AS sortie_id,
    b.utilisateur_id,
    (b.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local,
    b.date_heure AS sortie_ts,
    e.entree_id,
    e.entree_ts,
    e.lieux,
    e.nom,
    e.prenom,
    ROW_NUMBER() OVER (
      PARTITION BY e.entree_id 
      ORDER BY b.date_heure
    ) AS rn
  FROM e
  JOIN appbadge_badgeages b ON 
    b.utilisateur_id = e.utilisateur_id
    AND b.type_action = 'sortie'::text
    AND (b.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date = e.jour_local
    AND b.date_heure > e.entree_ts
),
paired AS (
  SELECT 
    s.utilisateur_id,
    s.nom,
    s.prenom,
    s.jour_local,
    s.entree_id,
    s.entree_ts,
    s.sortie_id,
    s.sortie_ts,
    s.lieux,
    round(EXTRACT(epoch FROM s.sortie_ts - s.entree_ts) / 60.0, 2) AS duree_minutes
  FROM sorties_with_rank s
  WHERE s.rn = 1  -- Take only the first (earliest) sortie for each entrée
)
SELECT *
FROM paired;

-- Pauses paired with retours
CREATE OR REPLACE VIEW public.appbadge_v_pauses(
  utilisateur_id, nom, prenom, jour_local, pause_id, pause_ts, retour_id, retour_ts, duree_minutes
) AS
WITH p AS (
  SELECT b1.id AS pause_id,
         b1.utilisateur_id,
         (b1.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local,
         b1.date_heure AS pause_ts
  FROM appbadge_badgeages b1
  WHERE b1.type_action = 'pause'::text
),
r AS (
  SELECT p.pause_id,
         p.utilisateur_id,
         p.jour_local,
         p.pause_ts,
         (
           SELECT b2.id
           FROM appbadge_badgeages b2
           WHERE b2.utilisateur_id = p.utilisateur_id
             AND b2.type_action = 'retour'::text
             AND (b2.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date = p.jour_local
             AND b2.date_heure > p.pause_ts
           ORDER BY b2.date_heure
           LIMIT 1
         ) AS retour_id
  FROM p
),
paired AS (
  SELECT r.utilisateur_id,
         u.nom, u.prenom,
         r.jour_local,
         r.pause_id,
         b_p.date_heure AS pause_ts,
         r.retour_id,
         b_r.date_heure AS retour_ts,
         round(EXTRACT(epoch FROM b_r.date_heure - b_p.date_heure) / 60.0, 2) AS duree_minutes
  FROM r
  JOIN appbadge_utilisateurs u ON u.id = r.utilisateur_id
  LEFT JOIN appbadge_badgeages b_p ON b_p.id = r.pause_id
  LEFT JOIN appbadge_badgeages b_r ON b_r.id = r.retour_id
)
SELECT *
FROM paired
WHERE paired.retour_id IS NOT NULL;

-- Total pauses per session (raw)
CREATE OR REPLACE VIEW public.appbadge_v_session_pause_totals(
  utilisateur_id, entree_id, entree_ts, sortie_id, sortie_ts, total_pause_minutes
) AS
WITH sessions AS (
  SELECT s.utilisateur_id, s.entree_id, s.entree_ts, s.sortie_id, s.sortie_ts, s.jour_local
  FROM appbadge_v_sessions s
),
pauses AS (
  SELECT p.utilisateur_id, p.pause_id, p.pause_ts, p.retour_id, p.retour_ts, p.duree_minutes, p.jour_local
  FROM appbadge_v_pauses p
)
SELECT sess.utilisateur_id,
       sess.entree_id,
       sess.entree_ts,
       sess.sortie_id,
       sess.sortie_ts,
       COALESCE(sum(pa.duree_minutes), 0::numeric)::numeric(12,2) AS total_pause_minutes
FROM sessions sess
LEFT JOIN pauses pa
  ON pa.utilisateur_id = sess.utilisateur_id
 AND pa.jour_local = sess.jour_local
 AND pa.pause_ts >= sess.entree_ts
 AND pa.retour_ts <= sess.sortie_ts
GROUP BY sess.utilisateur_id, sess.entree_id, sess.entree_ts, sess.sortie_id, sess.sortie_ts;

-- Total pauses per session (adjusted by approved deltas)
CREATE OR REPLACE VIEW public.appbadge_v_session_pause_totals_adjusted(
  utilisateur_id, entree_id, entree_ts, sortie_id, sortie_ts, base_pause_minutes_in_window, total_pause_minutes_adjusted
) AS
WITH base_sessions AS (
  SELECT s.utilisateur_id, s.entree_id, s.entree_ts, s.sortie_id, s.sortie_ts, s.jour_local
  FROM appbadge_v_sessions s
  WHERE s.sortie_id IS NOT NULL
),
approved AS (
  SELECT m.entree_id, m.utilisateur_id, m.proposed_entree_ts, m.proposed_sortie_ts, m.pause_delta_minutes, v.validated_at
  FROM appbadge_session_modifs m
  JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
  WHERE v.approuve = true
),
picked AS (
  SELECT DISTINCT ON (a.utilisateur_id, a.entree_id)
         a.utilisateur_id, a.entree_id, a.proposed_entree_ts, a.proposed_sortie_ts, a.pause_delta_minutes, a.validated_at
  FROM approved a
  ORDER BY a.utilisateur_id, a.entree_id, a.validated_at DESC
),
sessions AS (
  SELECT b.utilisateur_id,
         b.entree_id,
         COALESCE(p.proposed_entree_ts, b.entree_ts) AS entree_ts,
         b.sortie_id,
         COALESCE(p.proposed_sortie_ts, b.sortie_ts) AS sortie_ts,
         b.jour_local,
         COALESCE(p.pause_delta_minutes, 0) AS pause_delta_minutes
  FROM base_sessions b
  LEFT JOIN picked p
    ON p.utilisateur_id = b.utilisateur_id
   AND p.entree_id = b.entree_id
),
pauses AS (
  SELECT p.utilisateur_id, p.pause_id, p.pause_ts, p.retour_id, p.retour_ts, p.duree_minutes
  FROM appbadge_v_pauses p
)
SELECT sess.utilisateur_id,
       sess.entree_id,
       sess.entree_ts,
       sess.sortie_id,
       sess.sortie_ts,
       COALESCE(sum(CASE
                      WHEN pa.pause_ts >= sess.entree_ts AND pa.retour_ts <= sess.sortie_ts THEN pa.duree_minutes
                      ELSE 0::numeric
                    END), 0::numeric)::numeric(12,2) AS base_pause_minutes_in_window,
       GREATEST(0::numeric,
                COALESCE(sum(CASE
                               WHEN pa.pause_ts >= sess.entree_ts AND pa.retour_ts <= sess.sortie_ts THEN pa.duree_minutes
                               ELSE 0::numeric
                             END), 0::numeric) + sess.pause_delta_minutes::numeric
       )::numeric(12,2) AS total_pause_minutes_adjusted
FROM sessions sess
LEFT JOIN pauses pa ON pa.utilisateur_id = sess.utilisateur_id
GROUP BY sess.utilisateur_id, sess.entree_id, sess.entree_ts, sess.sortie_id, sess.sortie_ts, sess.pause_delta_minutes;

-- Sessions with adjusted times and work minutes
CREATE OR REPLACE VIEW public.appbadge_v_sessions_adjusted(
  utilisateur_id, nom, prenom, jour_local, entree_id,
  original_entree_ts, original_sortie_ts, lieux,
  original_pause_minutes, original_work_minutes,
  adjusted_entree_ts, adjusted_sortie_ts,
  adjusted_pause_minutes, adjusted_work_minutes, diff_minutes
) AS
WITH base AS (
  SELECT s.utilisateur_id, u.nom, u.prenom, s.jour_local,
         s.entree_id, s.entree_ts, s.sortie_id, s.sortie_ts, s.lieux,
         s.duree_minutes::numeric(12,2) AS session_span_minutes
  FROM appbadge_v_sessions s
  JOIN appbadge_utilisateurs u ON u.id = s.utilisateur_id
),
pa AS (
  SELECT t.utilisateur_id, t.entree_id, t.total_pause_minutes
  FROM appbadge_v_session_pause_totals t
),
approved AS (
  SELECT m.entree_id, m.utilisateur_id, m.proposed_entree_ts, m.proposed_sortie_ts, m.pause_delta_minutes, v.validated_at, v.approuve
  FROM appbadge_session_modifs m
  JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
  WHERE v.approuve = true
),
picked AS (
  SELECT DISTINCT ON (a.utilisateur_id, a.entree_id)
         a.utilisateur_id, a.entree_id, a.proposed_entree_ts, a.proposed_sortie_ts, a.pause_delta_minutes, a.validated_at
  FROM approved a
  ORDER BY a.utilisateur_id, a.entree_id, a.validated_at DESC
)
SELECT b.utilisateur_id,
       b.nom,
       b.prenom,
       b.jour_local,
       b.entree_id,
       b.entree_ts AS original_entree_ts,
       b.sortie_ts AS original_sortie_ts,
       b.lieux,
       COALESCE(pa.total_pause_minutes, 0::numeric)::numeric(12,2) AS original_pause_minutes,
       GREATEST(0::numeric, round(EXTRACT(epoch FROM b.sortie_ts - b.entree_ts) / 60.0 - COALESCE(pa.total_pause_minutes, 0::numeric), 2))::numeric(12,2) AS original_work_minutes,
       COALESCE(p.proposed_entree_ts, b.entree_ts) AS adjusted_entree_ts,
       COALESCE(p.proposed_sortie_ts, b.sortie_ts) AS adjusted_sortie_ts,
       GREATEST(0::numeric, COALESCE(pa.total_pause_minutes, 0::numeric) + COALESCE(p.pause_delta_minutes, 0)::numeric)::numeric(12,2) AS adjusted_pause_minutes,
       GREATEST(0::numeric, round(EXTRACT(epoch FROM COALESCE(p.proposed_sortie_ts, b.sortie_ts) - COALESCE(p.proposed_entree_ts, b.entree_ts)) / 60.0
                         - GREATEST(0::numeric, COALESCE(pa.total_pause_minutes, 0::numeric) + COALESCE(p.pause_delta_minutes, 0)::numeric), 2))::numeric(12,2) AS adjusted_work_minutes,
       (GREATEST(0::numeric, round(EXTRACT(epoch FROM b.sortie_ts - b.entree_ts) / 60.0 - COALESCE(pa.total_pause_minutes, 0::numeric), 2))
        - GREATEST(0::numeric, round(EXTRACT(epoch FROM COALESCE(p.proposed_sortie_ts, b.sortie_ts) - COALESCE(p.proposed_entree_ts, b.entree_ts)) / 60.0
                         - GREATEST(0::numeric, COALESCE(pa.total_pause_minutes, 0::numeric) + COALESCE(p.pause_delta_minutes, 0)::numeric), 2))
       )::numeric(12,2) AS diff_minutes
FROM base b
LEFT JOIN pa ON pa.utilisateur_id = b.utilisateur_id AND pa.entree_id = b.entree_id
LEFT JOIN picked p ON p.utilisateur_id = b.utilisateur_id AND p.entree_id = b.entree_id
WHERE b.sortie_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Effective badge events (uses sessions + picked adjustments)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.appbadge_v_badgeages_effectifs(
  id, utilisateur_id, nom, prenom, type_action, latitude, longitude, lieux,
  commentaire, code, date_heure_originale, date_heure_effective, jour_local_effectif,
  entree_id_of_session, sortie_id_of_session
) AS
WITH approved AS (
  SELECT m.entree_id, m.utilisateur_id, m.proposed_entree_ts, m.proposed_sortie_ts, m.pause_delta_minutes, v.validated_at
  FROM appbadge_session_modifs m
  JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
  WHERE v.approuve = true
),
picked AS (
  SELECT DISTINCT ON (a.utilisateur_id, a.entree_id)
         a.utilisateur_id, a.entree_id, a.proposed_entree_ts, a.proposed_sortie_ts, a.pause_delta_minutes, a.validated_at
  FROM approved a
  ORDER BY a.utilisateur_id, a.entree_id, a.validated_at DESC
),
s_map AS (
  SELECT entree_id, sortie_id
  FROM appbadge_v_sessions
),
base AS (
  SELECT b.id, b.utilisateur_id, b.date_heure, b.type_action,
         b.latitude, b.longitude, b.lieux, b.commentaire, b.code,
         u.nom, u.prenom
  FROM appbadge_badgeages b
  JOIN appbadge_utilisateurs u ON u.id = b.utilisateur_id
),
entree AS (
  SELECT base.id, base.utilisateur_id, base.date_heure, base.type_action,
         base.latitude, base.longitude, base.lieux, base.commentaire, base.code,
         base.nom, base.prenom,
         base.id AS entree_id_of_session,
         NULL::uuid AS sortie_id_of_session,
         COALESCE(p.proposed_entree_ts, base.date_heure) AS date_heure_effective
  FROM base
  LEFT JOIN picked p ON p.entree_id = base.id
  WHERE base.type_action = 'entrée'::text
),
sortie AS (
  SELECT base.id, base.utilisateur_id, base.date_heure, base.type_action,
         base.latitude, base.longitude, base.lieux, base.commentaire, base.code,
         base.nom, base.prenom,
         sm.entree_id AS entree_id_of_session,
         base.id AS sortie_id_of_session,
         COALESCE(p.proposed_sortie_ts, base.date_heure) AS date_heure_effective
  FROM base
  LEFT JOIN s_map sm ON sm.sortie_id = base.id
  LEFT JOIN picked p ON p.entree_id = sm.entree_id
  WHERE base.type_action = 'sortie'::text
),
pause AS (
  SELECT base.id, base.utilisateur_id, base.date_heure, base.type_action,
         base.latitude, base.longitude, base.lieux, base.commentaire, base.code,
         base.nom, base.prenom,
         NULL::uuid AS entree_id_of_session, NULL::uuid AS sortie_id_of_session,
         base.date_heure AS date_heure_effective
  FROM base
  WHERE base.type_action = 'pause'::text
),
retour AS (
  SELECT base.id, base.utilisateur_id, base.date_heure, base.type_action,
         base.latitude, base.longitude, base.lieux, base.commentaire, base.code,
         base.nom, base.prenom,
         NULL::uuid AS entree_id_of_session, NULL::uuid AS sortie_id_of_session,
         base.date_heure AS date_heure_effective
  FROM base
  WHERE base.type_action = 'retour'::text
),
all_rows AS (
  SELECT * FROM entree
  UNION ALL SELECT * FROM sortie
  UNION ALL SELECT * FROM pause
  UNION ALL SELECT * FROM retour
)
SELECT all_rows.id,
       all_rows.utilisateur_id,
       all_rows.nom,
       all_rows.prenom,
       all_rows.type_action,
       all_rows.latitude,
       all_rows.longitude,
       all_rows.lieux,
       all_rows.commentaire,
       all_rows.code,
       all_rows.date_heure AS date_heure_originale,
       all_rows.date_heure_effective,
       (all_rows.date_heure_effective AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local_effectif,
       all_rows.entree_id_of_session,
       all_rows.sortie_id_of_session
FROM all_rows;

-- Enriched badgeages with user and reference schedule
CREATE OR REPLACE VIEW public.appbadge_v_badgeages_enriched(
  id, utilisateur_id, nom, prenom, email, role, service, user_actif,
  date_heure, jour_local, heure_local, type_action, latitude, longitude,
  lieux_badge, lieux_utilisateur, commentaire, code, lieux_ref, heure_debut, heure_fin,
  ip_ref, lat_ref_txt, lon_ref_txt,
  is_presence_in, is_presence_out, is_pause_start, is_pause_end, lieux_differs_from_user
) AS
WITH base AS (
  SELECT e.id,
         e.utilisateur_id,
         u.nom, u.prenom, u.email, u.role, u.service, u.actif AS user_actif,
         e.date_heure_effective AS date_heure,
         (e.date_heure_effective AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local,
         (e.date_heure_effective AT TIME ZONE 'Indian/Reunion'::text)::time without time zone AS heure_local,
         e.type_action,
         e.latitude, e.longitude,
         COALESCE(e.lieux, u.lieux) AS lieux_badge,
         u.lieux AS lieux_utilisateur,
         e.commentaire, e.code,
         h.lieux AS lieux_ref,
         h.heure_debut, h.heure_fin,
         h.ip_address AS ip_ref,
         h.latitude AS lat_ref_txt,
         h.longitude AS lon_ref_txt
  FROM appbadge_v_badgeages_effectifs e
  JOIN appbadge_utilisateurs u ON u.id = e.utilisateur_id
  LEFT JOIN appbadge_horaires_standards h ON h.lieux = COALESCE(e.lieux, u.lieux)
)
SELECT base.*,
       base.type_action = ANY (ARRAY['entrée'::text, 'retour'::text]) AS is_presence_in,
       base.type_action = 'sortie'::text AS is_presence_out,
       base.type_action = 'pause'::text AS is_pause_start,
       base.type_action = 'retour'::text AS is_pause_end,
       base.lieux_badge IS DISTINCT FROM base.lieux_utilisateur AS lieux_differs_from_user
FROM base;

-- Current status per user
CREATE OR REPLACE VIEW public.appbadge_v_statut_courant(
  utilisateur_id, nom, prenom, email, role, service, actif, dernier_badgeage,
  jour_local, heure_local, type_action, statut_presence
) AS
WITH last_evt AS (
  SELECT DISTINCT ON (appbadge_badgeages.utilisateur_id)
         appbadge_badgeages.utilisateur_id,
         appbadge_badgeages.date_heure,
         appbadge_badgeages.type_action
  FROM appbadge_badgeages
  ORDER BY appbadge_badgeages.utilisateur_id, appbadge_badgeages.date_heure DESC
)
SELECT u.id AS utilisateur_id,
       u.nom, u.prenom, u.email, u.role, u.service, u.actif,
       l.date_heure AS dernier_badgeage,
       CASE 
         WHEN l.date_heure IS NOT NULL THEN (l.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date
         ELSE NULL::date
       END AS jour_local,
       CASE 
         WHEN l.date_heure IS NOT NULL THEN (l.date_heure AT TIME ZONE 'Indian/Reunion'::text)::time without time zone
         ELSE NULL::time without time zone
       END AS heure_local,
       l.type_action,
       CASE 
         WHEN l.type_action = 'entrée'::text THEN 'présent'::text
         WHEN l.type_action = 'retour'::text THEN 'présent'::text
         WHEN l.type_action = 'pause'::text THEN 'en pause'::text
         WHEN l.type_action = 'sortie'::text THEN 'absent'::text
         ELSE 'absent'::text
       END AS statut_presence
FROM appbadge_utilisateurs u
LEFT JOIN last_evt l ON l.utilisateur_id = u.id;

-- Daily synthesis
CREATE OR REPLACE VIEW public.appbadge_v_synthese_journaliere(
  utilisateur_id, nom, prenom, jour_local, premiere_entree_ts, derniere_sortie_ts,
  travail_total_minutes, pause_total_minutes, travail_net_minutes,
  lieux, heure_debut, heure_fin, retard_minutes, depart_anticipe_minutes
) AS
WITH now_ctx AS (
  SELECT (now() AT TIME ZONE 'Indian/Reunion'::text) AS now_local_ts,
         (now() AT TIME ZONE 'Indian/Reunion'::text)::date AS now_local_date
),
events AS (
  SELECT e.utilisateur_id, e.nom, e.prenom, e.type_action,
         e.date_heure_effective AS ts_local,
         (e.date_heure_effective AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local
  FROM appbadge_v_badgeages_effectifs e
  WHERE e.type_action = ANY (ARRAY['entrée'::text, 'sortie'::text, 'pause'::text, 'retour'::text])
),
first_last AS (
  SELECT ev.utilisateur_id, ev.nom, ev.prenom, ev.jour_local,
         min(ev.ts_local) FILTER (WHERE ev.type_action = 'entrée'::text) AS premiere_entree_ts,
         max(ev.ts_local) FILTER (WHERE ev.type_action = 'sortie'::text) AS derniere_sortie_ts
  FROM events ev
  GROUP BY ev.utilisateur_id, ev.nom, ev.prenom, ev.jour_local
),
seq AS (
  SELECT e.utilisateur_id, e.jour_local, e.type_action, e.ts_local,
         lead(e.ts_local) OVER (PARTITION BY e.utilisateur_id, e.jour_local ORDER BY e.ts_local) AS next_ts_local
  FROM events e
),
seq_capped AS (
  SELECT s.utilisateur_id, s.jour_local, s.type_action, s.ts_local,
         CASE
           WHEN s.next_ts_local IS NOT NULL THEN s.next_ts_local
           WHEN s.next_ts_local IS NULL AND s.jour_local = n.now_local_date THEN n.now_local_ts::timestamp with time zone
           ELSE s.ts_local
         END AS ts_local_end
  FROM seq s
  CROSS JOIN now_ctx n
),
minutes_t AS (
  SELECT sc.utilisateur_id, sc.jour_local,
         floor(GREATEST(sum(CASE
                               WHEN sc.type_action = ANY (ARRAY['entrée'::text, 'retour'::text])
                               THEN EXTRACT(epoch FROM sc.ts_local_end - sc.ts_local) / 60.0
                               ELSE 0::numeric
                             END), 0::numeric)) AS travail_total_minutes_t,
         floor(GREATEST(sum(CASE
                               WHEN sc.type_action = 'pause'::text
                               THEN EXTRACT(epoch FROM sc.ts_local_end - sc.ts_local) / 60.0
                               ELSE 0::numeric
                             END), 0::numeric)) AS pause_total_minutes_t
  FROM seq_capped sc
  GROUP BY sc.utilisateur_id, sc.jour_local
),
approved AS (
  SELECT m.entree_id, m.utilisateur_id, m.proposed_entree_ts, m.pause_delta_minutes, v.validated_at
  FROM appbadge_session_modifs m
  JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
  WHERE v.approuve = true
),
picked AS (
  SELECT DISTINCT ON (a.utilisateur_id, a.entree_id)
         a.utilisateur_id, a.entree_id, a.proposed_entree_ts, a.pause_delta_minutes, a.validated_at
  FROM approved a
  ORDER BY a.utilisateur_id, a.entree_id, a.validated_at DESC
),
delta_by_day AS (
  SELECT p.utilisateur_id,
         (COALESCE(p.proposed_entree_ts, b_in.date_heure) AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_local,
         sum(p.pause_delta_minutes)::numeric AS pause_delta_minutes_day
  FROM picked p
  JOIN appbadge_badgeages b_in ON b_in.id = p.entree_id
  GROUP BY p.utilisateur_id, ((COALESCE(p.proposed_entree_ts, b_in.date_heure) AT TIME ZONE 'Indian/Reunion'::text)::date)
),
user_lieux AS (
  SELECT u.id AS utilisateur_id, u.lieux, COALESCE(u.heures_contractuelles_semaine, 35.0) AS heures_contractuelles_semaine
  FROM appbadge_utilisateurs u
),
ref AS (
  SELECT r1.lieux, r1.heure_debut, r1.heure_fin
  FROM appbadge_horaires_standards r1
)
SELECT f.utilisateur_id, f.nom, f.prenom, f.jour_local,
       f.premiere_entree_ts, f.derniere_sortie_ts,
       COALESCE(mt.travail_total_minutes_t, 0::numeric) AS travail_total_minutes,
       GREATEST(COALESCE(mt.pause_total_minutes_t, 0::numeric) + COALESCE(dd.pause_delta_minutes_day, 0::numeric), 0::numeric) AS pause_total_minutes,
       GREATEST(COALESCE(mt.travail_total_minutes_t, 0::numeric) - GREATEST(COALESCE(mt.pause_total_minutes_t, 0::numeric) + COALESCE(dd.pause_delta_minutes_day, 0::numeric), 0::numeric), 0::numeric) AS travail_net_minutes,
       ul.lieux, r.heure_debut, r.heure_fin,
       -- For part-time workers (< 35h/week): no daily arrival/departure penalties
       -- For full-time workers: calculate delay based on location schedule
       CASE
         WHEN ul.heures_contractuelles_semaine < 35.0 THEN 0::numeric
         WHEN r.heure_debut IS NOT NULL AND f.premiere_entree_ts IS NOT NULL
           THEN floor(GREATEST(EXTRACT(epoch FROM f.premiere_entree_ts - (f.jour_local::timestamp without time zone + r.heure_debut::interval)::timestamp with time zone) / 60.0, 0::numeric))
         ELSE NULL::numeric
       END AS retard_minutes,
       -- For part-time workers (< 35h/week): no daily arrival/departure penalties
       -- For full-time workers: calculate early departure based on location schedule
       CASE
         WHEN ul.heures_contractuelles_semaine < 35.0 THEN 0::numeric
         WHEN r.heure_fin IS NOT NULL AND f.derniere_sortie_ts IS NOT NULL
           THEN floor(GREATEST(EXTRACT(epoch FROM (f.jour_local::timestamp without time zone + r.heure_fin::interval)::timestamp with time zone - f.derniere_sortie_ts) / 60.0, 0::numeric))
         ELSE NULL::numeric
       END AS depart_anticipe_minutes
FROM first_last f
LEFT JOIN minutes_t mt ON mt.utilisateur_id = f.utilisateur_id AND mt.jour_local = f.jour_local
LEFT JOIN delta_by_day dd ON dd.utilisateur_id = f.utilisateur_id AND dd.jour_local = f.jour_local
LEFT JOIN user_lieux ul ON ul.utilisateur_id = f.utilisateur_id
LEFT JOIN ref r ON r.lieux = ul.lieux;

-- Dashboard jour = synthèse + statut courant
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

-- Global KPIs (all users)
CREATE OR REPLACE VIEW public.appbadge_v_kpis_globaux(
  semaine_courante_travail_total_minutes, semaine_courante_pause_total_minutes, semaine_courante_travail_net_minutes,
  semaine_courante_retard_minutes, semaine_courante_depart_anticipe_minutes,
  semaine_precedente_travail_total_minutes, semaine_precedente_pause_total_minutes, semaine_precedente_travail_net_minutes,
  semaine_precedente_retard_minutes, semaine_precedente_depart_anticipe_minutes,
  mois_courant_travail_total_minutes, mois_courant_pause_total_minutes, mois_courant_travail_net_minutes,
  mois_courant_retard_minutes, mois_courant_depart_anticipe_minutes,
  mois_precedent_travail_total_minutes, mois_precedent_pause_total_minutes, mois_precedent_travail_net_minutes,
  mois_precedent_retard_minutes, mois_precedent_depart_anticipe_minutes,
  annee_courante_travail_total_minutes, annee_courante_pause_total_minutes, annee_courante_travail_net_minutes,
  annee_courante_retard_minutes, annee_courante_depart_anticipe_minutes,
  annee_precedente_travail_total_minutes, annee_precedente_pause_total_minutes, annee_precedente_travail_net_minutes,
  annee_precedente_retard_minutes, annee_precedente_depart_anticipe_minutes
) AS
WITH now_ctx AS (
  SELECT (now() AT TIME ZONE 'Indian/Reunion'::text)::date AS now_local_date,
         date_trunc('week'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS week_cur_start,
         date_trunc('month'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS month_cur_start,
         date_trunc('year'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS year_cur_start
),
bounds AS (
  SELECT now_ctx.week_cur_start,
         (now_ctx.week_cur_start + '7 days'::interval)::date AS week_next_start,
         (now_ctx.week_cur_start - '7 days'::interval)::date AS week_prev_start,
         now_ctx.week_cur_start AS week_cur_start_d,
         now_ctx.month_cur_start,
         (now_ctx.month_cur_start + '1 mon'::interval)::date AS month_next_start,
         (now_ctx.month_cur_start - '1 mon'::interval)::date AS month_prev_start,
         now_ctx.year_cur_start,
         (now_ctx.year_cur_start + '1 year'::interval)::date AS year_next_start,
         (now_ctx.year_cur_start - '1 year'::interval)::date AS year_prev_start
  FROM now_ctx
),
base AS (
  SELECT s.jour_local,
         COALESCE(s.travail_total_minutes, 0::numeric) AS travail_total_minutes,
         COALESCE(s.pause_total_minutes, 0::numeric) AS pause_total_minutes,
         COALESCE(s.travail_net_minutes, 0::numeric) AS travail_net_minutes,
         COALESCE(s.retard_minutes, 0::numeric) AS retard_minutes,
         COALESCE(s.depart_anticipe_minutes, 0::numeric) AS depart_anticipe_minutes
  FROM appbadge_v_synthese_journaliere s
),
agg AS (
  SELECT
    sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.travail_total_minutes      END) AS semaine_courante_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.pause_total_minutes        END) AS semaine_courante_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.travail_net_minutes        END) AS semaine_courante_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.retard_minutes             END) AS semaine_courante_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.depart_anticipe_minutes    END) AS semaine_courante_depart_anticipe_minutes,

    sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.travail_total_minutes      END) AS semaine_precedente_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.pause_total_minutes        END) AS semaine_precedente_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.travail_net_minutes        END) AS semaine_precedente_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.retard_minutes             END) AS semaine_precedente_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.depart_anticipe_minutes    END) AS semaine_precedente_depart_anticipe_minutes,

    sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.travail_total_minutes      END) AS mois_courant_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.pause_total_minutes        END) AS mois_courant_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.travail_net_minutes        END) AS mois_courant_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.retard_minutes             END) AS mois_courant_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.depart_anticipe_minutes    END) AS mois_courant_depart_anticipe_minutes,

    sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.travail_total_minutes      END) AS mois_precedent_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.pause_total_minutes        END) AS mois_precedent_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.travail_net_minutes        END) AS mois_precedent_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.retard_minutes             END) AS mois_precedent_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.depart_anticipe_minutes    END) AS mois_precedent_depart_anticipe_minutes,

    sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.travail_total_minutes      END) AS annee_courante_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.pause_total_minutes        END) AS annee_courante_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.travail_net_minutes        END) AS annee_courante_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.retard_minutes             END) AS annee_courante_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.depart_anticipe_minutes    END) AS annee_courante_depart_anticipe_minutes,

    sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.travail_total_minutes      END) AS annee_precedente_travail_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.pause_total_minutes        END) AS annee_precedente_pause_total_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.travail_net_minutes        END) AS annee_precedente_travail_net_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.retard_minutes             END) AS annee_precedente_retard_minutes,
    sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.depart_anticipe_minutes    END) AS annee_precedente_depart_anticipe_minutes
  FROM base b
  CROSS JOIN bounds bo
)
SELECT
  COALESCE(agg.semaine_courante_travail_total_minutes, 0)::bigint,
  COALESCE(agg.semaine_courante_pause_total_minutes, 0)::bigint,
  COALESCE(agg.semaine_courante_travail_net_minutes, 0)::bigint,
  COALESCE(agg.semaine_courante_retard_minutes, 0)::bigint,
  COALESCE(agg.semaine_courante_depart_anticipe_minutes, 0)::bigint,
  COALESCE(agg.semaine_precedente_travail_total_minutes, 0)::bigint,
  COALESCE(agg.semaine_precedente_pause_total_minutes, 0)::bigint,
  COALESCE(agg.semaine_precedente_travail_net_minutes, 0)::bigint,
  COALESCE(agg.semaine_precedente_retard_minutes, 0)::bigint,
  COALESCE(agg.semaine_precedente_depart_anticipe_minutes, 0)::bigint,
  COALESCE(agg.mois_courant_travail_total_minutes, 0)::bigint,
  COALESCE(agg.mois_courant_pause_total_minutes, 0)::bigint,
  COALESCE(agg.mois_courant_travail_net_minutes, 0)::bigint,
  COALESCE(agg.mois_courant_retard_minutes, 0)::bigint,
  COALESCE(agg.mois_courant_depart_anticipe_minutes, 0)::bigint,
  COALESCE(agg.mois_precedent_travail_total_minutes, 0)::bigint,
  COALESCE(agg.mois_precedent_pause_total_minutes, 0)::bigint,
  COALESCE(agg.mois_precedent_travail_net_minutes, 0)::bigint,
  COALESCE(agg.mois_precedent_retard_minutes, 0)::bigint,
  COALESCE(agg.mois_precedent_depart_anticipe_minutes, 0)::bigint,
  COALESCE(agg.annee_courante_travail_total_minutes, 0)::bigint,
  COALESCE(agg.annee_courante_pause_total_minutes, 0)::bigint,
  COALESCE(agg.annee_courante_travail_net_minutes, 0)::bigint,
  COALESCE(agg.annee_courante_retard_minutes, 0)::bigint,
  COALESCE(agg.annee_courante_depart_anticipe_minutes, 0)::bigint,
  COALESCE(agg.annee_precedente_travail_total_minutes, 0)::bigint,
  COALESCE(agg.annee_precedente_pause_total_minutes, 0)::bigint,
  COALESCE(agg.annee_precedente_travail_net_minutes, 0)::bigint,
  COALESCE(agg.annee_precedente_retard_minutes, 0)::bigint,
  COALESCE(agg.annee_precedente_depart_anticipe_minutes, 0)::bigint
FROM agg;

-- KPIs per user (fixes earlier FROM alias issue)
CREATE OR REPLACE VIEW public.appbadge_v_kpis_par_utilisateur(
  utilisateur_id, nom, prenom, lieux,
  semaine_courante_travail_total_minutes, semaine_courante_pause_total_minutes, semaine_courante_travail_net_minutes,
  semaine_courante_retard_minutes, semaine_courante_depart_anticipe_minutes,
  semaine_precedente_travail_total_minutes, semaine_precedente_pause_total_minutes, semaine_precedente_travail_net_minutes,
  semaine_precedente_retard_minutes, semaine_precedente_depart_anticipe_minutes,
  mois_courant_travail_total_minutes, mois_courant_pause_total_minutes, mois_courant_travail_net_minutes,
  mois_courant_retard_minutes, mois_courant_depart_anticipe_minutes,
  mois_precedent_travail_total_minutes, mois_precedent_pause_total_minutes, mois_precedent_travail_net_minutes,
  mois_precedent_retard_minutes, mois_precedent_depart_anticipe_minutes,
  annee_courante_travail_total_minutes, annee_courante_pause_total_minutes, annee_courante_travail_net_minutes,
  annee_courante_retard_minutes, annee_courante_depart_anticipe_minutes,
  annee_precedente_travail_total_minutes, annee_precedente_pause_total_minutes, annee_precedente_travail_net_minutes,
  annee_precedente_retard_minutes, annee_precedente_depart_anticipe_minutes
) AS
WITH now_ctx AS (
  SELECT (now() AT TIME ZONE 'Indian/Reunion'::text)::date AS now_local_date,
         date_trunc('week'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS week_cur_start,
         date_trunc('month'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS month_cur_start,
         date_trunc('year'::text, (now() AT TIME ZONE 'Indian/Reunion'::text))::date AS year_cur_start
),
bounds AS (
  SELECT now_ctx.week_cur_start,
         (now_ctx.week_cur_start + '7 days'::interval)::date AS week_next_start,
         (now_ctx.week_cur_start - '7 days'::interval)::date AS week_prev_start,
         now_ctx.month_cur_start,
         (now_ctx.month_cur_start + '1 mon'::interval)::date AS month_next_start,
         (now_ctx.month_cur_start - '1 mon'::interval)::date AS month_prev_start,
         now_ctx.year_cur_start,
         (now_ctx.year_cur_start + '1 year'::interval)::date AS year_next_start,
         (now_ctx.year_cur_start - '1 year'::interval)::date AS year_prev_start
  FROM now_ctx
),
base AS (
  SELECT s.utilisateur_id, s.nom, s.prenom, s.lieux, s.jour_local,
         COALESCE(s.travail_total_minutes, 0::numeric) AS travail_total_minutes,
         COALESCE(s.pause_total_minutes, 0::numeric) AS pause_total_minutes,
         COALESCE(s.travail_net_minutes, 0::numeric) AS travail_net_minutes,
         COALESCE(s.retard_minutes, 0::numeric) AS retard_minutes,
         COALESCE(s.depart_anticipe_minutes, 0::numeric) AS depart_anticipe_minutes
  FROM appbadge_v_synthese_journaliere s
),
agg AS (
  SELECT b.utilisateur_id, b.nom, b.prenom, b.lieux,
         sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.travail_total_minutes   END) AS semaine_courante_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.pause_total_minutes     END) AS semaine_courante_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.travail_net_minutes     END) AS semaine_courante_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.retard_minutes          END) AS semaine_courante_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_cur_start  AND b.jour_local < bo.week_next_start  THEN b.depart_anticipe_minutes END) AS semaine_courante_depart_anticipe_minutes,

         sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.travail_total_minutes   END) AS semaine_precedente_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.pause_total_minutes     END) AS semaine_precedente_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.travail_net_minutes     END) AS semaine_precedente_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.retard_minutes          END) AS semaine_precedente_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.week_prev_start AND b.jour_local < bo.week_cur_start   THEN b.depart_anticipe_minutes END) AS semaine_precedente_depart_anticipe_minutes,

         sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.travail_total_minutes   END) AS mois_courant_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.pause_total_minutes     END) AS mois_courant_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.travail_net_minutes     END) AS mois_courant_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.retard_minutes          END) AS mois_courant_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_cur_start AND b.jour_local < bo.month_next_start THEN b.depart_anticipe_minutes END) AS mois_courant_depart_anticipe_minutes,

         sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.travail_total_minutes   END) AS mois_precedent_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.pause_total_minutes     END) AS mois_precedent_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.travail_net_minutes     END) AS mois_precedent_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.retard_minutes          END) AS mois_precedent_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.month_prev_start AND b.jour_local < bo.month_cur_start THEN b.depart_anticipe_minutes END) AS mois_precedent_depart_anticipe_minutes,

         sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.travail_total_minutes   END) AS annee_courante_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.pause_total_minutes     END) AS annee_courante_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.travail_net_minutes     END) AS annee_courante_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.retard_minutes          END) AS annee_courante_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_cur_start  AND b.jour_local < bo.year_next_start  THEN b.depart_anticipe_minutes END) AS annee_courante_depart_anticipe_minutes,

         sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.travail_total_minutes   END) AS annee_precedente_travail_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.pause_total_minutes     END) AS annee_precedente_pause_total_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.travail_net_minutes     END) AS annee_precedente_travail_net_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.retard_minutes          END) AS annee_precedente_retard_minutes,
         sum(CASE WHEN b.jour_local >= bo.year_prev_start AND b.jour_local < bo.year_cur_start   THEN b.depart_anticipe_minutes END) AS annee_precedente_depart_anticipe_minutes
  FROM base b
  CROSS JOIN bounds bo
  GROUP BY b.utilisateur_id, b.nom, b.prenom, b.lieux
)
SELECT
  a.utilisateur_id, a.nom, a.prenom, a.lieux,
  COALESCE(a.semaine_courante_travail_total_minutes, 0)::bigint,
  COALESCE(a.semaine_courante_pause_total_minutes, 0)::bigint,
  COALESCE(a.semaine_courante_travail_net_minutes, 0)::bigint,
  COALESCE(a.semaine_courante_retard_minutes, 0)::bigint,
  COALESCE(a.semaine_courante_depart_anticipe_minutes, 0)::bigint,
  COALESCE(a.semaine_precedente_travail_total_minutes, 0)::bigint,
  COALESCE(a.semaine_precedente_pause_total_minutes, 0)::bigint,
  COALESCE(a.semaine_precedente_travail_net_minutes, 0)::bigint,
  COALESCE(a.semaine_precedente_retard_minutes, 0)::bigint,
  COALESCE(a.semaine_precedente_depart_anticipe_minutes, 0)::bigint,
  COALESCE(a.mois_courant_travail_total_minutes, 0)::bigint,
  COALESCE(a.mois_courant_pause_total_minutes, 0)::bigint,
  COALESCE(a.mois_courant_travail_net_minutes, 0)::bigint,
  COALESCE(a.mois_courant_retard_minutes, 0)::bigint,
  COALESCE(a.mois_courant_depart_anticipe_minutes, 0)::bigint,
  COALESCE(a.mois_precedent_travail_total_minutes, 0)::bigint,
  COALESCE(a.mois_precedent_pause_total_minutes, 0)::bigint,
  COALESCE(a.mois_precedent_travail_net_minutes, 0)::bigint,
  COALESCE(a.mois_precedent_retard_minutes, 0)::bigint,
  COALESCE(a.mois_precedent_depart_anticipe_minutes, 0)::bigint,
  COALESCE(a.annee_courante_travail_total_minutes, 0)::bigint,
  COALESCE(a.annee_courante_pause_total_minutes, 0)::bigint,
  COALESCE(a.annee_courante_travail_net_minutes, 0)::bigint,
  COALESCE(a.annee_courante_retard_minutes, 0)::bigint,
  COALESCE(a.annee_courante_depart_anticipe_minutes, 0)::bigint,
  COALESCE(a.annee_precedente_travail_total_minutes, 0)::bigint,
  COALESCE(a.annee_precedente_pause_total_minutes, 0)::bigint,
  COALESCE(a.annee_precedente_travail_net_minutes, 0)::bigint,
  COALESCE(a.annee_precedente_retard_minutes, 0)::bigint,
  COALESCE(a.annee_precedente_depart_anticipe_minutes, 0)::bigint
FROM agg a;

-- Anomaly detection
CREATE OR REPLACE VIEW public.appbadge_v_anomalies(
  id, utilisateur_id, nom, prenom, jour_local, date_heure, type_action, anomalie
) AS
WITH now_ctx AS (
  SELECT (now() AT TIME ZONE 'Indian/Reunion'::text)::date AS today_local
),
ordered AS (
  SELECT e.id, e.utilisateur_id, e.date_heure_effective AS date_heure, e.type_action,
         e.latitude, e.longitude, e.lieux, e.commentaire, e.code, e.nom, e.prenom,
         e.jour_local_effectif AS jour_local,
         lag(e.type_action)  OVER (PARTITION BY e.utilisateur_id, e.jour_local_effectif ORDER BY e.date_heure_effective) AS prev_type,
         lead(e.type_action) OVER (PARTITION BY e.utilisateur_id, e.jour_local_effectif ORDER BY e.date_heure_effective) AS next_type
  FROM appbadge_v_badgeages_effectifs e
),
rules AS (
  SELECT o.id, o.utilisateur_id, o.nom, o.prenom, o.jour_local, o.date_heure, o.type_action,
         CASE
           WHEN o.type_action = 'entrée' AND o.prev_type = 'entrée' THEN 'Double entrée consécutive'
           WHEN o.type_action = 'sortie'  AND o.prev_type = 'sortie'  THEN 'Double sortie consécutive'
           WHEN o.type_action = 'pause'   AND o.prev_type = 'pause'   THEN 'Double pause consécutive'
           WHEN o.type_action = 'retour' THEN
             CASE
               WHEN o.prev_type = 'retour' THEN 'Double retour consécutif'
               WHEN o.prev_type IS DISTINCT FROM 'pause' THEN 'Retour sans pause précédente'
               ELSE NULL
             END
           WHEN o.type_action = 'sortie' AND o.prev_type IS NULL THEN 'Sortie sans entrée précédente ce jour'
           ELSE NULL
         END AS anomalie
  FROM ordered o
),
entree_sans_sortie AS (
  SELECT e.id, e.utilisateur_id, e.nom, e.prenom, e.jour_local_effectif AS jour_local,
         e.date_heure_effective AS date_heure, 'entrée'::text AS type_action,
         'Entrée sans sortie associée ce jour'::text AS anomalie
  FROM appbadge_v_badgeages_effectifs e
  WHERE e.type_action = 'entrée'
    AND NOT EXISTS (
      SELECT 1 FROM appbadge_v_badgeages_effectifs b2
      WHERE b2.utilisateur_id = e.utilisateur_id
        AND b2.type_action = 'sortie'
        AND b2.jour_local_effectif = e.jour_local_effectif
        AND b2.date_heure_effective > e.date_heure_effective
    )
),
pause_sans_retour AS (
  SELECT p.id, p.utilisateur_id, p.nom, p.prenom, p.jour_local_effectif AS jour_local,
         p.date_heure_effective AS date_heure, 'pause'::text AS type_action,
         'Pause sans retour associé ce jour'::text AS anomalie
  FROM appbadge_v_badgeages_effectifs p
  WHERE p.type_action = 'pause'
    AND NOT EXISTS (
      SELECT 1 FROM appbadge_v_badgeages_effectifs r
      WHERE r.utilisateur_id = p.utilisateur_id
        AND r.type_action = 'retour'
        AND r.jour_local_effectif = p.jour_local_effectif
        AND r.date_heure_effective > p.date_heure_effective
    )
),
anomalies AS (
  SELECT * FROM rules WHERE anomalie IS NOT NULL
  UNION ALL SELECT * FROM entree_sans_sortie
  UNION ALL SELECT * FROM pause_sans_retour
)
SELECT a.*
FROM anomalies a
CROSS JOIN now_ctx n
WHERE a.jour_local <> n.today_local;

-- ---------------------------------------------------------------------
-- Admin and helper views (independent of core flow)
-- ---------------------------------------------------------------------

-- Admin badge numbers for active Admin and Manager users
CREATE OR REPLACE VIEW public.v_admin_badge_numbers
  (utilisateur_id, numero_badge, numero_badge_history)
  WITH (security_barrier=true) AS
SELECT b.utilisateur_id, b.numero_badge, b.numero_badge_history
FROM appbadge_badges b
JOIN appbadge_utilisateurs u ON u.id = b.utilisateur_id
WHERE u.actif = true AND (u.role = ANY (ARRAY['Admin'::text, 'Manager'::text]));

-- Badgeages with Reunion-local helpers and closing proximity
CREATE OR REPLACE VIEW public.v_appbadge_badgeages_reunion(
  id, utilisateur_id, type_action, lieux, latitude, longitude, code, commentaire,
  date_heure, ts_reunion, jour_reunion, heure_reunion, heure_fin,
  fin_theorique_reunion, delta_jusqua_fin, proche_sortie_30m
) AS
SELECT b.id, b.utilisateur_id, b.type_action, b.lieux, b.latitude, b.longitude, b.code, b.commentaire, b.date_heure,
       (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text) AS ts_reunion,
       (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)::date AS jour_reunion,
       to_char((b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text), 'HH24:MI:SS') AS heure_reunion,
       hs.heure_fin,
       date_trunc('day', (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) + hs.heure_fin::interval AS fin_theorique_reunion,
       date_trunc('day', (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) + hs.heure_fin::interval - (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text) AS delta_jusqua_fin,
       (date_trunc('day', (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) + hs.heure_fin::interval - (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) >= '00:00:00'::interval
       AND (date_trunc('day', (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) + hs.heure_fin::interval - (b.date_heure::timestamp without time zone AT TIME ZONE 'Indian/Reunion'::text)) <= '00:30:00'::interval AS proche_sortie_30m
FROM appbadge_badgeages b
LEFT JOIN appbadge_horaires_standards hs ON hs.lieux = b.lieux;

-- Pauses close to end-of-day with no action after
CREATE OR REPLACE VIEW public.v_appbadge_pauses_proches_sortie(
  id, utilisateur_id, type_action, lieux, latitude, longitude, code, commentaire,
  date_heure, ts_reunion, jour_reunion, heure_reunion, heure_fin,
  fin_theorique_reunion, delta_jusqua_fin, proche_sortie_30m, a_deja_action_apres
) AS
WITH base AS (
  SELECT v.*,
         EXISTS (
           SELECT 1
           FROM appbadge_badgeages b2
           WHERE b2.utilisateur_id = v.utilisateur_id
             AND b2.date_heure > (SELECT b1.date_heure FROM appbadge_badgeages b1 WHERE b1.id = v.id)
             AND b2.type_action = ANY (ARRAY['retour'::text, 'sortie'::text])
         ) AS a_deja_action_apres
  FROM v_appbadge_badgeages_reunion v
  WHERE v.type_action = 'pause'::text AND v.heure_fin IS NOT NULL
)
SELECT *
FROM base
WHERE base.proche_sortie_30m AND NOT base.a_deja_action_apres;

-- Users potentially out-of-window
CREATE OR REPLACE VIEW public.v_appbadge_utilisateurs_hors_creneau(
  utilisateur_id, email, nom, prenom, service, lieu_profil_utilisateur, lieu_dernier_badge,
  lieu_inconnu, derniere_action, horodatage_derniere_action, heure_debut_reference,
  heure_fin_reference, heure_actuelle_reunion, source_fenetre, hors_creneau
) AS
WITH params AS (
  SELECT (now() AT TIME ZONE 'Indian/Reunion'::text)::date AS local_today,
         (now() AT TIME ZONE 'Indian/Reunion'::text)::time without time zone AS local_time,
         '08:00:00'::time without time zone AS default_start,
         '17:00:00'::time without time zone AS default_end
),
events AS (
  SELECT b.id, b.utilisateur_id, b.date_heure, b.type_action, b.latitude, b.longitude, b.lieux, b.commentaire, b.code,
         (b.date_heure AT TIME ZONE 'Indian/Reunion'::text)::date AS local_date
  FROM appbadge_badgeages b
),
today AS (
  SELECT e.*
  FROM events e
  JOIN params p ON e.local_date = p.local_today
),
last_in AS (
  SELECT today.utilisateur_id, max(today.date_heure) AS last_in_ts
  FROM today
  WHERE today.type_action = ANY (ARRAY['entrée'::text, 'retour'::text])
  GROUP BY today.utilisateur_id
),
last_out AS (
  SELECT today.utilisateur_id, max(today.date_heure) AS last_out_ts
  FROM today
  WHERE today.type_action = ANY (ARRAY['sortie'::text, 'pause'::text])
  GROUP BY today.utilisateur_id
),
still_in_today AS (
  SELECT i.utilisateur_id, i.last_in_ts, o.last_out_ts
  FROM last_in i
  LEFT JOIN last_out o USING (utilisateur_id)
  WHERE COALESCE(o.last_out_ts, '1970-01-01 00:00:00+00'::timestamp with time zone) < i.last_in_ts
),
last_in_row AS (
  SELECT DISTINCT ON (t.utilisateur_id)
         t.utilisateur_id,
         t.id AS badgeage_id,
         t.date_heure AS derniere_entree_ts,
         t.type_action,
         NULLIF(btrim(t.lieux), ''::text) AS lieux
  FROM today t
  JOIN still_in_today s USING (utilisateur_id)
  WHERE t.type_action = ANY (ARRAY['entrée'::text, 'retour'::text])
  ORDER BY t.utilisateur_id, t.date_heure DESC, t.id DESC
),
with_schedule AS (
  SELECT r.utilisateur_id, r.badgeage_id, r.derniere_entree_ts, r.lieux AS lieu_dernier_badge,
         hs.id AS hs_id, hs.heure_debut, hs.heure_fin
  FROM last_in_row r
  LEFT JOIN appbadge_horaires_standards hs ON hs.lieux = r.lieux
),
windowed AS (
  SELECT ws.utilisateur_id, ws.badgeage_id, ws.derniere_entree_ts, ws.lieu_dernier_badge,
         ws.hs_id, ws.heure_debut, ws.heure_fin, p.local_time,
         ws.hs_id IS NULL OR ws.lieu_dernier_badge IS NULL AS lieu_inconnu,
         COALESCE(ws.heure_debut, CASE WHEN ws.hs_id IS NULL THEN p.default_start ELSE '08:00:00'::time end) AS heure_debut_ref,
         COALESCE(ws.heure_fin,   CASE WHEN ws.hs_id IS NULL THEN p.default_end   ELSE '23:59:59'::time end) AS heure_fin_ref
  FROM with_schedule ws
  CROSS JOIN params p
),
violations AS (
  SELECT w.*,
         w.local_time >= w.heure_fin_ref AS hors_creneau
  FROM windowed w
)
SELECT u.id AS utilisateur_id, u.email, u.nom, u.prenom, u.service,
       u.lieux AS lieu_profil_utilisateur,
       v.lieu_dernier_badge,
       v.lieu_inconnu,
       'entrée/retour'::text AS derniere_action,
       v.derniere_entree_ts AS horodatage_derniere_action,
       v.heure_debut_ref AS heure_debut_reference,
       v.heure_fin_ref AS heure_fin_reference,
       v.local_time AS heure_actuelle_reunion,
       CASE WHEN v.lieu_inconnu THEN 'Fenêtre par défaut 08:00–17:00 (lieu inconnu)'
            ELSE 'Fenêtre du lieu (horaires_standards)' END AS source_fenetre,
       v.hors_creneau
FROM violations v
JOIN appbadge_utilisateurs u ON u.id = v.utilisateur_id
  AND COALESCE(lower(btrim(u.status)), ''::text) <> 'sorti'::text
WHERE v.hors_creneau = true
ORDER BY v.local_time DESC, v.derniere_entree_ts DESC;

-- ---------------------------------------------------------------------
-- Extension helper views (pg_stat_statements)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW extensions.pg_stat_statements(
  userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time,
  calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows,
  shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written,
  local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written,
  temp_blks_read, temp_blks_written, blk_read_time, blk_write_time, temp_blk_read_time, temp_blk_write_time,
  wal_records, wal_fpi, wal_bytes,
  jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time,
  jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time
) AS
SELECT
  s.userid, s.dbid, s.toplevel, s.queryid, s.query, s.plans,
  s.total_plan_time, s.min_plan_time, s.max_plan_time, s.mean_plan_time, s.stddev_plan_time,
  s.calls, s.total_exec_time, s.min_exec_time, s.max_exec_time, s.mean_exec_time, s.stddev_exec_time, s.rows,
  s.shared_blks_hit, s.shared_blks_read, s.shared_blks_dirtied, s.shared_blks_written,
  s.local_blks_hit, s.local_blks_read, s.local_blks_dirtied, s.local_blks_written,
  s.temp_blks_read, s.temp_blks_written, s.blk_read_time, s.blk_write_time, s.temp_blk_read_time, s.temp_blk_write_time,
  s.wal_records, s.wal_fpi, s.wal_bytes,
  s.jit_functions, s.jit_generation_time, s.jit_inlining_count, s.jit_inlining_time,
  s.jit_optimization_count, s.jit_optimization_time, s.jit_emission_count, s.jit_emission_time
FROM pg_stat_statements(true) AS s(
  userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time,
  calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows,
  shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written,
  local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written,
  temp_blks_read, temp_blks_written, blk_read_time, blk_write_time, temp_blk_read_time, temp_blk_write_time,
  wal_records, wal_fpi, wal_bytes,
  jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time,
  jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time
);

CREATE OR REPLACE VIEW extensions.pg_stat_statements_info(dealloc, stats_reset) AS
SELECT i.dealloc, i.stats_reset
FROM pg_stat_statements_info() AS i(dealloc, stats_reset);

-- ---------------------------------------------------------------------
-- pgsodium helper views
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW pgsodium.decrypted_key(
  id, status, created, expires, key_type, key_id, key_context, name,
  associated_data, raw_key, decrypted_raw_key, raw_key_nonce, parent_key, comment
) AS
SELECT key.id, key.status, key.created, key.expires, key.key_type, key.key_id, key.key_context, key.name,
       key.associated_data, key.raw_key,
       CASE
         WHEN key.raw_key IS NULL THEN NULL::bytea
         ELSE CASE
                WHEN key.parent_key IS NULL THEN NULL::bytea
                ELSE pgsodium.crypto_aead_det_decrypt(
                       key.raw_key,
                       convert_to(key.id::text || key.associated_data, 'utf8'),
                       key.parent_key,
                       key.raw_key_nonce
                     )
              END
       END AS decrypted_raw_key,
       key.raw_key_nonce, key.parent_key, key.comment
FROM pgsodium.key;

CREATE OR REPLACE VIEW pgsodium.masking_rule(
  attrelid, attnum, relnamespace, relname, attname, format_type,
  col_description, key_id_column, key_id, associated_columns, nonce_column,
  view_name, priority, security_invoker
) AS
WITH const AS (
  SELECT
    'encrypt +with +key +id +([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'::text AS pattern_key_id,
    'encrypt +with +key +column +([\w\"\-$]+)'::text AS pattern_key_id_column,
    '(?<=associated) +\(([\w\"\-$, ]+)\)'::text AS pattern_associated_columns,
    '(?<=nonce) +([\w\"\-$]+)'::text AS pattern_nonce_column,
    '(?<=decrypt with view) +([\w\"\-$]+\.[\w\"\-$]+)'::text AS pattern_view_name,
    '(?<=security invoker)'::text AS pattern_security_invoker
),
rules_from_seclabels AS (
  SELECT sl.objoid AS attrelid,
         sl.objsubid AS attnum,
         c.relnamespace::regnamespace AS relnamespace,
         c.relname,
         a.attname,
         format_type(a.atttypid, a.atttypmod) AS format_type,
         sl.label AS col_description,
         (regexp_match(sl.label, k.pattern_key_id_column, 'i'))[1] AS key_id_column,
         (regexp_match(sl.label, k.pattern_key_id, 'i'))[1] AS key_id,
         (regexp_match(sl.label, k.pattern_associated_columns, 'i'))[1] AS associated_columns,
         (regexp_match(sl.label, k.pattern_nonce_column, 'i'))[1] AS nonce_column,
         COALESCE((regexp_match(sl2.label, k.pattern_view_name, 'i'))[1],
                  (c.relnamespace::regnamespace || '.'::text) || quote_ident('decrypted_'::text || c.relname::text)) AS view_name,
         100 AS priority,
         (regexp_match(sl.label, k.pattern_security_invoker, 'i'))[1] IS NOT NULL AS security_invoker
  FROM const k
  JOIN pg_seclabel sl ON TRUE
  JOIN pg_class c ON sl.classoid = c.tableoid AND sl.objoid = c.oid
  JOIN pg_attribute a ON a.attrelid = c.oid AND sl.objsubid = a.attnum
  LEFT JOIN pg_seclabel sl2 ON sl2.objoid = c.oid AND sl2.objsubid = 0
  WHERE a.attnum > 0
    AND c.relnamespace::regnamespace::oid <> 'pg_catalog'::regnamespace::oid
    AND NOT a.attisdropped
    AND sl.label ~~* 'ENCRYPT%'::text
    AND sl.provider = 'pgsodium'::text
)
SELECT DISTINCT ON (r.attrelid, r.attnum)
       r.attrelid, r.attnum, r.relnamespace, r.relname, r.attname, r.format_type,
       r.col_description, r.key_id_column, r.key_id, r.associated_columns, r.nonce_column,
       r.view_name, r.priority, r.security_invoker
FROM rules_from_seclabels r
ORDER BY r.attrelid, r.attnum, r.priority DESC;

CREATE OR REPLACE VIEW pgsodium.mask_columns(
  attname, attrelid, key_id, key_id_column, associated_columns, nonce_column, format_type
) AS
SELECT a.attname, a.attrelid, m.key_id, m.key_id_column, m.associated_columns, m.nonce_column, m.format_type
FROM pg_attribute a
LEFT JOIN pgsodium.masking_rule m
  ON m.attrelid = a.attrelid AND m.attname = a.attname
WHERE a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- ---------------------------------------------------------------------
-- Vault decrypted secrets (requires vault.secrets and pgsodium)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vault.decrypted_secrets(
  id, name, description, secret, decrypted_secret, key_id, nonce, created_at, updated_at
) AS
SELECT secrets.id,
       secrets.name,
       secrets.description,
       secrets.secret,
       CASE
         WHEN secrets.secret IS NULL THEN NULL::text
         ELSE CASE
                WHEN secrets.key_id IS NULL THEN NULL::text
                ELSE convert_from(
                       pgsodium.crypto_aead_det_decrypt(
                         decode(secrets.secret, 'base64'),
                         convert_to(((secrets.id::text || secrets.description) || secrets.created_at::text) || secrets.updated_at::text, 'utf8'),
                         secrets.key_id,
                         secrets.nonce
                       ),
                       'utf8'
                     )
              END
       END AS decrypted_secret,
       secrets.key_id,
       secrets.nonce,
       secrets.created_at,
       secrets.updated_at
FROM vault.secrets;


-- ===================== public functions, triggers, cron =====================

-- =====================================================================
-- appbadge_public_all.sql
-- Consolidated functions (schema: public) + triggers + pg_cron jobs
-- Safe to run multiple times. Leaves existing behavior unchanged.
-- =====================================================================


-- Optional safety knobs (uncomment if desired)
-- SET LOCAL lock_timeout = '10s';
-- SET LOCAL statement_timeout = '5min';
-- SET LOCAL search_path = public, pg_temp;

-- =====================================================================
-- ========================== FUNCTIONS (public) ========================
-- =====================================================================

/* reset_user_status() */
DROP FUNCTION IF EXISTS public.reset_user_status() CASCADE;
CREATE OR REPLACE FUNCTION public.reset_user_status()
RETURNS void
LANGUAGE plpgsql
AS $function$
begin
  update public.appbadge_utilisateurs
  set status = 'Non badgé';
end;
$function$;

/* cleanup_old_badgeages() */
DROP FUNCTION IF EXISTS public.cleanup_old_badgeages() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_old_badgeages()
RETURNS void
LANGUAGE plpgsql
AS $function$
begin
  delete from public.appbadge_badgeages
  where date_heure < now() - interval '5 years';
end;
$function$;

/* appbadge_session_modifs_check() */
DROP FUNCTION IF EXISTS public.appbadge_session_modifs_check() CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_session_modifs_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Execute with privileges of function owner to bypass RLS
SET search_path = public
AS $function$
DECLARE
  s record;
BEGIN
  -- Check via appbadge_v_sessions view to avoid RLS issues
  -- The view already validates that entree_id exists and is of type 'entrée'
  SELECT utilisateur_id
  INTO s
  FROM public.appbadge_v_sessions
  WHERE entree_id = NEW.entree_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entree_id % does not exist in appbadge_v_sessions', NEW.entree_id;
  END IF;

  IF s.utilisateur_id <> NEW.utilisateur_id THEN
    RAISE EXCEPTION 'utilisateur_id mismatch: request is for user %, but session belongs to user %',
      NEW.utilisateur_id, s.utilisateur_id;
  END IF;

  IF NEW.proposed_entree_ts IS NOT NULL
     AND NEW.proposed_sortie_ts IS NOT NULL
     AND NEW.proposed_sortie_ts <= NEW.proposed_entree_ts THEN
    RAISE EXCEPTION 'proposed_sortie_ts must be strictly after proposed_entree_ts';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

/* appbadge_session_modif_validations_check() */
DROP FUNCTION IF EXISTS public.appbadge_session_modif_validations_check() CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_session_modif_validations_check()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  req_user uuid;
BEGIN
  SELECT utilisateur_id INTO req_user
  FROM public.appbadge_session_modifs
  WHERE id = NEW.modif_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'modif_id % not found in appbadge_session_modifs', NEW.modif_id;
  END IF;

  IF req_user = NEW.validateur_id THEN
    RAISE EXCEPTION 'A user cannot validate their own modification request';
  END IF;

  RETURN NEW;
END;
$function$;

/* appbadge_kpi_global_month(p_year integer, p_month integer) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_month(p_year integer, p_month integer) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_month(p_year integer, p_month integer)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global(
    make_date(p_year, p_month, 1),
    'month'::text
  );
$function$;

/* appbadge_kpi_global_year(p_year integer) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_year(p_year integer) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_year(p_year integer)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global(
    make_date(p_year, 1, 1),
    'year'::text
  );
$function$;

/* appbadge_kpi_bundle_month(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_bundle_month(p_year integer, p_month integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_bundle_month(
  p_year integer, p_month integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(window_start date, window_end date, period text, global jsonb, users jsonb, meta jsonb)
LANGUAGE sql
STABLE
AS $function$
  select * from public.appbadge_kpi_bundle(
    make_date(p_year,p_month,1), 'month'::text,
    p_utilisateur_id, p_lieux, p_service, p_role
  );
$function$;

/* appbadge_kpi_bundle_year(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_bundle_year(p_year integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_bundle_year(
  p_year integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(window_start date, window_end date, period text, global jsonb, users jsonb, meta jsonb)
LANGUAGE sql
STABLE
AS $function$
  select * from public.appbadge_kpi_bundle(
    make_date(p_year,1,1), 'year'::text,
    p_utilisateur_id, p_lieux, p_service, p_role
  );
$function$;

/* appbadge_kpi_filtres(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_filtres(p_start_date date, p_period text, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_filtres(
  p_start_date date, p_period text,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(utilisateur_id uuid, nom text, prenom text, lieux text, service text, role text, travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  with bounds as (
    select
      p_start_date::date as d0,
      case lower(p_period)
        when 'week'  then (p_start_date + interval '7 days')::date
        when 'month' then (p_start_date + interval '1 month')::date
        when 'year'  then (p_start_date + interval '1 year')::date
        else null::date
      end as d1
  )
  select
    s.utilisateur_id, s.nom, s.prenom, s.lieux,
    u.service, u.role,
    coalesce(sum(s.travail_total_minutes),0)::bigint,
    coalesce(sum(s.pause_total_minutes),0)::bigint,
    coalesce(sum(s.travail_net_minutes),0)::bigint,
    coalesce(sum(s.retard_minutes),0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  join public.appbadge_utilisateurs u on u.id = s.utilisateur_id
  cross join bounds b
  where b.d1 is not null
    and s.jour_local >= b.d0
    and s.jour_local <  b.d1
    and (p_utilisateur_id is null or s.utilisateur_id = p_utilisateur_id)
    and (p_lieux   is null or s.lieux   = p_lieux)
    and (p_service is null or u.service = p_service)
    and (p_role    is null or u.role    = p_role)
  group by s.utilisateur_id, s.nom, s.prenom, s.lieux, u.service, u.role;
$function$;

/* appbadge_kpi_filtres_between(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_filtres_between(p_start_date date, p_end_date date, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_filtres_between(
  p_start_date date, p_end_date date,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(utilisateur_id uuid, nom text, prenom text, lieux text, service text, role text, travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select
    s.utilisateur_id, s.nom, s.prenom, s.lieux,
    u.service, u.role,
    coalesce(sum(s.travail_total_minutes),0)::bigint,
    coalesce(sum(s.pause_total_minutes),0)::bigint,
    coalesce(sum(s.travail_net_minutes),0)::bigint,
    coalesce(sum(s.retard_minutes),0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  join public.appbadge_utilisateurs u on u.id = s.utilisateur_id
  where s.jour_local >= p_start_date
    and s.jour_local <  p_end_date
    and (p_utilisateur_id is null or s.utilisateur_id = p_utilisateur_id)
    and (p_lieux   is null or s.lieux   = p_lieux)
    and (p_service is null or u.service = p_service)
    and (p_role    is null or u.role    = p_role)
  group by s.utilisateur_id, s.nom, s.prenom, s.lieux, u.service, u.role;
$function$;

/* appbadge_kpi_filtres_iso_week(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_filtres_iso_week(p_iso_year integer, p_iso_week integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_filtres_iso_week(
  p_iso_year integer, p_iso_week integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(utilisateur_id uuid, nom text, prenom text, lieux text, service text, role text, travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_filtres(
    to_date(p_iso_year || '-' || p_iso_week || '-1', 'IYYY-IW-ID')::date,
    'week'::text,
    p_utilisateur_id, p_lieux, p_service, p_role
  );
$function$;

/* appbadge_kpi_global(p_start_date date, p_period text) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global(p_start_date date, p_period text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global(p_start_date date, p_period text)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  with bounds as (
    select
      p_start_date::date as d0,
      case lower(p_period)
        when 'week'  then (p_start_date + interval '7 days')::date
        when 'month' then (p_start_date + interval '1 month')::date
        when 'year'  then (p_start_date + interval '1 year')::date
        else null::date
      end as d1
  )
  select
    coalesce(sum(s.travail_total_minutes),  0)::bigint,
    coalesce(sum(s.pause_total_minutes),    0)::bigint,
    coalesce(sum(s.travail_net_minutes),    0)::bigint,
    coalesce(sum(s.retard_minutes),         0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  cross join bounds b
  where b.d1 is not null
    and s.jour_local >= b.d0
    and s.jour_local <  b.d1;
$function$;

/* appbadge_kpi_global_between(p_start_date date, p_end_date date) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_between(p_start_date date, p_end_date date) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_between(p_start_date date, p_end_date date)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select
    coalesce(sum(s.travail_total_minutes),0)::bigint,
    coalesce(sum(s.pause_total_minutes),0)::bigint,
    coalesce(sum(s.travail_net_minutes),0)::bigint,
    coalesce(sum(s.retard_minutes),0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  where s.jour_local >= p_start_date
    and s.jour_local <  p_end_date;
$function$;

/* appbadge_kpi_global_filtres(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_filtres(p_start_date date, p_period text, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_filtres(
  p_start_date date, p_period text,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  with bounds as (
    select
      p_start_date::date as d0,
      case lower(p_period)
        when 'week'  then (p_start_date + interval '7 days')::date
        when 'month' then (p_start_date + interval '1 month')::date
        when 'year'  then (p_start_date + interval '1 year')::date
        else null::date
      end as d1
  )
  select
    coalesce(sum(s.travail_total_minutes),0)::bigint,
    coalesce(sum(s.pause_total_minutes),0)::bigint,
    coalesce(sum(s.travail_net_minutes),0)::bigint,
    coalesce(sum(s.retard_minutes),0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  join public.appbadge_utilisateurs u on u.id = s.utilisateur_id
  cross join bounds b
  where b.d1 is not null
    and s.jour_local >= b.d0
    and s.jour_local <  b.d1
    and (p_lieux   is null or s.lieux   = p_lieux)
    and (p_service is null or u.service = p_service)
    and (p_role    is null or u.role    = p_role);
$function$;

/* appbadge_kpi_global_filtres_iso_week(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_filtres_iso_week(p_iso_year integer, p_iso_week integer, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_filtres_iso_week(
  p_iso_year integer, p_iso_week integer,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global_filtres(
    to_date(p_iso_year || '-' || p_iso_week || '-1', 'IYYY-IW-ID')::date,
    'week'::text,
    p_lieux, p_service, p_role
  );
$function$;

/* auth_role() */
DROP FUNCTION IF EXISTS public.auth_role() CASCADE;
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    'anon'
  );
$function$;

/* is_admin() */
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.appbadge_utilisateurs u
    where u.id = auth.uid()
      and u.actif = true
      and u.role in ('Admin','Manager')
  );
$function$;

/* notifier_mise_a_jour_utilisateur() */
DROP FUNCTION IF EXISTS public.notifier_mise_a_jour_utilisateur() CASCADE;
CREATE OR REPLACE FUNCTION public.notifier_mise_a_jour_utilisateur()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if (
       (old.status is distinct from new.status)
    or (old.lieux  is distinct from new.lieux)
     )
     and new.lieux  is not null
     and new.status <> 'Non badgé'
  then
    perform http_post(
      'https://n8n.otisud.re/webhook/305a6886-e290-40e6-bb60-34eb3e93df04',
      json_build_object(
        'email',  new.email,
        'status', new.status,
        'lieux',  new.lieux
      )::text,
      'application/json'
    );
  end if;

  return new;
end;
$function$;

/* update_badge_codes() */
DROP FUNCTION IF EXISTS public.update_badge_codes() CASCADE;
CREATE OR REPLACE FUNCTION public.update_badge_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  nb_rows int;
begin
  lock table public.appbadge_badges in share row exclusive mode;

  select count(*) into nb_rows from public.appbadge_badges;
  if nb_rows > 9000 then
    raise exception
      'Impossible : % lignes > 9000 codes disponibles (1000-9999).', nb_rows;
  end if;

  create temporary table tmp_codes(code text primary key) on commit drop;
  insert into tmp_codes(code)
  select to_char(code, 'FM0000')
  from generate_series(1000, 9999) as code
  order by random()
  limit nb_rows;

  with numbered_badges as (
    select id, row_number() over () as rn, numero_badge_history
    from   public.appbadge_badges
  ),
  numbered_codes as (
    select code, row_number() over () as rn
    from   tmp_codes
  )
  update public.appbadge_badges b
  set
      numero_badge = nc.code,
      numero_badge_history =
        (array_prepend(nc.code,
                       coalesce(b.numero_badge_history, '{}')))[1:3]
  from numbered_badges nb
  join numbered_codes nc using (rn)
  where b.id = nb.id;
end;
$function$;

/* appbadge_kpi_filtres_month(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_filtres_month(p_year integer, p_month integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_filtres_month(
  p_year integer, p_month integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(utilisateur_id uuid, nom text, prenom text, lieux text, service text, role text, travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_filtres(make_date(p_year,p_month,1), 'month'::text,
                                   p_utilisateur_id, p_lieux, p_service, p_role);
$function$;

/* appbadge_kpi_filtres_year(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_filtres_year(p_year integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_filtres_year(
  p_year integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(utilisateur_id uuid, nom text, prenom text, lieux text, service text, role text, travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_filtres(make_date(p_year,1,1), 'year'::text,
                                   p_utilisateur_id, p_lieux, p_service, p_role);
$function$;

/* appbadge_kpi_global_filtres_month(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_filtres_month(p_year integer, p_month integer, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_filtres_month(
  p_year integer, p_month integer,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global_filtres(make_date(p_year,p_month,1), 'month'::text,
                                          p_lieux, p_service, p_role);
$function$;

/* appbadge_kpi_global_filtres_year(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_filtres_year(p_year integer, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_filtres_year(
  p_year integer,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global_filtres(make_date(p_year,1,1), 'year'::text,
                                          p_lieux, p_service, p_role);
$function$;

/* appbadge_kpi_global_filtres_between(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_filtres_between(p_start_date date, p_end_date date, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_filtres_between(
  p_start_date date, p_end_date date,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select
    coalesce(sum(s.travail_total_minutes),0)::bigint,
    coalesce(sum(s.pause_total_minutes),0)::bigint,
    coalesce(sum(s.travail_net_minutes),0)::bigint,
    coalesce(sum(s.retard_minutes),0)::bigint,
    coalesce(sum(s.depart_anticipe_minutes),0)::bigint
  from public.appbadge_v_synthese_journaliere s
  join public.appbadge_utilisateurs u on u.id = s.utilisateur_id
  where s.jour_local >= p_start_date
    and s.jour_local <  p_end_date
    and (p_lieux   is null or s.lieux   = p_lieux)
    and (p_service is null or u.service = p_service)
    and (p_role    is null or u.role    = p_role);
$function$;

/* appbadge_kpi_bundle(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_bundle(p_start_date date, p_period text, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_bundle(
  p_start_date date, p_period text,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(window_start date, window_end date, period text, global jsonb, users jsonb, meta jsonb)
LANGUAGE sql
STABLE
AS $function$
  WITH bounds AS (
    SELECT
      p_start_date::date AS d0,
      CASE lower(p_period)
        WHEN 'week'  THEN (p_start_date + INTERVAL '7 days')::date
        WHEN 'month' THEN (p_start_date + INTERVAL '1 month')::date
        WHEN 'year'  THEN (p_start_date + INTERVAL '1 year')::date
        ELSE NULL::date
      END AS d1
  ),
  src AS (
    SELECT s.*, u.service, u.role
    FROM public.appbadge_v_synthese_journaliere s
    JOIN public.appbadge_utilisateurs u ON u.id = s.utilisateur_id
  ),
  filtered AS (
    SELECT s.*
    FROM src s
    CROSS JOIN bounds b
    WHERE b.d1 IS NOT NULL
      AND s.jour_local >= b.d0
      AND s.jour_local <  b.d1
      AND (p_utilisateur_id IS NULL OR s.utilisateur_id = p_utilisateur_id)
      AND (p_lieux   IS NULL OR s.lieux   = p_lieux)
      AND (p_service IS NULL OR s.service = p_service)
      AND (p_role    IS NULL OR s.role    = p_role)
  ),
  actual_days_count AS (
    SELECT COUNT(DISTINCT jour_local)::numeric AS days_count
    FROM filtered
  ),
  users_with_data AS (
    SELECT DISTINCT f.utilisateur_id
    FROM filtered f
  ),
  user_expected AS (
    SELECT
      uwd.utilisateur_id,
      -- Calculate based on actual days with data, not requested period
      -- Only for users who actually have badge data
      COALESCE(u.heures_contractuelles_semaine, 35.0) * 60.0 / 5.0 * 
      COALESCE((SELECT days_count FROM actual_days_count), 1.0) AS heures_attendues_minutes
    FROM users_with_data uwd
    INNER JOIN public.appbadge_utilisateurs u ON u.id = uwd.utilisateur_id
  ),
  user_penalties AS (
    SELECT
      f.utilisateur_id,
      -- Total work for this user in the period
      COALESCE(SUM(f.travail_net_minutes),0)::bigint AS total_travail_net,
      -- For part-time workers: calculate weekly deficit once for the period
      -- For full-time workers: sum daily arrival delays
      CASE
        WHEN MAX(COALESCE(u.heures_contractuelles_semaine, 35.0)) < 35.0 THEN
          GREATEST(0::bigint, (
            MAX(COALESCE(u.heures_contractuelles_semaine, 35.0)) * 60.0 / 5.0 * 
            COALESCE((SELECT days_count FROM actual_days_count), 1.0)
          )::bigint - COALESCE(SUM(f.travail_net_minutes),0)::bigint)
        ELSE
          COALESCE(SUM(f.retard_minutes),0)::bigint
      END AS total_retard,
      -- Early departures: only for full-time workers
      CASE
        WHEN MAX(COALESCE(u.heures_contractuelles_semaine, 35.0)) < 35.0 THEN 0::bigint
        ELSE COALESCE(SUM(f.depart_anticipe_minutes),0)::bigint
      END AS total_depart_anticipe
    FROM filtered f
    LEFT JOIN public.appbadge_utilisateurs u ON u.id = f.utilisateur_id
    GROUP BY f.utilisateur_id
  ),
  agg_global AS (
    SELECT
      (SELECT COALESCE(SUM(travail_total_minutes),0)::bigint FROM filtered) AS travail_total_minutes,
      (SELECT COALESCE(SUM(pause_total_minutes),0)::bigint FROM filtered) AS pause_total_minutes,
      (SELECT COALESCE(SUM(travail_net_minutes),0)::bigint FROM filtered) AS travail_net_minutes,
      -- Sum user-level penalties (already correctly calculated per user, once per user)
      COALESCE((SELECT SUM(total_retard) FROM user_penalties),0)::bigint AS retard_minutes,
      COALESCE((SELECT SUM(total_depart_anticipe) FROM user_penalties),0)::bigint AS depart_anticipe_minutes,
      -- Calculate total expected minutes based on users who actually have badge data
      (SELECT COALESCE(SUM(heures_attendues_minutes), 0)::numeric FROM user_expected) AS heures_attendues_minutes
  ),
  agg_users AS (
    SELECT
      f.utilisateur_id,
      MAX(f.nom)     AS nom,
      MAX(f.prenom)  AS prenom,
      MAX(f.lieux)   AS lieux,
      MAX(f.service) AS service,
      MAX(f.role)    AS role,
      COALESCE(SUM(f.travail_total_minutes),0)::bigint    AS travail_total_minutes,
      COALESCE(SUM(f.pause_total_minutes),0)::bigint      AS pause_total_minutes,
      COALESCE(SUM(f.travail_net_minutes),0)::bigint      AS travail_net_minutes,
      -- Use the pre-calculated penalties from user_penalties CTE
      COALESCE(up.total_retard, 0::bigint) AS retard_minutes,
      COALESCE(up.total_depart_anticipe, 0::bigint) AS depart_anticipe_minutes,
      -- Contract hours per week from user
      MAX(COALESCE(u.heures_contractuelles_semaine, 35.0)) AS heures_contractuelles_semaine,
      -- Calculate expected minutes based on actual days with data, not requested period
      MAX(COALESCE(u.heures_contractuelles_semaine, 35.0)) * 60.0 / 5.0 * 
      COALESCE((SELECT days_count FROM actual_days_count), 1.0) AS heures_attendues_minutes
    FROM filtered f
    LEFT JOIN public.appbadge_utilisateurs u ON u.id = f.utilisateur_id
    LEFT JOIN user_penalties up ON up.utilisateur_id = f.utilisateur_id
    CROSS JOIN bounds b
    GROUP BY f.utilisateur_id, up.total_retard, up.total_depart_anticipe
  ),
  users_json AS (
    SELECT jsonb_agg(
             jsonb_build_object(
               'utilisateur_id', utilisateur_id,
               'nom',            nom,
               'prenom',         prenom,
               'lieux',          lieux,
               'service',        service,
               'role',           role,
               'travail_total_minutes',    travail_total_minutes,
               'pause_total_minutes',      pause_total_minutes,
               'travail_net_minutes',      travail_net_minutes,
               'retard_minutes',           retard_minutes,
               'depart_anticipe_minutes',  depart_anticipe_minutes,
               'heures_contractuelles_semaine', heures_contractuelles_semaine,
               'heures_attendues_minutes', ROUND(heures_attendues_minutes::numeric, 2),
               'performance_pourcentage', 
                 CASE 
                   WHEN heures_attendues_minutes > 0 
                   THEN ROUND((travail_net_minutes::numeric / heures_attendues_minutes::numeric * 100.0)::numeric, 2)
                   ELSE NULL::numeric
                 END,
               'ecart_minutes', ROUND((travail_net_minutes::numeric - heures_attendues_minutes::numeric)::numeric, 2)
             )
             ORDER BY retard_minutes DESC, travail_net_minutes DESC
           ) AS users
    FROM agg_users
  ),
  agg_by_service AS (
    SELECT
      service,
      COALESCE(SUM(travail_total_minutes),0)::bigint   AS travail_total_minutes,
      COALESCE(SUM(pause_total_minutes),0)::bigint     AS pause_total_minutes,
      COALESCE(SUM(travail_net_minutes),0)::bigint     AS travail_net_minutes,
      COALESCE(SUM(retard_minutes),0)::bigint          AS retard_minutes,
      COALESCE(SUM(depart_anticipe_minutes),0)::bigint AS depart_anticipe_minutes
    FROM filtered
    GROUP BY service
  ),
  agg_by_lieux AS (
    SELECT
      lieux,
      COALESCE(SUM(travail_total_minutes),0)::bigint   AS travail_total_minutes,
      COALESCE(SUM(pause_total_minutes),0)::bigint     AS pause_total_minutes,
      COALESCE(SUM(travail_net_minutes),0)::bigint     AS travail_net_minutes,
      COALESCE(SUM(retard_minutes),0)::bigint          AS retard_minutes,
      COALESCE(SUM(depart_anticipe_minutes),0)::bigint AS depart_anticipe_minutes
    FROM filtered
    GROUP BY lieux
  ),
  agg_by_role AS (
    SELECT
      role,
      COALESCE(SUM(travail_total_minutes),0)::bigint   AS travail_total_minutes,
      COALESCE(SUM(pause_total_minutes),0)::bigint     AS pause_total_minutes,
      COALESCE(SUM(travail_net_minutes),0)::bigint     AS travail_net_minutes,
      COALESCE(SUM(retard_minutes),0)::bigint          AS retard_minutes,
      COALESCE(SUM(depart_anticipe_minutes),0)::bigint AS depart_anticipe_minutes
    FROM filtered
    GROUP BY role
  ),
  subtotals_json AS (
    SELECT jsonb_build_object(
      'by_service',
        COALESCE(
          (SELECT jsonb_agg(
                    jsonb_build_object(
                      'service', service,
                      'travail_total_minutes',   travail_total_minutes,
                      'pause_total_minutes',     pause_total_minutes,
                      'travail_net_minutes',     travail_net_minutes,
                      'retard_minutes',          retard_minutes,
                      'depart_anticipe_minutes', depart_anticipe_minutes
                    )
                    ORDER BY travail_net_minutes DESC
                  )
           FROM agg_by_service),
          '[]'::jsonb
        ),
      'by_lieux',
        COALESCE(
          (SELECT jsonb_agg(
                    jsonb_build_object(
                      'lieux', lieux,
                      'travail_total_minutes',   travail_total_minutes,
                      'pause_total_minutes',     pause_total_minutes,
                      'travail_net_minutes',     travail_net_minutes,
                      'retard_minutes',          retard_minutes,
                      'depart_anticipe_minutes', depart_anticipe_minutes
                    )
                    ORDER BY travail_net_minutes DESC
                  )
           FROM agg_by_lieux),
          '[]'::jsonb
        ),
      'by_role',
        COALESCE(
          (SELECT jsonb_agg(
                    jsonb_build_object(
                      'role', role,
                      'travail_total_minutes',   travail_total_minutes,
                      'pause_total_minutes',     pause_total_minutes,
                      'travail_net_minutes',     travail_net_minutes,
                      'retard_minutes',          retard_minutes,
                      'depart_anticipe_minutes', depart_anticipe_minutes
                    )
                    ORDER BY travail_net_minutes DESC
                  )
           FROM agg_by_role),
          '[]'::jsonb
        )
    ) AS subtotals
  ),
  global_json AS (
    SELECT jsonb_build_object(
      'travail_total_minutes',   g.travail_total_minutes,
      'pause_total_minutes',     g.pause_total_minutes,
      'travail_net_minutes',     g.travail_net_minutes,
      'retard_minutes',          g.retard_minutes,
      'depart_anticipe_minutes', g.depart_anticipe_minutes,
      'heures_attendues_minutes', ROUND(g.heures_attendues_minutes::numeric, 2),
      'performance_pourcentage',
        CASE 
          WHEN g.heures_attendues_minutes > 0 
          THEN ROUND((g.travail_net_minutes::numeric / g.heures_attendues_minutes::numeric * 100.0)::numeric, 2)
          ELSE NULL::numeric
        END,
      'ecart_minutes', ROUND((g.travail_net_minutes::numeric - g.heures_attendues_minutes::numeric)::numeric, 2)
    ) AS global
    FROM agg_global g
  ),
  meta_json AS (
    SELECT jsonb_build_object(
      'filters', jsonb_build_object(
        'utilisateur_id', p_utilisateur_id,
        'lieux',          p_lieux,
        'service',        p_service,
        'role',           p_role
      ),
      'period', lower(p_period),
      'window_start', (SELECT d0 FROM bounds),
      'window_end',   (SELECT d1 FROM bounds),
      'days',         ((SELECT d1 FROM bounds) - (SELECT d0 FROM bounds)),
      'rows',         (SELECT COUNT(*) FROM filtered),
      'users',        (SELECT COUNT(DISTINCT utilisateur_id) FROM filtered),
      'lieux',        (SELECT COALESCE(jsonb_agg(DISTINCT lieux),   '[]'::jsonb) FROM filtered),
      'services',     (SELECT COALESCE(jsonb_agg(DISTINCT service), '[]'::jsonb) FROM filtered),
      'roles',        (SELECT COALESCE(jsonb_agg(DISTINCT role),    '[]'::jsonb) FROM filtered),
      'subtotals',    (SELECT subtotals FROM subtotals_json)
    ) AS meta
  )
  SELECT
    b.d0::date  AS window_start,
    b.d1::date  AS window_end,
    lower(p_period)::text AS period,
    gj.global,
    uj.users,
    mj.meta
  FROM bounds b, global_json gj, users_json uj, meta_json mj;
$function$;

/* appbadge_kpi_bundle_between(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_bundle_between(p_start_date date, p_end_date date, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_bundle_between(
  p_start_date date, p_end_date date,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(window_start date, window_end date, period text, global jsonb, users jsonb, meta jsonb)
LANGUAGE sql
STABLE
AS $function$
  with src as (
    select s.*, u.service, u.role
    from public.appbadge_v_synthese_journaliere s
    join public.appbadge_utilisateurs u on u.id = s.utilisateur_id
  ),
  filtered as (
    select s.*
    from src s
    where s.jour_local >= p_start_date
      and s.jour_local <  p_end_date
      and (p_utilisateur_id is null or s.utilisateur_id = p_utilisateur_id)
      and (p_lieux   is null or s.lieux   = p_lieux)
      and (p_service is null or s.service = p_service)
      and (p_role    is null or s.role    = p_role)
  ),
  actual_days_count as (
    select count(distinct jour_local)::numeric as days_count
    from filtered
  ),
  user_expected as (
    select
      distinct f.utilisateur_id,
      -- Calculate expected minutes per day, then multiply by actual days with data
      COALESCE(u.heures_contractuelles_semaine, 35.0) * 60.0 / 5.0 * 
      COALESCE((select days_count from actual_days_count), 1.0) as heures_attendues_minutes
    from filtered f
    left join public.appbadge_utilisateurs u on u.id = f.utilisateur_id
  ),
  user_penalties as (
    select
      f.utilisateur_id,
      -- Total work for this user in the period
      coalesce(sum(f.travail_net_minutes),0)::bigint as total_travail_net,
      -- For part-time workers: calculate weekly deficit once for the period
      -- For full-time workers: sum daily arrival delays
      case
        when max(coalesce(u.heures_contractuelles_semaine, 35.0)) < 35.0 then
          greatest(0::bigint, (
            max(coalesce(u.heures_contractuelles_semaine, 35.0)) * 60.0 / 5.0 * 
            coalesce((select days_count from actual_days_count), 1.0)
          )::bigint - coalesce(sum(f.travail_net_minutes),0)::bigint)
        else
          coalesce(sum(f.retard_minutes),0)::bigint
      end as total_retard,
      -- Early departures: only for full-time workers
      case
        when max(coalesce(u.heures_contractuelles_semaine, 35.0)) < 35.0 then 0::bigint
        else coalesce(sum(f.depart_anticipe_minutes),0)::bigint
      end as total_depart_anticipe
    from filtered f
    left join public.appbadge_utilisateurs u on u.id = f.utilisateur_id
    group by f.utilisateur_id
  ),
  agg_global as (
    select
      (select coalesce(sum(travail_total_minutes),0)::bigint from filtered) as travail_total_minutes,
      (select coalesce(sum(pause_total_minutes),0)::bigint from filtered) as pause_total_minutes,
      (select coalesce(sum(travail_net_minutes),0)::bigint from filtered) as travail_net_minutes,
      -- Sum user-level penalties (already correctly calculated per user, once per user)
      coalesce((select sum(total_retard) from user_penalties),0)::bigint as retard_minutes,
      coalesce((select sum(total_depart_anticipe) from user_penalties),0)::bigint as depart_anticipe_minutes,
      (select coalesce(sum(heures_attendues_minutes), 0)::numeric from user_expected) as heures_attendues_minutes
  ),
  agg_users as (
    select
      f.utilisateur_id,
      max(f.nom)    as nom,
      max(f.prenom) as prenom,
      max(f.lieux)  as lieux,
      max(f.service) as service,
      max(f.role)    as role,
      coalesce(sum(f.travail_total_minutes),0)::bigint    as travail_total_minutes,
      coalesce(sum(f.pause_total_minutes),0)::bigint      as pause_total_minutes,
      coalesce(sum(f.travail_net_minutes),0)::bigint      as travail_net_minutes,
      -- Use the pre-calculated penalties from user_penalties CTE
      coalesce(up.total_retard, 0::bigint) as retard_minutes,
      coalesce(up.total_depart_anticipe, 0::bigint) as depart_anticipe_minutes,
      max(coalesce(u.heures_contractuelles_semaine, 35.0)) as heures_contractuelles_semaine,
      max(ue.heures_attendues_minutes) as heures_attendues_minutes
    from filtered f
    left join public.appbadge_utilisateurs u on u.id = f.utilisateur_id
    left join user_expected ue on ue.utilisateur_id = f.utilisateur_id
    left join user_penalties up on up.utilisateur_id = f.utilisateur_id
    group by f.utilisateur_id, up.total_retard, up.total_depart_anticipe
  ),
  users_json as (
    select jsonb_agg(
             jsonb_build_object(
               'utilisateur_id', utilisateur_id,
               'nom',            nom,
               'prenom',         prenom,
               'lieux',          lieux,
               'service',        service,
               'role',           role,
               'travail_total_minutes',    travail_total_minutes,
               'pause_total_minutes',      pause_total_minutes,
               'travail_net_minutes',      travail_net_minutes,
               'retard_minutes',           retard_minutes,
               'depart_anticipe_minutes',  depart_anticipe_minutes,
               'heures_contractuelles_semaine', heures_contractuelles_semaine,
               'heures_attendues_minutes', round(heures_attendues_minutes::numeric, 2),
               'performance_pourcentage',
                 case 
                   when heures_attendues_minutes > 0 
                   then round((travail_net_minutes::numeric / heures_attendues_minutes::numeric * 100.0)::numeric, 2)
                   else null::numeric
                 end,
               'ecart_minutes', round((travail_net_minutes::numeric - heures_attendues_minutes::numeric)::numeric, 2)
             )
             order by retard_minutes desc, travail_net_minutes desc
           ) as users
    from agg_users
  ),
  agg_by_service as (
    select service,
      coalesce(sum(travail_total_minutes),0)::bigint    as travail_total_minutes,
      coalesce(sum(pause_total_minutes),0)::bigint      as pause_total_minutes,
      coalesce(sum(travail_net_minutes),0)::bigint      as travail_net_minutes,
      coalesce(sum(retard_minutes),0)::bigint           as retard_minutes,
      coalesce(sum(depart_anticipe_minutes),0)::bigint  as depart_anticipe_minutes
    from filtered
    group by service
  ),
  agg_by_lieux as (
    select lieux,
      coalesce(sum(travail_total_minutes),0)::bigint    as travail_total_minutes,
      coalesce(sum(pause_total_minutes),0)::bigint      as pause_total_minutes,
      coalesce(sum(travail_net_minutes),0)::bigint      as travail_net_minutes,
      coalesce(sum(retard_minutes),0)::bigint           as retard_minutes,
      coalesce(sum(depart_anticipe_minutes),0)::bigint  as depart_anticipe_minutes
    from filtered
    group by lieux
  ),
  agg_by_role as (
    select role,
      coalesce(sum(travail_total_minutes),0)::bigint    as travail_total_minutes,
      coalesce(sum(pause_total_minutes),0)::bigint      as pause_total_minutes,
      coalesce(sum(travail_net_minutes),0)::bigint      as travail_net_minutes,
      coalesce(sum(retard_minutes),0)::bigint           as retard_minutes,
      coalesce(sum(depart_anticipe_minutes),0)::bigint  as depart_anticipe_minutes
    from filtered
    group by role
  ),
  subtotals_json as (
    select jsonb_build_object(
      'by_service', coalesce(
        (select jsonb_agg(
                  jsonb_build_object(
                    'service', service,
                    'travail_total_minutes',   travail_total_minutes,
                    'pause_total_minutes',     pause_total_minutes,
                    'travail_net_minutes',     travail_net_minutes,
                    'retard_minutes',          retard_minutes,
                    'depart_anticipe_minutes', depart_anticipe_minutes
                  )
                  order by travail_net_minutes desc
                ) from agg_by_service),
        '[]'::jsonb),
      'by_lieux', coalesce(
        (select jsonb_agg(
                  jsonb_build_object(
                    'lieux', lieux,
                    'travail_total_minutes',   travail_total_minutes,
                    'pause_total_minutes',     pause_total_minutes,
                    'travail_net_minutes',     travail_net_minutes,
                    'retard_minutes',          retard_minutes,
                    'depart_anticipe_minutes', depart_anticipe_minutes
                  )
                  order by travail_net_minutes desc
                ) from agg_by_lieux),
        '[]'::jsonb),
      'by_role', coalesce(
        (select jsonb_agg(
                  jsonb_build_object(
                    'role', role,
                    'travail_total_minutes',   travail_total_minutes,
                    'pause_total_minutes',     pause_total_minutes,
                    'travail_net_minutes',     travail_net_minutes,
                    'retard_minutes',          retard_minutes,
                    'depart_anticipe_minutes', depart_anticipe_minutes
                  )
                  order by travail_net_minutes desc
                ) from agg_by_role),
        '[]'::jsonb)
    ) as subtotals
  ),
  global_json as (
    select jsonb_build_object(
      'travail_total_minutes',   g.travail_total_minutes,
      'pause_total_minutes',     g.pause_total_minutes,
      'travail_net_minutes',     g.travail_net_minutes,
      'retard_minutes',          g.retard_minutes,
      'depart_anticipe_minutes', g.depart_anticipe_minutes,
      'heures_attendues_minutes', round(g.heures_attendues_minutes::numeric, 2),
      'performance_pourcentage',
        case 
          when g.heures_attendues_minutes > 0 
          then round((g.travail_net_minutes::numeric / g.heures_attendues_minutes::numeric * 100.0)::numeric, 2)
          else null::numeric
        end,
      'ecart_minutes', round((g.travail_net_minutes::numeric - g.heures_attendues_minutes::numeric)::numeric, 2)
    ) as global
    from agg_global g
  ),
  meta_json as (
    select jsonb_build_object(
      'filters', jsonb_build_object(
        'utilisateur_id', p_utilisateur_id,
        'lieux',          p_lieux,
        'service',        p_service,
        'role',           p_role
      ),
      'period', 'between',
      'window_start', p_start_date,
      'window_end',   p_end_date,
      'days',         (p_end_date - p_start_date),
      'rows',         (select count(*) from filtered),
      'users',        (select count(distinct utilisateur_id) from filtered),
      'lieux',        (select coalesce(jsonb_agg(distinct lieux), '[]'::jsonb)   from filtered),
      'services',     (select coalesce(jsonb_agg(distinct service), '[]'::jsonb) from filtered),
      'roles',        (select coalesce(jsonb_agg(distinct role), '[]'::jsonb)    from filtered),
      'subtotals',    (select subtotals from subtotals_json)
    ) as meta
  )
  select
    p_start_date::date as window_start,
    p_end_date::date   as window_end,
    'between'::text    as period,
    gj.global,
    uj.users,
    mj.meta
  from global_json gj, users_json uj, meta_json mj;
$function$;

/* update_user_status() */
DROP FUNCTION IF EXISTS public.update_user_status() CASCADE;
CREATE OR REPLACE FUNCTION public.update_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  today_action text;
  today_local date := (new.date_heure at time zone 'Indian/Reunion')::date;
begin
  select b.type_action
    into today_action
  from public.appbadge_badgeages b
  where b.utilisateur_id = new.utilisateur_id
    and (b.date_heure at time zone 'Indian/Reunion')::date = today_local
  order by b.date_heure desc
  limit 1;

  if today_action = 'entrée' then
    update public.appbadge_utilisateurs set status = 'Entré' where id = new.utilisateur_id;
  elsif today_action = 'pause' then
    update public.appbadge_utilisateurs set status = 'En pause' where id = new.utilisateur_id;
  elsif today_action = 'retour' then
    update public.appbadge_utilisateurs set status = 'Entré' where id = new.utilisateur_id;
  elsif today_action = 'sortie' then
    update public.appbadge_utilisateurs set status = 'Sorti' where id = new.utilisateur_id;
  else
    update public.appbadge_utilisateurs set status = 'Non badgé' where id = new.utilisateur_id;
  end if;

  return new;
end;
$function$;

/* set_type_action() */
DROP FUNCTION IF EXISTS public.set_type_action() CASCADE;
CREATE OR REPLACE FUNCTION public.set_type_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  last_action text;
  closing_time time;
  heure_local time;
  last_badge record;
  default_end time := time '17:00';
  lieu text;
begin
  -- Normalize lieu
  lieu := coalesce(nullif(btrim(new.lieux),''),'inconnu');
  new.lieux := lieu;

  -- If type_action already provided, mirror lieu to user and exit
  if new.type_action is not null then
    update public.appbadge_utilisateurs
    set lieux = new.lieux
    where id = new.utilisateur_id;
    return new;
  end if;

  -- Local (Réunion) time
  heure_local := (new.date_heure at time zone 'Indian/Reunion')::time;

  -- Determine closing time
  if lieu = 'inconnu' then
    closing_time := default_end;
  else
    select h.heure_fin into closing_time
    from public.appbadge_horaires_standards h
    where h.lieux = lieu;
    if closing_time is null then
      closing_time := default_end;
    end if;
  end if;

  -- Last badge of the LOCAL day
  select b.type_action, b.date_heure
    into last_badge
  from public.appbadge_badgeages b
  where b.utilisateur_id = new.utilisateur_id
    and (b.date_heure at time zone 'Indian/Reunion')::date =
        (new.date_heure  at time zone 'Indian/Reunion')::date
  order by b.date_heure desc
  limit 1;

  if last_badge is null then
    new.type_action := 'entrée';
  elsif heure_local >= closing_time then
    new.type_action := 'sortie';
  else
    last_action := last_badge.type_action;
    if last_action = 'pause' then
      new.type_action := 'retour';
    elsif last_action in ('entrée','retour') then
      new.type_action := 'pause';
    else
      new.type_action := 'entrée';
    end if;
  end if;

  update public.appbadge_utilisateurs
  set lieux = new.lieux
  where id = new.utilisateur_id;

  return new;
end;
$function$;

/* http_set_curlopt(curlopt character varying, value character varying) */
DROP FUNCTION IF EXISTS public.http_set_curlopt(curlopt character varying, value character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_set_curlopt(curlopt character varying, value character varying)
RETURNS boolean
LANGUAGE c
AS '$libdir/http', $function$http_set_curlopt$function$;

/* http_reset_curlopt() */
DROP FUNCTION IF EXISTS public.http_reset_curlopt() CASCADE;
CREATE OR REPLACE FUNCTION public.http_reset_curlopt()
RETURNS boolean
LANGUAGE c
AS '$libdir/http', $function$http_reset_curlopt$function$;

/* http_list_curlopt() */
DROP FUNCTION IF EXISTS public.http_list_curlopt() CASCADE;
CREATE OR REPLACE FUNCTION public.http_list_curlopt()
RETURNS TABLE(curlopt text, value text)
LANGUAGE c
AS '$libdir/http', $function$http_list_curlopt$function$;

/* http_header(field character varying, value character varying) */
DROP FUNCTION IF EXISTS public.http_header(field character varying, value character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_header(field character varying, value character varying)
RETURNS http_header
LANGUAGE sql
AS $function$ SELECT $1, $2 $function$;

/* http(request http_request) */
DROP FUNCTION IF EXISTS public.http(request http_request) CASCADE;
CREATE OR REPLACE FUNCTION public.http(request http_request)
RETURNS http_response
LANGUAGE c
AS '$libdir/http', $function$http_request$function$;

/* http_get(uri character varying) */
DROP FUNCTION IF EXISTS public.http_get(uri character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_get(uri character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('GET', $1, NULL, NULL, NULL)::public.http_request) $function$;

/* http_post(uri character varying, content character varying, content_type character varying) */
DROP FUNCTION IF EXISTS public.http_post(uri character varying, content character varying, content_type character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_post(uri character varying, content character varying, content_type character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('POST', $1, NULL, $3, $2)::public.http_request) $function$;

/* http_put(uri character varying, content character varying, content_type character varying) */
DROP FUNCTION IF EXISTS public.http_put(uri character varying, content character varying, content_type character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_put(uri character varying, content character varying, content_type character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('PUT', $1, NULL, $3, $2)::public.http_request) $function$;

/* http_patch(uri character varying, content character varying, content_type character varying) */
DROP FUNCTION IF EXISTS public.http_patch(uri character varying, content character varying, content_type character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_patch(uri character varying, content character varying, content_type character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('PATCH', $1, NULL, $3, $2)::public.http_request) $function$;

/* http_delete(uri character varying) */
DROP FUNCTION IF EXISTS public.http_delete(uri character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_delete(uri character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('DELETE', $1, NULL, NULL, NULL)::public.http_request) $function$;

/* http_delete(uri character varying, content character varying, content_type character varying) */
DROP FUNCTION IF EXISTS public.http_delete(uri character varying, content character varying, content_type character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_delete(uri character varying, content character varying, content_type character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('DELETE', $1, NULL, $3, $2)::public.http_request) $function$;

/* http_head(uri character varying) */
DROP FUNCTION IF EXISTS public.http_head(uri character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.http_head(uri character varying)
RETURNS http_response
LANGUAGE sql
AS $function$ SELECT public.http(('HEAD', $1, NULL, NULL, NULL)::public.http_request) $function$;

/* urlencode(string character varying) */
DROP FUNCTION IF EXISTS public.urlencode(string character varying) CASCADE;
CREATE OR REPLACE FUNCTION public.urlencode(string character varying)
RETURNS text
LANGUAGE c
IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode$function$;

/* urlencode(string bytea) */
DROP FUNCTION IF EXISTS public.urlencode(string bytea) CASCADE;
CREATE OR REPLACE FUNCTION public.urlencode(string bytea)
RETURNS text
LANGUAGE c
IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode$function$;

/* urlencode(data jsonb) */
DROP FUNCTION IF EXISTS public.urlencode(data jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.urlencode(data jsonb)
RETURNS text
LANGUAGE c
IMMUTABLE STRICT
AS '$libdir/http', $function$urlencode_jsonb$function$;

/* http_get(uri character varying, data jsonb) */
DROP FUNCTION IF EXISTS public.http_get(uri character varying, data jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.http_get(uri character varying, data jsonb)
RETURNS http_response
LANGUAGE sql
AS $function$
  SELECT public.http(('GET', $1 || '?' || public.urlencode($2), NULL, NULL, NULL)::public.http_request)
$function$;

/* http_post(uri character varying, data jsonb) */
DROP FUNCTION IF EXISTS public.http_post(uri character varying, data jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.http_post(uri character varying, data jsonb)
RETURNS http_response
LANGUAGE sql
AS $function$
  SELECT public.http(('POST', $1, NULL, 'application/x-www-form-urlencoded', public.urlencode($2))::public.http_request)
$function$;

/* text_to_bytea(data text) */
DROP FUNCTION IF EXISTS public.text_to_bytea(data text) CASCADE;
CREATE OR REPLACE FUNCTION public.text_to_bytea(data text)
RETURNS bytea
LANGUAGE c
IMMUTABLE STRICT
AS '$libdir/http', $function$text_to_bytea$function$;

/* bytea_to_text(data bytea) */
DROP FUNCTION IF EXISTS public.bytea_to_text(data bytea) CASCADE;
CREATE OR REPLACE FUNCTION public.bytea_to_text(data bytea)
RETURNS text
LANGUAGE c
IMMUTABLE STRICT
AS '$libdir/http', $function$bytea_to_text$function$;

/* reset_lieux_utilisateurs() */
DROP FUNCTION IF EXISTS public.reset_lieux_utilisateurs() CASCADE;
CREATE OR REPLACE FUNCTION public.reset_lieux_utilisateurs()
RETURNS void
LANGUAGE plpgsql
AS $function$
begin
  update public.appbadge_utilisateurs
  set lieux = null;
end;
$function$;

/* appbadge_kpi_global_iso_week(p_iso_year integer, p_iso_week integer) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_global_iso_week(p_iso_year integer, p_iso_week integer) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_global_iso_week(p_iso_year integer, p_iso_week integer)
RETURNS TABLE(travail_total_minutes bigint, pause_total_minutes bigint, travail_net_minutes bigint, retard_minutes bigint, depart_anticipe_minutes bigint)
LANGUAGE sql
STABLE
AS $function$
  select *
  from public.appbadge_kpi_global(
    to_date(p_iso_year || '-' || p_iso_week || '-1', 'IYYY-IW-ID')::date,
    'week'::text
  );
$function$;

/* anonymize_geo_badgeages() */
DROP FUNCTION IF EXISTS public.anonymize_geo_badgeages() CASCADE;
CREATE OR REPLACE FUNCTION public.anonymize_geo_badgeages()
RETURNS void
LANGUAGE plpgsql
AS $function$
begin
  update public.appbadge_badgeages
  set latitude = null,
      longitude = null
  where date_heure < now() - interval '21 days'
    and (latitude is not null or longitude is not null);
end;
$function$;

/* appbadge_kpi_bundle_iso_week(...) */
DROP FUNCTION IF EXISTS public.appbadge_kpi_bundle_iso_week(p_iso_year integer, p_iso_week integer, p_utilisateur_id uuid, p_lieux text, p_service text, p_role text) CASCADE;
CREATE OR REPLACE FUNCTION public.appbadge_kpi_bundle_iso_week(
  p_iso_year integer, p_iso_week integer,
  p_utilisateur_id uuid DEFAULT NULL::uuid,
  p_lieux text DEFAULT NULL::text,
  p_service text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text
)
RETURNS TABLE(window_start date, window_end date, period text, global jsonb, users jsonb, meta jsonb)
LANGUAGE sql
STABLE
AS $function$
  select * from public.appbadge_kpi_bundle(
    to_date(p_iso_year || '-' || p_iso_week || '-1', 'IYYY-IW-ID')::date,
    'week'::text,
    p_utilisateur_id, p_lieux, p_service, p_role
  );
$function$;

/* autoswitch_pause_to_sortie(threshold_minutes integer) */
DROP FUNCTION IF EXISTS public.autoswitch_pause_to_sortie(threshold_minutes integer) CASCADE;
CREATE OR REPLACE FUNCTION public.autoswitch_pause_to_sortie(threshold_minutes integer DEFAULT 30)
RETURNS TABLE(updated_badgeages integer, updated_users integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  now_reu timestamp without time zone := (now() at time zone 'Indian/Reunion');
begin
  with last_badge as (
    select distinct on (b.utilisateur_id)
      b.id as last_badge_id,
      b.utilisateur_id,
      b.type_action as last_type,
      b.lieux as last_lieux,
      (b.date_heure::timestamp at time zone 'Indian/Reunion') as last_ts_reunion
    from public.appbadge_badgeages b
    order by b.utilisateur_id, b.date_heure desc
  ),
  base as (
    select
      u.id as utilisateur_id,
      u.status as user_status,
      lb.last_badge_id,
      lb.last_type,
      coalesce(lb.last_lieux, u.lieux) as lieux_ref,
      hs.heure_fin,
      (date_trunc('day', now_reu) + hs.heure_fin) as fin_theorique_reunion,
      (date_trunc('day', now_reu) + hs.heure_fin) - now_reu as delta_run_fin
    from public.appbadge_utilisateurs u
    left join last_badge lb on lb.utilisateur_id = u.id
    left join public.appbadge_horaires_standards hs
      on hs.lieux = coalesce(lb.last_lieux, u.lieux)
    where hs.heure_fin is not null
  ),
  proches as (
    select * from base
    where delta_run_fin between interval '0 minutes' and make_interval(mins => threshold_minutes)
      and (last_type = 'pause' or user_status = 'En pause')
  ),
  upd_badge as (
    update public.appbadge_badgeages b
       set type_action = 'sortie'
     where b.id in (select last_badge_id from proches where last_type = 'pause')
    returning 1
  ),
  upd_user as (
    update public.appbadge_utilisateurs u
       set status = 'Sorti'
     where u.id in (select utilisateur_id from proches where user_status = 'En pause')
    returning 1
  )
  select (select count(*) from upd_badge), (select count(*) from upd_user)
    into updated_badgeages, updated_users;

  return next;
end;
$function$;

/* check_code_in_history() */
DROP FUNCTION IF EXISTS public.check_code_in_history() CASCADE;
CREATE OR REPLACE FUNCTION public.check_code_in_history()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  badge_history text[];
begin
  select b.numero_badge_history
    into badge_history
  from public.appbadge_badges b
  where b.utilisateur_id = new.utilisateur_id
    and b.actif = true
  order by b.date_attribution desc
  limit 1;

  if badge_history is null or not (new.code = any (badge_history)) then
    raise exception 'Code % is not in the last badge history for user %', new.code, new.utilisateur_id
      using hint = 'Use an active badge code assigned to the user.';
  end if;

  return new;
end;
$function$;

-- =====================================================================
-- ======================= TRIGGERS (public) ===========================
-- =====================================================================

/* public.appbadge_session_modifs :: trg_appbadge_session_modifs_check_biub */
DROP TRIGGER IF EXISTS trg_appbadge_session_modifs_check_biub ON public.appbadge_session_modifs CASCADE;
CREATE TRIGGER trg_appbadge_session_modifs_check_biub
BEFORE INSERT OR UPDATE ON public.appbadge_session_modifs
FOR EACH ROW
EXECUTE FUNCTION public.appbadge_session_modifs_check();

/* public.appbadge_session_modif_validations :: trg_appbadge_session_modif_validations_check_bi */
DROP TRIGGER IF EXISTS trg_appbadge_session_modif_validations_check_bi ON public.appbadge_session_modif_validations CASCADE;
CREATE TRIGGER trg_appbadge_session_modif_validations_check_bi
BEFORE INSERT ON public.appbadge_session_modif_validations
FOR EACH ROW
EXECUTE FUNCTION public.appbadge_session_modif_validations_check();

/* public.appbadge_badgeages :: trg_check_code_history */
DROP TRIGGER IF EXISTS trg_check_code_history ON public.appbadge_badgeages CASCADE;
CREATE TRIGGER trg_check_code_history
BEFORE INSERT ON public.appbadge_badgeages
FOR EACH ROW
EXECUTE FUNCTION public.check_code_in_history();

/* public.appbadge_badgeages :: trg_update_user_status */
DROP TRIGGER IF EXISTS trg_update_user_status ON public.appbadge_badgeages CASCADE;
CREATE TRIGGER trg_update_user_status
AFTER INSERT ON public.appbadge_badgeages
FOR EACH ROW
EXECUTE FUNCTION public.update_user_status();

/* public.appbadge_badgeages :: trg_set_type_action */
DROP TRIGGER IF EXISTS trg_set_type_action ON public.appbadge_badgeages CASCADE;
CREATE TRIGGER trg_set_type_action
BEFORE INSERT ON public.appbadge_badgeages
FOR EACH ROW
EXECUTE FUNCTION public.set_type_action();

/* public.appbadge_utilisateurs :: tg_notifier_mise_a_jour_utilisateur */
DROP TRIGGER IF EXISTS tg_notifier_mise_a_jour_utilisateur ON public.appbadge_utilisateurs CASCADE;
CREATE TRIGGER tg_notifier_mise_a_jour_utilisateur
AFTER UPDATE ON public.appbadge_utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.notifier_mise_a_jour_utilisateur();

-- =====================================================================
-- ========================= PG_CRON JOBS ==============================
-- =====================================================================
-- Note: requires pg_cron extension to be installed and active.

/* job 1 :: badge_codes_every_minute */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'badge_codes_every_minute')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'badge_codes_every_minute'))
       END;
SELECT cron.schedule('badge_codes_every_minute', '*/1 * * * *', 'select public.update_badge_codes();');

/* job 2 :: reset user statuses */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset user statuses')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'reset user statuses'))
       END;
SELECT cron.schedule('reset user statuses', '0 0 * * *', ' select reset_user_status(); ');

/* job 4 :: cleanup_old_badgeages_job */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_old_badgeages_job')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'cleanup_old_badgeages_job'))
       END;
SELECT cron.schedule('cleanup_old_badgeages_job', '0 2 * * *', 'select cleanup_old_badgeages();');

/* job 5 :: job_anonymize_geo_badgeages */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job_anonymize_geo_badgeages')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'job_anonymize_geo_badgeages'))
       END;
SELECT cron.schedule('job_anonymize_geo_badgeages', '30 2 * * *', 'select public.anonymize_geo_badgeages();');

/* job 6 :: autoswitch_pause_to_sortie_14_18 */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'autoswitch_pause_to_sortie_14_18')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'autoswitch_pause_to_sortie_14_18'))
       END;
SELECT cron.schedule('autoswitch_pause_to_sortie_14_18', '*/30 14-18 * * *', 'select public.autoswitch_pause_to_sortie(30);');

/* job 3 :: reset_lieux_midnight */
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset_lieux_midnight')
         THEN cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'reset_lieux_midnight'))
       END;
SELECT cron.schedule('reset_lieux_midnight', '0 0 * * *', 'SELECT public.reset_lieux_utilisateurs();');

-- ---------------------------------------------------------------------
-- Migration: Add contract hours per week column to users table
-- ---------------------------------------------------------------------
ALTER TABLE public.appbadge_utilisateurs 
ADD COLUMN IF NOT EXISTS heures_contractuelles_semaine numeric DEFAULT 35.0;

ALTER TABLE public.appbadge_utilisateurs
ADD CONSTRAINT IF NOT EXISTS appbadge_utilisateurs_heures_contractuelles_check 
CHECK (heures_contractuelles_semaine > 0 AND heures_contractuelles_semaine <= 60);

-- Update existing users without contract hours to default 35h
UPDATE public.appbadge_utilisateurs 
SET heures_contractuelles_semaine = 35.0 
WHERE heures_contractuelles_semaine IS NULL;

-- End of file
COMMIT;
-- End of monolithic installer
