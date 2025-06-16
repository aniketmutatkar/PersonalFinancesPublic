import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`flex justify-between items-end section-gap ${className}`}>
      <div className="flex-1">
        {/* Universal Page Title - DESIGN SYSTEM */}
        <h1 className="page-title">{title}</h1>
        
        {/* Universal Page Subtitle - DESIGN SYSTEM */}
        {subtitle && (
          <p className="page-subtitle">{subtitle}</p>
        )}
      </div>
      
      {/* Actions Section (dropdowns, buttons, etc.) - DESIGN SYSTEM */}
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}