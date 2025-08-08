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

const Dashboard: React.FC = () => {
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
    setLoading(true);
    try {
      // Récupérer les statuts courants
      const { data: statutData } = await supabase
        .from('appbadge_v_statut_courant')
        .select('*');

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

      // Calculer les KPIs
      const presents = statutData?.filter(u => u.statut_presence === 'Présent').length || 0;
      const enPause = statutData?.filter(u => u.statut_presence === 'En pause').length || 0;
      const retardCumule = dashboardData?.reduce((sum, item) => sum + (item.retard_minutes || 0), 0) || 0;
      const travailNetMoyen = dashboardData?.length > 0 
        ? dashboardData.reduce((sum, item) => sum + (item.travail_net_minutes || 0), 0) / dashboardData.length 
        : 0;
      const pauseMoyenne = dashboardData?.length > 0 
        ? dashboardData.reduce((sum, item) => sum + (item.pause_total_minutes || 0), 0) / dashboardData.length 
        : 0;
      const tauxPonctualite = dashboardData?.length > 0 
        ? (dashboardData.filter(item => (item.retard_minutes || 0) === 0).length / dashboardData.length) * 100 
        : 0;

      setData({
        statutCourant: statutData || [],
        dashboardJour: dashboardData || [],
        anomalies: anomaliesData || [],
        kpis: {
          presents,
          enPause,
          retardCumule,
          travailNetMoyen: Math.round(travailNetMoyen),
          pauseMoyenne: Math.round(pauseMoyenne),
          tauxPonctualite: Math.round(tauxPonctualite)
        }
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh toutes les 30s
    return () => clearInterval(interval);
  }, [period]);

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

  // Données pour les graphiques
  const chartData = data.dashboardJour.map(item => ({
    jour: new Date(item.jour_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    retard: item.retard_minutes || 0,
    travailNet: item.travail_net_minutes || 0
  }));

  const occupationData = data.statutCourant
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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          Tableau de bord — Présences & Retards
        </h1>
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
            <option value="IT">IT</option>
            <option value="RH">RH</option>
            <option value="Finance">Finance</option>
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
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="A-E">A-E</option>
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
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{data.kpis.presents}</div>
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
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{data.kpis.enPause}</div>
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
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{data.kpis.retardCumule}</div>
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
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{data.kpis.travailNetMoyen}</div>
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
            Status en direct
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.statutCourant.slice(0, 5).map((user, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                background: '#f8f9fa'
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
                    👤
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>
                    {user.prenom} {user.nom}
                  </div>
                  <div style={{ color: colors.textLight, fontSize: 12 }}>
                    {user.email}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: getStatusColor(user.statut_presence),
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  <span style={{ fontSize: 16 }}>{getStatusIcon(user.statut_presence)}</span>
                  {user.statut_presence}
                </div>
              </div>
            ))}
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
