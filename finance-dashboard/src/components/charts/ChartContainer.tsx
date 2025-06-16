import React from 'react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'standard' | 'large' | 'compact';
  className?: string;
  headerAction?: React.ReactNode; // For buttons, dropdowns, etc.
}

export default function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  variant = 'standard',
  className = '',
  headerAction
}: ChartContainerProps) {
  
  // Get container class based on variant - DESIGN SYSTEM
  const getContainerClass = () => {
    switch (variant) {
      case 'large':
        return 'card-spacious h-full';
      case 'compact':
        return 'card-compact h-full';
      default:
        return 'card-standard h-full';
    }
  };

  return (
    <div className={`${getContainerClass()} ${className} flex flex-col`}>
      {/* Header Section - DESIGN SYSTEM */}
      <div className="flex items-center justify-between content-gap flex-shrink-0">
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {headerAction && (
          <div className="flex-shrink-0">
            {headerAction}
          </div>
        )}
      </div>
      
      {/* Chart Content - DESIGN SYSTEM */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}