// src/components/analytics/CategorySelector.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface CategorySelectorProps {
  availableCategories: Array<{ category: string; totalAmount: number }>;
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  maxSelection?: number;
}

export default function CategorySelector({ 
  availableCategories, 
  selectedCategories, 
  onChange,
  maxSelection = 8 
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      // Remove category
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      // Add category (respecting max selection)
      if (selectedCategories.length < maxSelection) {
        onChange([...selectedCategories, category]);
      }
    }
  };

  const handleSelectTop = (count: number) => {
    const topCategories = availableCategories.slice(0, count).map(c => c.category);
    onChange(topCategories);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedCategories.length === 0) {
      return 'Select Categories';
    }
    if (selectedCategories.length <= 2) {
      return selectedCategories.join(', ');
    }
    return `${selectedCategories.length} Categories Selected`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Selected categories pills - RIGHT TO LEFT ORDER */}
      {selectedCategories.length > 0 && selectedCategories.length <= 6 && (
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Reverse the order so newest selections appear closest to the button */}
          {[...selectedCategories].reverse().map((category) => (
            <div
              key={category}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-xs"
            >
              <span>{category}</span>
              <button
                onClick={() => handleCategoryToggle(category)}
                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown button - STAYS IN PLACE */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-72 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors"
        >
          <span className="text-sm">{getDisplayText()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* FIXED: Right-aligned dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Header with quick select options */}
            <div className="p-3 border-b border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Quick Select</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex gap-2">
                {[3, 5, 8].map(count => (
                  <button
                    key={count}
                    onClick={() => handleSelectTop(count)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Top {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Category options */}
            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2 px-2">
                {selectedCategories.length}/{maxSelection} selected • Sorted by total spending
              </div>
              {availableCategories.map(({ category, totalAmount }) => (
                <div
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                    selectedCategories.includes(category) 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : 'hover:bg-gray-600'
                  } ${
                    !selectedCategories.includes(category) && selectedCategories.length >= maxSelection
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <div className="flex-1">
                    <span className="text-white text-sm">{category}</span>
                    <div className="text-xs text-gray-400">{formatCurrency(totalAmount)}</div>
                  </div>
                  {selectedCategories.includes(category) && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                </div>
              ))}
            </div>

            {availableCategories.length === 0 && (
              <div className="px-4 py-6 text-gray-400 text-center text-sm">
                No categories available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}