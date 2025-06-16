// src/components/upload/UploadSummary.tsx
import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  FileText, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { UploadSummaryResponse, ProcessedTransaction } from '../../types/api';

interface UploadSummaryProps {
  summary: UploadSummaryResponse;
  onViewMonthly: () => void;
  onUploadMore: () => void;
  className?: string;
}

export default function UploadSummary({ 
  summary, 
  onViewMonthly, 
  onUploadMore, 
  className = '' 
}: UploadSummaryProps) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'new' | 'duplicates' | 'reviewed'>('all');

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = summary.processed_transactions || [];

    // Apply filters
    switch (filterBy) {
      case 'new':
        filtered = filtered.filter(tx => !tx.was_duplicate);
        break;
      case 'duplicates':
        filtered = filtered.filter(tx => tx.was_duplicate);
        break;
      case 'reviewed':
        filtered = filtered.filter(tx => tx.was_reviewed);
        break;
      // 'all' shows everything
    }

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(search) ||
        tx.category.toLowerCase().includes(search) ||
        tx.source.toLowerCase().includes(search) ||
        tx.original_filename.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [summary.processed_transactions, filterBy, searchTerm]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Header */}
      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-8 w-8 text-green-400" />
          <div>
            <h2 className="text-xl font-bold text-green-400">Upload Successful!</h2>
            <p className="text-green-300 text-sm mt-1">{summary.message}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{summary.files_processed}</div>
              <div className="text-gray-400 text-sm">Files Processed</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">{summary.new_transactions.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">New Transactions</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-white">{summary.duplicate_transactions.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Duplicates Detected</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">{summary.total_transactions.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Total Processed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Section */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg">
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-lg font-semibold text-white">
              Transaction Details ({summary.total_transactions} processed)
            </div>
            {summary.processed_transactions && summary.processed_transactions.length > 0 && (
              <div className="text-sm text-gray-400">
                Click to view all transactions and their categorization
              </div>
            )}
          </div>
          {showTransactions ? 
            <ChevronUp className="h-5 w-5 text-gray-400" /> : 
            <ChevronDown className="h-5 w-5 text-gray-400" />
          }
        </button>

        {showTransactions && summary.processed_transactions && (
          <div className="border-t border-gray-700 p-6 space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Transactions</option>
                  <option value="new">New Only ({summary.new_transactions})</option>
                  <option value="duplicates">Duplicates Only ({summary.duplicate_transactions})</option>
                  <option value="reviewed">Manually Reviewed</option>
                </select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-gray-400">
              Showing {filteredTransactions.length} of {summary.total_transactions} transactions
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-white font-medium">Description</th>
                      <th className="px-4 py-3 text-right text-white font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-white font-medium">Category</th>
                      <th className="px-4 py-3 text-left text-white font-medium">Source</th>
                      <th className="px-4 py-3 text-center text-white font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredTransactions.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-300">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3 text-white max-w-xs truncate">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${transaction.was_reviewed 
                              ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                              : 'bg-gray-700 text-gray-300'
                            }`}>
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 capitalize">
                          {transaction.source}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {transaction.was_duplicate ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Added
                              </span>
                            )}
                            {transaction.was_reviewed && (
                              <span className="inline-flex items-center px-1 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                                R
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No transactions match your current filter.
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="border-t border-gray-700 pt-4">
              <div className="text-sm text-gray-400 mb-2">Status Legend:</div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                  <span className="text-gray-300">Added to database</span>
                </div>
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  <span className="text-gray-300">Duplicate (skipped)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300">Blue category = Manually reviewed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-400 font-bold text-xs">R</span>
                  <span className="text-gray-300">Manually reviewed during upload</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced File Breakdown */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">File Processing Results</h3>
        <div className="space-y-3">
          {Object.entries(summary.transactions_by_file).map(([filename, count]) => (
            <div key={filename} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-white font-medium text-sm">{filename}</span>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-sm">
                  {count.toLocaleString()} transaction{count !== 1 ? 's' : ''} processed
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {summary.duplicate_transactions > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-yellow-400 text-sm font-medium">
              ✓ {summary.duplicate_transactions} duplicate{summary.duplicate_transactions !== 1 ? 's' : ''} detected and skipped
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-700">
        <button
          onClick={onViewMonthly}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex-1"
        >
          <Calendar className="h-5 w-5" />
          <span>View Monthly Analysis</span>
          <ArrowRight className="h-5 w-5" />
        </button>
        
        <button
          onClick={onUploadMore}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex-1"
        >
          <FileText className="h-5 w-5" />
          <span>Upload More Files</span>
        </button>
      </div>

      {/* Pro Tip */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">
          <strong className="text-gray-300">Pro Tip:</strong> The transaction details above show exactly how each transaction was processed. 
          Blue-highlighted categories were manually reviewed, while others were automatically categorized. 
          Duplicates are safely skipped to maintain data integrity.
        </div>
      </div>
    </div>
  );
}