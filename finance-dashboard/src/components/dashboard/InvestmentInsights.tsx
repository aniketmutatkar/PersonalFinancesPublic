import React from 'react';

interface InvestmentInsightsProps {
  overview: any;
}

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

function InvestmentInsights({ overview }: InvestmentInsightsProps) {
  const investmentRate = overview.cash_flow_analysis.investment_rate;
  const monthlyInvestment = overview.cash_flow_analysis.monthly_investments;
  const totalInvested = overview.financial_health.net_worth.investment_assets;
  const totalNetWorth = overview.financial_health.net_worth.total_net_worth;
  
  const investmentRatio = (totalInvested / totalNetWorth) * 100;
  
  return (
    <div className="card-standard h-full flex flex-col">
      {/* Header - DESIGN SYSTEM */}
      <div className="content-gap flex-shrink-0">
        <h3 className="section-title">Investment Analysis</h3>
      </div>
      
      {/* Content - DESIGN SYSTEM */}
      <div className="flex-1 space-y-6">
        {/* Investment Rate Card - DESIGN SYSTEM */}
        <div className="card-info p-4">
          <div className="flex justify-between items-start element-gap">
            <span className="label-primary">Investment Rate</span>
            <span className="metric-medium text-info">
              {formatPercentage(investmentRate)}
            </span>
          </div>
          
          <div className="text-sm text-secondary tight-gap">
            {formatCurrency(monthlyInvestment)}/month of {formatCurrency(overview.cash_flow_analysis.monthly_income)} income
          </div>
          
          <div className="text-xs text-info">
            {investmentRate > 40 ? 'Exceptionally aggressive' :
             investmentRate > 30 ? 'Very aggressive' :
             investmentRate > 20 ? 'Aggressive' :
             investmentRate > 15 ? 'Moderate' : 'Conservative'} investment strategy
          </div>
        </div>

        {/* Investment Ratio Card - DESIGN SYSTEM */}
        <div className="card-success p-4">
          <div className="flex justify-between items-start element-gap">
            <span className="label-primary">Investment Ratio</span>
            <span className="metric-medium text-success">
              {formatPercentage(investmentRatio)}
            </span>
          </div>
          
          <div className="text-xs text-secondary tight-gap">
            {formatCurrency(totalInvested)} invested of {formatCurrency(totalNetWorth)} total net worth
          </div>
          
          <div className="text-xs text-success">
            Shows how much of your wealth is in investments vs liquid cash
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentInsights;