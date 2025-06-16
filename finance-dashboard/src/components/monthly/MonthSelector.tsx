// src/components/monthly/MonthSelector.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface MonthSelectorProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

export default function MonthSelector({ options, value, onChange }: MonthSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          appearance-none bg-gray-800 border border-gray-600 rounded-lg
          px-6 py-4 pr-12 text-white text-xl font-medium
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          hover:border-gray-500 transition-colors cursor-pointer
          min-w-[200px]
        "
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-800">
            {option.label}
          </option>
        ))}
      </select>
      
      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
}