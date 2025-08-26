import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { isPast, differenceInDays, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

import { AlertCircle, Star } from 'lucide-react';
import type { Task } from '../../types';

interface DeadlineWidgetProps {
  onTaskClick?: (taskId: string) => void;
}

// Standardized Widget Styles - consistent with SimpleTodayView
const WIDGET_TEXT_STYLES = {
  itemTitle: "text-sm font-medium",
  itemSubtext: "text-xs",
  emptyTitle: "text-lg font-semibold mb-2",
  emptySubtext: "text-sm",
  fontFamily: "'Roboto', sans-serif"
};

export function DeadlineWidget({ onTaskClick }: DeadlineWidgetProps = {}) {
  const { state, dispatch } = useApp();
  const { simpleTodayView } = useAppTranslation();
  const { i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const isMinimalDesign = state.preferences.minimalDesign;

  // 🕒 Live Update Timer - aktualisiert jede Sekunde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter tasks with deadlines for today and the next 3 days
  const tasksWithDeadlines = state.tasks.filter(task => {
    if (task.completed || task.archived) return false;
    if (!task.deadline) return false;
    
    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    const daysDiff = differenceInDays(deadlineDate, now);
    
    // Show tasks that are overdue OR due within next 3 days
    return daysDiff >= -1 && daysDiff <= 3;
  });

  // Sort chronologically: overdue first, then by deadline date (earliest first)
  const sortedTasks = tasksWithDeadlines.sort((a, b) => {
    const dateA = new Date(a.deadline!);
    const dateB = new Date(b.deadline!);
    
    const isPastA = isPast(dateA);
    const isPastB = isPast(dateB);
    
    // Overdue tasks first
    if (isPastA && !isPastB) return -1;
    if (!isPastA && isPastB) return 1;
    
    // Within same category (both overdue or both upcoming), sort by deadline date
    return dateA.getTime() - dateB.getTime();
  });

  // Handle task completion
  const handleCompleteTask = (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      });
    }
  };

  // Handle task click to open modal
  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    } else {
      // Fallback to custom event if no onTaskClick prop provided
      window.dispatchEvent(new CustomEvent('navigate-to-tasks', { detail: { taskId } }));
    }
  };

  // Simple check if a task is overdue
  const isTaskOverdue = (deadline: string, reminderTime?: string) => {
    let targetDate = new Date(deadline);
    
    // If reminderTime is provided, combine it with the date
    if (reminderTime) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to end of day if no time specified
      targetDate.setHours(23, 59, 59, 999);
    }

    const now = currentTime;
    return targetDate.getTime() < now.getTime();
  };

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className={`${WIDGET_TEXT_STYLES.emptyTitle} ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`} 
           style={{ 
             textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)',
             fontFamily: WIDGET_TEXT_STYLES.fontFamily
           }}>
          {simpleTodayView.noUpcomingDeadlines()}
        </p>
        <p className={`${WIDGET_TEXT_STYLES.emptySubtext} ${isMinimalDesign ? 'text-gray-600 dark:text-gray-300' : 'text-white/90'}`} 
           style={{ 
             textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)',
             fontFamily: WIDGET_TEXT_STYLES.fontFamily
           }}>
          {simpleTodayView.allTasksOnSchedule()}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="space-y-3 max-h-full overflow-y-auto">
        {sortedTasks.map((task) => {
          const isOverdue = isTaskOverdue(task.deadline!, task.reminderTime);
          const deadlineDate = new Date(task.deadline!);
          const formattedDate = format(deadlineDate, 'dd.MM.yyyy', { 
            locale: i18n.language === 'en' ? enUS : de 
          });
          const isToday = format(deadlineDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const isTomorrow = format(deadlineDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
          
          let dateLabel = formattedDate;
          if (isToday) {
            dateLabel = i18n.language === 'en' ? 'Today' : 'Heute';
          } else if (isTomorrow) {
            dateLabel = i18n.language === 'en' ? 'Tomorrow' : 'Morgen';
          }
          
          return (
            <div
              key={task.id}
              className={`group py-2 px-1 transition-all duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-md ${
                isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''
              }`}
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {/* Priority/Urgency Indicator */}
                    {isOverdue && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    
                    {/* High Priority Star */}
                    {task.priority === 'high' && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    
                    {/* Task Title */}
                    <p className={`flex-1 truncate ${WIDGET_TEXT_STYLES.itemTitle} ${
                      isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
                    } ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`} 
                       style={{ 
                         textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)',
                         fontFamily: WIDGET_TEXT_STYLES.fontFamily
                       }}>
                      {task.title}
                    </p>
                  </div>
                  
                  {/* Deadline Date */}
                  <p className={`${WIDGET_TEXT_STYLES.itemSubtext} ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'
                  } ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}
                     style={{ 
                       textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.4)',
                       fontFamily: WIDGET_TEXT_STYLES.fontFamily
                     }}>
                    {isOverdue 
                      ? (i18n.language === 'en' ? '⚠️ Overdue: ' : '⚠️ Überfällig: ')
                      : (i18n.language === 'en' ? '📅 Due: ' : '📅 Fällig: ')
                    }{dateLabel}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 