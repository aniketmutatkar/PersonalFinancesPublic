// src/components/investments/InvestmentTrends.tsx - UPDATED VERSION
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InvestmentTrendsData } from '../../types/api';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import InvestmentDateFilter from './InvestmentDateFilter';

interface InvestmentTrendsProps {
  data: InvestmentTrendsData | undefined;
  isLoading: boolean;
}

interface DateRange {
  start: string;
  end: string;
}

export default function InvestmentTrends({ data, isLoading }: InvestmentTrendsProps) {
  // Initialize date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (!data || data.monthly_trends.length === 0) {
      return { start: '', end: '' };
    }
    
    const sortedTrends = [...data.monthly_trends].sort((a, b) => 
      new Date(a.year, a.month === 'January' ? 0 : 
               a.month === 'February' ? 1 : 
               a.month === 'March' ? 2 : 
               a.month === 'April' ? 3 : 
               a.month === 'May' ? 4 : 
               a.month === 'June' ? 5 : 
               a.month === 'July' ? 6 : 
               a.month === 'August' ? 7 : 
               a.month === 'September' ? 8 : 
               a.month === 'October' ? 9 : 
               a.month === 'November' ? 10 : 11).getTime() - 
      new Date(b.year, b.month === 'January' ? 0 : 
               b.month === 'February' ? 1 : 
               b.month === 'March' ? 2 : 
               b.month === 'April' ? 3 : 
               b.month === 'May' ? 4 : 
               b.month === 'June' ? 5 : 
               b.month === 'July' ? 6 : 
               b.month === 'August' ? 7 : 
               b.month === 'September' ? 8 : 
               b.month === 'October' ? 9 : 
               b.month === 'November' ? 10 : 11).getTime()
    );
    
    // Default to last 12 months
    const latest = sortedTrends[sortedTrends.length - 1];
    const twelveMonthsAgo = new Date(latest.year, 
      latest.month === 'January' ? 0 : 
      latest.month === 'February' ? 1 : 
      latest.month === 'March' ? 2 : 
      latest.month === 'April' ? 3 : 
      latest.month === 'May' ? 4 : 
      latest.month === 'June' ? 5 : 
      latest.month === 'July' ? 6 : 
      latest.month === 'August' ? 7 : 
      latest.month === 'September' ? 8 : 
      latest.month === 'October' ? 9 : 
      latest.month === 'November' ? 10 : 11);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    return {
      start: twelveMonthsAgo.toISOString().slice(0, 7),
      end: `${latest.year}-${(latest.month === 'January' ? 1 : 
                           latest.month === 'February' ? 2 : 
                           latest.month === 'March' ? 3 : 
                           latest.month === 'April' ? 4 : 
                           latest.month === 'May' ? 5 : 
                           latest.month === 'June' ? 6 : 
                           latest.month === 'July' ? 7 : 
                           latest.month === 'August' ? 8 : 
                           latest.month === 'September' ? 9 : 
                           latest.month === 'October' ? 10 : 
                           latest.month === 'November' ? 11 : 12).toString().padStart(2, '0')}`
    };
  });

  // Filter data based on selected date range
  const filteredData = useMemo(() => {
    if (!data || !dateRange.start || !dateRange.end) return data;
    
    const filtered = data.monthly_trends.filter(trend => {
      const trendMonth = `${trend.year}-${(trend.month === 'January' ? 1 : 
                                         trend.month === 'February' ? 2 : 
                                         trend.month === 'March' ? 3 : 
                                         trend.month === 'April' ? 4 : 
                                         trend.month === 'May' ? 5 : 
                                         trend.month === 'June' ? 6 : 
                                         trend.month === 'July' ? 7 : 
                                         trend.month === 'August' ? 8 : 
                                         trend.month === 'September' ? 9 : 
                                         trend.month === 'October' ? 10 : 
                                         trend.month === 'November' ? 11 : 12).toString().padStart(2, '0')}`;
      return trendMonth >= dateRange.start && trendMonth <= dateRange.end;
    });
    
    return {
      ...data,
      monthly_trends: filtered
    };
  }, [data, dateRange]);

  // Get available months for the filter
  const availableMonths = useMemo(() => {
    if (!data) return [];
    
    return data.monthly_trends.map(trend => 
      `${trend.year}-${(trend.month === 'January' ? 1 : 
                       trend.month === 'February' ? 2 : 
                       trend.month === 'March' ? 3 : 
                       trend.month === 'April' ? 4 : 
                       trend.month === 'May' ? 5 : 
                       trend.month === 'June' ? 6 : 
                       trend.month === 'July' ? 7 : 
                       trend.month === 'August' ? 8 : 
                       trend.month === 'September' ? 9 : 
                       trend.month === 'October' ? 10 : 
                       trend.month === 'November' ? 11 : 12).toString().padStart(2, '0')}`
    ).sort();
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-8">
        <LoadingSkeleton className="h-8 w-64 mb-4" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data || data.monthly_trends.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Investment Trends Over Time</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-400">No investment trend data available</p>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: ${entry.value?.toLocaleString() || 0}
            </p>
          ))}
          <p className="text-teal-400 text-sm font-medium mt-1 border-t border-gray-600 pt-1">
            Total: ${payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate chart height based on filtered data length
  const chartHeight = Math.max(400, Math.min(500, (filteredData?.monthly_trends.length || 0) * 15));


  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Investment Trends Over Time</h3>
          <p className="text-gray-400 text-sm mt-1">
            Monthly investment deposits by account
            {data.peak_month.amount > 0 && (
              <span className="ml-2 text-teal-400">
                • Peak: {data.peak_month.month} (${data.peak_month.amount.toLocaleString()})
              </span>
            )}
          </p>
        </div>
        
        {/* Date Range Filter */}
        <InvestmentDateFilter
          availableMonths={availableMonths}
          selectedRange={dateRange}
          onRangeChange={setDateRange}
        />
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData?.monthly_trends || []}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month_display"
              stroke="#9CA3AF"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={(filteredData?.monthly_trends.length || 0) > 12 ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            
            {/* Investment account lines */}
            <Line
              type="monotone"
              dataKey="acorns"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              name="Acorns"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="wealthfront"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              name="Wealthfront"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="robinhood"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              name="Robinhood"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="schwab"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
              name="Schwab"
              connectNulls={false}
            />
            
            {/* Total line - highlighted */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5 }}
              name="Total"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats - update to show filtered data count */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
        {data.account_allocation.map((account) => (
          <div key={account.account} className="text-center">
            <div 
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: account.color }}
            ></div>
            <div className="text-xs text-gray-400">{account.account}</div>
            <div className="text-sm text-white font-medium">
              ${account.monthly_average.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">avg/month</div>
          </div>
        ))}
      </div>
      
      {/* Show filtered period info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing {filteredData?.monthly_trends.length || 0} months of data
      </div>
    </div>
  );
}