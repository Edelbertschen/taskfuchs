import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Zap, 
  Archive, 
  Eye,
  EyeOff,
  Star,
  CheckCircle,
  SkipForward,
  RotateCcw,
  Target,
  Award,
  TrendingUp,
  Heart,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Plus,
  FolderOpen,
  Edit,
  Link,
  ExternalLink,
  Copy,
  CalendarDays,
  Timer,
  List,
  ChevronUp,
  ChevronDown,
  Info,
  Keyboard
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../utils/i18nHelpers';
import type { Task, Column } from '../../types';
import { TaskModal } from '../Tasks/TaskModal';

import { MarkdownRenderer } from '../Common/MarkdownRenderer';
import { format, addDays, startOfDay, isSameDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';

interface ReviewViewProps {}

export function ReviewView({}: ReviewViewProps) {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  const { reviewView } = useAppTranslation();
  
  // Check if minimal design is enabled
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Get all incomplete, non-archived tasks (excluding inbox tasks, date-assigned tasks, and tasks with future nextReviewDate)
  const getReviewableTasks = (): Task[] => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return state.tasks.filter(task => {
      if (task.completed || task.archived || task.columnId === 'inbox') {
        return false;
      }
      // Exclude pinned tasks from Review
      if (task.pinColumnId) {
        return false;
      }
      
      // Exclude tasks that are already assigned to a specific date
      if (task.columnId && task.columnId.startsWith('date-')) {
        return false;
      }
      
      // Check if task has a nextReviewDate (using reminderDate as temporary storage)
      // If it has one and it's in the future, exclude from review
      if (task.reminderDate && task.reminderDate > today) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by priority first, then by creation date
      const priorityOrder = { high: 4, medium: 3, low: 2, none: 1 };
      const aPriority = priorityOrder[a.priority || 'none'];
      const bPriority = priorityOrder[b.priority || 'none'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [reviewableTasks, setReviewableTasks] = useState<Task[]>(getReviewableTasks());
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [skippedTasks, setSkippedTasks] = useState<Task[]>([]);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNextReviewModal, setShowNextReviewModal] = useState(false);
  const [showPinPicker, setShowPinPicker] = useState(false);

  // Current task
  const currentTask = reviewableTasks[currentTaskIndex] || null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTaskModal || showTimeEditor || showCalendar || showNextReviewModal) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          handleNext();
          break;
        case 'c':
          e.preventDefault();
          if (currentTask) handleCalendar();
          break;
        case 'x':
          e.preventDefault();
          if (currentTask) handleArchive();
          break;
        case 'r':
          e.preventDefault();
          if (currentTask) handleNextReview();
          break;
        case 't':
          e.preventDefault();
          if (currentTask) {
            setEditTimeValue(currentTask.estimatedTime || 30);
            setShowTimeEditor(true);
          }
          break;
        case 'e':
          e.preventDefault();
          if (currentTask) handleEdit();
          break;
        case 'h':
        case '?':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTask, showTaskModal, showTimeEditor, showCalendar, showNextReviewModal, showShortcuts]);

  // Update reviewable tasks when state changes
  useEffect(() => {
    const updatedTasks = getReviewableTasks();
    setReviewableTasks(updatedTasks);
    
    // Reset index if no tasks or current index is out of bounds
    if (updatedTasks.length === 0 || currentTaskIndex >= updatedTasks.length) {
      setCurrentTaskIndex(0);
    }
  }, [state.tasks, currentTaskIndex]);

  // Navigation
  const handleNext = () => {
    if (isAnimating || !currentTask) return;
    
    setIsAnimating(true);
    setSlideDirection('right');
    
    setTimeout(() => {
      if (currentTaskIndex < reviewableTasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        setCurrentTaskIndex(0);
      }
      
      setSlideDirection(null);
      setIsAnimating(false);
    }, 250);
  };

  const handlePrevious = () => {
    if (isAnimating || !currentTask) return;
    
    setIsAnimating(true);
    setSlideDirection('left');
    
    setTimeout(() => {
      if (currentTaskIndex > 0) {
        setCurrentTaskIndex(currentTaskIndex - 1);
      } else {
        setCurrentTaskIndex(reviewableTasks.length - 1);
      }
      
      setSlideDirection(null);
      setIsAnimating(false);
    }, 250);
  };

  // Actions
  const handleArchive = () => {
    if (!currentTask) return;
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...currentTask,
        archived: true,
        updatedAt: new Date().toISOString()
      }
    });
    
    setReviewedCount(prev => prev + 1);
    
    // Auto-advance to next task
    setTimeout(() => {
      if (currentTaskIndex < reviewableTasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        setCurrentTaskIndex(0);
      }
    }, 100);
  };

  const handleNextReview = () => {
    setShowNextReviewModal(true);
  };

  const handleNextReviewDate = (date: Date) => {
    if (!currentTask) return;
    
    const dateStr = date.toISOString().split('T')[0];
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...currentTask,
        reminderDate: dateStr,
        updatedAt: new Date().toISOString()
      }
    });
    
    setShowNextReviewModal(false);
    setReviewedCount(prev => prev + 1);
    
    // Auto-advance to next task
    setTimeout(() => {
      if (currentTaskIndex < reviewableTasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        setCurrentTaskIndex(0);
      }
    }, 100);
  };

  const handleCalendar = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date) => {
    if (!currentTask) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const columnId = `date-${dateStr}`;
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...currentTask,
        columnId,
        updatedAt: new Date().toISOString()
      }
    });
    
    setShowCalendar(false);
    setReviewedCount(prev => prev + 1);
    
    // Auto-advance to next task
    setTimeout(() => {
      if (currentTaskIndex < reviewableTasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        setCurrentTaskIndex(0);
      }
    }, 100);
  };

  const handleEdit = () => {
    if (!currentTask) return;
    setEditingTaskId(currentTask.id);
    setShowTaskModal(true);
  };

  const handlePinAssign = () => {
    if (!currentTask) return;
    setShowPinPicker(true);
  };

  const handleTimeUpdate = (minutes: number) => {
    if (!currentTask) return;
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...currentTask,
        estimatedTime: minutes,
        updatedAt: new Date().toISOString()
      }
    });
    
    setShowTimeEditor(false);
  };

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return 'Normal';
    }
  };

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getTaskProject = (task: Task) => {
    return state.columns.find(col => col.id === task.columnId && col.type === 'project');
  };

  const getTaskColumn = (task: Task) => {
    return state.columns.find(col => col.id === task.columnId);
  };

  const formatColumnName = (column: Column | undefined) => {
    if (!column) return null;
    if (column.type === 'date') {
      const dateStr = column.id.replace('date-', '');
      const date = new Date(dateStr + 'T00:00:00');
      return format(date, 'dd.MM.yyyy', { locale: de });
    }
    return column.title;
  };

  if (reviewableTasks.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center p-6 ${
        isMinimalDesign ? 'bg-gray-50 dark:bg-gray-900' : ''
      }`}>
        <div className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl shadow-2xl max-w-md mx-4 backdrop-blur-3xl ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            : 'glass-effect border border-white/10'
        } before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none relative overflow-hidden`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-xl ${
            isMinimalDesign
              ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
              : 'bg-white/15 border border-white/25'
          } shadow-lg relative z-10`}>
            <CheckCircle className={`w-8 h-8`} style={{ color: state.preferences.accentColor }} />
          </div>
          <h2 className={`text-lg font-semibold mb-2 relative z-10 ${
            isMinimalDesign
              ? 'text-gray-900 dark:text-white'
              : 'text-white'
          }`} style={{ 
            textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' 
          }}>
            {reviewView['allReviewed']?.() || t('review_view.all_reviewed')}
          </h2>
          <p className={`mb-6 relative z-10 ${
            isMinimalDesign
              ? 'text-gray-600 dark:text-gray-300'
              : 'text-white/90'
          }`} style={{ 
            textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)' 
          }}>
            {reviewView['noTasksToReview']?.() || t('review_view.no_tasks_to_review')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      isMinimalDesign ? 'bg-gray-50 dark:bg-gray-900' : ''
    }`}>
      
      {/* Compact Header */}
      <div className={`flex-shrink-0 border-b px-4 py-3 ${
        isMinimalDesign 
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'glass-effect border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isMinimalDesign 
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-white/10 backdrop-blur-md border border-white/20'
            }`} style={{ backgroundColor: isMinimalDesign ? undefined : state.preferences.accentColor + '1A' }}>
              <Target className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${
                isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
              }`} style={{ 
                textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.5)' 
              }}>
                Review
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        
        {/* Navigation Buttons */}
        <button
          onClick={handlePrevious}
          disabled={isAnimating}
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-all z-10 disabled:opacity-50 ${
            isMinimalDesign
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              : 'glass-effect border-white/10 text-white/70 hover:text-white backdrop-blur-xl'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleNext}
          disabled={isAnimating}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-all z-10 disabled:opacity-50 ${
            isMinimalDesign
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              : 'glass-effect border-white/10 text-white/70 hover:text-white backdrop-blur-xl'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Card Container */}
        <div className="relative w-full max-w-lg">
          
          {/* Counter Overlay */}
          <div className="flex items-center justify-center mb-4">
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-full shadow-sm border ${
              isMinimalDesign
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                : 'glass-effect border-white/10 backdrop-blur-xl'
            }`}>
              <span className={`text-sm font-medium ${
                isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
              }`} style={{ 
                textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)' 
              }}>
                {currentTaskIndex + 1} von {reviewableTasks.length}
              </span>
              {reviewedCount > 0 && (
                <>
                  <div className={`w-1 h-1 rounded-full ${
                    isMinimalDesign ? 'bg-gray-400 dark:bg-gray-500' : 'bg-white/60'
                  }`}></div>
                  <span className={`text-sm ${
                    isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                  }`} style={{ 
                    textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)' 
                  }}>
                    {reviewedCount} bearbeitet
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Current Card */}
          {currentTask && (
            <div
              className={`rounded-xl border p-6 shadow-lg transition-all duration-250 ${
                isMinimalDesign
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'glass-effect border-white/10 backdrop-blur-xl'
              } ${
                slideDirection === 'left' ? 'transform translate-x-full opacity-0' :
                slideDirection === 'right' ? 'transform -translate-x-full opacity-0' :
                'transform translate-x-0 opacity-100'
              }`}
            >
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getPriorityColor(currentTask.priority || 'none')}`}>
                  {getPriorityText(currentTask.priority || 'none')}
                </span>
                <button
                  onClick={handleEdit}
                  className={`p-1.5 rounded transition-colors ${
                    isMinimalDesign
                      ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <h2 className={`text-xl font-semibold mb-4 ${
                isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
              }`} style={{ 
                textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' 
              }}>
                {currentTask.title}
              </h2>

              {/* Description */}
              {currentTask.description && (
                <div className={`mb-4 text-sm rounded-lg p-3 ${
                  isMinimalDesign
                    ? 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50'
                    : 'text-white/80 bg-white/5 backdrop-blur-sm border border-white/10'
                }`}>
                  <MarkdownRenderer content={currentTask.description} />
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3 mb-6">
                {/* Time */}
                {currentTask.estimatedTime ? (
                  <div className={`flex items-center gap-2 text-sm ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <button
                      onClick={() => {
                        setEditTimeValue(currentTask.estimatedTime || 0);
                        setShowTimeEditor(true);
                      }}
                      className={`transition-colors ${
                        isMinimalDesign ? 'hover:text-gray-700 dark:hover:text-gray-200' : 'hover:text-white'
                      }`}
                    >
                      {formatEstimatedTime(currentTask.estimatedTime)}
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 text-sm ${
                    isMinimalDesign ? 'text-orange-600 dark:text-orange-400' : 'text-orange-300'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>{i18n.language === 'en' ? 'No time estimate' : 'Keine Zeitschätzung'}</span>
                    <button
                      onClick={() => {
                        setEditTimeValue(30);
                        setShowTimeEditor(true);
                      }}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${
                        isMinimalDesign
                          ? 'bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/40'
                          : 'bg-orange-400/20 border border-orange-400/30 hover:bg-orange-400/30'
                      }`}
                    >
                      {i18n.language === 'en' ? 'Add' : 'Hinzufügen'}
                    </button>
                  </div>
                )}

                {/* Project */}
                {(() => {
                  const project = getTaskProject(currentTask);
                  return project && (
                    <div className={`flex items-center gap-2 text-sm ${
                      isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
                    }`}>
                      <FolderOpen className="w-4 h-4" />
                      <span>{i18n.language === 'en' ? 'Project:' : 'Projekt:'} {project.title}</span>
                    </div>
                  );
                })()}

                {/* Column */}
                {(() => {
                  const column = getTaskColumn(currentTask);
                  const columnName = formatColumnName(column);
                  return columnName && (
                    <div className={`flex items-center gap-2 text-sm ${
                      isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
                    }`}>
                      <List className="w-4 h-4" />
                      <span>{i18n.language === 'en' ? 'Column:' : 'Spalte:'} {columnName}</span>
                    </div>
                  );
                })()}

                {/* Subtasks */}
                {currentTask.subtasks.length > 0 && (
                  <div className={`flex items-center gap-2 text-sm ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
                  }`}>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {currentTask.subtasks.filter(st => st.completed).length} von {currentTask.subtasks.length} Teilaufgaben
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {currentTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {currentTask.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-1 text-xs rounded-full ${
                        isMinimalDesign ? '' : 'backdrop-blur-sm border border-white/20'
                      }`}
                      style={{ 
                        backgroundColor: isMinimalDesign 
                          ? `${state.preferences.accentColor}20`
                          : `${state.preferences.accentColor}40`,
                        color: isMinimalDesign 
                          ? state.preferences.accentColor
                          : 'white'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <button
                  onClick={handleCalendar}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    isMinimalDesign
                      ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 backdrop-blur-sm'
                  }`}
                >
                  <Calendar className={`w-5 h-5 ${
                    isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'
                  }`}>
                    {i18n.language === 'en' ? 'Plan' : 'Planen'}
                  </span>
                  <span className={`text-xs ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/50'
                  }`}>C</span>
                </button>
                
                <button
                  onClick={handlePinAssign}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    isMinimalDesign
                      ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 backdrop-blur-sm'
                  }`}
                >
                  <Star className={`w-5 h-5 ${
                    isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'
                  }`}>
                    {i18n.language === 'en' ? 'Pin' : 'An Pin heften'}
                  </span>
                  <span className={`text-xs ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/50'
                  }`}>P</span>
                </button>
                
                <button
                  onClick={handleNextReview}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    isMinimalDesign
                      ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 backdrop-blur-sm'
                  }`}
                >
                  <RotateCcw className={`w-5 h-5 ${
                    isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'
                  }`}>
                    {i18n.language === 'en' ? 'Later' : 'Später'}
                  </span>
                  <span className={`text-xs ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/50'
                  }`}>R</span>
                </button>
                
                <button
                  onClick={handleArchive}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    isMinimalDesign
                      ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 backdrop-blur-sm'
                  }`}
                >
                  <Archive className={`w-5 h-5 ${
                    isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'
                  }`}>
                    {i18n.language === 'en' ? 'Archive' : 'Archiv'}
                  </span>
                  <span className={`text-xs ${
                    isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/50'
                  }`}>X</span>
                </button>
              </div>

              {/* Shortcuts Toggle Button */}
              <div className={`border-t pt-4 ${
                isMinimalDesign ? 'border-gray-200 dark:border-gray-700' : 'border-white/10'
              }`}>
                <button
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className={`w-full flex items-center justify-center gap-2 p-2 text-sm transition-colors rounded-lg ${
                    isMinimalDesign
                      ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>{i18n.language === 'en' ? 'Keyboard shortcuts' : 'Tastenkürzel'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showShortcuts ? 'rotate-180' : ''}`} />
                </button>

                {/* Shortcuts Panel - Integrated */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showShortcuts ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}>
                  <div className={`rounded-lg p-4 ${
                    isMinimalDesign 
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'bg-white/5 backdrop-blur-sm border border-white/10'
                  }`}>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Previous' : 'Vorherige'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>A / ←</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Next' : 'Nächste'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>D / →</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Plan' : 'Planen'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>C</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Later' : 'Später'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>R</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Archive' : 'Archiv'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>X</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          Bearbeiten
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>E</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Time' : 'Zeit'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>T</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}>
                          {i18n.language === 'en' ? 'Help' : 'Hilfe'}
                        </span>
                        <kbd className={`px-2 py-1 border rounded font-mono ${
                          isMinimalDesign 
                            ? 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}>H / ?</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && editingTaskId && (
        <TaskModal
          task={reviewableTasks.find(task => task.id === editingTaskId) || null}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTaskId(null);
          }}
        />
      )}

      {/* Time Editor Modal */}
      {showTimeEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl ${
            isMinimalDesign 
              ? 'bg-white dark:bg-gray-900'
              : 'glass-effect backdrop-blur-xl border border-white/10'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 text-center ${
              isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
            }`} style={{ 
              textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' 
            }}>
              {i18n.language === 'en' ? 'Edit time estimate' : 'Zeitschätzung bearbeiten'}
            </h3>
            
            <div className="mb-6">
              <input
                type="number"
                value={editTimeValue}
                onChange={(e) => setEditTimeValue(parseInt(e.target.value) || 0)}
                min="1"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg ${
                  isMinimalDesign
                    ? 'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                    : 'border-white/20 bg-white/10 text-white placeholder-white/50 backdrop-blur-sm'
                }`}
                autoFocus
              />
              <p className={`text-sm text-center mt-2 ${
                isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
              }`}>
                Minuten
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowTimeEditor(false)}
                className={`flex-1 px-4 py-2 transition-colors ${
                  isMinimalDesign
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleTimeUpdate(editTimeValue)}
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: state.preferences.accentColor }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCalendar(false)}
        >
          <div 
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${
              isMinimalDesign 
                ? 'bg-white dark:bg-gray-900'
                : 'glass-effect backdrop-blur-xl border border-white/10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-4 text-center ${
              isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
            }`} style={{ 
              textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' 
            }}>
              {i18n.language === 'en' ? 'Plan task' : 'Aufgabe planen'}
            </h3>
            <p className={`text-sm mb-6 text-center ${
              isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
            }`}>
              Wann möchtest du an dieser Aufgabe arbeiten?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleDateSelect(addDays(new Date(), 0))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                Heute
              </button>
              <button
                onClick={() => handleDateSelect(addDays(new Date(), 1))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                Morgen
              </button>
              <button
                onClick={() => handleDateSelect(addDays(new Date(), 7))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {i18n.language === 'en' ? 'Next week' : 'Nächste Woche'}
              </button>
              <button
                onClick={() => handleDateSelect(addDays(new Date(), 14))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                In 2 Wochen
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowCalendar(false)}
                className={`px-4 py-2 transition-colors ${
                  isMinimalDesign
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Review Modal */}
      {showNextReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${
            isMinimalDesign 
              ? 'bg-white dark:bg-gray-900'
              : 'glass-effect backdrop-blur-xl border border-white/10'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 text-center ${
              isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
            }`} style={{ 
              textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' 
            }}>
              {i18n.language === 'en' ? 'Review later' : 'Später erneut prüfen'}
            </h3>
            <p className={`text-sm mb-6 text-center ${
              isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
            }`}>
              Wann soll diese Aufgabe wieder zur Überprüfung angezeigt werden?
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleNextReviewDate(addDays(new Date(), 1))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                Morgen
              </button>
              <button
                onClick={() => handleNextReviewDate(addDays(new Date(), 7))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                In einer Woche
              </button>
              <button
                onClick={() => handleNextReviewDate(addDays(new Date(), 30))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                In einem Monat
              </button>
              <button
                onClick={() => handleNextReviewDate(addDays(new Date(), 90))}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-white/20 text-white/80 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                In 3 Monaten
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowNextReviewModal(false)}
                className={`px-4 py-2 transition-colors ${
                  isMinimalDesign
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Picker Modal */}
      {showPinPicker && currentTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPinPicker(false)}>
          <div 
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${
              isMinimalDesign 
                ? 'bg-white dark:bg-gray-900'
                : 'glass-effect backdrop-blur-xl border border-white/10'
            }`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 text-center ${
              isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
            }`} style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' }}>
              {i18n.language === 'en' ? 'Choose pin column' : 'Pin-Spalte wählen'}
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {state.pinColumns.map(col => (
                <button
                  key={col.id}
                  onClick={() => {
                    dispatch({ type: 'ASSIGN_TASK_TO_PIN', payload: { taskId: currentTask.id, pinColumnId: col.id } });
                    setShowPinPicker(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isMinimalDesign
                      ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color || state.preferences.accentColor }} />
                    <span className={isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}>{col.title}</span>
                  </div>
                  <Star className={isMinimalDesign ? 'text-gray-500' : 'text-white/70'} />
                </button>
              ))}
              {state.pinColumns.length === 0 && (
                <div className={isMinimalDesign ? 'text-gray-500' : 'text-white/70'}>
                  {i18n.language === 'en' ? 'No pin columns yet' : 'Keine Pin-Spalten vorhanden'}
                </div>
              )}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowPinPicker(false)} className={`px-4 py-2 rounded-md transition-colors ${
                isMinimalDesign ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200' : 'text-white/70 hover:text-white'
              }`}>
                {i18n.language === 'en' ? 'Close' : 'Schließen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 