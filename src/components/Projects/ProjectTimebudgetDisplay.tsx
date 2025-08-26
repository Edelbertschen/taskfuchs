import React, { useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';

interface ProjectTimebudgetDisplayProps {
  project: Column;
  className?: string;
}

export function ProjectTimebudgetDisplay({ project, className = '' }: ProjectTimebudgetDisplayProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Calculate budget and tracked time for current month
  const timebudgetInfo = useMemo(() => {
    if (!project.timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[currentMonth]) {
      return null;
    }
    
    const monthData = project.timebudget.yearlyBudgets[currentYear].monthlyBudgets[currentMonth];
    const budgetedHours = monthData.budgetedHours || 0;
    const manualTrackedHours = monthData.trackedHours || 0;
    
    // Calculate auto-tracked hours from completed tasks this month
    const autoTrackedHours = state.tasks
      .filter(task => {
        if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
          return false;
        }
        
        const completedDate = new Date(task.completedAt);
        return completedDate.getFullYear() === currentYear && 
               completedDate.getMonth() + 1 === currentMonth;
      })
      .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0); // Convert minutes to hours
    
    const totalTrackedHours = manualTrackedHours + autoTrackedHours;
    const remainingHours = Math.max(0, budgetedHours - totalTrackedHours);
    const progressPercent = budgetedHours > 0 ? (totalTrackedHours / budgetedHours) * 100 : 0;
    
    return {
      budgetedHours,
      totalTrackedHours,
      remainingHours,
      progressPercent,
      isOverBudget: totalTrackedHours > budgetedHours,
      isOnTrack: progressPercent >= 80 && progressPercent <= 100,
      isUnderBudget: progressPercent < 80
    };
  }, [project, state.tasks, currentMonth, currentYear]);
  
  // Don't render if no timebudget is configured for current month
  if (!timebudgetInfo || timebudgetInfo.budgetedHours === 0) {
    return null;
  }
  
  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) {
      return `${m}${t('timebudget.minutes_short')}`;
    }
    if (m === 0) {
      return `${h}${t('timebudget.hours_short')}`;
    }
    return `${h}${t('timebudget.hours_short')} ${m}${t('timebudget.minutes_short')}`;
  };
  
  const getStatusIcon = () => {
    if (timebudgetInfo.isOverBudget) {
      return <TrendingUp className="w-3 h-3 text-red-500" />;
    }
    if (timebudgetInfo.isOnTrack) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    }
    return <Minus className="w-3 h-3 text-orange-500" />;
  };
  
  const getStatusColor = () => {
    if (timebudgetInfo.isOverBudget) return 'text-red-600 dark:text-red-400';
    if (timebudgetInfo.isOnTrack) return 'text-green-600 dark:text-green-400';
    return 'text-orange-600 dark:text-orange-400';
  };
  
  const accentColor = state.preferences.accentColor;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      
      <div className="text-xs space-x-1">
        {/* Used / Budget */}
        <span className={`font-medium ${getStatusColor()}`}>
          {formatHours(timebudgetInfo.totalTrackedHours)}
        </span>
        <span className="text-gray-400 dark:text-gray-500">/</span>
        <span className="text-gray-600 dark:text-gray-400">
          {formatHours(timebudgetInfo.budgetedHours)}
        </span>
      </div>
      
      {/* Status Icon */}
      {getStatusIcon()}
      
      {/* Progress Percentage */}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {Math.round(timebudgetInfo.progressPercent)}%
      </span>
      
      {/* Mini Progress Bar */}
      <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${Math.min(100, timebudgetInfo.progressPercent)}%`,
            backgroundColor: timebudgetInfo.isOverBudget 
              ? '#ef4444' 
              : timebudgetInfo.isOnTrack 
                ? '#10b981'
                : '#f59e0b'
          }}
        />
      </div>
      
      {/* Remaining time (only if under budget) */}
      {!timebudgetInfo.isOverBudget && timebudgetInfo.remainingHours > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({formatHours(timebudgetInfo.remainingHours)} {t('timebudget.remaining')})
        </span>
      )}
    </div>
  );
} 