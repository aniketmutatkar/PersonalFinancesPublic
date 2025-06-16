// src/components/upload/TransactionReview.tsx
import React, { useState } from 'react';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';
import { TransactionPreview, CategoryUpdate } from '../../types/api';
import { useCategories } from '../../hooks/useApiData';

interface TransactionReviewProps {
  transactions: TransactionPreview[];
  onCategoryUpdates: (updates: CategoryUpdate[]) => void;
  onSkip: () => void;
  className?: string;
}

export default function TransactionReview({ 
  transactions, 
  onCategoryUpdates, 
  onSkip,
  className = '' 
}: TransactionReviewProps) {
  const [categoryUpdates, setCategoryUpdates] = useState<Record<string, string>>({});
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const { data: categoriesData } = useCategories();
  const availableCategories = categoriesData?.categories || [];

  // Handle individual category change
  const handleCategoryChange = (tempId: string, newCategory: string) => {
    setCategoryUpdates(prev => ({
      ...prev,
      [tempId]: newCategory
    }));
  };

  // Handle bulk category assignment
  const handleBulkCategoryChange = (category: string) => {
    const updates: Record<string, string> = {};
    selectedTransactions.forEach(tempId => {
      updates[tempId] = category;
    });
    setCategoryUpdates(prev => ({ ...prev, ...updates }));
    setSelectedTransactions(new Set()); // Clear selection
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (tempId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tempId)) {
        newSet.delete(tempId);
      } else {
        newSet.add(tempId);
      }
      return newSet;
    });
  };

  // Select all transactions
  const selectAll = () => {
    setSelectedTransactions(new Set(transactions.map(tx => tx.temp_id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTransactions(new Set());
  };

  // Submit updates
  const handleSubmit = () => {
    const updates: CategoryUpdate[] = Object.entries(categoryUpdates).map(([tempId, newCategory]) => ({
      temp_id: tempId,
      new_category: newCategory
    }));
    onCategoryUpdates(updates);
  };

  // Get all unique suggested categories
  const allSuggestedCategories = Array.from(
    new Set(transactions.flatMap(tx => tx.suggested_categories))
  ).filter(Boolean);

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

  const hasUpdates = Object.keys(categoryUpdates).length > 0;
  const hasSelection = selectedTransactions.size > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-400 font-medium text-lg">Review Required</h3>
            <p className="text-yellow-300 text-sm mt-1">
              {transactions.length} transactions need category assignment. Review and assign categories below.
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {hasSelection && (
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-medium">
              {selectedTransactions.size} transaction{selectedTransactions.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              {allSuggestedCategories.map(category => (
                <button
                  key={category}
                  onClick={() => handleBulkCategoryChange(category)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Assign "{category}"
                </button>
              ))}
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={selectAll}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
          >
            Clear Selection
          </button>
        </div>
        <div className="text-gray-400 text-sm">
          {Object.keys(categoryUpdates).length} of {transactions.length} categorized
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.map((transaction) => {
          const isSelected = selectedTransactions.has(transaction.temp_id);
          const currentCategory = categoryUpdates[transaction.temp_id] || transaction.category;
          const hasUpdate = transaction.temp_id in categoryUpdates;

          return (
            <div
              key={transaction.temp_id}
              className={`
                bg-gray-800 border rounded-lg p-4 transition-all duration-200
                ${isSelected ? 'border-blue-500 bg-blue-900/10' : 'border-gray-600 hover:border-gray-500'}
                ${hasUpdate ? 'ring-1 ring-green-500/50' : ''}
              `}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTransactionSelection(transaction.temp_id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700"
                  />
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-medium text-sm truncate">
                        {transaction.description}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                        <span>{formatDate(transaction.date)}</span>
                        <span>{formatCurrency(transaction.amount)}</span>
                        <span className="capitalize">{transaction.source}</span>
                      </div>
                    </div>
                    
                    {hasUpdate && (
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Category Assignment */}
                  <div className="mt-3 flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">Category:</span>
                    
                    <select
                      value={currentCategory}
                      onChange={(e) => handleCategoryChange(transaction.temp_id, e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Misc">Select Category</option>
                      
                      {/* Suggested categories first */}
                      {transaction.suggested_categories.length > 0 && (
                        <>
                          <optgroup label="Suggested">
                            {transaction.suggested_categories.map(category => (
                              <option key={`suggested-${category}`} value={category}>
                                {category} (suggested)
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                      
                      {/* All available categories from backend */}
                      <optgroup label="All Categories">
                        {availableCategories.map((category: any) => (
                          <option key={category.name} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                        {/* Fallback categories if backend doesn't load */}
                        {availableCategories.length === 0 && (
                          <>
                            <option value="Misc">Misc</option>
                            <option value="Food">Food</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Gas">Gas</option>
                            <option value="Entertainment">Entertainment</option>
                          </>
                        )}
                      </optgroup>
                    </select>

                    {/* Quick category buttons */}
                    <div className="flex items-center space-x-1">
                      {transaction.suggested_categories.slice(0, 2).map(category => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(transaction.temp_id, category)}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Skip Review
        </button>
        
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-sm">
            {Object.keys(categoryUpdates).length > 0 
              ? `${Object.keys(categoryUpdates).length} categories updated` 
              : 'No updates made'
            }
          </span>
          <button
            onClick={handleSubmit}
            disabled={!hasUpdates}
            className={`
              flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
              ${hasUpdates 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <span>Continue Upload</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}