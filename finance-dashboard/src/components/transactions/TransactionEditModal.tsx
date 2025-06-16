// src/components/transactions/TransactionEditModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Transaction, TransactionUpdate } from '../../types/api';
import { useUpdateTransaction } from '../../hooks/useApiData';
import { useCategories } from '../../hooks/useApiData';

interface TransactionEditModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransactionEditModal({
  transaction,
  isOpen,
  onClose,
  onSuccess
}: TransactionEditModalProps) {
  const [formData, setFormData] = useState<TransactionUpdate>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateMutation = useUpdateTransaction();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories || [];

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && transaction) {
      setFormData({
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        source: transaction.source
      });
      setValidationErrors({});
    }
  }, [isOpen, transaction]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.amount || formData.amount === 0) {
      errors.amount = 'Amount is required and cannot be zero';
    }
    
    if (!formData.category?.trim()) {
      errors.category = 'Category is required';
    }
    
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Check if anything actually changed
    const hasChanges = 
      formData.date !== transaction.date ||
      formData.description !== transaction.description ||
      formData.amount !== transaction.amount ||
      formData.category !== transaction.category ||
      formData.source !== transaction.source;
    
    if (!hasChanges) {
      onClose();
      return;
    }
    
    // Submit updates
    const updates: TransactionUpdate = {};
    if (formData.date !== transaction.date) updates.date = formData.date;
    if (formData.description !== transaction.description) updates.description = formData.description;
    if (formData.amount !== transaction.amount) updates.amount = formData.amount;
    if (formData.category !== transaction.category) updates.category = formData.category;
    if (formData.source !== transaction.source) updates.source = formData.source;
    
    updateMutation.mutate(
      { transactionId: transaction.id!, updates },
      {
        onSuccess: (response) => {
          if (response.monthly_summaries_affected.length > 0) {
            console.log('Monthly summaries updated:', response.monthly_summaries_affected);
          }
          onSuccess?.();
          onClose();
        }
      }
    );
  };

  // Handle input changes
  const handleInputChange = (field: keyof TransactionUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.date ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validationErrors.date && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.date}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Transaction description"
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.description ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validationErrors.description && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.description}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.amount ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validationErrors.amount && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.amount}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Positive for expenses, negative for income
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.category ? 'border-red-500' : 'border-gray-600'
              }`}
            >
              <option value="">Select Category</option>
              {categories.map((category: any) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {validationErrors.category && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.category}</p>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Source
            </label>
            <select
              value={formData.source || ''}
              onChange={(e) => handleInputChange('source', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="chase">Chase</option>
              <option value="wells">Wells Fargo</option>
              <option value="citi">Citi</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>

          {/* Error Display */}
          {updateMutation.error && (
            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-medium text-sm">Update Failed</h4>
                  <p className="text-red-300 text-sm mt-1">
                    {updateMutation.error?.message || 'Failed to update transaction'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}