// src/components/analytics/CategoryHeatmap.tsx
import React, { useMemo, useState } from 'react';
import { YearlyData } from '../../types/api';

interface CategoryHeatmapProps {
  yearData: Record<string, YearlyData>;
  selectedYears: number[];
}

type ViewMode = 'monthly' | 'annual' | 'percentage';

interface HeatmapCell {
  year: string;
  category: string;
  value: number;
  displayValue: string;
  intensity: 'none' | 'very-low' | 'low' | 'med' | 'high' | 'very-high' | 'extreme';
  change?: string;
}

interface CategoryStats {
  category: string;
  totalSpending: number;
  yearOverYearChanges: number[];
  volatility: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export default function CategoryHeatmap({ yearData, selectedYears }: CategoryHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // Get all available categories across all years
  const allCategories = useMemo(() => {
    const years = selectedYears.length > 0 
      ? selectedYears.map(String)
      : Object.keys(yearData);

    const filteredYears = years.filter(year => yearData[year]).sort();
    const excludeCategories = ['Pay', 'Payment'];
    const categorySet = new Set<string>();

    filteredYears.forEach(year => {
      const categories = yearData[year].categories || {};
      Object.keys(categories).forEach(category => {
        if (!excludeCategories.includes(category)) {
          categorySet.add(category);
        }
      });
    });

    // Sort categories by total spending across all years
    const categoryTotals: Record<string, number> = {};
    Array.from(categorySet).forEach(category => {
      categoryTotals[category] = filteredYears.reduce((sum, year) => {
        const amount = yearData[year].categories?.[category] || 0;
        return sum + Number(amount);
      }, 0);
    });

    return Array.from(categorySet).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  }, [yearData, selectedYears]);

  // Get years to display
  const displayYears = useMemo(() => {
    const years = selectedYears.length > 0 
      ? selectedYears.map(String)
      : Object.keys(yearData);
    
    return years.filter(year => yearData[year]).sort();
  }, [yearData, selectedYears]);

  // Calculate intensity ranges for color mapping (category-specific)
  const categoryIntensityRanges = useMemo(() => {
    const ranges: Record<string, { veryLow: number; low: number; med: number; high: number; veryHigh: number; extreme: number }> = {};
    
    allCategories.forEach(category => {
      const categoryValues: number[] = [];
      
      displayYears.forEach(year => {
        const yearCategories = yearData[year].categories || {};
        const rawValue = Number(yearCategories[category] || 0);
        
        let value = rawValue;
        if (viewMode === 'monthly') {
          const monthsCount = yearData[year].months || 12;
          value = rawValue / monthsCount;
        } else if (viewMode === 'percentage') {
          const totalIncome = yearData[year].total_income || 0;
          value = totalIncome > 0 ? (rawValue / totalIncome) * 100 : 0;
        }
        
        if (value > 0) categoryValues.push(value);
      });

      categoryValues.sort((a, b) => a - b);
      
      if (categoryValues.length === 0) {
        ranges[category] = { veryLow: 0, low: 0, med: 0, high: 0, veryHigh: 0, extreme: 0 };
      } else if (categoryValues.length === 1) {
        // Only one value, make it medium intensity
        const val = categoryValues[0];
        ranges[category] = { veryLow: 0, low: 0, med: val, high: val, veryHigh: val, extreme: val };
      } else {
        ranges[category] = {
          veryLow: categoryValues[Math.floor(categoryValues.length * 0.1)] || categoryValues[0],
          low: categoryValues[Math.floor(categoryValues.length * 0.3)] || categoryValues[0],
          med: categoryValues[Math.floor(categoryValues.length * 0.5)] || categoryValues[0],
          high: categoryValues[Math.floor(categoryValues.length * 0.7)] || categoryValues[0],
          veryHigh: categoryValues[Math.floor(categoryValues.length * 0.85)] || categoryValues[0],
          extreme: categoryValues[Math.floor(categoryValues.length * 0.95)] || categoryValues[categoryValues.length - 1],
        };
      }
    });

    return ranges;
  }, [yearData, allCategories, displayYears, viewMode]);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    const data: HeatmapCell[][] = [];

    displayYears.forEach(year => {
      const rowData: HeatmapCell[] = [];
      
      allCategories.forEach(category => {
        const yearCategories = yearData[year].categories || {};
        const rawValue = Number(yearCategories[category] || 0);
        
        let value = rawValue;
        let displayValue: string;
        
        if (viewMode === 'monthly') {
          const monthsCount = yearData[year].months || 12;
          value = rawValue / monthsCount;
          displayValue = value > 0 ? `${Math.round(value).toLocaleString()}` : '-';
        } else if (viewMode === 'percentage') {
          const totalIncome = yearData[year].total_income || 0;
          value = totalIncome > 0 ? (rawValue / totalIncome) * 100 : 0;
          displayValue = value > 0 ? `${value.toFixed(1)}%` : '-';
        } else {
          // Annual total mode
          value = rawValue;
          displayValue = value > 0 ? `${Math.round(value).toLocaleString()}` : '-';
        }

        // Determine intensity (category-specific)
        let intensity: HeatmapCell['intensity'] = 'none';
        if (value > 0) {
          const categoryRanges = categoryIntensityRanges[category];
          if (categoryRanges) {
            if (value >= categoryRanges.extreme) intensity = 'extreme';
            else if (value >= categoryRanges.veryHigh) intensity = 'very-high';
            else if (value >= categoryRanges.high) intensity = 'high';
            else if (value >= categoryRanges.med) intensity = 'med';
            else if (value >= categoryRanges.low) intensity = 'low';
            else intensity = 'very-low';
          }
        }

        // Calculate year-over-year change
        let change: string | undefined;
        const prevYearIndex = displayYears.indexOf(year) - 1;
        if (prevYearIndex >= 0) {
          const prevYear = displayYears[prevYearIndex];
          const prevValue = Number(yearData[prevYear].categories?.[category] || 0);
          if (prevValue > 0 && rawValue > 0) {
            const changePercent = ((rawValue - prevValue) / prevValue) * 100;
            change = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
          }
        }

        rowData.push({
          year,
          category,
          value,
          displayValue,
          intensity,
          change
        });
      });
      
      data.push(rowData);
    });

    // Add total average row
    const avgRowData: HeatmapCell[] = [];
    allCategories.forEach(category => {
      const values = displayYears.map(year => {
        const rawValue = Number(yearData[year].categories?.[category] || 0);
        if (viewMode === 'monthly') {
          const monthsCount = yearData[year].months || 12;
          return rawValue / monthsCount;
        } else if (viewMode === 'percentage') {
          const totalIncome = yearData[year].total_income || 0;
          return totalIncome > 0 ? (rawValue / totalIncome) * 100 : 0;
        }
        return rawValue;
      });

      const nonZeroValues = values.filter(v => v > 0);
      const avgValue = nonZeroValues.length > 0 
        ? nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length 
        : 0;

      let displayValue: string;
      if (viewMode === 'percentage') {
        displayValue = avgValue > 0 ? `${avgValue.toFixed(1)}%` : '-';
      } else {
        displayValue = avgValue > 0 ? `${Math.round(avgValue).toLocaleString()}` : '-';
      }

      // Determine intensity for average (category-specific)
      let intensity: HeatmapCell['intensity'] = 'none';
      if (avgValue > 0) {
        const categoryRanges = categoryIntensityRanges[category];
        if (categoryRanges) {
          if (avgValue >= categoryRanges.extreme) intensity = 'extreme';
          else if (avgValue >= categoryRanges.veryHigh) intensity = 'very-high';
          else if (avgValue >= categoryRanges.high) intensity = 'high';
          else if (avgValue >= categoryRanges.med) intensity = 'med';
          else if (avgValue >= categoryRanges.low) intensity = 'low';
          else intensity = 'very-low';
        }
      }

      avgRowData.push({
        year: 'AVG',
        category,
        value: avgValue,
        displayValue,
        intensity,
        change: undefined
      });
    });

    data.push(avgRowData);
    return data;
  }, [yearData, allCategories, displayYears, viewMode, categoryIntensityRanges]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const categoryStats: CategoryStats[] = allCategories.map(category => {
      const values = displayYears.map(year => {
        const rawValue = Number(yearData[year].categories?.[category] || 0);
        if (viewMode === 'monthly') {
          const monthsCount = yearData[year].months || 12;
          return rawValue / monthsCount;
        } else if (viewMode === 'percentage') {
          const totalIncome = yearData[year].total_income || 0;
          return totalIncome > 0 ? (rawValue / totalIncome) * 100 : 0;
        }
        return rawValue;
      });

      const totalSpending = values.reduce((sum, val) => sum + val, 0);
      
      // Calculate year-over-year changes
      const changes: number[] = [];
      for (let i = 1; i < values.length; i++) {
        if (values[i-1] > 0 && values[i] > 0) {
          changes.push(((values[i] - values[i-1]) / values[i-1]) * 100);
        }
      }

      // Calculate volatility (standard deviation of changes)
      const volatility = changes.length > 0 
        ? Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change, 2), 0) / changes.length)
        : 0;

      // Determine trend
      let trend: CategoryStats['trend'] = 'stable';
      if (changes.length > 0) {
        const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        if (avgChange > 10) trend = 'increasing';
        else if (avgChange < -10) trend = 'decreasing';
      }

      return {
        category,
        totalSpending,
        yearOverYearChanges: changes,
        volatility,
        trend
      };
    });

    // Find interesting categories
    const sortedByVolatility = [...categoryStats].sort((a, b) => b.volatility - a.volatility);
    const sortedByIncrease = [...categoryStats].sort((a, b) => {
      const aAvgChange = a.yearOverYearChanges.length > 0 
        ? a.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / a.yearOverYearChanges.length 
        : 0;
      const bAvgChange = b.yearOverYearChanges.length > 0 
        ? b.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / b.yearOverYearChanges.length 
        : 0;
      return bAvgChange - aAvgChange;
    });
    const sortedByDecrease = [...categoryStats].sort((a, b) => {
      const aAvgChange = a.yearOverYearChanges.length > 0 
        ? a.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / a.yearOverYearChanges.length 
        : 0;
      const bAvgChange = b.yearOverYearChanges.length > 0 
        ? b.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / b.yearOverYearChanges.length 
        : 0;
      return aAvgChange - bAvgChange;
    });

    return {
      mostVolatile: sortedByVolatility[0],
      biggestIncrease: sortedByIncrease[0],
      bestImprovement: sortedByDecrease[0],
      mostStable: sortedByVolatility[sortedByVolatility.length - 1]
    };
  }, [allCategories, displayYears, yearData, viewMode]);

  const getIntensityClass = (intensity: HeatmapCell['intensity']) => {
    switch (intensity) {
      case 'none': return 'bg-gray-800 text-gray-500';
      case 'very-low': return 'bg-gradient-to-br from-slate-700 to-slate-600 text-slate-200 shadow-slate-900/20';
      case 'low': return 'bg-gradient-to-br from-green-800 to-green-700 text-green-100 shadow-green-900/20';
      case 'med': return 'bg-gradient-to-br from-yellow-700 to-yellow-600 text-yellow-100 shadow-yellow-900/20';
      case 'high': return 'bg-gradient-to-br from-orange-700 to-orange-600 text-orange-100 shadow-orange-900/20';
      case 'very-high': return 'bg-gradient-to-br from-red-700 to-red-600 text-red-100 shadow-red-900/20';
      case 'extreme': return 'bg-gradient-to-br from-purple-800 to-purple-700 text-purple-100 shadow-purple-900/30';
      default: return 'bg-gray-800 text-gray-500';
    }
  };

  if (displayYears.length === 0 || allCategories.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No category data available for selected years</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-white font-semibold text-3xl mb-2">Category Spending Heatmap</h3>
          <p className="text-gray-400">
            Visual intensity shows spending levels - darker colors indicate higher spending
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-slate-700 to-slate-600 rounded"></div>
              <span className="text-gray-300">Very Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-green-800 to-green-700 rounded"></div>
              <span className="text-gray-300">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-yellow-700 to-yellow-600 rounded"></div>
              <span className="text-gray-300">Med</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-orange-700 to-orange-600 rounded"></div>
              <span className="text-gray-300">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-red-700 to-red-600 rounded"></div>
              <span className="text-gray-300">Very High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-purple-800 to-purple-700 rounded"></div>
              <span className="text-gray-300">Extreme</span>
            </div>
          </div>
          
          {/* View Mode Selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="monthly">Monthly Average</option>
            <option value="annual">Annual Total</option>
            <option value="percentage">% of Income</option>
          </select>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto py-4">
        <div className="min-w-max">
          {/* Headers */}
          <div className="flex mb-1">
            <div className="w-20 h-12 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center font-semibold text-gray-300 text-sm mr-1">
              Year
            </div>
            {allCategories.map((category) => (
              <div
                key={category}
                className="w-24 h-12 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center font-semibold text-gray-300 text-xs mx-0.5 px-1"
                title={category}
              >
                {category.length > 8 ? `${category.substring(0, 8)}...` : category}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {heatmapData.map((rowData, index) => {
            const isAverageRow = rowData[0]?.year === 'AVG';
            const yearLabel = isAverageRow ? 'AVG' : displayYears[index];
            
            return (
              <div key={yearLabel} className={`flex mb-1 ${isAverageRow ? 'border-t-2 border-gray-500 pt-2 mt-2' : ''}`}>
                <div className={`w-20 h-12 border border-gray-600 rounded-lg flex items-center justify-center font-bold text-sm mr-1 ${
                  isAverageRow ? 'bg-gray-600 text-yellow-300' : 'bg-gray-700 text-gray-200'
                }`}>
                  {yearLabel}
                </div>
                {rowData.map((cell) => (
                  <div
                    key={`${cell.year}-${cell.category}`}
                    className={`w-24 h-12 border border-gray-600 rounded-lg flex items-center justify-center font-bold text-xs mx-0.5 cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 shadow-lg ${getIntensityClass(cell.intensity)} ${
                      isAverageRow ? 'ring-1 ring-yellow-500/30' : ''
                    }`}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${cell.category} (${cell.year}): ${cell.displayValue}${cell.change ? ` (${cell.change})` : ''}${isAverageRow ? ' - Average across all years' : ''}`}
                  >
                    {cell.displayValue}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl pointer-events-none">
          <div className="font-semibold text-white">{hoveredCell.category} - {hoveredCell.year}</div>
          <div className="text-lg font-bold text-white">{hoveredCell.displayValue}</div>
          {hoveredCell.change && (
            <div className="text-sm text-gray-300">Change: {hoveredCell.change}</div>
          )}
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm font-medium mb-1">Most Volatile</div>
          <div className="text-white text-lg font-bold">
            {summaryStats.mostVolatile?.category || 'N/A'}
          </div>
          <div className="text-gray-300 text-sm">
            ±{summaryStats.mostVolatile?.volatility.toFixed(0)}%
          </div>
        </div>
        
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm font-medium mb-1">Biggest Increase</div>
          <div className="text-red-400 text-lg font-bold">
            {summaryStats.biggestIncrease?.category || 'N/A'}
          </div>
          <div className="text-gray-300 text-sm">
            {summaryStats.biggestIncrease?.yearOverYearChanges.length > 0 
              ? `+${(summaryStats.biggestIncrease.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / summaryStats.biggestIncrease.yearOverYearChanges.length).toFixed(1)}%`
              : 'N/A'
            }
          </div>
        </div>
        
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm font-medium mb-1">Most Stable</div>
          <div className="text-blue-400 text-lg font-bold">
            {summaryStats.mostStable?.category || 'N/A'}
          </div>
          <div className="text-gray-300 text-sm">
            ±{summaryStats.mostStable?.volatility.toFixed(0)}%
          </div>
        </div>
        
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm font-medium mb-1">Best Improvement</div>
          <div className="text-green-400 text-lg font-bold">
            {summaryStats.bestImprovement?.category || 'N/A'}
          </div>
          <div className="text-gray-300 text-sm">
            {summaryStats.bestImprovement?.yearOverYearChanges.length > 0 
              ? `${(summaryStats.bestImprovement.yearOverYearChanges.reduce((sum, change) => sum + change, 0) / summaryStats.bestImprovement.yearOverYearChanges.length).toFixed(1)}%`
              : 'N/A'
            }
          </div>
        </div>
      </div>
    </div>
  );
}