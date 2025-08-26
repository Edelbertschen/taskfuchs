import React, { useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Calendar, CheckCircle2, Circle, Star, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../types';

export function TodayTasksWidget() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();

  // Memoize expensive filtering operations
  const relevantTasks = useMemo(() => {
    return state.tasks.filter(task => {
    if (task.completed) return false;
    
    const taskDate = task.reminderDate ? new Date(task.reminderDate) : null;
    if (taskDate) {
      return isToday(taskDate) || isYesterday(taskDate);
    }
    
    // Also include tasks created today
    const createdDate = new Date(task.createdAt);
    return isToday(createdDate);
  });
  }, [state.tasks]);

  // Memoize task grouping
  const { todayTasks, yesterdayTasks } = useMemo(() => {
  const todayTasks = relevantTasks.filter(task => {
    const taskDate = task.reminderDate ? new Date(task.reminderDate) : new Date(task.createdAt);
    return isToday(taskDate);
  });

  const yesterdayTasks = relevantTasks.filter(task => {
    const taskDate = task.reminderDate ? new Date(task.reminderDate) : null;
    return taskDate && isYesterday(taskDate);
  });

    return { todayTasks, yesterdayTasks };
  }, [relevantTasks]);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleCompleteTask = useCallback((taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      });
    }
  }, [state.tasks, dispatch]);

  const handleTaskClick = useCallback((taskId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-tasks', { detail: { taskId } }));
  }, []);

  // Render task item
  const renderTask = (task: Task) => {
    const isOverdue = task.reminderDate && new Date(task.reminderDate) < startOfDay(new Date()) && !task.completed;
    
    return (
      <div 
        key={task.id}
        className="group flex items-start space-x-3 p-3 rounded-lg bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-600/20 hover:bg-white/30 dark:hover:bg-gray-700/30 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => handleTaskClick(task.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCompleteTask(task.id);
          }}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-green-500" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className={`text-sm font-medium truncate ${
              task.completed 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : isOverdue 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
            }`}>
              {task.title}
            </p>
            {task.priority === 'high' && (
              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}
            {isOverdue && (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>
          
          {task.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            {task.reminderDate && task.reminderTime && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{task.reminderTime}</span>
              </div>
            )}
            {task.estimatedTime && task.estimatedTime > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{task.estimatedTime}min</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (relevantTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100/50 to-blue-100/50 dark:from-green-900/20 dark:to-blue-900/20 backdrop-blur-md border border-white/20 dark:border-gray-600/20 flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-white font-medium mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('today_tasks_widget.all_done')}</p>
        <p className="text-sm text-white/80" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
          {t('today_tasks_widget.all_tasks_completed')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="space-y-4 max-h-full overflow-y-auto">
        {/* Today's Tasks */}
        {todayTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2 p-2 rounded-lg bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-600/20" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
              <Calendar className="w-4 h-4" />
              <span>{t('today_tasks_widget.today')} ({todayTasks.length})</span>
            </h4>
            <div className="space-y-1">
              {todayTasks.map(renderTask)}
            </div>
          </div>
        )}

        {/* Yesterday's Tasks */}
        {yesterdayTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2 p-2 rounded-lg bg-orange-100/30 dark:bg-orange-900/20 backdrop-blur-sm border border-orange-200/30 dark:border-orange-700/20" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span>{t('today_tasks_widget.yesterday')} ({yesterdayTasks.length})</span>
            </h4>
            <div className="space-y-1">
              {yesterdayTasks.map(renderTask)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 