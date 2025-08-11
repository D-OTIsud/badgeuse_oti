import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  ParetoChart 
} from './index';

interface WeekScreenProps {
  kpiData: any; // Type à définir selon la structure des données
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    travail_net_minutes: number;
    retard_minutes: number;
  }>;
  startDate: Date;
  endDate: Date;
  supabaseAPI: any; // Type à définir
}

const WeekScreen: React.FC<WeekScreenProps> = ({ kpiData, users, startDate, endDate, supabaseAPI }) => {
  const [dailyData, setDailyData] = useState<Array<{ name: string; travail_net: number; retard: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Générer les données quotidiennes pour la semaine
  useEffect(() => {
    const fetchDailyData = async () => {
      setLoading(true);
      const weekData = [];
      
      // Générer les 7 jours de la semaine
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        try {
          // Appel à appbadge_kpi_global_between pour chaque jour
          const response = await supabaseAPI.getKPIGlobalBetween(
            currentDate.toISOString().split('T')[0],
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          );
          
          const dayData = response.data?.[0]?.global || {};
          const dayName = currentDate.toLocaleDateString('fr-FR', { weekday: 'short' });
          
          weekData.push({
            name: dayName,
            travail_net: dayData.travail_net_minutes || 0,
            retard: dayData.retard_minutes || 0
          });
        } catch (error) {
          console.error(`Erreur lors de la récupération des données pour ${currentDate}:`, error);
          weekData.push({
            name: currentDate.toLocaleDateString('fr-FR', { weekday: 'short' }),
            travail_net: 0,
            retard: 0
          });
        }
      }
      
      setDailyData(weekData);
      setLoading(false);
    };

    fetchDailyData();
  }, [startDate, endDate, supabaseAPI]);

  // Préparer les données pour les graphiques par service
  const serviceData = kpiData?.meta?.subtotals?.by_service?.map((item: any) => ({
    name: item.service || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  // Préparer les données pour le top des retards
  const topRetardsData = users
    .filter(user => user.retard_minutes > 0)
    .map(user => ({
      name: `${user.prenom} ${user.nom}`,
      value: user.retard_minutes
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Préparer les données pour le graphique Pareto
  const paretoData = users
    .filter(user => user.travail_net_minutes > 0)
    .map(user => ({
      name: `${user.prenom} ${user.nom}`,
      value: user.travail_net_minutes
    }));

  if (loading) {
    return (
      <div className="week-screen">
        <div className="loading">Chargement des données de la semaine...</div>
      </div>
    );
  }

  return (
    <div className="week-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances quotidiennes */}
        <div className="chart-row">
          <LineChart 
            data={dailyData.map(day => ({ name: day.name, value: day.travail_net }))}
            title="Travail net par jour (7 points)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={dailyData.map(day => ({ name: day.name, value: day.retard }))}
            title="Retard par jour (7 points)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Répartition par service et top retards */}
        <div className="chart-row">
          <BarChart 
            data={serviceData}
            title="Travail net par service (semaine)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top N retards semaine"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Troisième ligne - Graphique Pareto */}
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
