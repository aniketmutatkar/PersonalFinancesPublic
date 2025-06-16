// src/pages/InvestmentView.tsx - MINIMAL SELECTOR CHANGE ONLY
// Taking your EXACT original code and ONLY adding UniversalSelect for period selection

import React, { useState } from 'react';
import { 
  usePortfolioOverview, 
  usePortfolioTrends, 
  useInvestmentOverview,
  useInvestmentTrends, 
  useSpendingPatterns
} from '../hooks/useApiData';
import { PortfolioAccount, InstitutionSummary, AccountTypeSummary } from '../types/api';

// ONLY ADDITION: Import UniversalSelect
import UniversalSelect from '../components/ui/UniversalSelect';

// KEEPING ALL YOUR EXACT ORIGINAL IMPORTS
import InvestmentOverview from '../components/investments/InvestmentOverview';
import InvestmentTrends from '../components/investments/InvestmentTrends';
import AccountComparison from '../components/investments/AccountComparison';
import InvestmentPatterns from '../components/investments/InvestmentPatterns';
import PortfolioValueChart from '../components/portfolio/PortfolioValueChart';
import PageHeader from '../components/layout/PageHeader';

export default function InvestmentView() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  
  // ONLY ADDITION: Period options for UniversalSelect
  const periodOptions = [
    { value: 'all', label: 'All Time' },
    { value: '2y', label: '2 Years' },
    { value: '1y', label: '1 Year' },
    { value: '6m', label: '6 Months' },
    { value: '3m', label: '3 Months' }
  ];
  
  // KEEPING ALL YOUR EXACT ORIGINAL DATA HOOKS
  const { 
    data: portfolioOverview, 
    isLoading: portfolioLoading, 
    error: portfolioError 
  } = usePortfolioOverview();
  
  const { 
    data: portfolioTrends, 
    isLoading: trendsLoading, 
    error: trendsError 
  } = usePortfolioTrends(selectedPeriod);
  
  // Legacy Investment Data (for patterns/consistency analysis)
  const { 
    data: legacyOverviewData, 
    isLoading: legacyOverviewLoading 
  } = useInvestmentOverview();
  
  const { 
    data: legacyTrendsData, 
    isLoading: legacyTrendsLoading 
  } = useInvestmentTrends();
  
  const { 
    data: patternsData, 
    isLoading: patternsLoading 
  } = useSpendingPatterns();

  // KEEPING YOUR EXACT ORIGINAL ERROR CHECK
  const hasError = portfolioError || trendsError;

  // KEEPING YOUR EXACT ORIGINAL RETURN STRUCTURE
  return (
    <div className="space-y-8">
      {/* Clean Page Header - Analytics Focus */}
      <div className="border-b border-gray-700 pb-6">
        <PageHeader
          title="Portfolio Analytics"
          subtitle="Real portfolio performance, account allocation, and growth tracking across all platforms"
          actions={
            // ONLY CHANGE: Add period selector using UniversalSelect
            <UniversalSelect
              options={periodOptions}
              value={selectedPeriod}
              onChange={(value) => setSelectedPeriod(String(value))}
              placeholder="Select Period"
              size="sm"
            />
          }
        />
        
        {/* KEEPING YOUR EXACT ORIGINAL Portfolio Summary Bar */}
        {portfolioOverview && !portfolioLoading && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                ${portfolioOverview.total_portfolio_value.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Portfolio Value</div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">
                +${portfolioOverview.total_growth.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Growth</div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {portfolioOverview.growth_percentage.toFixed(1)}%
              </div>
              <div className="text-gray-400 text-sm">Growth Rate</div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {portfolioOverview.accounts.length}
              </div>
              <div className="text-gray-400 text-sm">Active Accounts</div>
            </div>
          </div>
        )}
      </div>

      {/* KEEPING YOUR EXACT ORIGINAL Error State */}
      {hasError && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <h3 className="text-red-400 font-medium">Error Loading Portfolio Data</h3>
              <p className="text-red-300 text-sm mt-1">
                {portfolioError?.message || trendsError?.message || 'Unable to load portfolio analytics'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KEEPING YOUR EXACT ORIGINAL Portfolio Performance Overview */}
      {portfolioOverview && !portfolioLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Accounts */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">🏆 Top Performing Accounts</h3>
            <div className="space-y-3">
              {portfolioOverview.accounts
                .sort((a: PortfolioAccount, b: PortfolioAccount) => b.annualized_return - a.annualized_return)
                .slice(0, 5)
                .map((account: PortfolioAccount, index: number) => (
                  <div key={account.account_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400 text-sm">#{index + 1}</span>
                      <div>
                        <div className="text-white font-medium">{account.account_name}</div>
                        <div className="text-gray-400 text-xs">{account.institution}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${account.annualized_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {account.annualized_return.toFixed(1)}%
                      </div>
                      <div className="text-gray-400 text-xs">annual return</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Institution Performance */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">🏛️ Institution Performance</h3>
            <div className="space-y-3">
              {portfolioOverview.by_institution
                .sort((a: InstitutionSummary, b: InstitutionSummary) => b.growth_percentage - a.growth_percentage)
                .map((institution: InstitutionSummary, index: number) => (
                  <div key={institution.institution} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400 text-sm">#{index + 1}</span>
                      <div>
                        <div className="text-white font-medium">{institution.institution}</div>
                        <div className="text-gray-400 text-xs">
                          {institution.account_count} account{institution.account_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${institution.growth_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {institution.growth_percentage.toFixed(1)}%
                      </div>
                      <div className="text-gray-400 text-xs">
                        ${institution.total_balance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* KEEPING YOUR EXACT ORIGINAL Legacy Investment Overview */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Investment Deposit Analysis</h2>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            Transaction-based data
          </span>
        </div>
        <div className="grid-metrics-4">
          <InvestmentOverview 
            data={legacyOverviewData} 
            isLoading={legacyOverviewLoading} 
          />
        </div>
      </div>

      {/* KEEPING YOUR EXACT ORIGINAL Portfolio Value Trends Chart */}
      {portfolioTrends && !trendsLoading && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">📈 Portfolio Value Over Time</h2>
          <PortfolioValueChart 
            data={portfolioTrends} 
            isLoading={trendsLoading}
            portfolioOverview={portfolioOverview}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>
      )}

      {/* KEEPING YOUR EXACT ORIGINAL Enhanced Investment Trends */}
      <InvestmentTrends 
        data={legacyTrendsData} 
        isLoading={legacyTrendsLoading} 
      />

      {/* KEEPING YOUR EXACT ORIGINAL Account Comparison + Investment Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Comparison (Enhanced with Portfolio Data) */}
        <div className="lg:col-span-2">
          <AccountComparison 
            data={legacyTrendsData} 
            isLoading={legacyTrendsLoading} 
          />
        </div>
        
        {/* Investment Patterns */}
        <div className="lg:col-span-1">
          <InvestmentPatterns 
            patternsData={patternsData} 
            isLoading={patternsLoading} 
          />
        </div>
      </div>

      {/* KEEPING YOUR EXACT ORIGINAL Account Type Performance */}
      {portfolioOverview && !portfolioLoading && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">🏦 Account Type Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {portfolioOverview.by_account_type.map((accountType: AccountTypeSummary) => (
              <div key={accountType.account_type} className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white capitalize mb-1">
                    {accountType.account_type.replace('_', ' ')}
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">
                    ${accountType.total_balance.toLocaleString()}
                  </div>
                  <div className={`text-sm font-medium mb-2 ${
                    accountType.growth_percentage >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {accountType.growth_percentage >= 0 ? '+' : ''}{accountType.growth_percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {accountType.account_count} account{accountType.account_count !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Growth: ${accountType.total_growth.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KEEPING YOUR EXACT ORIGINAL Enhanced Summary Footer */}
      {portfolioOverview && !portfolioLoading && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">📊 Portfolio Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            
            {/* Portfolio Overview */}
            <div>
              <h4 className="text-gray-300 font-medium mb-2">Portfolio Overview</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Total Value: ${portfolioOverview.total_portfolio_value.toLocaleString()}</li>
                <li>• Total Deposits: ${portfolioOverview.total_deposits.toLocaleString()}</li>
                <li>• Total Growth: ${portfolioOverview.total_growth.toLocaleString()}</li>
                <li>• Growth Rate: {portfolioOverview.growth_percentage.toFixed(1)}%</li>
              </ul>
            </div>
            
            {/* Best Performers */}
            <div>
              <h4 className="text-gray-300 font-medium mb-2">Best Performers</h4>
              <ul className="space-y-1 text-gray-400">
                {portfolioOverview.accounts
                  .sort((a: PortfolioAccount, b: PortfolioAccount) => b.annualized_return - a.annualized_return)
                  .slice(0, 3)
                  .map((account: PortfolioAccount) => (
                    <li key={account.account_id}>
                      • {account.account_name}: {account.annualized_return.toFixed(1)}%
                    </li>
                  ))
                }
              </ul>
            </div>
            
            {/* Data Coverage */}
            <div>
              <h4 className="text-gray-300 font-medium mb-2">Data Coverage</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Active Accounts: {portfolioOverview.accounts.length}</li>
                <li>• Institutions: {portfolioOverview.by_institution.length}</li>
                <li>• As of: {new Date(portfolioOverview.as_of_date).toLocaleDateString()}</li>
                <li>• Period: {portfolioOverview.accounts?.[0]?.period_months || 0} months</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}