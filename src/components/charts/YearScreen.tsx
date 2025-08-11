import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  HorizontalBarChart, 
  DonutChart 
} from './index';

interface YearScreenProps {
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
  year: number;
  supabaseAPI: any;
}

const YearScreen: React.FC<YearScreenProps> = ({ 
  kpiData, 
  users, 
  year, 
  supabaseAPI 
}) => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les données mensuelles pour l'année
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        const monthlyKPIs = [];
        const monthNames = [
          'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
          'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
        ];
        
        for (let month = 1; month <= 12; month++) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 1);
          
          try {
            const response = await supabaseAPI.getKPIGlobalBetween(
              monthStart.toISOString().split('T')[0],
              monthEnd.toISOString().split('T')[0]
            );
            
            if (response && response.data && response.data.length > 0) {
              const monthData = response.data[0];
              monthlyKPIs.push({
                month: month,
                name: monthNames[month - 1],
                travail_net_minutes: monthData.global?.travail_net_minutes || 0,
                retard_minutes: monthData.global?.retard_minutes || 0
              });
            } else {
              monthlyKPIs.push({
                month: month,
                name: monthNames[month - 1],
                travail_net_minutes: 0,
                retard_minutes: 0
              });
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération des KPIs pour ${monthStart.toISOString().split('T')[0]}:`, error);
            monthlyKPIs.push({
              month: month,
              name: monthNames[month - 1],
              travail_net_minutes: 0,
              retard_minutes: 0
            });
          }
        }
        
        setMonthlyData(monthlyKPIs);
      } catch (error) {
        console.error('Erreur lors de la récupération des données mensuelles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [year, supabaseAPI]);

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
        <p>Chargement des données de l'année...</p>
      </div>
    );
  }

  return (
    <div className="year-screen">
      <div className="charts-grid">
        {/* Première ligne - Tendances de l'année */}
        <div className="chart-row">
          <LineChart 
            data={monthlyData}
            title="Travail net par mois (année)"
            xAxisLabel="Mois"
            yAxisLabel="Minutes"
            dataKey="travail_net_minutes"
            color="#4CAF50"
          />
          <LineChart 
            data={monthlyData}
            title="Retard par mois (année)"
            xAxisLabel="Mois"
            yAxisLabel="Minutes"
            dataKey="retard_minutes"
            color="#FF9800"
          />
        </div>

        {/* Deuxième ligne - Services et Lieux */}
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

        {/* Troisième ligne - Rôles et Top retards */}
        <div className="chart-row">
          <BarChart 
            data={roleData}
            title="Travail net par rôle (année)"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top retards de l'année"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Quatrième ligne - Donut et Comparatif YTD */}
        <div className="chart-row">
          <DonutChart 
            data={serviceData}
            title="Part des services dans le travail net (année)"
          />
          <div className="comparison-section">
            <h3>Comparatif YTD vs N-1</h3>
            <div className="comparison-placeholder">
              <p>Fonctionnalité à implémenter</p>
              <p>Comparaison avec l'année précédente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearScreen;
