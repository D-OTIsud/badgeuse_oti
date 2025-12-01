// Service d'authentification et d'autorisation
import { supabase } from '../supabaseClient';

/**
 * Vérifie si l'utilisateur actuellement authentifié est un administrateur
 * Utilise la fonction RPC is_admin() qui vérifie le rôle dans la base de données
 */
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    // Vérifier d'abord qu'il y a une session active
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return false;
    }

    // Appeler la fonction RPC is_admin() qui vérifie le rôle dans la base de données
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Erreur lors de la vérification du rôle admin:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle admin:', error);
    return false;
  }
};

/**
 * Vérifie si l'utilisateur actuellement authentifié a un rôle spécifique
 */
export const checkUserRole = async (): Promise<string | null> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return null;
    }

    // Récupérer le rôle de l'utilisateur depuis la table appbadge_utilisateurs
    const { data: userData, error: userError } = await supabase
      .from('appbadge_utilisateurs')
      .select('role')
      .eq('id', session.user.id)
      .eq('actif', true)
      .single();
    
    if (userError || !userData) {
      return null;
    }
    
    return userData.role || null;
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle utilisateur:', error);
    return null;
  }
};

/**
 * Vérifie si l'utilisateur actuellement authentifié est un Manager (pas Admin)
 */
export const checkIsManager = async (): Promise<boolean> => {
  try {
    const role = await checkUserRole();
    return role === 'Manager';
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle manager:', error);
    return false;
  }
};

/**
 * Récupère le service de l'utilisateur actuellement authentifié
 */
export const getUserService = async (): Promise<string | null> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('appbadge_utilisateurs')
      .select('service')
      .eq('id', session.user.id)
      .eq('actif', true)
      .single();
    
    if (userError || !userData) {
      return null;
    }
    
    return userData.service || null;
  } catch (error) {
    console.error('Erreur lors de la récupération du service utilisateur:', error);
    return null;
  }
};

/**
 * Vérifie si l'utilisateur peut accéder à tous les services (Admin)
 */
export const checkCanAccessAllServices = async (): Promise<boolean> => {
  try {
    const role = await checkUserRole();
    return role === 'Admin';
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'accès aux services:', error);
    return false;
  }
};

