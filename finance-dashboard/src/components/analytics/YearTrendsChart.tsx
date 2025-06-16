// src/components/analytics/YearTrendsChart.tsx
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { YearlyData } from '../../types/api';

interface YearTrendsChartProps {
  yearData: Record<string, YearlyData>;
  selectedYears: number[];
}

export default function YearTrendsChart({ yearData, selectedYears }: YearTrendsChartProps) {
  const chartData = useMemo(() => {
    const years = selectedYears.length > 0 
      ? selectedYears.map(String)
      : Object.keys(yearData);
    
    return years
      .filter(year => yearData[year])
      .map(year => ({
        year: year,
        income: Math.round(yearData[year].average_monthly_income),
        spending: Math.round(yearData[year].average_monthly_spending),
        investments: Math.round(yearData[year].average_monthly_investments)
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [yearData, selectedYears]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
        <h3 className="text-white font-semibold text-3xl mb-6">Year-over-Year Trends</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No data available for selected years</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
      <h3 className="text-white font-semibold text-3xl mb-6">Year-over-Year Trends</h3>
      <p className="text-gray-400 mb-6">Average monthly amounts by category</p>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              tick={{ fill: '#D1D5DB' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <YAxis 
              tick={{ fill: '#D1D5DB' }}
              axisLine={{ stroke: '#6B7280' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#D1D5DB' }}
            />
            
            <Bar 
              dataKey="income" 
              name="Income" 
              fill="#10B981" 
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="spending" 
              name="Spending" 
              fill="#3B82F6" 
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="investments" 
              name="Investments" 
              fill="#8B5CF6" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year-over-year growth indicators */}
      {chartData.length > 1 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {['income', 'spending', 'investments'].map((metric) => {
            const latest = chartData[chartData.length - 1];
            const previous = chartData[chartData.length - 2];
            const latestValue = Number(latest[metric as keyof typeof latest]) || 0;
            const previousValue = Number(previous[metric as keyof typeof previous]) || 0;
            const growth = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;
            const isPositive = growth > 0;
            
            return (
              <div key={metric} className="text-center">
                <p className="text-gray-400 text-sm capitalize">{metric} Growth</p>
                <p className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{growth.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}