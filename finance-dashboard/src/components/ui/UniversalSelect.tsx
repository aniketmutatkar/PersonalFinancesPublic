// src/components/ui/UniversalSelect.tsx
// Replaces: MonthSelector, year dropdowns, period selectors, chart toggles

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Base option interface that all selectors can use
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface UniversalSelectProps {
  // Core functionality
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  
  // Display options
  placeholder?: string;
  variant?: 'dropdown' | 'buttons' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  
  // Styling
  className?: string;
  disabled?: boolean;
  
  // Advanced options
  clearable?: boolean;
  searchable?: boolean;
  loading?: boolean;
  autoWidth?: boolean; // NEW: Allow auto-sizing based on content
}

export default function UniversalSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  variant = 'dropdown',
  size = 'md', // DEFAULT: Always medium unless specifically overridden
  className = '',
  disabled = false,
  clearable = false,
  searchable = false,
  loading = false,
  autoWidth = false // NEW: Default to fixed width for consistency
}: UniversalSelectProps) {
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

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Focus next option logic would go here
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Focus previous option logic would go here
          break;
        case 'Enter':
          event.preventDefault();
          // Select focused option logic would go here
          break;
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get selected option for display
  const selectedOption = options.find(opt => opt.value === value);

  // Handle option selection
  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Size classes with UNIVERSAL DEFAULTS
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base', // STANDARD: Most selectors use this
    lg: 'px-6 py-4 text-xl font-medium' // SPECIAL: Only for emphasized selectors
  };

  // Width classes - UNIVERSAL CONSISTENCY
  const getWidthClass = () => {
    if (autoWidth) return 'w-auto min-w-[120px]';
    
    // UNIVERSAL WIDTHS based on typical content:
    switch (size) {
      case 'sm': return 'w-36'; // 144px - for short options like years
      case 'md': return 'w-48'; // 192px - for medium options like months  
      case 'lg': return 'w-64'; // 256px - for long options
      default: return 'w-48';
    }
  };

  // VARIANT: BUTTONS (for period selectors, view toggles)
  if (variant === 'buttons') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={disabled || option.disabled}
            className={`
              px-3 py-1 rounded text-sm font-medium transition-colors
              ${value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }
              ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  // VARIANT: PILLS (for compact selections)
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={disabled || option.disabled}
            className={`
              px-3 py-1 rounded-full text-sm transition-colors
              ${value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
              ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  // VARIANT: DROPDOWN (default - replaces MonthSelector and others)
  return (
    <div className={`relative ${getWidthClass()} ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          appearance-none bg-gray-800 border border-gray-600 rounded-lg
          text-white text-left w-full
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          hover:border-gray-500 transition-colors
          flex items-center justify-between
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span 
          className={`${selectedOption ? 'text-white' : 'text-gray-400'} truncate flex-1 text-left`}
        >
          {loading ? 'Loading...' : selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto min-w-full">
          {/* Search Input */}
          {searchable && (
            <div className="p-3 border-b border-gray-600">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Clear Option */}
          {clearable && selectedOption && (
            <>
              <button
                onClick={handleClear}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 transition-colors text-sm"
              >
                Clear Selection
              </button>
              <div className="border-b border-gray-600" />
            </>
          )}

          {/* Options */}
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-center text-sm">
              {searchTerm ? 'No options found' : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
                className={`
                  w-full text-left px-4 py-3 transition-colors text-sm
                  ${value === option.value
                    ? 'bg-blue-600 text-white'
                    : option.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-white hover:bg-gray-700'
                  }
                `}
              >
                <span className="truncate block">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}