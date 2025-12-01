import React, { useState } from 'react';
import { Pin, Calendar, Clock, Tag, Play, Pause, Square, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaskModal } from '../Tasks/TaskModal';

// Standardized Widget Styles - consistent with SimpleTodayView
const WIDGET_TEXT_STYLES = {
  itemTitle: "text-sm font-medium",
  itemSubtext: "text-xs",
  emptyTitle: "text-lg font-semibold mb-2",
  emptySubtext: "text-sm",
  fontFamily: "'Roboto', sans-serif"
};

interface PinnedTasksWidgetProps {
  className?: string;
}

export function PinnedTasksWidget({ className = '' }: PinnedTasksWidgetProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const isMinimalDesign = state.preferences.minimalDesign;
  
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' }, // 90% opacity
      border: { borderColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
      bgLight: { backgroundColor: accentColor + '1A' }, // 10% opacity
    };
  };

  // Get all pinned tasks
  const pinnedTasks = state.tasks
    .filter(task => task.pinned && !task.completed)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleToggleComplete = (task: any) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const handlePlayStop = (task: any) => {
    // Timer functionality - placeholder for now
    console.log('Timer toggle for task:', task.id);
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const formatTime = (minutes: number) => {
    // Return null for 0 minutes to prevent showing "0m"
    if (minutes === 0 || !minutes) {
      return null;
    }
    
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTaskColumnInfo = (task: any) => {
    const column = state.columns.find(col => col.id === task.columnId);
    if (!column) return null;

    if (column.type === 'date' && column.date) {
      return {
        type: 'date',
        label: format(new Date(column.date), 'dd.MM.yy', { locale: de }),
        isToday: format(new Date(column.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        isPast: new Date(column.date) < new Date()
      };
    }

    if (column.type === 'project') {
      return {
        type: 'project',
        label: column.title
      };
    }

    return null;
  };

  if (pinnedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className={`${WIDGET_TEXT_STYLES.emptyTitle} ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`} 
           style={{ 
             textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)',
             fontFamily: WIDGET_TEXT_STYLES.fontFamily
           }}>
          {t('dashboard.pinned_tasks_widget.no_tasks_pinned')}
        </p>
        <p className={`${WIDGET_TEXT_STYLES.emptySubtext} ${isMinimalDesign ? 'text-gray-600 dark:text-gray-300' : 'text-white/90'}`} 
           style={{ 
             textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)',
             fontFamily: WIDGET_TEXT_STYLES.fontFamily
           }}>
          {t('dashboard.pinned_tasks_widget.pin_important_tasks')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pinnedTasks.map((task) => {
        const columnInfo = getTaskColumnInfo(task);
        const isTimerRunning = false; // placeholder for timer functionality
        
        return (
          <div
            key={task.id}
            className={`group flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 cursor-pointer ${
              isMinimalDesign 
                ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-600' 
                : 'border backdrop-blur-sm hover:scale-[1.02]'
            }`}
            style={isMinimalDesign ? {} : {
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => handleTaskClick(task)}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleComplete(task);
              }}
              className={`flex-shrink-0 transition-colors ${
                isMinimalDesign ? 'text-gray-400 hover:text-green-500' : 'text-white/70 hover:text-white'
              }`}
              style={isMinimalDesign ? {} : { filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }}
            >
              {task.completed ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`${WIDGET_TEXT_STYLES.itemTitle} truncate ${
                  isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
                }`} 
                    style={{ 
                      textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)',
                      fontFamily: WIDGET_TEXT_STYLES.fontFamily
                    }}>
                  {task.title}
                </h3>
                
                {/* Column Info */}
                {columnInfo && (
                  <div className="flex-shrink-0">
                    {columnInfo.type === 'date' ? (
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                        columnInfo.isToday 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : columnInfo.isPast
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{columnInfo.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <span>{columnInfo.label}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Task Meta */}
              <div className={`flex items-center space-x-3 ${WIDGET_TEXT_STYLES.itemSubtext} ${
                isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'
              }`} 
                   style={{ 
                     textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                     fontFamily: WIDGET_TEXT_STYLES.fontFamily
                   }}>
                {/* Time Estimate */}
                {task.estimatedTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" style={isMinimalDesign ? {} : { filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.7))' }} />
                    <span>{formatTime(task.estimatedTime)}</span>
                  </div>
                )}

                {/* Priority */}
                {task.priority && (
                  <div className={`px-1.5 py-0.5 rounded text-xs ${
                    task.priority === 'high' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : task.priority === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  }`}>
                    {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                  </div>
                )}

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.7))' }} />
                    <span className="truncate max-w-20">
                      {task.tags.slice(0, 2).join(', ')}
                      {task.tags.length > 2 && '...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer Button */}
            {task.estimatedTime && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayStop(task);
                }}
                className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                  isTimerRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                style={!isTimerRunning 
                  ? { filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }
                  : {}
                }
                title={isTimerRunning ? t('actions.stop_timer') : t('actions.start_timer')}
              >
                {isTimerRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        );
      })}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={handleCloseTaskModal}
        />
      )}
    </div>
  );
}