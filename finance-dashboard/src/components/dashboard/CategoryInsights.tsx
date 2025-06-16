// src/components/dashboard/CategoryInsights.tsx
import React, { useEffect, useState } from 'react';

interface CategoryInsightsProps {
  overview: any;
  monthlySummaries: any[];
  selectedCategories?: string[];
}

interface CategoryWithInsights {
  category: string;
  monthly_average: number;
  budget_amount: number;
  variance: number;
  variancePercent: number;
  direction: 'over_budget' | 'over_budget_light' | 'under_budget' | 'neutral';
  trend: string;
  color: string;
  last6MonthsAvg: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CategoryInsights({ 
  overview, 
  monthlySummaries, 
  selectedCategories = ['Food', 'Travel', 'Shopping', 'Groceries', 'Recreation', 'Venmo']
}: CategoryInsightsProps) {
  
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Fetch budget data
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch('/api/budgets');
        const budgetData = await response.json();
        
        // Convert to regular object with number values
        const budgetDict: Record<string, number> = {};
        Object.entries(budgetData).forEach(([category, amount]) => {
          budgetDict[category] = parseFloat(amount as string);
        });
        
        setBudgets(budgetDict);
      } catch (error) {
        console.error('Failed to fetch budgets:', error);
        setBudgets({});
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Category Insights</h3>
          <div className="text-xs text-gray-400">Loading budget data...</div>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-700/50 rounded-lg p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Process selected categories with budget comparison
  const categoriesWithInsights: CategoryWithInsights[] = selectedCategories.map((categoryName) => {
    if (!monthlySummaries || monthlySummaries.length < 6) {
      return { 
        category: categoryName,
        monthly_average: 0,
        budget_amount: budgets[categoryName] || 0,
        variance: 0, 
        variancePercent: 0,
        direction: 'neutral' as const,
        trend: 'No data',
        color: '#6B7280', // Gray
        last6MonthsAvg: 0
      };
    }
    
    // Calculate last 6 months average
    const last6Months = monthlySummaries.slice(0, 6);
    const last6MonthsTotal = last6Months.reduce((sum, summary) => {
      return sum + Math.abs(parseFloat(summary.category_totals[categoryName] || '0'));
    }, 0);
    const last6MonthsAvg = last6MonthsTotal / 6;
    
    // Get budget amount
    const budgetAmount = budgets[categoryName] || 0;
    
    // Calculate variance against budget
    const variance = last6MonthsAvg - budgetAmount;
    const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
    
    // Determine direction and color
    let direction: 'over_budget' | 'over_budget_light' | 'under_budget' | 'neutral';
    let trend: string;
    let color: string;
    
    if (budgetAmount === 0) {
    // No budget set
    direction = 'neutral';
    trend = 'No budget';
    color = '#6B7280'; // Gray
    } else if (variancePercent > 20) {
    // Over budget by more than 10%
    direction = 'over_budget';
    trend = 'Over budget';
    color = '#EF4444'; // Red
    } else if (variancePercent > 0 && variancePercent <= 20) {
    // Over budget by up to 10%
    direction = 'over_budget_light';
    trend = 'Over budget (within 10%)';
    color = '#F97316'; // Orange
    } else if (variancePercent < 0) {
    // Under budget (variance less than 0)
    direction = 'under_budget';
    trend = 'Under budget';
    color = '#10B981'; // Green
    } else {
    // Exactly on budget (variancePercent === 0)
    direction = 'neutral';
    trend = 'On track';
    color = '#6B7280'; // Gray
    }
    
    return {
      category: categoryName,
      monthly_average: last6MonthsAvg,
      budget_amount: budgetAmount,
      variance: variance,
      variancePercent: variancePercent,
      direction,
      trend,
      color,
      last6MonthsAvg: last6MonthsAvg
    };
  });

  // Filter out categories with zero spending AND no budget
  const nonZeroCategories = categoriesWithInsights.filter(cat => 
    cat.last6MonthsAvg > 0 || cat.budget_amount > 0
  );

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Category Insights</h3>
        <div className="text-xs text-gray-400">
          Showing: {selectedCategories.join(', ')}
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-4">Last 6 months average vs budget comparison</div>
      
      {/* Category Grid - 3 columns × 2 rows */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {nonZeroCategories.map((cat: CategoryWithInsights, index: number) => (
          <div 
            key={index} 
            className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
            style={{ borderLeft: `4px solid ${cat.color}` }}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-white font-medium text-sm">{cat.category}</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${
                cat.direction === 'over_budget' ? 'bg-red-900/30 text-red-300' :
                cat.direction === 'under_budget' ? 'bg-green-900/30 text-green-300' :
                'bg-gray-600/30 text-gray-300'
              }`}>
                {cat.trend}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-white font-semibold">
                {formatCurrency(cat.last6MonthsAvg)}
                <span className="text-gray-400 text-xs ml-1">/month</span>
              </div>
              
              {cat.budget_amount > 0 ? (
                <div>
                  <div className="text-xs text-gray-400">
                    Budget: {formatCurrency(cat.budget_amount)}
                  </div>
                  <div className={`text-xs flex items-center ${
                    cat.direction === 'over_budget' ? 'text-red-400' :
                    cat.direction === 'under_budget' ? 'text-green-400' :
                    'text-gray-400'
                  }`}>
                    {cat.direction === 'over_budget' && '↗'}
                    {cat.direction === 'under_budget' && '↘'}
                    {cat.direction === 'neutral' && '→'}
                    <span className="ml-1">
                      {Math.abs(cat.variancePercent).toFixed(0)}% vs budget
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  No budget set
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Fill empty spots if fewer than 6 categories */}
        {Array.from({ length: Math.max(0, 6 - nonZeroCategories.length) }, (_, i) => (
          <div key={`empty-${i}`} className="bg-gray-700/20 rounded-lg p-4 border border-gray-700 border-dashed">
            <div className="text-center text-gray-500 text-sm">
              No data
            </div>
          </div>
        ))}
      </div>
      
      {/* Budget Performance Summary */}
      <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-700">
        <div>
          <div className="text-lg font-semibold text-red-400">
            {nonZeroCategories.filter((c: CategoryWithInsights) => c.direction === 'over_budget' || c.direction === 'over_budget_light').length}
          </div>
          <div className="text-xs text-gray-400">Over Budget</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-green-400">
            {nonZeroCategories.filter((c: CategoryWithInsights) => c.direction === 'under_budget').length}
          </div>
          <div className="text-xs text-gray-400">Under Budget</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-400">
            {nonZeroCategories.filter((c: CategoryWithInsights) => c.direction === 'neutral').length}
          </div>
          <div className="text-xs text-gray-400">On Track</div>
        </div>
      </div>
      
      {/* Spending vs Budget Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">6-Month Budget Performance</div>
        <div className="text-sm text-gray-300 mt-1">
          Total 6mo avg: {formatCurrency(
            nonZeroCategories.reduce((sum, cat) => sum + cat.last6MonthsAvg, 0)
          )} • 
          Total budget: {formatCurrency(
            nonZeroCategories.reduce((sum, cat) => sum + cat.budget_amount, 0)
          )}
        </div>
        {nonZeroCategories.find((c: CategoryWithInsights) => c.direction === 'over_budget') && (
          <div className="text-xs text-red-300 mt-1">
            ⚠️ Watch: {nonZeroCategories.find((c: CategoryWithInsights) => c.direction === 'over_budget')?.category}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryInsights;