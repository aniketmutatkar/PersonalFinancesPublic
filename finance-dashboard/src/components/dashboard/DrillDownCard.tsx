// src/components/dashboard/DrillDownCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface DrillDownCardProps {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  metrics: {
    primary: string;
    secondary?: string;
    trend?: {
      value: string;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

function DrillDownCard({ 
  title, 
  description, 
  to, 
  icon: Icon, 
  metrics,
  color = 'blue' 
}: DrillDownCardProps) {
  const colorClasses = {
    blue: {
      border: "border-blue-500/30",
      background: "bg-blue-900/10",
      icon: "text-blue-400",
      hover: "hover:bg-blue-900/20",
      primary: "text-blue-400"
    },
    green: {
      border: "border-green-500/30",
      background: "bg-green-900/10", 
      icon: "text-green-400",
      hover: "hover:bg-green-900/20",
      primary: "text-green-400"
    },
    purple: {
      border: "border-purple-500/30",
      background: "bg-purple-900/10",
      icon: "text-purple-400", 
      hover: "hover:bg-purple-900/20",
      primary: "text-purple-400"
    },
    orange: {
      border: "border-orange-500/30",
      background: "bg-orange-900/10",
      icon: "text-orange-400",
      hover: "hover:bg-orange-900/20", 
      primary: "text-orange-400"
    }
  };

  const colors = colorClasses[color];

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';  
      default: return 'text-gray-400';
    }
  };

  return (
    <Link 
      to={to}
      className={`
        block border rounded-lg p-6 transition-all duration-200 
        hover:scale-[1.02] group cursor-pointer
        ${colors.border} ${colors.background} ${colors.hover}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 ${colors.icon}`} />
          <div>
            <h3 className="font-semibold text-white text-base group-hover:text-gray-100">
              {title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div>
          <div className={`text-xl font-bold ${colors.primary}`}>
            {metrics.primary}
          </div>
          {metrics.secondary && (
            <div className="text-sm text-gray-300 mt-1">
              {metrics.secondary}
            </div>
          )}
        </div>

        {/* Trend */}
        {metrics.trend && (
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${getTrendColor(metrics.trend.direction)}`}>
              {getTrendIcon(metrics.trend.direction)} {metrics.trend.value}
            </span>
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="mt-4 pt-3 border-t border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-400">Click to explore →</span>
      </div>
    </Link>
  );
}

export default DrillDownCard;