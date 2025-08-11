import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  xAxisLabel = "Catégorie", 
  yAxisLabel = "Minutes", 
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1']
}) => {
  // Formater les données pour Recharts
  const chartData = data.map((item, index) => ({
    name: item.name,
    value: item.value,
    fill: colors[index % colors.length]
  }));

  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            label={{ value: xAxisLabel, position: 'bottom', offset: -10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            tickFormatter={formatMinutes}
          />
          <Tooltip 
            formatter={(value: number) => [formatMinutes(value), yAxisLabel]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="value" fill="#8884d8" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
