import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartContainer from '../charts/ChartContainer';

interface NetWorthData {
  month: string;
  net_worth: number;
  liquid_assets: number;
  investment_assets: number;
}

interface NetWorthChartProps {
  data: NetWorthData[];
  currentNetWorth: number;
}

function NetWorthChart({ data, currentNetWorth }: NetWorthChartProps) {
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
      const data = payload[0].payload;
      return (
        <div className="card-compact">
          <p className="text-primary font-medium element-gap">{label}</p>
          <div className="space-y-1">
            <p className="text-success font-bold">
              Net Worth: {formatCurrency(data.net_worth)}
            </p>
            <p className="text-info text-sm">
              Liquid: {formatCurrency(data.liquid_assets)}
            </p>
            <p className="text-accent text-sm">
              Invested: {formatCurrency(data.investment_assets)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Trend indicator component - DESIGN SYSTEM
  const TrendIndicator = () => (
    <span className="text-success text-sm flex items-center">
      <span className="mr-1">↗</span>
      Trending Up
    </span>
  );

  return (
    <ChartContainer
      title="Net Worth Growth (24 Months)"
      headerAction={<TrendIndicator />}
      variant="large"
    >
      {/* Chart Section - DESIGN SYSTEM */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${Math.round(value / 1000)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="net_worth"
              stroke="#14B8A6"
              strokeWidth={3}
              dot={{ fill: '#14B8A6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#14B8A6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Footer Section - DESIGN SYSTEM */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
        <span className="text-xs text-muted">24 months ago</span>
        <span className="text-sm text-success font-medium">
          Current: {formatCurrency(currentNetWorth)}
        </span>
      </div>
    </ChartContainer>
  );
}

export default NetWorthChart;