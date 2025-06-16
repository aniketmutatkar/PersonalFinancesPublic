// src/pages/MonthlyView.tsx - MINIMAL SELECTOR STANDARDIZATION FIX
// ONLY changing MonthSelector → UniversalSelect, preserving ALL original functionality

import React, { useState, useMemo } from 'react';
import { useMonthlySummariesRecent, useTransactions } from '../hooks/useApiData';

// ONLY CHANGE: Import UniversalSelect instead of MonthSelector
import UniversalSelect from '../components/ui/UniversalSelect';

// KEEPING ALL YOUR ORIGINAL IMPORTS
import MonthlyMetrics from '../components/monthly/MonthlyMetrics';
import CategoryChart from '../components/monthly/CategoryChart';
import SpendingPatternsChart from '../components/monthly/SpendingPatternsChart';
import TransactionTable from '../components/monthly/TransactionTable';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import PageHeader from '../components/layout/PageHeader';

export default function MonthlyView() {
  // KEEPING ALL YOUR ORIGINAL LOGIC
  const { data: summariesResponse, isLoading: summariesLoading, isError: summariesError } = useMonthlySummariesRecent();
  
  // Get the most recent month as default
  const defaultMonth = useMemo(() => {
    if (!summariesResponse?.summaries || summariesResponse.summaries.length === 0) {
      return '';
    }
    // Data is already ordered newest first from API, so first item is most recent
    return summariesResponse.summaries[0].month_year;
  }, [summariesResponse]);

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  // Set default month when data loads
  React.useEffect(() => {
    if (defaultMonth && !selectedMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth, selectedMonth]);

  // KEEPING ALL YOUR ORIGINAL DATA PROCESSING
  const { selectedSummary, previousSummary } = useMemo(() => {
    if (!summariesResponse?.summaries || !selectedMonth) {
      return { selectedSummary: null, previousSummary: null };
    }
    
    const selectedIndex = summariesResponse.summaries.findIndex(s => s.month_year === selectedMonth);
    const selected = summariesResponse.summaries[selectedIndex] || null;
    
    // Get previous month (next index since array is newest-first)
    const previous = selectedIndex < summariesResponse.summaries.length - 1 
      ? summariesResponse.summaries[selectedIndex + 1] 
      : null;
    
    return { selectedSummary: selected, previousSummary: previous };
  }, [summariesResponse, selectedMonth]);

  // KEEPING ALL YOUR ORIGINAL TRANSACTION FETCHING LOGIC
  const monthForApi = useMemo(() => {
    if (!selectedSummary) return '';
    // Convert "January 2023" to "2023-01"
    const [monthName, year] = selectedSummary.month_year.split(' ');
    const monthMap: { [key: string]: string } = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    return `${year}-${monthMap[monthName]}`;
  }, [selectedSummary]);

  const { 
    data: transactionsResponse, 
    isLoading: transactionsLoading 
  } = useTransactions(
    { month: monthForApi, page_size: 1000 }, 
    { 
      enabled: !!monthForApi,
      // Add this to satisfy TypeScript requirements
      queryKey: ['transactions', { month: monthForApi, page_size: 1000 }]
    }
  );

  // KEEPING ALL YOUR ORIGINAL ERROR HANDLING
  if (summariesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">Failed to load monthly summaries</p>
        </div>
      </div>
    );
  }

  // KEEPING ALL YOUR ORIGINAL LOADING STATE
  if (summariesLoading || !summariesResponse || !selectedMonth) {
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
          <LoadingSkeleton variant="chart" className="col-6" />
          <LoadingSkeleton variant="chart" className="col-6" />
          <LoadingSkeleton variant="list" className="col-12" />
        </div>
      </div>
    );
  }

  // KEEPING YOUR ORIGINAL DROPDOWN OPTIONS PROCESSING
  const availableMonths = summariesResponse.summaries.map(s => ({
    value: s.month_year,
    label: s.month_year
  }));

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Monthly Analysis"
        subtitle="Detailed breakdown and transaction analysis"
        actions={
          // ONLY CHANGE: Replace MonthSelector with UniversalSelect
          <UniversalSelect
            options={availableMonths}
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(String(value))}
            placeholder="Select Month"
            searchable={true}
            loading={summariesLoading}
          />
        }
      />

      {/* KEEPING ALL YOUR ORIGINAL CONTENT EXACTLY AS IT WAS */}
      {selectedSummary && (
        <>
          {/* Monthly Metrics Row - DESIGN SYSTEM */}
          <div className="grid-metrics-4">
            <MonthlyMetrics 
              summary={selectedSummary} 
              previousSummary={previousSummary}
            />
          </div>

          {/* Charts Row - DESIGN SYSTEM */}
          <div className="grid-layout-12">
            <div className="col-6">
              <CategoryChart 
                summary={selectedSummary}
                transactions={transactionsResponse?.items || []}
              />
            </div>

            <div className="col-6">
              <SpendingPatternsChart 
                transactions={transactionsResponse?.items || []}
                monthYear={selectedSummary.month_year}
              />
            </div>
          </div>

          {/* Transaction Table Row - DESIGN SYSTEM */}
          <div className="grid-layout-12">
            <div className="col-12">
              <TransactionTable 
                transactions={transactionsResponse?.items || []}
                isLoading={transactionsLoading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}