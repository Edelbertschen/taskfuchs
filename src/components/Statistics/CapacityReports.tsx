import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  BarChart3,
  Calendar
} from 'lucide-react';

interface CapacityReportsProps {
  className?: string;
}

export function CapacityReports({ className = '' }: CapacityReportsProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const accentColor = state.preferences.accentColor;
  
  // Calculate capacity utilization
  const capacityData = useMemo(() => {
    if (!state.personalCapacity || !state.personalCapacity.yearlyCapacities) return null;
    
    const yearData = state.personalCapacity.yearlyCapacities[currentYear];
    if (!yearData) return null;
    
    const currentMonthData = yearData.monthlyCapacities[currentMonth];
    if (!currentMonthData) return null;
    
    const availableHours = currentMonthData.plannedHours;
    if (availableHours === 0) return null;
    
    // Calculate allocated hours from project timebudgets
    const projectAllocatedHours = state.columns
      .filter(col => col.type === 'project' && col.timebudget)
      .reduce((total, project) => {
        const projectBudget = project.timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[currentMonth]?.budgetedHours || 0;
        return total + projectBudget;
      }, 0);
    
    // Calculate tracked hours from completed tasks this month
    const trackedHours = state.tasks
      .filter(task => {
        if (!task.trackedTime || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        return completedDate.getFullYear() === currentYear && 
               completedDate.getMonth() + 1 === currentMonth;
      })
      .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0); // Convert minutes to hours
    
    const remainingHours = Math.max(0, availableHours - projectAllocatedHours);
    const utilizationPercent = (projectAllocatedHours / availableHours) * 100;
    const actualUtilizationPercent = (trackedHours / availableHours) * 100;
    
    // Yearly calculations
    let yearlyAvailable = 0;
    let yearlyAllocated = 0;
    let yearlyTracked = 0;
    
    for (let month = 1; month <= 12; month++) {
      const monthCapacity = yearData.monthlyCapacities[month]?.plannedHours || 0;
      yearlyAvailable += monthCapacity;
      
      // Calculate allocated per month
      const monthAllocated = state.columns
        .filter(col => col.type === 'project' && col.timebudget)
        .reduce((total, project) => {
          const projectBudget = project.timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[month]?.budgetedHours || 0;
          return total + projectBudget;
        }, 0);
      yearlyAllocated += monthAllocated;
      
      // Calculate tracked per month
      const monthTracked = state.tasks
        .filter(task => {
          if (!task.trackedTime || !task.completedAt) return false;
          const completedDate = new Date(task.completedAt);
          return completedDate.getFullYear() === currentYear && 
                 completedDate.getMonth() + 1 === month;
        })
        .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
      yearlyTracked += monthTracked;
    }
    
    const yearlyUtilizationPercent = yearlyAvailable > 0 ? (yearlyAllocated / yearlyAvailable) * 100 : 0;
    const yearlyActualUtilizationPercent = yearlyAvailable > 0 ? (yearlyTracked / yearlyAvailable) * 100 : 0;
    
    return {
      month: {
        available: availableHours,
        allocated: projectAllocatedHours,
        tracked: trackedHours,
        remaining: remainingHours,
        utilization: utilizationPercent,
        actualUtilization: actualUtilizationPercent
      },
      year: {
        available: yearlyAvailable,
        allocated: yearlyAllocated,
        tracked: yearlyTracked,
        remaining: Math.max(0, yearlyAvailable - yearlyAllocated),
        utilization: yearlyUtilizationPercent,
        actualUtilization: yearlyActualUtilizationPercent
      }
    };
  }, [state.personalCapacity, state.columns, state.tasks, currentMonth, currentYear]);
  
  if (!capacityData) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center ${className}`}>
        <User className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('capacity.capacity_overview')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('capacity.no_capacity_configured')}
        </p>
      </div>
    );
  }
  
  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) {
      return `${m}min`;
    }
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}min`;
  };
  
  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return '#ef4444'; // Over capacity - red
    if (utilization >= 80) return '#10b981'; // Well utilized - green
    if (utilization >= 60) return '#f59e0b'; // Good utilization - orange
    return '#6b7280'; // Under utilized - gray
  };
  
  const getUtilizationStatus = (utilization: number) => {
    if (utilization > 100) return t('capacity.over_capacity');
    if (utilization >= 80) return t('capacity.well_utilized');
    return t('capacity.under_utilized');
  };
  
  const getUtilizationIcon = (utilization: number) => {
    if (utilization > 100) return AlertTriangle;
    if (utilization >= 80) return TrendingUp;
    return TrendingDown;
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <User className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('capacity.capacity_overview')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('capacity.plan_vs_actual')}
          </p>
        </div>
      </div>

      {/* Current Month Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('capacity.month_capacity')} {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: accentColor }}>
              {formatHours(capacityData.month.available)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.available_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div 
              className="text-2xl font-bold"
              style={{ color: getUtilizationColor(capacityData.month.utilization) }}
            >
              {formatHours(capacityData.month.allocated)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.allocated_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatHours(capacityData.month.remaining)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.remaining_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div 
              className="text-2xl font-bold"
              style={{ color: getUtilizationColor(capacityData.month.utilization) }}
            >
              {Math.round(capacityData.month.utilization)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.utilization')}
            </div>
          </div>
        </div>

        {/* Month Utilization Status */}
        <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: `${getUtilizationColor(capacityData.month.utilization)}20` }}>
          <div className="flex items-center space-x-3">
            {React.createElement(getUtilizationIcon(capacityData.month.utilization), {
              className: "w-5 h-5",
              style: { color: getUtilizationColor(capacityData.month.utilization) }
            })}
            <span className="font-medium text-gray-900 dark:text-white">
              {getUtilizationStatus(capacityData.month.utilization)}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('capacity.actual_hours')}: {formatHours(capacityData.month.tracked)} ({Math.round(capacityData.month.actualUtilization)}%)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('capacity.planned_utilization')}</span>
            <span style={{ color: getUtilizationColor(capacityData.month.utilization) }}>
              {Math.round(capacityData.month.utilization)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, capacityData.month.utilization)}%`,
                backgroundColor: getUtilizationColor(capacityData.month.utilization)
              }}
            />
          </div>
        </div>
      </div>

      {/* Year Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('capacity.year_capacity')} {currentYear}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: accentColor }}>
              {formatHours(capacityData.year.available)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.available_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div 
              className="text-2xl font-bold"
              style={{ color: getUtilizationColor(capacityData.year.utilization) }}
            >
              {formatHours(capacityData.year.allocated)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.allocated_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatHours(capacityData.year.remaining)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.remaining_hours')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div 
              className="text-2xl font-bold"
              style={{ color: getUtilizationColor(capacityData.year.utilization) }}
            >
              {Math.round(capacityData.year.utilization)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity.utilization')}
            </div>
          </div>
        </div>

        {/* Year Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('capacity.yearly_utilization')}</span>
            <span style={{ color: getUtilizationColor(capacityData.year.utilization) }}>
              {Math.round(capacityData.year.utilization)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, capacityData.year.utilization)}%`,
                backgroundColor: getUtilizationColor(capacityData.year.utilization)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 