import React from 'react';
import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

interface ScatterChartProps {
  data: Array<{ 
    name: string; 
    travail_net_minutes: number; 
    retard_minutes: number; 
    travail_total_minutes: number;
  }>;
  title: string;
}

const ScatterChart: React.FC<ScatterChartProps> = ({ data, title }) => {
  // Formater les minutes en heures:minutes
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // Formater les données pour Recharts
  const chartData = data.map(item => ({
    name: item.name,
    x: item.travail_net_minutes,
    y: item.retard_minutes,
    z: item.travail_total_minutes
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <RechartsScatterChart 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="travail_net_minutes"
            label={{ value: "Travail Net (minutes)", position: 'bottom', offset: -10 }}
            tickFormatter={formatMinutes}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="retard_minutes"
            label={{ value: "Retard (minutes)", angle: -90, position: 'insideLeft' }}
            tickFormatter={formatMinutes}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => [
              formatMinutes(value), 
              name === 'x' ? 'Travail Net' : name === 'y' ? 'Retard' : 'Travail Total'
            ]}
            labelFormatter={(label) => `Utilisateur: ${label}`}
          />
          <Scatter 
            data={chartData} 
            fill="#8884d8"
            shape="circle"
          />
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScatterChart;
