-- Fonctions RPC PostgreSQL pour appeler les webhooks de manière sécurisée
-- Ces fonctions peuvent être créées directement dans l'éditeur SQL de Supabase
-- Elles utilisent l'extension http (déjà activée dans appbadge_full_monolithic.sql)

-- Note: L'extension http est déjà activée dans votre schéma
-- Si ce n'est pas le cas, exécutez: CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================================
-- Fonction RPC pour appeler le webhook de génération de code badge
-- ============================================================================
CREATE OR REPLACE FUNCTION public.webhook_badge_code(
  p_utilisateur_id uuid,
  p_badge_id uuid,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url text;
  v_response jsonb;
  v_user_role text;
  v_http_response http_response;
  v_request_body text;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized', 'success', false);
  END IF;

  -- Vérifier que l'utilisateur peut effectuer cette action
  -- (doit être l'utilisateur lui-même ou Admin/Manager)
  SELECT role INTO v_user_role
  FROM appbadge_utilisateurs
  WHERE id = auth.uid() AND actif = true;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found', 'success', false);
  END IF;

  IF v_user_role NOT IN ('Admin', 'Manager') AND auth.uid() != p_utilisateur_id THEN
    RETURN jsonb_build_object('error', 'Forbidden: cannot call webhook for another user', 'success', false);
  END IF;

  -- Récupérer l'URL du webhook depuis une variable d'environnement Supabase
  -- Configurez cette variable dans Supabase Dashboard > Settings > Edge Functions > Secrets
  -- Ou utilisez: ALTER DATABASE postgres SET app.webhook_badge_code_url = 'https://...';
  v_webhook_url := COALESCE(
    current_setting('app.webhook_badge_code_url', true),
    'https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874' -- FALLBACK - À REMPLACER
  );

  -- Construire le body JSON
  v_request_body := jsonb_build_object(
    'utilisateur_id', p_utilisateur_id,
    'badge_id', p_badge_id,
    'user_email', p_user_email
  )::text;
  
  -- Appeler le webhook via l'extension http
  v_http_response := http_post(
    v_webhook_url,
    v_request_body,
    'application/json'
  );
  
  -- Extraire le contenu de la réponse
  v_response := jsonb_build_object(
    'status', v_http_response.status,
    'content', v_http_response.content,
    'success', v_http_response.status >= 200 AND v_http_response.status < 300
  );

  -- Retourner la réponse
  RETURN COALESCE(v_response, jsonb_build_object('success', true));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- ============================================================================
-- Fonction RPC pour appeler le webhook GPS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.webhook_gps(
  p_webhook_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url text;
  v_response jsonb;
  v_user_role text;
  v_user_email text;
  v_auth_email text;
  v_http_response http_response;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized', 'success', false);
  END IF;

  -- Extraire l'email de la requête
  v_user_email := p_webhook_data->>'user_email';
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('error', 'Missing user_email in webhook_data', 'success', false);
  END IF;

  -- Vérifier que l'utilisateur peut effectuer cette action
  SELECT role, email INTO v_user_role, v_auth_email
  FROM appbadge_utilisateurs
  WHERE id = auth.uid() AND actif = true;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found', 'success', false);
  END IF;

  -- Vérifier que l'utilisateur authentifié correspond à l'email
  IF v_user_role NOT IN ('Admin', 'Manager') AND 
     LOWER(COALESCE(v_auth_email, '')) != LOWER(v_user_email) THEN
    RETURN jsonb_build_object('error', 'Forbidden: cannot call webhook for another user', 'success', false);
  END IF;

  -- Récupérer l'URL du webhook depuis une variable d'environnement Supabase
  -- Configurez cette variable dans Supabase Dashboard > Settings > Edge Functions > Secrets
  -- Ou utilisez: ALTER DATABASE postgres SET app.webhook_gps_url = 'https://...';
  v_webhook_url := COALESCE(
    current_setting('app.webhook_gps_url', true),
    'https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55' -- FALLBACK - À REMPLACER
  );

  -- Appeler le webhook via l'extension http
  v_http_response := http_post(
    v_webhook_url,
    p_webhook_data::text,
    'application/json'
  );
  
  -- Extraire le contenu de la réponse
  v_response := jsonb_build_object(
    'status', v_http_response.status,
    'content', v_http_response.content,
    'success', v_http_response.status >= 200 AND v_http_response.status < 300
  );

  -- Retourner la réponse
  RETURN COALESCE(v_response, jsonb_build_object('success', true));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- ============================================================================
-- Fonction RPC pour appeler le webhook d'oubli de badgeage
-- ============================================================================
CREATE OR REPLACE FUNCTION public.webhook_oubli_badgeage(
  p_request_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url text;
  v_response jsonb;
  v_user_role text;
  v_utilisateur_id uuid;
  v_http_response http_response;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized', 'success', false);
  END IF;

  -- Extraire l'utilisateur_id de la requête
  v_utilisateur_id := (p_request_data->>'utilisateur_id')::uuid;
  
  IF v_utilisateur_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Missing utilisateur_id in request_data', 'success', false);
  END IF;

  -- Vérifier que l'utilisateur peut effectuer cette action
  SELECT role INTO v_user_role
  FROM appbadge_utilisateurs
  WHERE id = auth.uid() AND actif = true;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found', 'success', false);
  END IF;

  -- Vérifier que l'utilisateur authentifié correspond à l'utilisateur demandé
  IF v_user_role NOT IN ('Admin', 'Manager') AND auth.uid() != v_utilisateur_id THEN
    RETURN jsonb_build_object('error', 'Forbidden: cannot call webhook for another user', 'success', false);
  END IF;

  -- Récupérer l'URL du webhook depuis une variable d'environnement Supabase
  -- Configurez cette variable dans Supabase Dashboard > Settings > Edge Functions > Secrets
  -- Ou utilisez: ALTER DATABASE postgres SET app.webhook_oubli_badgeage_url = 'https://...';
  v_webhook_url := COALESCE(
    current_setting('app.webhook_oubli_badgeage_url', true),
    'https://n8n.otisud.re/webhook/c76763d6-d579-4d20-975f-b70939b82c59' -- FALLBACK - À REMPLACER
  );

  -- Appeler le webhook via l'extension http
  v_http_response := http_post(
    v_webhook_url,
    p_request_data::text,
    'application/json'
  );
  
  -- Extraire le contenu de la réponse
  v_response := jsonb_build_object(
    'status', v_http_response.status,
    'content', v_http_response.content,
    'success', v_http_response.status >= 200 AND v_http_response.status < 300
  );

  -- Retourner la réponse
  RETURN COALESCE(v_response, jsonb_build_object('success', true));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- ============================================================================
-- Commentaires et documentation
-- ============================================================================
COMMENT ON FUNCTION public.webhook_badge_code IS 
'Appelle le webhook de génération de code badge. Vérifie l''authentification et les permissions.';

COMMENT ON FUNCTION public.webhook_gps IS 
'Appelle le webhook GPS pour les notifications. Vérifie l''authentification et les permissions.';

COMMENT ON FUNCTION public.webhook_oubli_badgeage IS 
'Appelle le webhook d''oubli de badgeage. Vérifie l''authentification et les permissions.';

