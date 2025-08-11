import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  DonutChart, 
  CalendarHeatmap 
} from './index';

interface MonthScreenProps {
  kpiData: any; // Type à définir selon la structure des données
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    travail_net_minutes: number;
    retard_minutes: number;
  }>;
  month: number;
  year: number;
  supabaseAPI: any; // Type à définir
}

const MonthScreen: React.FC<MonthScreenProps> = ({ kpiData, users, month, year, supabaseAPI }) => {
  const [dailyData, setDailyData] = useState<Array<{ name: string; travail_net: number; retard: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Générer les données quotidiennes pour le mois
  useEffect(() => {
    const fetchDailyData = async () => {
      setLoading(true);
      const monthData = [];
      
      // Obtenir le nombre de jours dans le mois
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Générer les données pour chaque jour du mois
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        
        try {
          // Appel à appbadge_kpi_global_between pour chaque jour
          const response = await supabaseAPI.getKPIGlobalBetween(
            currentDate.toISOString().split('T')[0],
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          );
          
          const dayData = response.data?.[0]?.global || {};
          
          monthData.push({
            name: day.toString(),
            travail_net: dayData.travail_net_minutes || 0,
            retard: dayData.retard_minutes || 0
          });
        } catch (error) {
          console.error(`Erreur lors de la récupération des données pour ${currentDate}:`, error);
          monthData.push({
            name: day.toString(),
            travail_net: 0,
            retard: 0
          });
        }
      }
      
      setDailyData(monthData);
      setLoading(false);
    };

    fetchDailyData();
  }, [month, year, supabaseAPI]);

  // Préparer les données pour les graphiques par service
  const serviceData = kpiData?.meta?.subtotals?.by_service?.map((item: any) => ({
    name: item.service || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  // Préparer les données pour les graphiques par lieu
  const lieuData = kpiData?.meta?.subtotals?.by_lieux?.map((item: any) => ({
    name: item.lieu || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  // Préparer les données pour les graphiques par rôle
  const roleData = kpiData?.meta?.subtotals?.by_role?.map((item: any) => ({
    name: item.role || 'Non défini',
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

  // Préparer les données pour le calendrier heatmap
  const heatmapData = dailyData.map(day => ({
    date: `${year}-${month.toString().padStart(2, '0')}-${day.name.padStart(2, '0')}`,
    value: day.travail_net
  }));

  if (loading) {
    return (
      <div className="month-screen">
        <div className="loading">Chargement des données du mois...</div>
      </div>
    );
  }

  return (
    <div className="month-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances quotidiennes */}
        <div className="chart-row">
          <LineChart 
            data={dailyData.map(day => ({ name: day.name, value: day.travail_net }))}
            title="Travail net par jour (1..N)"
            xAxisLabel="Jour du mois"
            yAxisLabel="Minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={dailyData.map(day => ({ name: day.name, value: day.retard }))}
            title="Retard par jour (1..N)"
            xAxisLabel="Jour du mois"
            yAxisLabel="Minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Calendrier heatmap et répartition par service */}
        <div className="chart-row">
          <CalendarHeatmap 
            data={heatmapData}
            title="Calendrier heatmap - Intensité du travail net"
            month={month}
            year={year}
          />
          <BarChart 
            data={serviceData}
            title="Travail net par service (mois)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Troisième ligne - Répartition par lieu et rôle */}
        <div className="chart-row">
          <BarChart 
            data={lieuData}
            title="Travail net par lieu (mois)"
            xAxisLabel="Lieu"
            yAxisLabel="Minutes"
          />
          <BarChart 
            data={roleData}
            title="Travail net par rôle (mois)"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Quatrième ligne - Top retards et donut des services */}
        <div className="chart-row">
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top N retards du mois"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
          <DonutChart 
            data={serviceData}
            title="Part des services (mois)"
          />
        </div>
      </div>
    </div>
  );
};

export default MonthScreen;
