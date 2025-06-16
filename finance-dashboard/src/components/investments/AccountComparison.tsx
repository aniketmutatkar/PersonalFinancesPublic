// src/components/investments/AccountComparison.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { InvestmentTrendsData } from '../../types/api';
import LoadingSkeleton from '../ui/LoadingSkeleton';

interface AccountComparisonProps {
  data: InvestmentTrendsData | undefined;
  isLoading: boolean;
}

export default function AccountComparison({ data, isLoading }: AccountComparisonProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <LoadingSkeleton className="h-8 w-48 mb-4" />
        <LoadingSkeleton className="h-64 w-full mb-4" />
        <LoadingSkeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data || data.account_allocation.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Account Allocation</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No account allocation data available</p>
        </div>
      </div>
    );
  }

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.payload.account}</p>
          <p className="text-teal-400 text-sm">
            ${data.payload.total.toLocaleString()} ({data.payload.percentage.toFixed(1)}%)
          </p>
          <p className="text-gray-300 text-xs">
            ${data.payload.monthly_average.toLocaleString()}/month avg
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderLabel = (entry: any) => {
    if (entry.percentage < 5) return ''; // Hide labels for small slices
    return `${entry.percentage.toFixed(0)}%`;
  };

  // Sort accounts by total for better display
  const sortedAccounts = [...data.account_allocation].sort((a, b) => b.total - a.total);

  const totalInvested = sortedAccounts.reduce((sum, account) => sum + account.total, 0);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Account Allocation</h3>
          <p className="text-gray-400 text-sm mt-1">
            Total: ${totalInvested.toLocaleString()} across {sortedAccounts.length} accounts
          </p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedAccounts}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total"
              stroke="#374151"
              strokeWidth={2}
            >
              {sortedAccounts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Account Details Table */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-white border-b border-gray-700 pb-2">
          Account Details
        </h4>
        
        {sortedAccounts.map((account, index) => (
          <div 
            key={account.account}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: account.color }}
              ></div>
              <div>
                <div className="text-white font-medium">{account.account}</div>
                <div className="text-gray-400 text-xs">
                  ${account.monthly_average.toLocaleString()}/month avg
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-white font-medium">
                ${account.total.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">
                {account.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-teal-400">
              {sortedAccounts.length}
            </div>
            <div className="text-xs text-gray-400">Active Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-teal-400">
              ${(totalInvested / sortedAccounts.length).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Avg per Account</div>
          </div>
        </div>
      </div>
    </div>
  );
}