import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { supabaseAPI } from '../../supabase.config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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
    // Performance metrics based on contract hours
    performancePourcentage?: number | null;
    heuresAttendues?: number;
    ecartMinutes?: number;
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
      tauxPonctualite: 0,
      performancePourcentage: null,
      heuresAttendues: undefined,
      ecartMinutes: undefined
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee' | 'année'>('jour');
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = semaine actuelle, -1 = semaine précédente, etc.
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = mois actuel, -1 = mois précédent, etc.
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedService, setSelectedService] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [lieuxColors, setLieuxColors] = useState<Record<string, string>>({});
  const [selectedUserForKPIDetails, setSelectedUserForKPIDetails] = useState<any>(null);
  const [showKPIDetailsPopup, setShowKPIDetailsPopup] = useState(false);
  
  // New state for dynamic filter options
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{value: number, label: string}[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<{value: number, label: string}[]>([]);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  // TODO: Cache des avatars pour éviter de les recharger (à implémenter plus tard)
  // const [avatarCache, setAvatarCache] = useState<{[key: string]: string}>({});
  
  // Cache simple des liens d'avatars
  const [avatarLinks, setAvatarLinks] = useState<{[key: string]: string}>({});

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
    
    console.log(`getDateRangeForPeriod - period: ${period}, selectedYear: ${selectedYear}, currentYear: ${currentYear}`);
    
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'jour':
        // Pour le jour, utiliser la date actuelle (pas selectedYear)
        startDate = new Date(now);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        break;
        
      case 'semaine':
        // Calculer le début de la semaine (lundi) pour la semaine ISO sélectionnée
        if (selectedWeek === 0) {
          // Semaine actuelle
          const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Si dimanche, lundi = -6, sinon 1 - currentDay
          const mondayOfCurrentWeek = new Date(currentYear, currentMonth, currentDate + mondayOffset);
          startDate = new Date(mondayOfCurrentWeek);
          endDate = new Date(mondayOfCurrentWeek);
          endDate.setDate(mondayOfCurrentWeek.getDate() + 7);
        } else {
          // Semaine ISO spécifique - toujours dans l'année actuelle
          const targetWeek = selectedWeek;
          const targetYear = currentYear; // Toujours utiliser l'année actuelle
          // Calculer le premier jour de l'année
          const yearStart = new Date(targetYear, 0, 1);
          // Trouver le premier lundi de l'année
          const firstMonday = new Date(yearStart);
          const firstMondayDay = yearStart.getDay();
          const daysToAdd = firstMondayDay === 0 ? 1 : (8 - firstMondayDay);
          firstMonday.setDate(yearStart.getDate() + daysToAdd);
          // Calculer le début de la semaine cible
          const weekStart = new Date(firstMonday);
          weekStart.setDate(firstMonday.getDate() + (targetWeek - 1) * 7);
          startDate = new Date(weekStart);
          endDate = new Date(weekStart);
          endDate.setDate(weekStart.getDate() + 7);
        }
        break;
        
      case 'mois':
        // Utiliser le mois spécifique sélectionné mais toujours dans l'année actuelle
        // Si selectedMonth est 0 (Ce mois), utiliser le mois actuel
        const monthToUse = selectedMonth === 0 ? currentMonth + 1 : selectedMonth;
        const firstDayOfSelectedMonth = new Date(currentYear, monthToUse - 1, 1); // monthToUse est 1-12
        startDate = new Date(firstDayOfSelectedMonth);
        endDate = new Date(currentYear, monthToUse, 1); // Mois suivant
        break;
        
      case 'annee':
        // Pour l'année, utiliser l'année sélectionnée
        startDate = new Date(selectedYear, 0, 1); // 1er janvier
        endDate = new Date(selectedYear + 1, 0, 1); // 1er janvier de l'année suivante
        console.log(`Cas année - selectedYear: ${selectedYear}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
        break;
        
      case 'année':
        // Pour l'année, utiliser l'année sélectionnée (avec accent)
        startDate = new Date(selectedYear, 0, 1); // 1er janvier
        endDate = new Date(selectedYear + 1, 0, 1); // 1er janvier de l'année suivante
        console.log(`Cas année (avec accent) - selectedYear: ${selectedYear}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
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
      
      console.log(`fetchKPIData - period: ${period}, selectedYear: ${selectedYear}, selectedMonth: ${selectedMonth}, selectedWeek: ${selectedWeek}`);
      
      const { startDate, endDate } = getDateRangeForPeriod();
      
      let kpiData: any;
      
      // Déterminer quelle fonction SQL utiliser selon la période
      switch (period) {
        case 'jour':
          // Utiliser appbadge_kpi_bundle_between avec start_date = aujourd'hui et end_date = aujourd'hui + 1
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            endDate.toISOString().split('T')[0]
          );
          break;
        case 'semaine':
          if (selectedWeek === 0) {
            // Semaine actuelle
            const weekNumber = getISOWeekNumber(startDate);
            kpiData = await supabaseAPI.getKPIBundleISOWeek(new Date().getFullYear(), weekNumber);
          } else {
            // Semaine ISO spécifique - toujours dans l'année actuelle
            kpiData = await supabaseAPI.getKPIBundleISOWeek(new Date().getFullYear(), selectedWeek);
          }
          break;
        case 'mois':
          // Toujours utiliser l'année actuelle pour les mois
          // Si selectedMonth est 0 (Ce mois), utiliser le mois actuel
          const monthToUse = selectedMonth === 0 ? new Date().getMonth() + 1 : selectedMonth;
          kpiData = await supabaseAPI.getKPIBundleMonth(new Date().getFullYear(), monthToUse);
          break;
        case 'annee':
          // Utiliser appbadge_kpi_bundle_between avec les dates de début et fin d'année
          // startDate = 1er janvier, endDate = 1er janvier de l'année suivante
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            endDate.toISOString().split('T')[0]
          );
          break;
        case 'année':
          // Utiliser appbadge_kpi_bundle_between avec les dates de début et fin d'année (avec accent)
          // startDate = 1er janvier, endDate = 1er janvier de l'année suivante
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            endDate.toISOString().split('T')[0]
          );
          break;
        default:
          kpiData = await supabaseAPI.getKPIBundleBetween(
            startDate.toISOString().split('T')[0], 
            startDate.toISOString().split('T')[0]
          );
      }
      
      console.log(`KPIs récupérés pour la période ${period}:`, kpiData);
      console.log(`Dates utilisées - startDate: ${startDate.toISOString().split('T')[0]}, endDate: ${endDate.toISOString().split('T')[0]}`);
      
      // Traitement des données KPI
      if (kpiData && kpiData.length > 0) {
        const kpiStructure = kpiData[0];
        console.log('Structure KPI traitée:', kpiStructure);
        
        // Mettre à jour les données du dashboard
        setData(prevData => ({
          ...prevData,
          kpiBundle: {
            global: kpiStructure.global || {},
            utilisateurs: kpiStructure.users || kpiStructure.utilisateurs || [],
            metadata: kpiStructure.meta || kpiStructure.metadata || {}
          }
        }));
        
        // TODO: Charger les avatars des utilisateurs plus tard
        // if (kpiStructure.users || kpiStructure.utilisateurs) {
        //   loadUserAvatars(kpiStructure.users || kpiStructure.utilisateurs);
        // }
        
        // Charger les liens d'avatars des utilisateurs
        if (kpiStructure.users || kpiStructure.utilisateurs) {
          loadAvatarLinks(kpiStructure.users || kpiStructure.utilisateurs);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error);
      setKpiError(null); // Don't show error - just use dashboardJour data
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

  // New functions to fetch available filter options
  const fetchAvailableYears = async () => {
    try {
      // Skip if already loaded and not forcing refresh
      if (availableYears.length > 0 && !filterOptionsLoading) {
        console.log('Years already loaded, skipping fetch');
        return;
      }
      
      console.log('fetchAvailableYears called');
      setFilterOptionsLoading(true);
      // Fetch years from the last 5 years to current year
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
      
      // Test which years have data by calling the KPI function
      const yearsWithData: number[] = [];
      for (const year of years) {
        try {
          const result = await supabaseAPI.getKPIBundleYear(year);
          if (result && result.length > 0 && result[0].global && 
              (result[0].global.travail_total_minutes > 0 || result[0].global.travail_net_minutes > 0)) {
            yearsWithData.push(year);
          }
        } catch (error) {
          // Skip years that don't have data or cause errors
          continue;
        }
      }
      
      setAvailableYears(yearsWithData.length > 0 ? yearsWithData : [currentYear]);
      
      // Set current year as default if available
      if (yearsWithData.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else if (yearsWithData.length > 0) {
        setSelectedYear(yearsWithData[0]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des années disponibles:', error);
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  const fetchAvailableMonths = () => {
    const months = [
      { value: 1, label: 'Janvier' },
      { value: 2, label: 'Février' },
      { value: 3, label: 'Mars' },
      { value: 4, label: 'Avril' },
      { value: 5, label: 'Mai' },
      { value: 6, label: 'Juin' },
      { value: 7, label: 'Juillet' },
      { value: 8, label: 'Août' },
      { value: 9, label: 'Septembre' },
      { value: 10, label: 'Octobre' },
      { value: 11, label: 'Novembre' },
      { value: 12, label: 'Décembre' }
    ];
    setAvailableMonths(months);
    
    // Set current month as default only if no month is currently selected
    if (selectedMonth === 0) {
      const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11
      setSelectedMonth(currentMonth); // Set to current month by default
    }
  };

  const fetchAvailableWeeks = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentWeek = getISOWeekNumber(currentDate);
    
    // Generate weeks for the current year (typically 52-53 weeks)
    const weeks: {value: number, label: string}[] = [];
    for (let week = 1; week <= 53; week++) {
      // Calculate the start date of the week
      const yearStart = new Date(currentYear, 0, 1);
      const firstMonday = new Date(yearStart);
      const firstMondayDay = yearStart.getDay();
      const daysToAdd = firstMondayDay === 0 ? 1 : (8 - firstMondayDay);
      firstMonday.setDate(yearStart.getDate() + daysToAdd);
      
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekLabel = `Semaine ${week} (${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})`;
      
      weeks.push({
        value: week,
        label: weekLabel
      });
    }
    
    setAvailableWeeks(weeks);
    
    // Set current week as default only if no week is currently selected
    if (selectedWeek === 0) {
      setSelectedWeek(0); // Keep current week (0 means current week)
    }
  };

  // Function to refresh all filter options
  const refreshFilterOptions = async () => {
    await fetchAvailableYears();
    fetchAvailableMonths();
    fetchAvailableWeeks();
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
        setKpiError(null); // Don't show error for empty data
        return false;
      }
      
    } catch (error) {
      console.error('Erreur lors du test des fonctions SQL:', error);
      setKpiError(null); // Don't show error, just silently skip KPI bundle
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
        if (selectedWeek === 0) {
          const endDateWeek = new Date(endDate);
          endDateWeek.setDate(endDate.getDate() - 1);
          return `Semaine du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${endDateWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
          return `Semaine ${selectedWeek} - ${new Date().getFullYear()}`;
        }
        
      case 'mois':
        if (selectedMonth > 0) {
          const monthNames = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
          ];
          return `${monthNames[selectedMonth - 1]} ${new Date().getFullYear()}`;
        } else {
          // When selectedMonth is 0, show current month
          const currentMonth = new Date().getMonth();
          const monthNames = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
          ];
          return `${monthNames[currentMonth]} ${new Date().getFullYear()}`;
        }
        
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
        tauxPonctualite: filteredUtilisateursKPIs.length > 0 ? Math.round((countPonctuel / filteredUtilisateursKPIs.length) * 100) : 0,
        // Performance metrics from global KPI bundle
        performancePourcentage: globalKPIs.performance_pourcentage ?? null,
        heuresAttendues: globalKPIs.heures_attendues_minutes ? Math.round(globalKPIs.heures_attendues_minutes) : undefined,
        ecartMinutes: globalKPIs.ecart_minutes ? Math.round(globalKPIs.ecart_minutes) : undefined
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
      tauxPonctualite: Math.round(tauxPonctualite),
      // No performance metrics available without kpiBundle
      performancePourcentage: null,
      heuresAttendues: undefined,
      ecartMinutes: undefined
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

      // Le statut des utilisateurs est maintenant géré directement via l'abonnement temps réel sur appbadge_utilisateurs
      
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
    fetchAvailableMonths(); // Récupérer les mois disponibles
    fetchAvailableWeeks(); // Récupérer les semaines disponibles
    const interval = setInterval(() => {
      fetchData();
      fetchKPIData(); // Rafraîchir aussi les KPIs
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [period, selectedWeek, selectedMonth, selectedYear]);

  // Fetch available years only once on mount and when year changes
  useEffect(() => {
    fetchAvailableYears();
  }, [selectedYear]);

  // Reset month to current month when year changes to current year
  useEffect(() => {
    if (selectedYear === new Date().getFullYear()) {
      setSelectedMonth(new Date().getMonth() + 1);
    }
  }, [selectedYear]);

  // Reset week to current week when year changes to current year
  useEffect(() => {
    if (selectedYear === new Date().getFullYear()) {
      setSelectedWeek(0); // Reset to current week
    }
  }, [selectedYear]);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Format occupation data for chart
  const totalOccupation = Object.values(occupationData).reduce((sum: number, c: unknown) => sum + (c as number), 0) as number;
  const occupationChartData: Array<{lieu: string, count: number, percentage: number}> = Object.entries(occupationData)
    .map(([lieu, count]) => {
      const countNum = count as number;
      return {
        lieu,
        count: countNum,
        percentage: totalOccupation > 0 ? Math.round((countNum / totalOccupation) * 100) : 0
      };
    })
    .sort((a, b) => b.count - a.count);

  // Get colors for each location
  const getColorForLieu = (lieu: string) => {
    return lieuxColors[lieu] || '#3ba27c';
  };

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

  // TODO: Fonction pour charger et mettre en cache les avatars (à implémenter plus tard)
  // const loadUserAvatars = useCallback(async (users: any[]) => {
  //   // ... implémentation à venir
  // }, [avatarCache, supabase]);
  
  // Fonction simple pour charger les liens d'avatars
  const loadAvatarLinks = async (users: any[]) => {
    const newLinks: {[key: string]: string} = {};
    
    for (const user of users) {
      const userId = user.utilisateur_id || user.id;
      if (userId && !avatarLinks[userId]) {
        try {
          // Récupérer le lien de l'avatar depuis la table utilisateurs
          const { data: userData } = await supabase
            .from('appbadge_utilisateurs')
            .select('avatar')
            .eq('id', userId)
            .single();
          
          if (userData?.avatar) {
            newLinks[userId] = userData.avatar;
          }
        } catch (error) {
          console.log(`Pas d'avatar pour l'utilisateur ${userId}`);
        }
      }
    }
    
    if (Object.keys(newLinks).length > 0) {
      setAvatarLinks(prev => ({ ...prev, ...newLinks }));
    }
  };

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
               onClick={async () => {
                 setPeriod(p.toLowerCase() as any);
                 // Ne pas réinitialiser les sous-filtres lors du changement de période
                 // Garder les valeurs sélectionnées pour permettre la sélection d'autres périodes
                 if (p.toLowerCase() === 'annee') {
                   // Garder l'année sélectionnée ou utiliser l'année actuelle
                   if (!availableYears.includes(selectedYear)) {
                     setSelectedYear(new Date().getFullYear());
                   }
                   console.log(`Bouton Année cliqué - selectedYear: ${selectedYear}, availableYears:`, availableYears);
                 } else {
                   // Pour jour, semaine, mois - garder les valeurs actuelles
                   // L'utilisateur peut les changer manuellement
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
                 onChange={(e) => {
                   const newWeek = Number(e.target.value);
                   console.log('Week changed from', selectedWeek, 'to', newWeek);
                   setSelectedWeek(newWeek);
                 }}
                 disabled={filterOptionsLoading}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13,
                   opacity: filterOptionsLoading ? 0.6 : 1
                 }}
               >
                 {filterOptionsLoading ? (
                   <option>Chargement...</option>
                 ) : (
                   <>
                     <option value={0}>Cette semaine</option>
                     {availableWeeks.map(week => (
                       <option key={week.value} value={week.value}>
                         {week.label}
                       </option>
                     ))}
                   </>
                 )}
               </select>
               

             </div>
           )}
           
           {period === 'mois' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, color: colors.textLight }}>Mois :</span>
               <select
                 value={selectedMonth}
                 onChange={(e) => {
                   const newMonth = Number(e.target.value);
                   console.log('Month changed from', selectedMonth, 'to', newMonth);
                   setSelectedMonth(newMonth);
                 }}
                 disabled={filterOptionsLoading}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13,
                   opacity: filterOptionsLoading ? 0.6 : 1
                 }}
               >
                 {filterOptionsLoading ? (
                   <option>Chargement...</option>
                 ) : (
                   <>
                     <option value={0}>
                       Ce mois
                     </option>
                     {availableMonths.map(month => (
                       <option key={month.value} value={month.value}>
                         {month.label}
                       </option>
                     ))}
                   </>
                 )}
                 

               </select>
             </div>
           )}
           
           {period === 'annee' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, color: colors.textLight }}>Année :</span>
               <select
                 value={selectedYear}
                 onChange={(e) => setSelectedYear(Number(e.target.value))}
                 disabled={filterOptionsLoading}
                 style={{
                   padding: '6px 10px',
                   borderRadius: 6,
                   border: '1px solid #ddd',
                   fontSize: 13,
                   opacity: filterOptionsLoading ? 0.6 : 1
                 }}
               >
                 {filterOptionsLoading ? (
                   <option>Chargement...</option>
                 ) : (
                   availableYears.map(year => (
                     <option key={year} value={year}>
                       {year === new Date().getFullYear() ? `${year} (actuelle)` : year}
                     </option>
                   ))
                 )}
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
            onClick={async () => {
              await refreshFilterOptions();
              fetchKPIData();
            }}
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
            {kpiLoading ? '🔄' : '🔄'} Actualiser
          </button>
        </div>
      </div>

             {/* Section des KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        margin: '0 24px 24px',
        maxWidth: '1800px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>


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



        {/* KPIs spécifiques au jour en cours */}
        {period === 'jour' ? (
           // KPIs temps réel uniquement pour la période "jour"
           <>
            <div style={{
              background: colors.primary,
              color: 'white',
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>✓</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{kpis.presents}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Présents maintenant</div>
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
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>⏸</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{kpis.enPause}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>En pause maintenant</div>
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
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>⏰</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{kpis.retardCumule}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Retard cumulé (min)</div>
            </div>

        <div style={{
          background: colors.primary,
          color: 'white',
          padding: 16,
          borderRadius: 12,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
          position: 'relative'
        }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{kpis.travailNetMoyen}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Travail net moyen (min)</div>
        </div>

        {period !== 'jour' && (
          <>
            <div style={{
              background: colors.primary,
              color: 'white',
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>📅</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{calculateJoursAvecDonnees()}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Jours avec données</div>
            </div>

            <div style={{
              background: colors.primary,
              color: 'white',
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59,162,124,0.3)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>🎯</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{kpis.tauxPonctualite}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Taux de ponctualité (%)</div>
            </div>
          </>
        )}

       </div>



      {/* Indicateur de dernière mise à jour */}
      <div style={{
        textAlign: 'center',
        padding: '8px 24px',
        color: colors.textLight,
        fontSize: 12
      }}>
        Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
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



        {/* Graphique Top des retards - Remplacé le graphique "Retards & travail — tendances" */}
        {(period === 'jour' || period === 'semaine' || period === 'mois' || period === 'annee') && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
              Top des retards
              {data.kpiBundle?.utilisateurs && (
                <span style={{ fontSize: 12, color: colors.primary, marginLeft: 8, fontWeight: 400 }}>
                  (SQL)
                </span>
              )}
            </h3>
            
            {(() => {
              // Préparer les données pour le top des retards
              let topRetardsData: any[] = [];
              
              if (data.kpiBundle?.utilisateurs) {
                // Utiliser les données SQL si disponibles
                topRetardsData = data.kpiBundle.utilisateurs
                  .filter((user: any) => (user.retard_minutes || 0) > 0)
                  .map((user: any) => ({
                    nom: `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur',
                    retard: user.retard_minutes || 0,
                    service: user.service || 'Non défini',
                    lieu: user.lieu || 'Non défini'
                  }))
                  .sort((a: any, b: any) => b.retard - a.retard)
                  .slice(0, 10);
              } else if (filteredUsers.length > 0) {
                // Fallback sur les données utilisateurs filtrées
                topRetardsData = filteredUsers
                  .filter((user: any) => (user.retard_minutes || 0) > 0)
                  .map((user: any) => ({
                    nom: `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur',
                    retard: user.retard_minutes || 0,
                    service: user.service || 'Non défini',
                    lieu: user.lieu || 'Non défini'
                  }))
                  .sort((a: any, b: any) => b.retard - a.retard)
                  .slice(0, 10);
              }

              if (topRetardsData.length === 0) {
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    color: '#7f8c8d',
                    fontStyle: 'italic',
                    fontSize: '16px'
                  }}>
                    🎉 Aucun retard aujourd'hui ! Parfait !
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {topRetardsData.map((user, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      background: index === 0 ? '#fff3e0' : '#f8f9fa',
                      border: index === 0 ? '2px solid #ff9800' : '1px solid #e9ecef',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${index === 0 ? '#ff9800' : index === 1 ? '#ffc107' : index === 2 ? '#ff9800' : '#9e9e9e'}`
                    }}>
                      {/* Position */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: 'white',
                        background: index === 0 ? '#ff9800' : index === 1 ? '#ffc107' : index === 2 ? '#ff9800' : '#9e9e9e',
                        marginRight: '16px',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>

                      {/* Informations utilisateur */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '16px',
                          color: colors.text,
                          marginBottom: '4px'
                        }}>
                          {user.nom}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#7f8c8d',
                          display: 'flex',
                          gap: '16px'
                        }}>
                          <span>🏢 {user.service}</span>
                          <span>📍 {user.lieu}</span>
                        </div>
                      </div>

                      {/* Retard */}
                      <div style={{
                        textAlign: 'right',
                        marginLeft: '16px'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: index === 0 ? '#ff9800' : '#e74c3c'
                        }}>
                          {Math.floor(user.retard / 60)}h{(user.retard % 60).toString().padStart(2, '0')}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#7f8c8d'
                        }}>
                          {user.retard} min
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
              {occupationChartData.length === 0 ? (
                <div style={{ 
                  height: 200, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: 14
                }}>
                  Aucune occupation à afficher
                </div>
              ) : (
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={occupationChartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="lieu" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'Nombre d\'utilisateurs', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string, props: any) => [
                          `${value} utilisateur${value > 1 ? 's' : ''} (${props.payload.percentage}%)`,
                          'Occupation'
                        ]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Legend />
                      <Bar dataKey="count" name="Occupation" radius={[8, 8, 0, 0]}>
                        {occupationChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getColorForLieu(entry.lieu)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ 
                    marginTop: 16, 
                    fontSize: 12, 
                    color: '#666',
                    textAlign: 'center'
                  }}>
                    Total: {totalOccupation} utilisateur{totalOccupation > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}



        {/* Nouveaux graphiques avancés */}
        {/* Temporairement désactivé - travail en cours composant par composant */}
        {/*
        {data.kpiBundle && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            gridColumn: '1 / -1' // Prend toute la largeur
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: colors.text, fontSize: 20, fontWeight: 600 }}>
              📊 Graphiques avancés - {getPeriodLabel()}
            </h3>
            <ChartsContainer
              period={period}
              kpiData={data.kpiBundle}
              users={data.statutCourant}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeek}
              startDate={getDateRangeForPeriod().startDate}
              endDate={getDateRangeForPeriod().endDate}
              supabaseAPI={supabaseAPI}
            />
          </div>
        )}
        */}

        {/* UserKPIDeck - KPI par utilisateur pour toutes les périodes (cartes compactes) */}
        {data.kpiBundle?.utilisateurs && data.kpiBundle.utilisateurs.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
              📊 KPI par utilisateur - {getPeriodLabel()}
              {filteredUsers.length !== data.kpiBundle.utilisateurs.length && (
                <span style={{ fontSize: 14, color: '#666', fontWeight: 400, marginLeft: 8 }}>
                  ({filteredUsers.length} sur {data.kpiBundle.utilisateurs.length} utilisateurs)
                </span>
              )}
              <div style={{ fontSize: 12, color: '#888', fontWeight: 400, marginTop: 4 }}>
                Données KPI de la période : {period === 'jour' ? 'Jour' : period === 'semaine' ? 'Semaine' : period === 'mois' ? 'Mois' : 'Année'}
                {period === 'semaine' && selectedWeek > 0 && ` ${selectedWeek}`}
                {period === 'mois' && selectedMonth > 0 && ` ${selectedMonth}`}
                {period === 'annee' && ` ${selectedYear}`}
                {kpiLoading && (
                  <span style={{ color: '#1976d2', marginLeft: 8 }}>
                    🔄 Chargement...
                  </span>
                )}
              </div>
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {(() => {
                // Filtrer les utilisateurs KPI selon les mêmes critères que filteredUsers
                const filteredKPIs = data.kpiBundle.utilisateurs.filter((userKPI: any) => {
                  const userId = userKPI.utilisateur_id || userKPI.id;
                  const matchingUser = filteredUsers.find(u => u.id === userId);
                  
                  if (!matchingUser) return false;
                  
                  // Appliquer les mêmes filtres
                  const matchesSearch = searchTerm === '' || 
                    matchingUser.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    matchingUser.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    matchingUser.email?.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  const matchesService = selectedService === '' || matchingUser.service === selectedService;
                  const matchesRole = selectedRole === '' || matchingUser.role === selectedRole;
                  
                  return matchesSearch && matchesService && matchesRole;
                });
                
                // Log pour vérifier que les bonnes données sont utilisées
                console.log(`UserKPIDeck - Période: ${period}, Utilisateurs KPI filtrés:`, filteredKPIs.length, 'sur', data.kpiBundle.utilisateurs.length);
                
                return filteredKPIs
                  .filter((user: any) => user.utilisateur_id || user.id)
                  .map((user: any, index: number) => {
                    const userKPI = user;
                    const travailNet = userKPI.travail_net_minutes || 0;
                    const retard = userKPI.retard_minutes || 0;
                    const pause = userKPI.pause_total_minutes || 0;
                    const departAnticipe = userKPI.depart_anticipe_minutes || 0;
                    
                    // Calculer le score de performance (0-100)
                    const scorePerformance = Math.max(0, Math.min(100, 
                      Math.round((travailNet - retard - departAnticipe) / Math.max(travailNet, 1) * 100)
                    ));
                    
                    const getScoreColor = (score: number) => {
                      if (score >= 80) return '#4caf50'; // Green
                      if (score >= 60) return '#ff9800'; // Orange
                      return '#f44336'; // Red
                    };
                    
                    return (
                      <div key={userKPI.utilisateur_id || userKPI.id || index} 
                           style={{
                             border: '1px solid #e0e0e0',
                             borderRadius: 8,
                             padding: 12,
                             boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                             background: '#fff',
                             display: 'flex',
                             alignItems: 'center',
                             gap: 12,
                             transition: 'box-shadow 0.2s, transform 0.2s',
                             cursor: 'pointer',
                             marginBottom: 6,
                           }}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                             e.currentTarget.style.transform = 'translateY(-1px)';
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                             e.currentTarget.style.transform = 'translateY(0)';
                           }}
                           onClick={() => {
                             setSelectedUserForKPIDetails(userKPI);
                             setShowKPIDetailsPopup(true);
                           }}>
                        
                        {/* Avatar */}
                        {(() => {
                          const userId = userKPI.utilisateur_id || userKPI.id;
                          const avatarLink = userId ? avatarLinks[userId] : null;
                          
                          if (avatarLink) {
                            return (
                              <img src={avatarLink} alt="avatar" style={{ 
                                width: 36, 
                                height: 36, 
                                borderRadius: '50%', 
                                objectFit: 'cover', 
                                border: '1px solid #e0e0e0',
                                flexShrink: 0
                              }} />
                            );
                          } else {
                            return (
                              <div style={{ 
                                width: 36, 
                                height: 36, 
                                borderRadius: '50%', 
                                background: '#f4f6fa', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: 16, 
                                color: '#bbb', 
                                border: '1px solid #e0e0e0',
                                flexShrink: 0
                              }}>
                                👤
                              </div>
                            );
                          }
                        })()}
                        
                        {/* Informations utilisateur */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: 14,
                            marginBottom: 2, 
                            color: colors.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {userKPI.prenom || ''} {userKPI.nom || ''}
                          </div>
                          <div style={{ 
                            color: '#666', 
                            fontSize: 12,
                            marginBottom: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {userKPI.service || 'Service non défini'}
                          </div>
                          {userKPI.lieu && (
                            <div style={{ 
                              fontSize: 11,
                              color: '#999',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              📍 {userKPI.lieu}
                            </div>
                          )}
                        </div>
                        
                        {/* Indicateur de performance compact */}
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40, 
                          borderRadius: '50%',
                          background: getScoreColor(scorePerformance),
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold',
                          flexShrink: 0,
                          boxShadow: `0 2px 8px ${getScoreColor(scorePerformance)}40`
                        }}>
                          {scorePerformance}%
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
            
            {(() => {
              const filteredKPIs = data.kpiBundle.utilisateurs.filter((userKPI: any) => {
                const userId = userKPI.utilisateur_id || userKPI.id;
                const matchingUser = filteredUsers.find(u => u.id === userId);
                
                if (!matchingUser) return false;
                
                const matchesSearch = searchTerm === '' || 
                  matchingUser.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  matchingUser.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  matchingUser.email?.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesService = selectedService === '' || matchingUser.service === selectedService;
                const matchesRole = selectedRole === '' || matchingUser.role === selectedRole;
                
                return matchesSearch && matchesService && matchesRole;
              });
              
              if (filteredKPIs.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#666',
                    fontSize: 14
                  }}>
                    Aucun utilisateur ne correspond aux filtres sélectionnés
                  </div>
                );
              }
            })()}
          </div>
        )}
      </div>

      {/* Footer avec statut des données SQL */}
      {data.kpiBundle && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: 8,
          padding: 12,
          margin: '24px',
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

      {/* Popup détaillé des KPI utilisateur */}
      {showKPIDetailsPopup && selectedUserForKPIDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowKPIDetailsPopup(false)}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Bouton fermer */}
            <button 
              onClick={() => setShowKPIDetailsPopup(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}>
              ×
            </button>
            
            {/* En-tête du popup */}
            <div style={{
              textAlign: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              {(() => {
                const userId = selectedUserForKPIDetails.utilisateur_id || selectedUserForKPIDetails.id;
                const avatarLink = userId ? avatarLinks[userId] : null;
                
                if (avatarLink) {
                  return (
                    <img src={avatarLink} alt="avatar" style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #1976d2',
                      margin: '0 auto 12px auto',
                      boxShadow: '0 2px 8px rgba(25,118,210,0.2)'
                    }} />
                  );
                } else {
                  return (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#f4f6fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: '#bbb',
                      border: '2px solid #1976d2',
                      margin: '0 auto 12px auto',
                      boxShadow: '0 2px 8px rgba(25,118,210,0.2)'
                    }}>
                      👤
                    </div>
                  );
                }
              })()}
              <h2 style={{
                margin: '0 0 6px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text
              }}>
                {selectedUserForKPIDetails.prenom || ''} {selectedUserForKPIDetails.nom || ''}
              </h2>
              <div style={{
                fontSize: '13px',
                color: '#7f8c8d',
                marginBottom: '2px'
              }}>
                {selectedUserForKPIDetails.service || 'Service non défini'}
              </div>
              {selectedUserForKPIDetails.lieu && (
                <div style={{
                  fontSize: '11px',
                  color: '#95a5a6'
                }}>
                  📍 {selectedUserForKPIDetails.lieu}
                </div>
              )}
            </div>
            
            {/* KPIs détaillés - Taille ultra-compacte */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Travail net */}
              <div style={{
                background: '#e8f5e8',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                border: '1px solid #c8e6c9'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  marginBottom: '4px'
                }}>
                  {Math.floor((selectedUserForKPIDetails.travail_net_minutes || 0) / 60)}h{((selectedUserForKPIDetails.travail_net_minutes || 0) % 60).toString().padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#388e3c',
                  fontWeight: '500'
                }}>
                  Travail net
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#4caf50',
                  marginTop: '4px'
                }}>
                  {selectedUserForKPIDetails.travail_net_minutes || 0} min
                </div>
              </div>
              
              {/* Retard */}
              <div style={{
                background: (selectedUserForKPIDetails.retard_minutes || 0) > 0 ? '#ffebee' : '#f1f8e9',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                border: `1px solid ${(selectedUserForKPIDetails.retard_minutes || 0) > 0 ? '#ffcdd2' : '#c8e6c9'}`
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: (selectedUserForKPIDetails.retard_minutes || 0) > 0 ? '#c62828' : '#2e7d32',
                  marginBottom: '4px'
                }}>
                  {(selectedUserForKPIDetails.retard_minutes || 0) > 0 ? 
                    `+${Math.floor((selectedUserForKPIDetails.retard_minutes || 0) / 60)}h${((selectedUserForKPIDetails.retard_minutes || 0) % 60).toString().padStart(2, '0')}` : 
                    'À l\'heure'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: (selectedUserForKPIDetails.retard_minutes || 0) > 0 ? '#d32f2f' : '#388e3c',
                  fontWeight: '500'
                }}>
                  {(selectedUserForKPIDetails.retard_minutes || 0) > 0 ? 'Retard' : 'Ponctuel'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: (selectedUserForKPIDetails.retard_minutes || 0) > 0 ? '#f44336' : '#4caf50',
                  marginTop: '4px'
                }}>
                  {(selectedUserForKPIDetails.retard_minutes || 0) > 0 ? 
                    `${selectedUserForKPIDetails.retard_minutes || 0} min` : 
                    'Aucun retard'}
                </div>
              </div>
              
              {/* Pause */}
              <div style={{
                background: '#fff3e0',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                border: '1px solid #ffe0b2'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#ef6c00',
                  marginBottom: '4px'
                }}>
                  {Math.floor((selectedUserForKPIDetails.pause_total_minutes || 0) / 60)}h{((selectedUserForKPIDetails.pause_total_minutes || 0) % 60).toString().padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#f57c00',
                  fontWeight: '500'
                }}>
                  Pause totale
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#ff9800',
                  marginTop: '4px'
                }}>
                  {selectedUserForKPIDetails.pause_total_minutes || 0} min
                </div>
              </div>
              
              {/* Départ anticipé */}
              <div style={{
                background: (selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? '#ffebee' : '#f1f8e9',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                border: `1px solid ${(selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? '#ffcdd2' : '#c8e6c9'}`
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: (selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? '#c62828' : '#2e7d32',
                  marginBottom: '4px'
                }}>
                  {(selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? 
                    `-${Math.floor((selectedUserForKPIDetails.depart_anticipe_minutes || 0) / 60)}h${((selectedUserForKPIDetails.depart_anticipe_minutes || 0) % 60).toString().padStart(2, '0')}` : 
                    'Normal'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: (selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? '#d32f2f' : '#388e3c',
                  fontWeight: '500'
                }}>
                  {(selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? 'Départ anticipé' : 'Départ normal'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: (selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? '#f44336' : '#4caf50',
                  marginTop: '4px'
                }}>
                  {(selectedUserForKPIDetails.depart_anticipe_minutes || 0) > 0 ? 
                    `${selectedUserForKPIDetails.depart_anticipe_minutes || 0} min` : 
                    'Aucun départ anticipé'}
                </div>
              </div>
            </div>
            
            {/* Score de performance détaillé */}
            <div style={{
              background: '#f8f9fa',
              padding: '16px',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: colors.text
              }}>
                Score de Performance Global
              </h3>
              
              {(() => {
                const travailNet = selectedUserForKPIDetails.travail_net_minutes || 0;
                const retard = selectedUserForKPIDetails.retard_minutes || 0;
                const departAnticipe = selectedUserForKPIDetails.depart_anticipe_minutes || 0;
                const scorePerformance = Math.max(0, Math.min(100, 
                  Math.round((travailNet - retard - departAnticipe) / Math.max(travailNet, 1) * 100)
                ));
                
                const getScoreColor = (score: number) => {
                  if (score >= 80) return '#4caf50';
                  if (score >= 60) return '#ff9800';
                  return '#f44336';
                };
                
                const getScoreIcon = (score: number) => {
                  if (score >= 80) return '🟢';
                  if (score >= 60) return '🟡';
                  return '🔴';
                };
                
                return (
                  <>
                    <div style={{
                      fontSize: '28px',
                      marginBottom: '8px'
                    }}>
                      {getScoreIcon(scorePerformance)}
                    </div>
                    <div style={{
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: getScoreColor(scorePerformance),
                      marginBottom: '8px'
                    }}>
                      {scorePerformance}%
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#7f8c8d',
                      marginBottom: '12px'
                    }}>
                      {scorePerformance >= 80 ? 'Excellente performance' : 
                       scorePerformance >= 60 ? 'Performance correcte' : 
                       'Performance à améliorer'}
                    </div>
                    
                    {/* Barre de progression */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: `${scorePerformance}%`,
                        height: '100%',
                        background: getScoreColor(scorePerformance),
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    
                    {/* Détail du calcul */}
                    <div style={{
                      fontSize: '10px',
                      color: '#7f8c8d',
                      lineHeight: '1.3'
                    }}>
                      <div>Calcul : (Travail net - Retards - Départs anticipés) / Travail net × 100</div>
                      <div style={{ marginTop: '4px' }}>
                        = ({travailNet} - {retard} - {departAnticipe}) / {travailNet} × 100 = {scorePerformance}%
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
