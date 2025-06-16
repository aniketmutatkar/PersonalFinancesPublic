// src/components/investments/InvestmentPatterns.tsx
import React from 'react';
import LoadingSkeleton from '../ui/LoadingSkeleton';

// Define the correct interface to match actual API response
interface SpendingPatternsData {
  monthly_changes: Array<{
    month: string;
    spending: number;
    change_percent: number;
  }>;
  seasonal_patterns: Record<string, {
    average_spending: number;
    data_points: number;
    highest: number;
    lowest: number;
  }>;
  volatility: {
    std_deviation: number;
    coefficient_of_variation: number;
  };
}

interface InvestmentPatternsProps {
  patternsData: SpendingPatternsData | undefined;
  isLoading: boolean;
}

export default function InvestmentPatterns({ patternsData, isLoading }: InvestmentPatternsProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <LoadingSkeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!patternsData) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Investment Patterns</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-400 text-sm">No spending pattern data available</p>
        </div>
      </div>
    );
  }

  // Generate investment-related insights from the actual data
  const generateInvestmentInsights = () => {
    const insights = [];
    const { monthly_changes, seasonal_patterns, volatility } = patternsData;

    // Check spending volatility
    if (volatility.coefficient_of_variation > 70) {
      insights.push({
        type: 'spending_volatility',
        severity: 'warning',
        message: `High spending volatility (${volatility.coefficient_of_variation.toFixed(0)}%). Consider budgeting more consistently to free up funds for regular investing.`,
        data: { volatility: volatility.coefficient_of_variation }
      });
    } else if (volatility.coefficient_of_variation < 30) {
      insights.push({
        type: 'spending_consistency',
        severity: 'positive',
        message: `Excellent spending consistency (${volatility.coefficient_of_variation.toFixed(0)}% volatility). This stable spending pattern supports regular investment contributions.`,
        data: { volatility: volatility.coefficient_of_variation }
      });
    }

    // Check recent spending trends
    const recentChanges = monthly_changes.slice(0, 3);
    const increasingSpending = recentChanges.filter(change => change.change_percent > 10).length;
    
    if (increasingSpending >= 2) {
      insights.push({
        type: 'spending_trend',
        severity: 'warning',
        message: 'Recent spending increases detected. Monitor expenses to maintain investment capacity.',
        data: { recent_increases: increasingSpending }
      });
    }

    // Check seasonal patterns for investment timing opportunities
    const seasonalAvgs = Object.entries(seasonal_patterns);
    const lowSpendingMonths = seasonalAvgs
      .filter(([_, data]) => data.average_spending < Math.min(...seasonalAvgs.map(([_, d]) => d.average_spending)) * 1.2)
      .map(([month]) => month);

    if (lowSpendingMonths.length > 0) {
      insights.push({
        type: 'investment_opportunity',
        severity: 'positive',
        message: `Lower spending months identified: ${lowSpendingMonths.join(', ')}. Consider increasing investment contributions during these periods.`,
        data: { opportunity_months: lowSpendingMonths }
      });
    }

    // Add a general insight if no specific patterns found
    if (insights.length === 0) {
      insights.push({
        type: 'general_analysis',
        severity: 'info',
        message: 'Spending patterns appear stable. This provides a good foundation for consistent investment planning.',
        data: {}
      });
    }

    return insights;
  };

  const investmentInsights = generateInvestmentInsights();

  const getPatternIcon = (type: string, severity: string) => {
    if (type === 'investment_opportunity' || severity === 'positive') return '✅';
    if (severity === 'warning') return '⚠️';
    if (severity === 'info') return 'ℹ️';
    return '📊';
  };

  const getPatternStyles = (severity: string) => {
    switch (severity) {
      case 'positive':
        return 'bg-teal-900/20 border-teal-800/30 text-teal-100';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-800/30 text-yellow-100';
      case 'info':
        return 'bg-blue-900/20 border-blue-800/30 text-blue-100';
      default:
        return 'bg-gray-700/50 border-gray-600/50 text-gray-100';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'positive':
        return 'Investment Opportunity';
      case 'warning':
        return 'Attention Needed';
      case 'info':
        return 'Insight';
      default:
        return 'Analysis';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Investment Patterns</h3>
          <p className="text-gray-400 text-sm mt-1">
            Spending pattern analysis for investment planning
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {investmentInsights.length} insight{investmentInsights.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {investmentInsights.map((insight, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${getPatternStyles(insight.severity)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="text-lg mt-0.5">
                {getPatternIcon(insight.type, insight.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">
                    {getSeverityLabel(insight.severity)}
                  </h4>
                  <span className="text-xs opacity-75 uppercase tracking-wide">
                    {insight.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">
                  {insight.message}
                </p>
                
                {/* Display additional data if available */}
                {insight.data && Object.keys(insight.data).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {insight.data.volatility && (
                        <div>
                          <span className="opacity-75">Volatility:</span>
                          <span className="ml-1 font-medium">
                            {insight.data.volatility.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {insight.data.recent_increases && (
                        <div>
                          <span className="opacity-75">Recent Increases:</span>
                          <span className="ml-1 font-medium">
                            {insight.data.recent_increases} months
                          </span>
                        </div>
                      )}
                      {insight.data.opportunity_months && (
                        <div className="col-span-2">
                          <span className="opacity-75">Best Months:</span>
                          <span className="ml-1 font-medium">
                            {insight.data.opportunity_months.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-white">
                ${patternsData.volatility.std_deviation.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">Monthly Std Dev</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                {patternsData.volatility.coefficient_of_variation.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">Volatility</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                {Object.keys(patternsData.seasonal_patterns).length}
              </div>
              <div className="text-xs text-gray-400">Months Analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}