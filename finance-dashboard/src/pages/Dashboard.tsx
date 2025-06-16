import React from 'react';
import { useFinancialOverview, usePortfolioTrends, useMonthlySummariesChronological, useMonthlySummariesRecent } from '../hooks/useApiData';
import { Calendar, TrendingUp, Target, PiggyBank } from 'lucide-react';
import MetricCard from '../components/cards/MetricCard';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import NetWorthChart from '../components/dashboard/NetWorthChart';
import FinancialPatternChart from '../components/dashboard/FinancialPatternChart';
import CategoryInsights from '../components/dashboard/CategoryInsights';
import InvestmentInsights from '../components/dashboard/InvestmentInsights';
import DrillDownCard from '../components/dashboard/DrillDownCard';
import PageHeader from '../components/layout/PageHeader';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatRunwayMonths(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);
    return remainingMonths > 0 ? 
      `${years}y ${remainingMonths}m` : 
      `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${Math.round(months)} month${Math.round(months) !== 1 ? 's' : ''}`;
}

// FIXED: Use the working data processing logic from your original
function processRealNetWorthData(portfolioTrends: any, overview: any) {
  if (!portfolioTrends?.monthly_values) return [];  // ✅ FIXED: monthly_values, not trends
  
  // Get current liquid assets breakdown
  const currentTotalLiquid = overview.financial_health.net_worth.liquid_assets;
  
  // Calculate current bank balances (liquid - Wealthfront Cash)
  const estimatedBankBalances = currentTotalLiquid - (portfolioTrends.monthly_values[0]?.wealthfront_cash || 0);
  
  // Portfolio API returns newest first, reverse for chronological order
  const chronologicalData = portfolioTrends.monthly_values.slice().reverse();
  
  return chronologicalData.map((month: any, index: number) => {
    const portfolioValue = month.total_value;
    const wealthfrontCash = month.wealthfront_cash || 0;
    
    // Estimate bank balances for historical months
    const timeProgress = (index + 1) / chronologicalData.length;
    const estimatedHistoricalBankBalance = estimatedBankBalances * (0.3 + (timeProgress * 0.7));
    
    // Total liquid = Wealthfront Cash + Bank Balances
    const totalLiquid = wealthfrontCash + estimatedHistoricalBankBalance;
    
    // Investment assets = Portfolio value - Wealthfront Cash
    const investmentAssets = portfolioValue - wealthfrontCash;
    
    // Total net worth = Portfolio + Bank Balances
    const totalNetWorth = portfolioValue + estimatedHistoricalBankBalance;
    
    return {
      month: month.month_display,  // ✅ FIXED: Use month_display from working code
      net_worth: totalNetWorth,
      liquid_assets: totalLiquid,
      investment_assets: investmentAssets
    };
  });
}

