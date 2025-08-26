import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Target,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Percent,
  DollarSign,
  Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Column } from '../../types';

interface TimebudgetReportsProps {
  className?: string;
}

interface ProjectBudgetSummary {
  project: Column;
  budgetedHours: number;
  trackedHours: number;
  remainingHours: number;
  progressPercent: number;
  status: 'over_budget' | 'on_track' | 'under_budget';
}

export function TimebudgetReports({ className = '' }: TimebudgetReportsProps) {
  const { state } = useApp();
  const { t, i18n } = useTranslation();
  
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const accentColor = state.preferences.accentColor;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Get projects with timebudgets
  const projectsWithBudgets = useMemo(() => {
    return state.columns
      .filter(col => col.type === 'project' && col.timebudget)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [state.columns]);
  
  // Calculate monthly summaries for all projects
  const monthlyProjectSummaries = useMemo((): ProjectBudgetSummary[] => {
    return projectsWithBudgets.map(project => {
      const timebudget = project.timebudget;
      if (!timebudget?.yearlyBudgets[currentYear]?.monthlyBudgets[currentMonth]) {
        return {
          project,
          budgetedHours: 0,
          trackedHours: 0,
          remainingHours: 0,
          progressPercent: 0,
          status: 'under_budget' as const
        };
      }
      
      const monthData = timebudget.yearlyBudgets[currentYear].monthlyBudgets[currentMonth];
      const budgetedHours = monthData.budgetedHours || 0;
      const manualTrackedHours = monthData.trackedHours || 0;
      
      // Calculate auto-tracked hours from completed tasks
      const autoTrackedHours = state.tasks
        .filter(task => {
          if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
            return false;
          }
          
          const completedDate = new Date(task.completedAt);
          return completedDate.getFullYear() === currentYear && 
                 completedDate.getMonth() + 1 === currentMonth;
        })
        .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
      
      const trackedHours = manualTrackedHours + autoTrackedHours;
      const remainingHours = Math.max(0, budgetedHours - trackedHours);
      const progressPercent = budgetedHours > 0 ? (trackedHours / budgetedHours) * 100 : 0;
      
      let status: 'over_budget' | 'on_track' | 'under_budget';
      if (trackedHours > budgetedHours) {
        status = 'over_budget';
      } else if (progressPercent >= 80) {
        status = 'on_track';
      } else {
        status = 'under_budget';
      }
      
      return {
        project,
        budgetedHours,
        trackedHours,
        remainingHours,
        progressPercent,
        status
      };
    });
  }, [projectsWithBudgets, state.tasks, currentMonth, currentYear]);
  
  // Calculate yearly summaries for all projects
  const yearlyProjectSummaries = useMemo((): ProjectBudgetSummary[] => {
    return projectsWithBudgets.map(project => {
      const timebudget = project.timebudget;
      if (!timebudget?.yearlyBudgets[currentYear]) {
        return {
          project,
          budgetedHours: 0,
          trackedHours: 0,
          remainingHours: 0,
          progressPercent: 0,
          status: 'under_budget' as const
        };
      }
      
      const yearData = timebudget.yearlyBudgets[currentYear];
      let totalBudgetedHours = 0;
      let totalTrackedHours = 0;
      
      // Sum up all months
      for (let month = 1; month <= 12; month++) {
        const monthData = yearData.monthlyBudgets[month];
        if (monthData) {
          totalBudgetedHours += monthData.budgetedHours || 0;
          totalTrackedHours += monthData.trackedHours || 0;
          
          // Add auto-tracked hours for this month
          const autoTrackedHours = state.tasks
            .filter(task => {
              if (task.projectId !== project.id || !task.trackedTime || !task.completedAt) {
                return false;
              }
              
              const completedDate = new Date(task.completedAt);
              return completedDate.getFullYear() === currentYear && 
                     completedDate.getMonth() + 1 === month;
            })
            .reduce((total, task) => total + ((task.trackedTime || 0) / 60), 0);
          
          totalTrackedHours += autoTrackedHours;
        }
      }
      
      const remainingHours = Math.max(0, totalBudgetedHours - totalTrackedHours);
      const progressPercent = totalBudgetedHours > 0 ? (totalTrackedHours / totalBudgetedHours) * 100 : 0;
      
      let status: 'over_budget' | 'on_track' | 'under_budget';
      if (totalTrackedHours > totalBudgetedHours) {
        status = 'over_budget';
      } else if (progressPercent >= 80) {
        status = 'on_track';
      } else {
        status = 'under_budget';
      }
      
      return {
        project,
        budgetedHours: totalBudgetedHours,
        trackedHours: totalTrackedHours,
        remainingHours,
        progressPercent,
        status
      };
    });
  }, [projectsWithBudgets, state.tasks, currentYear]);
  
  const currentSummaries = viewMode === 'monthly' ? monthlyProjectSummaries : yearlyProjectSummaries;
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalBudgeted = currentSummaries.reduce((sum, proj) => sum + proj.budgetedHours, 0);
    const totalTracked = currentSummaries.reduce((sum, proj) => sum + proj.trackedHours, 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalTracked);
    const overallProgress = totalBudgeted > 0 ? (totalTracked / totalBudgeted) * 100 : 0;
    
    return {
      totalBudgeted,
      totalTracked,
      totalRemaining,
      overallProgress
    };
  }, [currentSummaries]);
  
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
  
  const getStatusColor = (status: ProjectBudgetSummary['status']) => {
    switch (status) {
      case 'over_budget': return 'text-red-600 dark:text-red-400';
      case 'on_track': return 'text-green-600 dark:text-green-400';
      case 'under_budget': return 'text-orange-600 dark:text-orange-400';
    }
  };
  
  const getStatusBgColor = (status: ProjectBudgetSummary['status']) => {
    switch (status) {
      case 'over_budget': return 'bg-red-100 dark:bg-red-900/30';
      case 'on_track': return 'bg-green-100 dark:bg-green-900/30';
      case 'under_budget': return 'bg-orange-100 dark:bg-orange-900/30';
    }
  };
  
  const getStatusIcon = (status: ProjectBudgetSummary['status']) => {
    switch (status) {
      case 'over_budget': return <AlertCircle className="w-4 h-4" />;
      case 'on_track': return <TrendingUp className="w-4 h-4" />;
      case 'under_budget': return <Activity className="w-4 h-4" />;
    }
  };
  
  const getMonthName = (month: number) => {
    const date = new Date(currentYear, month - 1, 1);
    return format(date, 'MMMM', { locale: i18n.language === 'de' ? de : undefined });
  };
  
  const nextPeriod = () => {
    if (viewMode === 'monthly') {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    } else {
      setCurrentYear(prev => prev + 1);
    }
  };
  
  const prevPeriod = () => {
    if (viewMode === 'monthly') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else {
      setCurrentYear(prev => prev - 1);
    }
  };
  
  if (projectsWithBudgets.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('timebudget.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('timebudget.no_budgets_configured')}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('timebudget.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {projectsWithBudgets.length} {t('timebudget.projects_with_budgets')}
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            style={{
              backgroundColor: viewMode === 'monthly' ? accentColor : 'transparent'
            }}
          >
            {t('timebudget.monthly_overview')}
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'yearly'
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            style={{
              backgroundColor: viewMode === 'yearly' ? accentColor : 'transparent'
            }}
          >
            {t('timebudget.yearly_overview')}
          </button>
        </div>
      </div>
      
      {/* Period Navigation */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <button
          onClick={prevPeriod}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewMode === 'monthly' ? `${getMonthName(currentMonth)} ${currentYear}` : currentYear}
          </span>
        </div>
        
        <button
          onClick={nextPeriod}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('timebudget.total_budgeted')}</p>
              <p className="text-2xl font-bold" style={{ color: accentColor }}>
                {formatHours(totals.totalBudgeted)}
              </p>
            </div>
            <Target className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('timebudget.total_tracked')}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatHours(totals.totalTracked)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('timebudget.remaining')}</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatHours(totals.totalRemaining)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('timebudget.progress_percent')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(totals.overallProgress)}%
              </p>
            </div>
            <Percent className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Project Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('timebudget.project_details')}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {currentSummaries.map((summary) => (
            <div key={summary.project.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    {summary.project.title}
                  </h4>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(summary.status)} ${getStatusColor(summary.status)}`}>
                    {getStatusIcon(summary.status)}
                    <span>{t(`timebudget.${summary.status}`)}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatHours(summary.trackedHours)} / {formatHours(summary.budgetedHours)}
                  </div>
                  <div className={`text-lg font-semibold ${getStatusColor(summary.status)}`}>
                    {Math.round(summary.progressPercent)}%
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, summary.progressPercent)}%`,
                    backgroundColor: summary.status === 'over_budget' 
                      ? '#ef4444' 
                      : summary.status === 'on_track' 
                        ? '#10b981'
                        : '#f59e0b'
                  }}
                />
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('timebudget.budgeted_hours')}:</span>
                  <div className="font-medium">{formatHours(summary.budgetedHours)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('timebudget.used_hours')}:</span>
                  <div className="font-medium">{formatHours(summary.trackedHours)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('timebudget.remaining_hours')}:</span>
                  <div className="font-medium">{formatHours(summary.remainingHours)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 