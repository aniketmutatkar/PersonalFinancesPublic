// src/components/monthly/SpendingPatternsChart.tsx - Enhanced with tabs
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../../types/api';

interface SpendingPatternsChartProps {
  transactions: Transaction[];
  monthYear: string; // e.g., "December 2024"
}

type ViewType = 'weekly' | 'category';

interface CombinedSpendingData {
  day: number;
  date: string;
  longPeriodTotal?: number;   // Renamed from weeklyTotal
  shortPeriodTotal?: number;  // Renamed from fourDayTotal
}

interface CategorySpendingData {
  day: number;
  date: string;
  [category: string]: number | string; // Dynamic category amounts
}

// Category colors matching your chart
const CATEGORY_COLORS: Record<string, string> = {
  'Rent': '#10B981',
  'Food': '#F59E0B', 
  'Venmo': '#3B82F6',
  'Shopping': '#EF4444',
  'Groceries': '#8B5CF6',
  'Travel': '#06B6D4',
  'Subscriptions': '#F97316',
  'Utilities': '#84CC16',
  'Entertainment': '#EC4899',
  'Transportation': '#6366F1'
};

export default function SpendingPatternsChart({ transactions, monthYear }: SpendingPatternsChartProps) {
  const [activeView, setActiveView] = useState<ViewType>('weekly');

  // CONFIGURABLE PERIOD LENGTHS - Change these to experiment!
  const SHORT_PERIOD_DAYS = 2;  // Current: 2-day periods
  const LONG_PERIOD_DAYS = 5;   // Current: 5-day periods

  const { combinedData, categoryData, weeklyInsights, categoryInsights } = useMemo(() => {
    if (!transactions.length) {
      return { 
        combinedData: [],
        categoryData: [], 
        weeklyInsights: { peak: 0, lowest: 0, average: 0, peakWeek: '', lowestWeek: '' },
        categoryInsights: { topCategories: [], totalDays: 0 }
      };
    }

    const [monthName, year] = monthYear.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();

    // Store daily spending
    const dailySpending: Record<number, number> = {};
    
    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      const date = new Date(transaction.date);
      const day = date.getDate();
      
      dailySpending[day] = (dailySpending[day] || 0) + amount;
    });

    // Create combined data array starting with day 0
    const processedCombinedData: CombinedSpendingData[] = [];
    
    // Add starting point at day 0 with zero values
    processedCombinedData.push({
      day: 0,
      date: `${monthName.slice(0, 3)} 0`,
      longPeriodTotal: 0,
      shortPeriodTotal: 0
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData: CombinedSpendingData = {
        day,
        date: `${monthName.slice(0, 3)} ${day}`
      };

      // Add long period total at the end of each period
      if (day % LONG_PERIOD_DAYS === 0 || day === daysInMonth) {
        const periodStart = Math.floor((day - 1) / LONG_PERIOD_DAYS) * LONG_PERIOD_DAYS + 1;
        const periodEnd = day;
        let longPeriodTotal = 0;
        
        for (let d = periodStart; d <= periodEnd; d++) {
          longPeriodTotal += dailySpending[d] || 0;
        }
        
        dayData.longPeriodTotal = longPeriodTotal;
      }

      // Add short period total at the end of each period
      if (day % SHORT_PERIOD_DAYS === 0 || day === daysInMonth) {
        const periodStart = Math.floor((day - 1) / SHORT_PERIOD_DAYS) * SHORT_PERIOD_DAYS + 1;
        const periodEnd = day;
        let shortPeriodTotal = 0;
        
        for (let d = periodStart; d <= periodEnd; d++) {
          shortPeriodTotal += dailySpending[d] || 0;
        }
        
        dayData.shortPeriodTotal = shortPeriodTotal;
      }

      processedCombinedData.push(dayData);
    }

    // Calculate period insights from the data points that have totals
    const longPeriodTotals = processedCombinedData
      .filter(d => d.longPeriodTotal !== undefined && d.longPeriodTotal > 0)
      .map(d => d.longPeriodTotal!);
    
    const weeklyPeak = Math.max(...longPeriodTotals, 0);
    const weeklyLowest = longPeriodTotals.length > 0 ? Math.min(...longPeriodTotals) : 0;
    const weeklyAverage = longPeriodTotals.length > 0 ? longPeriodTotals.reduce((sum, amt) => sum + amt, 0) / longPeriodTotals.length : 0;
    
    const peakWeekDay = processedCombinedData.find(d => d.longPeriodTotal === weeklyPeak);
    const lowestWeekDay = processedCombinedData.find(d => d.longPeriodTotal === weeklyLowest && d.longPeriodTotal && d.longPeriodTotal > 0);
    
    const peakWeek = peakWeekDay ? `${LONG_PERIOD_DAYS}-day period ending ${peakWeekDay.date}` : '';
    const lowestWeek = lowestWeekDay ? `${LONG_PERIOD_DAYS}-day period ending ${lowestWeekDay.date}` : '';

    // CATEGORY DATA PROCESSING
    // Get top 6 categories by total spending (excluding investment and payment categories)
    const excludeCategories = ['Pay', 'Payment', 'Acorns', 'Wealthfront', 'Robinhood', 'Schwab'];
    const categoryTotals: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      if (!excludeCategories.includes(transaction.category)) {
        categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount;
      }
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6) // Top 6 after exclusions
      .map(([category]) => category);

    // Group by day and category
    const dailyCategorySpending: Record<string, Record<string, number>> = {};
    
    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      const date = new Date(transaction.date);
      const day = date.getDate();
      const dayKey = day.toString();
      
      if (!dailyCategorySpending[dayKey]) {
        dailyCategorySpending[dayKey] = {};
      }
      
      if (topCategories.includes(transaction.category)) {
        dailyCategorySpending[dayKey][transaction.category] = 
          (dailyCategorySpending[dayKey][transaction.category] || 0) + amount;
      }
    });

    // Create category data array
    const processedCategoryData: CategorySpendingData[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = day.toString();
      const dayData: CategorySpendingData = {
        day,
        date: `${monthName.slice(0, 3)} ${day}`
      };
      
      topCategories.forEach(category => {
        dayData[category] = dailyCategorySpending[dayKey]?.[category] || 0;
      });
      
      processedCategoryData.push(dayData);
    }

    return {
      combinedData: processedCombinedData,
      categoryData: processedCategoryData,
      weeklyInsights: { 
        peak: weeklyPeak, 
        lowest: weeklyLowest, 
        average: weeklyAverage, 
        peakWeek, 
        lowestWeek 
      },
      categoryInsights: { 
        topCategories, 
        totalDays: daysInMonth 
      }
    };
  }, [transactions, monthYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryColor = (category: string, index: number) => {
    return CATEGORY_COLORS[category] || ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'][index % 6];
  };

  const CombinedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const day = label;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">Day {day}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              if (entry.value !== undefined && entry.value > 0) {
                const isLongPeriod = entry.dataKey === 'longPeriodTotal';
                const periodLength = isLongPeriod ? LONG_PERIOD_DAYS : SHORT_PERIOD_DAYS;
                return (
                  <p key={index} style={{ color: entry.color }} className="text-sm">
                    {periodLength}-Day Total: {formatCurrency(entry.value)}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{data.date}</p>
          <div className="space-y-1">
            {categoryInsights.topCategories.map((category, index) => {
              const amount = data[category] as number;
              if (amount > 0) {
                return (
                  <p key={category} className="text-sm" style={{ color: getCategoryColor(category, index) }}>
                    {category}: {formatCurrency(amount)}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!transactions.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 h-96 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-lg">No transaction data</p>
          <p className="text-sm mt-1">No spending patterns to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 h-96 flex flex-col">
      {/* Header with Tabs */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-2xl">Spending Patterns</h3>
          
          {/* Tab Controls */}
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView('weekly')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeView === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setActiveView('category')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeView === 'category'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Category
            </button>
          </div>
        </div>
        
        <p className="text-slate-400 text-sm">
          {activeView === 'weekly' 
            ? `${LONG_PERIOD_DAYS}-day spending totals with ${SHORT_PERIOD_DAYS}-day comparisons`
            : `Top ${categoryInsights.topCategories.length} categories spending over time`
          }
        </p>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[180px] mb-1">
        <ResponsiveContainer width="100%" height="100%">
          {activeView === 'weekly' ? (
            <LineChart data={combinedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CombinedTooltip />} />
              
              {/* Long period totals (blue) */}
              <Line
                type="monotone"
                dataKey="longPeriodTotal"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={true}
              />
              
              {/* Short period totals (green solid) */}
              <Line
                type="monotone"
                dataKey="shortPeriodTotal"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={true}
              />
            </LineChart>
          ) : (
            <LineChart data={categoryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CategoryTooltip />} />
              
              {categoryInsights.topCategories.map((category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={getCategoryColor(category, index)}
                  strokeWidth={2}
                  dot={{ fill: getCategoryColor(category, index), strokeWidth: 1, r: 2 }}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="flex-shrink-0">
        {activeView === 'weekly' ? (
          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-700/30 rounded-lg">
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Peak Period</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(weeklyInsights.peak)}</p>
              <p className="text-slate-300 text-[10px]">{weeklyInsights.peakWeek}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">{LONG_PERIOD_DAYS}-Day Average</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(weeklyInsights.average)}</p>
              <p className="text-slate-300 text-[10px]">per period</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Lowest Period</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(weeklyInsights.lowest)}</p>
              <p className="text-slate-300 text-[10px]">{weeklyInsights.lowestWeek}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {categoryInsights.topCategories.map((category, index) => (
                <div key={category} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: getCategoryColor(category, index) }}
                  />
                  <span className="text-white text-sm font-medium">{category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}