import React, { useMemo } from 'react';
import MetricCard from '../cards/MetricCard';

interface BudgetMetricsProps {
  data: any;
  type: 'yearly' | 'monthly';
  year?: number;
  monthYear?: string;
  previousYearData?: any;
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

export default function BudgetMetrics({ data, type, year, monthYear, previousYearData }: BudgetMetricsProps) {
  const metrics = useMemo(() => {
    if (type === 'monthly') {
      // Monthly budget metrics - ALL REAL DATA
      const totalBudget = Number(data.total_budget) || 0;
      const totalActual = Number(data.total_actual) || 0;
      const totalVariance = Number(data.total_variance) || 0;
      const adherenceRate = totalBudget > 0 ? 
        ((totalBudget - Math.abs(totalVariance)) / totalBudget) * 100 : 0;
      
      const budgetItems = data.budget_items || [];
      const overBudgetItems = budgetItems.filter((item: any) => item.is_over_budget);
      const underBudgetItems = budgetItems.filter((item: any) => !item.is_over_budget && Number(item.variance) > 0);
      
      const overBudgetCount = overBudgetItems.length;
      const totalCategories = budgetItems.length;
      const onTrackCategories = totalCategories - overBudgetCount;

      // Calculate Budget Health Score (0-100) - REAL CALCULATION
      const healthScore = Math.max(0, Math.min(100, 
        (adherenceRate * 0.6) + // 60% weight on adherence
        ((onTrackCategories / Math.max(totalCategories, 1)) * 100 * 0.4) // 40% weight on categories on track
      ));

      // REAL DATA: Calculate total amount over budget
      const totalOverBudget = overBudgetItems.reduce((sum: number, item: any) => 
        sum + Math.abs(Number(item.variance)), 0
      );

      // REAL DATA: Calculate total amount under budget
      const totalUnderBudget = underBudgetItems.reduce((sum: number, item: any) => 
        sum + Number(item.variance), 0
      );

      return {
        totalBudget,
        totalActual,
        totalVariance,
        adherenceRate,
        overBudgetCount,
        onTrackCategories,
        totalCategories,
        healthScore,
        totalOverBudget,
        totalUnderBudget,
        budgetItems
      };
    } else {
      // Yearly budget metrics - ALL REAL DATA
      const months = data.months || [];
      const budgetData = data.budget_data || {};
      
      let totalBudget = 0;
      let totalActual = 0;
      let overBudgetInstances = 0;
      let totalInstances = 0;
      let monthlyHealthScores: number[] = [];
      let monthlyData: Array<{month: string, health: number, variance: number, actual: number}> = [];

      // REAL DATA: Process each month
      months.forEach((month: string) => {
        const monthData = budgetData[month] || {};
        let monthBudget = 0;
        let monthActual = 0;
        let monthOverBudget = 0;
        let monthCategories = 0;
        
        Object.values(monthData).forEach((item: any) => {
          const budgetAmt = Number(item.budget_amount) || 0;
          const actualAmt = Number(item.actual_amount) || 0;
          totalBudget += budgetAmt;
          totalActual += actualAmt;
          monthBudget += budgetAmt;
          monthActual += actualAmt;
          totalInstances++;
          monthCategories++;
          if (item.is_over_budget) {
            overBudgetInstances++;
            monthOverBudget++;
          }
        });

        // Calculate monthly health score - REAL CALCULATION
        if (monthCategories > 0) {
          const monthVariance = monthBudget - monthActual;
          const monthAdherence = monthBudget > 0 ? 
            ((monthBudget - Math.abs(monthVariance)) / monthBudget) * 100 : 0;
          const monthOnTrack = ((monthCategories - monthOverBudget) / monthCategories) * 100;
          const monthHealth = Math.max(0, Math.min(100, (monthAdherence * 0.6) + (monthOnTrack * 0.4)));
          monthlyHealthScores.push(monthHealth);
          monthlyData.push({
            month: month.substring(0, 3), // "Jan", "Feb", etc.
            health: monthHealth,
            variance: monthVariance,
            actual: monthActual // Add actual spending for best/worst calculation
          });
        }
      });

      const totalVariance = totalBudget - totalActual;
      const adherenceRate = totalBudget > 0 ? ((totalBudget - Math.abs(totalVariance)) / totalBudget) * 100 : 0;
      const onTrackPercentage = totalInstances > 0 ? ((totalInstances - overBudgetInstances) / totalInstances) * 100 : 0;
      const avgHealthScore = monthlyHealthScores.length > 0 ? 
        monthlyHealthScores.reduce((sum, score) => sum + score, 0) / monthlyHealthScores.length : 0;

      // REAL DATA: Find best and worst performing months (by total spending)
      const bestMonth = monthlyData.length > 0 
        ? monthlyData.reduce((best, current) => current.actual < best.actual ? current : best).month
        : 'N/A';
      
      const worstMonth = monthlyData.length > 0 
        ? monthlyData.reduce((worst, current) => current.actual > worst.actual ? current : worst).month
        : 'N/A';

      // REAL DATA: Calculate average variance
      const avgVariance = months.length > 0 ? totalVariance / months.length : 0;

      // Year-over-year trends calculation
      let yearOverYearTrends = undefined;
      if (previousYearData && year) {
        const prevMetrics = {
          healthScore: Number(previousYearData.avg_health_score) || 0,
          totalBudget: Number(previousYearData.total_budget) || 0,
          totalSaved: Number(previousYearData.total_variance) || 0,
          onTrackPercentage: Number(previousYearData.on_track_percentage) || 0
        };

        const healthScoreDiff = avgHealthScore - prevMetrics.healthScore;
        const budgetDiff = ((totalBudget / Math.max(1, months.length)) - prevMetrics.totalBudget) / Math.max(1, prevMetrics.totalBudget) * 100;
        const savedDiff = avgVariance - prevMetrics.totalSaved;
        const consistencyDiff = onTrackPercentage - prevMetrics.onTrackPercentage;

        yearOverYearTrends = {
          healthScore: {
            value: Math.abs(healthScoreDiff),
            direction: (healthScoreDiff > 0 ? 'up' : healthScoreDiff < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            display: `${healthScoreDiff > 0 ? '+' : ''}${healthScoreDiff.toFixed(1)}%`
          },
          avgBudget: {
            value: Math.abs(budgetDiff),
            direction: (budgetDiff > 0 ? 'up' : budgetDiff < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            display: `${budgetDiff > 0 ? '+' : ''}${budgetDiff.toFixed(1)}%`
          },
          totalSaved: {
            value: Math.abs(savedDiff),
            direction: (savedDiff > 0 ? 'up' : savedDiff < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            display: `${formatCurrency(savedDiff)}`
          },
          consistency: {
            value: Math.abs(consistencyDiff),
            direction: (consistencyDiff > 0 ? 'up' : consistencyDiff < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
            display: `${consistencyDiff > 0 ? '+' : ''}${consistencyDiff.toFixed(1)}%`
          }
        };
      }

      return {
        totalBudget: totalBudget / Math.max(1, months.length), // Average monthly budget
        totalActual: totalActual / Math.max(1, months.length), // Average monthly actual
        totalVariance: totalVariance / Math.max(1, months.length), // Average monthly variance
        adherenceRate,
        overBudgetInstances,
        onTrackPercentage: onTrackPercentage || 0, // Ensure not undefined
        totalInstances,
        monthsAnalyzed: months.length,
        healthScore: avgHealthScore,
        monthlyHealthScores,
        monthlyData,
        bestMonth: bestMonth || 'N/A', // Ensure not undefined
        worstMonth: worstMonth || 'N/A', // Ensure not undefined
        avgVariance: avgVariance || 0, // Ensure not undefined
        totalSaved: totalVariance > 0 ? totalVariance : 0, // Ensure not undefined
        yearOverYearTrends, // Add trends
        // Keep TypeScript happy
        onTrackCategories: 0,
        totalCategories: 0,
        overBudgetCount: 0
      };
    }
  }, [data, type, previousYearData, year]);

  // CONVERTED: Return individual MetricCards (no internal grids)
  if (type === 'monthly') {
    return (
      <>
        {/* Budget Health Score */}
        <MetricCard
          title="Budget Health Score"
          value={`${Math.round(metrics.healthScore)}%`}
          subtitle={`${metrics.onTrackCategories} of ${metrics.totalCategories} categories on track • ${
            metrics.healthScore > 80 ? 'Excellent' : 
            metrics.healthScore > 60 ? 'Good' : 
            metrics.healthScore > 40 ? 'Fair' : 'Needs Work'
          }`}
          variant="default"
        />
        
        {/* Supporting Metrics */}
        <MetricCard
          title="Total Budget"
          value={formatCurrency(metrics.totalBudget)}
          subtitle="Monthly planned spending"
          variant="default"
        />
        
        <MetricCard
          title="Over Budget"
          value={formatCurrency(metrics.totalOverBudget)}
          subtitle={`${metrics.overBudgetCount} ${metrics.overBudgetCount === 1 ? 'category' : 'categories'} exceeded`}
          variant={metrics.overBudgetCount > 0 ? "warning" : "default"}
        />
        
        <MetricCard
          title="Under Budget"
          value={formatCurrency(metrics.totalUnderBudget)}
          subtitle={`${metrics.onTrackCategories} ${metrics.onTrackCategories === 1 ? 'category' : 'categories'} saved`}
          variant="default"
        />
      </>
    );
  } else {
    // Yearly view - Return individual cards (no internal grid)
    return (
      <>
        {/* Hero Metric - Annual Budget Performance */}
        <MetricCard
          title="Annual Budget Performance"
          value={`${Math.round(metrics.healthScore)}%`}
          subtitle={`${metrics.monthsAnalyzed} months analyzed • ${
            metrics.healthScore > 80 ? 'Excellent year' : 
            metrics.healthScore > 60 ? 'Good year' : 
            metrics.healthScore > 40 ? 'Fair year' : 'Challenging year'
          }`}
          variant="hero"
          trend={metrics.yearOverYearTrends ? {
            value: metrics.yearOverYearTrends.healthScore.display,
            direction: metrics.yearOverYearTrends.healthScore.direction
          } : undefined}
          className="col-span-2"
        />
        
        {/* Supporting Metrics */}
        <MetricCard
          title="Avg Monthly Budget"
          value={formatCurrency(metrics.totalBudget)}
          subtitle={`Across ${metrics.monthsAnalyzed} months`}
          variant="default"
          trend={metrics.yearOverYearTrends ? {
            value: metrics.yearOverYearTrends.avgBudget.display,
            direction: metrics.yearOverYearTrends.avgBudget.direction
          } : undefined}
        />
        
        <MetricCard
          title="Total Saved"
          value={formatCurrency(metrics.totalSaved || 0)}
          subtitle={(metrics.totalSaved || 0) > 0 ? "Under budget total" : "Over budget total"}
          variant={(metrics.totalSaved || 0) > 0 ? "default" : "warning"}
          trend={metrics.yearOverYearTrends ? {
            value: metrics.yearOverYearTrends.totalSaved.display,
            direction: metrics.yearOverYearTrends.totalSaved.direction
          } : undefined}
        />
        
        <MetricCard
          title="Consistency"
          value={formatPercentage(metrics.onTrackPercentage || 0)}
          subtitle="Month-to-month stability"
          variant="default"
          trend={metrics.yearOverYearTrends ? {
            value: metrics.yearOverYearTrends.consistency.display,
            direction: metrics.yearOverYearTrends.consistency.direction
          } : undefined}
        />
      </>
    );
  }
}