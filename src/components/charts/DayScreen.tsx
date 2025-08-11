import React from 'react';
import { 
  BarChart, 
  HorizontalBarChart, 
  ScatterChart, 
  DonutChart, 
  RealTimeStatus 
} from './index';

interface DayScreenProps {
  kpiData: any; // Type à définir selon la structure des données
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
}

const DayScreen: React.FC<DayScreenProps> = ({ kpiData, users }) => {
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

  // Préparer les données pour le nuage de points
  const scatterData = users
    .filter(user => user.travail_net_minutes > 0)
    .map(user => ({
      name: `${user.prenom} ${user.nom}`,
      travail_net_minutes: user.travail_net_minutes,
      retard_minutes: user.retard_minutes,
      travail_total_minutes: user.travail_total_minutes
    }));

  return (
    <div className="day-screen">
      <div className="charts-grid">
        {/* Première ligne */}
        <div className="chart-row">
          <BarChart 
            data={serviceData}
            title="Travail net par service (jour J)"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <BarChart 
            data={lieuData}
            title="Travail net par lieu (jour J)"
            xAxisLabel="Lieu"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Deuxième ligne */}
        <div className="chart-row">
          <BarChart 
            data={roleData}
            title="Travail net par rôle (jour J)"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={topRetardsData}
            title="Top retards (jour J)"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
        </div>

        {/* Troisième ligne */}
        <div className="chart-row">
          <ScatterChart 
            data={scatterData}
            title="Retard vs travail net (par utilisateur, jour J)"
          />
          <DonutChart 
            data={serviceData}
            title="Part des services dans le travail net (jour J)"
          />
        </div>

        {/* Quatrième ligne - Statut temps réel */}
        <div className="chart-row">
          <RealTimeStatus 
            users={users}
            title="Présents / En pause maintenant"
          />
        </div>
      </div>
    </div>
  );
};

export default DayScreen;
