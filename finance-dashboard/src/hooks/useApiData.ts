// src/hooks/useApiData.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MonthlySummariesParams } from '../services/api';
import { 
  FinancialOverview, 
  Transaction, 
  PagedResponse, 
  BudgetAnalysisResponse,
  TransactionUpdate,
  InvestmentOverviewData,
  InvestmentTrendsData,
  ManualBalanceCreate,
  PortfolioTrends
} from '../types/api';

// Query keys for consistent caching
export const QUERY_KEYS = {
  financialOverview: ['financial-overview'] as const,
  monthlySummaries: (year?: number) => ['monthly-summaries', year] as const,
  monthlySummary: (monthYear: string) => ['monthly-summary', monthYear] as const,
  transactions: (params: Record<string, any>) => ['transactions', params] as const,
  transaction: (id: number) => ['transaction', id] as const,
  budgets: ['budgets'] as const,
  budgetAnalysis: (monthYear: string) => ['budget-analysis', monthYear] as const,
  yearlyBudgetAnalysis: (year: number) => ['yearly-budget-analysis', year] as const,
  categories: ['categories'] as const,
  yearComparison: ['year-comparison'] as const,
  spendingPatterns: ['spending-patterns'] as const,
  investmentOverview: ['investment-overview'] as const,
  investmentTrends: ['investment-trends'] as const,
};

// Financial Overview Hook
export function useFinancialOverview(options?: UseQueryOptions<FinancialOverview>) {
  return useQuery({
    queryKey: QUERY_KEYS.financialOverview,
    queryFn: () => api.getFinancialOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useMonthlySummaries(params?: MonthlySummariesParams) {
  return useQuery({
    queryKey: ['monthly-summaries', params],
    queryFn: () => api.getMonthlySummaries(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Convenience hook for chronological data (charts)
export function useMonthlySummariesChronological(year?: number) {
  return useMonthlySummaries({
    year,
    sort_direction: 'asc' // oldest first for charts
  });
}

// Convenience hook for reverse chronological data (lists/dropdowns)
export function useMonthlySummariesRecent(year?: number) {
  return useMonthlySummaries({
    year,
    sort_direction: 'desc' // newest first for lists
  });
}

// Single Monthly Summary Hook
export function useMonthlySummary(monthYear: string, options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: QUERY_KEYS.monthlySummary(monthYear),
    queryFn: () => api.getMonthlySummary(monthYear),
    enabled: !!monthYear,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Transactions Hook
export function useTransactions(
  params: {
    category?: string;
    start_date?: string;
    end_date?: string;
    month?: string;
    page?: number;
    page_size?: number;
  } = {},
  options?: UseQueryOptions<PagedResponse<Transaction>>
) {
  return useQuery({
    queryKey: QUERY_KEYS.transactions(params),
    queryFn: () => api.getTransactions(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// Single Transaction Hook
export function useTransaction(id: number, options?: UseQueryOptions<Transaction>) {
  return useQuery({
    queryKey: QUERY_KEYS.transaction(id),
    queryFn: () => api.getTransaction(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Budgets Hook
export function useBudgets(options?: UseQueryOptions<Record<string, number>>) {
  return useQuery({
    queryKey: QUERY_KEYS.budgets,
    queryFn: () => api.getBudgets(),
    staleTime: 30 * 60 * 1000, // 30 minutes - budgets don't change often
    ...options,
  });
}

// Budget Analysis Hook
export function useBudgetAnalysis(monthYear: string, options?: UseQueryOptions<BudgetAnalysisResponse>) {
  return useQuery({
    queryKey: QUERY_KEYS.budgetAnalysis(monthYear),
    queryFn: () => api.getBudgetAnalysis(monthYear),
    enabled: !!monthYear,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Yearly Budget Analysis Hook
export function useYearlyBudgetAnalysis(year: number, options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: QUERY_KEYS.yearlyBudgetAnalysis(year),
    queryFn: () => api.getYearlyBudgetAnalysis(year),
    enabled: !!year,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}

// Categories Hook
export function useCategories(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => api.getCategories(),
    staleTime: 60 * 60 * 1000, // 1 hour - categories are fairly static
    ...options,
  });
}

// Year Comparison Hook
export function useYearComparison(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: QUERY_KEYS.yearComparison,
    queryFn: () => api.getYearComparison(),
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}

// Spending Patterns Hook
export function useSpendingPatterns(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: QUERY_KEYS.spendingPatterns,
    queryFn: () => api.getSpendingPatterns(),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Investment Overview Hook
export function useInvestmentOverview(options?: UseQueryOptions<InvestmentOverviewData>) {
  return useQuery({
    queryKey: QUERY_KEYS.investmentOverview,
    queryFn: () => api.getInvestmentOverview(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Investment Trends Hook
export function useInvestmentTrends(options?: UseQueryOptions<InvestmentTrendsData>) {
  return useQuery({
    queryKey: QUERY_KEYS.investmentTrends,
    queryFn: () => api.getInvestmentTrends(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ transactionId, updates }: { transactionId: number; updates: TransactionUpdate }) => {
      return api.updateTransaction(transactionId, updates);
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summaries'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financialOverview });
    },
    onError: (error) => {
      console.error('Transaction update failed:', error);
    },
  });
}

export const usePortfolioOverview = (asOfDate?: string) => 
  useQuery({
    queryKey: ['portfolioOverview', asOfDate],
    queryFn: () => api.getPortfolioOverview(asOfDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export function usePortfolioTrends(period?: string, options?: UseQueryOptions<PortfolioTrends>) {
  return useQuery({
    queryKey: ['portfolio-trends', period],
    queryFn: () => api.getPortfolioTrends(period),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export const useAllAccounts = () =>
  useQuery({
    queryKey: ['allAccounts'],
    queryFn: () => api.getAllAccounts(),
    staleTime: 30 * 60 * 1000, // 30 minutes - accounts don't change often
  });

export const useBalanceHistory = (accountId?: number, startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['balanceHistory', accountId, startDate, endDate],
    queryFn: () => api.getBalanceHistory(accountId, startDate, endDate),
    enabled: !!accountId,
    staleTime: 15 * 60 * 1000,
  });

// Mutation for adding manual balances
export const useAddManualBalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (balanceData: ManualBalanceCreate) => api.addManualBalance(balanceData),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['portfolioOverview'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioTrends'] });
      queryClient.invalidateQueries({ queryKey: ['balanceHistory'] });
    },
  });
}