// src/components/analytics/PatternInsights.tsx
import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, Info } from 'lucide-react';

// CORRECTED interface to match actual API response
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

interface PatternInsightsProps {
  patternsData: SpendingPatternsData | undefined;
  isLoading: boolean;
}

export default function PatternInsights({ patternsData, isLoading }: PatternInsightsProps) {
  
  const generatePatterns = () => {
    if (!patternsData) return [];

    const patterns = [];
    const { monthly_changes, seasonal_patterns, volatility } = patternsData;

    // Volatility analysis
    if (volatility.coefficient_of_variation > 70) {
      patterns.push({
        type: 'high_volatility',
        severity: 'warning',
        message: `Your spending varies significantly month-to-month (${volatility.coefficient_of_variation.toFixed(0)}% volatility). Consider creating a more consistent budget to improve financial predictability.`,
        data: { volatility: volatility.coefficient_of_variation }
      });
    } else if (volatility.coefficient_of_variation < 30) {
      patterns.push({
        type: 'consistent_spending',
        severity: 'positive',
        message: `Excellent spending consistency (${volatility.coefficient_of_variation.toFixed(0)}% volatility). Your predictable spending patterns make budgeting and financial planning much easier.`,
        data: { volatility: volatility.coefficient_of_variation }
      });
    } else {
      patterns.push({
        type: 'moderate_volatility',
        severity: 'info',
        message: `Moderate spending volatility (${volatility.coefficient_of_variation.toFixed(0)}%). Some variation is normal, but there's room for more consistent budgeting.`,
        data: { volatility: volatility.coefficient_of_variation }
      });
    }

    // Recent spending trends
    const recentTrends = monthly_changes.slice(0, 3);
    const increasingMonths = recentTrends.filter(change => change.change_percent > 20).length;
    const decreasingMonths = recentTrends.filter(change => change.change_percent < -20).length;

    if (increasingMonths >= 2) {
      patterns.push({
        type: 'spending_increases',
        severity: 'warning',
        message: `Spending has increased significantly in ${increasingMonths} of the last 3 months. Review recent expenses to identify any new recurring costs.`,
        data: { increasing_months: increasingMonths }
      });
    } else if (decreasingMonths >= 2) {
      patterns.push({
        type: 'spending_decreases',
        severity: 'positive',
        message: `Great progress! Spending has decreased in ${decreasingMonths} of the last 3 months, showing improved expense control.`,
        data: { decreasing_months: decreasingMonths }
      });
    }

    // Seasonal pattern analysis
    const monthlyAverages = Object.entries(seasonal_patterns);
    const avgSpending = monthlyAverages.reduce((sum, [_, data]) => sum + data.average_spending, 0) / monthlyAverages.length;
    
    const highSpendingMonths = monthlyAverages
      .filter(([_, data]) => data.average_spending > avgSpending * 1.2)
      .map(([month]) => month);

    const lowSpendingMonths = monthlyAverages
      .filter(([_, data]) => data.average_spending < avgSpending * 0.8)
      .map(([month]) => month);

    if (highSpendingMonths.length > 0) {
      patterns.push({
        type: 'seasonal_peaks',
        severity: 'info',
        message: `Your highest spending typically occurs in: ${highSpendingMonths.join(', ')}. Plan for these months by saving extra in lower-spending periods.`,
        data: { peak_months: highSpendingMonths }
      });
    }

    if (lowSpendingMonths.length > 0) {
      patterns.push({
        type: 'savings_opportunities',
        severity: 'positive',
        message: `${lowSpendingMonths.join(', ')} are typically your lowest spending months. Consider increasing savings or investments during these periods.`,
        data: { opportunity_months: lowSpendingMonths }
      });
    }

    // Extreme spending analysis
    const extremeChanges = monthly_changes.filter(change => Math.abs(change.change_percent) > 100);
    if (extremeChanges.length > 0) {
      patterns.push({
        type: 'extreme_fluctuations',
        severity: 'warning',
        message: `Detected ${extremeChanges.length} months with extreme spending changes (>100%). Review these periods: ${extremeChanges.slice(0, 3).map(c => c.month).join(', ')}.`,
        data: { extreme_months: extremeChanges.length }
      });
    }

    return patterns;
  };

  const patterns = generatePatterns();

  const getPatternIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'positive':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      default:
        return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  const getPatternBorderColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'border-yellow-500';
      case 'positive':
        return 'border-green-500';
      default:
        return 'border-blue-500';
    }
  };

  const getPatternBgColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'bg-yellow-500/10';
      case 'positive':
        return 'bg-green-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
        <h3 className="text-white font-semibold text-3xl mb-6">Spending Patterns & Insights</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!patternsData) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
        <h3 className="text-white font-semibold text-3xl mb-6">Spending Patterns & Insights</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No spending patterns available</p>
            <p className="text-sm mt-1">Data loading or unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total months analyzed
  const totalMonthsAnalyzed = Object.values(patternsData.seasonal_patterns)
    .reduce((sum, month) => sum + month.data_points, 0);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-white font-semibold text-3xl mb-2">Spending Patterns & Insights</h3>
          <p className="text-gray-400">
            Analyzing spending behavior across {totalMonthsAnalyzed} months of data
          </p>
          <p className="text-gray-500 text-sm">
            Volatility: {patternsData.volatility.coefficient_of_variation.toFixed(0)}% • 
            Monthly Std Dev: ${patternsData.volatility.std_deviation.toFixed(0)}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Note: Patterns show overall trends, not filtered by selected years
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Patterns Found</p>
          <p className="text-white text-2xl font-bold">{patterns.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {patterns.length > 0 ? (
          patterns.map((pattern, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-lg ${getPatternBorderColor(pattern.severity)} ${getPatternBgColor(pattern.severity)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getPatternIcon(pattern.severity)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-semibold capitalize">
                      {pattern.type.replace('_', ' ')}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pattern.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                      pattern.severity === 'positive' ? 'bg-green-500/20 text-green-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {pattern.severity}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-3">{pattern.message}</p>
                  
                  {/* Pattern-specific data display */}
                  {pattern.data && (
                    <div className="text-sm text-gray-400">
                      {pattern.data.volatility && (
                        <div>
                          <span className="text-gray-500">Spending Volatility:</span>
                          <span className="text-white ml-2">{pattern.data.volatility.toFixed(1)}%</span>
                        </div>
                      )}
                      
                      {pattern.data.peak_months && (
                        <div className="mt-2">
                          <span className="text-gray-500">Peak Spending Months:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {pattern.data.peak_months.map((month: string, idx: number) => (
                              <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
                                {month}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {pattern.data.opportunity_months && (
                        <div className="mt-2">
                          <span className="text-gray-500">Savings Opportunity Months:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {pattern.data.opportunity_months.map((month: string, idx: number) => (
                              <span key={idx} className="bg-green-900/30 px-2 py-1 rounded text-xs">
                                {month}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(pattern.data.increasing_months || pattern.data.decreasing_months || pattern.data.extreme_months) && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          {pattern.data.increasing_months && (
                            <div>
                              <span className="text-gray-500">Increasing Months:</span>
                              <span className="text-yellow-400 ml-2">{pattern.data.increasing_months}</span>
                            </div>
                          )}
                          {pattern.data.decreasing_months && (
                            <div>
                              <span className="text-gray-500">Decreasing Months:</span>
                              <span className="text-green-400 ml-2">{pattern.data.decreasing_months}</span>
                            </div>
                          )}
                          {pattern.data.extreme_months && (
                            <div>
                              <span className="text-gray-500">Extreme Changes:</span>
                              <span className="text-red-400 ml-2">{pattern.data.extreme_months}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">No significant patterns detected</p>
            <p className="text-gray-500 text-sm mt-1">Your spending appears stable and consistent</p>
          </div>
        )}
      </div>

      {/* Summary insights */}
      <div className="mt-6 pt-6 border-t border-gray-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-400 text-sm">Warnings</p>
            <p className="text-yellow-400 text-xl font-semibold">
              {patterns.filter(p => p.severity === 'warning').length}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Insights</p>
            <p className="text-blue-400 text-xl font-semibold">
              {patterns.filter(p => p.severity === 'info').length}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Positive</p>
            <p className="text-green-400 text-xl font-semibold">
              {patterns.filter(p => p.severity === 'positive').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}