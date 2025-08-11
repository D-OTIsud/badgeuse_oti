import React from 'react';
import { 
  BarChart, 
  LineChart, 
  HorizontalBarChart, 
  ScatterChart, 
  DonutChart, 
  CalendarHeatmap,
  ParetoChart,
  RealTimeStatus
} from './index';

const ChartDemo: React.FC = () => {
  // Données fictives pour la démonstration
  const mockServiceData = [
    { name: 'IT', value: 480 },
    { name: 'RH', value: 360 },
    { name: 'Finance', value: 420 },
    { name: 'Marketing', value: 300 },
    { name: 'Ventes', value: 540 }
  ];

  const mockLieuData = [
    { name: 'Bureau A', value: 320 },
    { name: 'Bureau B', value: 280 },
    { name: 'Salle réunion', value: 180 },
    { name: 'Espace coworking', value: 220 }
  ];

  const mockRoleData = [
    { name: 'Manager', value: 450 },
    { name: 'Développeur', value: 520 },
    { name: 'Analyste', value: 380 },
    { name: 'Assistant', value: 290 }
  ];

  const mockTopRetards = [
    { name: 'Jean Dupont', value: 45 },
    { name: 'Marie Martin', value: 32 },
    { name: 'Pierre Durand', value: 28 },
    { name: 'Sophie Bernard', value: 25 },
    { name: 'Lucas Petit', value: 22 }
  ];

  const mockScatterData = [
    { name: 'Jean Dupont', travail_net_minutes: 480, retard_minutes: 45, travail_total_minutes: 520 },
    { name: 'Marie Martin', travail_net_minutes: 420, retard_minutes: 32, travail_total_minutes: 450 },
    { name: 'Pierre Durand', travail_net_minutes: 380, retard_minutes: 28, travail_total_minutes: 410 },
    { name: 'Sophie Bernard', travail_net_minutes: 360, retard_minutes: 25, travail_total_minutes: 385 },
    { name: 'Lucas Petit', travail_net_minutes: 340, retard_minutes: 22, travail_total_minutes: 365 }
  ];

  const mockDailyData = [
    { name: 'Lun', value: 420 },
    { name: 'Mar', value: 480 },
    { name: 'Mer', value: 450 },
    { name: 'Jeu', value: 520 },
    { name: 'Ven', value: 380 }
  ];

  const mockHeatmapData = [
    { date: '2025-08-01', value: 420 },
    { date: '2025-08-02', value: 480 },
    { date: '2025-08-03', value: 450 },
    { date: '2025-08-04', value: 520 },
    { date: '2025-08-05', value: 380 },
    { date: '2025-08-06', value: 0 },
    { date: '2025-08-07', value: 0 },
    { date: '2025-08-08', value: 440 },
    { date: '2025-08-09', value: 460 },
    { date: '2025-08-10', value: 500 }
  ];

  const mockUsers = [
    { id: '1', nom: 'Dupont', prenom: 'Jean', statut: 'present', lieu: 'Bureau A', service: 'IT' },
    { id: '2', nom: 'Martin', prenom: 'Marie', statut: 'pause', lieu: 'Salle pause', service: 'RH' },
    { id: '3', nom: 'Durand', prenom: 'Pierre', statut: 'present', lieu: 'Bureau B', service: 'Finance' },
    { id: '4', nom: 'Bernard', prenom: 'Sophie', statut: 'absent', lieu: '', service: 'Marketing' },
    { id: '5', nom: 'Petit', prenom: 'Lucas', statut: 'present', lieu: 'Espace coworking', service: 'Ventes' }
  ];

  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
        🎯 Démonstration des Graphiques
      </h1>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Première ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <BarChart 
            data={mockServiceData}
            title="Travail net par service"
            xAxisLabel="Service"
            yAxisLabel="Minutes"
          />
          <BarChart 
            data={mockLieuData}
            title="Travail net par lieu"
            xAxisLabel="Lieu"
            yAxisLabel="Minutes"
          />
        </div>

        {/* Deuxième ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <BarChart 
            data={mockRoleData}
            title="Travail net par rôle"
            xAxisLabel="Rôle"
            yAxisLabel="Minutes"
          />
          <HorizontalBarChart 
            data={mockTopRetards}
            title="Top retards"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={5}
          />
        </div>

        {/* Troisième ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <ScatterChart 
            data={mockScatterData}
            title="Retard vs travail net"
          />
          <DonutChart 
            data={mockServiceData}
            title="Part des services"
          />
        </div>

        {/* Quatrième ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <LineChart 
            data={mockDailyData}
            title="Tendance quotidienne"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            color="#4CAF50"
          />
          <CalendarHeatmap 
            data={mockHeatmapData}
            title="Calendrier heatmap - Août 2025"
            month={8}
            year={2025}
          />
        </div>

        {/* Cinquième ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <ParetoChart 
            data={mockServiceData}
            title="Concentration du travail par service"
          />
          <RealTimeStatus 
            users={mockUsers}
            title="Statut temps réel"
          />
        </div>
      </div>
    </div>
  );
};

export default ChartDemo;
