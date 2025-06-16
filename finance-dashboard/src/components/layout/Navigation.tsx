import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Target, 
  Upload,
  DollarSign,
  Search,  // Transaction Explorer
  TrendingUp,  // Add TrendingUp icon for Year Analysis
  PiggyBank,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Main navigation items (data views)
const mainNavItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/monthly', icon: Calendar, label: 'Monthly' },
  { to: '/year-analysis', icon: TrendingUp, label: 'Year Analysis' },
  { to: '/budget', icon: Target, label: 'Budget' },
  { to: '/transactions', icon: Search, label: 'Transactions' },
  { to: '/investments', icon: PiggyBank, label: 'Investments' },
  { to: '/bank-statements', icon: Building2, label: 'Bank Statements' },
];

// Utility items (bottom section)
const utilityNavItems = [
  { to: '/upload', icon: Upload, label: 'Upload' },
];

export default function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <nav className={`${isCollapsed ? 'w-16' : 'w-48'} bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out`}>
      <div className="flex-1 p-4">
        {/* Header with collapse button - DESIGN SYSTEM */}
        <div className="flex items-center justify-between content-gap">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <DollarSign className="h-6 w-6 text-success" />
              <h1 className="text-lg font-bold text-primary">Finance Tracker</h1>
            </div>
          )}
          
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-gray-700 transition-colors focus-ring"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Main navigation items - DESIGN SYSTEM */}
        <ul className="space-y-1">
          {mainNavItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'space-x-2.5 px-3 py-2.5'} rounded-md transition-colors group relative ${
                    isActive
                      ? 'bg-info text-primary'
                      : 'text-secondary hover:bg-gray-700 hover:text-primary'
                  }`
                }
                title={isCollapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{label}</span>
                )}
                
                {/* Tooltip for collapsed state - DESIGN SYSTEM */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-primary text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Utility section at bottom - DESIGN SYSTEM */}
      <div className="p-4 border-t border-gray-700">
        <ul className="space-y-1">
          {utilityNavItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'space-x-2.5 px-3 py-2.5'} rounded-md transition-colors group relative ${
                    isActive
                      ? 'bg-info text-primary'
                      : 'text-secondary hover:bg-gray-700 hover:text-primary'
                  }`
                }
                title={isCollapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{label}</span>
                )}
                
                {/* Tooltip for collapsed state - DESIGN SYSTEM */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-primary text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}