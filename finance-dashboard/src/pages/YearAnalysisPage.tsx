
import React, { useState, useMemo } from 'react';
import { useYearComparison } from '../hooks/useApiData';

import UniversalMultiSelect from '../components/ui/UniversalMultiSelect';

import YearTrendsChart from '../components/analytics/YearTrendsChart';
import CategoryHeatmap from '../components/analytics/CategoryHeatmap';
import YearComparisonPanel from '../components/analytics/YearComparisonPanel';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/cards/MetricCard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function YearAnalysisPage() {
  const { 
    data: yearComparisonData, 
    isLoading: yearLoading, 
    isError: yearError 
  } = useYearComparison();

  // Initialize with all available years
  const availableYears = useMemo(() => {
    return yearComparisonData?.available_years || [];
  }, [yearComparisonData]);

  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Set all years as default when data loads (only once)
  const [hasInitialized, setHasInitialized] = React.useState(false);
  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYears.length === 0 && !hasInitialized) {
      setSelectedYears([...availableYears]);
      setHasInitialized(true);
    }
  }, [availableYears, selectedYears.length, hasInitialized]);

  const yearOptions = useMemo(() => {
    return availableYears.map((year: number) => ({
      value: year,
      label: year.toString()
    }));
  }, [availableYears]);

  const quickActions = useMemo(() => [
    {
      label: 'Last 2 Years',
      action: (options: any[]) => {
        const sorted = options.map(o => o.value).sort((a, b) => b - a);
        return sorted.slice(0, 2);
      }
    },
    {
      label: 'Last 3 Years', 
      action: (options: any[]) => {
        const sorted = options.map(o => o.value).sort((a, b) => b - a);
        return sorted.slice(0, 3);
      }
    }
  ], []);

  // Calculate summary statistics for selected years
  const summaryStats = useMemo(() => {
    if (!yearComparisonData?.years || selectedYears.length === 0) {
      return null;
    }

    const yearsToAnalyze = selectedYears.length > 0 
      ? selectedYears.map(String)
      : Object.keys(yearComparisonData.years);

    const validYears = yearsToAnalyze.filter(year => yearComparisonData.years[year]);

    if (validYears.length === 0) {
      return null;
    }

    // Calculate totals and averages
    let totalIncome = 0;
    let totalSpending = 0; 
    let totalInvestments = 0;

    validYears.forEach(year => {
      const yearData = yearComparisonData.years[year];
      if (yearData) {
        totalIncome += Number(yearData.total_income) || 0;
        totalSpending += Math.abs(Number(yearData.total_spending)) || 0;
        totalInvestments += Number(yearData.total_investments) || 0;
      }
    });

    const avgIncome = totalIncome / validYears.length;
    const avgSpending = totalSpending / validYears.length;
    const avgInvestments = totalInvestments / validYears.length;

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? 
      ((totalIncome - totalSpending) / totalIncome) * 100 : 0;

    return {
      yearsAnalyzed: validYears.length,
      totalIncome: totalIncome,
      totalSpending: totalSpending,
      totalInvestments: totalInvestments,
      avgIncome: avgIncome,
      avgSpending: avgSpending,
      avgInvestments: avgInvestments,
      savingsRate: isFinite(savingsRate) ? savingsRate : 0
    };
  }, [yearComparisonData, selectedYears]);

  if (yearError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">Failed to load year analysis data</p>
        </div>
      </div>
    );
  }

  if (yearLoading || !yearComparisonData) {
    return (
      <div className="page-content">
        {/* Page Header Skeleton - DESIGN SYSTEM */}
        <div className="section-gap">
          <div className="page-title bg-gray-700 rounded animate-pulse h-8 w-64"></div>
          <div className="h-4 w-96 bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        {/* Content Skeletons - DESIGN SYSTEM */}
        <div className="grid-metrics-4">
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
        </div>
        <div className="grid-layout-12">
          <LoadingSkeleton variant="chart" className="col-8" />
          <LoadingSkeleton variant="chart" className="col-4" />
          <LoadingSkeleton variant="chart" className="col-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Year Analysis"
        subtitle="Complete financial trajectory and category evolution insights"
        actions={
          <UniversalMultiSelect
            options={yearOptions}
            values={selectedYears}
            onChange={(values) => setSelectedYears(values.map(v => Number(v)))} // FIX: Convert to numbers
            placeholder="Select Years"
            showPills={true}
            maxPillsDisplay={3}
            quickActions={quickActions}
            showSelectAll={true}
            showClearAll={true}
            sortOrder="desc" // Most recent years first
            searchable={false} // Years don't need search
          />
        }
      />

      {/* Summary Statistics Row - DESIGN SYSTEM */}
      {summaryStats && (
        <div className="grid-metrics-4">
          <MetricCard
            title="Years Analyzed"
            value={summaryStats.yearsAnalyzed}
            subtitle="Years of data analyzed"
            variant="default"
          />
          
          <MetricCard
            title="Avg Annual Income"
            value={formatCurrency(summaryStats.avgIncome)}
            subtitle="Average yearly income"
            variant="success"
          />
          
          <MetricCard
            title="Avg Annual Spending"
            value={formatCurrency(summaryStats.avgSpending)}
            subtitle="Average yearly spending"
            variant="info"
          />
          
          <MetricCard
            title="Savings Rate"
            value={`${summaryStats.savingsRate.toFixed(1)}%`}
            subtitle="Income saved annually"
            variant="accent"
            trend={{
              value: summaryStats.savingsRate > 20 ? 'Excellent' : 
                     summaryStats.savingsRate > 10 ? 'Good' : 'Needs work',
              direction: summaryStats.savingsRate > 15 ? 'up' : 'neutral'
            }}
          />
        </div>
      )}

      {/* Main Layout: Trends + Comparison - DESIGN SYSTEM */}
      <div className="grid grid-cols-5 gap-6">
        {/* Year Trends Chart - Takes up 3/5 of the width */}
        <div className="col-span-3">
          <YearTrendsChart 
            yearData={yearComparisonData.years}
            selectedYears={selectedYears}
          />
        </div>

        {/* Year Comparison Panel - Takes up 2/5 of the width */}
        <div className="col-span-2">
          <YearComparisonPanel
            yearData={yearComparisonData.years}
            availableYears={availableYears}
          />
        </div>
      </div>

      {/* Category Evolution - Full Width - DESIGN SYSTEM */}
      <div className="grid-layout-12">
        <div className="col-12">
          <CategoryHeatmap 
            yearData={yearComparisonData.years}
            selectedYears={selectedYears}
          />
        </div>
      </div>
    </div>
  );
}