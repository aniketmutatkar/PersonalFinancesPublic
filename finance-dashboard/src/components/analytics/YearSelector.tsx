// src/components/analytics/YearSelector.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface YearSelectorProps {
  availableYears: number[];
  selectedYears: number[];
  onChange: (years: number[]) => void;
}

export default function YearSelector({ availableYears, selectedYears, onChange }: YearSelectorProps) {
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

  const handleYearToggle = (year: number) => {
    if (selectedYears.includes(year)) {
      // Remove year
      onChange(selectedYears.filter(y => y !== year));
    } else {
      // Add year
      onChange([...selectedYears, year].sort((a, b) => b - a)); // Sort descending
    }
  };

  const handleSelectAll = () => {
    onChange([...availableYears]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Prevent auto-reselect when clearing
  React.useEffect(() => {
    // Only auto-select if we have years and no manual selection has been made
    if (availableYears.length > 0 && selectedYears.length === 0) {
      // Add a small delay to prevent auto-select after clear
      const timer = setTimeout(() => {
        onChange([...availableYears]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [availableYears.length]); // Remove selectedYears.length dependency

  const getDisplayText = () => {
    if (selectedYears.length === 0) {
      return 'Select Years';
    }
    if (selectedYears.length === availableYears.length) {
      return 'All Years';
    }
    if (selectedYears.length <= 2) {
      return selectedYears.sort((a, b) => b - a).join(', ');
    }
    return `${selectedYears.length} Years Selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors"
      >
        <span className="text-lg">{getDisplayText()}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Header with select all/clear all */}
          <div className="p-3 border-b border-gray-600 flex justify-between">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Year options */}
          {availableYears.map((year) => (
            <div
              key={year}
              onClick={() => handleYearToggle(year)}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-600 cursor-pointer transition-colors"
            >
              <span className="text-white text-lg">{year}</span>
              {selectedYears.includes(year) && (
                <Check className="w-5 h-5 text-green-400" />
              )}
            </div>
          ))}

          {availableYears.length === 0 && (
            <div className="px-4 py-3 text-gray-400 text-center">
              No years available
            </div>
          )}
        </div>
      )}

      {/* Selected years pills */}
      {selectedYears.length > 0 && selectedYears.length <= 3 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedYears.sort((a, b) => b - a).map((year) => (
            <div
              key={year}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
            >
              <span>{year}</span>
              <button
                onClick={() => handleYearToggle(year)}
                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}