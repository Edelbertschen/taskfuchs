import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';

interface ProjectTimebudgetIconProps {
  project: Column;
  className?: string;
  onClick?: () => void;
}

export function ProjectTimebudgetIcon({ project, className = '', onClick }: ProjectTimebudgetIconProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Check if project has timebudget configured for current month
  const hasTimebudget = project.timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[currentMonth]?.budgetedHours > 0;
  
  const accentColor = state.preferences.accentColor;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent project selection
    if (onClick) {
      onClick();
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={`w-4 h-4 rounded-sm flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${className}`}
      style={{ 
        backgroundColor: hasTimebudget ? `${accentColor}20` : 'rgba(156, 163, 175, 0.2)',
        border: hasTimebudget ? `1px solid ${accentColor}40` : '1px solid rgba(156, 163, 175, 0.4)'
      }}
      title={hasTimebudget ? t('projects.timebudget.open') : t('projects.timebudget.create')}
    >
      <BarChart3 
        className="w-2.5 h-2.5" 
        style={{ color: hasTimebudget ? accentColor : '#9CA3AF' }} 
      />
    </button>
  );
} 