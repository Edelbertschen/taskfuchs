import React, { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';
import { ProjectTimebudgetDetailModal } from './ProjectTimebudgetDetailModal';

interface ProjectTimebudgetHeaderProps {
  project: Column;
  className?: string;
}

export function ProjectTimebudgetHeader({ project, className = '' }: ProjectTimebudgetHeaderProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Calculate current month budget info
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
  
  const getStatusColor = () => {
    if (timebudgetInfo.isOverBudget) return '#ef4444';
    if (timebudgetInfo.isOnTrack) return '#10b981';
    return '#f59e0b';
  };
  
  const accentColor = state.preferences.accentColor;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  return (
    <>
      <button
        onClick={() => setShowDetailModal(true)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          isMinimalDesign 
            ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            : 'bg-black/10 hover:bg-black/20 backdrop-blur-sm'
        } ${className}`}
        title={t('timebudget.project_timebudget')}
      >
        <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        
        <div className="flex items-center space-x-1 text-sm">
          {/* Used / Budget */}
          <span 
            className="font-semibold"
            style={{ color: getStatusColor() }}
          >
            {formatHours(timebudgetInfo.totalTrackedHours)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {formatHours(timebudgetInfo.budgetedHours)}
          </span>
        </div>
        
        {/* Progress Percentage */}
        <span 
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{
            color: getStatusColor(),
            backgroundColor: `${getStatusColor()}20`
          }}
        >
          {Math.round(timebudgetInfo.progressPercent)}%
        </span>
        
        {/* Mini Progress Bar */}
        <div className="w-6 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.min(100, timebudgetInfo.progressPercent)}%`,
              backgroundColor: getStatusColor()
            }}
          />
        </div>
      </button>

      {/* Detail Modal */}
      {showDetailModal && (
        <ProjectTimebudgetDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          project={project}
        />
      )}
    </>
  );
} 