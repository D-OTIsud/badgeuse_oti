import React from 'react';

interface CalendarHeatmapProps {
  data: Array<{ date: string; value: number }>;
  title: string;
  month: number;
  year: number;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ data, title, month, year }) => {
  // Obtenir le nombre de jours dans le mois
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Obtenir le jour de la semaine du premier jour du mois (0 = dimanche, 1 = lundi, etc.)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  // Créer un tableau des jours du mois
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Créer un map des données par jour
  const dataByDay = new Map(data.map(item => [parseInt(item.date.split('-')[2]), item.value]));
  
  // Trouver la valeur maximale pour normaliser les couleurs
  const maxValue = Math.max(...data.map(item => item.value), 1);
  
  // Fonction pour obtenir l'intensité de la couleur
  const getColorIntensity = (value: number) => {
    if (value === 0) return '#f0f0f0';
    const intensity = Math.min((value / maxValue) * 0.8 + 0.2, 1);
    return `hsl(200, 70%, ${(1 - intensity) * 40 + 20}%)`;
  };

  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Noms des jours de la semaine
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  // Noms des mois
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="calendar-heatmap">
        <div className="calendar-header">
          <h4>{monthNames[month - 1]} {year}</h4>
        </div>
        
        {/* En-têtes des jours */}
        <div className="calendar-days-header">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
        </div>
        
        {/* Grille du calendrier */}
        <div className="calendar-grid">
          {/* Jours vides avant le premier jour du mois */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}
          
          {/* Jours du mois */}
          {days.map(day => {
            const value = dataByDay.get(day) || 0;
            const color = getColorIntensity(value);
            
            return (
              <div 
                key={day} 
                className="calendar-day"
                style={{ backgroundColor: color }}
                title={`${day} ${monthNames[month - 1]}: ${formatMinutes(value)}`}
              >
                <span className="day-number">{day}</span>
                {value > 0 && (
                  <span className="day-value">{formatMinutes(value)}</span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Légende */}
        <div className="calendar-legend">
          <span>Légende:</span>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f0f0f0' }}></div>
              <span>Aucune donnée</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#d4e6f1' }}></div>
              <span>Faible</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#85c1e9' }}></div>
              <span>Moyen</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#2e86c1' }}></div>
              <span>Élevé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeatmap;
