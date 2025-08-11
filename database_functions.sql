-- =====================================================
-- FONCTIONS SQL POUR LE DASHBOARD BADGEUSE OTI
-- =====================================================

-- Configuration de la timezone pour les calculs
SET timezone = 'Indian/Reunion';

-- =====================================================
-- FONCTION PRINCIPALE: appbadge_kpi_bundle (générique)
-- Retourne tous les KPIs pour une période donnée avec filtres
-- =====================================================
CREATE OR REPLACE FUNCTION appbadge_kpi_bundle(
    p_start_date DATE, 
    p_period TEXT, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    window_start DATE,
    window_end DATE,
    period TEXT,
    global JSONB,
    users JSONB,
    meta JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_period_type TEXT;
BEGIN
    -- Calcul des dates selon la période
    CASE p_period
        WHEN 'week' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '7 days';
            v_period_type := 'week';
        WHEN 'month' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 month';
            v_period_type := 'month';
        WHEN 'year' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 year';
            v_period_type := 'year';
        ELSE
            RAISE EXCEPTION 'Période invalide. Utilisez: week, month, year';
    END CASE;
    
    RETURN QUERY
    WITH kpi_data AS (
        SELECT 
            u.id as utilisateur_id,
            u.nom,
            u.prenom,
            u.service,
            u.lieux,
            u.role,
            -- Calcul du travail total en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_total_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail total - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                ELSE 0
            END as retard_minutes,
            -- Calcul du départ anticipé en minutes
            CASE 
                WHEN b.heure_depart IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                ELSE 0
            END as depart_anticipe_minutes
        FROM appbadge_utilisateurs u
        LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
            AND b.jour_local >= v_start_date AND b.jour_local < v_end_date
        WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
            AND (p_lieux IS NULL OR u.lieux = p_lieux)
            AND (p_service IS NULL OR u.service = p_service)
            AND (p_role IS NULL OR u.role = p_role)
    ),
    global_kpis AS (
        SELECT 
            COALESCE(SUM(travail_total_minutes), 0) as travail_total_minutes,
            COALESCE(SUM(pause_total_minutes), 0) as pause_total_minutes,
            COALESCE(SUM(travail_net_minutes), 0) as travail_net_minutes,
            COALESCE(SUM(retard_minutes), 0) as retard_minutes,
            COALESCE(SUM(depart_anticipe_minutes), 0) as depart_anticipe_minutes
        FROM kpi_data
    ),
    users_kpis AS (
        SELECT 
            utilisateur_id,
            nom,
            prenom,
            lieux,
            service,
            role,
            COALESCE(SUM(travail_total_minutes), 0) as travail_total_minutes,
            COALESCE(SUM(pause_total_minutes), 0) as pause_total_minutes,
            COALESCE(SUM(travail_net_minutes), 0) as travail_net_minutes,
            COALESCE(SUM(retard_minutes), 0) as retard_minutes,
            COALESCE(SUM(depart_anticipe_minutes), 0) as depart_anticipe_minutes
        FROM kpi_data
        GROUP BY utilisateur_id, nom, prenom, lieux, service, role
    ),
    meta_data AS (
        SELECT 
            jsonb_build_object(
                'filters', jsonb_build_object(
                    'utilisateur_id', p_utilisateur_id,
                    'lieux', p_lieux,
                    'service', p_service,
                    'role', p_role
                ),
                'days', EXTRACT(EPOCH FROM (v_end_date - v_start_date)) / 86400,
                'rows', (SELECT COUNT(*) FROM kpi_data),
                'users', (SELECT COUNT(DISTINCT utilisateur_id) FROM kpi_data),
                'services', (SELECT jsonb_agg(DISTINCT service) FROM kpi_data WHERE service IS NOT NULL),
                'lieux', (SELECT jsonb_agg(DISTINCT lieux) FROM kpi_data WHERE lieux IS NOT NULL),
                'roles', (SELECT jsonb_agg(DISTINCT role) FROM kpi_data WHERE role IS NOT NULL),
                'subtotals', jsonb_build_object(
                    'by_service', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'service', service,
                                'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                                'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                                'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                            )
                        )
                        FROM kpi_data 
                        WHERE service IS NOT NULL 
                        GROUP BY service
                    ),
                    'by_lieux', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'lieux', lieux,
                                'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                                'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                                'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                            )
                        )
                        FROM kpi_data 
                        WHERE lieux IS NOT NULL 
                        GROUP BY lieux
                    ),
                    'by_role', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'role', role,
                                'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                                'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                                'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                            )
                        )
                        FROM kpi_data 
                        WHERE role IS NOT NULL 
                        GROUP BY role
                    )
                )
            ) as meta
    )
    SELECT 
        v_start_date::DATE as window_start,
        v_end_date::DATE as window_end,
        v_period_type as period,
        (SELECT row_to_json(gk)::jsonb FROM global_kpis gk) as global,
        (SELECT jsonb_agg(row_to_json(uk)::jsonb) FROM users_kpis uk) as users,
        (SELECT meta FROM meta_data) as meta;
