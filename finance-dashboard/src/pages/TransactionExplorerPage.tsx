import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Download } from 'lucide-react';

import { api } from '../services/api';
import { PagedResponse, Transaction } from '../types/api';
import TransactionFilters from '../components/transactions/TransactionFilters';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionStats from '../components/transactions/TransactionStats';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import PageHeader from '../components/layout/PageHeader';

interface Filters {
  categories: string[];
  description: string;
  startDate: string;
  endDate: string;
  month: string;
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: string;
}

export default function TransactionExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL parameters for initial state
  const getInitialFilters = (): Filters => {
    return {
      categories: searchParams.getAll('categories'),
      description: searchParams.get('description') || '',
      startDate: searchParams.get('start_date') || '',
      endDate: searchParams.get('end_date') || '',
      month: searchParams.get('month') || '',
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('page_size') || '50'),
      sortField: searchParams.get('sort_field') || 'date',
      sortDirection: searchParams.get('sort_direction') || 'desc'
    };
  };

  const [filters, setFilters] = useState<Filters>(getInitialFilters);

  // Update URL when filters change
  const updateUrlParams = (newFilters: Filters) => {
    const params = new URLSearchParams();
    
    // Add non-empty filters to URL
    if (newFilters.categories.length > 0) {
      newFilters.categories.forEach(cat => params.append('categories', cat));
    }
    if (newFilters.description) params.set('description', newFilters.description);
    if (newFilters.startDate) params.set('start_date', newFilters.startDate);
    if (newFilters.endDate) params.set('end_date', newFilters.endDate);
    if (newFilters.month) params.set('month', newFilters.month);
    if (newFilters.page > 1) params.set('page', newFilters.page.toString());
    if (newFilters.pageSize !== 50) params.set('page_size', newFilters.pageSize.toString());
    if (newFilters.sortField !== 'date') params.set('sort_field', newFilters.sortField);
    if (newFilters.sortDirection !== 'desc') params.set('sort_direction', newFilters.sortDirection);
  
    setSearchParams(params);
  };

  // Update filters and URL together
  const handleFilterChange = (newFilters: Partial<Filters>) => {
    const updatedFilters = { 
      ...filters, 
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1 // Reset to page 1 when changing filters
    };
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters: Filters = {
      categories: [],
      description: '',
      startDate: '',
      endDate: '',
      month: '',
      page: 1,
      pageSize: filters.pageSize,
      sortField: 'date',
      sortDirection: 'desc'
    };
    setFilters(clearedFilters);
    updateUrlParams(clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.categories.length > 0 || 
           filters.description !== '' || 
           filters.startDate !== '' || 
           filters.endDate !== '' || 
           filters.month !== '';
  }, [filters]);

  // Fetch transactions
  const { 
    data: transactionsData, 
    isLoading: transactionsLoading, 
    error: transactionsError 
  } = useQuery<PagedResponse<Transaction>>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters.categories.length > 0) params.categories = filters.categories;
      if (filters.description) params.description = filters.description;
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.month) params.month = filters.month;
      params.page = filters.page;
      params.page_size = filters.pageSize;
      params.sort_field = filters.sortField;
      params.sort_direction = filters.sortDirection;

      return api.getTransactions(params);
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 300000, // 5 minutes
  });

  if (transactionsLoading) {
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
        <LoadingSkeleton variant="list" lines={10} className="h-96" />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Transaction Explorer"
        subtitle="Search and filter your financial transactions with advanced controls"
        actions={
          <button className="btn-primary btn-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        }
      />

      {/* Stats Row - DESIGN SYSTEM */}
      {transactionsData && (
        <div className="grid-metrics-4">
          <TransactionStats
            totalTransactions={transactionsData.total}
            currentPage={filters.page}
            pageSize={filters.pageSize}
            transactions={transactionsData.items}
            totalSum={transactionsData.total_sum || 0}
            avgAmount={transactionsData.avg_amount || 0}
          />
        </div>
      )}

      {/* Main Content Area - Filters + Table - DESIGN SYSTEM */}
      <div className="grid-layout-12">
        {/* Left Sidebar for Filters */}
        <div className="col-3">
          <div className="card-standard h-fit">
            <div className="flex items-center gap-2 content-gap">
              <Filter className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-medium text-white">Filters</h2>
              {hasActiveFilters && (
                <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full ml-auto">
                  {filters.categories.length + (filters.description ? 1 : 0) + (filters.month ? 1 : 0)}
                </span>
              )}
            </div>

            {/* Use the existing TransactionFilters component with sidebar variant */}
            <TransactionFilters
              filters={filters}
              onFiltersChange={handleFilterChange}
              categories={categoriesData?.categories || []}
              variant="sidebar"
            />

            {/* Clear All Button */}
            {hasActiveFilters && (
              <div className="element-gap">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="col-9">
          <div className="card-standard">
            {transactionsLoading ? (
              <LoadingSkeleton variant="table" rows={10} />
            ) : transactionsError ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-red-400 mb-2">Error Loading Transactions</h3>
                  <p className="text-gray-400">Please try again later</p>
                </div>
              </div>
            ) : transactionsData && transactionsData.items.length > 0 ? (
              <TransactionTable
                transactions={transactionsData.items}
                currentPage={filters.page}
                pageSize={filters.pageSize}
                totalTransactions={transactionsData.total}
                sortField={filters.sortField}
                sortDirection={filters.sortDirection}
                onPageChange={(page) => handleFilterChange({ page })}
                onPageSizeChange={(pageSize) => handleFilterChange({ pageSize, page: 1 })}
                onSortChange={(sortField, sortDirection) => handleFilterChange({ sortField, sortDirection })}
                showEditButton={false}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Transactions Found</h3>
                  <p className="text-gray-500">Try adjusting your filters to see more results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}