// FIXED: Use the working pattern data processing
function processRealPatternData(monthlySummaries: any[]) {
  if (!monthlySummaries || monthlySummaries.length === 0) return [];
  
  // Data is already in chronological order from API (asc sort)
  // Take the last 24 months for chart display
  const last24Months = monthlySummaries.slice(-24);
  
  return last24Months.map((summary: any) => {
    const income = Math.abs(parseFloat(summary.category_totals['Pay'] || '0'));
    const spending = parseFloat(summary.total_minus_invest || '0');
    const investment = parseFloat(summary.investment_total || '0');
    
    // Available Cash = Income - Spending (what you have before investing)
    const availableCash = income - spending;
    
    return {
      name: summary.month.slice(0, 3), // "Jan", "Feb", etc.
      fullName: summary.month_year,
      spending: Math.round(spending),
      investment: Math.round(Math.abs(investment)),
      income: Math.round(income),
      availableCash: Math.round(availableCash),
      month: summary.month,
      year: summary.year
    };
  });
}

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading, isError, error } = useFinancialOverview();
  const { data: portfolioTrends, isLoading: portfolioLoading } = usePortfolioTrends("2y");
  const { data: monthlySummariesChronological, isLoading: summariesChronologicalLoading } = useMonthlySummariesChronological();
  const { data: monthlySummariesRecent, isLoading: summariesRecentLoading } = useMonthlySummariesRecent();

  const summariesLoading = summariesChronologicalLoading || summariesRecentLoading;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">{error?.message || 'Failed to load financial overview'}</p>
        </div>
      </div>
    );
  }

  if (overviewLoading || portfolioLoading || summariesLoading || !overview) {
    return (
      <div className="page-content">
        {/* Page Header Skeleton - DESIGN SYSTEM */}
        <div className="section-gap">
          <div className="page-title bg-gray-700 rounded animate-pulse h-8 w-64"></div>
          <div className="h-4 w-96 bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        {/* Content Skeletons - DESIGN SYSTEM */}
        <div className="grid-metrics-3">
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
        </div>
        <div className="grid-layout-12">
          <LoadingSkeleton variant="chart" className="col-8" />
          <LoadingSkeleton variant="list" className="col-4" />
        </div>
      </div>
    );
  }

  // FIXED: Process chart data using working logic
  const netWorthData = portfolioTrends ? processRealNetWorthData(portfolioTrends, overview) : [];
  const patternData = monthlySummariesChronological?.summaries ? 
    processRealPatternData(monthlySummariesChronological.summaries) : [];

  // Calculate growth metrics
  const currentNetWorth = overview.financial_health.net_worth.total_net_worth;
  const oldestNetWorth = netWorthData[0]?.net_worth || currentNetWorth;
  const totalGrowth = currentNetWorth - oldestNetWorth;
  const growthPercent = oldestNetWorth > 0 ? 
    ((currentNetWorth - oldestNetWorth) / oldestNetWorth) * 100 : 0;

  // Calculate current available cash
  const currentAvailableCash = overview.cash_flow_analysis.monthly_income - overview.cash_flow_analysis.monthly_spending;

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Financial Health Check"
        subtitle={`Complete overview • ${overview.date_range.total_months} months analyzed • Last updated today`}
      />

      {/* Key Metrics Row - DESIGN SYSTEM */}
      <div className="grid-metrics-3">
        <MetricCard
          title="Net Worth"
          value={formatCurrency(currentNetWorth)}
          subtitle={`${totalGrowth >= 0 ? '+' : ''}${formatCurrency(totalGrowth)} total growth • ${growthPercent >= 0 ? '+' : ''}${formatPercentage(growthPercent)} return`}
          variant="hero"
          trend={{
            value: growthPercent >= 0 ? `+${formatPercentage(growthPercent)}` : formatPercentage(growthPercent),
            direction: growthPercent >= 0 ? 'up' : 'down'
          }}
        />
        
        <MetricCard
          title="Financial Runway"
          value={formatRunwayMonths(overview.financial_health.runway.runway_months)}
          subtitle={`${formatCurrency(overview.financial_health.runway.total_liquid_assets)} available • ${formatCurrency(overview.cash_flow_analysis.monthly_spending)}/month burn`}
          variant="success"
          trend={{
            value: overview.financial_health.runway.runway_months >= 6 ? 
                   'Healthy' : 
                   overview.financial_health.runway.runway_months >= 3 ? 'Stable' : 'Building',
            direction: overview.financial_health.runway.runway_months >= 4 ? 'up' : 'neutral'
          }}
        />
        
        <MetricCard
          title="Investment Momentum"
          value={`${formatCurrency(overview.cash_flow_analysis.monthly_investments)}/month`}
          subtitle={`${formatPercentage(overview.cash_flow_analysis.investment_rate)} of income • ${overview.cash_flow_analysis.investment_rate > 30 ? 'Aggressive' : 'Moderate'} strategy`}
          variant="accent"
          trend={{
            value: overview.cash_flow_analysis.investment_rate > 30 ? 'Exceptional rate' : 'Strong rate',
            direction: 'up'
          }}
        />
      </div>

      {/* Main Charts Row - DESIGN SYSTEM */}
      <div className="grid-layout-12">
        <div className="col-8">
          <NetWorthChart 
            data={netWorthData} 
            currentNetWorth={currentNetWorth}
          />
        </div>
        <div className="col-4">
          <InvestmentInsights overview={overview} />
        </div>
      </div>

      {/* Financial Pattern Chart - DESIGN SYSTEM */}
      <div className="grid-layout-12">
        <div className="col-12">
          <FinancialPatternChart 
            monthlyData={patternData}
            currentAvailableCash={currentAvailableCash}
          />
        </div>
      </div>

      {/* Analysis Row - DESIGN SYSTEM */}
      <div className="grid-layout-12">
        <div className="col-12">
          <CategoryInsights 
            overview={overview} 
            monthlySummaries={monthlySummariesRecent?.summaries || []}
            selectedCategories={['Food', 'Travel', 'Shopping', 'Groceries', 'Recreation', 'Venmo']}
          />
        </div>
      </div>

      {/* Drill Down Cards - DESIGN SYSTEM */}
      <div className="grid-metrics-4">
        <DrillDownCard
          title="Monthly Analysis"
          description="Detailed spending breakdowns"
          to="/monthly"
          icon={Calendar}
          color="blue"
          metrics={{
            primary: formatCurrency(overview.cash_flow_analysis.monthly_spending),
            secondary: "Average monthly spending (57mo)",
            trend: {
              value: overview.spending_intelligence.spending_patterns.three_month_trend > 0 ? 
                     `+${overview.spending_intelligence.spending_patterns.three_month_trend.toFixed(1)}%` :
                     `${overview.spending_intelligence.spending_patterns.three_month_trend.toFixed(1)}%`,
              direction: overview.spending_intelligence.spending_patterns.three_month_trend > 0 ? 'up' : 
                        overview.spending_intelligence.spending_patterns.three_month_trend < 0 ? 'down' : 'neutral'
            }
          }}
        />

        <DrillDownCard
          title="Portfolio Performance"
          description="Investment tracking & analysis"
          to="/investments"
          icon={TrendingUp}
          color="green"
          metrics={{
            primary: formatCurrency(overview.financial_health.net_worth.investment_assets),
            secondary: `${formatPercentage((overview.financial_health.net_worth.investment_assets / overview.financial_health.net_worth.total_net_worth) * 100)} of net worth`,
            trend: {
              value: 'Growing',
              direction: 'up'
            }
          }}
        />

        <DrillDownCard
          title="Budget Analysis"
          description="Category-wise budget tracking"
          to="/budget"
          icon={Target}
          color="purple"
          metrics={{
            primary: `${Math.round(overview.budget_health.adherence_score)}%`,
            secondary: `${overview.budget_health.categories_on_track}/${overview.budget_health.total_categories} categories on track`,
            trend: {
              value: overview.budget_health.adherence_score > 80 ? 'Excellent' : 
                     overview.budget_health.adherence_score > 60 ? 'Good' : 'Needs Work',
              direction: overview.budget_health.adherence_score > 70 ? 'up' : 'neutral'
            }
          }}
        />

        <DrillDownCard
          title="Goal Tracker"
          description="Financial goals & targets"
          to="/goals"
          icon={PiggyBank}
          color="orange"
          metrics={{
            primary: formatCurrency(overview.financial_summary.monthly_financial_growth),
            secondary: "Monthly financial growth",
            trend: {
              value: overview.financial_summary.monthly_financial_growth > 0 ? 'On Track' : 'Behind',
              direction: overview.financial_summary.monthly_financial_growth > 0 ? 'up' : 'down'
            }
          }}
        />
      </div>
    </div>
  );
}