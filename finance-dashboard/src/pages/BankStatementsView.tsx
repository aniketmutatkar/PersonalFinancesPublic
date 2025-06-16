import React, { useState, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/cards/MetricCard';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

interface BankBalance {
  id: number;
  account_name: string;
  account_number?: string;
  statement_month: string;
  beginning_balance: number;
  ending_balance: number;
  deposits_additions?: number;
  withdrawals_subtractions?: number;
  statement_date: string;
  data_source: string;
  confidence_score: number;
  created_at?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const getApiBaseUrl = () => {
  const host = process.env.REACT_APP_API_HOST || 'localhost';
  const port = process.env.REACT_APP_API_PORT || '8000';
  return `http://${host}:${port}`;
};

export default function BankStatementsView() {
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBankBalances();
  }, []);

  const fetchBankBalances = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/portfolio/bank-balances`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bank balances');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBankBalances(data.balances);
      } else {
        throw new Error('API returned error');
      }
    } catch (err) {
      console.error('Error fetching bank balances:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const latestBalance = bankBalances.length > 0 
    ? bankBalances.reduce((latest, current) => 
        new Date(current.statement_date) > new Date(latest.statement_date) ? current : latest
    )
    : null;

  const totalStatements = bankBalances.length;
  const avgBalance = bankBalances.length > 0 
    ? bankBalances.reduce((sum, b) => sum + b.ending_balance, 0) / bankBalances.length
    : 0;

  // Calculate trend (last 3 months)
  const recentBalances = bankBalances
    .sort((a, b) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime())
    .slice(0, 3);
  
  const balanceTrend = recentBalances.length >= 2 
    ? recentBalances[0].ending_balance - recentBalances[recentBalances.length - 1].ending_balance
    : 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Bank Statements</h2>
          <p className="text-gray-400">{error}</p>
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
        <div className="grid-metrics-4">
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
          <LoadingSkeleton variant="metric" />
        </div>
        <LoadingSkeleton variant="table" rows={8} />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header - DESIGN SYSTEM */}
      <PageHeader
        title="Bank Statements"
        subtitle="Monthly account balances and statement analysis"
        actions={
          <button
            onClick={fetchBankBalances}
            className="btn-secondary btn-sm"
          >
            Refresh Data
          </button>
        }
      />

      {/* Bank Statement Metrics - DESIGN SYSTEM */}
      <div className="grid-metrics-4">
        <MetricCard
          title="Latest Balance"
          value={latestBalance ? formatCurrency(latestBalance.ending_balance) : '$0'}
          subtitle={latestBalance ? `${latestBalance.account_name} • ${latestBalance.statement_month}` : 'No data'}
          variant="hero"
        />

        <MetricCard
          title="Total Statements"
          value={totalStatements}
          subtitle="Monthly statements tracked"
          variant="info"
        />

        <MetricCard
          title="Average Balance"
          value={formatCurrency(avgBalance)}
          subtitle="Across all statements"
          variant="default"
        />

        <MetricCard
          title="3-Month Trend"
          value={formatCurrency(Math.abs(balanceTrend))}
          subtitle="Balance change trend"
          variant={balanceTrend >= 0 ? 'success' : 'warning'}
          trend={{
            value: `${balanceTrend >= 0 ? '+' : ''}${formatCurrency(balanceTrend)}`,
            direction: balanceTrend >= 0 ? 'up' : 'down',
            isPositive: balanceTrend >= 0
          }}
        />
      </div>

      {/* Statements Table - DESIGN SYSTEM */}
      <div className="card-standard">
        <div className="flex items-center justify-between content-gap border-b border-gray-700 pb-6">
          <h3 className="section-title">Statements</h3>
          <span className="text-sm text-gray-400">
            {bankBalances.length} statement{bankBalances.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-sm font-medium text-gray-400 p-4">Date</th>
                <th className="text-left text-sm font-medium text-gray-400 p-4">Account</th>
                <th className="text-right text-sm font-medium text-gray-400 p-4">Beginning</th>
                <th className="text-right text-sm font-medium text-gray-400 p-4">Ending</th>
                <th className="text-right text-sm font-medium text-gray-400 p-4">Change</th>
                <th className="text-center text-sm font-medium text-gray-400 p-4">Source</th>
              </tr>
            </thead>
            <tbody>
              {bankBalances.length > 0 ? (
                bankBalances
                  .sort((a, b) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime())
                  .map((balance) => {
                    const netChange = balance.ending_balance - balance.beginning_balance;
                    return (
                      <tr key={balance.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{balance.statement_month}</p>
                            <p className="text-gray-400 text-sm">{new Date(balance.statement_date).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-white">{balance.account_name}</p>
                            {balance.account_number && (
                              <p className="text-gray-400 text-sm">#{balance.account_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right text-white p-4 font-medium">
                          {formatCurrency(balance.beginning_balance)}
                        </td>
                        <td className="text-right text-white font-bold p-4">
                          {formatCurrency(balance.ending_balance)}
                        </td>
                        <td className={`text-right p-4 font-medium ${netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                        </td>
                        <td className="text-center p-4">
                          <span className={`status-badge ${
                            balance.data_source === 'pdf_statement' 
                              ? 'status-success' 
                              : 'status-info'
                          }`}>
                            {balance.data_source === 'pdf_statement' ? 'PDF' : 'Manual'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-8">
                    <p className="text-gray-400">No bank statements found</p>
                    <p className="text-gray-500 text-sm mt-1">Upload statements to see data here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer - DESIGN SYSTEM */}
        {bankBalances.length > 0 && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/30">
            <p className="text-sm text-gray-400 text-center">
              {bankBalances.length} statement{bankBalances.length !== 1 ? 's' : ''} • 
              Last updated {latestBalance ? new Date(latestBalance.statement_date).toLocaleDateString() : 'Never'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}