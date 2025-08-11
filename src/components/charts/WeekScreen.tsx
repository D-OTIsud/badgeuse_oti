import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  ParetoChart 
} from './index';

interface WeekScreenProps {
  kpiData: any;
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    statut: string;
    lieu?: string;
    service?: string;
    travail_net_minutes: number;
    retard_minutes: number;
    travail_total_minutes: number;
  }>;
  startDate: Date;
  endDate: Date;
  supabaseAPI: any;
}

const WeekScreen: React.FC<WeekScreenProps> = ({ 
  kpiData, 
  users, 
  startDate, 
  endDate, 
  supabaseAPI 
}) => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les données quotidiennes pour la semaine
  useEffect(() => {
    const fetchDailyData = async () => {
      setLoading(true);
      try {
        const dailyKPIs = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(currentDate);
          dayStart.setDate(currentDate.getDate() + i);
          
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);
          
          try {
            const response = await supabaseAPI.getKPIGlobalBetween(
              dayStart.toISOString().split('T')[0],
              dayEnd.toISOString().split('T')[0]
            );
            
            if (response && response.data && response.data.length > 0) {
              const dayData = response.data[0];
              dailyKPIs.push({
                day: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
                date: dayStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                travail_net_minutes: dayData.global?.travail_net_minutes || 0,
                retard_minutes: dayData.global?.retard_minutes || 0
              });
            } else {
              dailyKPIs.push({
                day: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
                date: dayStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                travail_net_minutes: 0,
                retard_minutes: 0
              });
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération des KPIs pour ${dayStart.toISOString().split('T')[0]}:`, error);
            dailyKPIs.push({
              day: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
              date: dayStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
              travail_net_minutes: 0,
              retard_minutes: 0
            });
          }
        }
        
        setDailyData(dailyKPIs);
      } catch (error) {
        console.error('Erreur lors de la récupération des données quotidiennes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyData();
  }, [startDate, endDate, supabaseAPI]);

  // Préparer les données pour les graphiques
  const serviceData = kpiData?.meta?.subtotals?.by_service?.map((item: any) => ({
    name: item.service || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  const topRetardsData = users
    .filter(user => user.retard_minutes > 0)
    .map(user => ({
      name: `${user.prenom} ${user.nom}`,
      value: user.retard_minutes
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const paretoData = users
    .filter(user => user.travail_net_minutes > 0)
    .map(user => ({
      name: `${user.prenom} ${user.nom}`,
      value: user.travail_net_minutes
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  if (loading) {
    return (
      <div className="loading">
        <p>Chargement des données de la semaine...</p>
      </div>
    );
  }

  return (
    <div className="week-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances de la semaine */}
        <div className="chart-row">
          <LineChart 
            data={dailyData}
            title="Travail net par jour (semaine)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            dataKey="travail_net_minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={dailyData}
            title="Retard par jour (semaine)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            dataKey="retard_minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Services et Top retards */}
        <div className="chart-row">
          <BarChart 
            data={serviceData}
            title="Travail net par service (semaine)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top retards de la semaine"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Troisième ligne - Pareto (pleine largeur) */}
        <div className="chart-row">
          <ParetoChart 
            data={paretoData}
            title="Concentration du travail (par utilisateur)"
          />
        </div>
      </div>
    </div>
  );
};

export default WeekScreen;
