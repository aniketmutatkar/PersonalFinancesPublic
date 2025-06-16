// src/components/ui/UniversalToggle.tsx
// Replaces: BudgetView toggle buttons, chart period selectors, view toggles

import React from 'react';

interface ToggleOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface UniversalToggleProps {
  // Core functionality
  options: ToggleOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  
  // Display options
  variant?: 'buttons' | 'pills' | 'segments';
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  
  // Styling
  className?: string;
  disabled?: boolean;
  
  // Advanced options
  allowDeselect?: boolean; // Allow clicking selected option to deselect
  fullWidth?: boolean;
}

export default function UniversalToggle({
  options,
  value,
  onChange,
  variant = 'segments',
  size = 'md',
  layout = 'horizontal',
  className = '',
  disabled = false,
  allowDeselect = false,
  fullWidth = false
}: UniversalToggleProps) {
  
  // Handle option click
  const handleClick = (optionValue: string | number) => {
    if (disabled) return;
    
    // If allow deselect and clicking current value, clear selection
    if (allowDeselect && value === optionValue) {
      onChange('');
    } else {
      onChange(optionValue);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // Layout classes
  const layoutClasses = {
    horizontal: 'flex',
    vertical: 'flex flex-col'
  };

  // VARIANT: BUTTONS (individual buttons with spacing)
  if (variant === 'buttons') {
    return (
      <div className={`
        ${layoutClasses[layout]} 
        ${layout === 'horizontal' ? 'space-x-2' : 'space-y-2'}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            disabled={disabled || option.disabled}
            className={`
              ${sizeClasses[size]} font-medium rounded transition-colors
              ${fullWidth ? 'flex-1' : ''}
              ${value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }
              ${disabled || option.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer'
              }
              flex items-center justify-center gap-2
            `}
          >
            {option.icon && <span>{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // VARIANT: PILLS (rounded individual buttons)
  if (variant === 'pills') {
    return (
      <div className={`
        ${layoutClasses[layout]} 
        ${layout === 'horizontal' ? 'space-x-2' : 'space-y-2'}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            disabled={disabled || option.disabled}
            className={`
              ${sizeClasses[size]} rounded-full transition-colors
              ${fullWidth ? 'flex-1' : ''}
              ${value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
              ${disabled || option.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer'
              }
              flex items-center justify-center gap-2
            `}
          >
            {option.icon && <span>{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // VARIANT: SEGMENTS (default - connected button group like BudgetView)
  return (
    <div className={`
      inline-flex bg-gray-800 rounded-lg p-1
      ${fullWidth ? 'w-full' : ''}
      ${disabled ? 'opacity-50' : ''}
      ${className}
    `}>
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          disabled={disabled || option.disabled}
          className={`
            ${sizeClasses[size]} font-medium rounded-md transition-colors
            ${fullWidth ? 'flex-1' : ''}
            ${value === option.value 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white'
            }
            ${disabled || option.disabled 
              ? 'cursor-not-allowed' 
              : 'cursor-pointer'
            }
            flex items-center justify-center gap-2
          `}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}