import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  DonutChart, 
  CalendarHeatmap 
} from './index';

interface MonthScreenProps {
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
  month: number;
  year: number;
  supabaseAPI: any;
}

const MonthScreen: React.FC<MonthScreenProps> = ({ 
  kpiData, 
  users, 
  month, 
  year, 
  supabaseAPI 
}) => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les données quotidiennes pour le mois
  useEffect(() => {
    const fetchDailyData = async () => {
      setLoading(true);
      try {
        const dailyKPIs = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const nextDate = new Date(date);
          nextDate.setDate(date.getDate() + 1);
          
          try {
            const response = await supabaseAPI.getKPIGlobalBetween(
              date.toISOString().split('T')[0],
              nextDate.toISOString().split('T')[0]
            );
            
            if (response && response.data && response.data.length > 0) {
              const dayData = response.data[0];
              dailyKPIs.push({
                day: day,
                date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                travail_net_minutes: dayData.global?.travail_net_minutes || 0,
                retard_minutes: dayData.global?.retard_minutes || 0
              });
            } else {
              dailyKPIs.push({
                day: day,
                date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                travail_net_minutes: 0,
                retard_minutes: 0
              });
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération des KPIs pour ${date.toISOString().split('T')[0]}:`, error);
            dailyKPIs.push({
              day: day,
              date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
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
  }, [month, year, supabaseAPI]);

  // Préparer les données pour les graphiques
  const serviceData = kpiData?.meta?.subtotals?.by_service?.map((item: any) => ({
    name: item.service || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  const lieuData = kpiData?.meta?.subtotals?.by_lieux?.map((item: any) => ({
    name: item.lieu || 'Non défini',
    value: item.travail_net_minutes || 0
  })) || [];

  const roleData = kpiData?.meta?.subtotals?.by_role?.map((item: any) => ({
    name: item.role || 'Non défini',
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

  if (loading) {
    return (
      <div className="loading">
        <p>Chargement des données du mois...</p>
      </div>
    );
  }

  return (
    <div className="month-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances du mois */}
        <div className="chart-row">
          <LineChart 
            data={dailyData}
            title="Travail net par jour (mois)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            dataKey="travail_net_minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={dailyData}
            title="Retard par jour (mois)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            dataKey="retard_minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Services et Lieux */}
        <div className="chart-row">
          <BarChart 
            data={serviceData}
            title="Travail net par service (mois)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <BarChart 
            data={lieuData}
            title="Travail net par lieu (mois)"
            xAxisLabel="Lieu"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Troisième ligne - Rôles et Top retards */}
        <div className="chart-row">
          <BarChart 
            data={roleData}
            title="Travail net par rôle (mois)"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top retards du mois"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Quatrième ligne - Donut et Calendar Heatmap */}
        <div className="chart-row">
          <DonutChart 
            data={serviceData}
            title="Part des services dans le travail net (mois)"
          />
          <CalendarHeatmap 
            data={dailyData}
            title="Calendrier du mois - Intensité du travail net"
            month={month}
            year={year}
          />
        </div>
      </div>
    </div>
  );
};

export default MonthScreen;
