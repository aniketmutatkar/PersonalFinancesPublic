// src/components/transactions/TransactionFilters.tsx
import React, { useState } from 'react';
import { Filter, Search, ChevronRight, X } from 'lucide-react';

interface Filters {
  categories: string[];
  description: string;
  startDate: string;
  endDate: string;
  month: string;
  page: number;
  pageSize: number;
}

interface Category {
  name: string;
  keywords: string[];
  budget: number | null;
  is_investment: boolean;
  is_income: boolean;
  is_payment: boolean;
}

interface TransactionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  categories: Category[];
  variant?: 'horizontal' | 'sidebar';
}

// Helper function to parse natural language month input
const parseMonthInput = (input: string): string | null => {
  if (!input.trim()) return null;
  
  const cleaned = input.trim().toLowerCase();
  
  // Check if already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(input)) {
    return input;
  }
  
  // Month name mappings
  const monthNames: { [key: string]: string } = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  // Try to match "month year" format (e.g., "January 2024", "Jan 2024")
  const monthYearMatch = cleaned.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const monthNum = monthNames[month];
    if (monthNum) {
      return `${year}-${monthNum}`;
    }
  }
  
  return null; // Invalid format
};

export default function TransactionFilters({ 
  filters, 
  onFiltersChange, 
  categories,
  variant = 'horizontal'
}: TransactionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [monthInput, setMonthInput] = useState(filters.month || '');
  const [monthError, setMonthError] = useState<string>('');

  // Handle month input change
  const handleMonthChange = (value: string) => {
    setMonthInput(value);
    
    if (!value.trim()) {
      setMonthError('');
      onFiltersChange({ month: '' });
      return;
    }
    
    const parsedMonth = parseMonthInput(value);
    if (parsedMonth) {
      setMonthError('');
      onFiltersChange({ month: parsedMonth });
    } else {
      setMonthError('Enter format like "January 2024", "Jan 2024", or "2024-01"');
    }
  };

  // Sidebar variant - compact version
  if (variant === 'sidebar') {
    return (
      <div className="space-y-4">
        {/* Description Search */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Search Description
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={filters.description}
              onChange={(e) => onFiltersChange({ description: e.target.value })}
              placeholder="Search descriptions..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
            {filters.description && (
              <button
                onClick={() => onFiltersChange({ description: '' })}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-300">
              Categories
            </label>
            {filters.categories.length > 0 && (
              <button
                onClick={() => onFiltersChange({ categories: [] })}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Selected Categories Pills */}
          {filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {filters.categories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full"
                >
                  {category}
                  <button
                    onClick={() => onFiltersChange({
                      categories: filters.categories.filter(c => c !== category)
                    })}
                    className="hover:text-blue-200"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Category List - Remove scroll, show all categories */}
          <div className="space-y-0.5">
            {categories.map((category) => (
              <label key={category.name} className="flex items-center gap-2 p-1 rounded hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onFiltersChange({
                        categories: [...filters.categories, category.name]
                      });
                    } else {
                      onFiltersChange({
                        categories: filters.categories.filter(c => c !== category.name)
                      });
                    }
                  }}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs text-gray-300">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Filters - More compact */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Month
            </label>
            <input
              type="text"
              value={monthInput}
              onChange={(e) => handleMonthChange(e.target.value)}
              placeholder="Jan 2024 or 2024-01"
              className={`w-full px-2.5 py-1.5 text-xs bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                monthError ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {monthError && (
              <p className="text-xs text-red-400 mt-1">{monthError}</p>
            )}
            {monthInput && !monthError && parseMonthInput(monthInput) && (
              <p className="text-xs text-green-400 mt-1">
                ✓ {parseMonthInput(monthInput)}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFiltersChange({ startDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFiltersChange({ endDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    );
  }

  // Original horizontal variant (unchanged for backwards compatibility)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg mb-6">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            {(filters.categories.length > 0 || filters.description || filters.month) && (
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                {filters.categories.length + (filters.description ? 1 : 0) + (filters.month ? 1 : 0)}
              </span>
            )}
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </button>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Description Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Description
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={filters.description}
                onChange={(e) => onFiltersChange({ description: e.target.value })}
                placeholder="Search transaction descriptions..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filters.description && (
                <button
                  onClick={() => onFiltersChange({ description: '' })}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Categories ({filters.categories.length} selected)
              </label>
              {filters.categories.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ categories: [] })}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Categories */}
            {filters.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.categories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                  >
                    {category}
                    <button
                      onClick={() => onFiltersChange({
                        categories: filters.categories.filter(c => c !== category)
                      })}
                      className="hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Category Checkboxes */}
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {categories.map((category) => (
                <label key={category.name} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFiltersChange({
                          categories: [...filters.categories, category.name]
                        });
                      } else {
                        onFiltersChange({
                          categories: filters.categories.filter(c => c !== category.name)
                        });
                      }
                    }}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Filters - Horizontal */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Month
              </label>
              <input
                type="text"
                value={monthInput}
                onChange={(e) => handleMonthChange(e.target.value)}
                placeholder="January 2024, Jan 2024, or 2024-01"
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  monthError ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {monthError && (
                <p className="text-sm text-red-400 mt-1">{monthError}</p>
              )}
              {monthInput && !monthError && parseMonthInput(monthInput) && (
                <p className="text-sm text-green-400 mt-1">
                  ✓ Parsed as: {parseMonthInput(monthInput)}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ startDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ endDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}