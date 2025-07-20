// Service pour la gestion des IPs et localisations
import { supabase } from '../supabaseClient';

export interface LocationInfo {
  name: string;
  ipRanges: string[];
}

// Fonction pour obtenir l'IP de l'utilisateur
export const getUserIP = async (): Promise<string> => {
  try {
    // Utiliser un service externe pour obtenir l'IP publique
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'IP:', error);
    // Fallback: utiliser une IP locale pour les tests
    return '127.0.0.1';
  }
};

// Fonction pour vérifier si une IP est dans une plage donnée
const isIPInRange = (ip: string, range: string): boolean => {
  // Implémentation simple pour les tests
  // En production, vous devriez utiliser une bibliothèque comme ip-range-check
  const [rangeIP, mask] = range.split('/');
  const maskBits = parseInt(mask);
  
  // Conversion simple des IPs en nombres pour comparaison
  const ipParts = ip.split('.').map(Number);
  const rangeParts = rangeIP.split('.').map(Number);
  
  // Pour simplifier, on compare juste les premiers octets selon le masque
  if (maskBits >= 24) {
    return ipParts[0] === rangeParts[0] && 
           ipParts[1] === rangeParts[1] && 
           ipParts[2] === rangeParts[2];
  } else if (maskBits >= 16) {
    return ipParts[0] === rangeParts[0] && 
           ipParts[1] === rangeParts[1];
  } else if (maskBits >= 8) {
    return ipParts[0] === rangeParts[0];
  }
  
  return false;
};

// Fonction pour récupérer les IPs autorisées depuis la base de données
const getAuthorizedIPs = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('appbadge_horaires_standards')
      .select('ip_address, lieux')
      .not('ip_address', 'is', null);
    
    if (error) {
      console.error('Erreur lors de la récupération des IPs autorisées:', error);
      return [];
    }
    
    return data?.map(row => row.ip_address).filter(Boolean) || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des IPs autorisées:', error);
    return [];
  }
};

// Fonction pour vérifier si l'IP est autorisée et retourner l'info de localisation
export const checkIPAuthorization = async (): Promise<{
  isAuthorized: boolean;
  locationName?: string;
  userIP: string;
}> => {
  const userIP = await getUserIP();
  const authorizedIPs = await getAuthorizedIPs();
  
  // Vérifier si l'IP exacte est dans la liste
  if (authorizedIPs.includes(userIP)) {
    return {
      isAuthorized: true,
      locationName: `Emplacement autorisé (${userIP})`,
      userIP
    };
  }
  
  // Vérifier si l'IP est dans une plage autorisée
  for (const authorizedIP of authorizedIPs) {
    if (isIPInRange(userIP, authorizedIP)) {
      return {
        isAuthorized: true,
        locationName: `Emplacement autorisé (${authorizedIP})`,
        userIP
      };
    }
  }
  
  return {
    isAuthorized: false,
    userIP
  };
};

// Fonction pour obtenir le message de bienvenue basé sur la localisation
export const getWelcomeMessage = (locationName?: string): string => {
  if (locationName) {
    return `Bienvenue au kit de badgeage - ${locationName}`;
  }
  return "Bienvenue au kit de badgeage";
}; 