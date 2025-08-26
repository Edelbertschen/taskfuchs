import React, { useState, useMemo } from 'react';
import { 
  Repeat, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  MoreVertical, 
  Plus, 
  Target,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { RecurringTaskInput } from '../Tasks/RecurringTaskInput';
import type { RecurrenceRule, RecurringTask } from '../../types';

interface RecurringTasksWidgetProps {
  className?: string;
}

export function RecurringTasksWidget({ className = '' }: RecurringTasksWidgetProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const { recurringTasksWidget } = useAppTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: accentColor + '1A' },
      shadow: { boxShadow: `0 4px 12px ${accentColor}40` },
      glow: { boxShadow: `0 0 20px ${accentColor}30` }
    };
  };

  // Calculate widget data
  const widgetData = useMemo(() => {
    const { rules, upcomingTasks, completedTasks, skippedTasks } = state.recurrence;
    
    // Active rules
    const activeRules = rules.filter(rule => rule.isActive);
    
    // Today's tasks
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = upcomingTasks.filter(task => task.scheduledDate === today);
    
    // Overdue tasks
    const overdueTasks = upcomingTasks.filter(task => task.scheduledDate < today);
    
    // This week's tasks
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const thisWeekTasks = upcomingTasks.filter(task => {
      const taskDate = new Date(task.scheduledDate);
      return taskDate >= new Date() && taskDate <= nextWeek;
    });

    // Completion rate
    const totalTasks = completedTasks.length + skippedTasks.length + upcomingTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    return {
      activeRules: activeRules.length,
      todayTasks: todayTasks.length,
      overdueTasks: overdueTasks.length,
      thisWeekTasks: thisWeekTasks.length,
      completionRate: Math.round(completionRate),
      upcomingTasks: showAll ? upcomingTasks.slice(0, 10) : upcomingTasks.slice(0, 5),
      activeRulesList: activeRules.slice(0, 3)
    };
  }, [state.recurrence, showAll]);

  const handleCreateRule = (rule: RecurrenceRule) => {
    dispatch({ type: 'ADD_RECURRENCE_RULE', payload: rule });
    setShowCreateModal(false);
  };

  const handleCompleteTask = (taskId: string) => {
    dispatch({ type: 'COMPLETE_RECURRING_TASK', payload: taskId });
  };

  const handleSkipTask = (taskId: string) => {
    dispatch({ type: 'SKIP_RECURRING_TASK', payload: taskId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    } else {
      return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  const getTaskStatus = (task: RecurringTask) => {
    const today = new Date().toISOString().split('T')[0];
    if (task.scheduledDate < today) return 'overdue';
    if (task.scheduledDate === today) return 'today';
    return 'upcoming';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={getAccentColorStyles().bg}>
              <Repeat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Wiederkehrende Aufgaben
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {widgetData.activeRules} aktive Regeln
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {widgetData.todayTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('recurring_tasks_widget.today')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">
              {widgetData.overdueTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('recurring_tasks_widget.overdue')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {widgetData.thisWeekTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('recurring_tasks_widget.this_week')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {widgetData.completionRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('recurring_tasks_widget.completion_rate')}</div>
          </div>
        </div>
      </div>

      {/* Active Rules */}
      {widgetData.activeRulesList.length > 0 && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Aktive Regeln
            </h4>
            <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Alle anzeigen
            </button>
          </div>
          <div className="space-y-3">
            {widgetData.activeRulesList.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={getAccentColorStyles().bgLight}>
                    <Target className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {rule.pattern.type === 'daily' ? recurringTasksWidget.daily() :
                       rule.pattern.type === 'weekly' ? recurringTasksWidget.weekly() :
                       rule.pattern.type === 'monthly' ? recurringTasksWidget.monthly() :
                       recurringTasksWidget.yearly()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {rule.stats.completionRate}%
                  </div>
                  <div className="w-12 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${rule.stats.completionRate}%`,
                        ...getAccentColorStyles().bg 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {widgetData.upcomingTasks.length > 0 && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Anstehende Aufgaben
            </h4>
            {widgetData.upcomingTasks.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm hover:text-gray-900 dark:hover:text-white transition-colors"
                style={getAccentColorStyles().text}
              >
                {showAll ? 'Weniger anzeigen' : 'Alle anzeigen'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {widgetData.upcomingTasks.map((task) => {
              const status = getTaskStatus(task);
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    status === 'overdue' 
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' 
                      : status === 'today'
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      status === 'overdue' ? 'bg-red-100 dark:bg-red-900/40' :
                      status === 'today' ? 'bg-blue-100 dark:bg-blue-900/40' :
                      'bg-gray-100 dark:bg-gray-600'
                    }`}>
                      {status === 'overdue' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : status === 'today' ? (
                        <Zap className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Calendar className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(task.scheduledDate)}
                        {task.estimatedTime && task.estimatedTime > 0 && (
                          <span className="ml-2">• {task.estimatedTime}min</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSkipTask(task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={recurringTasksWidget.skip()}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title={recurringTasksWidget.complete()}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {widgetData.upcomingTasks.length === 0 && widgetData.activeRulesList.length === 0 && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Repeat className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Keine wiederkehrenden Aufgaben
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Erstelle deine erste wiederkehrende Aufgabe, um automatisch Termine zu generieren.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-lg"
            style={getAccentColorStyles().bg}
          >
            <Plus className="w-4 h-4" />
            <span>Wiederkehrende Aufgabe erstellen</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      <RecurringTaskInput
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRule}
      />
    </div>
  );
} 