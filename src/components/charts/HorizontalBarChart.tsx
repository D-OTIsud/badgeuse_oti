import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HorizontalBarChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
  limit?: number;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ 
  data, 
  title, 
  xAxisLabel = "Minutes", 
  yAxisLabel = "Utilisateur", 
  color = "#ff6b6b",
  limit = 10
}) => {
  // Limiter le nombre d'éléments et trier par valeur décroissante
  const sortedData = data
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <RechartsBarChart 
          data={sortedData} 
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            label={{ value: xAxisLabel, position: 'bottom', offset: -10 }}
            tickFormatter={formatMinutes}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            width={80}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: number) => [formatMinutes(value), xAxisLabel]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="value" fill={color} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HorizontalBarChart;
