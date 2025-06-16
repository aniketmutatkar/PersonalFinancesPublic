// src/components/cards/MetricCard.tsx - ENHANCED VERSION - Better Typography & Layout
import React from 'react';

interface StatItem {
  label: string;
  value: string;
  variant?: 'positive' | 'negative' | 'neutral';
}

interface TrendInfo {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  isPositive?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendInfo;
  variant?: 'default' | 'hero' | 'accent' | 'warning' | 'success' | 'danger' | 'info';
  className?: string;
  chart?: React.ReactNode;
  stats?: StatItem[];
  indicator?: 'success' | 'warning' | 'danger' | 'info';
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  variant = 'default',
  className = '',
  chart,
  stats,
  indicator
}: MetricCardProps) {

  const getCardClass = () => {
    switch (variant) {
      case 'hero':
        return 'card-hero h-full';
      case 'success':
        return 'card-success h-full';
      case 'danger':
        return 'card-danger h-full';
      case 'warning':
        return 'card-warning h-full';
      case 'info':
        return 'card-info h-full';
      case 'accent':
        return 'card-elevated h-full';
      default:
        return 'card-elevated h-full';
    }
  };

  const getMetricClass = () => {
    switch (variant) {
      case 'hero':
        return 'text-4xl font-bold text-white leading-tight';
      default:
        return 'text-3xl font-bold text-white leading-tight';
    }
  };

  const getTrendClass = () => {
    if (!trend) return '';
    const isPositive = trend.isPositive !== undefined ? 
      trend.isPositive : 
      trend.direction === 'up';
    
    if (isPositive) return 'text-green-400';
    if (trend.direction === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  const getIndicatorClass = () => {
    if (!indicator) return '';
    switch (indicator) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`${getCardClass()} ${className} flex flex-col p-6`}>
      {/* Top Section: Status Indicator + Title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">
            {title}
          </h3>
        </div>
        {indicator && (
          <div className={`w-3 h-3 rounded-full ${getIndicatorClass()}`}></div>
        )}
      </div>

      {/* Main Value Section - Enhanced Typography */}
      <div className="flex-1 flex flex-col justify-center mb-4">
        <div className={`${getMetricClass()} mb-2`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {/* Subtitle with better spacing */}
        {subtitle && (
          <p className="text-gray-300 text-sm leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Mini Chart */}
        {chart && (
          <div className="mt-3 h-8">
            {chart}
          </div>
        )}
      </div>

      {/* Trend Section - Enhanced Design */}
      {trend && (
        <div className="flex items-center mt-auto pt-3 border-t border-gray-700/50">
          <div className={`flex items-center text-sm font-medium ${getTrendClass()}`}>
            <span className="mr-2 text-base">{getTrendIcon()}</span>
            <span>{trend.value}</span>
          </div>
        </div>
      )}

      {/* Stats Breakdown (for hero cards) */}
      {stats && stats.length > 0 && (
        <div className="mt-4 p-4 bg-black/20 rounded-lg grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-gray-400 mb-1">
                {stat.label}
              </div>
              <div className={`text-sm font-bold ${
                stat.variant === 'positive' ? 'text-green-400' :
                stat.variant === 'negative' ? 'text-red-400' : 
                'text-white'
              }`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}