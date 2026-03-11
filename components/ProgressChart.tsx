import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserStats } from '../types';

interface ProgressChartProps {
  stats: UserStats[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ stats }) => {
  const data = stats.map(stat => ({
    name: stat.subject,
    score: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    total: stat.total
  })).filter(d => d.total > 0);

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">ההתקדמות שלך</h3>
      <div className="h-64 w-full" dir="ltr"> 
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-30} textAnchor="end" height={60}/>
            <YAxis domain={[0, 100]} />
            <Tooltip 
              cursor={{fill: '#f3f4f6'}}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [`${value}`, 'ציון']}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10B981' : entry.score > 50 ? '#3B82F6' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;