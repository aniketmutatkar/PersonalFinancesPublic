
import React, { useState, useMemo } from 'react';
import { useYearlyBudgetAnalysis, useBudgetAnalysis, useMonthlySummaries } from '../hooks/useApiData';

import UniversalSelect from '../components/ui/UniversalSelect';
import UniversalToggle from '../components/ui/UniversalToggle';

import BudgetMetrics from '../components/budget/BudgetMetrics';
import BudgetChart from '../components/budget/BudgetChart';
import BudgetTable from '../components/budget/BudgetTable';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import PageHeader from '../components/layout/PageHeader';

export default function BudgetView() {
  const [selectedView, setSelectedView] = useState<'yearly' | 'monthly'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Get available years and months
  const { data: summariesResponse } = useMonthlySummaries();
  
  const availableYears = useMemo(() => {
    if (!summariesResponse?.summaries) return [];
    const years = Array.from(new Set(summariesResponse.summaries.map(s => s.year)));
    return years.sort((a, b) => b - a); // Most recent first
  }, [summariesResponse]);

  const availableMonths = useMemo(() => {
    if (!summariesResponse?.summaries) return [];
    return summariesResponse.summaries.map(s => ({
      value: s.month_year,
      label: s.month_year
    }));
  }, [summariesResponse]);

  const yearOptions = useMemo(() => {
    return availableYears.map(year => ({
      value: year,
      label: year.toString()
    }));
  }, [availableYears]);

  const viewToggleOptions = [
    { value: 'yearly', label: 'Yearly View' },
    { value: 'monthly', label: 'Monthly View' }
  ];

  // Set default year and month
  React.useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableYears, availableMonths, selectedYear, selectedMonth]);

  // Fetch current year data
  const { 
    data: yearlyBudgetData, 
    isLoading: yearlyLoading, 
    isError: yearlyError 
  } = useYearlyBudgetAnalysis(selectedYear, { 
    enabled: selectedView === 'yearly' && !!selectedYear,
    queryKey: ['yearly-budget-analysis', selectedYear]
  });

  // Fetch previous year data for trends (only for yearly view)
  const previousYear = selectedYear - 1;
  const shouldFetchPreviousYear = selectedView === 'yearly' && availableYears.includes(previousYear);
  
  const { 
    data: previousYearBudgetData, 
    isLoading: previousYearLoading 
  } = useYearlyBudgetAnalysis(previousYear, { 
    enabled: shouldFetchPreviousYear,
    queryKey: ['yearly-budget-analysis', previousYear],
    // Don't refetch as often since this is just for comparison
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch monthly data
  const { 
    data: monthlyBudgetData, 
    isLoading: monthlyLoading, 
    isError: monthlyError 
  } = useBudgetAnalysis(selectedMonth, { 
    enabled: selectedView === 'monthly' && !!selectedMonth,
    queryKey: ['budget-analysis', selectedMonth]
  });

  const isLoading = selectedView === 'yearly' 
    ? yearlyLoading || (shouldFetchPreviousYear && previousYearLoading)
    : monthlyLoading;

  const isError = selectedView === 'yearly' ? yearlyError : monthlyError;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Budget Data</h2>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-content">
        {/* Page Header Skeleton - DESIGN SYSTEM */}
        <div className="section-gap">
          <div className="page-title bg-gray-700 rounded animate-pulse h-8 w-64"></div>
          <div className="h-4 w-96 bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        {/* Content Skeletons - DESIGN SYSTEM */}
        <div className={selectedView === 'yearly' ? 'grid-metrics-5' : 'grid-metrics-4'}>
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          {selectedView === 'yearly' && <LoadingSkeleton variant="metric" />}
        </div>
        <div className="grid-layout-12">
          <LoadingSkeleton variant="chart" className="col-8" />
          <LoadingSkeleton variant="chart" className="col-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Budget Analysis"
        subtitle="Track spending against budgets with detailed category insights"
        actions={
          <div className="flex items-center gap-4">
            {/* UPDATED: View Toggle - replaced hardcoded buttons with UniversalToggle */}
            <UniversalToggle
              options={viewToggleOptions}
              value={selectedView}
              onChange={(value) => setSelectedView(value as 'yearly' | 'monthly')}
              variant="segments" // Matches your current connected button style
              size="md"
            />

            {/* UPDATED: Year/Month Selector - UNIVERSAL DEFAULTS */}
            {selectedView === 'yearly' ? (
              <UniversalSelect
                options={yearOptions}
                value={selectedYear}
                onChange={(value) => setSelectedYear(Number(value))}
                placeholder="Select Year"
                size="sm" // Small for short year values
              />
            ) : (
              <UniversalSelect
                options={availableMonths}
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(String(value))}
                placeholder="Select Month"
                searchable={true}
                // size="md" is default - no need to specify
                // width is automatic based on size
              />
            )}
          </div>
        }
      />

      {/* Budget Content - DESIGN SYSTEM */}
      {selectedView === 'yearly' && yearlyBudgetData ? (
        <>
          {/* Yearly Budget Metrics - DESIGN SYSTEM */}
          <div className="grid-metrics-5">
            <BudgetMetrics 
              data={yearlyBudgetData} 
              type="yearly" 
              year={selectedYear}
              previousYearData={previousYearBudgetData}
            />
          </div>

          {/* Yearly Chart/Table Row - DESIGN SYSTEM */}
          <div className="grid-layout-12">
            <div className="col-8 h-[500px]">
              <BudgetChart 
                data={yearlyBudgetData} 
                type="yearly" 
                year={selectedYear}
              />
            </div>

            <div className="col-4 h-[500px]">
              <BudgetTable 
                data={yearlyBudgetData} 
                type="yearly" 
                year={selectedYear}
              />
            </div>
          </div>
        </>
      ) : selectedView === 'monthly' && monthlyBudgetData ? (
        <>
          {/* Monthly Budget Metrics - DESIGN SYSTEM */}
          <div className="grid-metrics-4">
            <BudgetMetrics 
              data={monthlyBudgetData} 
              type="monthly" 
              monthYear={selectedMonth}
            />
          </div>

          {/* Monthly Chart/Table Row - DESIGN SYSTEM */}
          <div className="grid-layout-12">
            <div className="col-8 h-[500px]">
              <BudgetChart 
                data={monthlyBudgetData} 
                type="monthly" 
                monthYear={selectedMonth}
              />
            </div>

            <div className="col-4 h-[500px]">
              <BudgetTable 
                data={monthlyBudgetData} 
                type="monthly" 
                monthYear={selectedMonth}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              {selectedView === 'yearly' ? 'No yearly data available' : 'No monthly data available'}
            </h2>
            <p className="text-gray-500">
              {selectedView === 'yearly' 
                ? `No budget data found for ${selectedYear}` 
                : `No budget data found for ${selectedMonth}`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}