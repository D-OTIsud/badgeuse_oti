// Service pour gérer les appels webhook de manière sécurisée
// Utilise les fonctions RPC PostgreSQL pour appeler les webhooks côté serveur

import { supabase } from '../supabaseClient';

/**
 * Récupère l'URL d'un webhook depuis les variables d'environnement
 * @param webhookName Nom du webhook ('badge_code', 'gps', 'oubli_badgeage')
 * @returns URL du webhook ou null si non configuré
 */
const getWebhookUrl = (webhookName: string): string | null => {
  const envVar = `VITE_WEBHOOK_${webhookName.toUpperCase()}_URL`;
  const url = import.meta.env[envVar];
  if (!url) {
    console.warn(`Variable d'environnement ${envVar} non définie. Configurez-la dans .env`);
    return null;
  }
  return url as string;
};

/**
 * Appelle un webhook via une fonction RPC PostgreSQL (recommandé)
 * Les fonctions RPC sont créées dans la base de données et gèrent l'authentification
 * 
 * @param functionName Nom de la fonction RPC (ex: 'webhook_badge_code')
 * @param params Paramètres à passer à la fonction
 * @returns Promise avec la réponse ou null en cas d'erreur
 */
export const callWebhookViaRPC = async (
  functionName: string,
  params: any
): Promise<any | null> => {
  try {
    // Récupérer la session pour l'authentification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No session for webhook call');
      return null;
    }

    // Appeler la fonction RPC avec authentification
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error(`Error calling webhook RPC ${functionName}:`, error);
      return null;
    }

    // Vérifier si la réponse indique une erreur
    if (data && typeof data === 'object' && 'error' in data && !data.success) {
      console.error(`Webhook RPC ${functionName} returned error:`, data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error calling webhook RPC ${functionName}:`, error);
    return null;
  }
};

/**
 * Appelle le webhook de génération de code badge via RPC
 */
export const callWebhookBadgeCode = async (
  utilisateur_id: string,
  badge_id: string,
  user_email: string
): Promise<any | null> => {
  return callWebhookViaRPC('webhook_badge_code', {
    p_utilisateur_id: utilisateur_id,
    p_badge_id: badge_id,
    p_user_email: user_email,
  });
};

/**
 * Appelle le webhook GPS via RPC
 */
export const callWebhookGPS = async (
  webhookData: {
    user_email: string;
    user_name?: string;
    user_role?: string;
    badge_code?: string;
    timestamp?: string;
    message?: string;
    gps_error_code?: string;
    gps_error_reason?: string;
    device_info?: any;
    latitude?: string;
    longitude?: string;
  }
): Promise<any | null> => {
  return callWebhookViaRPC('webhook_gps', {
    p_webhook_data: webhookData,
  });
};

/**
 * Appelle le webhook d'oubli de badgeage via RPC
 */
export const callWebhookOubliBadgeage = async (
  requestData: any
): Promise<any | null> => {
  return callWebhookViaRPC('webhook_oubli_badgeage', {
    p_request_data: requestData,
  });
};

// ============================================================================
// Fonctions de compatibilité (anciennes méthodes - à déprécier)
// ============================================================================

interface WebhookCall {
  url: string;
  timestamp: number;
}

// Rate limiting: maximum 10 appels par minute par URL
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_CALLS = 10;
const webhookCalls: Map<string, WebhookCall[]> = new Map();

/**
 * Nettoie les appels webhook anciens (hors de la fenêtre de rate limiting)
 */
const cleanOldCalls = (url: string) => {
  const calls = webhookCalls.get(url) || [];
  const now = Date.now();
  const recentCalls = calls.filter(call => now - call.timestamp < RATE_LIMIT_WINDOW);
  webhookCalls.set(url, recentCalls);
};

/**
 * Vérifie si un appel webhook est autorisé selon le rate limiting
 */
const checkRateLimit = (url: string): boolean => {
  cleanOldCalls(url);
  const calls = webhookCalls.get(url) || [];
  return calls.length < RATE_LIMIT_MAX_CALLS;
};

/**
 * Enregistre un appel webhook
 */
const recordWebhookCall = (url: string) => {
  const calls = webhookCalls.get(url) || [];
  calls.push({ url, timestamp: Date.now() });
  webhookCalls.set(url, calls);
};

/**
 * Appelle un webhook via Supabase Edge Function
 * 
 * @deprecated Utiliser callWebhookViaRPC() à la place (plus simple et plus direct)
 * Les Edge Functions ne sont plus utilisées - remplacées par des fonctions RPC PostgreSQL
 */
export const callWebhookViaFunction = async (
  functionName: string,
  data: any
): Promise<Response | null> => {
  try {
    const { supabase } = await import('../supabaseClient');
    
    // Récupérer la session pour l'authentification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No session for webhook call');
      return null;
    }

    // Appeler la fonction Edge avec authentification
    const { data: result, error } = await supabase.functions.invoke(functionName, {
      body: data,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error(`Error calling webhook function ${functionName}:`, error);
      return null;
    }

    return result as any;
  } catch (error) {
    console.error(`Error calling webhook function ${functionName}:`, error);
    return null;
  }
};

/**
 * Appelle un webhook de manière sécurisée avec rate limiting
 * 
 * @deprecated Utiliser callWebhookViaRPC() à la place pour une meilleure sécurité
 */
export const callWebhook = async (
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<Response | null> => {
  // Validation de l'URL
  if (!url || !url.startsWith('https://')) {
    console.error('URL webhook invalide:', url);
    return null;
  }

  // Vérification du rate limiting
  if (!checkRateLimit(url)) {
    console.warn(`Rate limit atteint pour le webhook: ${url}`);
    return null;
  }

  try {
    // Enregistrer l'appel avant de l'effectuer
    recordWebhookCall(url);

    // Appel du webhook avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes max

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Erreur webhook (${response.status}):`, url);
      return null;
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Timeout webhook:', url);
    } else {
      console.error('Erreur webhook:', error);
    }
    return null;
  }
};

/**
 * Réinitialise le rate limiting (utile pour les tests)
 */
export const resetRateLimit = () => {
  webhookCalls.clear();
};