END;
$$;

-- =====================================================
-- FONCTION HELPER: appbadge_kpi_bundle_iso_week
-- =====================================================
CREATE OR REPLACE FUNCTION appbadge_kpi_bundle_iso_week(
    p_iso_year INTEGER, 
    p_iso_week INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    window_start DATE,
    window_end DATE,
    period TEXT,
    global JSONB,
    users JSONB,
    meta JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
BEGIN
    -- Calcul du lundi de la semaine ISO
    v_start_date := (DATE(p_iso_year || '-01-01') + (p_iso_week - 1) * INTERVAL '7 days')::DATE;
    v_start_date := v_start_date + (1 - EXTRACT(DOW FROM v_start_date))::INTEGER;
    
    RETURN QUERY
    SELECT * FROM appbadge_kpi_bundle(
        v_start_date,
        'week',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- =====================================================
-- FONCTION HELPER: appbadge_kpi_bundle_month
-- =====================================================
CREATE OR REPLACE FUNCTION appbadge_kpi_bundle_month(
    p_year INTEGER, 
    p_month INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    window_start DATE,
    window_end DATE,
    period TEXT,
    global JSONB,
    users JSONB,
    meta JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_bundle(
        DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01'),
        'month',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- =====================================================
-- FONCTION HELPER: appbadge_kpi_bundle_year
-- =====================================================
CREATE OR REPLACE FUNCTION appbadge_kpi_bundle_year(
    p_year INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    window_start DATE,
    window_end DATE,
    period TEXT,
    global JSONB,
    users JSONB,
    meta JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_bundle(
        DATE(p_year || '-01-01'),
        'year',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- =====================================================
-- FONCTION HELPER: appbadge_kpi_bundle_between
-- =====================================================
CREATE OR REPLACE FUNCTION appbadge_kpi_bundle_between(
    p_start_date DATE, 
    p_end_date DATE, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    window_start DATE,
    window_end DATE,
    period TEXT,
    global JSONB,
    users JSONB,
    meta JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_start_date as window_start,
        p_end_date as window_end,
        'between' as period,
        (SELECT row_to_json(gk)::jsonb FROM (
            SELECT 
                COALESCE(SUM(travail_total_minutes), 0) as travail_total_minutes,
                COALESCE(SUM(pause_total_minutes), 0) as pause_total_minutes,
                COALESCE(SUM(travail_net_minutes), 0) as travail_net_minutes,
                COALESCE(SUM(retard_minutes), 0) as retard_minutes,
                COALESCE(SUM(depart_anticipe_minutes), 0) as depart_anticipe_minutes
            FROM (
                SELECT 
                    u.id as utilisateur_id,
                    -- Calcul du travail total en minutes
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                        ELSE 0
                    END as travail_total_minutes,
                    -- Calcul des pauses en minutes
                    COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
                    -- Calcul du travail net (travail total - pauses)
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                        ELSE 0
                    END as travail_net_minutes,
                    -- Calcul du retard en minutes
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL THEN
                            GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                        ELSE 0
                    END as retard_minutes,
                    -- Calcul du départ anticipé en minutes
                    CASE 
                        WHEN b.heure_depart IS NOT NULL THEN
                            GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                        ELSE 0
                    END as depart_anticipe_minutes
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
            ) kpi_data
        ) gk) as global,
        (SELECT jsonb_agg(row_to_json(uk)::jsonb) FROM (
            SELECT 
                utilisateur_id,
                nom,
                prenom,
                lieux,
                service,
                role,
                COALESCE(SUM(travail_total_minutes), 0) as travail_total_minutes,
                COALESCE(SUM(pause_total_minutes), 0) as pause_total_minutes,
                COALESCE(SUM(travail_net_minutes), 0) as travail_net_minutes,
                COALESCE(SUM(retard_minutes), 0) as retard_minutes,
                COALESCE(SUM(depart_anticipe_minutes), 0) as depart_anticipe_minutes
            FROM (
                SELECT 
                    u.id as utilisateur_id,
                    u.nom,
                    u.prenom,
                    u.service,
                    u.lieux,
                    u.role,
                    -- Calcul du travail total en minutes
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                        ELSE 0
                    END as travail_total_minutes,
                    -- Calcul des pauses en minutes
                    COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
                    -- Calcul du travail net (travail total - pauses)
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                        ELSE 0
                    END as travail_net_minutes,
                    -- Calcul du retard en minutes
                    CASE 
                        WHEN b.heure_arrivee IS NOT NULL THEN
                            GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                        ELSE 0
                    END as retard_minutes,
                    -- Calcul du départ anticipé en minutes
                    CASE 
                        WHEN b.heure_depart IS NOT NULL THEN
                            GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                        ELSE 0
                    END as depart_anticipe_minutes
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
            ) kpi_data
            GROUP BY utilisateur_id, nom, prenom, lieux, service, role
        ) uk) as users,
        jsonb_build_object(
            'filters', jsonb_build_object(
                'utilisateur_id', p_utilisateur_id,
                'lieux', p_lieux,
                'service', p_service,
                'role', p_role
            ),
            'days', EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400,
            'rows', (SELECT COUNT(*) FROM (
                SELECT 
                    u.id as utilisateur_id
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
            ) kpi_data),
            'users', (SELECT COUNT(DISTINCT utilisateur_id) FROM (
                SELECT 
                    u.id as utilisateur_id
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
            ) kpi_data),
            'services', (SELECT jsonb_agg(DISTINCT service) FROM (
                SELECT 
                    u.service
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
                    AND u.service IS NOT NULL
            ) kpi_data),
            'lieux', (SELECT jsonb_agg(DISTINCT lieux) FROM (
                SELECT 
                    u.lieux
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
                    AND u.lieux IS NOT NULL
            ) kpi_data),
            'roles', (SELECT jsonb_agg(DISTINCT role) FROM (
                SELECT 
                    u.role
                FROM appbadge_utilisateurs u
                LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                    AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                    AND (p_lieux IS NULL OR u.lieux = p_lieux)
                    AND (p_service IS NULL OR u.service = p_service)
                    AND (p_role IS NULL OR u.role = p_role)
                    AND u.role IS NOT NULL
            ) kpi_data),
            'subtotals', jsonb_build_object(
                'by_service', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'service', service,
                            'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                            'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                            'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                        )
                    )
                    FROM (
                        SELECT 
                            u.service,
                            -- Calcul du travail net (travail total - pauses)
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                                ELSE 0
                            END as travail_net_minutes,
                            -- Calcul du retard en minutes
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                                ELSE 0
                            END as retard_minutes,
                            -- Calcul du départ anticipé en minutes
                            CASE 
                                WHEN b.heure_depart IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                                ELSE 0
                            END as depart_anticipe_minutes
                        FROM appbadge_utilisateurs u
                        LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                            AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                        WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                            AND (p_lieux IS NULL OR u.lieux = p_lieux)
                            AND (p_service IS NULL OR u.service = p_service)
                            AND (p_role IS NULL OR u.role = p_role)
                            AND u.service IS NOT NULL
                    ) kpi_data 
                    GROUP BY service
                ),
                'by_lieux', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'lieux', lieux,
                            'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                            'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                            'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                        )
                    )
                    FROM (
                        SELECT 
                            u.lieux,
                            -- Calcul du travail net (travail total - pauses)
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                                ELSE 0
                            END as travail_net_minutes,
                            -- Calcul du retard en minutes
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                                ELSE 0
                            END as retard_minutes,
                            -- Calcul du départ anticipé en minutes
                            CASE 
                                WHEN b.heure_depart IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                                ELSE 0
                            END as depart_anticipe_minutes
                        FROM appbadge_utilisateurs u
                        LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                            AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                        WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                            AND (p_lieux IS NULL OR u.lieux = p_lieux)
                            AND (p_service IS NULL OR u.service = p_service)
                            AND (p_role IS NULL OR u.role = p_role)
                            AND u.lieux IS NOT NULL
                    ) kpi_data 
                    GROUP BY lieux
                ),
                'by_role', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'role', role,
                            'travail_net_minutes', COALESCE(SUM(travail_net_minutes), 0),
                            'retard_minutes', COALESCE(SUM(retard_minutes), 0),
                            'depart_anticipe_minutes', COALESCE(SUM(depart_anticipe_minutes), 0)
                        )
                    )
                    FROM (
                        SELECT 
                            u.role,
                            -- Calcul du travail net (travail total - pauses)
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                                ELSE 0
                            END as travail_net_minutes,
                            -- Calcul du retard en minutes
                            CASE 
                                WHEN b.heure_arrivee IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                                ELSE 0
                            END as retard_minutes,
                            -- Calcul du départ anticipé en minutes
                            CASE 
                                WHEN b.heure_depart IS NOT NULL THEN
                                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                                ELSE 0
                            END as depart_anticipe_minutes
                        FROM appbadge_utilisateurs u
                        LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
                            AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
                        WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
                            AND (p_lieux IS NULL OR u.lieux = p_lieux)
                            AND (p_service IS NULL OR u.service = p_service)
                            AND (p_role IS NULL OR u.role = p_role)
                            AND u.role IS NOT NULL
                    ) kpi_data 
                    GROUP BY role
                )
            )
        ) as meta;
