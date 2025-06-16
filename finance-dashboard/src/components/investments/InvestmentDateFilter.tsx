// src/components/investments/InvestmentDateFilter.tsx
import React, { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  start: string; // YYYY-MM format
  end: string;   // YYYY-MM format
}

interface InvestmentDateFilterProps {
  availableMonths: string[]; // Array of "YYYY-MM" strings
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export default function InvestmentDateFilter({ 
  availableMonths, 
  selectedRange, 
  onRangeChange 
}: InvestmentDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Create preset ranges
  const presetRanges = useMemo(() => {
    if (availableMonths.length === 0) return [];
    
    const sortedMonths = [...availableMonths].sort();
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const earliestMonth = sortedMonths[0];
    
    // Calculate 12 months ago from latest
    const latestDate = new Date(latestMonth + '-01');
    const twelveMonthsAgo = new Date(latestDate);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().slice(0, 7);
    
    // Calculate 6 months ago from latest
    const sixMonthsAgo = new Date(latestDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 7);

    return [
      {
        label: 'Last 6 Months',
        range: { start: sixMonthsAgoStr, end: latestMonth }
      },
      {
        label: 'Last 12 Months', 
        range: { start: twelveMonthsAgoStr, end: latestMonth }
      },
      {
        label: 'All Time',
        range: { start: earliestMonth, end: latestMonth }
      }
    ];
  }, [availableMonths]);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Get current range label
  const getCurrentRangeLabel = () => {
    const preset = presetRanges.find(p => 
      p.range.start === selectedRange.start && p.range.end === selectedRange.end
    );
    if (preset) return preset.label;
    
    return `${formatMonth(selectedRange.start)} - ${formatMonth(selectedRange.end)}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors"
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{getCurrentRangeLabel()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20">
          <div className="p-4">
            <h4 className="text-sm font-medium text-white mb-3">Date Range</h4>
            
            {/* Preset Ranges */}
            <div className="space-y-2 mb-4">
              {presetRanges.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onRangeChange(preset.range);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedRange.start === preset.range.start && selectedRange.end === preset.range.end
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div className="pt-3 border-t border-gray-700">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Month</label>
                  <select
                    value={selectedRange.start}
                    onChange={(e) => onRangeChange({ ...selectedRange, start: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Month</label>
                  <select
                    value={selectedRange.end}
                    onChange={(e) => onRangeChange({ ...selectedRange, end: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}