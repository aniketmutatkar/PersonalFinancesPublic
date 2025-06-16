// src/components/monthly/MonthlyMetrics.tsx - FIXED: No internal grid, returns individual cards
import React from 'react';
import MetricCard from '../cards/MetricCard';
import { MonthlySummary } from '../../types/api';

interface MonthlyMetricsProps {
  summary: MonthlySummary;
  previousSummary?: MonthlySummary | null; // Allow null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateTrend(current: number, previous: number): { direction: 'up' | 'down' | 'neutral', value: string, isPositive: boolean } {
  // Handle missing or invalid data
  if (!previous || previous === 0 || !current || isNaN(current) || isNaN(previous)) {
    return { direction: 'neutral', value: 'No previous data', isPositive: true };
  }
  
  const percentChange = ((current - previous) / Math.abs(previous)) * 100;
  
  // Handle edge cases
  if (!isFinite(percentChange) || isNaN(percentChange)) {
    return { direction: 'neutral', value: 'No previous data', isPositive: true };
  }
  
  const direction = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'neutral';
  
  return {
    direction,
    value: `${Math.abs(percentChange).toFixed(1)}%`,
    isPositive: percentChange <= 0 // For spending, down is good
  };
}

function getPreviousMonthName(currentMonthYear: string): string {
  const [monthName, year] = currentMonthYear.split(' ');
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[prevMonth];
}

export default function MonthlyMetrics({ summary, previousSummary }: MonthlyMetricsProps) {
  // Calculate key metrics
  const totalSpending = summary.total_minus_invest;
  const totalInvestments = summary.investment_total;
  const totalIncome = Math.abs(summary.category_totals.Pay || 0);
  const netSavings = totalIncome - totalSpending - totalInvestments;
  const burnRate = totalSpending / 30; // Daily burn rate

  // Previous month metrics for comparison
  const prevSpending = previousSummary?.total_minus_invest || 0;
  const prevInvestments = previousSummary?.investment_total || 0;
  const prevIncome = Math.abs(previousSummary?.category_totals?.Pay || 0);
  const prevNetSavings = prevIncome - prevSpending - prevInvestments;
  
  // Calculate trends with better error handling
  const spendingTrend = calculateTrend(totalSpending, prevSpending);
  const investmentTrend = calculateTrend(totalInvestments, prevInvestments);
  const netPositionTrend = calculateTrend(netSavings, prevNetSavings);
  
  const prevMonthName = previousSummary ? getPreviousMonthName(summary.month_year) : 'Previous';

  // FIXED: Return individual cards, let parent handle grid layout
  return (
    <>
      {/* Hero Metric - Net Financial Position */}
      <MetricCard
        title="Net"
        value={formatCurrency(netSavings)}
        subtitle={netSavings > 1000 ? "Strong surplus this month" : netSavings > 0 ? "Positive cash flow" : "Deficit this month"}
        variant="hero"
        indicator={netSavings > 500 ? 'success' : netSavings > 0 ? 'info' : 'warning'}
        trend={{
          value: `${netPositionTrend.value} vs ${prevMonthName}`,
          direction: netPositionTrend.direction,
          isPositive: netPositionTrend.isPositive
        }}
      />
      
      {/* Supporting Metrics */}
      <MetricCard
        title="Total Spending"
        value={formatCurrency(totalSpending)}
        subtitle={`vs ${prevMonthName}: ${spendingTrend.isPositive ? 'decreased' : 'increased'}`}
        variant={spendingTrend.isPositive ? 'success' : 'warning'}
        indicator={spendingTrend.isPositive ? 'success' : 'warning'}
        trend={{
          value: `${spendingTrend.value} vs ${prevMonthName}`,
          direction: spendingTrend.direction,
          isPositive: spendingTrend.isPositive
        }}
      />
      
      <MetricCard
        title="Investments"
        value={formatCurrency(totalInvestments)}
        subtitle={totalInvestments > 0 ? "Building wealth" : "No investments"}
        variant="info"
        indicator={totalInvestments > 0 ? 'success' : 'warning'}
        trend={{
          value: investmentTrend.value !== 'No data' ? `${investmentTrend.value} vs ${prevMonthName}` : 'No previous data',
          direction: investmentTrend.direction,
          isPositive: totalInvestments > prevInvestments
        }}
      />
      
      <MetricCard
        title="Burn Rate"
        value={formatCurrency(burnRate)}
        subtitle="Daily avg spending"
        variant={burnRate > 150 ? 'warning' : 'default'}
        indicator={burnRate > 150 ? 'warning' : 'success'}
        trend={{
          value: burnRate > 150 ? 'High' : 'Moderate',
          direction: burnRate > 150 ? 'up' : 'down',
          isPositive: burnRate <= 150
        }}
      />
    </>
  );
}