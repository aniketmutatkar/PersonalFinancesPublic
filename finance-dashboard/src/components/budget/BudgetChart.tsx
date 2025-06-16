// src/components/budget/BudgetChart.tsx - Simplified & Uniform
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetChartProps {
  data: any;
  type: 'yearly' | 'monthly';
  year?: number;
  monthYear?: string;
}

export default function BudgetChart({ data, type, year, monthYear }: BudgetChartProps) {
  const chartData = useMemo(() => {
    if (type === 'monthly') {
      // Monthly view - show budget vs actual by category
      return (data.budget_items || [])
        .filter((item: any) => item.budget_amount > 0 || item.actual_amount > 0)
        .map((item: any) => ({
          category: item.category,
          budget: Number(item.budget_amount),
          actual: Number(item.actual_amount),
          variance: Number(item.budget_amount) - Number(item.actual_amount),
          variancePercent: Number(item.budget_amount) > 0 
            ? ((Number(item.budget_amount) - Number(item.actual_amount)) / Number(item.budget_amount)) * 100 
            : 0,
          isOverBudget: item.is_over_budget
        }))
        .sort((a: any, b: any) => b.budget - a.budget)
        .slice(0, 10); // Top 10 categories
    } else {
      // Yearly view - show budget vs actual by month in CHRONOLOGICAL order
      const months = data.months || [];
      const budgetData = data.budget_data || {};
      
      // Helper function to convert month name to number for sorting
      const getMonthNumber = (monthYear: string): number => {
        const monthName = monthYear.split(' ')[0];
        const monthMap: { [key: string]: number } = {
          'January': 1, 'February': 2, 'March': 3, 'April': 4,
          'May': 5, 'June': 6, 'July': 7, 'August': 8,
          'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        return monthMap[monthName] || 0;
      };
      
      // Sort months chronologically
      const sortedMonths = months.sort((a: string, b: string) => {
        return getMonthNumber(a) - getMonthNumber(b);
      });
      
      return sortedMonths.map((month: string) => {
        const monthData = budgetData[month] || {};
        
        let monthlyBudget = 0;
        let monthlyActual = 0;
        let overBudgetCount = 0;
        let totalCategories = 0;
        
        Object.values(monthData).forEach((item: any) => {
          monthlyBudget += Number(item.budget_amount) || 0;
          monthlyActual += Number(item.actual_amount) || 0;
          totalCategories++;
          if (item.is_over_budget) overBudgetCount++;
        });
        
        const variance = monthlyBudget - monthlyActual;
        const adherenceRate = totalCategories > 0 ? 
          ((totalCategories - overBudgetCount) / totalCategories) * 100 : 100;
        
        return {
          month: month.substring(0, 3), // Abbreviate month names
          budget: monthlyBudget,
          actual: monthlyActual,
          variance: variance,
          variancePercent: monthlyBudget > 0 ? (variance / monthlyBudget) * 100 : 0,
          adherenceRate: adherenceRate,
          overBudgetCount: overBudgetCount,
          isOverBudget: monthlyActual > monthlyBudget
        };
      });
    }
  }, [data, type]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Enhanced tooltip with better information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      
      if (type === 'monthly') {
        return (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
            <p className="text-white font-semibold mb-2">{label}</p>
            <div className="space-y-1">
              <p className="text-blue-400">Budget: {formatCurrency(data.budget)}</p>
              <p className="text-green-400">Actual: {formatCurrency(data.actual)}</p>
              <p className={`font-semibold ${data.isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                Variance: {formatCurrency(Math.abs(data.variance))} {data.isOverBudget ? 'over' : 'under'}
              </p>
              <p className="text-gray-300 text-sm">
                {data.variancePercent > 0 ? 'Under' : 'Over'} by {Math.abs(data.variancePercent).toFixed(1)}%
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
            <p className="text-white font-semibold mb-2">{label}</p>
            <div className="space-y-1">
              <p className="text-blue-400">Budget: {formatCurrency(data.budget)}</p>
              <p className="text-green-400">Actual: {formatCurrency(data.actual)}</p>
              <p className={`font-semibold ${data.isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                Variance: {formatCurrency(Math.abs(data.variance))} {data.isOverBudget ? 'over' : 'under'}
              </p>
              <p className="text-gray-300 text-sm">
                Adherence Rate: {data.adherenceRate.toFixed(1)}%
              </p>
              {data.overBudgetCount > 0 && (
                <p className="text-red-400 text-sm">
                  {data.overBudgetCount} categories over budget
                </p>
              )}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const title = type === 'monthly' 
    ? `Budget Analysis - ${monthYear}`
    : `Monthly Budget Trends - ${year}`;

  const xAxisKey = type === 'monthly' ? 'category' : 'month';

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full">
      {/* Simplified Header - NO CONTROLS */}
      <div className="mb-6">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey={xAxisKey}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                stroke="#9CA3AF"
                angle={type === 'monthly' ? -45 : 0}
                textAnchor={type === 'monthly' ? 'end' : 'middle'}
                height={type === 'monthly' ? 80 : 60}
              />
              <YAxis 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                stroke="#9CA3AF"
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
              />
              <Bar 
                dataKey="budget" 
                fill="#94a3b8" 
                name="Budget"
                radius={[4, 4, 0, 0]}
                fillOpacity={0.8}
              />
              <Bar 
                dataKey="actual" 
                fill="#3b82f6"
                name="Actual"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg mb-2">No Data Available</p>
            <p className="text-sm">
              {type === 'monthly' 
                ? `No budget data for ${monthYear}`
                : `No budget data for ${year}`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}