import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ParetoChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
}

const ParetoChart: React.FC<ParetoChartProps> = ({ data, title }) => {
  // Trier les données par valeur décroissante
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Calculer les pourcentages cumulés
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;
  
  const chartData = sortedData.map((item, index) => {
    cumulative += item.value;
    const percentage = total > 0 ? (cumulative / total) * 100 : 0;
    
    return {
      name: item.name,
      value: item.value,
      cumulative: percentage,
      index: index + 1
    };
  });

  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Formater les pourcentages
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            label={{ value: "Utilisateur", position: 'bottom', offset: -10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: "Travail Net (minutes)", angle: -90, position: 'insideLeft' }}
            tickFormatter={formatMinutes}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: "Pourcentage Cumulé (%)", angle: 90, position: 'insideRight' }}
            tickFormatter={formatPercentage}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              name === 'value' ? formatMinutes(value) : formatPercentage(value),
              name === 'value' ? 'Travail Net' : 'Pourcentage Cumulé'
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="value" 
            fill="#8884d8" 
            name="Travail Net"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="cumulative" 
            stroke="#ff7300" 
            strokeWidth={2}
            dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
            name="Pourcentage Cumulé"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ParetoChart;
