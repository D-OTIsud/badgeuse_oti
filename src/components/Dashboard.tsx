import React, { useState, useEffect } from 'react';
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
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

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

  const fetchData = async () => {
    try {
      // Récupérer les données du dashboard jour
      const { data: dashboardData } = await supabase
        .from('appbadge_v_dashboard_jour')
        .select('*')
        .eq('jour_local', new Date().toISOString().split('T')[0]);

      // Récupérer les anomalies
      const { data: anomaliesData } = await supabase
        .from('appbadge_v_anomalies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setData(prev => ({
        ...prev,
        dashboardJour: dashboardData || [],
        anomalies: anomaliesData || []
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  // Calculer les KPIs en temps réel basé sur les statuts courants
  const calculateKPIs = () => {
    const presents = data.statutCourant.filter(u => u.statut_presence === 'Présent').length || 0;
    const enPause = data.statutCourant.filter(u => u.statut_presence === 'En pause').length || 0;
    const retardCumule = data.dashboardJour?.reduce((sum, item) => sum + (item.retard_minutes || 0), 0) || 0;
    const travailNetMoyen = data.dashboardJour?.length > 0 
      ? data.dashboardJour.reduce((sum, item) => sum + (item.travail_net_minutes || 0), 0) / data.dashboardJour.length 
      : 0;
    const pauseMoyenne = data.dashboardJour?.length > 0 
      ? data.dashboardJour.reduce((sum, item) => sum + (item.pause_total_minutes || 0), 0) / data.dashboardJour.length 
      : 0;
    const tauxPonctualite = data.dashboardJour?.length > 0 
      ? (data.dashboardJour.filter(item => (item.retard_minutes || 0) === 0).length / data.dashboardJour.length) * 100 
      : 0;

    return {
      presents,
      enPause,
      retardCumule,
      travailNetMoyen: Math.round(travailNetMoyen),
      pauseMoyenne: Math.round(pauseMoyenne),
      tauxPonctualite: Math.round(tauxPonctualite)
    };
  };

  // KPIs calculés en temps réel
  const kpis = calculateKPIs();

  // Initialisation et mise à jour périodique (5 minutes)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [period]);

  // Temps réel pour les statuts courants et récupération des services/rôles
  useEffect(() => {
    // Récupérer les statuts initiaux et les services/rôles disponibles
    const fetchStatutsAndOptions = async () => {
      const { data: statutData } = await supabase
        .from('appbadge_v_statut_courant')
        .select('*');
      
      if (statutData) {
        setData(prev => ({
          ...prev,
          statutCourant: statutData
        }));
        
        // Extraire les services et rôles uniques
        const services = [...new Set(statutData.map(user => user.service).filter(Boolean))];
        const roles = [...new Set(statutData.map(user => user.role).filter(Boolean))];
        
        setAvailableServices(services.sort());
        setAvailableRoles(roles.sort());
        setLoading(false);
      }
    };

    fetchStatutsAndOptions();

    // Abonnement temps réel
    const channel = supabase
      .channel('statut_courant_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appbadge_v_statut_courant' 
        }, 
        (payload) => {
          console.log('Changement détecté:', payload.eventType, payload.new);
          
          // Mettre à jour les statuts en temps réel
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setData(prev => {
              const updatedStatuts = prev.statutCourant.map(user => 
                user.id === payload.new.id ? payload.new : user
              );
              
              // Mettre à jour les services et rôles disponibles
              const services = [...new Set(updatedStatuts.map(user => user.service).filter(Boolean))];
              const roles = [...new Set(updatedStatuts.map(user => user.role).filter(Boolean))];
              
              setAvailableServices(services.sort());
              setAvailableRoles(roles.sort());
              
              return {
                ...prev,
                statutCourant: updatedStatuts
              };
            });
          } else if (payload.eventType === 'DELETE') {
            setData(prev => {
              const updatedStatuts = prev.statutCourant.filter(user => user.id !== payload.old.id);
              
              // Mettre à jour les services et rôles disponibles
              const services = [...new Set(updatedStatuts.map(user => user.service).filter(Boolean))];
              const roles = [...new Set(updatedStatuts.map(user => user.role).filter(Boolean))];
              
              setAvailableServices(services.sort());
              setAvailableRoles(roles.sort());
              
              return {
                ...prev,
                statutCourant: updatedStatuts
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Présent': return colors.present;
      case 'En pause': return colors.pause;
      default: return colors.absent;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Présent': return '✓';
      case 'En pause': return '⏸';
      default: return '○';
    }
  };

  // Filtrer les utilisateurs selon les critères
  const filteredUsers = data.statutCourant.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesService = selectedService === '' || user.service === selectedService;
    const matchesRole = selectedRole === '' || user.role === selectedRole;
    
    return matchesSearch && matchesService && matchesRole;
  });

  // Données pour les graphiques
  const chartData = data.dashboardJour.map(item => ({
    jour: new Date(item.jour_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    retard: item.retard_minutes || 0,
    travailNet: item.travail_net_minutes || 0
  }));

  const occupationData = filteredUsers
    .filter(u => u.statut_presence === 'Présent')
    .reduce((acc, user) => {
      const lieu = user.lieux || 'Non défini';
      acc[lieu] = (acc[lieu] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const occupationChartData = Object.entries(occupationData).map(([lieu, count]) => ({
    name: lieu,
    value: count
  }));

  const arrivalData = data.dashboardJour.reduce((acc, item) => {
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
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          >
            <option value="">Tous les services</option>
            {availableServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          >
            <option value="">Tous les rôles</option>
            {availableRoles.map(role => (
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
          boxShadow: '0 4px 12px rgba(59,162,124,0.3)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
                     <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.presents}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Présents maintenant</div>
        </div>

        <div style={{
          background: colors.primary,
          color: 'white',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(59,162,124,0.3)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⏸</div>
                     <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.enPause}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>En pause maintenant</div>
        </div>

        <div style={{
          background: colors.primary,
          color: 'white',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(59,162,124,0.3)'
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
          boxShadow: '0 4px 12px rgba(59,162,124,0.3)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
                     <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{kpis.travailNetMoyen}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Travail net moyen (min)</div>
        </div>
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
          <h3 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: 18, fontWeight: 600 }}>
            Status en direct ({filteredUsers.length} utilisateurs)
          </h3>
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
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                background: '#f8f9fa',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ position: 'relative' }}>
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
                    border: `3px solid ${colors.avatarRing}`
                  }}>
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="avatar" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: '50%', 
                          objectFit: 'cover' 
                        }} 
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>
                    {user.prenom} {user.nom}
                  </div>
                  <div style={{ color: colors.textLight, fontSize: 12 }}>
                    {user.email}
                  </div>
                  {user.lieux && (
                    <div style={{ color: colors.textLight, fontSize: 11 }}>
                      📍 {user.lieux}
                    </div>
                  )}
                </div>
                                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: 8,
                   color: getStatusColor(user.statut_presence),
                   fontWeight: 600,
                   fontSize: 14,
                   transition: 'all 0.3s ease',
                   padding: '4px 8px',
                   borderRadius: 6,
                   background: getStatusColor(user.statut_presence) === colors.present ? 'rgba(76, 175, 80, 0.1)' : 
                              getStatusColor(user.statut_presence) === colors.pause ? 'rgba(255, 152, 0, 0.1)' : 
                              'rgba(204, 204, 204, 0.1)'
                 }}>
                   <span style={{ fontSize: 16 }}>{getStatusIcon(user.statut_presence)}</span>
                   {user.statut_presence}
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
                  {anomalie.type || 'Anomalie détectée'}
                </div>
                <div style={{ fontSize: 12, color: '#856404' }}>
                  {new Date(anomalie.created_at).toLocaleDateString('fr-FR')}
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
                  <Cell key={`cell-${index}`} fill={index === 0 ? colors.primary : colors.avatarRing} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
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
