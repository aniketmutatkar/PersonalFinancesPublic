// src/components/cards/InsightCard.tsx
import React from 'react';

interface CategoryItem {
  name: string;
  amount: number;
  trend?: string;
}

interface PatternItem {
  label: string;
  value: string;
  direction?: 'up' | 'down' | 'neutral';
}

interface InsightCardProps {
  title: string;
  type: 'categories' | 'patterns';
  data: CategoryItem[] | PatternItem[];
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function InsightCard({ 
  title, 
  type, 
  data, 
  className = '' 
}: InsightCardProps) {
  const renderCategories = (items: CategoryItem[]) => {
    return items.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
        <span className="text-gray-300 text-sm font-medium">{item.name}</span>
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold text-sm">
            {formatCurrency(item.amount)}
          </span>
          {item.trend && (
            <span className="text-xs text-gray-500">
              {item.trend}
            </span>
          )}
        </div>
      </div>
    ));
  };

  const renderPatterns = (items: PatternItem[]) => {
    return items.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-2">
        <span className="text-gray-400 text-sm">{item.label}</span>
        <div className="flex items-center space-x-1">
          <span className={`text-sm font-semibold ${
            item.direction === 'up' ? 'text-red-400' :
            item.direction === 'down' ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {item.direction === 'up' && '↑'}
            {item.direction === 'down' && '↓'}
            {item.direction === 'neutral' && '→'}
            {item.value}
          </span>
        </div>
      </div>
    ));
  };

  return (
    <div className={`
      bg-gray-800 border border-gray-600 rounded-lg p-10 h-full
      hover:border-gray-500 transition-all duration-200
      ${className}
    `}>
      <div className="mb-4">
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>
      
      <div className="space-y-2 h-full">
        {type === 'categories' && renderCategories(data as CategoryItem[])}
        {type === 'patterns' && renderPatterns(data as PatternItem[])}
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}