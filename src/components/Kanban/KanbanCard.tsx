import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import type { Task, KanbanGroupingMode } from '../../types';
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  Square,
  Play,
  Check,
  X,
  FileText,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { TaskModal } from '../Tasks/TaskModal';
import { useApp } from '../../context/AppContext';
import { useCelebration } from '../../context/CelebrationContext';
import { parseTaskInput } from '../../utils/taskParser';

interface KanbanCardProps {
  task: Task;
  groupingMode: KanbanGroupingMode;
  isDragging?: boolean;
}

export function KanbanCard({ task, isDragging = false }: KanbanCardProps) {
  const { state, dispatch } = useApp();
  const { triggerCelebration } = useCelebration();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Update editTitle when task title changes
  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dragIsDragging,
  } = useDraggable({
    id: task.id,
  });
  
  const actualIsDragging = isDragging || dragIsDragging;

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  const getPriorityBorderClass = (priority?: string) => {
    if (!state.preferences.showPriorities || !priority) {
      return 'border-l-gray-300 dark:border-l-gray-600';
    }
    
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300 dark:border-l-gray-600';
    }
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newCompletedState = !task.completed;
    
    // Trigger celebration animation if task is being completed
    if (newCompletedState) {
      triggerCelebration();
    }
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, completed: newCompletedState }
    });
  };

  const handleCardClick = () => {
    if (!actualIsDragging && !isEditingTitle) {
      setIsModalOpen(true);
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actualIsDragging) {
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== task.title) {
      // Use smart parsing for title editing
      const parseResult = parseTaskInput(trimmedTitle);
      
      if (parseResult.success && parseResult.task) {
        const updatedTask = {
          ...task,
          title: parseResult.task.title,
          description: parseResult.task.description || task.description,
          estimatedTime: parseResult.task.estimatedTime || task.estimatedTime,
          priority: parseResult.task.priority || task.priority,
          tags: parseResult.task.tags.length > 0 ? parseResult.task.tags : task.tags,
          // Don't automatically convert to reminderDate - only show reminderDate if explicitly set
        };
        
        dispatch({
          type: 'UPDATE_TASK',
          payload: updatedTask
        });
      } else {
        // Fallback to simple title update if parsing fails
        dispatch({
          type: 'UPDATE_TASK',
          payload: { ...task, title: trimmedTitle }
        });
      }
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Start timer for this task - check if pomodoro is enabled
    const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
    dispatch({
      type: 'START_TIMER',
      payload: {
        taskId: task.id,
        mode: timerMode,
      }
    });
  };

  // Calculate total estimated time, ensuring we only count meaningful values
  const taskEstimatedTime = (task.estimatedTime && task.estimatedTime > 0) ? task.estimatedTime : 0;
  const subtaskEstimatedTime = task.subtasks.reduce((total, subtask) => {
    return total + ((subtask.estimatedTime && subtask.estimatedTime > 0) ? subtask.estimatedTime : 0);
  }, 0);
  const totalEstimatedTime = taskEstimatedTime + subtaskEstimatedTime;
  const hasAnyTimeEstimate = totalEstimatedTime > 0 || (task.trackedTime && task.trackedTime > 0);

  const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
  const totalSubtasks = task.subtasks.length;

  const formatTime = (minutes: number) => {
    // Return null for zero time to hide completely
    if (minutes === 0 || !minutes) {
      return null;
    }
    
    const roundedMinutes = Math.round(Math.abs(minutes));
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    const sign = minutes < 0 ? '-' : '';
    
    if (hours > 0) {
      return `${sign}${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${sign}${mins}m`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'dd.MM.') : null;
    } catch {
      return null;
    }
  };

  // Get accent color from preferences
  const accentColor = state.preferences.accentColor || '#0ea5e9';

  if (actualIsDragging) {
    return (
      <div 
        className={`${
          task.completed 
            ? 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 border-l-gray-500 dark:border-l-gray-500' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ' + getPriorityBorderClass(task.priority)
        } rounded-lg border border-l-4 p-3 w-full transition-all duration-200`}
        style={{
          opacity: 0.3,
        }}
      >
        <div className={`text-sm font-medium truncate ${
          task.completed 
            ? 'line-through text-gray-600 dark:text-gray-400' 
            : 'text-gray-900 dark:text-white'
        }`}>
          {task.title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Wird verschoben...
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          zIndex: 0
        }}
        className={`${
          task.completed 
            ? 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 opacity-50' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        } rounded-lg border border-l-4 ${
          task.completed 
            ? 'border-l-gray-500 dark:border-l-gray-500' 
            : getPriorityBorderClass(task.priority)
        } transition-all duration-200 ease-out group cursor-pointer relative w-full ${
          task.completed ? '' : 'hover:shadow-md'
        } transition-shadow`}
        onClick={handleCardClick}
        onMouseEnter={(e) => {
          setIsHovered(true);
          if (!task.completed) {
            // Kombinierte Hover-Effekte: Intensivere Schatten + Hintergrund-Tint
            e.currentTarget.style.boxShadow = `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px ${state.preferences.accentColor}20`;
            e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${state.preferences.accentColor} 5%, ${getComputedStyle(e.currentTarget).backgroundColor})`;
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${state.preferences.accentColor} 40%, ${getComputedStyle(e.currentTarget).borderColor})`;
          }
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.borderColor = '';
        }}
      >


        <div className="px-2 py-3 pr-1">
          <div className="flex items-start space-x-2">
            {/* Checkbox - only visible on hover */}
            <button
                              className={`flex-shrink-0 self-center transition-opacity duration-200 ml-2 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleComplete(e);
              }}
            >
              {task.completed ? (
                <CheckSquare className="w-5 h-5 text-gray-500 dark:text-gray-500" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-current transition-colors" 
                       style={{ '--tw-text-opacity': isHovered ? '1' : '0.4' } as React.CSSProperties} />
              )}
            </button>

            {/* Main content with drag listeners */}
            <div 
              className="flex-1 min-w-0 cursor-grab active:cursor-grabbing -ml-6"
              {...attributes}
              {...listeners}
            >
              {/* Title */}
              <div className="flex items-center justify-between mb-1">
                {isEditingTitle ? (
                  <div className="flex items-center space-x-1 flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={handleSaveTitle}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Aufgabentitel eingeben..."
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-1 text-green-600 hover:text-green-700 rounded transition-colors"
                      title="Speichern"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-red-600 hover:text-red-700 rounded transition-colors"
                      title="Abbrechen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h4 
                      className={`text-sm font-medium flex-1 truncate cursor-pointer transition-colors ${
                        task.completed 
                          ? 'line-through text-gray-600 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                      onClick={handleTitleClick}
                      title="Klicken zum Bearbeiten"
                    >
                      {task.title}
                    </h4>
                    

                  </>
                )}
              </div>

              {/* Meta Information - Only show date, moved up slightly */}
              {(task.reminderDate || (task.linkedNotes && task.linkedNotes.length > 0)) && (
                <div className={`flex items-center justify-between text-xs -mt-0.5 -ml-6 ${
                  task.completed 
                    ? 'text-gray-500 dark:text-gray-500' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <div className="flex items-center space-x-2">
                    {/* Recurring Task Icon */}
                    {(task.recurring?.enabled || task.parentSeriesId || task.recurrenceRuleId) && (
                      <div className="flex items-center space-x-1" title={
                        task.isSeriesTemplate ? "Wiederkehrende Aufgabe (Serie)" : 
                        task.parentSeriesId ? "Wiederkehrende Aufgabe (Instanz)" :
                        task.recurrenceRuleId ? "Wiederkehrende Aufgabe" :
                        "Wiederkehrende Aufgabe"
                      }>
                        <RefreshCw className={`w-2.5 h-2.5 ${
                          task.completed ? 'text-gray-500 dark:text-gray-500' : 'text-blue-500'
                        }`} />
                      </div>
                    )}

                    {/* Notes indicator */}
                    {task.linkedNotes && task.linkedNotes.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <FileText className="w-2.5 h-2.5" />
                        <span>{task.linkedNotes.length}</span>
                      </div>
                    )}
                    
                    {/* Show reminderDate if set */}
                    {task.reminderDate && (
                      <div className="flex items-center space-x-1" title="Erinnerung">
                        <Calendar className={`w-2.5 h-2.5 ${
                          task.completed ? 'text-gray-500 dark:text-gray-500' : 'text-blue-500'
                        }`} />
                        <span>{formatDate(task.reminderDate)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Play button - always available for non-completed tasks */}
                  {!task.completed && (
                    <div className={`flex items-center space-x-1 pr-2 transition-opacity duration-200 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        onClick={handleStartTimer}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={t('actions.start_timer')}
                      >
                        <Play 
                          className="w-4 h-4 fill-current" 
                          style={{ color: accentColor }}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom area - Time, Subtasks, and Tags */}
              {(hasAnyTimeEstimate || totalSubtasks > 0 || (task.tags && task.tags.length > 0)) && (
                <div className={`flex items-center justify-between text-xs mt-2 -ml-6 ${
                  task.completed 
                    ? 'text-gray-500 dark:text-gray-500' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <div className="flex items-center space-x-2">
                    {/* Time display */}
                    {(() => {
                      const estimatedTimeStr = formatTime(totalEstimatedTime);
                      const trackedTimeStr = (task.trackedTime && task.trackedTime > 0) ? formatTime(task.trackedTime) : null;
                      
                      // Show if we have either estimated time or tracked time
                      if (!estimatedTimeStr && !trackedTimeStr) return null;
                      
                      return (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {estimatedTimeStr ? 
                              `${trackedTimeStr ? `${trackedTimeStr} / ` : ''}${estimatedTimeStr}` :
                              trackedTimeStr // Only tracked time, no estimate
                            }
                          </span>
                        </div>
                      );
                    })()}
                    
                    {/* Subtasks indicator */}
                    {totalSubtasks > 0 && (
                      <div className="flex items-center space-x-1">
                        <CheckSquare className="w-2.5 h-2.5" />
                        <span>{totalSubtasks}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {task.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          task.completed 
                            ? 'bg-gray-400 text-gray-600 dark:bg-gray-500 dark:text-gray-300' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          #{tag}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{task.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal (portal + freshest task instance) */}
      {isModalOpen && createPortal(
        <TaskModal 
          task={state.tasks.find(t => t.id === task.id) || task}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />,
        document.body
      )}
    </>
  );
} 