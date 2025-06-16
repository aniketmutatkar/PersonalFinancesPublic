// src/components/analytics/YearComparisonPanel.tsx
import React, { useState, useMemo } from 'react';
import { YearlyData } from '../../types/api';

interface YearComparisonPanelProps {
  yearData: Record<string, YearlyData>;
  availableYears: number[];
}

export default function YearComparisonPanel({ yearData, availableYears }: YearComparisonPanelProps) {
  // Initialize with the two most recent years
  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    const sortedYears = [...availableYears].sort((a, b) => b - a);
    return sortedYears.slice(0, 2);
  });

  const handleYearToggle = (year: number) => {
    if (selectedYears.includes(year)) {
      // Remove year if already selected
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(y => y !== year));
      }
    } else {
      // Add year, keep only 2 max
      if (selectedYears.length < 2) {
        setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
      } else {
        // Replace the older year
        const [newer] = selectedYears;
        setSelectedYears([newer, year].sort((a, b) => b - a));
      }
    }
  };

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (selectedYears.length !== 2) return null;

    const [year1, year2] = selectedYears.sort((a, b) => b - a); // Newest first
    const data1 = yearData[year1.toString()];
    const data2 = yearData[year2.toString()];

    if (!data1 || !data2) return null;

    // Use the fields that exist in your YearlyData interface
    // If total_* fields don't exist, calculate from monthly * months
    const income1 = Number((data1 as any).total_income || data1.income || (data1.monthly_income * data1.months) || 0);
    const income2 = Number((data2 as any).total_income || data2.income || (data2.monthly_income * data2.months) || 0);
    const spending1 = Number((data1 as any).total_spending || data1.spending || (data1.monthly_spending * data1.months) || 0);
    const spending2 = Number((data2 as any).total_spending || data2.spending || (data2.monthly_spending * data2.months) || 0);
    const investments1 = Number((data1 as any).total_investments || data1.investments || (data1.monthly_investments * data1.months) || 0);
    const investments2 = Number((data2 as any).total_investments || data2.investments || (data2.monthly_investments * data2.months) || 0);

    const incomeChange = income1 - income2;
    const spendingChange = spending1 - spending2;
    const investmentChange = investments1 - investments2;
    const netSavings1 = income1 - spending1;
    const netSavings2 = income2 - spending2;
    const netSavingsChange = netSavings1 - netSavings2;

    // Calculate percentages
    const incomeChangePercent = income2 > 0 ? (incomeChange / income2) * 100 : 0;
    const spendingChangePercent = spending2 > 0 ? (spendingChange / spending2) * 100 : 0;
    const investmentChangePercent = investments2 > 0 ? (investmentChange / investments2) * 100 : 0;
    const netSavingsChangePercent = Math.abs(netSavings2) > 0 ? (netSavingsChange / Math.abs(netSavings2)) * 100 : 0;

    // Find biggest category changes
    const categories1 = data1.categories || {};
    const categories2 = data2.categories || {};
    const categoryChanges: Array<{category: string, change: number, percent: number}> = [];

    // Get all categories from both years
    const allCategories = new Set([...Object.keys(categories1), ...Object.keys(categories2)]);
    
    allCategories.forEach(category => {
      if (!['Pay', 'Payment'].includes(category)) {
        const amount1 = Number(categories1[category] || 0);
        const amount2 = Number(categories2[category] || 0);
        const change = amount1 - amount2;
        const percent = amount2 > 0 ? (change / amount2) * 100 : (amount1 > 0 ? 100 : 0);
        
        if (Math.abs(change) > 100) { // Only show significant changes
          categoryChanges.push({ category, change, percent });
        }
      }
    });

    // Sort by absolute change amount
    categoryChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
      year1,
      year2,
      incomeChange,
      spendingChange,
      investmentChange,
      netSavingsChange,
      incomeChangePercent,
      spendingChangePercent,
      investmentChangePercent,
      netSavingsChangePercent,
      biggestIncrease: categoryChanges.find(c => c.change > 0),
      biggestDecrease: categoryChanges.find(c => c.change < 0),
    };
  }, [selectedYears, yearData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getChangeClass = (amount: number, isSpending = false) => {
    if (isSpending) {
      // For spending, decrease is good (green), increase is bad (red)
      return amount > 0 ? 'text-red-400' : amount < 0 ? 'text-green-400' : 'text-gray-400';
    } else {
      // For income/investments, increase is good (green), decrease is bad (red)
      return amount > 0 ? 'text-green-400' : amount < 0 ? 'text-red-400' : 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-white font-semibold text-xl mb-2">Year Comparison</h3>
        <p className="text-gray-400 text-sm mb-4">
          Compare financial metrics between any two years
        </p>
        
        {/* Clean Year Selection */}
        <div className="flex justify-center">
          <div className="inline-flex gap-2 bg-gray-700 rounded-lg p-2">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => handleYearToggle(year)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${selectedYears.includes(year)
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                  }
                `}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {comparisonData ? (
        <div className="space-y-4">
          <div className="text-center py-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <span className="text-blue-400 font-bold text-xl">{comparisonData.year1}</span>
              <div className="text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <span className="text-gray-300 font-bold text-xl">{comparisonData.year2}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Comparing newer to older</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300 font-medium">Income Change</span>
              <div className="text-right">
                <div className={`font-bold ${getChangeClass(comparisonData.incomeChange)}`}>
                  {formatCurrency(comparisonData.incomeChange)}
                </div>
                <div className={`text-xs ${getChangeClass(comparisonData.incomeChange)}`}>
                  {formatPercent(comparisonData.incomeChangePercent)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300 font-medium">Spending Change</span>
              <div className="text-right">
                <div className={`font-bold ${getChangeClass(comparisonData.spendingChange, true)}`}>
                  {formatCurrency(comparisonData.spendingChange)}
                </div>
                <div className={`text-xs ${getChangeClass(comparisonData.spendingChange, true)}`}>
                  {formatPercent(comparisonData.spendingChangePercent)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300 font-medium">Net Savings</span>
              <div className="text-right">
                <div className={`font-bold ${getChangeClass(comparisonData.netSavingsChange)}`}>
                  {formatCurrency(comparisonData.netSavingsChange)}
                </div>
                <div className={`text-xs ${getChangeClass(comparisonData.netSavingsChange)}`}>
                  {formatPercent(comparisonData.netSavingsChangePercent)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300 font-medium">Investment Change</span>
              <div className="text-right">
                <div className={`font-bold ${getChangeClass(comparisonData.investmentChange)}`}>
                  {formatCurrency(comparisonData.investmentChange)}
                </div>
                <div className={`text-xs ${getChangeClass(comparisonData.investmentChange)}`}>
                  {formatPercent(comparisonData.investmentChangePercent)}
                </div>
              </div>
            </div>

            {comparisonData.biggestIncrease && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 font-medium">Biggest Increase</span>
                <div className="text-right">
                  <div className="text-red-400 font-bold">
                    {comparisonData.biggestIncrease.category}
                  </div>
                  <div className="text-xs text-red-400">
                    +{formatCurrency(comparisonData.biggestIncrease.change)}
                  </div>
                </div>
              </div>
            )}

            {comparisonData.biggestDecrease && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300 font-medium">Best Improvement</span>
                <div className="text-right">
                  <div className="text-green-400 font-bold">
                    {comparisonData.biggestDecrease.category}
                  </div>
                  <div className="text-xs text-green-400">
                    {formatCurrency(comparisonData.biggestDecrease.change)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">
            Select 2 years to compare
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Choose any two years to see detailed financial changes
          </p>
        </div>
      )}
    </div>
  );
}