END;
$$;

-- =====================================================
-- FONCTIONS GLOBALES (sans détails utilisateurs)
-- =====================================================

-- FONCTION: appbadge_kpi_global
CREATE OR REPLACE FUNCTION appbadge_kpi_global(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH kpi_data AS (
        SELECT 
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_badges b
        WHERE b.jour_local = p_date
    )
    SELECT jsonb_build_object(
        'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
        'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
        'total_utilisateurs', COUNT(*),
        'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
        'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
        'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
        'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0),
        'date', p_date,
        'fonction_appelee', 'appbadge_kpi_global'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- FONCTION: appbadge_kpi_global_year
CREATE OR REPLACE FUNCTION appbadge_kpi_global_year(p_annee INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH kpi_data AS (
        SELECT 
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_badges b
        WHERE EXTRACT(YEAR FROM b.jour_local) = p_annee
    )
    SELECT jsonb_build_object(
        'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
        'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
        'total_utilisateurs', COUNT(*),
        'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
        'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
        'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
        'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0),
        'annee', p_annee,
        'fonction_appelee', 'appbadge_kpi_global_year'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- FONCTION: appbadge_kpi_global_month
CREATE OR REPLACE FUNCTION appbadge_kpi_global_month(p_annee INTEGER, p_mois INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH kpi_data AS (
        SELECT 
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_badges b
        WHERE EXTRACT(YEAR FROM b.jour_local) = p_annee 
            AND EXTRACT(MONTH FROM b.jour_local) = p_mois
    )
    SELECT jsonb_build_object(
        'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
        'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
        'total_utilisateurs', COUNT(*),
        'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
        'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
        'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
        'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0),
        'annee', p_annee,
        'mois', p_mois,
        'fonction_appelee', 'appbadge_kpi_global_month'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- FONCTION: appbadge_kpi_global_iso_week
CREATE OR REPLACE FUNCTION appbadge_kpi_global_iso_week(p_annee INTEGER, p_semaine_iso INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_result JSONB;
BEGIN
    -- Calcul des dates de début et fin de la semaine ISO
    v_start_date := (DATE(p_annee || '-01-01') + (p_semaine_iso - 1) * INTERVAL '7 days')::DATE;
    -- Ajuster au lundi de la semaine
    v_start_date := v_start_date + (1 - EXTRACT(DOW FROM v_start_date))::INTEGER;
    v_end_date := v_start_date + INTERVAL '7 days';
    
    WITH kpi_data AS (
        SELECT 
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_badges b
        WHERE b.jour_local >= v_start_date AND b.jour_local < v_end_date
    )
    SELECT jsonb_build_object(
        'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
        'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
        'total_utilisateurs', COUNT(*),
        'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
        'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
        'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
        'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0),
        'annee', p_annee,
        'semaine_iso', p_semaine_iso,
        'date_debut', v_start_date,
        'date_fin', v_end_date,
        'fonction_appelee', 'appbadge_kpi_global_iso_week'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- FONCTION: appbadge_kpi_global_between
CREATE OR REPLACE FUNCTION appbadge_kpi_global_between(p_date_debut DATE, p_date_fin DATE)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH kpi_data AS (
        SELECT 
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_badges b
        WHERE b.jour_local >= p_date_debut AND b.jour_local < p_date_fin
    )
    SELECT jsonb_build_object(
        'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
        'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
        'total_utilisateurs', COUNT(*),
        'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
        'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
        'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
        'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0),
        'date_debut', p_date_debut,
        'date_fin', p_date_fin,
        'fonction_appelee', 'appbadge_kpi_global_between'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- FONCTIONS DE FILTRAGE (avec paramètres de filtrage)
-- =====================================================

-- FONCTION: appbadge_kpi_filtres
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres(
    p_date DATE,
    p_service TEXT DEFAULT NULL,
    p_lieux TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH kpi_data AS (
        SELECT 
            u.id as utilisateur_id,
            u.nom,
            u.prenom,
            u.service,
            u.lieux,
            u.role,
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60
                ELSE 0
            END as retard_minutes,
            -- Calcul du travail net en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_brut_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail brut - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Statut de l'utilisateur
            b.statut
        FROM appbadge_utilisateurs u
        LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
            AND b.jour_local = p_date
        WHERE (p_service IS NULL OR u.service = p_service)
            AND (p_lieux IS NULL OR u.lieux = p_lieux)
            AND (p_role IS NULL OR u.role = p_role)
    )
    SELECT jsonb_build_object(
        'global', (
            SELECT jsonb_build_object(
                'retard_cumule_minutes', COALESCE(SUM(retard_minutes), 0),
                'travail_net_moyen_minutes', COALESCE(AVG(travail_net_minutes), 0),
                'total_utilisateurs', COUNT(*),
                'utilisateurs_presents', COUNT(*) FILTER (WHERE statut IS NOT NULL),
                'utilisateurs_absents', COUNT(*) FILTER (WHERE statut IS NULL),
                'utilisateurs_en_pause', COUNT(*) FILTER (WHERE statut = 'En pause'),
                'total_pause_minutes', COALESCE(SUM(pause_total_minutes), 0)
            )
            FROM kpi_data
        ),
        'utilisateurs', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'utilisateur_id', utilisateur_id,
                    'nom', nom,
                    'prenom', prenom,
                    'service', service,
                    'lieux', lieux,
                    'role', role,
                    'retard_minutes', retard_minutes,
                    'travail_brut_minutes', travail_brut_minutes,
                    'travail_net_minutes', travail_net_minutes,
                    'pause_total_minutes', pause_total_minutes,
                    'statut', statut
                )
            )
            FROM kpi_data
        ),
        'metadata', jsonb_build_object(
            'date', p_date,
            'filtres_appliques', jsonb_build_object(
                'service', p_service,
                'lieux', p_lieux,
                'role', p_role
            ),
            'fonction_appelee', 'appbadge_kpi_filtres'
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- FONCTIONS KPIs GLOBAUX AVEC FILTRES (sans group by user)
-- =====================================================

-- FONCTION: appbadge_kpi_global_filtres (générique)
CREATE OR REPLACE FUNCTION appbadge_kpi_global_filtres(
    p_start_date DATE, 
    p_period TEXT, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calcul des dates selon la période
    CASE p_period
        WHEN 'week' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '7 days';
        WHEN 'month' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 month';
        WHEN 'year' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Période invalide. Utilisez: week, month, year';
    END CASE;
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(travail_total_minutes), 0)::BIGINT as travail_total_minutes,
        COALESCE(SUM(pause_total_minutes), 0)::BIGINT as pause_total_minutes,
        COALESCE(SUM(travail_net_minutes), 0)::BIGINT as travail_net_minutes,
        COALESCE(SUM(retard_minutes), 0)::BIGINT as retard_minutes,
        COALESCE(SUM(depart_anticipe_minutes), 0)::BIGINT as depart_anticipe_minutes
    FROM (
        SELECT 
            -- Calcul du travail total en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_total_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail total - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                ELSE 0
            END as retard_minutes,
            -- Calcul du départ anticipé en minutes
            CASE 
                WHEN b.heure_depart IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                ELSE 0
            END as depart_anticipe_minutes
        FROM appbadge_badges b
        JOIN appbadge_utilisateurs u ON b.utilisateur_id = u.id
        WHERE b.jour_local >= v_start_date AND b.jour_local < v_end_date
            AND (p_lieux IS NULL OR u.lieux = p_lieux)
            AND (p_service IS NULL OR u.service = p_service)
            AND (p_role IS NULL OR u.role = p_role)
    ) kpi_data;
END;
$$;

-- FONCTION HELPER: appbadge_kpi_global_filtres_year
CREATE OR REPLACE FUNCTION appbadge_kpi_global_filtres_year(
    p_year INTEGER, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_global_filtres(
        DATE(p_year || '-01-01'),
        'year',
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_global_filtres_month
CREATE OR REPLACE FUNCTION appbadge_kpi_global_filtres_month(
    p_year INTEGER, 
    p_month INTEGER, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_global_filtres(
        DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01'),
        'month',
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_global_filtres_iso_week
CREATE OR REPLACE FUNCTION appbadge_kpi_global_filtres_iso_week(
    p_iso_year INTEGER, 
    p_iso_week INTEGER, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
BEGIN
    -- Calcul du lundi de la semaine ISO
    v_start_date := (DATE(p_iso_year || '-01-01') + (p_iso_week - 1) * INTERVAL '7 days')::DATE;
    v_start_date := v_start_date + (1 - EXTRACT(DOW FROM v_start_date))::INTEGER;
    
    RETURN QUERY
    SELECT * FROM appbadge_kpi_global_filtres(
        v_start_date,
        'week',
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_global_filtres_between
CREATE OR REPLACE FUNCTION appbadge_kpi_global_filtres_between(
    p_start_date DATE, 
    p_end_date DATE, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(travail_total_minutes), 0)::BIGINT as travail_total_minutes,
        COALESCE(SUM(pause_total_minutes), 0)::BIGINT as pause_total_minutes,
        COALESCE(SUM(travail_net_minutes), 0)::BIGINT as travail_net_minutes,
        COALESCE(SUM(retard_minutes), 0)::BIGINT as retard_minutes,
        COALESCE(SUM(depart_anticipe_minutes), 0)::BIGINT as depart_anticipe_minutes
    FROM (
        SELECT 
            -- Calcul du travail total en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60
                ELSE 0
            END as travail_total_minutes,
            -- Calcul des pauses en minutes
            COALESCE(b.pause_total_minutes, 0) as pause_total_minutes,
            -- Calcul du travail net (travail total - pauses)
            CASE 
                WHEN b.heure_arrivee IS NOT NULL AND b.heure_depart IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (b.heure_depart - b.heure_arrivee)) / 60 - COALESCE(b.pause_total_minutes, 0)
                ELSE 0
            END as travail_net_minutes,
            -- Calcul du retard en minutes
            CASE 
                WHEN b.heure_arrivee IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_arrivee - b.heure_horaire)) / 60, 0)
                ELSE 0
            END as retard_minutes,
            -- Calcul du départ anticipé en minutes
            CASE 
                WHEN b.heure_depart IS NOT NULL THEN
                    GREATEST(EXTRACT(EPOCH FROM (b.heure_horaire_fin - b.heure_depart)) / 60, 0)
                ELSE 0
            END as depart_anticipe_minutes
        FROM appbadge_badges b
        JOIN appbadge_utilisateurs u ON b.utilisateur_id = u.id
        WHERE b.jour_local >= p_start_date AND b.jour_local < p_end_date
            AND (p_lieux IS NULL OR u.lieux = p_lieux)
            AND (p_service IS NULL OR u.service = p_service)
            AND (p_role IS NULL OR u.role = p_role)
    ) kpi_data;
END;
$$;

-- =====================================================
-- FONCTIONS KPIs PAR UTILISATEUR AVEC FILTRES (groupé par user)
-- =====================================================

-- FONCTION: appbadge_kpi_filtres (générique)
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres(
    p_start_date DATE, 
    p_period TEXT, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calcul des dates selon la période
    CASE p_period
        WHEN 'week' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '7 days';
        WHEN 'month' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 month';
        WHEN 'year' THEN
            v_start_date := p_start_date;
            v_end_date := p_start_date + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Période invalide. Utilisez: week, month, year';
    END CASE;
    
    RETURN QUERY
    SELECT 
        u.id as utilisateur_id,
        u.nom,
        u.prenom,
        u.lieux,
        u.service,
        u.role,
        COALESCE(SUM(travail_total_minutes), 0)::BIGINT as travail_total_minutes,
        COALESCE(SUM(pause_total_minutes), 0)::BIGINT as pause_total_minutes,
        COALESCE(SUM(travail_net_minutes), 0)::BIGINT as travail_net_minutes,
        COALESCE(SUM(retard_minutes), 0)::BIGINT as retard_minutes,
        COALESCE(SUM(depart_anticipe_minutes), 0)::BIGINT as depart_anticipe_minutes
    FROM appbadge_utilisateurs u
    LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
        AND b.jour_local >= v_start_date AND b.jour_local < v_end_date
    WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
        AND (p_lieux IS NULL OR u.lieux = p_lieux)
        AND (p_service IS NULL OR u.service = p_service)
        AND (p_role IS NULL OR u.role = p_role)
    GROUP BY u.id, u.nom, u.prenom, u.lieux, u.service, u.role
    ORDER BY travail_net_minutes DESC;
END;
$$;

-- FONCTION HELPER: appbadge_kpi_filtres_year
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres_year(
    p_year INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_filtres(
        DATE(p_year || '-01-01'),
        'year',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_filtres_month
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres_month(
    p_year INTEGER, 
    p_month INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM appbadge_kpi_filtres(
        DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01'),
        'month',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_filtres_iso_week
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres_iso_week(
    p_iso_year INTEGER, 
    p_iso_week INTEGER, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
BEGIN
    -- Calcul du lundi de la semaine ISO
    v_start_date := (DATE(p_iso_year || '-01-01') + (p_iso_week - 1) * INTERVAL '7 days')::DATE;
    v_start_date := v_start_date + (1 - EXTRACT(DOW FROM v_start_date))::INTEGER;
    
    RETURN QUERY
    SELECT * FROM appbadge_kpi_filtres(
        v_start_date,
        'week',
        p_utilisateur_id,
        p_lieux,
        p_service,
        p_role
    );
END;
$$;

-- FONCTION HELPER: appbadge_kpi_filtres_between
CREATE OR REPLACE FUNCTION appbadge_kpi_filtres_between(
    p_start_date DATE, 
    p_end_date DATE, 
    p_utilisateur_id UUID DEFAULT NULL, 
    p_lieux TEXT DEFAULT NULL, 
    p_service TEXT DEFAULT NULL, 
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    utilisateur_id UUID,
    nom TEXT,
    prenom TEXT,
    lieux TEXT,
    service TEXT,
    role TEXT,
    travail_total_minutes BIGINT,
    pause_total_minutes BIGINT,
    travail_net_minutes BIGINT,
    retard_minutes BIGINT,
    depart_anticipe_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as utilisateur_id,
        u.nom,
        u.prenom,
        u.lieux,
        u.service,
        u.role,
        COALESCE(SUM(travail_total_minutes), 0)::BIGINT as travail_total_minutes,
        COALESCE(SUM(pause_total_minutes), 0)::BIGINT as pause_total_minutes,
        COALESCE(SUM(travail_net_minutes), 0)::BIGINT as travail_net_minutes,
        COALESCE(SUM(retard_minutes), 0)::BIGINT as retard_minutes,
        COALESCE(SUM(depart_anticipe_minutes), 0)::BIGINT as depart_anticipe_minutes
    FROM appbadge_utilisateurs u
    LEFT JOIN appbadge_badges b ON u.id = b.utilisateur_id 
        AND b.jour_local >= p_start_date AND b.jour_local < p_end_date
    WHERE (p_utilisateur_id IS NULL OR u.id = p_utilisateur_id)
        AND (p_lieux IS NULL OR u.lieux = p_lieux)
        AND (p_service IS NULL OR u.service = p_service)
        AND (p_role IS NULL OR u.role = p_role)
    GROUP BY u.id, u.nom, u.prenom, u.lieux, u.service, u.role
    ORDER BY travail_net_minutes DESC;
END;
$$;
