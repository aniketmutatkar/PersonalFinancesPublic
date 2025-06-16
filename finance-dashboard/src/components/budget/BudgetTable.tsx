// src/components/budget/BudgetTable.tsx - Clean & Simple Version
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetTableProps {
  data: any;
  type: 'yearly' | 'monthly';
  year?: number;
  monthYear?: string;
}

export default function BudgetTable({ data, type, year, monthYear }: BudgetTableProps) {
  const tableData = useMemo(() => {
    if (type === 'monthly') {
      // Monthly view - show all categories with enhanced data
      return (data.budget_items || [])
        .map((item: any) => ({
          category: item.category,
          budget: Number(item.budget_amount) || 0,
          actual: Number(item.actual_amount) || 0,
          variance: Number(item.variance) || 0,
          isOverBudget: item.is_over_budget,
          utilizationPercent: Number(item.budget_amount) > 0 
            ? Math.min(150, (Number(item.actual_amount) / Number(item.budget_amount)) * 100)
            : 0,
          status: item.is_over_budget ? 'over' : 
                  Math.abs(Number(item.variance)) < Number(item.budget_amount) * 0.05 ? 'on-track' : 'under'
        }))
        // Sort by variance: most over budget first, then most under budget
        .sort((a: any, b: any) => a.variance - b.variance);
    } else {
      // Yearly view - show monthly performance breakdown
      const months = data.months || [];
      const budgetData = data.budget_data || {};

      return months
        .map((month: string) => {
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
          
          // Determine performance status
          let status = 'excellent';
          if (adherenceRate < 60) status = 'poor';
          else if (adherenceRate < 80) status = 'warning';
          else if (adherenceRate < 95) status = 'good';

          return {
            month: month,
            monthShort: month.substring(0, 3),
            budget: monthlyBudget,
            actual: monthlyActual,
            variance: variance,
            adherenceRate: adherenceRate,
            overBudgetCount: overBudgetCount,
            totalCategories: totalCategories,
            status: status,
            utilizationPercent: monthlyBudget > 0 ? (monthlyActual / monthlyBudget) * 100 : 0
          };
        })
        // Sort by variance: most over budget first, then most under budget
        .sort((a: any, b: any) => a.variance - b.variance);
    }
  }, [data, type]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getSimpleStatus = (variance: number) => {
    if (variance < 0) return <span className="text-red-400 text-sm font-medium">Over</span>;
    if (variance > 0) return <span className="text-green-400 text-sm font-medium">Under</span>;
    return <span className="text-blue-400 text-sm font-medium">On Track</span>;
  };

  const getProgressBarColor = (utilizationPercent: number, isOverBudget?: boolean) => {
    if (isOverBudget || utilizationPercent > 100) return 'bg-red-500';
    if (utilizationPercent > 90) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getTrendIcon = (variance: number) => {
    if (variance > 0) return <span className="text-green-400 text-xs">↓</span>;
    if (variance < 0) return <span className="text-red-400 text-xs">↑</span>;
    return <span className="text-gray-400 text-xs">-</span>;
  };

  const title = type === 'monthly' ? 'Category Performance' : 'Monthly Performance Breakdown';

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full flex flex-col">
      {/* Simple Header */}
      <div className="mb-6">
        <h3 className="text-white font-semibold text-xl">{title}</h3>
        <p className="text-gray-400 text-sm mt-2">
          {type === 'monthly' 
            ? `${tableData.filter((item: any) => item.variance < 0).length} of ${tableData.length} categories over budget`
            : `${tableData.reduce((sum: number, month: any) => sum + month.overBudgetCount, 0)} over-budget instances across ${tableData.length} months`
          }
        </p>
      </div>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-y-auto pr-6">
        <div className="space-y-1">
          {tableData.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-gray-400">
                <p className="text-sm">No {type === 'monthly' ? 'categories' : 'months'} found</p>
              </div>
            </div>
          ) : (
            tableData.map((item: any, index: number) => (
              <div key={index} className="border-b border-gray-700/50 py-4 last:border-b-0 hover:bg-gray-800/30 transition-colors">
                {/* Main Row */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium text-base">
                      {type === 'monthly' ? item.category : item.monthShort}
                    </span>
                    {getSimpleStatus(item.variance)}
                  </div>
                  <div className="text-right">
                    <div className="text-white text-base">
                      {formatCurrency(item.actual)} of {formatCurrency(item.budget)}
                    </div>
                  </div>
                </div>
                
                {/* Secondary Info Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">
                    {item.utilizationPercent.toFixed(0)}% used
                  </span>
                  <span className={`${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}