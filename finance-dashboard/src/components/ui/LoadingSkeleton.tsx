import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'metric' | 'list' | 'chart' | 'text' | 'table';
  lines?: number;
  rows?: number; // Add rows prop for table variant
  className?: string;
}

export default function LoadingSkeleton({ 
  variant = 'text', 
  lines = 3,
  rows = 5, // Default rows for table
  className = '' 
}: LoadingSkeletonProps) {
  
  const renderMetricSkeleton = () => (
    <div className={`card-standard ${className}`}>
      <div className="animate-pulse">
        <div className="loading-metric element-gap"></div>
        <div className="loading-text w-3/4 tight-gap"></div>
        <div className="loading-text w-1/2"></div>
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className={`card-standard ${className}`}>
      <div className="animate-pulse">
        <div className="loading-title content-gap w-1/3"></div>
        <div className="space-y-4">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="loading-text w-1/4"></div>
              <div className="loading-text w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChartSkeleton = () => (
    <div className={`card-standard ${className}`}>
      <div className="animate-pulse">
        <div className="loading-title content-gap w-1/3"></div>
        <div className="h-64 loading-skeleton rounded"></div>
      </div>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={`animate-pulse ${className}`}>
      {/* Table Header - DESIGN SYSTEM */}
      <div className="flex grid-tight element-gap p-4 border-b border-gray-700">
        <div className="loading-text w-20"></div>
        <div className="loading-text w-40"></div>
        <div className="loading-text w-24"></div>
        <div className="loading-text w-20"></div>
        <div className="loading-text w-16"></div>
      </div>
      
      {/* Table Rows - DESIGN SYSTEM */}
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex grid-tight items-center">
            <div className="loading-text w-20"></div>
            <div className="loading-text w-40"></div>
            <div className="loading-text w-24"></div>
            <div className="loading-text w-20"></div>
            <div className="loading-text w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTextSkeleton = () => (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div 
            key={i} 
            className={`loading-text ${
              i === lines - 1 ? 'w-2/3' : 'w-full'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );

  // Render based on variant - DESIGN SYSTEM APPROACH
  switch (variant) {
    case 'metric':
      return renderMetricSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'chart':
      return renderChartSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'text':
    default:
      return renderTextSkeleton();
  }
}