import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: Array<{ name: string; [key: string]: any }>;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  dataKey: string;
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  xAxisLabel = "Catégorie", 
  yAxisLabel = "Minutes", 
  dataKey,
  color = "#8884d8"
}) => {
  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Vérifier si les données sont valides
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '300px',
          color: '#7f8c8d',
          fontStyle: 'italic'
        }}>
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            label={{ value: xAxisLabel, position: 'bottom', offset: -10 }}
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
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
