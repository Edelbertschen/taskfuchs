import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
  Settings
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ProjectTimebudgetModal } from './ProjectTimebudgetModal';

interface ProjectTimebudgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Column;
}

export function ProjectTimebudgetDetailModal({ isOpen, onClose, project }: ProjectTimebudgetDetailModalProps) {
  const { state } = useApp();
  const { t, i18n } = useTranslation();
  
  const [showEditModal, setShowEditModal] = React.useState(false);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const accentColor = state.preferences.accentColor;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Calculate comprehensive timebudget info
  const timebudgetInfo = useMemo(() => {
    if (!project.timebudget) {
      return null;
    }
    
    const currentMonthData = project.timebudget.yearlyBudgets[currentYear]?.monthlyBudgets[currentMonth];
    const yearData = project.timebudget.yearlyBudgets[currentYear];
    
    // Calculate remaining hours for all project tasks (estimated - tracked time)
    const allProjectTasks = state.tasks.filter(task => 
      task.projectId === project.id && !task.completed
    );
    
    const calculateRemainingTime = (task: any) => {
      const taskEstimated = task.estimatedTime || 0;
      const taskTracked = task.trackedTime || 0;
      const subtaskEstimated = task.subtasks?.reduce((sum: number, st: any) => 
        sum + (st.estimatedTime || 0), 0) || 0;
      const subtaskTracked = task.subtasks?.reduce((sum: number, st: any) => 
        sum + (st.trackedTime || 0), 0) || 0;
      
      const totalEstimated = taskEstimated + subtaskEstimated;
      const totalTracked = taskTracked + subtaskTracked;
      
      return Math.max(0, totalEstimated - totalTracked);
    };
    
    // Year planned hours - sum of remaining times for all incomplete project tasks
    const yearPlannedHours = allProjectTasks
      .reduce((total, task) => total + calculateRemainingTime(task), 0) / 60; // Convert to hours

    // Current month calculations
    const currentMonthBudget = currentMonthData?.budgetedHours || 0;
    const currentMonthManualTracked = currentMonthData?.trackedHours || 0;
    
    const currentMonthAutoTracked = state.tasks
      .filter(task => {
        if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
          return false;
        }
        
        const completedDate = new Date(task.completedAt);
        return completedDate.getFullYear() === currentYear && 
               completedDate.getMonth() + 1 === currentMonth;
      })
      .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
    
    const currentMonthTotal = currentMonthManualTracked + currentMonthAutoTracked;
    
    // Year calculations
    let yearBudgeted = 0;
    let yearTracked = 0;
    
    if (yearData) {
      for (let month = 1; month <= 12; month++) {
        const monthData = yearData.monthlyBudgets[month];
        if (monthData) {
          yearBudgeted += monthData.budgetedHours || 0;
          yearTracked += monthData.trackedHours || 0;
          
          // Add auto-tracked for each month
          const autoTracked = state.tasks
            .filter(task => {
              if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
                return false;
              }
              
              const completedDate = new Date(task.completedAt);
              return completedDate.getFullYear() === currentYear && 
                     completedDate.getMonth() + 1 === month;
            })
            .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
          
          yearTracked += autoTracked;
        }
      }
    }
    
    return {
      currentMonth: {
        budget: currentMonthBudget,
        tracked: currentMonthTotal,
        remaining: Math.max(0, currentMonthBudget - currentMonthTotal),
        progress: currentMonthBudget > 0 ? (currentMonthTotal / currentMonthBudget) * 100 : 0
      },
      year: {
        budget: yearBudgeted,
        tracked: yearTracked,
        planned: yearPlannedHours,
        remaining: Math.max(0, yearBudgeted - yearTracked - yearPlannedHours),
        progress: yearBudgeted > 0 ? (yearTracked / yearBudgeted) * 100 : 0
      }
    };
  }, [project, state.tasks, state.columns, currentMonth, currentYear]);
  
  if (!isOpen || !timebudgetInfo) return null;
  
  const formatHours = (hours: number): string => {
    // Korrigiere kleine Rundungsfehler bei der Addition von Dezimalzahlen
    // Wenn sehr nah an einer ganzen Stunde, runde zur nächsten ganzen Stunde
    const tolerance = 0.75; // 45 Minuten Toleranz für Rundungsfehler
    const roundedToNearestHour = Math.round(hours);
    
    if (Math.abs(hours - roundedToNearestHour) < tolerance) {
      // Sehr nah an einer ganzen Stunde - zeige als ganze Stunde
      return `${roundedToNearestHour}${t('timebudget.hours_short')}`;
    }
    
    // Standard-Formatierung für alle anderen Fälle
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h === 0) {
      return `${m}${t('timebudget.minutes_short')}`;
    }
    if (m === 0) {
      return `${h}${t('timebudget.hours_short')}`;
    }
    return `${h}${t('timebudget.hours_short')} ${m}${t('timebudget.minutes_short')}`;
  };
  
  const getStatusColor = (progress: number) => {
    if (progress > 100) return '#ef4444'; // Rot für Überschreitung
    if (progress >= 80) return '#10b981'; // Grün für 80-100%
    return '#f59e0b'; // Orange für unter 80%
  };

  const getStatusColorWithOpacity = (progress: number, opacity: number = 0.1) => {
    const color = getStatusColor(progress);
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  };

  // Neue Funktion für Yearly Progress Färbung basierend auf Expected vs Actual
  const getYearlyProgressColor = (actualProgress: number, expectedProgress: number) => {
    const tolerance = 10; // 10% Toleranz
    
    if (actualProgress < expectedProgress - tolerance) {
      return '#f59e0b'; // Orange: Unter Expected -10%
    } else if (actualProgress <= expectedProgress + tolerance) {
      return '#10b981'; // Grün: ±10% um Expected
    } else {
      return '#ef4444'; // Rot: Über Expected +10%
    }
  };

  // Berechne erwartete Position im Jahr (basierend auf aktuellem Datum)
  const calculateExpectedYearPosition = (yearBudget: number) => {
    const now = new Date();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    const daysPassed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const expectedProgress = (daysPassed / totalDays) * 100;
    const expectedHours = (expectedProgress / 100) * yearBudget;
    
    return {
      expectedProgress: Math.min(100, expectedProgress),
      expectedHours: Math.max(0, expectedHours)
    };
  };

  const yearExpected = calculateExpectedYearPosition(timebudgetInfo.year.budget);
  
  const getMonthName = () => {
    const date = new Date(currentYear, currentMonth - 1, 1);
    return format(date, 'MMMM yyyy', { locale: i18n.language === 'de' ? de : undefined });
  };
  
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] modal-backdrop"
      style={{ 
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('timebudget.project_timebudget')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {project.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowEditModal(true);
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title={t('actions.edit')}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Current Month Overview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {getMonthName()}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
                  <div className="text-lg font-bold mb-1" style={{ color: `${accentColor}AA` }}>
                    {formatHours(timebudgetInfo.currentMonth.budget)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.budgeted_hours')}
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
                  <div 
                    className="text-lg font-bold mb-1"
                    style={{ color: getStatusColor(timebudgetInfo.currentMonth.progress) }}
                  >
                    {formatHours(timebudgetInfo.currentMonth.tracked)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.used_hours')}
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
                  <div className={`text-lg font-bold mb-1 ${
                    timebudgetInfo.currentMonth.remaining < 0 
                      ? 'text-red-600' 
                      : 'text-orange-600'
                  }`}>
                    {formatHours(Math.abs(timebudgetInfo.currentMonth.remaining))}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {timebudgetInfo.currentMonth.remaining < 0 
                      ? t('timebudget.over_budget') 
                      : t('timebudget.remaining_hours')
                    }
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
                  <div 
                    className={`text-lg font-bold mb-1 ${
                      timebudgetInfo.currentMonth.progress > 100 ? 'animate-pulse' : ''
                    }`}
                    style={{ color: getStatusColor(timebudgetInfo.currentMonth.progress) }}
                  >
                    {Math.round(timebudgetInfo.currentMonth.progress)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.progress_percent')}
                  </div>
                </div>
              </div>
              
              {/* Kompakte Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.current_month_progress')}
                  </span>
                  <span 
                    className={`text-xs font-bold ${
                      timebudgetInfo.currentMonth.progress > 100 ? 'animate-pulse' : ''
                    }`}
                    style={{ color: getStatusColor(timebudgetInfo.currentMonth.progress) }}
                  >
                    {Math.round(timebudgetInfo.currentMonth.progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500 ease-out relative"
                    style={{
                      width: `${Math.min(100, timebudgetInfo.currentMonth.progress)}%`,
                      backgroundColor: getStatusColor(timebudgetInfo.currentMonth.progress),
                      animation: timebudgetInfo.currentMonth.progress > 100 ? 'pulse 2s infinite' : 'none'
                    }}
                  >
                    {timebudgetInfo.currentMonth.progress > 100 && (
                      <div className="absolute top-0 right-0 w-0.5 h-full bg-red-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Year Overview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('timebudget.yearly_overview')} {currentYear}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600">
                  <div className="text-lg font-bold mb-1 text-gray-800 dark:text-gray-200">
                    {formatHours(timebudgetInfo.year.budget)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.budgeted_hours')}
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600">
                  <div className="text-lg font-bold mb-1 text-gray-800 dark:text-gray-200">
                    {formatHours(timebudgetInfo.year.tracked)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.used_hours')}
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600">
                  <div className="text-lg font-bold mb-1" style={{ color: accentColor }}>
                    {formatHours(timebudgetInfo.year.planned)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.planned_hours')}
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600">
                  <div className={`text-lg font-bold mb-1 ${
                    timebudgetInfo.year.remaining < 0 
                      ? 'text-red-600' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {formatHours(Math.abs(timebudgetInfo.year.remaining))}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {timebudgetInfo.year.remaining < 0 
                      ? t('timebudget.over_budget') 
                      : t('timebudget.remaining_hours')
                    }
                  </div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600">
                  <div 
                    className={`text-lg font-bold mb-1 ${
                      timebudgetInfo.year.progress > 100 ? 'animate-pulse' : ''
                    }`}
                    style={{ color: getYearlyProgressColor(timebudgetInfo.year.progress, yearExpected.expectedProgress) }}
                  >
                    {Math.round(timebudgetInfo.year.progress)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.progress_percent')}
                  </div>
                </div>
              </div>
              
              {/* Erweiterte Yearly Progress Bar mit erwarteter Position */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('timebudget.yearly_progress')} - {t('timebudget.expected_vs_actual')}
                  </span>
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-gray-500">
                      {t('timebudget.expected_label')}: {Math.round(yearExpected.expectedProgress)}%
                    </span>
                    <span 
                      className={`font-bold ${
                        timebudgetInfo.year.progress > 100 ? 'animate-pulse' : ''
                      }`}
                      style={{ color: getYearlyProgressColor(timebudgetInfo.year.progress, yearExpected.expectedProgress) }}
                    >
                      {t('timebudget.actual_label')}: {Math.round(timebudgetInfo.year.progress)}%
                    </span>
                  </div>
                </div>
                
                {/* Relativer Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    {/* Erwarteter Progress (hellere Hintergrundfarbe) */}
                    <div
                      className="absolute top-0 left-0 h-3 bg-gray-400 dark:bg-gray-500 rounded-full opacity-50"
                      style={{
                        width: `${Math.min(100, yearExpected.expectedProgress)}%`,
                      }}
                    />
                    
                    {/* Tatsächlicher Progress */}
                    <div
                      className="absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, timebudgetInfo.year.progress)}%`,
                        backgroundColor: getYearlyProgressColor(timebudgetInfo.year.progress, yearExpected.expectedProgress),
                        animation: timebudgetInfo.year.progress > 100 ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      {timebudgetInfo.year.progress > 100 && (
                        <div className="absolute top-0 right-0 w-0.5 h-full bg-red-400 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Markierung für erwartete Position */}
                    {yearExpected.expectedProgress > 0 && yearExpected.expectedProgress < 100 && (
                      <div
                        className="absolute top-0 w-0.5 h-3 bg-gray-600 dark:bg-gray-300"
                        style={{
                          left: `${yearExpected.expectedProgress}%`,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Erweiterte Legende */}
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-gray-400 opacity-50 rounded-sm"></div>
                          <span>{t('timebudget.expected_progress')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: getYearlyProgressColor(timebudgetInfo.year.progress, yearExpected.expectedProgress) }}></div>
                          <span>{t('timebudget.actual_progress')}</span>
                        </div>
                      </div>
                      <span>
                        {formatHours(yearExpected.expectedHours)} / {formatHours(timebudgetInfo.year.tracked)} {t('timebudget.of_total')} {formatHours(timebudgetInfo.year.budget)}
                      </span>
                    </div>
                    
                    {/* Färbungslogik Legende */}
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>&lt;-10%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>±10%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>&gt;+10%</span>
                      </div>
                      <span className="text-gray-400 italic">vs {t('timebudget.expected_label')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Progress Chart */}
              <div className="mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('timebudget.monthly_breakdown')}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = index + 1;
                    const monthData = project.timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[month];
                    const monthBudget = monthData?.budgetedHours || 0;
                    const monthManualTracked = monthData?.trackedHours || 0;
                    
                    // Calculate auto-tracked for this month
                    const monthAutoTracked = state.tasks
                      .filter(task => {
                        if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
                          return false;
                        }
                        
                        const completedDate = new Date(task.completedAt);
                        return completedDate.getFullYear() === currentYear && 
                               completedDate.getMonth() + 1 === month;
                      })
                      .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
                    
                    const monthTotal = monthManualTracked + monthAutoTracked;
                    // KORREKTUR: Keine Begrenzung auf 100% für korrekte Überschreitungsanzeige
                    const monthProgress = monthBudget > 0 ? (monthTotal / monthBudget) * 100 : 0;
                    const isCurrentMonth = month === currentMonth;
                    
                    const monthNames = i18n.language === 'de' 
                      ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
                      : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                    
                    return (
                      <div key={month} className="flex flex-col items-center">
                        {/* Month Label */}
                        <div className={`text-xs mb-1 transition-colors ${
                          isCurrentMonth 
                            ? 'font-bold text-gray-900 dark:text-white' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {monthNames[index]}
                        </div>
                        
                        {/* Kompakte Progress Bar */}
                        <div 
                          className={`w-full h-8 rounded-md relative overflow-hidden transition-all duration-300 ${
                            isCurrentMonth 
                              ? 'ring-1 shadow-md transform scale-105' 
                              : 'shadow-sm hover:shadow-md'
                          }`}
                          style={{
                            backgroundColor: monthBudget > 0 ? '#f3f4f6' : '#e5e7eb',
                            ...(isCurrentMonth ? {
                              ringColor: `${accentColor}80`,
                              backgroundColor: `${accentColor}08`
                            } : {})
                          }}
                          title={`${monthNames[index]} ${currentYear}: ${formatHours(monthTotal)} / ${formatHours(monthBudget)} (${Math.round(monthProgress)}%)`}
                        >
                          {monthBudget > 0 && (
                            <div
                              className="absolute bottom-0 left-0 w-full transition-all duration-500 ease-out rounded-lg"
                              style={{
                                // Maximale Höhe 100%, aber visueller Indikator für Überschreitung
                                height: `${Math.min(100, monthProgress)}%`,
                                backgroundColor: getStatusColor(monthProgress),
                                minHeight: monthProgress > 0 ? '3px' : '0px',
                                // Gradient-Effekt für bessere Optik
                                background: monthProgress > 100
                                  ? `linear-gradient(180deg, ${getStatusColor(monthProgress)}CC, ${getStatusColor(monthProgress)})`
                                  : getStatusColor(monthProgress),
                                // Pulsing-Effekt für Überschreitungen
                                animation: monthProgress > 100 ? 'pulse 2s infinite' : 'none'
                              }}
                            />
                          )}
                          
                          {/* Überschreitungs-Indikator */}
                          {monthProgress > 100 && (
                            <div 
                              className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"
                              style={{
                                boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                              }}
                            />
                          )}
                          
                          {/* Current month highlight */}
                          {isCurrentMonth && (
                            <div 
                              className="absolute top-0 left-0 w-full h-0.5 opacity-80"
                              style={{ backgroundColor: accentColor }}
                            />
                          )}
                        </div>
                        
                        {/* Progress Percentage - Verbesserte Typografie */}
                        <div className={`text-xs mt-1 font-medium transition-colors ${
                          monthBudget === 0 
                            ? 'text-gray-400 dark:text-gray-500' 
                            : monthProgress > 100
                            ? 'text-red-600 font-bold animate-pulse'
                            : monthProgress >= 80
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {monthBudget === 0 ? '—' : `${Math.round(monthProgress)}%`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Kompakte Legende */}
                <div className="flex items-center justify-center space-x-3 mt-2 p-1.5 bg-gray-50 dark:bg-gray-800/30 rounded border">
                  <div className="flex items-center space-x-1 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">80-100%</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">&lt;80%</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 dark:text-gray-300">&gt;100%</span>
                  </div>
                </div>
              </div>
            </div>



            {/* Status Information - in Akzentfarbe */}
            <div className="rounded-lg p-3 border-2" style={{ 
              backgroundColor: `${accentColor}15`, 
              borderColor: `${accentColor}40` 
            }}>
              <div className="flex items-center space-x-2 text-sm" style={{ color: accentColor }}>
                <Clock className="w-4 h-4" />
                <span>{t('timebudget.last_updated')}: </span>
                <span className="font-semibold">
                  {project.timebudget?.updatedAt ? 
                    format(new Date(project.timebudget.updatedAt), 'PPp', { 
                      locale: i18n.language === 'de' ? de : undefined 
                    }) : 
                    t('timebudget.never')
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {t('actions.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      
      {/* Edit Modal */}
      {showEditModal && (
        <ProjectTimebudgetModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          project={project}
        />
      )}
    </>
  );
} 