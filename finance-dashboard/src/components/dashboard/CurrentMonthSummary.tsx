// src/components/dashboard/CurrentMonthSummary.tsx
import React from 'react';

interface CurrentMonthSummaryProps {
  overview: any;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function CurrentMonthSummary({ overview }: CurrentMonthSummaryProps) {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const income = overview.cash_flow_analysis.monthly_income;
  const spending = overview.cash_flow_analysis.monthly_spending;
  const investments = overview.cash_flow_analysis.monthly_investments;
  const availableCash = income - spending; // Better than surplus
  
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full">
      <h3 className="text-white font-semibold mb-4 text-lg">Current Month</h3>
      
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400">{currentMonth}</div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(income)}
          </div>
          <div className="text-sm text-gray-300">total income</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Spent</div>
            <div className="text-red-400 font-medium text-lg">
              {formatCurrency(spending)}
            </div>
            <div className="text-xs text-gray-500">
              {formatPercentage((spending / income) * 100)} of income
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Invested</div>
            <div className="text-blue-400 font-medium text-lg">
              {formatCurrency(investments)}
            </div>
            <div className="text-xs text-gray-500">
              {formatPercentage((investments / income) * 100)} of income
            </div>
          </div>
        </div>

        {/* Available Cash (Better than Surplus) */}
        <div className={`rounded-lg p-4 border ${
          availableCash >= 0 ? 'bg-green-900/20 border-green-800/30' : 'bg-orange-900/20 border-orange-800/30'
        }`}>
          <div className="text-xs text-gray-400 mb-1">
            Available Cash = Income - Spending
          </div>
          <div className={`text-xl font-bold ${availableCash >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
            {formatCurrency(availableCash)}
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {availableCash >= 0 ? 
              'Money available before investing' : 
              'Spending more than income'
            }
          </div>
        </div>
        
        <div className="pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Financial Health</div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-sm text-green-400 font-medium">
              {overview.financial_health.stability_assessment.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrentMonthSummary;