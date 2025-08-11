import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
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
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
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
    // Utiliser les utilisateurs filtrés pour les KPIs de présence
    const presents = filteredUsers.filter(u => u.status === 'Entré').length || 0;
    const enPause = filteredUsers.filter(u => u.status === 'En pause').length || 0;
    
    // Pour les KPIs basés sur dashboardJour, filtrer selon les utilisateurs sélectionnés
    const userIds = filteredUsers.map(u => u.id);
    const filteredDashboardData = data.dashboardJour.filter(item => 
      userIds.includes(item.utilisateur_id)
    );
    
    const retardCumule = filteredDashboardData?.reduce((sum, item) => sum + (item.retard_minutes || 0), 0) || 0;
    const travailNetMoyen = filteredDashboardData?.length > 0 
      ? filteredDashboardData.reduce((sum, item) => sum + (item.travail_net_minutes || 0), 0) / filteredDashboardData.length 
      : 0;
    const pauseMoyenne = filteredDashboardData?.length > 0 
      ? filteredDashboardData.reduce((sum, item) => sum + (item.pause_total_minutes || 0), 0) / filteredDashboardData.length 
      : 0;
    const tauxPonctualite = filteredDashboardData?.length > 0 
      ? (filteredDashboardData.filter(item => (item.retard_minutes || 0) === 0).length / filteredDashboardData.length) * 100 
      : 0;

    return {
      presents,
      enPause,
      retardCumule,
      travailNetMoyen: Math.round(travailNetMoyen),
      pauseMoyenne: Math.round(pauseMoyenne),
      tauxPonctualite: Math.round(tauxPonctualite)
    };
  }, [filteredUsers, data.dashboardJour]);

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
      
      // Récupérer les données du dashboard jour (vue appbadge_v_dashboard_jour)
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('appbadge_v_dashboard_jour')
        .select('*')
        .eq('jour_local', new Date().toISOString().split('T')[0]);

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
    fetchLieuxColors(); // Récupérer les couleurs des lieux
    const interval = setInterval(fetchData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [period, updateUserStatusFromBadgeages]);

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

  const chartData = filteredDashboardData.map(item => ({
    jour: new Date(item.jour_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    retard: item.retard_minutes || 0,
    travailNet: item.travail_net_minutes || 0
  }));

  const occupationData = filteredUsers
    .filter(u => u.status === 'Entré')
    .reduce((acc, user) => {
      const lieu = user.lieux || 'Non défini';
      acc[lieu] = (acc[lieu] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const totalUsers = Object.values(occupationData).reduce((sum, val) => sum + val, 0);
  const occupationChartData = Object.entries(occupationData).map(([lieu, count]) => {
    const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            Tableau de bord — Présences & Retards
          </h1>
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
          {['Jour', 'Semaine', 'Mois'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p.toLowerCase() as any)}
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
        </div>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        padding: '0 24px 24px'
      }}>
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
      </div>

      {/* Indicateur de dernière mise à jour */}
      <div style={{
        textAlign: 'center',
        padding: '8px 24px',
        color: colors.textLight,
        fontSize: 12
      }}>
        Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')} | 
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{
            background: 'none',
            border: 'none',
            color: refreshing ? colors.textLight : colors.primary,
            textDecoration: 'underline',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {refreshing ? (
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
        {/* Statuts en direct */}
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

        {/* Graphique Retards & travail */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
            Retards & travail — tendances
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="jour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="retard" stroke="#ff9800" name="Retard (min)" />
              <Line type="monotone" dataKey="travailNet" stroke={colors.primary} name="Travail net (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

                 {/* Occupation par lieu */}
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

        {/* Arrivées vs horaire */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
            Arrivées vs. horaire
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={arrivalChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
