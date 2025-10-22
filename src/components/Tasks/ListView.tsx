import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  DndContext, 
  DragOverlay, 
  pointerWithin,
  rectIntersection,
  useDroppable,
  useDndMonitor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Play, 
  Square, 
  GripVertical, 
  Calendar, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckSquare, 
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  Edit,
  Tag,
  Flag,
  User,
  MoreHorizontal,
  Star,
  AlertCircle,
  CalendarClock,
  FileText,
  Paperclip,
  MessageSquare,
  CheckCircle,
  Circle,
  BarChart3,
  Target,
  Zap,
  Settings,
  Search,
  X,
  Archive,
  Trash2,
  Copy,
  Move,
  Bookmark,
  Timer,
  PauseCircle,
  PlayCircle,
  Edit3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isToday, isTomorrow, isYesterday, differenceInDays, isPast, isFuture, isThisWeek, isThisMonth, formatDistanceToNow, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Task, Column } from '../../types';
import { SmartTaskModal } from './SmartTaskModal';
import { DropIndicator } from './DropIndicator';
import { TagDisplay } from '../Tags/TagDisplay';
import { playCompletionSound } from '../../utils/soundUtils';
import { ProjectTimebudgetDetailModal } from '../Projects/ProjectTimebudgetDetailModal';

interface ListViewProps {
  onTaskEdit?: (task: Task) => void;
  onTaskView?: (task: Task) => void;
  onTaskPlay?: (task: Task) => void;
}

interface ModernTaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  onPlayStop: (task: Task) => void;
  isTimerRunning: boolean;
  isFirst: boolean;
  isLast: boolean;
  column: Column;
  isDraggedOver?: boolean;
  showDropIndicator?: 'top' | 'bottom' | null;
  isBeingDragged?: boolean;
  viewMode: 'compact' | 'detailed' | 'cards';
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
}

interface TaskGroup {
  key: string;
  title: string;
  icon: React.ComponentType<any>;
  tasks: Task[];
  type: 'date' | 'project' | 'priority' | 'status';
  column?: Column;
  color?: string;
}

interface ViewOptions {
  viewMode: 'compact' | 'detailed' | 'cards';
  groupBy: 'date' | 'project' | 'priority' | 'status' | 'none';
  sortBy: 'priority' | 'dueDate' | 'created' | 'title' | 'progress';
  sortOrder: 'asc' | 'desc';
  showCompleted: boolean;
  showArchived: boolean;
  filterPriority: string[];
  filterTags: string[];
  filterProjects: string[];
  searchQuery: string;
}

