-- =====================================================
-- TESTS DES FONCTIONS SQL POUR LE DASHBOARD BADGEUSE OTI
-- =====================================================

-- Test de la fonction principale appbadge_kpi_bundle
SELECT 'Test appbadge_kpi_bundle (month)' as test_name;
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month'
);

-- Test de la fonction helper appbadge_kpi_bundle_year
SELECT 'Test appbadge_kpi_bundle_year' as test_name;
SELECT * FROM appbadge_kpi_bundle_year(2025);

-- Test de la fonction helper appbadge_kpi_bundle_month
SELECT 'Test appbadge_kpi_bundle_month' as test_name;
SELECT * FROM appbadge_kpi_bundle_month(2025, 1);

-- Test de la fonction helper appbadge_kpi_bundle_iso_week
SELECT 'Test appbadge_kpi_bundle_iso_week' as test_name;
SELECT * FROM appbadge_kpi_bundle_iso_week(2025, 1);

-- Test de la fonction helper appbadge_kpi_bundle_between
SELECT 'Test appbadge_kpi_bundle_between' as test_name;
SELECT * FROM appbadge_kpi_bundle_between(
    DATE '2025-01-01',
    DATE '2025-01-31'
);

-- Test avec filtres sur un service spécifique
SELECT 'Test appbadge_kpi_bundle avec filtre service' as test_name;
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month',
    NULL, -- p_utilisateur_id
    NULL, -- p_lieux
    'Service Accueil ', -- p_service (attention aux espaces finaux)
    NULL  -- p_role
);

-- Test avec filtres sur un lieu spécifique
SELECT 'Test appbadge_kpi_bundle avec filtre lieu' as test_name;
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month',
    NULL, -- p_utilisateur_id
    'Siège', -- p_lieux
    NULL, -- p_service
    NULL  -- p_role
);

-- Test des fonctions KPIs globaux avec filtres
SELECT 'Test appbadge_kpi_global_filtres_year' as test_name;
SELECT * FROM appbadge_kpi_global_filtres_year(2025);

SELECT 'Test appbadge_kpi_global_filtres_month' as test_name;
SELECT * FROM appbadge_kpi_global_filtres_month(2025, 1);

SELECT 'Test appbadge_kpi_global_filtres_iso_week' as test_name;
SELECT * FROM appbadge_kpi_global_filtres_iso_week(2025, 1);

SELECT 'Test appbadge_kpi_global_filtres_between' as test_name;
SELECT * FROM appbadge_kpi_global_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-31'
);

-- Test des fonctions KPIs par utilisateur avec filtres
SELECT 'Test appbadge_kpi_filtres_year' as test_name;
SELECT * FROM appbadge_kpi_filtres_year(2025) LIMIT 5;

SELECT 'Test appbadge_kpi_filtres_month' as test_name;
SELECT * FROM appbadge_kpi_filtres_month(2025, 1) LIMIT 5;

SELECT 'Test appbadge_kpi_filtres_iso_week' as test_name;
SELECT * FROM appbadge_kpi_filtres_iso_week(2025, 1) LIMIT 5;

SELECT 'Test appbadge_kpi_filtres_between' as test_name;
SELECT * FROM appbadge_kpi_filtres_between(
    DATE '2025-01-01',
    DATE '2025-01-31'
) LIMIT 5;

-- Test avec tous les filtres combinés
SELECT 'Test appbadge_kpi_bundle avec tous les filtres' as test_name;
SELECT * FROM appbadge_kpi_bundle(
    DATE '2025-01-01',
    'month',
    NULL, -- p_utilisateur_id
    'Siège', -- p_lieux
    'Service Accueil ', -- p_service
    'Manager' -- p_role
);

-- Test des cas limites
SELECT 'Test appbadge_kpi_bundle avec période invalide' as test_name;
-- Cette requête devrait lever une exception
-- SELECT * FROM appbadge_kpi_bundle(DATE '2025-01-01', 'invalid_period');

-- Test avec des dates futures
SELECT 'Test appbadge_kpi_bundle avec dates futures' as test_name;
SELECT * FROM appbadge_kpi_bundle(
    DATE '2026-01-01',
    'month'
);

-- Test de performance (optionnel)
SELECT 'Test de performance - comptage des fonctions disponibles' as test_name;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE 'appbadge_kpi%'
ORDER BY routine_name;
