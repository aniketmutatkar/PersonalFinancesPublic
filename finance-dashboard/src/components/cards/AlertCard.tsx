// src/components/cards/AlertCard.tsx
import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { AlertFlag } from '../../types/api';

interface AlertCardProps {
  title: string;
  alerts: AlertFlag[];
  className?: string;
}

export default function AlertCard({ 
  title, 
  alerts, 
  className = '' 
}: AlertCardProps) {
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-blue-400';
    }
  };

  const getCardBackground = () => {
    const hasErrors = alerts.some(alert => alert.severity === 'error');
    const hasWarnings = alerts.some(alert => alert.severity === 'warning');
    
    if (hasErrors) {
      return 'bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-800/30';
    }
    if (hasWarnings) {
      return 'bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-800/30';
    }
    return 'bg-gray-800 border-gray-600';
  };

  return (
    <div className={`
      rounded-lg border p-10 transition-all duration-200 h-full flex flex-col
      ${getCardBackground()}
      ${className}
    `}>
      <div className="mb-4">
        <h3 className={`font-semibold text-base ${
          alerts.length > 0 ? 'text-red-400' : 'text-white'
        }`}>
          {title}
        </h3>
      </div>
      
      <div className="space-y-3 flex-1">
        {alerts.length === 0 ? (
          <div className="flex items-center space-x-2 text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm">All systems healthy</span>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.severity)}
              </div>
              <span className={`text-sm ${getAlertStyles(alert.severity)}`}>
                {alert.message}
              </span>
            </div>
          ))
        )}
      </div>
      
      {alerts.length > 3 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            +{alerts.length - 3} more alerts
          </span>
        </div>
      )}
    </div>
  );
}