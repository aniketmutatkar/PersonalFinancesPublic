// src/components/upload/ManualBalanceEntry.tsx
import React, { useState, useEffect } from 'react';
import { useAllAccounts } from '../../hooks/useApiData';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '../../config/api';

interface ManualBalanceEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceAdded?: () => void;
}

interface ConflictData {
  has_conflict: boolean;
  existing_balance?: {
    id: number;
    balance_amount: number;
    data_source: string;
    notes?: string;
    created_at: string;
  };
  conflict_type?: string;
  message?: string;
}

export default function ManualBalanceEntry({ 
  isOpen, 
  onClose, 
  onBalanceAdded 
}: ManualBalanceEntryProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: accountsResponse, isLoading: accountsLoading } = useAllAccounts();
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId('');
      setBalanceAmount('');
      setNotes('');
      setConflictData(null);
      setSuccessMessage('');
      setBalanceDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSubmit = async (forceOverride = false) => {
    if (!selectedAccountId || !balanceAmount) {
      return;
    }

    setIsSubmitting(true);
    setConflictData(null);
    setSuccessMessage('');

    try {
      const url = forceOverride 
        ? `/api/portfolio/balances?force_override=true`
        : `/api/portfolio/balances`;

      const response = await fetch(`${getApiBaseUrl()}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: Number(selectedAccountId),
          balance_date: balanceDate,
          balance_amount: parseFloat(balanceAmount),
          notes: notes || undefined
        }),
      });

      const data = await response.json();

      if (data.has_conflict) {
        // Handle conflict
        setConflictData(data);
      } else if (data.success) {
        // Success
        setSuccessMessage(data.message);
        
        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['portfolioOverview'] });
        queryClient.invalidateQueries({ queryKey: ['portfolioTrends'] });
        queryClient.invalidateQueries({ queryKey: ['balanceHistory'] });
        
        if (onBalanceAdded) {
          onBalanceAdded();
        }
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(data.detail || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error adding balance:', error);
      setConflictData({
        has_conflict: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceOverride = () => {
    handleSubmit(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDataSourceLabel = (dataSource: string) => {
    switch (dataSource) {
      case 'csv_import': return 'Historical Import';
      case 'manual': return 'Manual Entry';
      case 'pdf_statement': return 'PDF Statement';
      default: return dataSource;
    }
  };

  const getDataSourceColor = (dataSource: string) => {
    switch (dataSource) {
      case 'csv_import': return 'text-blue-400';
      case 'manual': return 'text-green-400';
      case 'pdf_statement': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Add Manual Balance</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <span className="text-green-300 text-sm">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Conflict Resolution */}
          {conflictData && conflictData.has_conflict && (
            <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-yellow-300 font-medium text-sm">Conflict Detected</span>
                </div>
                
                <p className="text-yellow-200 text-sm">{conflictData.message}</p>
                
                {conflictData.existing_balance && (
                  <div className="bg-gray-900/50 rounded p-3 space-y-2">
                    <div className="text-xs text-gray-300">Existing Balance:</div>
                    <div className="text-white font-bold">
                      {formatCurrency(conflictData.existing_balance.balance_amount)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className={getDataSourceColor(conflictData.existing_balance.data_source)}>
                        {getDataSourceLabel(conflictData.existing_balance.data_source)}
                      </span>
                      <span>{formatDate(conflictData.existing_balance.created_at)}</span>
                    </div>
                    {conflictData.existing_balance.notes && (
                      <div className="text-xs text-gray-400">
                        Note: {conflictData.existing_balance.notes}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleForceOverride}
                    disabled={isSubmitting}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white px-3 py-2 rounded text-sm transition-colors"
                  >
                    Override Existing
                  </button>
                  <button
                    onClick={() => setConflictData(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {conflictData && !conflictData.has_conflict && conflictData.message && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">✕</span>
                <span className="text-red-300 text-sm">{conflictData.message}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Account Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting || accountsLoading}
              >
                <option value="">Select an account...</option>
                {accountsResponse?.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.institution})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
                Balance Date (as of)
                <span className="text-xs text-gray-400 block mt-1">
                Enter the ending balance for this date (typically month-end)
                </span>
            </label>
            <input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
            />
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ending Balance
                    <span className="text-xs text-gray-400 block mt-1">
                    Ending value as of the date above
                    </span>
                </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this balance..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={!selectedAccountId || !balanceAmount || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Balance</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}