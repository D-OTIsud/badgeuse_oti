import { supabase } from '../supabaseClient';

export interface UserData {
  id?: string;
  email: string;
  nom: string;
  prenom: string;
  role?: string | null;
  service?: string | null;
  actif: boolean;
  avatar?: string | null;
  lieux?: string | null;
  heures_contractuelles_semaine?: number;
  telegramID?: string | null;
  status?: string | null;
}

export interface User extends UserData {
  id: string;
  date_creation?: string;
}

/**
 * Fetch all users from the database
 * @param includeInactive - If true, includes inactive users (actif = false)
 */
export const fetchAllUsers = async (includeInactive: boolean = false): Promise<User[]> => {
  let query = supabase
    .from('appbadge_utilisateurs')
      .select('id, email, nom, prenom, role, service, actif, avatar, lieux, heures_contractuelles_semaine, telegramID, status, date_creation')
    .order('nom', { ascending: true });

  if (!includeInactive) {
    query = query.eq('actif', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data || [];
};

/**
 * Create a new user
 */
export const createUser = async (userData: Omit<UserData, 'id'>): Promise<User> => {
  const { data, error } = await supabase
    .from('appbadge_utilisateurs')
    .insert([{
      email: userData.email,
      nom: userData.nom,
      prenom: userData.prenom,
      role: userData.role || null,
      service: userData.service || null,
      actif: userData.actif !== undefined ? userData.actif : true,
      avatar: userData.avatar || null,
      lieux: userData.lieux || null,
      heures_contractuelles_semaine: userData.heures_contractuelles_semaine || 35.0,
      telegramID: userData.telegramID || null,
      status: userData.status || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing user
 */
export const updateUser = async (userId: string, userData: Partial<UserData>): Promise<User> => {
  const updateData: any = {};

  if (userData.email !== undefined) updateData.email = userData.email;
  if (userData.nom !== undefined) updateData.nom = userData.nom;
  if (userData.prenom !== undefined) updateData.prenom = userData.prenom;
  if (userData.role !== undefined) updateData.role = userData.role;
  if (userData.service !== undefined) updateData.service = userData.service;
  if (userData.actif !== undefined) updateData.actif = userData.actif;
  if (userData.avatar !== undefined) updateData.avatar = userData.avatar;
  if (userData.lieux !== undefined) updateData.lieux = userData.lieux;
  if (userData.heures_contractuelles_semaine !== undefined) updateData.heures_contractuelles_semaine = userData.heures_contractuelles_semaine;
  if (userData.telegramID !== undefined) updateData.telegramID = userData.telegramID;
  if (userData.status !== undefined) updateData.status = userData.status;

  const { data, error } = await supabase
    .from('appbadge_utilisateurs')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }

  return data;
};

/**
 * Delete (deactivate) a user by setting actif to false
 * This is a soft delete to preserve data integrity
 */
export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('appbadge_utilisateurs')
    .update({ actif: false })
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Check if an email is already in use
 */
export const checkEmailExists = async (email: string, excludeUserId?: string): Promise<boolean> => {
  let query = supabase
    .from('appbadge_utilisateurs')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking email:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

