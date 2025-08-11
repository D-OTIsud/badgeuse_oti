import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  DonutChart 
} from './index';

interface YearScreenProps {
  kpiData: any; // Type à définir selon la structure des données
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    travail_net_minutes: number;
    retard_minutes: number;
  }>;
  year: number;
  supabaseAPI: any; // Type à définir
}

const YearScreen: React.FC<YearScreenProps> = ({ kpiData, users, year, supabaseAPI }) => {
  const [monthlyData, setMonthlyData] = useState<Array<{ name: string; travail_net: number; retard: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Générer les données mensuelles pour l'année
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      const yearData = [];
      
      // Générer les données pour chaque mois de l'année
      for (let month = 1; month <= 12; month++) {
        try {
          // Calculer le début et la fin du mois
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 1); // Premier jour du mois suivant
          
          // Appel à appbadge_kpi_global_between pour chaque mois
          const response = await supabaseAPI.getKPIGlobalBetween(
            monthStart.toISOString().split('T')[0],
            monthEnd.toISOString().split('T')[0]
          );
          
          const monthData = response.data?.[0]?.global || {};
          const monthName = monthStart.toLocaleDateString('fr-FR', { month: 'short' });
          
          yearData.push({
            name: monthName,
            travail_net: monthData.travail_net_minutes || 0,
            retard: monthData.retard_minutes || 0
          });
        } catch (error) {
          console.error(`Erreur lors de la récupération des données pour le mois ${month}:`, error);
          const monthStart = new Date(year, month - 1, 1);
          yearData.push({
            name: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
            travail_net: 0,
            retard: 0
          });
        }
      }
      
      setMonthlyData(yearData);
      setLoading(false);
    };

    fetchMonthlyData();
  }, [year, supabaseAPI]);

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

  if (loading) {
    return (
      <div className="year-screen">
        <div className="loading">Chargement des données de l'année...</div>
      </div>
    );
  }

  return (
    <div className="year-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances mensuelles */}
        <div className="chart-row">
          <LineChart 
            data={monthlyData.map(month => ({ name: month.name, value: month.travail_net }))}
            title="Travail net par mois (12 points)"
            xAxisLabel="Mois"
            yAxisLabel="Minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={monthlyData.map(month => ({ name: month.name, value: month.retard }))}
            title="Retard par mois (12 points)"
            xAxisLabel="Mois"
            yAxisLabel="Minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Répartition par service et lieu */}
        <div className="chart-row">
          <BarChart 
            data={serviceData}
            title="Travail net par service (année)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <BarChart 
            data={lieuData}
            title="Travail net par lieu (année)"
            xAxisLabel="Lieu"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Troisième ligne - Répartition par rôle et top retards */}
        <div className="chart-row">
          <BarChart 
            data={roleData}
            title="Travail net par rôle (année)"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top N retards année"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Quatrième ligne - Donut des services et comparaison YTD */}
        <div className="chart-row">
          <DonutChart 
            data={serviceData}
            title="Part des services sur l'année"
          />
          <div className="comparison-section">
            <h3>Comparatif YTD vs N-1</h3>
            <p>Fonctionnalité à implémenter : comparaison avec l'année précédente</p>
            <div className="comparison-placeholder">
              <p>📊 Comparaison des performances entre {year} et {year - 1}</p>
              <p>🔄 Calcul des deltas en cours de développement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearScreen;
