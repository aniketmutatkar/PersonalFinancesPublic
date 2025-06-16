// src/components/ui/UniversalMultiSelect.tsx
// Replaces: YearSelector, CategorySelector

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

// Base option interface for multi-select
interface MultiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  metadata?: any; // For CategorySelector's totalAmount, etc.
}

// Quick action configuration
interface QuickAction {
  label: string;
  action: (options: MultiSelectOption[]) => (string | number)[];
}

interface UniversalMultiSelectProps {
  // Core functionality
  options: MultiSelectOption[];
  values: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  
  // Display options
  placeholder?: string;
  maxSelection?: number;
  showPills?: boolean;
  maxPillsDisplay?: number;
  
  // Quick actions
  quickActions?: QuickAction[];
  showSelectAll?: boolean;
  showClearAll?: boolean;
  
  // Styling
  className?: string;
  disabled?: boolean;
  
  // Advanced options
  searchable?: boolean;
  loading?: boolean;
  sortOrder?: 'asc' | 'desc' | 'original';
  
  // Custom display functions
  formatOptionLabel?: (option: MultiSelectOption) => React.ReactNode;
  formatPillLabel?: (option: MultiSelectOption) => string;
}

export default function UniversalMultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Select options',
  maxSelection,
  showPills = true,
  maxPillsDisplay = 6,
  quickActions = [],
  showSelectAll = true,
  showClearAll = true,
  className = '',
  disabled = false,
  searchable = false,
  loading = false,
  sortOrder = 'original',
  formatOptionLabel,
  formatPillLabel
}: UniversalMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort options if needed
  const sortedOptions = React.useMemo(() => {
    if (sortOrder === 'original') return options;
    
    return [...options].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.label.localeCompare(b.label);
      } else {
        return b.label.localeCompare(a.label);
      }
    });
  }, [options, sortOrder]);

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? sortedOptions.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sortedOptions;

  // Get selected options for display
  const selectedOptions = options.filter(opt => values.includes(opt.value));

  // Handle option toggle
  const handleToggle = (optionValue: string | number) => {
    if (values.includes(optionValue)) {
      // Remove value
      onChange(values.filter(v => v !== optionValue));
    } else {
      // Add value (respecting max selection)
      if (!maxSelection || values.length < maxSelection) {
        onChange([...values, optionValue]);
      }
    }
  };

  // Handle quick actions
  const handleQuickAction = (action: QuickAction) => {
    const newValues = action.action(options);
    onChange(newValues);
  };

  // Handle select all
  const handleSelectAll = () => {
    const allValues = options
      .filter(opt => !opt.disabled)
      .map(opt => opt.value);
    onChange(maxSelection ? allValues.slice(0, maxSelection) : allValues);
  };

  // Handle clear all
  const handleClearAll = () => {
    onChange([]);
  };

  // Get display text for the button
  const getDisplayText = () => {
    if (loading) return 'Loading...';
    if (values.length === 0) return placeholder;
    if (values.length === options.length) return `All ${options.length} Selected`;
    if (values.length <= 2) {
      return selectedOptions.map(opt => opt.label).join(', ');
    }
    return `${values.length} Selected`;
  };

  // Format currency helper (for CategorySelector compatibility)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Selected Pills */}
      {showPills && values.length > 0 && values.length <= maxPillsDisplay && (
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Reverse order so newest selections appear closest to button */}
          {[...selectedOptions].reverse().map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-xs"
            >
              <span>{formatPillLabel ? formatPillLabel(option) : option.label}</span>
              <button
                onClick={() => handleToggle(option.value)}
                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center justify-between w-72 px-4 py-3 
            bg-gray-700 border border-gray-600 rounded-lg text-white 
            hover:bg-gray-600 transition-colors text-sm
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span>{getDisplayText()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Header Section */}
            <div className="p-3 border-b border-gray-600">
              {/* Search Input */}
              {searchable && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">
                  {quickActions.length > 0 ? 'Quick Select' : 'Actions'}
                </span>
                {showClearAll && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Built-in Select All */}
                {showSelectAll && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Select All
                  </button>
                )}

                {/* Custom Quick Actions */}
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options List */}
            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2 px-2">
                {values.length}{maxSelection ? `/${maxSelection}` : ''} selected
                {searchTerm && ` • Filtered: ${filteredOptions.length}`}
              </div>

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-gray-400 text-center text-sm">
                  {searchTerm ? 'No options found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = values.includes(option.value);
                  const isDisabled = option.disabled || 
                    (maxSelection && !isSelected && values.length >= maxSelection);
                  
                  return (
                    <div
                      key={option.value}
                      onClick={() => !isDisabled && handleToggle(option.value)}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors
                        ${isSelected 
                          ? 'bg-blue-600 text-white' 
                          : isDisabled
                          ? 'text-gray-500 cursor-not-allowed'
                          : 'text-white hover:bg-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Option Label */}
                        <span className="truncate">
                          {formatOptionLabel ? formatOptionLabel(option) : option.label}
                        </span>
                        
                        {/* Metadata (for CategorySelector compatibility) */}
                        {option.metadata?.totalAmount && (
                          <span className="text-xs text-gray-300 ml-auto">
                            {formatCurrency(option.metadata.totalAmount)}
                          </span>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}