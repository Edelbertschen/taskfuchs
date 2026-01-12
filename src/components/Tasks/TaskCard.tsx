import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  CheckSquare, 
  Square, 
  Play,
  Check,
  CheckCircle,
  X,
  FileText,
  Clock,
  List,
  GripVertical,
  Trash2,
  RefreshCw,
  Calendar,
  FolderOpen,
  Minus,
  AlertCircle,
  Pin,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { useCelebration } from '../../context/CelebrationContext';
import { Task } from '../../types';
// ⚡ Lazy Loading: TaskModal wird erst bei Bedarf geladen
const LazyTaskModal = React.lazy(() => import('./TaskModal').then(module => ({ default: module.TaskModal })));
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { SeriesDeleteModal } from '../Common/SeriesDeleteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaskContextMenu } from './TaskContextMenu';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isNewTask?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isInDragOverlay?: boolean;
  isFocusMode?: boolean;
  currentColumn?: any; // Column where this task is currently displayed
  isDeadlineReminder?: boolean; // True when task is shown as deadline reminder
}

const TaskCard = React.memo(({ task, isDragging: propIsDragging = false, isNewTask = false, isFirst = false, isLast = false, isInDragOverlay = false, isFocusMode = false, currentColumn, isDeadlineReminder = false }: TaskCardProps) => {
  const { state, dispatch } = useApp();
  const { triggerCelebration } = useCelebration();
  const { t } = useTranslation();
  const [isEditingTitle, setIsEditingTitle] = useState(isNewTask);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeriesDeleteModal, setShowSeriesDeleteModal] = useState(false);
  const [liveUpdateTrigger, setLiveUpdateTrigger] = useState(0);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if this task has an active timer
  const isActiveTimer = state.activeTimer?.taskId === task.id && state.activeTimer?.isActive && !state.activeTimer?.isPaused;

  // Check if this task is selected for bulk operations
  const isSelected = state.selectedTaskIds.includes(task.id);
  const isBulkMode = state.isBulkMode;

  // Live updates for timer - ONLY update when a timer is actually running
  // This prevents unnecessary re-renders that close context menus and block interactions
  useEffect(() => {
    if (!state.activeTimer?.isActive) return; // Don't run interval if no timer is active
    
    const interval = setInterval(() => {
      setLiveUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeTimer?.isActive]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform: originalTransform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task: task,
      currentColumn: currentColumn
    }
  });

  // ✨ NUCLEAR: Block transform completely at the source
  const transform = null; // Always null to prevent ANY transforms
  
  // ✨ Compatibility alias for existing code
  const isDragging = isSortableDragging;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      if (isNewTask) {
        inputRef.current.select();
      }
    }
  }, [isEditingTitle, isNewTask]);

  // Update editTitle when task title changes
  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  // Handle clicks outside the card when editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditingTitle && cardRef.current && !cardRef.current.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        
        if (hasUnsavedChanges()) {
          setTimeout(() => setShowUnsavedWarning(true), 0);
        } else {
          handleCancelEdit();
        }
      }
    };

    if (isEditingTitle) {
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isEditingTitle, editTitle, task.title]);

  // ✨ NUCLEAR FIX: Create completely clean style object
  const style = useMemo(() => {
    // Create new object that NEVER includes useSortable transforms
    return {
      // Completely block transforms - even during drag moves
      transform: 'none !important',
      transition: isSortableDragging ? 'none' : 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      // Hide original during drag since DragOverlay shows the dragged version
      opacity: isSortableDragging ? 0 : 1,
      zIndex: 1,
      // Force override any external transforms
      WebkitTransform: 'none !important',
      MozTransform: 'none !important',
      msTransform: 'none !important',
    };
  }, [isSortableDragging]);

  const getPriorityBorderClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      case 'none':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-300 dark:border-l-gray-600';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red-500
      case 'medium':
        return '#f59e0b'; // yellow-500
      case 'low':
        return '#10b981'; // green-500
      case 'none':
        return '#9ca3af'; // gray-400
      default:
        return 'transparent';
    }
  };

  const formatTime = (minutes: number) => {
    // Never show 0 or empty values
    if (!minutes || minutes <= 0) {
      return null; // Return null instead of "-" to hide completely
    }
    
    const roundedMinutes = Math.round(minutes);
    
    // Double-check: never show 0
    if (roundedMinutes <= 0) {
      return null;
    }
    
    if (roundedMinutes < 60) {
      return `${roundedMinutes}m`;
    }
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  // Live calculation of current tracked time - updates with liveUpdateTrigger
  const getCurrentTrackedTime = () => {
    liveUpdateTrigger; // Force recalculation on timer updates
    const currentTask = state.tasks.find(t => t.id === task.id);
    return currentTask?.trackedTime || 0;
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
    dispatch({ 
      type: 'START_TIMER', 
      payload: { taskId: task.id, mode: timerMode } 
    });
  };

  const handleStopTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'STOP_TIMER' });
  };

  const handleStartEdit = () => {
    setIsEditingTitle(true);
  };

  const hasUnsavedChanges = () => {
    return editTitle.trim() !== task.title.trim();
  };

  const handleConfirmSave = () => {
    handleSaveTitle();
    setShowUnsavedWarning(false);
  };

  const handleConfirmDiscard = () => {
    handleCancelEdit();
    setShowUnsavedWarning(false);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, title: editTitle.trim() }
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setIsEditingTitle(false);
  };

  // Multi-select handlers
  const handleSelectTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Use setTimeout to ensure dispatches happen AFTER outside click handlers
    setTimeout(() => {
      if (isSelected) {
        dispatch({ type: 'DESELECT_TASK', payload: task.id });
      } else {
        dispatch({ type: 'SELECT_TASK', payload: task.id });
      }
    }, 0);
  };

  const isRecurringTask = () => {
    return task && (
      task.parentSeriesId || 
      task.recurring?.enabled || 
      task.recurrenceRuleId
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRecurringTask()) {
      setShowSeriesDeleteModal(true);
    } else {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = () => {
    dispatch({
      type: 'DELETE_TASK',
      payload: task.id
    });
    setShowDeleteModal(false);
  };

  const handleDeleteInstance = () => {
    // Delete only this instance
    dispatch({
      type: 'DELETE_TASK',
      payload: task.id
    });
    setShowSeriesDeleteModal(false);
  };

  const handleDeleteSeries = () => {
    // Find the series template
    const seriesId = task.parentSeriesId || task.id;
    
    // Delete all instances of this series
    const allInstances = state.tasks.filter(t => 
      t.parentSeriesId === seriesId || 
      (t.recurrenceRuleId === task.recurrenceRuleId && t.id !== seriesId)
    );
    
    allInstances.forEach(instance => {
      dispatch({
        type: 'DELETE_TASK',
        payload: instance.id
      });
    });
    
    // Delete the series template
    dispatch({
      type: 'DELETE_TASK',
      payload: seriesId
    });
    
    setShowSeriesDeleteModal(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Action Menu Handlers
  const handleMenuDelete = () => {
    // Create a synthetic mouse event for handleDelete
    const syntheticEvent = {
      stopPropagation: () => {},
      preventDefault: () => {}
    } as React.MouseEvent;
    handleDelete(syntheticEvent);
  };



  const handleDuplicate = () => {
    const copyPrefix = t('task_context_menu.copy_of', 'Kopie von');
    const duplicatedTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${copyPrefix} ${task.title}`,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentSeriesId: undefined,
      recurrenceRuleId: undefined,
      isSeriesTemplate: false
    };

    dispatch({
      type: 'ADD_TASK',
      payload: duplicatedTask
    });
  };

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleDateAssignment = (dateType: 'today' | 'tomorrow' | 'next-week' | 'custom') => {
    const today = new Date();
    let targetDate: Date;

    switch (dateType) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'next-week':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 7);
        break;
      case 'custom':
        // For now, just use tomorrow - can be extended with date picker
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      default:
        return;
    }

    const dateString = targetDate.toISOString().split('T')[0];
    const dateColumnId = `date-${dateString}`;

    // Find or create date column
    const existingColumn = state.columns.find(col => col.id === dateColumnId);
    if (!existingColumn) {
      dispatch({
        type: 'ADD_COLUMN',
        payload: {
          id: dateColumnId,
          title: format(targetDate, 'EEEE, d. MMMM', { locale: de }),
          type: 'date',
          date: dateString,
          order: state.columns.length,
          tasks: []
        }
      });
    }

    // Update task's column assignment
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        columnId: dateColumnId,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button') || 
                                 target.closest('input') || 
                                 target.closest('a') ||
                                 target.closest('[data-timer-controls]');
    
    if (isInteractiveElement || isSortableDragging || isEditingTitle) {
      return;
    }

    // Prevent text selection on any Shift+Click or Ctrl/Cmd+Click
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Also prevent text selection on the entire document during multi-select
      document.getSelection()?.removeAllRanges();
    }

    // If in bulk mode, clicking the card selects/deselects it
    if (isBulkMode) {
      e.preventDefault();
      e.stopPropagation();
      handleSelectTask(e);
      return;
    }

    // Ctrl/Cmd + click to enter bulk mode and select this task
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // Use setTimeout to ensure dispatches happen AFTER outside click handlers
      setTimeout(() => {
        if (!isBulkMode) {
          dispatch({ type: 'TOGGLE_BULK_MODE' });
        }
        dispatch({ type: 'SELECT_TASK', payload: task.id });
      }, 0);
      return;
    }

    // Shift + click to enter bulk mode and select this task (alternative to Ctrl/Cmd)
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // Use setTimeout to ensure dispatches happen AFTER outside click handlers
      setTimeout(() => {
        if (!isBulkMode) {
          dispatch({ type: 'TOGGLE_BULK_MODE' });
        }
        dispatch({ type: 'SELECT_TASK', payload: task.id });
      }, 0);
      return;
    }

    // Normal click opens modal – even if a timer is running
    try {
      window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
    } catch {
      setIsModalOpen(true);
    }
  };

  // Calculate totals
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  
  // Only count time if it's actually set (not 0 or undefined)
  const taskTime = task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : 0;
  const subtaskTime = task.subtasks?.reduce((sum, st) => sum + (st.estimatedTime && st.estimatedTime > 0 ? st.estimatedTime : 0), 0) || 0;
  const totalEstimatedTime = taskTime + subtaskTime;

  // Get accent color and dark mode from preferences
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  const isDarkMode = state.preferences.darkMode;

  // Get project info for task (name and color)
  const getTaskProject = () => {
    if (!task.projectId) return null;
    
    // Find the project this task is assigned to
    const project = state.columns.find(col => col.id === task.projectId);
    if (!project || project.type !== 'project') return null;
    
    return { name: project.title, color: project.color };
  };

  // CORRECTED: Show project name when task is in PLANNER (date column)
  const getTaskProjectDisplay = () => {
    const project = getTaskProject();
    if (!project || !currentColumn) return null;
    
    // Only show project name when displayed in a DATE column (Planner)
    if (currentColumn.type !== 'date') return null;
    
    return project.name;
  };
  
  // Get project color for left border indicator (show in ALL views)
  const taskProject = getTaskProject();

  // IMPROVED: Show date when task has any date set (always visible in project context)
  // WICHTIG: reminderDate hat höchste Priorität (Konsistenz mit TaskModal)
  // Bei überfälligen Aufgaben wird das Datum IMMER angezeigt (auch in Datumsspalten)
  const getTaskDateDisplay = (): { date: string; isPast: boolean } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isDateColumn = currentColumn?.type === 'date';
    
    // Priority 1: reminderDate (primäre Datumsquelle, wie im TaskModal)
    if (task.reminderDate) {
      try {
        const date = new Date(task.reminderDate);
        const isPast = date < today;
        // Bei Datumsspalten nur anzeigen, wenn überfällig
        if (isDateColumn && !isPast) return null;
        return { date: format(date, 'dd.MM.', { locale: de }), isPast };
      } catch (error) {
        // Continue to next check
      }
    }
    
    // Priority 2: Check for assigned date column (falls keine reminderDate)
    if (task.columnId) {
      const dateColumn = state.columns.find(col => col.id === task.columnId);
      if (dateColumn?.type === 'date' && dateColumn.date) {
        try {
          const date = new Date(dateColumn.date);
          const isPast = date < today;
          // Bei Datumsspalten nur anzeigen, wenn überfällig
          if (isDateColumn && !isPast) return null;
          return { date: format(date, 'dd.MM.', { locale: de }), isPast };
        } catch (error) {
          // Continue to next check
        }
      }
    }
    
    // Priority 3: Check for deadline (sekundäre Anzeige)
    if (task.deadline) {
      try {
        const date = new Date(task.deadline);
        const isPast = date < today;
        // Bei Datumsspalten nur anzeigen, wenn überfällig
        if (isDateColumn && !isPast) return null;
        return { date: format(date, 'dd.MM.', { locale: de }), isPast };
      } catch (error) {
        // Continue to next check
      }
    }
    
    // Priority 4: Check for dueDate (nur für wiederkehrende Aufgaben als Fallback)
    if (task.dueDate) {
      try {
        const date = new Date(task.dueDate);
        const isPast = date < today;
        // Bei Datumsspalten nur anzeigen, wenn überfällig
        if (isDateColumn && !isPast) return null;
        return { date: format(date, 'dd.MM.', { locale: de }), isPast };
      } catch (error) {
        return null;
      }
    }
    
    return null;
  };

  // Check if this task is currently being displayed on its deadline date
  const getTaskDeadlineDisplay = () => {
    if (!task.deadline || !currentColumn) return false;
    
    // Only show deadline indicator for date columns
    if (currentColumn.type !== 'date') return false;
    
    // Check if the current column's date matches the task's deadline
    const taskDeadlineDate = task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline; // Get just the date part
    const columnDate = currentColumn.date?.includes('T') ? currentColumn.date.split('T')[0] : currentColumn.date; // Get just the date part
    
    return taskDeadlineDate === columnDate;
  };

  const taskDateDisplay = getTaskDateDisplay();
  const taskProjectDisplay = getTaskProjectDisplay();
  const isDeadlineDisplay = getTaskDeadlineDisplay();
  
  // Convert hex accent color to RGB values for CSS variables
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const accentRgb = hexToRgb(accentColor);

  // Calculate time remaining or overdue - with live updates
  const hasTimeEstimate = task.estimatedTime && task.estimatedTime > 0;
  const estimatedMinutes = hasTimeEstimate ? Math.round(task.estimatedTime) : 0;
  const currentTrackedTime = getCurrentTrackedTime();
  const trackedMinutes = currentTrackedTime ? Math.round(currentTrackedTime) : 0;
  const hasAnyTimeEstimate = totalEstimatedTime > 0 || trackedMinutes > 0;
  
  const getTimeDisplay = () => {
    if (!hasTimeEstimate) return null;
    
    const remaining = estimatedMinutes - trackedMinutes;
    const isOverdue = remaining < 0;
    
    if (isOverdue) {
      return {
        text: `${Math.abs(remaining)}min überf.`,
        color: 'text-red-500'
      };
    } else {
      return {
        text: `${remaining}min verbl.`,
        color: 'text-gray-500'
      };
    }
  };

  const timeDisplay = getTimeDisplay();

  // Calculate border radius based on position - minimalist design without rounded corners
  const getBorderRadius = () => {
    return '';
  };

  // ✨ FIXED: Keep the card in layout but make it invisible to prevent layout shifts
  const isDraggedOriginal = isSortableDragging && !isInDragOverlay;

  // ✨ FIXED: Minimal DragOverlay styling - no conflicting transforms
  const dragOverlayStyle = isInDragOverlay ? {
    filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.15))',
    // No manual transforms - let DragOverlay handle positioning
    zIndex: 1000,
  } : {};

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (cardRef.current !== node) {
          (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      {...(!isBulkMode ? attributes : {})}
      {...(!isBulkMode ? listeners : {})}
      data-task-card="true"
      className={`group relative flex items-center rounded-lg card-hover task-card ${
        isActiveTimer ? '' : 'overflow-hidden'
      } ${
        task.completed && !isActiveTimer ? 'opacity-50' : ''
      } ${
        isActiveTimer 
          ? 'timer-active-card bg-white dark:bg-gray-800 border-2' 
          : isDeadlineDisplay
            ? 'bg-white dark:bg-gray-800 border-2'
            : task.completed 
              ? 'bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      } ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      } ${
        !isBulkMode ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{
        // ✨ NUCLEAR: Completely isolated style - NO useSortable interference
        ...dragOverlayStyle,
        marginBottom: isDraggedOriginal ? '0px' : '4px', // Remove spacing for dragged card
        height: isDraggedOriginal ? '0px' : (isFocusMode ? '40px' : '70px'), // Completely collapse dragged card
        minHeight: isDraggedOriginal ? '0px' : (isFocusMode ? '40px' : '70px'),
        maxHeight: isDraggedOriginal ? '0px' : (isFocusMode ? '40px' : '70px'),
        '--accent-color': accentColor,
        '--accent-color-rgb': accentRgb ? `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}` : '14, 165, 233',
        // ✨ COMPLETE COLLAPSE: Remove card entirely from layout during drag
        opacity: isDraggedOriginal ? 0 : 1,
        overflow: isDraggedOriginal ? 'hidden' : 'visible',
        padding: isDraggedOriginal ? '0px' : undefined, // Remove padding to fully collapse
        // ✨ ABSOLUTE: Never any transform at all
        transform: 'none',
        WebkitTransform: 'none',
        // ✨ Copy only safe properties from useSortable style
        transition: style.transition,
        zIndex: style.zIndex,
        // ✨ Fixed: Clean transform handling
        // No conflicting transforms that cause springing
        willChange: 'auto',
        contain: 'layout style',
        // Only show deadline styling when stable
        ...(!isDragging && isDeadlineDisplay && {
          borderColor: accentColor,
        }),
        // Selection ring styling
        ...(isSelected && {
          '--tw-ring-color': accentColor + '80', // Semi-transparent accent color
        }),
      } as React.CSSProperties & Record<string, any>}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress Bar - Top edge - elegant thin line */}
      {totalEstimatedTime > 0 && !task.completed && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden"
          style={{ zIndex: 1 }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min((trackedMinutes / totalEstimatedTime) * 100, 100)}%`,
              backgroundColor: trackedMinutes > totalEstimatedTime ? '#ef4444' : accentColor,
              opacity: 0.9,
            }}
          />
        </div>
      )}

      {/* Priority Bar - Left side */}
      {task.priority && getPriorityColor(task.priority) !== 'transparent' && (
                  <div
            className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
            style={{
              backgroundColor: task.completed ? '#9CA3AF' : getPriorityColor(task.priority),
              opacity: isDragging ? 0.7 : (task.completed ? 0.6 : 1),
              zIndex: 0
            }}
          />
      )}
      
      {/* Project Color - Visible background tint */}
      {taskProject?.color && !task.completed && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-300 rounded-lg"
          style={{
            backgroundColor: taskProject.color,
            opacity: isDragging ? 0.2 : 0.3,
            zIndex: 0
          }}
          title={taskProject.name}
        />
      )}
      
      {/* Bulk Mode Selection Checkbox */}
      {isBulkMode ? (
        <div className={`flex-shrink-0 ${isFocusMode ? 'p-1' : 'p-2'} relative`}>
          <button
            onClick={handleSelectTask}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            style={{
              backgroundColor: isSelected ? accentColor : 'transparent',
              borderColor: isSelected ? accentColor : undefined
            }}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>
      ) : (
        /* Visual Drag Indicator - When not in bulk mode (No longer functional, just visual) */
        <div
          className={`flex-shrink-0 ${isFocusMode ? 'p-1' : 'p-2'} text-gray-400 relative transition-all duration-200 ${
            isDragging ? 'text-blue-500' : ''
          }`}
          style={{ zIndex: 0 }}
        >
          <GripVertical className={`${isFocusMode ? 'w-3 h-3' : 'w-4 h-4'} transition-all duration-200 ${
            isDragging ? 'scale-110' : ''
          }`} />
        </div>
      )}

      {/* Task Content */}
      <div className={`flex-1 min-w-0 ${isFocusMode ? 'px-1 py-1' : 'px-2 py-2'} relative`} style={{ zIndex: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-medium ${isFocusMode ? 'text-xs' : 'text-sm'} truncate transition-all duration-200 ${
                task.completed 
                  ? 'line-through text-gray-600 dark:text-gray-400' 
                  : 'text-gray-900 dark:text-white'
              } ${
                isDragging ? 'text-blue-600 dark:text-blue-400' : ''
              }`}>
                {task.title}
              </h3>
              
              {/* Deadline Icons - Show different icons based on context */}
              {!isFocusMode && (
                <>
                  {/* Deadline Reminder - Priority 1: Show when task appears as deadline reminder in another column */}
                  {isDeadlineReminder && (
                    <span title="Deadline-Erinnerung: Diese Aufgabe ist heute fällig">
                      <Clock 
                        className="w-4 h-4 text-orange-500 dark:text-orange-400 transition-all duration-200 opacity-90 hover:opacity-100"
                      />
                    </span>
                  )}
                  
                  {/* Deadline Reached - Priority 2: Show AlertCircle when task is in its own deadline column */}
                  {!isDeadlineReminder && isDeadlineDisplay && (
                <span title={t('planner.deadline_reached')}>
                  <AlertCircle 
                    className="w-4 h-4 text-red-500 transition-all duration-200 opacity-90 hover:opacity-100"
                      />
                    </span>
                  )}
                </>
              )}

              {/* Pin Icon - Show when task is pinned (more visible) */}
              {!isFocusMode && task.pinned && (
                <span
                  className="inline-flex items-center justify-center rounded-full transition-all"
                  title={t('pins.pinned_task') || 'Aufgabe ist gepinnt'}
                  style={{
                    backgroundColor: (accentColor || '#0ea5e9') + '26',
                    border: `1px solid ${accentColor}`,
                    padding: '2px'
                  }}
                >
                  <Pin
                    className="w-4 h-4"
                    style={{ color: task.completed ? '#6B7280' : accentColor }}
                  />
                </span>
              )}

              {/* Recurring Task Icon - Show when task is part of a recurring series */}
              {!isFocusMode && (task.recurring?.enabled || task.parentSeriesId || task.recurrenceRuleId) && (
                <span 
                  className="inline-flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                  title={
                    task.isSeriesTemplate ? "Wiederkehrende Aufgabe (Serie)" : 
                    task.parentSeriesId ? "Wiederkehrende Aufgabe (Instanz)" :
                    task.recurrenceRuleId ? "Wiederkehrende Aufgabe" :
                    "Wiederkehrende Aufgabe"
                  }
                >
                  <RefreshCw 
                    className="w-3 h-3"
                    style={{ color: task.completed ? '#6B7280' : accentColor }}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Right side - Actions (context badge moved to bottom row) */}
          <div className="flex items-center ml-2 space-x-2">
            {/* Active Timer Controls - Always visible when timer is running */}
            {isActiveTimer && (
              <div className="flex items-center space-x-1" data-timer-controls>
                {/* Complete Button - always available even when timer is running */}
                <button
                  onClick={handleToggleComplete}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`${isFocusMode ? 'p-1' : 'p-1.5'} rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110`}
                  style={{
                    backgroundColor: task.completed ? '#10B981' : accentColor,
                    color: 'white',
                    opacity: task.completed ? 1 : 0.9
                  }}
                  title={task.completed ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'}
                >
                  {task.completed ? (
                    <CheckCircle className={`${isFocusMode ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                  ) : (
                    <Check className={`${isFocusMode ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                  )}
                </button>
                
                <button
                  onClick={handleStopTimer}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`${isFocusMode ? 'p-1' : 'p-1.5'} rounded transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg hover:scale-105`}
                  title={t('actions.stop_timer')}
                >
                  <Square className={`${isFocusMode ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                </button>


              </div>
            )}

            {/* Quick Actions on Hover */}
            {isHovered && !isActiveTimer && !isDragging && (
              <div className="flex items-center space-x-1 animate-fade-in">
                {/* Complete Button */}
                <button
                  onClick={handleToggleComplete}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`${isFocusMode ? 'p-1' : 'p-1.5'} rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110`}
                  style={{
                    backgroundColor: task.completed ? '#10B981' : accentColor,
                    color: 'white',
                    opacity: task.completed ? 1 : 0.9
                  }}
                  title={task.completed ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'}
                >
                  {task.completed ? (
                    <CheckCircle className={`${isFocusMode ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                  ) : (
                    <Check className={`${isFocusMode ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                  )}
                </button>

                {/* Play Button - Always available */}
                <button
                  onClick={handleStartTimer}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`${isFocusMode ? 'p-1' : 'p-1.5'} rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110`}
                  style={{
                    backgroundColor: accentColor,
                    color: 'white'
                  }}
                  title={t('actions.start_timer')}
                >
                  <Play className={`${isFocusMode ? 'w-3 h-3 ml-0.5' : 'w-3.5 h-3.5 ml-0.5'}`} />
                </button>


              </div>
            )}
          </div>
        </div>

        {/* Bottom area - Time, Subtasks, Tags and Context Badge */}
        {!isFocusMode && ((hasAnyTimeEstimate || totalSubtasks > 0) || (taskProjectDisplay || taskDateDisplay) || (task.tags && task.tags.length > 0)) && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 gap-2">
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {/* Time display - show if task has time estimate OR tracked time */}
              {(() => {
                const estimatedTimeStr = formatTime(totalEstimatedTime);
                const trackedTimeStr = trackedMinutes > 0 ? formatTime(trackedMinutes) : null;
                
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
              
              {/* Subtasks indicator - only show if there are actually subtasks */}
              {totalSubtasks > 0 && (
                <div className="flex items-center space-x-1">
                  <CheckSquare className="w-2.5 h-2.5" />
                  <span>{totalSubtasks}</span>
                </div>
              )}
            </div>
            
            {/* Tags - elegant small pills */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                <Tag className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
                <div className="flex items-center gap-1 overflow-hidden">
                  {task.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-1.5 py-0 text-[10px] font-medium rounded-full truncate max-w-[60px] transition-opacity ${
                        task.completed ? 'opacity-60' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: task.completed 
                          ? (isDarkMode ? '#374151' : '#E5E7EB') 
                          : `${accentColor}20`,
                        color: task.completed 
                          ? (isDarkMode ? '#9CA3AF' : '#6B7280') 
                          : accentColor,
                      }}
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span 
                      className="text-[10px] opacity-60"
                      title={task.tags.slice(3).join(', ')}
                    >
                      +{task.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Project Badge - Hover Reveal */}
            {taskProject && isHovered && !task.completed && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0 animate-fade-in"
                style={{
                  backgroundColor: taskProject.color ? `${taskProject.color}20` : `${accentColor}15`,
                  color: taskProject.color || accentColor
                }}
                title={taskProject.name}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: taskProject.color || accentColor }}
                />
                <span className="truncate max-w-[80px]">
                  {taskProject.name}
                </span>
              </span>
            )}
            
            {/* Context Badge - Date */}
            {taskDateDisplay && (
              <span 
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md transition-opacity flex-shrink-0 ${
                  task.completed ? 'opacity-70' : 'opacity-90 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: task.completed 
                    ? (isDarkMode ? '#374151' : '#D1D5DB')
                    : taskDateDisplay.isPast 
                      ? (isDarkMode ? '#7F1D1D' : '#FEE2E2')
                      : accentColor + '15',
                  color: task.completed 
                    ? (isDarkMode ? '#9CA3AF' : '#6B7280')
                    : taskDateDisplay.isPast 
                      ? (isDarkMode ? '#FCA5A5' : '#DC2626')
                      : accentColor
                }}
                title={`${t('planner.assigned_date_label')} ${taskDateDisplay.date}`}
              >
                <Calendar className="w-3 h-3" style={{ 
                  color: task.completed 
                    ? (isDarkMode ? '#9CA3AF' : '#6B7280')
                    : taskDateDisplay.isPast 
                      ? (isDarkMode ? '#FCA5A5' : '#DC2626')
                      : accentColor 
                }} />
                <span>
                  {taskDateDisplay.date}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gentle floating animation keyframes */}
      <style>
        {`
          @keyframes gentle-float {
            0%, 100% { transform: translateY(0px) scale(1.05) rotate(2deg); }
            25% { transform: translateY(-2px) scale(1.05) rotate(1.5deg); }
            50% { transform: translateY(-1px) scale(1.05) rotate(2.5deg); }
            75% { transform: translateY(-1.5px) scale(1.05) rotate(1.8deg); }
          }
          
          @keyframes fade-in {
            from { opacity: 0; transform: translateX(5px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}
      </style>


      {/* 🚀 Performance Boost: Lazy loaded TaskModal */}
      {isModalOpen && (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                <span className="text-gray-700 dark:text-gray-300">Lade Task-Details...</span>
              </div>
            </div>
          </div>
        }>
          <LazyTaskModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            task={task}
          />
        </React.Suspense>
      )}

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ungespeicherte Änderungen
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sie haben ungespeicherte Änderungen. Möchten Sie diese speichern?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Aufgabe löschen"
        message={`Soll "${task.title}" gelöscht werden?`}
        simple={true}
      />

      {/* Series Delete Modal */}
      <SeriesDeleteModal
        isOpen={showSeriesDeleteModal}
        onClose={() => setShowSeriesDeleteModal(false)}
        onDeleteInstance={handleDeleteInstance}
        onDeleteSeries={handleDeleteSeries}
        taskTitle={task.title}
      />

      {/* Context Menu */}
      <TaskContextMenu
        task={task}
        isOpen={showContextMenu}
        onClose={handleCloseContextMenu}
        onDelete={handleMenuDelete}
        onDuplicate={handleDuplicate}
        onSetDate={handleDateAssignment}
        mousePosition={contextMenuPosition}
      />

    </div>
  );
});

TaskCard.displayName = 'TaskCard';

export { TaskCard };