// Draggable Sidebar Task Component
function SidebarTaskItem({ task, formatEstimatedTime }: { task: Task, formatEstimatedTime: (minutes: number) => string | null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: {
      type: 'sidebar-task',
      task: task,
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center justify-between p-2 hover:bg-gray-800 transition-colors cursor-move rounded"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">
          {task.title}
        </span>
        {task.estimatedTime && (
          <div className="flex items-center space-x-1 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {formatEstimatedTime(task.estimatedTime)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Erweiterte ModernTaskItem Komponente
function ModernTaskItem({ 
  task, 
  onEdit, 
  onView, 
  onPlayStop, 
  isTimerRunning, 
  isFirst, 
  isLast, 
  column, 
  isDraggedOver = false,
  showDropIndicator = null,
  isBeingDragged = false,
  viewMode = 'detailed',
  isSelected = false,
  onSelect
}: ModernTaskItemProps) {
  const { state, dispatch } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatTime = (minutes: number) => {
    // Return empty string for 0 minutes to prevent showing "0m"
    if (minutes === 0 || !minutes) {
      return '';
    }
    
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTimeDisplay = () => {
    const tracked = task.trackedTime || 0;
    const estimated = task.estimatedTime || 0;
    
    if (estimated > 0) {
      const percentage = Math.round((tracked / estimated) * 100);
      return {
        text: `${formatTime(tracked)} / ${formatTime(estimated)}`,
        percentage: Math.min(percentage, 100),
        isOvertime: tracked > estimated
      };
    }
    
    return {
      text: formatTime(tracked),
      percentage: 0,
      isOvertime: false
    };
  };

  const getProgressDisplay = () => {
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const totalSubtasks = task.subtasks.length;
    
    if (totalSubtasks > 0) {
      const percentage = Math.round((completedSubtasks / totalSubtasks) * 100);
      return {
        text: `${completedSubtasks}/${totalSubtasks}`,
        percentage,
        hasSubtasks: true
      };
    }
    
    return {
      text: task.completed ? 'Erledigt' : 'Offen',
      percentage: task.completed ? 100 : 0,
      hasSubtasks: false
    };
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Helper function to check if date is in next week
  const isNextWeek = (date: Date) => {
    const nextWeek = addWeeks(new Date(), 1);
    const startOfNextWeek = startOfWeek(nextWeek, { locale: de });
    const endOfNextWeek = endOfWeek(nextWeek, { locale: de });
    return date >= startOfNextWeek && date <= endOfNextWeek;
  };

  const getDueDateStatus = () => {
    if (!task.reminderDate) return null;
    
    const dueDate = parseISO(task.reminderDate);
    const now = new Date();
    
    if (isPast(dueDate) && !task.completed) {
      return { status: 'overdue', color: '#ef4444', text: 'Überfällig' };
    } else if (isToday(dueDate)) {
      return { status: 'today', color: '#f59e0b', text: 'Heute' };
    } else if (isTomorrow(dueDate)) {
      return { status: 'tomorrow', color: '#0ea5e9', text: 'Morgen' };
    } else if (isThisWeek(dueDate)) {
      return { status: 'thisWeek', color: '#10b981', text: 'Diese Woche' };
    } else if (isNextWeek(dueDate)) {
      return { status: 'nextWeek', color: '#8b5cf6', text: 'Nächste Woche' };
    }
    
    return { 
      status: 'future', 
      color: '#6b7280', 
      text: formatDistanceToNow(dueDate, { addSuffix: true, locale: de }) 
    };
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !task.completed;
    
    // Play completion sound if task is being completed
    if (newCompletedState && state.preferences.sounds) {
      playCompletionSound(state.preferences.completionSound, state.preferences.soundVolume).catch(console.warn);
    }
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        completed: newCompletedState,
        completedAt: newCompletedState ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const handlePlayStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayStop(task);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(task);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(task.id, !isSelected);
  };

  const timeDisplay = getTimeDisplay();
  const progressDisplay = getProgressDisplay();
  const dueDateStatus = getDueDateStatus();

  // Compact View
  if (viewMode === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`group relative flex items-center py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        } ${isBeingDragged ? 'opacity-50' : ''}`}
        onClick={handleView}
      >
        {showDropIndicator && (
          <DropIndicator 
            isVisible={true}
            position={showDropIndicator === 'top' ? 'top' : 'bottom'} 
          />
        )}
        
        <div className="flex items-center space-x-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              task.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            {task.completed && <CheckCircle className="w-3 h-3" />}
          </button>

          {/* Drag Handle */}
          <div 
            {...listeners}
            data-drag-handle
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`font-medium truncate ${
                task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </span>
              
              {/* Priority Indicator */}
              {task.priority && task.priority !== 'none' && (
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getPriorityColor() }}
                />
              )}
              
              {/* Due Date */}
              {dueDateStatus && (
                <span 
                  className="text-xs px-2 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: dueDateStatus.color }}
                >
                  {dueDateStatus.text}
                </span>
              )}
              
              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="flex space-x-1">
                  {task.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{task.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Timer */}
            <button
              onClick={handlePlayStop}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isTimerRunning ? 'Timer stoppen' : 'Timer starten'}
            >
              {isTimerRunning ? (
                <PauseCircle className="w-4 h-4 text-red-500" />
              ) : (
                <PlayCircle className="w-4 h-4 text-green-500" />
              )}
            </button>

            {/* Edit */}
            <button
              onClick={handleEdit}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4 text-gray-500" />
            </button>

            {/* Select */}
            <button
              onClick={handleSelect}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Auswählen"
            >
              <CheckSquare className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Card View
  if (viewMode === 'cards') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`group relative bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        } ${isBeingDragged ? 'opacity-50' : ''}`}
        onClick={handleView}
      >
        {showDropIndicator && (
          <DropIndicator 
            isVisible={true}
            position={showDropIndicator === 'top' ? 'top' : 'bottom'} 
          />
        )}
        
        <div className="flex items-start space-x-3">
          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              task.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            {task.completed && <CheckCircle className="w-3 h-3" />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-medium ${
                task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
              
              {/* Priority */}
              {task.priority && task.priority !== 'none' && (
                <div className="flex items-center space-x-1">
                  <Flag className="w-4 h-4" style={{ color: getPriorityColor() }} />
                  <span className="text-xs font-medium capitalize" style={{ color: getPriorityColor() }}>
                    {task.priority}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Progress Bar */}
            {progressDisplay.hasSubtasks && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Fortschritt</span>
                  <span className="text-xs font-medium">{progressDisplay.text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${progressDisplay.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Time Tracking */}
            {task.estimatedTime && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Zeit</span>
                  <span className="text-xs font-medium">{timeDisplay.text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${
                      timeDisplay.isOvertime ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(timeDisplay.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Due Date */}
              {dueDateStatus && (
                <span 
                  className="text-xs px-2 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: dueDateStatus.color }}
                >
                  {dueDateStatus.text}
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Timer */}
                <button
                  onClick={handlePlayStop}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={isTimerRunning ? 'Timer stoppen' : 'Timer starten'}
                >
                  {isTimerRunning ? (
                    <PauseCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-green-500" />
                  )}
                </button>

                {/* Edit */}
                <button
                  onClick={handleEdit}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Bearbeiten"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>

                {/* Select */}
                <button
                  onClick={handleSelect}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Auswählen"
                >
                  <CheckSquare className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Drag Handle */}
          <div 
            {...listeners}
            data-drag-handle
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  // Detailed View (Standard)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      } ${isBeingDragged ? 'opacity-50' : ''}`}
      onClick={handleView}
    >
             {showDropIndicator && (
         <DropIndicator 
           isVisible={true}
           position={showDropIndicator === 'top' ? 'top' : 'bottom'} 
         />
       )}
       
       <div className="flex items-start space-x-4 p-4">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            task.completed 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }`}
        >
          {task.completed && <CheckCircle className="w-3 h-3" />}
        </button>

        {/* Drag Handle */}
        <div 
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pt-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h3 className={`font-medium ${
                task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
              
              {/* Priority */}
              {task.priority && task.priority !== 'none' && (
                <div className="flex items-center space-x-1">
                  <Flag className="w-4 h-4" style={{ color: getPriorityColor() }} />
                  <span className="text-xs font-medium capitalize" style={{ color: getPriorityColor() }}>
                    {task.priority}
                  </span>
                </div>
              )}
            </div>

            {/* Timer Status */}
            {isTimerRunning && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Läuft</span>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="mb-3">
              <p className={`text-sm text-gray-600 dark:text-gray-400 ${
                showFullDescription ? '' : 'line-clamp-2'
              }`}>
                {task.description}
              </p>
              {task.description.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullDescription(!showFullDescription);
                  }}
                  className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                >
                  {showFullDescription ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Progress and Time */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Progress */}
            {progressDisplay.hasSubtasks && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Fortschritt</span>
                  <span className="text-xs font-medium">{progressDisplay.text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${progressDisplay.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Time Tracking */}
            {task.estimatedTime && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Zeit</span>
                  <span className="text-xs font-medium">{timeDisplay.text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${
                      timeDisplay.isOvertime ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(timeDisplay.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {/* Due Date */}
              {dueDateStatus && (
                <div className="flex items-center space-x-1">
                  <CalendarClock className="w-4 h-4" />
                  <span 
                    className="px-2 py-1 rounded-full text-white font-medium"
                    style={{ backgroundColor: dueDateStatus.color }}
                  >
                    {dueDateStatus.text}
                  </span>
                </div>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-4 h-4" />
                  <span>{task.attachments.length}</span>
                </div>
              )}

                             {/* Subtasks Count */}
               {task.subtasks && task.subtasks.length > 0 && (
                 <div className="flex items-center space-x-1">
                   <CheckSquare className="w-4 h-4" />
                   <span>{task.subtasks.length}</span>
                 </div>
               )}

              {/* Created/Updated */}
              <span>
                {task.updatedAt ? 
                  `Aktualisiert ${formatDistanceToNow(parseISO(task.updatedAt), { addSuffix: true, locale: de })}` :
                  `Erstellt ${formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true, locale: de })}`
                }
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Timer */}
              <button
                onClick={handlePlayStop}
                className={`p-2 rounded transition-all duration-200 ${
                  isTimerRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg hover:scale-105' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isTimerRunning ? 'Timer stoppen' : 'Timer starten'}
                onMouseEnter={() => setHoveredAction('timer')}
                onMouseLeave={() => setHoveredAction(null)}
              >
                {isTimerRunning ? (
                  <PauseCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4 text-green-500" />
                )}
              </button>

              {/* Edit */}
              <button
                onClick={handleEdit}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Bearbeiten"
                onMouseEnter={() => setHoveredAction('edit')}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </button>

              {/* Select */}
              <button
                onClick={handleSelect}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Auswählen"
                onMouseEnter={() => setHoveredAction('select')}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <CheckSquare className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
              </button>

              {/* More Actions */}
              <button
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Weitere Aktionen"
                onMouseEnter={() => setHoveredAction('more')}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DroppableSectionProps {
  id: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

function DroppableSection({ id, children, isEmpty = false }: DroppableSectionProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'column',
      columnId: id,
    },
  });

  const isDraggingTask = active?.data?.current?.type === 'task';
  const shouldShowDropIndicator = isDraggingTask && isOver && isEmpty;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[4rem] transition-all duration-200 ${
        shouldShowDropIndicator ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''
      }`}
    >
      {children}
      {shouldShowDropIndicator && (
        <div className="p-4">
          <DropIndicator isVisible={true} position="between" />
        </div>
      )}
    </div>
  );
}

interface ModernSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  taskCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  tasks: Task[];
  onTaskEdit: (task: Task) => void;
  onTaskView: (task: Task) => void;
  onTaskPlayStop: (task: Task) => void;
  activeTimerTaskId: string | null;
  column: Column;
  draggedTaskId: string | null;
  overId: string | null;
}

const ModernSection = React.memo(function ModernSection({
  title,
  icon: Icon,
  taskCount,
  isCollapsed,
  onToggle,
  tasks,
  onTaskEdit,
  onTaskView,
  onTaskPlayStop,
  activeTimerTaskId,
  column,
  draggedTaskId,
  overId
}: ModernSectionProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const accentColor = state.preferences.accentColor || '#0ea5e9';

  const handleAddTask = useCallback(() => {
    setShowSmartTaskModal(true);
  }, []);

  const handleCloseSmartTaskModal = useCallback(() => {
    setShowSmartTaskModal(false);
  }, []);

  // Calculate which tasks should show drop indicators
  const getDropIndicatorPosition = useCallback((taskId: string, index: number) => {
    if (!draggedTaskId || !overId) return null;
    
    // Don't show indicator on the dragged task itself
    if (taskId === draggedTaskId) return null;
    
    // Show indicator when hovering over a task
    if (taskId === overId) {
      // Determine if we should show above or below based on drag direction
      // This is a simplified approach - in a real implementation, you'd track mouse position
      return index === 0 ? 'top' : 'bottom';
    }
    
    return null;
  }, [draggedTaskId, overId]);

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div 
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({taskCount})
          </span>
        </div>
        
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div className="mt-2">
          <DroppableSection id={column.id} isEmpty={tasks.length === 0}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-2">
                  {tasks.map((task, index) => (
                    <ModernTaskItem
                      key={task.id}
                      task={task}
                      onEdit={onTaskEdit}
                      onView={onTaskView}
                      onPlayStop={onTaskPlayStop}
                      isTimerRunning={activeTimerTaskId === task.id}
                      isFirst={index === 0}
                      isLast={index === tasks.length - 1}
                      column={column}
                      isDraggedOver={overId === task.id && draggedTaskId !== task.id}
                      showDropIndicator={getDropIndicatorPosition(task.id, index)}
                      isBeingDragged={draggedTaskId === task.id}
                      viewMode='detailed'
                      isSelected={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  Keine Aufgaben
                </div>
              )}
            </SortableContext>
          </DroppableSection>

          {/* Add Task Button */}
          <button
            onClick={handleAddTask}
            className="mt-2 w-8 h-8 mx-auto rounded-full transition-all duration-300 flex items-center justify-center hover:scale-110"
            style={{
              backgroundColor: state.preferences.accentColor,
              color: 'white'
            }}
            title="Aufgabe hinzufügen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Smart Task Modal */}
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={handleCloseSmartTaskModal}
        targetColumn={column}
        placeholder={t('forms.create_new_task_for', { title })}
      />
    </div>
  );
});

export function ListView({ onTaskEdit, onTaskView, onTaskPlay }: ListViewProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [overId, setOverId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-task-sidebar-visible');
      if (saved !== null) return JSON.parse(saved);
      const savedMin = localStorage.getItem('taskfuchs-task-sidebar-minimized');
      if (savedMin !== null) return !JSON.parse(savedMin);
      return false;
    } catch {
      return false;
    }
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Project menu states
  const [contextMenuProject, setContextMenuProject] = useState<any>(null);
  const [showProjectContextMenu, setShowProjectContextMenu] = useState(false);
  const [editingProject, setEditingProject] = useState<{id: string, title: string} | null>(null);
  const [showProjectTimebudgetModal, setShowProjectTimebudgetModal] = useState<any>(null);

  // ✨ DnD Sensors for precise cursor tracking (fixes huge offset issue)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  // Initialize collapsed sections
  useEffect(() => {
    const initializeCollapsedSections = () => {
      const initialCollapsed = new Set<string>();
      
      // Auto-collapse sections with 0 tasks
      state.columns.forEach(column => {
        const columnTasks = state.tasks.filter(task => 
          task.columnId === column.id && 
          (!state.showCompletedTasks ? !task.completed : true)
        );
        
        if (columnTasks.length === 0) {
          initialCollapsed.add(column.id);
        }
      });
      
      setCollapsedSections(initialCollapsed);
    };

    initializeCollapsedSections();
  }, [state.tasks, state.columns, state.showCompletedTasks]);

  // Mount flag to defer transitions until after first paint
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Handle sidebar toggle events
  useEffect(() => {
    const handleToggleTaskSidebar = () => {
      setSidebarVisible(prev => {
        const newState = !prev;
        window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', {
          detail: { minimized: !newState }
        }));
        try { localStorage.setItem('taskfuchs-task-sidebar-visible', JSON.stringify(newState)); } catch {}
        return newState;
      });
    };

    window.addEventListener('toggle-task-sidebar', handleToggleTaskSidebar);
    
    // Send initial state to header
    window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', {
      detail: { minimized: !sidebarVisible }
    }));

    return () => {
      window.removeEventListener('toggle-task-sidebar', handleToggleTaskSidebar);
    };
  }, [sidebarVisible]);

  // Get tasks grouped by projects for sidebar
  const getProjectTasks = useMemo(() => {
    const projectColumns = state.columns.filter(col => col.type === 'project');
    const projectTasks = projectColumns.map(project => {
      const tasks = state.tasks.filter(task => 
        (task.projectId === project.id || task.columnId === project.id) &&
        !task.completed && 
        !task.archived &&
        task.columnId !== 'inbox' && // Exclude inbox tasks
        !task.columnId?.startsWith('date-') // Exclude already assigned tasks
      );
      
      return {
        project,
        tasks: tasks.sort((a, b) => {
          // Sort by priority, then by creation date
          const priorityOrder = { high: 4, medium: 3, low: 2, none: 1 };
          const aPriority = priorityOrder[a.priority || 'none'];
          const bPriority = priorityOrder[b.priority || 'none'];
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
      };
    }).filter(group => group.tasks.length > 0);

    return projectTasks;
  }, [state.tasks, state.columns]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const formatEstimatedTime = (minutes: number) => {
    if (!minutes || minutes === 0) return null;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes}min`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}min`;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = state.tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setOverId(null);
    
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find the task being dragged
    const activeTask = state.tasks.find(t => t.id === activeId);
    if (!activeTask) {
      setActiveTask(null);
      return;
    }

    // Check if this is a sidebar task being dragged
    const isSidebarTask = active.data.current?.type === 'sidebar-task';

    // Handle different drop scenarios
    if (over.data.current?.type === 'column') {
      // Dropped on a column
      const newColumnId = over.data.current.columnId;
      
      if (isSidebarTask || activeTask.columnId !== newColumnId) {
        // Move to different column (or assign from sidebar)
        const newPosition = state.tasks
          .filter(t => t.columnId === newColumnId)
          .length;
        
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            ...activeTask,
            columnId: newColumnId,
            position: newPosition,
            projectId: activeTask.projectId, // Keep project assignment
            updatedAt: new Date().toISOString()
          }
        });
      }
    } else if (over.data.current?.type === 'task' && !isSidebarTask) {
      // Dropped on another task
      const overTask = state.tasks.find(t => t.id === overId);
      if (overTask && activeTask.columnId === overTask.columnId) {
        // Reorder within same column
        const columnTasks = state.tasks
          .filter(t => t.columnId === activeTask.columnId)
          .sort((a, b) => a.position - b.position);
        
        const oldIndex = columnTasks.findIndex(t => t.id === activeTask.id);
        const newIndex = columnTasks.findIndex(t => t.id === overTask.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
          
          // Update positions
          reorderedTasks.forEach((task, index) => {
            dispatch({
              type: 'UPDATE_TASK',
              payload: {
                ...task,
                position: index,
                updatedAt: new Date().toISOString()
              }
            });
          });
        }
      }
    }

    setActiveTask(null);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverId(null);
  };

  const toggleSection = useCallback((sectionKey: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionKey)) {
      newCollapsed.delete(sectionKey);
    } else {
      newCollapsed.add(sectionKey);
    }
    setCollapsedSections(newCollapsed);
  }, [collapsedSections]);

  // Filter tasks based on preferences - memoized for performance
  const visibleTasks = useMemo(() => {
    return state.tasks.filter(task => {
    // NEW FLEXIBLE LOGIC: Show tasks in ListView based on multiple conditions
    
    // 1. Tasks with projectId but no reminderDate stay in project view only
    if (task.projectId && !task.reminderDate) {
      return false;
    }
    
    // 2. Tasks with projectId AND reminderDate are visible in both project and date planner
    // 3. Tasks without projectId are always shown in ListView
    // 4. Show completed tasks based on user preference
    
    if (!state.showCompletedTasks && task.completed) {
      return false;
    }
    
    return true;
  });
  }, [state.tasks, state.showCompletedTasks]);

  // Group tasks by date only - memoized for performance
  const dateGroups = useMemo(() => {
    const groups: TaskGroup[] = [];
    
    const dateColumns = state.columns
      .filter(col => col.type === 'date')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Date groups
    for (const column of dateColumns) {
      const columnTasks = visibleTasks
        .filter(task => task.columnId === column.id)
        .sort((a, b) => a.position - b.position);

      let title = column.title;
      if (column.date) {
        const date = parseISO(column.date);
        if (isToday(date)) {
          title = 'Heute';
        } else if (isTomorrow(date)) {
          title = 'Morgen';
        } else if (isYesterday(date)) {
          title = 'Gestern';
        } else {
          title = format(date, 'eeee, d. MMM', { locale: de });
        }
      }

      groups.push({
        key: column.id,
        title,
        icon: Calendar,
        tasks: columnTasks,
        type: 'date',
        column
      });
    }

    return groups;
  }, [visibleTasks, state.columns]);

  const handleTaskEdit = useCallback((task: Task) => {
    onTaskEdit?.(task);
  }, [onTaskEdit]);

  const handleTaskView = useCallback((task: Task) => {
    onTaskView?.(task);
  }, [onTaskView]);

  const handleTaskPlayStop = useCallback((task: Task) => {
    const isCurrentlyRunning = state.activeTimer?.taskId === task.id;
    
    if (isCurrentlyRunning) {
      dispatch({ type: 'STOP_TIMER' });
    } else {
      const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
      dispatch({ 
        type: 'START_TIMER', 
        payload: { taskId: task.id, mode: timerMode } 
      });
    }
  }, [state.activeTimer?.taskId, state.preferences?.pomodoro?.enabled, dispatch]);

  // Project menu handlers

  const handleSaveProjectRename = useCallback((newTitle: string) => {
    if (editingProject && newTitle.trim()) {
      dispatch({
        type: 'UPDATE_COLUMN',
        payload: {
          id: editingProject.id,
          title: newTitle.trim()
        }
      });
    }
    setEditingProject(null);
  }, [editingProject, dispatch]);

  const handleCancelProjectRename = useCallback(() => {
    setEditingProject(null);
  }, []);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={rectIntersection}
      sensors={sensors}
    >
    <div className="h-full w-full relative overflow-hidden flex">
      {/* Project Tasks Sidebar - Now with position relative, not absolute */}
      <div 
        className="flex-shrink-0 w-80 z-20 flex flex-col overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: '#23262A',
          borderRight: '1px solid #1f2937',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          width: sidebarVisible ? '320px' : '0px',
          marginLeft: sidebarVisible ? '0px' : '-320px',
        }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800" style={{ backgroundColor: '#23262A' }}>
          <h1 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Folder className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
            <span>{t('planner.projects')}</span>
          </h1>
          <div className="flex items-center justify-end mt-2">
            <span className="text-xs text-gray-400">
              {(() => {
                const count = getProjectTasks.reduce((total, group) => total + group.tasks.length, 0);
                return t(count === 1 ? 'planner.planner_task_count' : 'planner.planner_task_count_plural', { count });
              })()}
            </span>
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          {getProjectTasks.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Projekt-Aufgaben vorhanden</p>
            </div>
          ) : (
            <div className="space-y-1">
              {getProjectTasks.map(({ project, tasks }) => (
                <div key={project.id}>
                  {/* Project Header */}
                  <div className="relative">
                    {editingProject?.id === project.id ? (
                      // Edit mode
                      <div className="p-3 flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <Folder className="w-4 h-4 flex-shrink-0" style={{ color: state.preferences.accentColor }} />
                        <input
                          type="text"
                          value={editingProject.title}
                          onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveProjectRename(editingProject.title);
                            } else if (e.key === 'Escape') {
                              handleCancelProjectRename();
                            }
                          }}
                          onBlur={() => handleSaveProjectRename(editingProject.title)}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      // Normal mode with context menu
                      <div className="flex items-center w-full">
                        {/* Main project button - takes most of the space */}
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="flex items-center p-3 hover:bg-gray-800 transition-colors flex-1 min-w-0"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {expandedProjects.has(project.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-white font-medium text-sm min-w-0 flex-1 text-left truncate">
                              {project.title}
                            </span>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {tasks.length}
                            </span>
                          </div>
                        </button>
                        
                        {/* Three dots menu */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuProject(project);
                              setShowProjectContextMenu(!showProjectContextMenu || contextMenuProject?.id !== project.id);
                            }}
                            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                            title="Projektoptionen"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                            </svg>
                          </button>
                          
                          {/* Dropdown menu */}
                          {showProjectContextMenu && contextMenuProject?.id === project.id && (
                            <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                              {project.timebudget && (
                                <button
                                  onClick={() => {
                                    setShowProjectTimebudgetModal(project);
                                    setShowProjectContextMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>{t('projects.time_budget')}</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingProject({ id: project.id, title: project.title });
                                  setShowProjectContextMenu(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>{t('projects.rename_project')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(t('common.confirm_delete'))) {
                                    dispatch({ type: 'DELETE_COLUMN', payload: project.id });
                                  }
                                  setShowProjectContextMenu(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>{t('projects.delete_project')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Project Tasks */}
                  {expandedProjects.has(project.id) && (
                    <div className="pl-6 space-y-1">
                      {tasks.map(task => (
                        <SidebarTaskItem
                          key={task.id}
                          task={task}
                          formatEstimatedTime={formatEstimatedTime}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
            <div className="p-6 max-w-4xl mx-auto">
              <div className="space-y-6">
                {/* Date Groups */}
                <div className="flex items-center space-x-2 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('planner.day_planner')}</h2>
                </div>
                
                {dateGroups.map(group => (
                  <ModernSection
                    key={group.key}
                    title={group.title}
                    icon={group.icon}
                    taskCount={group.tasks.length}
                    isCollapsed={collapsedSections.has(group.key)}
                    onToggle={() => toggleSection(group.key)}
                    tasks={group.tasks}
                    onTaskEdit={handleTaskEdit}
                    onTaskView={handleTaskView}
                    onTaskPlayStop={handleTaskPlayStop}
                    activeTimerTaskId={state.activeTimer?.taskId || null}
                    column={group.column!}
                    draggedTaskId={activeTask?.id || null}
                    overId={overId}
                  />
                ))}
                
                {dateGroups.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('planner.no_tasks_available')}
                  </div>
                )}
              </div>
            </div>
        </div>

      {/* ✨ DragOverlay at top-level (outside scroll container) - styled like TaskCard for consistency */}
      <DragOverlay
        dropAnimation={{
          duration: 400,
          easing: 'cubic-bezier(0.23, 1, 0.320, 1)',
        }}
        style={{ zIndex: 9999 }}
      >
        {activeTask ? (
          <div 
            className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            style={{
              transform: 'scale(1.02) rotate(1deg)',
              filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.15))',
              opacity: 0.95,
              backdropFilter: 'blur(8px)',
            }}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {activeTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
    
    {/* Project Rename Modal */}
    {editingProject && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('projects.rename_project')}
          </h3>
          <input
            type="text"
            defaultValue={editingProject.title}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveProjectRename(e.currentTarget.value);
              } else if (e.key === 'Escape') {
                handleCancelProjectRename();
              }
            }}
            autoFocus
          />
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => handleSaveProjectRename((document.querySelector('input[type="text"]') as HTMLInputElement)?.value || '')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.save')}
            </button>
            <button
              onClick={handleCancelProjectRename}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Project Timebudget Modal */}
    {showProjectTimebudgetModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                 <ProjectTimebudgetDetailModal 
           project={showProjectTimebudgetModal}
           isOpen={true}
           onClose={() => setShowProjectTimebudgetModal(null)}
         />
      </div>
    )}
    
  );
} 