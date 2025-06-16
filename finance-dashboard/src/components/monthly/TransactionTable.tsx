// src/components/monthly/TransactionTable.tsx - Enhanced Version
import React, { useState, useMemo } from 'react';
import { Search, Filter, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { Transaction } from '../../types/api';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
}

type SortField = 'date' | 'amount' | 'category' | 'description';
type SortOrder = 'asc' | 'desc';

// Category colors matching your chart
const CATEGORY_COLORS: Record<string, string> = {
  'Rent': '#10B981',
  'Food': '#F59E0B', 
  'Venmo': '#3B82F6',
  'Shopping': '#EF4444',
  'Groceries': '#8B5CF6',
  'Travel': '#06B6D4',
  'Subscriptions': '#F97316',
  'Utilities': '#84CC16',
  'Entertainment': '#EC4899',
  'Transportation': '#6366F1',
  // Add more categories with consistent colors
  'Gas': '#6366F1',
  'Dining': '#F59E0B',
  'Clothing': '#EF4444',
  'Health': '#10B981',
  'Insurance': '#84CC16',
  'Miscellaneous': '#64748b',
  'Misc': '#64748b'
};

export default function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { categories, filteredAndSortedTransactions, summary } = useMemo(() => {
    // Filter out payment/income categories and get unique categories
    const spendingTransactions = transactions.filter(t => 
      !['Pay', 'Payment', 'Paycheck', 'Salary', 'Income'].includes(t.category) && 
      t.amount > 0 // Only positive amounts (expenses)
    );
    
    const uniqueCategories = Array.from(new Set(spendingTransactions.map(t => t.category))).sort();
    
    // Filter transactions based on search and category
    let filtered = spendingTransactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || transaction.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort transactions
    const sorted = filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'amount') {
        aValue = Math.abs(aValue);
        bValue = Math.abs(bValue);
      }
      
      if (sortField === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate summary stats
    const totalAmount = filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgAmount = filtered.length > 0 ? totalAmount / filtered.length : 0;
    const largestTransaction = Math.max(...filtered.map(t => Math.abs(t.amount)), 0);
    
    const summaryStats = {
      count: filtered.length,
      total: totalAmount,
      average: avgAmount,
      largest: largestTransaction
    };

    return { 
      categories: uniqueCategories, 
      filteredAndSortedTransactions: sorted, 
      summary: summaryStats 
    };
  }, [transactions, searchTerm, selectedCategory, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    // Return specific color if exists, otherwise generate consistent color based on category name
    if (CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS[category];
    }
    
    // Generate a consistent color based on category name hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'];
    return colors[Math.abs(hash) % colors.length];
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      {/* Header with Summary Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-medium text-xl mb-2">Transaction History</h3>
            <p className="text-gray-400 text-sm">
              {summary.count} transactions • {formatCurrency(summary.total)} total
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Average</p>
              <p className="text-white text-sm font-medium">{formatCurrency(summary.average)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Largest</p>
              <p className="text-white text-sm font-medium">{formatCurrency(summary.largest)}</p>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-600">
              <th 
                className="text-left py-3 px-4 text-gray-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-gray-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center gap-2">
                  Description
                  {getSortIcon('description')}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 text-gray-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="text-right py-3 px-4 text-gray-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-2">
                  Amount
                  {getSortIcon('amount')}
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedTransactions.map((transaction, index) => (
              <tr 
                key={transaction.id || index} 
                className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
              >
                <td className="py-4 px-4 text-gray-300 text-sm">
                  {formatDate(transaction.date)}
                </td>
                <td className="py-4 px-4">
                  <div className="text-white font-normal pr-4" title={transaction.description}>
                    {transaction.description}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-normal text-white"
                    style={{ 
                      backgroundColor: `${getCategoryColor(transaction.category)}20`,
                      color: getCategoryColor(transaction.category),
                      border: `1px solid ${getCategoryColor(transaction.category)}40`
                    }}
                  >
                    {transaction.category}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-white font-medium">
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || selectedCategory ? 'Try adjusting your filters' : 'No transaction data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}