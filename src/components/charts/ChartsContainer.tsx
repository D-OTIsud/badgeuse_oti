import React from 'react';
import DayScreen from './DayScreen';
import WeekScreen from './WeekScreen';
import MonthScreen from './MonthScreen';
import YearScreen from './YearScreen';

interface ChartsContainerProps {
  period: string;
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
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: number;
  startDate: Date;
  endDate: Date;
  supabaseAPI: any;
}

const ChartsContainer: React.FC<ChartsContainerProps> = ({
  period,
  kpiData,
  users,
  selectedYear,
  selectedMonth,
  selectedWeek,
  startDate,
  endDate,
  supabaseAPI
}) => {
  // Fonction pour obtenir les utilisateurs avec les données KPI
  const getUsersWithKPI = () => {
    if (!kpiData?.utilisateurs) return [];
    
    return kpiData.utilisateurs.map((user: any) => ({
      id: user.utilisateur_id || user.id,
      nom: user.nom || '',
      prenom: user.prenom || '',
      statut: user.statut || 'absent',
      lieu: user.lieu,
      service: user.service,
      travail_net_minutes: user.travail_net_minutes || 0,
      retard_minutes: user.retard_minutes || 0,
      depart_anticipe_minutes: user.depart_anticipe_minutes || 0,
      travail_total_minutes: user.travail_total_minutes || 0,
      pause_total_minutes: user.pause_total_minutes || 0
    }));
  };

  const usersWithKPI = getUsersWithKPI();

  // Rendu conditionnel selon la période
  switch (period.toLowerCase()) {
    case 'jour':
      return (
        <DayScreen 
          kpiData={kpiData}
          users={usersWithKPI}
        />
      );

    case 'semaine':
      return (
        <WeekScreen 
          kpiData={kpiData}
          users={usersWithKPI}
          startDate={startDate}
          endDate={endDate}
          supabaseAPI={supabaseAPI}
        />
      );

    case 'mois':
      return (
        <MonthScreen 
          kpiData={kpiData}
          users={usersWithKPI}
          month={selectedMonth || new Date().getMonth() + 1}
          year={selectedYear}
          supabaseAPI={supabaseAPI}
        />
      );

    case 'annee':
      return (
        <YearScreen 
          kpiData={kpiData}
          users={usersWithKPI}
          year={selectedYear}
          supabaseAPI={supabaseAPI}
        />
      );

    default:
      return (
        <div className="no-charts">
          <p>Aucun graphique disponible pour cette période.</p>
        </div>
      );
  }
};

export default ChartsContainer;
