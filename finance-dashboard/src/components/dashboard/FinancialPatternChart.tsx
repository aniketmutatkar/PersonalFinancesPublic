// src/components/dashboard/FinancialPatternChart.tsx
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Line
} from 'recharts';

interface MonthlyData {
  name: string;
  fullName: string;
  spending: number;
  investment: number;
  income: number;
  availableCash: number; // Income - Spending (better than surplus)
  month: string;
  year: number;
}

interface FinancialPatternChartProps {
  monthlyData: MonthlyData[];
  currentAvailableCash: number;
}

function FinancialPatternChart({ monthlyData, currentAvailableCash }: FinancialPatternChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate trends from 24 months of data
  const avgSpending = monthlyData.reduce((sum, d) => sum + d.spending, 0) / monthlyData.length;
  const avgInvestment = monthlyData.reduce((sum, d) => sum + d.investment, 0) / monthlyData.length;
  const avgIncome = monthlyData.reduce((sum, d) => sum + d.income, 0) / monthlyData.length;
  const avgAvailableCash = monthlyData.reduce((sum, d) => sum + d.availableCash, 0) / monthlyData.length;

  // Calculate year-over-year growth
  const getYearOverYearGrowth = (metric: keyof MonthlyData) => {
    if (monthlyData.length < 12) return 0;
    
    const recent12Months = monthlyData.slice(-12);
    const previous12Months = monthlyData.slice(-24, -12);
    
    if (previous12Months.length === 0) return 0;
    
    const recentAvg = recent12Months.reduce((sum, d) => sum + (d[metric] as number), 0) / 12;
    const previousAvg = previous12Months.reduce((sum, d) => sum + (d[metric] as number), 0) / 12;
    
    return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  };

  const spendingGrowth = getYearOverYearGrowth('spending');
  const investmentGrowth = getYearOverYearGrowth('investment');
  const incomeGrowth = getYearOverYearGrowth('income');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
          <p className="text-white font-medium mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-green-400 text-sm">
              💰 Income: {formatCurrency(data.income)}
            </p>
            <p className="text-red-400 text-sm">
              💸 Spending: {formatCurrency(data.spending)}
            </p>
            <p className="text-blue-400 text-sm">
              📈 Investment: {formatCurrency(data.investment)}
            </p>
            <div className="border-t border-gray-600 pt-1 mt-2">
              <p className={`text-sm font-bold ${data.availableCash >= 0 ? 'text-yellow-300' : 'text-orange-300'}`}>
                💵 Available Cash: {formatCurrency(data.availableCash)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (Income - Spending, before investments)
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-lg">24-Month Financial Flow</h3>
          <p className="text-gray-400 text-sm">Income, spending, investments, and available cash</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span className="text-gray-300">Income</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span className="text-gray-300">Spending</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span className="text-gray-300">Investment</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span className="text-gray-300">Available Cash</span>
          </div>
        </div>
      </div>
      
      {/* Main Flow Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthlyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F87171" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#F87171" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${Math.round(value / 1000)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference line for zero */}
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
            
            {/* Income area (background) */}
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={1}
              fill="url(#incomeGradient)"
              name="Income"
              fillOpacity={0.2}
            />
            
            {/* Spending area */}
            <Area
              type="monotone"
              dataKey="spending"
              stroke="#F87171"
              strokeWidth={2}
              fill="url(#spendingGradient)"
              name="Spending"
            />
            
            {/* Investment area */}
            <Area
              type="monotone"
              dataKey="investment"
              stroke="#60A5FA"
              strokeWidth={2}
              fill="url(#investmentGradient)"
              name="Investment"
            />
            
            {/* Available Cash line (most important) */}
            <Line
              type="monotone"
              dataKey="availableCash"
              stroke="#FCD34D"
              strokeWidth={3}
              dot={{ fill: '#FCD34D', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#FCD34D', strokeWidth: 2 }}
              name="Available Cash"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Analytics Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: 24-Month Averages */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">24-Month Averages</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-gray-700/30 rounded-lg p-3">
              <div className="text-lg font-bold text-green-400">
                {formatCurrency(avgIncome)}
              </div>
              <div className="text-xs text-gray-400">Avg Income</div>
              <div className={`text-xs mt-1 ${incomeGrowth > 0 ? 'text-green-300' : 'text-red-300'}`}>
                {incomeGrowth > 0 ? '+' : ''}{incomeGrowth.toFixed(1)}% YoY
              </div>
            </div>
            
            <div className="text-center bg-gray-700/30 rounded-lg p-3">
              <div className="text-lg font-bold text-red-400">
                {formatCurrency(avgSpending)}
              </div>
              <div className="text-xs text-gray-400">Avg Spending</div>
              <div className={`text-xs mt-1 ${spendingGrowth > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {spendingGrowth > 0 ? '+' : ''}{spendingGrowth.toFixed(1)}% YoY
              </div>
            </div>
            
            <div className="text-center bg-gray-700/30 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-400">
                {formatCurrency(avgInvestment)}
              </div>
              <div className="text-xs text-gray-400">Avg Investment</div>
              <div className={`text-xs mt-1 ${investmentGrowth > 0 ? 'text-green-300' : 'text-red-300'}`}>
                {investmentGrowth > 0 ? '+' : ''}{investmentGrowth.toFixed(1)}% YoY
              </div>
            </div>
            
            <div className="text-center bg-gray-700/30 rounded-lg p-3">
              <div className="text-lg font-bold text-yellow-400">
                {formatCurrency(avgAvailableCash)}
              </div>
              <div className="text-xs text-gray-400">Avg Available</div>
              <div className="text-xs text-gray-400 mt-1">Before investing</div>
            </div>
          </div>
        </div>

        {/* Right: Current Performance */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Current vs Average</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Available Cash</span>
              <div className={`text-lg font-bold flex items-center ${
                currentAvailableCash >= avgAvailableCash ? 'text-green-400' : 'text-orange-400'
              }`}>
                {currentAvailableCash >= avgAvailableCash ? '↗' : '↘'} 
                <span className="ml-1">
                  {Math.abs(((currentAvailableCash - avgAvailableCash) / Math.abs(avgAvailableCash)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              Current available: {formatCurrency(currentAvailableCash)}
            </div>
            
            <div className={`text-xs px-3 py-2 rounded-lg ${
              currentAvailableCash >= avgAvailableCash ? 
                'bg-green-900/30 text-green-300 border border-green-800/30' : 
                'bg-orange-900/30 text-orange-300 border border-orange-800/30'
            }`}>
              {currentAvailableCash >= avgAvailableCash ? 
                '💰 More cash available than average' : 
                '⚠️ Less cash available than average'
              }
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              Available Cash = Income - Spending<br/>
              (Money you have before choosing to invest)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialPatternChart;