import React from 'react';
import { useApp } from '../../context/AppContext';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message = 'Lädt...', size = 'md' }: LoadingSpinnerProps) {
  const { state } = useApp();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div 
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-2 ${sizeClasses[size]}`}
        style={{ borderTopColor: state.preferences.accentColor }}
      />
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
        {message}
      </p>
    </div>
  );
} 