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
  // Données fictives pour les tests
  const mockServiceData = [
    { name: 'IT', value: 480 },
    { name: 'RH', value: 360 },
    { name: 'Finance', value: 420 },
    { name: 'Marketing', value: 300 },
    { name: 'Production', value: 540 }
  ];

  const mockLieuData = [
    { name: 'Bureau A', value: 320 },
    { name: 'Bureau B', value: 280 },
    { name: 'Atelier', value: 450 },
    { name: 'Salle réunion', value: 120 }
  ];

  const mockRoleData = [
    { name: 'Manager', value: 180 },
    { name: 'Développeur', value: 420 },
    { name: 'Analyste', value: 300 },
    { name: 'Assistant', value: 240 }
  ];

  const mockTopRetardsData = [
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
    { name: 'Lun', travail_net_minutes: 480, retard_minutes: 45 },
    { name: 'Mar', travail_net_minutes: 420, retard_minutes: 32 },
    { name: 'Mer', travail_net_minutes: 380, retard_minutes: 28 },
    { name: 'Jeu', travail_net_minutes: 360, retard_minutes: 25 },
    { name: 'Ven', travail_net_minutes: 340, retard_minutes: 22 }
  ];

  const mockMonthlyData = [
    { name: 'Jan', travail_net_minutes: 480, retard_minutes: 45 },
    { name: 'Fév', travail_net_minutes: 420, retard_minutes: 32 },
    { name: 'Mar', travail_net_minutes: 380, retard_minutes: 28 },
    { name: 'Avr', travail_net_minutes: 360, retard_minutes: 25 },
    { name: 'Mai', travail_net_minutes: 340, retard_minutes: 22 },
    { name: 'Juin', travail_net_minutes: 400, retard_minutes: 30 }
  ];

  const mockUsers = [
    { id: '1', nom: 'Dupont', prenom: 'Jean', statut: 'present', lieu: 'Bureau A', service: 'IT' },
    { id: '2', nom: 'Martin', prenom: 'Marie', statut: 'pause', lieu: 'Bureau B', service: 'RH' },
    { id: '3', nom: 'Durand', prenom: 'Pierre', statut: 'present', lieu: 'Atelier', service: 'Production' },
    { id: '4', nom: 'Bernard', prenom: 'Sophie', statut: 'absent', lieu: 'Bureau A', service: 'Finance' },
    { id: '5', nom: 'Petit', prenom: 'Lucas', statut: 'present', lieu: 'Salle réunion', service: 'Marketing' }
  ];

  const mockCalendarData = [
    { day: 1, value: 480 },
    { day: 2, value: 420 },
    { day: 3, value: 380 },
    { day: 4, value: 360 },
    { day: 5, value: 340 },
    { day: 6, value: 0 },
    { day: 7, value: 0 },
    { day: 8, value: 400 },
    { day: 9, value: 450 },
    { day: 10, value: 420 }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
        🎯 Démonstration des Graphiques
      </h1>
      
      <div className="charts-grid">
        {/* Première ligne - Graphiques en barres */}
        <div className="chart-row">
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

        {/* Deuxième ligne - Graphiques en barres horizontales et donut */}
        <div className="chart-row">
          <HorizontalBarChart 
            data={mockTopRetardsData}
            title="Top retards"
            xAxisLabel="Minutes"
            yAxisLabel="Utilisateur"
            color="#ff6b6b"
            limit={10}
          />
          <DonutChart 
            data={mockServiceData}
            title="Part des services dans le travail net"
          />
        </div>

        {/* Troisième ligne - Nuage de points et graphique en ligne */}
        <div className="chart-row">
          <ScatterChart 
            data={mockScatterData}
            title="Retard vs travail net (par utilisateur)"
          />
          <LineChart 
            data={mockDailyData}
            title="Travail net par jour (semaine)"
            xAxisLabel="Jour"
            yAxisLabel="Minutes"
            dataKey="travail_net_minutes"
            color="#4CAF50"
          />
        </div>

        {/* Quatrième ligne - Graphique en ligne et Pareto */}
        <div className="chart-row">
          <LineChart 
            data={mockMonthlyData}
            title="Travail net par mois (année)"
            xAxisLabel="Mois"
            yAxisLabel="Minutes"
            dataKey="travail_net_minutes"
            color="#FF9800"
          />
          <ParetoChart 
            data={mockServiceData}
            title="Concentration du travail (par service)"
          />
        </div>

        {/* Cinquième ligne - Calendrier heatmap et statut temps réel */}
        <div className="chart-row">
          <CalendarHeatmap 
            data={mockCalendarData}
            title="Calendrier du mois - Intensité du travail net"
            month={8}
            year={2025}
          />
          <RealTimeStatus 
            users={mockUsers}
            title="Présents / En pause maintenant"
          />
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#7f8c8d'
      }}>
        <p>✅ Tous les graphiques sont fonctionnels et correctement stylés</p>
        <p>📱 Interface responsive pour tous les écrans</p>
        <p>🎨 Styles cohérents et modernes</p>
      </div>
    </div>
  );
};

export default ChartDemo;
