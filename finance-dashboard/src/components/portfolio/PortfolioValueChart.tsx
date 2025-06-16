// src/components/portfolio/PortfolioValueChart.tsx - MINIMAL STANDARDIZATION FIX
// ONLY changing the period selector buttons, keeping ALL your existing code

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { PortfolioTrends, PortfolioOverview } from '../../types/api';

// ONLY ADDITION: Import universal toggle
import UniversalToggle from '../ui/UniversalToggle';

interface PortfolioValueChartProps {
  data: PortfolioTrends;
  isLoading?: boolean;
  portfolioOverview?: PortfolioOverview;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// KEEPING ALL YOUR EXISTING TOOLTIP CODE
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    console.log('🔧 Tooltip Payload:', payload);
    console.log('🔧 Tooltip Label:', label);
    
    // For Area chart, try multiple ways to get the total value
    let totalValue = 0;
    
    // Method 1: Look for total_value in payload dataKey
    const totalValuePayload = payload.find(p => p?.dataKey === 'total_value');
    if (totalValuePayload?.value) {
      totalValue = Number(totalValuePayload.value);
    }
    
    // Method 2: Get from first payload's raw data
    if (!totalValue && payload[0]?.payload?.total_value) {
      totalValue = Number(payload[0].payload.total_value);
    }
    
    // Method 3: Calculate from individual account values in payload
    if (!totalValue) {
      totalValue = payload
        .filter(p => p?.dataKey !== 'total_value' && p?.value && typeof p.value === 'number')
        .reduce((sum, p) => sum + Number(p.value || 0), 0);
    }
    
