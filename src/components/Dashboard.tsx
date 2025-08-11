import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { supabaseAPI } from '../../supabase.config';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardData {
  statutCourant: any[];
  dashboardJour: any[];
  anomalies: any[];
  kpis: {
    presents: number;
    enPause: number;
    retardCumule: number;
    travailNetMoyen: number;
    pauseMoyenne: number;
    tauxPonctualite: number;
  };
  // New KPI bundle data from SQL functions
  kpiBundle?: {
    global: any;
    utilisateurs: any[];
    metadata: any;
  };
}

interface DashboardProps {
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<DashboardData>({
    statutCourant: [],
    dashboardJour: [],
    anomalies: [],
    kpis: {
      presents: 0,
      enPause: 0,
      retardCumule: 0,
      travailNetMoyen: 0,
      pauseMoyenne: 0,
      tauxPonctualite: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = semaine actuelle, -1 = semaine précédente, etc.
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = mois actuel, -1 = mois précédent, etc.
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [lieuxColors, setLieuxColors] = useState<Record<string, string>>({});

  // Couleurs du thème OTI du SUD
  const colors = {
    primary: '#3ba27c',
    background: '#faf7f2',
    avatarRing: '#4AA3FF',
    present: '#4caf50',
    pause: '#ff9800',
    absent: '#cccccc',
    text: '#333333',
    textLight: '#666666'
  };

  // Fonction pour obtenir l'ordre de priorité du statut
  const getStatusPriority = (status: string) => {
    switch (status) {
      case 'Entré': return 1;
      case 'En pause': return 2;
      case 'Sorti': return 3;
      default: return 4; // Non badgé ou autres
    }
  };

  // Fonctions utilitaires pour les dates selon les périodes
  const getDateRangeForPeriod = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    const currentDay = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'jour':
        // Pour le jour, utiliser l'année sélectionnée
        const selectedYearDate = new Date(selectedYear, currentMonth, currentDate);
        startDate = new Date(selectedYearDate);
        endDate = new Date(selectedYearDate);
        endDate.setDate(selectedYearDate.getDate() + 1);
        break;
        
      case 'semaine':
        // Calculer le lundi de la semaine sélectionnée
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Si dimanche, lundi = -6, sinon 1 - currentDay
        const mondayOfCurrentWeek = new Date(currentYear, currentMonth, currentDate + mondayOffset);
        const mondayOfSelectedWeek = new Date(mondayOfCurrentWeek);
        mondayOfSelectedWeek.setDate(mondayOfCurrentWeek.getDate() + (selectedWeek * 7));
        
        startDate = new Date(mondayOfSelectedWeek);
        endDate = new Date(mondayOfSelectedWeek);
        endDate.setDate(mondayOfSelectedWeek.getDate() + 7);
        break;
        
      case 'mois':
        // Calculer le premier jour du mois sélectionné
        const firstDayOfSelectedMonth = new Date(currentYear, currentMonth + selectedMonth, 1);
        startDate = new Date(firstDayOfSelectedMonth);
        endDate = new Date(currentYear, currentMonth + selectedMonth + 1, 1);
        break;
        
      case 'annee':
        // Pour l'année, utiliser l'année sélectionnée
        startDate = new Date(selectedYear, 0, 1); // 1er janvier
        endDate = new Date(selectedYear + 1, 0, 1); // 1er janvier de l'année suivante
        break;
        
      default:
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(startDate.getDate() + 1);
    }
    
    return { startDate, endDate };
  };

  // Nouvelle fonction pour récupérer les KPIs via les fonctions SQL
  const fetchKPIData = async () => {
    try {
      setKpiLoading(true);
      setKpiError(null);
      const { startDate, endDate } = getDateRangeForPeriod();
      
      let kpiData: any;
      
      // Déterminer quelle fonction SQL utiliser selon la période
      switch (period) {
        case 'jour':
          // Utiliser la nouvelle API pour une date spécifique
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            startDate.toISOString().split('T')[0]
          );
          break;
        case 'semaine':
          const weekNumber = getISOWeekNumber(startDate);
          kpiData = await supabaseAPI.getKPIBundleISOWeek(selectedYear, weekNumber);
          break;
        case 'mois':
          kpiData = await supabaseAPI.getKPIBundleMonth(selectedYear, startDate.getMonth() + 1);
          break;
        case 'annee':
          kpiData = await supabaseAPI.getKPIBundleYear(selectedYear);
          break;
        default:
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            startDate.toISOString().split('T')[0]
          );
      }
      
      console.log(`KPIs récupérés pour la période ${period}:`, kpiData);
      
      // Traiter la structure des données retournées par les fonctions SQL
      if (kpiData && Array.isArray(kpiData) && kpiData.length > 0) {
        const firstResult = kpiData[0]; // Prendre le premier résultat
        const kpiBundle = {
          global: firstResult.global || null,
          utilisateurs: firstResult.users || [],
          metadata: firstResult.meta || null
        };
        
        console.log('Structure KPI traitée:', kpiBundle);
        
        setData(prev => ({
          ...prev,
          kpiBundle: kpiBundle
        }));
      } else {
        console.log('Aucune donnée KPI trouvée ou structure invalide');
        setData(prev => ({
          ...prev,
          kpiBundle: {
            global: null,
            utilisateurs: [],
            metadata: null
          }
        }));
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error);
      setKpiError('Erreur générale lors de la récupération des KPIs.');
      // En cas d'erreur, initialiser avec des valeurs par défaut
      setData(prev => ({
        ...prev,
        kpiBundle: {
          global: null,
          utilisateurs: [],
          metadata: null
        }
      }));
    } finally {
      setKpiLoading(false);
    }
  };

  // Fonction utilitaire pour calculer le numéro de semaine ISO
  const getISOWeekNumber = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  };

  // Fonction pour tester la disponibilité des fonctions SQL
  const testSQLFunctions = async () => {
    try {
      console.log('Test de disponibilité des fonctions SQL...');
      
      // Tester avec la nouvelle API
      const testData = await supabaseAPI.getKPIBundleBetween('2024-01-01', '2024-01-01');
      
      if (testData && testData.length > 0) {
        console.log('Fonction SQL disponible:', testData);
        setKpiError(null); // Clear any previous errors
        return true;
      } else {
        console.error('Fonction SQL retourne des données vides');
        setKpiError('Les fonctions SQL retournent des données vides.');
        return false;
      }
      
    } catch (error) {
      console.error('Erreur lors du test des fonctions SQL:', error);
      setKpiError('Impossible de tester les fonctions SQL.');
      return false;
    }
  };

  const getPeriodLabel = () => {
    const { startDate, endDate } = getDateRangeForPeriod();
    
    switch (period) {
      case 'jour':
        return startDate.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
      case 'semaine':
        const endDateWeek = new Date(endDate);
        endDateWeek.setDate(endDate.getDate() - 1);
        return `Semaine du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${endDateWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        
      case 'mois':
        return startDate.toLocaleDateString('fr-FR', { 
          month: 'long', 
          year: 'numeric' 
        });
        
      case 'annee':
        return `Année ${selectedYear}`;
        
      default:
        return '';
    }
  };

  // Récupérer les couleurs des lieux depuis la table appbadge_horaires_standards
  const fetchLieuxColors = async () => {
    try {
      const { data: lieuxData, error } = await supabase
        .from('appbadge_horaires_standards')
        .select('lieux, color');

      if (error) {
        console.error('Erreur lors de la récupération des couleurs des lieux:', error);
        return;
      }

      const colorsMap: Record<string, string> = {};
      lieuxData?.forEach(item => {
        colorsMap[item.lieux] = item.color || '#F0F0F2'; // Couleur par défaut si null
      });

      setLieuxColors(colorsMap);
      console.log('Couleurs des lieux récupérées:', colorsMap);
    } catch (error) {
      console.error('Erreur lors de la récupération des couleurs des lieux:', error);
    }
  };

  // Filtrer et trier les utilisateurs selon les critères
  const filteredUsers = data.statutCourant
    .filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesService = selectedService === '' || user.service === selectedService;
      const matchesRole = selectedRole === '' || user.role === selectedRole;
      
      return matchesSearch && matchesService && matchesRole;
    })
    .sort((a, b) => {
      // D'abord par statut
      const statusA = getStatusPriority(a.status);
      const statusB = getStatusPriority(b.status);
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // Puis par prénom
      return (a.prenom || '').localeCompare(b.prenom || '');
    });

  // Calculer les KPIs en temps réel basé sur les données filtrées
  const calculateKPIs = useCallback(() => {
    // Si nous avons des données KPI du bundle SQL, les utiliser en priorité
    if (data.kpiBundle?.global) {
      const globalKPIs = data.kpiBundle.global;
      
      // Filtrer les utilisateurs selon les critères sélectionnés
      const filteredUserIds = filteredUsers.map(u => u.id);
      const filteredUtilisateursKPIs = data.kpiBundle.utilisateurs?.filter(u => 
        filteredUserIds.includes(u.utilisateur_id)
      ) || [];
      
      // Calculer les totaux filtrés
      const totalRetard = filteredUtilisateursKPIs.reduce((sum, u) => sum + (u.retard_minutes || 0), 0);
      const totalTravailNet = filteredUtilisateursKPIs.reduce((sum, u) => sum + (u.travail_net_minutes || 0), 0);
      const totalPause = filteredUtilisateursKPIs.reduce((sum, u) => sum + (u.pause_total_minutes || 0), 0);
      const countPonctuel = filteredUtilisateursKPIs.filter(u => (u.retard_minutes || 0) === 0).length;
      
      return {
        presents: filteredUsers.filter(u => u.status === 'Entré').length || 0,
        enPause: filteredUsers.filter(u => u.status === 'En pause').length || 0,
        retardCumule: totalRetard,
        travailNetMoyen: filteredUtilisateursKPIs.length > 0 ? Math.round(totalTravailNet / filteredUtilisateursKPIs.length) : 0,
        pauseMoyenne: filteredUtilisateursKPIs.length > 0 ? Math.round(totalPause / filteredUtilisateursKPIs.length) : 0,
        tauxPonctualite: filteredUtilisateursKPIs.length > 0 ? Math.round((countPonctuel / filteredUtilisateursKPIs.length) * 100) : 0
      };
    }
    
    // Fallback vers l'ancienne méthode si pas de bundle KPI
    const presents = filteredUsers.filter(u => u.status === 'Entré').length || 0;
    const enPause = filteredUsers.filter(u => u.status === 'En pause').length || 0;
    
    // Pour les KPIs basés sur dashboardJour, filtrer selon les utilisateurs sélectionnés
    const userIds = filteredUsers.map(u => u.id);
    const filteredDashboardData = data.dashboardJour.filter(item => 
      userIds.includes(item.utilisateur_id)
    );
    
    // Calculer les KPIs selon la période
    let retardCumule = 0;
    let travailNetMoyen = 0;
    let pauseMoyenne = 0;
    let tauxPonctualite = 0;
    
    if (filteredDashboardData.length > 0) {
      retardCumule = filteredDashboardData.reduce((sum, item) => sum + (item.retard_minutes || 0), 0);
      travailNetMoyen = filteredDashboardData.reduce((sum, item) => sum + (item.travail_net_minutes || 0), 0) / filteredDashboardData.length;
      pauseMoyenne = filteredDashboardData.reduce((sum, item) => sum + (item.pause_total_minutes || 0), 0) / filteredDashboardData.length;
      tauxPonctualite = (filteredDashboardData.filter(item => (item.retard_minutes || 0) === 0).length / filteredDashboardData.length) * 100;
    }

    return {
      presents,
      enPause,
      retardCumule,
      travailNetMoyen: Math.round(travailNetMoyen),
      pauseMoyenne: Math.round(pauseMoyenne),
      tauxPonctualite: Math.round(tauxPonctualite)
    };
  }, [filteredUsers, data.dashboardJour, data.kpiBundle]);

  // Calculer le nombre de jours avec données (jours uniques)
  const calculateJoursAvecDonnees = useCallback(() => {
    // Si nous avons des données KPI du bundle SQL, les utiliser
    if (data.kpiBundle?.metadata?.jours_avec_donnees !== undefined) {
      return data.kpiBundle.metadata.jours_avec_donnees;
    }
    
    // Fallback vers l'ancienne méthode
    const userIds = filteredUsers.map(u => u.id);
    const filteredDashboardData = data.dashboardJour.filter(item => 
      userIds.includes(item.utilisateur_id)
    );
    
    // Extraire les jours uniques
    const joursUniques = new Set(filteredDashboardData.map(item => item.jour_local));
    return joursUniques.size;
  }, [filteredUsers, data.dashboardJour, data.kpiBundle]);

  // KPIs calculés en temps réel
  const kpis = calculateKPIs();

  // Fonction pour mettre à jour le statut des utilisateurs basé sur les derniers badgeages
  const updateUserStatusFromBadgeages = useCallback(async () => {
    try {
      // Récupérer les derniers badgeages pour chaque utilisateur avec une requête plus optimisée
      const { data: latestBadgeages, error } = await supabase
        .from('appbadge_badgeages')
        .select('utilisateur_id, type_action, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Dernières 24h
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des badgeages:', error);
        return;
      }

      // Grouper les badgeages par utilisateur et prendre le plus récent
      const userLatestBadgeages = new Map();
      latestBadgeages?.forEach(badgeage => {
        if (!userLatestBadgeages.has(badgeage.utilisateur_id) || 
            new Date(badgeage.created_at) > new Date(userLatestBadgeages.get(badgeage.utilisateur_id).created_at)) {
          userLatestBadgeages.set(badgeage.utilisateur_id, badgeage);
        }
      });

      // Mettre à jour le statut des utilisateurs basé sur leurs derniers badgeages
      setData(prev => {
        const updatedUsers = prev.statutCourant.map(user => {
          const latestBadgeage = userLatestBadgeages.get(user.id);
          if (latestBadgeage) {
            let newStatus = user.status;
            
            // Déterminer le statut basé sur le type d'action
            switch (latestBadgeage.type_action) {
              case 'entrée':
                newStatus = 'Entré';
                break;
              case 'sortie':
                newStatus = 'Sorti';
                break;
              case 'pause':
                newStatus = 'En pause';
                break;
              case 'retour':
                newStatus = 'Entré';
                break;
              default:
                newStatus = user.status;
            }
            
            // Ne mettre à jour que si le statut a changé
            if (newStatus !== user.status) {
              console.log(`Mise à jour statut ${user.prenom} ${user.nom}: ${user.status} → ${newStatus}`);
              return { ...user, status: newStatus };
            }
          }
          return user;
        });

        return {
          ...prev,
          statutCourant: updatedUsers
        };
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        console.log('Rafraîchissement forcé des données...');
      }
      
      // Récupérer les données selon la période sélectionnée
      const { startDate, endDate } = getDateRangeForPeriod();
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('appbadge_v_dashboard_jour')
        .select('*')
        .gte('jour_local', startDateStr)
        .lt('jour_local', endDateStr);

      if (dashboardError) {
        console.error('Erreur dashboard jour:', dashboardError);
      } else {
        console.log('Données dashboard jour:', dashboardData);
      }

      // Récupérer les anomalies (vue appbadge_v_anomalies)
      const { data: anomaliesData, error: anomaliesError } = await supabase
        .from('appbadge_v_anomalies')
        .select('*')
        .order('date_heure', { ascending: false })
        .limit(10);

      if (anomaliesError) {
        console.error('Erreur anomalies:', anomaliesError);
      } else {
        console.log('Données anomalies:', anomaliesData);
      }

      setData(prev => ({
        ...prev,
        dashboardJour: dashboardData || [],
        anomalies: anomaliesData || []
      }));

      // Mettre à jour le statut des utilisateurs
      await updateUserStatusFromBadgeages();
      
      setLastUpdate(new Date());
      
      if (forceRefresh) {
        console.log('Rafraîchissement terminé avec succès');
        setTimeout(() => setRefreshing(false), 1000); // Délai pour montrer l'animation
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      if (forceRefresh) {
        setRefreshing(false);
      }
    }
  };

     // Initialisation et mise à jour périodique (1 minute au lieu de 5)
   useEffect(() => {
     fetchData();
     fetchKPIData(); // Récupérer les KPIs via les fonctions SQL
     testSQLFunctions(); // Tester la disponibilité des fonctions SQL
     fetchLieuxColors(); // Récupérer les couleurs des lieux
     const interval = setInterval(() => {
       fetchData();
       fetchKPIData(); // Rafraîchir aussi les KPIs
     }, 60000); // 1 minute
     return () => clearInterval(interval);
   }, [period, selectedWeek, selectedMonth, selectedYear, updateUserStatusFromBadgeages]);

  // Temps réel pour les utilisateurs et récupération des services/rôles
  useEffect(() => {
    // Récupérer les utilisateurs initiaux depuis la table appbadge_utilisateurs
    const fetchUsers = async () => {
      const { data: usersData } = await supabase
        .from('appbadge_utilisateurs')
        .select('id, nom, prenom, email, role, service, avatar, lieux, actif, status')
        .eq('actif', true);
      
      if (usersData) {
        setData(prev => ({
          ...prev,
          statutCourant: usersData
        }));
        
        // Extraire les services et rôles uniques
        const services = [...new Set(usersData.map(user => user.service).filter(Boolean))];
        const roles = [...new Set(usersData.map(user => user.role).filter(Boolean))];
        
        setAvailableServices(services.sort());
        setAvailableRoles(roles.sort());
        setLoading(false);
      }
    };

    fetchUsers();

    // Abonnement temps réel sur la table utilisateurs
    const channel = supabase
      .channel('utilisateurs_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appbadge_utilisateurs' 
        }, 
        (payload) => {
          console.log('Changement utilisateur détecté:', payload.eventType, payload.new);
          
          // Mettre à jour les utilisateurs en temps réel
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setData(prev => {
              const updatedUsers = prev.statutCourant.map(user => 
                user.id === payload.new.id ? { ...user, ...payload.new } : user
              );
              
              // Mettre à jour les services et rôles disponibles
              const services = [...new Set(updatedUsers.map(user => user.service).filter(Boolean))];
              const roles = [...new Set(updatedUsers.map(user => user.role).filter(Boolean))];
              
              setAvailableServices(services.sort());
              setAvailableRoles(roles.sort());
              
              return {
                ...prev,
                statutCourant: updatedUsers
              };
            });
          } else if (payload.eventType === 'DELETE') {
            setData(prev => {
              const updatedUsers = prev.statutCourant.filter(user => user.id !== payload.old.id);
              
              // Mettre à jour les services et rôles disponibles
              const services = [...new Set(updatedUsers.map(user => user.service).filter(Boolean))];
              const roles = [...new Set(updatedUsers.map(user => user.role).filter(Boolean))];
              
              setAvailableServices(services.sort());
              setAvailableRoles(roles.sort());
              
              return {
                ...prev,
                statutCourant: updatedUsers
              };
            });
          }
        }
      )
      .subscribe();

    // Abonnement temps réel sur la table badgeages pour mettre à jour les statuts
    const badgeagesChannel = supabase
      .channel('badgeages_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appbadge_badgeages' 
        }, 
        async (payload) => {
          console.log('Changement badgeage détecté:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            // Mettre à jour immédiatement le statut de l'utilisateur
            await updateUserStatusFromBadgeages();
            
            // Rafraîchir les données du dashboard
            setTimeout(() => {
              fetchData();
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(badgeagesChannel);
    };
  }, [updateUserStatusFromBadgeages]);

  // Calculer les options disponibles pour les filtres
  const getAvailableOptions = () => {
    // D'abord filtrer par recherche
    const searchFiltered = data.statutCourant.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Calculer les services disponibles
    const availableServicesForFilter = [...new Set(searchFiltered.map(user => user.service).filter(Boolean))].sort();

    // Calculer les rôles disponibles
    let availableRolesForFilter;
    if (selectedService === '') {
      // Si aucun service sélectionné, tous les rôles
      availableRolesForFilter = [...new Set(searchFiltered.map(user => user.role).filter(Boolean))].sort();
    } else {
      // Si service sélectionné, seulement les rôles de ce service
      const serviceFiltered = searchFiltered.filter(user => user.service === selectedService);
      availableRolesForFilter = [...new Set(serviceFiltered.map(user => user.role).filter(Boolean))].sort();
    }

    // Calculer les services disponibles en fonction du rôle sélectionné
    let availableServicesForRole;
    if (selectedRole === '') {
      // Si aucun rôle sélectionné, tous les services
      availableServicesForRole = availableServicesForFilter;
    } else {
      // Si rôle sélectionné, seulement les services qui ont ce rôle
      const roleFiltered = searchFiltered.filter(user => user.role === selectedRole);
      availableServicesForRole = [...new Set(roleFiltered.map(user => user.service).filter(Boolean))].sort();
    }

    return {
      services: availableServicesForRole,
      roles: availableRolesForFilter
    };
  };

  const { services: availableServicesForFilter, roles: availableRolesForFilter } = getAvailableOptions();

  // Données pour les graphiques (filtrées selon les utilisateurs sélectionnés)
  const userIds = filteredUsers.map(u => u.id);
  const filteredDashboardData = data.dashboardJour.filter(item => 
    userIds.includes(item.utilisateur_id)
  );

  // Adapter les données du graphique selon la période sélectionnée
  const getChartData = () => {
    if (filteredDashboardData.length === 0) return [];
    
    switch (period) {
      case 'jour':
        // Par heure pour le jour
        const hourlyData = filteredDashboardData.reduce((acc, item: any) => {
          const hour = new Date(item.jour_local).getHours();
          const key = `${hour}h`;
          if (!acc[key]) {
            acc[key] = { heure: key, retard: 0, travailNet: 0, count: 0 };
          }
          acc[key].retard += item.retard_minutes || 0;
          acc[key].travailNet += item.travail_net_minutes || 0;
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, any>);
        
        return Object.values(hourlyData).map((item: any) => ({
          jour: item.heure,
          retard: item.retard,
          travailNet: item.travailNet
        }));
        
      case 'semaine':
        // Par jour pour la semaine
        return filteredDashboardData.map((item: any) => ({
          jour: new Date(item.jour_local).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
          retard: item.retard_minutes || 0,
          travailNet: item.travail_net_minutes || 0
        }));
        
      case 'mois':
        // Par semaine pour le mois
        const weeklyData = filteredDashboardData.reduce((acc, item: any) => {
          const date = new Date(item.jour_local);
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          const key = `Semaine ${weekNumber}`;
          if (!acc[key]) {
            acc[key] = { semaine: key, retard: 0, travailNet: 0, count: 0 };
          }
          acc[key].retard += item.retard_minutes || 0;
          acc[key].travailNet += item.travail_net_minutes || 0;
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, any>);
        
        return Object.values(weeklyData).map((item: any) => ({
          jour: item.semaine,
          retard: item.retard,
          travailNet: item.travailNet
        }));
        
      case 'annee':
        // Par mois pour l'année
        const monthlyData = filteredDashboardData.reduce((acc, item: any) => {
          const month = new Date(item.jour_local).getMonth();
          const monthName = new Date(0, month).toLocaleDateString('fr-FR', { month: 'short' });
          if (!acc[monthName]) {
            acc[monthName] = { mois: monthName, retard: 0, travailNet: 0, count: 0 };
          }
          acc[monthName].retard += item.retard_minutes || 0;
          acc[monthName].travailNet += item.travail_net_minutes || 0;
          acc[monthName].count += 1;
          return acc;
        }, {} as Record<string, any>);
        
        return Object.values(monthlyData).map((item: any) => ({
          jour: item.mois,
          retard: item.retard,
          travailNet: item.travailNet
        }));
        
      default:
        return filteredDashboardData.map((item: any) => ({
          jour: new Date(item.jour_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          retard: item.retard_minutes || 0,
          travailNet: item.travail_net_minutes || 0
        }));
    }
  };

  // Nouvelle fonction pour obtenir les données de graphique depuis le bundle KPI
  const getKPIChartData = () => {
    if (!data.kpiBundle?.utilisateurs) {
      return null;
    }

    const filteredUserIds = filteredUsers.map(u => u.id);
    const filteredUtilisateursKPIs = data.kpiBundle.utilisateurs.filter(u => 
      filteredUserIds.includes(u.utilisateur_id)
    );

    if (filteredUtilisateursKPIs.length === 0) {
      return null;
    }

    // Grouper par utilisateur pour le graphique
    return filteredUtilisateursKPIs.map((userKPI: any) => ({
      nom: userKPI.nom || userKPI.prenom || 'Utilisateur',
      retard: userKPI.retard_minutes || 0,
      travailNet: userKPI.travail_net_minutes || 0,
      pause: userKPI.pause_total_minutes || 0
    }));
  };

  // Fonction pour obtenir les données d'arrivée depuis le bundle KPI
  const getKPIArrivalData = () => {
    if (!data.kpiBundle?.utilisateurs) {
      return null;
    }

    const filteredUserIds = filteredUsers.map(u => u.id);
    const filteredUtilisateursKPIs = data.kpiBundle.utilisateurs.filter(u => 
      filteredUserIds.includes(u.utilisateur_id)
    );

    if (filteredUtilisateursKPIs.length === 0) {
      return null;
    }

    // Calculer les buckets de retard
    const arrivalData = filteredUtilisateursKPIs.reduce((acc, userKPI) => {
      const retard = userKPI.retard_minutes || 0;
      let bucket = '0';
      if (retard > 0 && retard <= 5) bucket = '1-5';
      else if (retard > 5 && retard <= 10) bucket = '6-10';
      else if (retard > 10) bucket = '10+';
      
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { time: '0', count: arrivalData['0'] || 0 },
      { time: '1-5', count: arrivalData['1-5'] || 0 },
      { time: '6-10', count: arrivalData['6-10'] || 0 },
      { time: '10+', count: arrivalData['10+'] || 0 }
    ];
  };

  const chartData = getChartData();
  const kpiChartData = getKPIChartData();
  const kpiArrivalData = getKPIArrivalData();

  const occupationData = filteredUsers
    .filter(u => u.status === 'Entré' || u.status === 'En pause')
    .reduce((acc, user) => {
      const lieu = user.lieux || 'Non défini';
      acc[lieu] = (acc[lieu] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  let totalUsers = 0;
  for (const count of Object.values(occupationData)) {
    totalUsers += count as number;
  }
  
  const occupationChartData = Object.entries(occupationData).map(([lieu, count]) => {
    const percentage = totalUsers > 0 ? Math.round((count as number) / totalUsers * 100) : 0;
    return {
      name: `${lieu} (${count} - ${percentage}%)`,
      value: count,
      percentage: percentage,
      color: lieuxColors[lieu] || '#F0F0F2' // Utiliser la couleur personnalisée ou la couleur par défaut
    };
  });

  const arrivalData = filteredDashboardData.reduce((acc, item) => {
    const retard = item.retard_minutes || 0;
    let bucket = '0';
    if (retard > 0 && retard <= 5) bucket = '1-5';
    else if (retard > 5 && retard <= 10) bucket = '6-10';
    else if (retard > 10) bucket = '10+';
    
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const arrivalChartData = [
    { time: '0', count: arrivalData['0'] || 0 },
    { time: '1-5', count: arrivalData['1-5'] || 0 },
    { time: '6-10', count: arrivalData['6-10'] || 0 },
    { time: '10+', count: arrivalData['10+'] || 0 }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: colors.background 
      }}>
        <div style={{ fontSize: 18, color: colors.text }}>Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.background,
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {/* Header */}
      <div style={{
        background: colors.primary,
        color: 'white',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            ← Retour
          </button>
                     <div>
             <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
               Tableau de bord — Présences & Retards
             </h1>
             <div style={{ 
               marginTop: 4, 
               fontSize: 14, 
               opacity: 0.9,
               fontWeight: 500
             }}>
               {getPeriodLabel()}
             </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600
          }}>
            Exporter
          </button>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}>
            👥
          </div>
        </div>
      </div>

             {/* Filtres */}
       <div style={{
         background: 'white',
         padding: '16px 24px',
         margin: '16px 24px',
         borderRadius: 12,
         boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
       }}>
         <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
           <span style={{ fontWeight: 600, color: colors.text }}>Période :</span>
           {['Jour', 'Semaine', 'Mois', 'Année'].map((p) => (
             <button
               key={p}
               onClick={() => {
                 setPeriod(p.toLowerCase() as any);
                 // Réinitialiser les sous-filtres lors du changement de période
                 setSelectedWeek(0);
                 setSelectedMonth(0);
                 // Réinitialiser l'année si on change de période
                 if (p.toLowerCase() !== 'annee') {
                   setSelectedYear(new Date().getFullYear());
                 }
               }}
               style={{
                 background: period === p.toLowerCase() ? colors.primary : 'white',
                 color: period === p.toLowerCase() ? 'white' : colors.text,
                 border: `1px solid ${colors.primary}`,
                 padding: '8px 16px',
                 borderRadius: 8,
                 cursor: 'pointer',
                 fontSize: 14,
                 fontWeight: 600
               }}
             >
               {p}
             </button>
           ))}
           
           {/* Sous-filtres selon la période */}
           {period === 'semaine' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, color: colors.textLight }}>Semaine :</span>
               <select
                 value={selectedWeek}
                 onChange={(e) => setSelectedWeek(Number(e.target.value))}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13
                 }}
               >
                 <option value={0}>Cette semaine</option>
                 <option value={-1}>Semaine précédente</option>
                 <option value={-2}>Il y a 2 semaines</option>
                 <option value={-3}>Il y a 3 semaines</option>
                 <option value={-4}>Il y a 4 semaines</option>
               </select>
             </div>
           )}
           
           {period === 'mois' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, color: colors.textLight }}>Mois :</span>
               <select
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(Number(e.target.value))}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13
                 }}
               >
                 <option value={0}>Ce mois</option>
                 <option value={-1}>Mois précédent</option>
                 <option value={-2}>Il y a 2 mois</option>
                 <option value={-3}>Il y a 3 mois</option>
                 <option value={-6}>Il y a 6 mois</option>
               </select>
             </div>
           )}
           
           {period === 'annee' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, color: colors.textLight }}>Année :</span>
               <select
                 value={selectedYear}
                 onChange={(e) => setSelectedYear(Number(e.target.value))}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13
                 }}
               >
                 {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                   <option key={year} value={year}>
                     {year === new Date().getFullYear() ? `${year} (actuelle)` : year}
                   </option>
                 ))}
               </select>
             </div>
           )}
          
          <select
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              // Réinitialiser le rôle si le service change
              if (e.target.value !== selectedService) {
                setSelectedRole('');
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          >
            <option value="">Tous les services</option>
            {availableServicesForFilter.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              // Réinitialiser le service si le rôle change
              if (e.target.value !== selectedRole) {
                setSelectedService('');
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          >
            <option value="">Tous les rôles</option>
            {availableRolesForFilter.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Recherche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14,
              minWidth: 200
            }}
          />
          
          {/* Bouton discret pour actualiser les KPIs */}
          <button
            onClick={() => fetchKPIData()}
            disabled={kpiLoading}
            style={{
              background: colors.primary,
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: kpiLoading ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
              opacity: kpiLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Actualiser les données KPI depuis la base de données"
          >
            {kpiLoading ? '🔄' : '📊'} KPIs
          </button>
        </div>
      </div>

             {/* Section des KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        margin: '0 24px 24px',
        maxWidth: '1200px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        {/* Indicateur de chargement des KPIs */}
        {kpiLoading && (
          <div style={{
            background: colors.background,
            border: `2px solid ${colors.primary}`,
            padding: 24,
            borderRadius: 12,
            textAlign: 'center',
            gridColumn: '1 / -1'
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
            <div style={{ fontSize: 14, color: colors.textLight }}>Chargement des KPIs...</div>
          </div>
        )}

        {/* Affichage des erreurs KPI */}
        {kpiError && (
          <div style={{
            background: '#fee',
            border: '2px solid #f44336',
            padding: 16,
            borderRadius: 12,
            textAlign: 'center',
            gridColumn: '1 / -1',
            color: '#d32f2f'
          }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>⚠️ Erreur KPI</div>
            <div style={{ fontSize: 14, marginBottom: 12 }}>{kpiError}</div>
            <button 
              onClick={() => fetchKPIData()}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Note sur la priorité des données */}
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          padding: 12,
          borderRadius: 8,
          textAlign: 'center',
          gridColumn: '1 / -1',
          fontSize: 12,
          color: '#856404'
        }}>
          <strong>Priorité des données:</strong> Les fonctions SQL sont utilisées en priorité si disponibles, sinon fallback vers les données dashboard.
        </div>

        {/* KPIs spécifiques au jour en cours */}
        {period === 'jour' ? (
           // KPIs temps réel uniquement pour la période "jour"
           <>
             <div style={{
               background: colors.primary,
               color: 'white',
               padding: 24,
               borderRadius: 12,
               textAlign: 'center',
               boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
               position: 'relative'
             }}>
               <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
               <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.presents}</div>
               <div style={{ fontSize: 14, opacity: 0.9 }}>Présents maintenant</div>
               <div style={{ 
                 position: 'absolute', 
                 top: 8, 
                 right: 8, 
                 width: 8, 
                 height: 8, 
                 borderRadius: '50%', 
                 background: '#4caf50',
                 animation: 'pulse 2s infinite'
               }} />
             </div>

             <div style={{
               background: colors.primary,
               color: 'white',
               padding: 24,
               borderRadius: 12,
               textAlign: 'center',
               boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
               position: 'relative'
             }}>
               <div style={{ fontSize: 48, marginBottom: 8 }}>⏸</div>
               <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.enPause}</div>
               <div style={{ fontSize: 14, opacity: 0.9 }}>En pause maintenant</div>
               <div style={{ 
                 position: 'absolute', 
                 top: 8, 
                 right: 8, 
                 width: 8, 
                 height: 8, 
                 borderRadius: '50%', 
                 background: '#ff9800',
                 animation: 'pulse 2s infinite'
               }} />
             </div>
           </>
         ) : null}

         {/* KPIs communs à toutes les périodes */}
         <div style={{
           background: colors.primary,
           color: 'white',
           padding: 24,
           borderRadius: 12,
           textAlign: 'center',
           boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
           position: 'relative'
         }}>
           <div style={{ fontSize: 48, marginBottom: 8 }}>⏰</div>
           <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.retardCumule}</div>
           <div style={{ fontSize: 14, opacity: 0.9 }}>Retard cumulé (min)</div>
         </div>

         <div style={{
           background: colors.primary,
           color: 'white',
           padding: 24,
           borderRadius: 12,
           textAlign: 'center',
           boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
           position: 'relative'
         }}>
           <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
           <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.travailNetMoyen}</div>
           <div style={{ fontSize: 14, opacity: 0.9 }}>Travail net moyen (min)</div>
         </div>

         {period !== 'jour' && (
           <>
             <div style={{
               background: colors.primary,
               color: 'white',
               padding: 24,
               borderRadius: 12,
               textAlign: 'center',
               boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
               position: 'relative'
             }}>
               <div style={{ fontSize: 48, marginBottom: 8 }}>📅</div>
               <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{calculateJoursAvecDonnees()}</div>
               <div style={{ fontSize: 14, opacity: 0.9 }}>Jours avec données</div>
             </div>

             <div style={{
               background: colors.primary,
               color: 'white',
               padding: 24,
               borderRadius: 12,
               textAlign: 'center',
               boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
               position: 'relative'
             }}>
               <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
               <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.tauxPonctualite}</div>
               <div style={{ fontSize: 14, opacity: 0.9 }}>Taux de ponctualité (%)</div>
             </div>
           </>
         )}
       </div>

       {/* Debug info pour les KPIs SQL - Version simplifiée */}
       {data.kpiBundle && (
         <div style={{
           background: '#f8f9fa',
           border: '1px solid #dee2e6',
           borderRadius: 8,
           padding: 12,
           margin: '0 24px 16px',
           fontSize: 11,
           color: colors.textLight,
           textAlign: 'center'
         }}>
           <strong>Données SQL:</strong> 
           {data.kpiBundle.global ? ' ✅ Global' : ' ❌ Global'} | 
           {data.kpiBundle.utilisateurs && data.kpiBundle.utilisateurs.length > 0 ? `✅ Utilisateurs (${data.kpiBundle.utilisateurs.length})` : ' ❌ Utilisateurs'} | 
           {data.kpiBundle.metadata ? ' ✅ Metadata' : ' ❌ Metadata'}
         </div>
       )}

      {/* Indicateur de dernière mise à jour */}
      <div style={{
        textAlign: 'center',
        padding: '8px 24px',
        color: colors.textLight,
        fontSize: 12
      }}>
        Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')} | 
        <button 
          onClick={() => {
            fetchData(true);
            fetchKPIData();
          }}
          disabled={refreshing || kpiLoading}
          style={{
            background: 'none',
            border: 'none',
            color: (refreshing || kpiLoading) ? colors.textLight : colors.primary,
            textDecoration: 'underline',
            cursor: (refreshing || kpiLoading) ? 'not-allowed' : 'pointer',
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {(refreshing || kpiLoading) ? (
            <>
              <div style={{ 
                width: 12, 
                height: 12, 
                border: '2px solid #ccc', 
                borderTop: `2px solid ${colors.primary}`, 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
              Actualisation...
            </>
          ) : (
            'Actualiser maintenant'
          )}
        </button>
      </div>

      {/* Contenu principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24,
        padding: '0 24px 24px'
      }}>
                 {/* Statuts en direct - Uniquement pour la période "jour" */}
         {period === 'jour' && (
           <div style={{
             background: 'white',
             borderRadius: 12,
             padding: 24,
             boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
           }}>
             <div style={{ 
               display: 'flex', 
               justifyContent: 'space-between', 
               alignItems: 'center', 
               marginBottom: 16 
             }}>
               <h3 style={{ margin: 0, color: colors.text, fontSize: 18, fontWeight: 600 }}>
                 Status en direct ({filteredUsers.length} utilisateurs)
               </h3>
               <div style={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: 8,
                 fontSize: 12,
                 color: colors.textLight
               }}>
                 <div style={{ 
                   width: 8, 
                   height: 8, 
                   borderRadius: '50%', 
                   background: '#4caf50',
                   animation: 'pulse 2s infinite'
                 }} />
                 Temps réel
               </div>
             </div>
             <div style={{ 
               display: 'flex',
               flexDirection: 'column',
               gap: 12,
               maxHeight: 400,
               overflowY: 'auto',
               paddingRight: 8
             }}>
               {filteredUsers.map((user, index) => (
                 <div key={user.id || index} style={{
                   border: '1px solid #e0e0e0',
                   borderRadius: 12,
                   padding: 16,
                   boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                   background: '#fff',
                   display: 'flex',
                   alignItems: 'center',
                   gap: 16,
                   transition: 'box-shadow 0.2s',
                   marginBottom: 8,
                 }}>
                   {user.avatar ? (
                     <img src={user.avatar} alt="avatar" style={{ 
                       width: 48, 
                       height: 48, 
                       borderRadius: '50%', 
                       objectFit: 'cover', 
                       border: '2px solid #1976d2',
                       boxShadow: '0 2px 8px rgba(25,118,210,0.15)'
                     }} />
                   ) : (
                     <div style={{ 
                       width: 48, 
                       height: 48, 
                       borderRadius: '50%', 
                       background: '#f4f6fa', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center', 
                       fontSize: 20, 
                       color: '#bbb', 
                       border: '2px solid #1976d2',
                       boxShadow: '0 2px 8px rgba(25,118,210,0.15)'
                     }}>
                       👤
                     </div>
                   )}
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4, color: colors.text }}>
                       {user.prenom} {user.nom}
                     </div>
                     <div style={{ color: '#555', fontSize: 14, marginBottom: 2 }}>
                       {user.service}
                     </div>
                     {user.lieux && (
                       <div style={{ fontSize: 12, color: '#888' }}>
                         {user.lieux}
                       </div>
                     )}
                   </div>
                   <div style={{ 
                     display: 'flex',
                     alignItems: 'center',
                     gap: 8,
                     padding: '8px 12px',
                     borderRadius: 8,
                     background: user.status === 'Entré' ? 'rgba(76, 175, 80, 0.1)' : 
                                user.status === 'En pause' ? 'rgba(255, 152, 0, 0.1)' : 
                                user.status === 'Sorti' ? 'rgba(244, 67, 54, 0.1)' :
                                'rgba(204, 204, 204, 0.1)',
                     border: `1px solid ${user.status === 'Entré' ? '#4caf50' : 
                                        user.status === 'En pause' ? '#ff9800' : 
                                        user.status === 'Sorti' ? '#f44336' : '#cccccc'}`
                   }}>
                     <div style={{
                       width: 8,
                       height: 8,
                       borderRadius: '50%',
                       backgroundColor: user.status === 'Entré' ? '#4caf50' : 
                                      user.status === 'En pause' ? '#ff9800' : 
                                      user.status === 'Sorti' ? '#f44336' : '#cccccc'
                     }} />
                     <span style={{ 
                       fontSize: 14,
                       fontWeight: 600,
                       color: user.status === 'Entré' ? '#4caf50' : 
                              user.status === 'En pause' ? '#ff9800' : 
                              user.status === 'Sorti' ? '#f44336' : '#cccccc'
                     }}>
                       {user.status === 'Entré' ? 'Présent' : 
                        user.status === 'En pause' ? 'En pause' :
                        user.status === 'Sorti' ? 'Sorti' : 
                        (user.status || 'Non badgé')}
                     </span>
                   </div>
                 </div>
               ))}
               {filteredUsers.length === 0 && (
                 <div style={{ 
                   textAlign: 'center', 
                   color: colors.textLight, 
                   padding: '20px',
                   fontSize: 14 
                 }}>
                   Aucun utilisateur trouvé avec les filtres actuels
                 </div>
               )}
             </div>
           </div>
         )}

        {/* Anomalies */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
            Anomalies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.anomalies.slice(0, 6).map((anomalie, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 8,
                borderRadius: 6,
                background: '#fff3cd',
                border: '1px solid #ffeaa7'
              }}>
                <span style={{ fontSize: 16, color: '#856404' }}>⚠️</span>
                <div style={{ flex: 1, fontSize: 14, color: '#856404' }}>
                  {anomalie.anomalie || 'Anomalie détectée'}
                </div>
                <div style={{ fontSize: 12, color: '#856404' }}>
                  {new Date(anomalie.date_heure).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
            {data.anomalies.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: colors.textLight, 
                padding: '20px',
                fontSize: 14 
              }}>
                Aucune anomalie détectée
              </div>
            )}
          </div>
        </div>

        {/* Graphique Retards & travail - Affichage conditionnel selon la période */}
        {(period === 'jour' || period === 'semaine' || period === 'mois' || period === 'annee') && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
              Retards & travail — tendances
              {kpiChartData && (
                <span style={{ fontSize: 12, color: colors.primary, marginLeft: 8, fontWeight: 400 }}>
                  (SQL)
                </span>
              )}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={kpiChartData || chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="retard" stroke="#ff9800" name="Retard (min)" />
                <Line type="monotone" dataKey="travailNet" stroke={colors.primary} name="Travail net (min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

                                   {/* Occupation par lieu - Uniquement pour la période "jour" */}
          {period === 'jour' && (
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
                Occupation par lieu
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={occupationChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {occupationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${value} utilisateurs (${props.payload.percentage}%)`,
                      props.payload.name.split(' (')[0]
                    ]}
                  />
                  <Legend 
                    formatter={(value: any, entry: any) => {
                      const data = entry.payload;
                      return `${data.name.split(' (')[0]} - ${data.value} (${data.percentage}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

                 {/* Arrivées vs horaire - Uniquement pour la période "jour" */}
         {(period === 'jour' || period === 'semaine' || period === 'mois' || period === 'annee') && (
           <div style={{
             background: 'white',
             borderRadius: 12,
             padding: 24,
             boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
           }}>
             <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
               Arrivées vs. horaire
               {kpiArrivalData && (
                 <span style={{ fontSize: 12, color: colors.primary, marginLeft: 8, fontWeight: 400 }}>
                   (SQL)
                 </span>
               )}
             </h3>
             <ResponsiveContainer width="100%" height={200}>
               <BarChart data={kpiArrivalData || arrivalChartData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="time" />
                 <Tooltip />
                 <Bar dataKey="count" fill={colors.primary} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
