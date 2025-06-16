// src/types/api.ts

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
  message?: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  total_sum?: number;
  avg_amount?: number;
}

// Financial Overview Types
export interface FinancialSummary {
  total_income: number;
  total_spending: number;
  total_investments: number;
  financial_growth: number;
  monthly_financial_growth: number;
  overall_savings_rate: number;
}

export interface CashFlowAnalysis {
  monthly_income: number;
  monthly_spending: number;
  monthly_investments: number;
  monthly_cash_flow: number;
  investment_rate: number;
}

export interface TopCategory {
  category: string;
  total_amount: number;
  monthly_average: number;
}

export interface SpendingIntelligence {
  top_categories: TopCategory[];
  spending_patterns: {
    fixed_expenses: number;
    discretionary_expenses: number;
    discretionary_ratio: number;
    three_month_trend: number;
  };
  discretionary_ratio: number;
  fixed_expenses: number;
}

export interface AlertFlag {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface BudgetHealth {
  adherence_score: number;
  categories_on_track: number;
  total_categories: number;
  alert_flags: AlertFlag[];
}

export interface SpendingExtreme {
  month_year: string;
  amount: number;
}

export interface FinancialOverview {
  data_available: boolean;
  date_range: {
    start_month: string;
    end_month: string;
    total_months: number;
  };
  financial_summary: FinancialSummary;
  cash_flow_analysis: CashFlowAnalysis;
  spending_intelligence: SpendingIntelligence;
  budget_health: BudgetHealth;
  financial_health: FinancialHealth;
  yearly_trends: Record<string, any>;
  spending_extremes: {
    highest_month: SpendingExtreme;
    lowest_month: SpendingExtreme;
  };
}

// Monthly Summary Types
export interface MonthlySummary {
  id?: number;
  month: string;
  year: number;
  month_year: string;
  category_totals: Record<string, number>;
  investment_total: number;
  total: number;
  total_minus_invest: number;
}

export interface MonthlySummaryListResponse {
  summaries: MonthlySummary[];
  total: number;
}

// Transaction Types
export interface Transaction {
  id?: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  source: string;
  transaction_hash: string;
  month_str: string;
  total_sum?: number;
  avg_amount?: number; 
}

export interface TransactionUpdate {
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
  source?: string;
}

export interface TransactionUpdateResponse {
  updated_transaction: Transaction;
  monthly_summaries_affected: string[];
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

// Budget Types
export interface BudgetItem {
  category: string;
  budget_amount: number;
  actual_amount: number;
  variance: number;
  is_over_budget: boolean;
}

export interface BudgetAnalysisResponse {
  month_year: string;
  budget_items: BudgetItem[];
  total_budget: number;
  total_actual: number;
  total_variance: number;
}

// Upload Types
export interface TransactionPreview {
  temp_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  source: string;
  suggested_categories: string[];
}

export interface FilePreviewResponse {
  session_id: string;
  total_transactions: number;
  misc_transactions: TransactionPreview[];
  requires_review: boolean;
  files_processed: number;
}

export interface CategoryUpdate {
  temp_id: string;
  new_category: string;
}

export interface UploadConfirmation {
  session_id: string;
  category_updates: CategoryUpdate[];
}

export interface UploadSummaryResponse {
  files_processed: number;
  total_transactions: number;
  new_transactions: number;           // NEW
  duplicate_transactions: number;     // NEW
  transactions_by_file: Record<string, number>;
  message: string;
  processed_transactions: ProcessedTransaction[];  // NEW
}

export interface UploadValidationError {
  file: string;
  error: string;
  type: 'size' | 'format' | 'content';
}

// Sort Types
export interface SortConfig {
  field: 'date' | 'description' | 'category' | 'amount' | 'source';
  direction: 'asc' | 'desc';
}

export interface ProcessedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  source: string;
  original_filename: string;
  was_duplicate: boolean;
  was_reviewed: boolean;
}

export interface YearlyData {
  income: number;
  spending: number;
  investments: number;
  months: number;
  monthly_income: number;
  monthly_spending: number;
  monthly_investments: number;
  categories: Record<string, number>;
  average_monthly_spending: number;
  average_monthly_income: number;
  average_monthly_investments: number;
  total_income: number;
  total_spending: number;
  total_investments: number;
  months_count: number;
  avg_monthly_spending: number;
  avg_monthly_income: number;
  avg_monthly_investments: number;
}

export interface YearComparisonResponse {
  years: Record<string, YearlyData>;
  available_years: number[];
  comparison_ready: boolean;
}

export interface SpendingPattern {
  type: string;
  severity: 'info' | 'warning' | 'positive';
  message: string;
  data?: Record<string, any>;
}

export interface SpendingPatternsResponse {
  patterns: SpendingPattern[];
  pattern_count: number;
  analysis_period: {
    start: string;
    end: string;
    months_analyzed: number;
  };
}

// Investment Analytics Types (ADD TO EXISTING src/types/api.ts file)

export interface InvestmentAccount {
  name: string;
  total_deposits: number;
  monthly_average: number;
  transaction_count: number;
  last_deposit_date?: string;
  consistency_score: number; // 0-100, higher = more consistent
}

export interface InvestmentOverviewData {
  total_invested: number;
  monthly_average: number;
  active_accounts: number;
  investment_rate: number; // % of income going to investments
  account_breakdown: InvestmentAccount[];
  best_month: { 
    month: string; 
    amount: number; 
  };
  consistency_score: number; // Overall investment consistency
  period_covered: {
    start_month: string;
    end_month: string;
    total_months: number;
  };
}

export interface InvestmentTrendsData {
  monthly_trends: Array<{
    month: string;
    year: number;
    month_display: string; // "Jan 2024"
    acorns: number;
    wealthfront: number;
    robinhood: number;
    schwab: number;
    total: number;
  }>;
  account_allocation: Array<{
    account: string;
    percentage: number;
    total: number;
    color: string;
    monthly_average: number;
  }>;
  peak_month: {
    month: string;
    amount: number;
  };
}

export interface PortfolioAccount {
  account_id: number;
  account_name: string;
  institution: string;
  account_type: string;
  start_balance: number;
  end_balance: number;
  net_deposits: number;
  actual_growth: number;
  growth_percentage: number;
  annualized_return: number;
  period_months: number;
}

export interface InstitutionSummary {
  institution: string;
  total_balance: number;
  total_growth: number;
  growth_percentage: number;
  account_count: number;
  account_names: string[];
}

export interface AccountTypeSummary {
  account_type: string;
  total_balance: number;
  total_growth: number;
  growth_percentage: number;
  account_count: number;
  account_names: string[];
}

export interface PortfolioOverview {
  total_portfolio_value: number;
  total_deposits: number;
  total_growth: number;
  growth_percentage: number;
  accounts: PortfolioAccount[];
  by_institution: InstitutionSummary[];
  by_account_type: AccountTypeSummary[];
  as_of_date: string;
}

export interface MonthlyPortfolioValue {
  month: string;
  year: number;
  month_display: string;
  wealthfront_investment?: number;
  schwab_brokerage?: number;
  acorns?: number;
  robinhood?: number;
  plan_401k?: number;
  roth_ira?: number;
  wealthfront_cash?: number;
  total_value: number;
}

export interface PortfolioTrends {
  monthly_values: Array<{
    month: string;
    year: number;
    month_display: string;
    [key: string]: any; // Allow any account columns
    total_value: number;
  }>;
  growth_attribution: {
    total_growth: number;
    market_growth: number;
    deposit_growth: number;
  };
  best_month: {
    month: string;
    amount: number;
  };
  worst_month: {
    month: string;
    amount: number;
  };
}

export interface ManualBalanceCreate {
  account_id: number;
  balance_date: string;
  balance_amount: number;
  notes?: string;
}

export interface BalanceResponse {
  id: number;
  account_id: number;
  balance_date: string;
  balance_amount: number;
  data_source: string;
  notes?: string;
}

export interface AccountListResponse {
  accounts: Array<{
    id: number;
    account_name: string;
    institution: string;
    account_type: string;
    is_active: boolean;
  }>;
}

export interface BalanceListResponse {
  balances: BalanceResponse[];
  total: number;
}

// Portfolio Account Colors for Consistency
export const PORTFOLIO_ACCOUNT_COLORS = {
  'Wealthfront Investment': '#3B82F6',
  'Schwab Brokerage': '#EF4444', 
  'Acorns': '#10B981',
  'Robinhood': '#F59E0B',
  '401(k) Plan': '#8B5CF6',
  'Roth IRA': '#EC4899',
  'Wealthfront Cash': '#6B7280'
} as const;

export interface AccountPerformance {
  account_id: number;
  account_name: string;
  institution: string;
  account_type: string;
  start_balance: number;
  end_balance: number;
  net_deposits: number;
  actual_growth: number;
  growth_percentage: number;
  annualized_return: number;
  period_months: number;
}

export interface InstitutionBreakdown {
  institutions: InstitutionSummary[];
}

// Account color mapping for consistent styling
export const INVESTMENT_ACCOUNT_COLORS = {
  'Acorns': '#10B981',      // Green
  'Wealthfront': '#3B82F6', // Blue  
  'Robinhood': '#F59E0B',   // Yellow
  'Schwab': '#EF4444',      // Red
} as const;

export interface RunwayMetrics {
  total_liquid_assets: number;
  checking_balance: number;
  savings_balance: number;
  wealthfront_cash: number;
  monthly_expenses: number;
  runway_months: number;
  runway_status: string;
}

export interface NetWorthMetrics {
  total_net_worth: number;
  liquid_assets: number;
  investment_assets: number;
  liquidity_ratio: number;
  liquidity_status: string;
}

export interface FinancialStabilityAssessment {
  overall_score: number;
  status: string;
  component_scores: {
    runway: number;
    liquidity: number;
    savings: number;
    cash_flow: number;
  };
}

export interface FinancialInsight {
  type: 'warning' | 'opportunity' | 'info';
  category: string;
  message: string;
  action: string;
}

export interface FinancialHealth {
  runway: RunwayMetrics;
  net_worth: NetWorthMetrics;
  stability_assessment: FinancialStabilityAssessment;
  key_insights: FinancialInsight[];
}