    console.log('🔧 Total Value Found:', totalValue);
    console.log('🔧 Total Value Payload:', totalValuePayload);
    
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
        <p className="text-white font-medium mb-2">{label || 'Unknown Month'}</p>
        <p className="text-green-400 font-bold text-lg">
          Total: ${totalValue.toLocaleString()}
        </p>
        <div className="mt-2 space-y-1">
          {payload
            .filter(p => p?.dataKey !== 'total_value' && p?.value && Number(p.value) > 0)
            .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0))
            .map((entry, index) => {
              const value = Number(entry?.value || 0);
              const displayName = entry?.dataKey
                ? entry.dataKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                : 'Unknown Account';
              
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry?.color || '#6B7280' }}
                    />
                    <span className="text-gray-300">
                      {displayName}
                    </span>
                  </div>
                  <span className="text-white font-medium">
                    ${value.toLocaleString()}
                  </span>
                </div>
              );
            })}
        </div>
        
        {/* DEBUG: Show what we found */}
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            Debug: Total = {totalValue} | Payload items: {payload.length}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PortfolioValueChart({ 
  data, 
  isLoading, 
  portfolioOverview, 
  selectedPeriod = "all",
  onPeriodChange 
}: PortfolioValueChartProps) {
  
  // ONLY ADDITION: Define period options for UniversalToggle
  const periodOptions = [
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: 'all', label: 'All Time' }
  ];

  // KEEPING ALL YOUR EXISTING DEBUG AND PROCESSING CODE
  
  if (isLoading) {
    return (
      <div className="h-96 bg-gray-900/50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading portfolio chart...</div>
        </div>
      </div>
    );
  }

  if (!data?.monthly_values || data.monthly_values.length === 0) {
    console.log('📊 No chart data available:', { 
      hasData: !!data, 
      hasMonthlyValues: !!data?.monthly_values,
      lengthCheck: data?.monthly_values?.length 
    });
    return (
      <div className="h-96 bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>No portfolio data available</div>
            <div className="text-xs mt-2">
              Debug: Data exists: {!!data ? 'Yes' : 'No'}, 
              Monthly values: {data?.monthly_values?.length || 0} items
            </div>
          </div>
        </div>
      </div>
    );
  }

  // KEEPING ALL YOUR EXISTING DATA PROCESSING CODE
  const sortedMonthlyValues = [...data.monthly_values]
    .filter(value => value && typeof value.total_value === 'number' && value.total_value > 0)
    .sort((a, b) => {
      // Parse dates for proper chronological sorting
      const parseDate = (monthDisplay: string) => {
        try {
          // Handle formats like "Jan 2023" or "January 2023"
          const [month, year] = monthDisplay.split(' ');
          const monthMap: { [key: string]: number } = {
            'Jan': 0, 'January': 0, 'Feb': 1, 'February': 1, 'Mar': 2, 'March': 2,
            'Apr': 3, 'April': 3, 'May': 4, 'Jun': 5, 'June': 5,
            'Jul': 6, 'July': 6, 'Aug': 7, 'August': 7, 'Sep': 8, 'September': 8,
            'Oct': 9, 'October': 9, 'Nov': 10, 'November': 10, 'Dec': 11, 'December': 11
          };
          return new Date(parseInt(year), monthMap[month] || 0, 1);
        } catch {
          return new Date(0); // fallback
        }
      };
      
      const dateA = parseDate(a.month_display || '');
      const dateB = parseDate(b.month_display || '');
      return dateA.getTime() - dateB.getTime(); // Oldest to newest
    });

  const chartData = sortedMonthlyValues.map(value => {
    
    const item: any = {
      month_display: value.month_display || `${value.month || 'Unknown'} ${value.year || ''}`,
      total_value: Number(value.total_value || 0),
    };

    // Add individual account values dynamically
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (key !== 'month' && key !== 'year' && key !== 'month_display' && key !== 'total_value' && key !== 'date') {
          const accountValue = value[key as keyof typeof value];
          if (typeof accountValue === 'number' && !isNaN(accountValue)) { 
            item[key] = accountValue;
          }
        }
      });
    }

    return item;
  });


  // Ensure we have valid chart data
  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>No valid portfolio data for selected period</div>
            <div className="text-xs mt-2">
              Original data points: {data.monthly_values.length}, 
              Filtered: {chartData.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get account names for the lines (excluding total_value and month info)
  const sampleItem = chartData[0] || {};
  const accountKeys = Object.keys(sampleItem).filter(
    key => key !== 'month_display' && key !== 'total_value'
  );

  // KEEPING ALL YOUR EXISTING CALCULATION CODE
  const latestValue = chartData[chartData.length - 1]?.total_value || 0;
  const firstValue = chartData[0]?.total_value || 0;
  const totalGrowth = latestValue - firstValue;
  const chartValueGrowth = totalGrowth;
  
  console.log('  First Value:', firstValue, 'from', chartData[0]?.month_display);
  console.log('  Latest Value:', latestValue, 'from', chartData[chartData.length - 1]?.month_display);

  return (
    <div className="space-y-6">
      {/* ONLY CHANGE: Replace hardcoded buttons with UniversalToggle */}
      {onPeriodChange && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">Chart Period:</span>
            <UniversalToggle
              options={periodOptions}
              value={selectedPeriod}
              onChange={(value) => onPeriodChange(String(value))}
              variant="buttons"
              size="sm"
            />
          </div>
          <div className="text-xs text-gray-500">
            Showing {chartData.length} months of data
          </div>
        </div>
      )}

      {/* KEEPING ALL YOUR EXISTING CHART STATS CODE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            ${latestValue.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm">Current Value</div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            +${chartValueGrowth.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm">Chart Value Growth</div>
          <div className="text-gray-500 text-xs">From first to latest data point</div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {portfolioOverview ? `${portfolioOverview.growth_percentage.toFixed(1)}%` : 'See Overview'}
          </div>
          <div className="text-gray-400 text-sm">Real Return %</div>
          <div className="text-gray-500 text-xs">
            {portfolioOverview ? 'Total growth vs deposits' : 'Check portfolio overview above'}
          </div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {chartData.length}
          </div>
          <div className="text-gray-400 text-sm">Months Tracked</div>
        </div>
      </div>

      {/* KEEPING ALL YOUR EXISTING CHART CODE */}
      <div className="h-96 bg-gray-900/50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month_display" 
              stroke="#9CA3AF"
              fontSize={12}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
              iconType="line"
            />
            
            {/* Total portfolio value as filled area */}
            <Area
              type="monotone"
              dataKey="total_value"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#totalGradient)"
              fillOpacity={0.6}
              name="Total Portfolio Value"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* KEEPING ALL YOUR EXISTING ACCOUNT BREAKDOWN CODE */}
      <div className="h-80 bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-white font-medium mb-4">Account Breakdown</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month_display" 
              stroke="#9CA3AF"
              fontSize={12}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
              iconType="line"
            />
            
            {/* Individual account lines */}
            {accountKeys.map((accountKey, index) => {
              // Map account keys to display names and colors
              const displayName = accountKey
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase());
              
              // Get color from mapping or use default
              const colors = [
                '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
                '#8B5CF6', '#EC4899', '#6B7280'
              ];
              const color = colors[index % colors.length];
              
              return (
                <Line
                  key={accountKey}
                  type="monotone"
                  dataKey={accountKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  name={displayName}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KEEPING ALL YOUR EXISTING GROWTH ATTRIBUTION CODE */}
      {data.growth_attribution && (
        <div className="bg-gray-900/50 rounded-lg p-6">
          <h4 className="text-white font-medium mb-4">Growth Attribution</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                ${Number(data.growth_attribution.total_growth || 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Growth</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">
                ${Number(data.growth_attribution.market_growth || 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Market Growth</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">
                ${Number(data.growth_attribution.deposit_growth || 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">From Deposits</div>
            </div>
          </div>
        </div>
      )}

      {/* KEEPING ALL YOUR EXISTING BEST/WORST MONTH CODE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.best_month && (
          <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-xl">📈</span>
              <div>
                <h4 className="text-green-400 font-medium">Best Month</h4>
                <p className="text-white">{data.best_month.month || 'Unknown'}</p>
                <p className="text-green-300">${Number(data.best_month.amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
        
        {data.worst_month && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-red-400 text-xl">📉</span>
              <div>
                <h4 className="text-red-400 font-medium">Worst Month</h4>
                <p className="text-white">{data.worst_month.month || 'Unknown'}</p>
                <p className="text-red-300">${Number(data.worst_month.amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}