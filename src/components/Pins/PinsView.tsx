import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { createPortal } from 'react-dom';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, addDays, startOfWeek } from 'date-fns';
import { 
  DndContext, 
  DragOverlay, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useDraggable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Pin, 
  Plus, 
  Settings, 
  Edit2, 
  X, 
  MoreHorizontal,
  Trash2,
  FolderOpen,
  Sparkles,
  Columns,
  Focus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Folder,
  Filter,
  AlertCircle,
  Tag,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { CompactFilterBar, DateFilterOption, PriorityOption } from '../Common/CompactFilterBar';
import { TaskCard } from '../Tasks/TaskCard';
import { TaskColumn } from '../Tasks/TaskColumn';
import { TaskModal } from '../Tasks/TaskModal';
import { PinColumnManager } from './PinColumnManager';
import { Header } from '../Layout/Header';
import type { Task, PinColumn as PinColumnType, Column } from '../../types';

// Draggable Sidebar Task Component for Pins
function PinsSidebarTaskItem({ task, formatEstimatedTime }: { task: Task, formatEstimatedTime: (minutes: number) => string | null }) {
  const { t } = useTranslation();
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

  // Constrain transform to not allow leftward movement out of sidebar
  const constrainedTransform = transform ? {
    x: Math.max(0, transform.x),
    y: transform.y
  } : null;

  const style = {
    transform: constrainedTransform ? `translate3d(${constrainedTransform.x}px, ${constrainedTransform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 9998 : 1,
    scale: isDragging ? 1.02 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
  };

  const getPriorityBorderClass = (priority?: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return '';
    }
  };

  const hasPriority = task.priority && task.priority !== 'none';
  const priorityBorderClass = getPriorityBorderClass(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-3 py-2 mx-2 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow text-sm truncate ${
        hasPriority ? `border-l-2 ${priorityBorderClass}` : ''
      }`}
      title={task.title}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate flex-1 text-gray-800 dark:text-gray-200">{task.title}</span>
        {task.estimatedTime && task.estimatedTime > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {formatEstimatedTime(task.estimatedTime)}
          </span>
        )}
      </div>
    </div>
  );
}

export function PinsView() {
  const { state, dispatch } = useApp();
  const { actions, forms, titles, messages, pins } = useAppTranslation();
  const { t, i18n } = useTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Reactive dark mode check
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<PinColumnType | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // ✨ ANTI-JITTER: Stabilized overId with debounce to prevent rapid updates
  const [stableOverId, setStableOverId] = useState<string | null>(null);
  const overIdStabilizeRef = useRef<NodeJS.Timeout | null>(null);
  const lastOverIdRef = useRef<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Sidebar state - like ProjectKanbanBoard uses sidebarMinimized
  const [sidebarMinimized, setSidebarMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-pins-sidebar-minimized');
      return saved === 'true';
    } catch {
      return true; // Start minimized
    }
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showTodayTasks, setShowTodayTasks] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'anytime' | 'today' | 'tomorrow' | 'thisWeek'>('all');
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-pins-show-completed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [filterPinned, setFilterPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-pins-filter-pinned');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // ✨ ANTI-JITTER: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (overIdStabilizeRef.current) {
        clearTimeout(overIdStabilizeRef.current);
      }
    };
  }, []);
  
  // Listen for filter toggle event from Header
  useEffect(() => {
    const handleToggleFilter = () => {
      setShowFilterPanel(prev => !prev);
    };
    
    window.addEventListener('toggle-pins-filter', handleToggleFilter);
    return () => window.removeEventListener('toggle-pins-filter', handleToggleFilter);
  }, []);
  
  // Dispatch sidebar state to header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pins-sidebar-state-changed', {
      detail: { minimized: sidebarMinimized }
    }));
  }, [sidebarMinimized]);
  
  // Toggle sidebar - like Projects
  const toggleSidebar = useCallback(() => {
    setSidebarMinimized(prev => {
      const newState = !prev;
      try { localStorage.setItem('taskfuchs-pins-sidebar-minimized', String(newState)); } catch {}
      window.dispatchEvent(new CustomEvent('pins-sidebar-state-changed', {
        detail: { minimized: newState }
      }));
      return newState;
    });
  }, []);
  
  // Listen for toggle events from header
  useEffect(() => {
    const handleToggleSidebar = () => {
      toggleSidebar();
    };
    
    window.addEventListener('toggle-pins-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-pins-sidebar', handleToggleSidebar);
  }, [toggleSidebar]);
  
  // Toggle project expansion
  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);
  
  // Format estimated time helper
  const formatEstimatedTime = useCallback((minutes: number) => {
    if (!minutes || minutes <= 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }, []);
  
  // Get today's date column ID
  const todayColumnId = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return `date-${today}`;
  }, []);
  
  // Get tasks from today's date column (not already pinned)
  const todayTasks = useMemo(() => {
    return state.tasks
      .filter(task => 
        task.columnId === todayColumnId && 
        !task.completed && 
        !task.archived &&
        !task.pinColumnId // Not already pinned
      )
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [state.tasks, todayColumnId]);
  
  // Get project tasks (not already pinned)
  const projectTasks = useMemo(() => {
    const projects = state.columns.filter(col => col.type === 'project');
    return projects
      .map(project => ({
        project,
        tasks: state.tasks.filter(task => 
          task.projectId === project.id && 
          !task.completed && 
          !task.archived &&
          !task.pinColumnId // Not already pinned
        ).sort((a, b) => (a.position || 0) - (b.position || 0))
      }))
      .filter(group => group.tasks.length > 0);
  }, [state.tasks, state.columns]);

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

  // Horizontal scroll container ref (for wheel/arrow navigation like Planner/Projects)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Pin offset with persistence - remember which column was last viewed
  const [pinOffset, setPinOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-pins-offset');
      const offset = saved ? parseInt(saved, 10) : 0;
      return isNaN(offset) ? 0 : offset;
    } catch {
      return 0;
    }
  });
  
  // Save pinOffset to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('taskfuchs-pins-offset', String(pinOffset));
    } catch {
      // Ignore localStorage errors
    }
  }, [pinOffset]);
  
  // Validate pinOffset when pin columns change (e.g., columns deleted)
  useEffect(() => {
    const visible = (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) || 3;
    const totalColumns = state.pinColumns.length + 1; // +1 for "Add Column" button
    const maxOffset = Math.max(0, totalColumns - visible);
    if (pinOffset > maxOffset) {
      setPinOffset(maxOffset);
    }
  }, [state.pinColumns.length, state.preferences.columns.pinsVisible, state.preferences.columns.visible, pinOffset]);

  // Helper function to navigate columns (includes "Add Column" button as +1)
  const navigateColumns = useCallback((direction: 'prev' | 'next') => {
    const visible = (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) || 3;
    const totalColumns = state.pinColumns.length + 1; // +1 for "Add Column" button
    const maxOffset = Math.max(0, totalColumns - visible);
    const step = direction === 'next' ? 1 : -1;
    setPinOffset((prev) => Math.min(maxOffset, Math.max(0, prev + step)));
  }, [state.pinColumns.length, state.preferences.columns.visible, state.preferences.columns.pinsVisible]);

  // SHIFT + wheel navigation is handled globally in App.tsx via 'pins-column-navigate' event

  // Listen for column navigation from ColumnSwitcher arrows and global SHIFT+wheel
  useEffect(() => {
    const handleColumnNavigate = (e: CustomEvent<{ direction: 'prev' | 'next' }>) => {
      navigateColumns(e.detail.direction);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInputFocused) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!scrollContainerRef.current) return;
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 'next' : 'prev';
        navigateColumns(direction);
      }
    };

    window.addEventListener('column-navigate', handleColumnNavigate as EventListener);
    window.addEventListener('pins-column-navigate', handleColumnNavigate as EventListener);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('column-navigate', handleColumnNavigate as EventListener);
      window.removeEventListener('pins-column-navigate', handleColumnNavigate as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateColumns]);

  // Get visible pin columns with offset like ProjectKanbanBoard
  // Includes "Add Column" button as null in the result array
  const displayColumns = useMemo(() => {
    const allColumns = [...state.pinColumns].sort((a, b) => a.order - b.order);
    const visibleColumnCount = state.preferences.columns.pinsVisible ?? state.preferences.columns.visible;
    const totalItems = allColumns.length + 1; // +1 for "Add Column" button
    const result: (PinColumnType | null | undefined)[] = [];
    
    // Fill exactly visibleColumnCount slots
    for (let i = 0; i < visibleColumnCount; i++) {
      const itemIndex = pinOffset + i;
      if (itemIndex < allColumns.length) {
        // Regular column
        result.push(allColumns[itemIndex]);
      } else if (itemIndex === allColumns.length) {
        // "Add Column" button position
      result.push(null);
      } else {
        // Empty slot (beyond "Add Column")
        result.push(undefined);
    }
    }
    
    return result;
  }, [state.pinColumns, state.preferences.columns.visible, state.preferences.columns.pinsVisible, pinOffset]);

  // Dispatch scroll state for ColumnSwitcher arrows
  useEffect(() => {
    const visibleCount = state.preferences.columns.pinsVisible ?? state.preferences.columns.visible;
    const totalColumns = state.pinColumns.length + 1; // +1 for "Add Column" button
    const canPrev = pinOffset > 0;
    const canNext = pinOffset + visibleCount < totalColumns;
    window.dispatchEvent(new CustomEvent('column-scroll-state', { 
      detail: { canPrev, canNext } 
    }));
  }, [pinOffset, state.pinColumns.length, state.preferences.columns.pinsVisible, state.preferences.columns.visible]);

  // Tasks grouped by pin column with filtering
  const tasksByPinColumn = useMemo(() => {
    const tasksByColumn: Record<string, Task[]> = {};
    
    state.pinColumns.forEach(column => {
      tasksByColumn[column.id] = [];
    });

    state.tasks
      .filter(task => {
        // Basic filters
        if (!task.pinColumnId || task.completed || task.archived) return false;
        
        // Priority filter
        if (priorityFilter !== 'all') {
          const taskPriority = task.priority || 'none';
          if (priorityFilter === 'none') {
            if (taskPriority !== 'none' && task.priority) return false;
          } else {
            if (taskPriority !== priorityFilter) return false;
          }
        }
        
        // Tag filters
        if (tagFilters.length > 0) {
          const hasMatchingTag = tagFilters.some(filterTag => 
            task.tags.includes(filterTag)
          );
          if (!hasMatchingTag) return false;
        }
        
        // Date filter
        if (dateFilter !== 'all') {
          const today = startOfDay(new Date());
          const tomorrow = addDays(today, 1);
          const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
          const weekEnd = addDays(weekStart, 6); // Sunday
          
          // Get task date from various sources
          const getTaskDate = () => {
            if (task.dueDate) return startOfDay(new Date(task.dueDate));
            if (task.deadline) return startOfDay(new Date(task.deadline));
            if (task.reminderDate) return startOfDay(new Date(task.reminderDate));
            // Check if assigned to date column
            if (task.columnId) {
              const dateColumn = state.columns.find(col => col.id === task.columnId && col.type === 'date');
              if (dateColumn?.date) return startOfDay(new Date(dateColumn.date));
            }
            return null;
          };
          
          const taskDate = getTaskDate();
          
          switch (dateFilter) {
            case 'overdue':
              // Only show tasks with date in the past (before today)
              if (!taskDate || taskDate >= today) return false;
              break;
            case 'anytime':
              // Only show tasks WITHOUT any date
              if (taskDate !== null) return false;
              break;
            case 'today':
              // Only show tasks for today
              if (!taskDate || taskDate.getTime() !== today.getTime()) return false;
              break;
            case 'tomorrow':
              // Only show tasks for tomorrow
              if (!taskDate || taskDate.getTime() !== tomorrow.getTime()) return false;
              break;
            case 'thisWeek':
              // Only show tasks for this week (Monday to Sunday)
              if (!taskDate || taskDate < weekStart || taskDate > weekEnd) return false;
              break;
          }
        }
        
        return true;
      })
      .forEach(task => {
        if (tasksByColumn[task.pinColumnId!]) {
          tasksByColumn[task.pinColumnId!].push(task);
        }
      });

    Object.keys(tasksByColumn).forEach(columnId => {
      tasksByColumn[columnId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return tasksByColumn;
  }, [state.tasks, state.pinColumns, state.columns, priorityFilter, tagFilters, dateFilter]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'pin-column') {
      const column = state.pinColumns.find(c => c.id === active.id);
      setActiveColumn(column || null);
    } else if (activeData?.type === 'sidebar-task') {
      // Sidebar task being dragged
      const task = activeData.task as Task;
      setActiveTask(task || null);
    } else {
      const task = state.tasks.find(t => t.id === active.id);
      setActiveTask(task || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const newOverId = over ? over.id as string : null;
    
    // ✨ ANTI-JITTER: Only update if overId actually changed
    if (newOverId === lastOverIdRef.current) return;
    lastOverIdRef.current = newOverId;
    
    // Clear any pending stabilization
    if (overIdStabilizeRef.current) {
      clearTimeout(overIdStabilizeRef.current);
    }
    
    // Set raw overId immediately for responsive feedback
    setOverId(newOverId);
    
    // ✨ STABILIZED: Debounce the stable overId to prevent rapid flickering
    // This prevents the drop indicator from flickering when moving between elements
    overIdStabilizeRef.current = setTimeout(() => {
      setStableOverId(newOverId);
    }, 16); // ~1 frame delay for stability without noticeable lag
  };

  // Helper function to normalize task positions in pin columns
  const normalizeTaskPositions = (tasks: Task[], pinColumnIds: string[]) => {
    const normalizedTasks = [...tasks];
    
    pinColumnIds.forEach(pinColumnId => {
      const columnTasks = normalizedTasks
        .filter(task => task.pinColumnId === pinColumnId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Reassign positions starting from 0 with no gaps
      columnTasks.forEach((task, index) => {
        const taskIndex = normalizedTasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          normalizedTasks[taskIndex] = {
            ...normalizedTasks[taskIndex],
            position: index,
            updatedAt: new Date().toISOString()
          };
        }
      });
    });
    
    return normalizedTasks;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveColumn(null);
    setOverId(null);
    setStableOverId(null);
    lastOverIdRef.current = null;
    
    // Clear any pending stabilization timer
    if (overIdStabilizeRef.current) {
      clearTimeout(overIdStabilizeRef.current);
      overIdStabilizeRef.current = null;
    }

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const isSidebarTask = activeData?.type === 'sidebar-task';

    // Pin column reordering
    if (activeData?.type === 'pin-column' && overData?.type === 'pin-column') {
      const activeIndex = state.pinColumns.findIndex(col => col.id === active.id);
      const overIndex = state.pinColumns.findIndex(col => col.id === over.id);
      
      if (activeIndex !== overIndex) {
        const reorderedColumns = arrayMove(state.pinColumns, activeIndex, overIndex);
        const updatedColumns = reorderedColumns.map((col, index) => ({
          ...col,
          order: index,
          updatedAt: new Date().toISOString()
        }));
        
        dispatch({
          type: 'REORDER_PIN_COLUMNS',
          payload: updatedColumns
        });
      }
      return;
    }

    // Get the active task (either from sidebar or regular drag)
    const draggedTask = isSidebarTask ? (activeData?.task as Task) : activeTask;
    if (!draggedTask) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Task drag & drop (both sidebar and regular tasks)
    if (isSidebarTask || activeData?.type === 'task') {
      
      // Dropping on pin column (empty area or column itself)
    const targetPinColumn = state.pinColumns.find(col => col.id === overId);
    if (targetPinColumn) {
      const columnTasks = state.tasks
        .filter(task => task.pinColumnId === targetPinColumn.id && task.id !== activeId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const newPosition = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position || 0)) + 1 : 0;
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
            ...draggedTask,
          pinColumnId: targetPinColumn.id,
          pinned: true,
          position: newPosition,
          updatedAt: new Date().toISOString()
        }
      });
        
        console.log('📌 Task pinned to column:', {
          taskId: draggedTask.id,
          taskTitle: draggedTask.title,
          pinColumn: targetPinColumn.title
      });
      return;
    }

      // Dropping on another task in a pin column
    const overTask = state.tasks.find(t => t.id === overId);
    if (overTask && overTask.pinColumnId) {
      const targetColumnId = overTask.pinColumnId;
        const isSameColumn = draggedTask.pinColumnId === targetColumnId;
        const activeTaskPosition = draggedTask.position || 0;
      const targetPosition = overTask.position || 0;
      
        // Calculate new position
        let newPosition = targetPosition;
        
        if (isSameColumn) {
          // Within same column: determine if we're moving up or down
          if (activeTaskPosition < targetPosition) {
            // Moving down
            newPosition = targetPosition;
          } else {
            // Moving up
            newPosition = targetPosition;
          }
        }

        // Update all tasks with proper position management
      const updatedTasks = state.tasks.map(task => {
        if (task.id === activeId) {
            // Update the active task
          return {
            ...task,
            pinColumnId: targetColumnId,
            pinned: true,
              position: newPosition,
            updatedAt: new Date().toISOString()
          };
        } else if (task.pinColumnId === targetColumnId && task.id !== activeId) {
            // Handle position shifts in target column
            if (isSameColumn) {
              // Same column movement
              if (activeTaskPosition < targetPosition && (task.position || 0) > activeTaskPosition && (task.position || 0) <= targetPosition) {
                // Moving down: shift tasks between old and new position up
                return {
                  ...task,
                  position: (task.position || 0) - 1,
                  updatedAt: new Date().toISOString()
                };
              } else if (activeTaskPosition > targetPosition && (task.position || 0) >= targetPosition && (task.position || 0) < activeTaskPosition) {
                // Moving up: shift tasks between new and old position down
            return {
              ...task,
              position: (task.position || 0) + 1,
                  updatedAt: new Date().toISOString()
                };
              }
            } else {
              // Different column: shift tasks at or after target position down
              if ((task.position || 0) >= newPosition) {
                return {
                  ...task,
                  position: (task.position || 0) + 1,
                  updatedAt: new Date().toISOString()
                };
              }
            }
          } else if (!isSameColumn && task.pinColumnId === draggedTask.pinColumnId && task.id !== activeId) {
            // Handle position shifts in source column (only for cross-column moves)
            if ((task.position || 0) > activeTaskPosition) {
              return {
                ...task,
                position: (task.position || 0) - 1,
              updatedAt: new Date().toISOString()
            };
          }
        }
        return task;
      });

        // Normalize positions to ensure no gaps
        const columnsToNormalize = isSameColumn 
          ? [targetColumnId] 
          : [targetColumnId, draggedTask.pinColumnId].filter(Boolean) as string[];
        const normalizedTasks = normalizeTaskPositions(updatedTasks, columnsToNormalize);

      dispatch({
        type: 'SET_TASKS',
          payload: normalizedTasks
      });
        
        console.log('📌 Task repositioned in pin column:', {
          taskId: draggedTask.id,
          taskTitle: draggedTask.title,
          fromColumn: draggedTask.pinColumnId,
          toColumn: targetColumnId,
          fromPosition: activeTaskPosition,
          toPosition: newPosition,
          isSameColumn
        });
        return;
      }
    }
  };

  // Task modal handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  // Column management
  const handleStartEditColumn = (columnId: string, currentTitle: string) => {
    setEditingColumnId(columnId);
    setEditingColumnTitle(currentTitle);
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleSaveColumnTitle = (columnId: string, title: string) => {
    const column = state.pinColumns.find(col => col.id === columnId);
    if (column) {
      // If title is empty, use default "Neue Spalte" text
      const finalTitle = title.trim() || pins.newColumn();
      dispatch({
        type: 'UPDATE_PIN_COLUMN',
        payload: {
          ...column,
          title: finalTitle,
          updatedAt: new Date().toISOString()
        }
      });
    }
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleColumnTitleChange = (columnId: string, title: string) => {
    setEditingColumnTitle(title);
  };

  const handleDeleteColumn = (columnId: string) => {
    // Remove column
    dispatch({ type: 'DELETE_PIN_COLUMN', payload: columnId });
    
    // Unpin all tasks from this column
    const updatedTasks = state.tasks.map(task => {
      if (task.pinColumnId === columnId) {
        return {
          ...task,
          pinColumnId: undefined,
          pinned: false,
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });
    
    dispatch({
      type: 'SET_TASKS',
      payload: updatedTasks
    });
  };

  const handleAddColumn = () => {
    const newColumn: PinColumnType = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: pins.newColumn(),
      color: state.preferences.accentColor,
      order: state.pinColumns.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    dispatch({ type: 'ADD_PIN_COLUMN', payload: newColumn });
    
    setTimeout(() => {
      // Start editing with empty string so user can type directly
      handleStartEditColumn(newColumn.id, '');
    }, 100);
  };

  const handleColumnManager = () => {
    setShowColumnManager(true);
  };

  // Column count handler
  const handleColumnCountChange = (count: number) => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { 
        columns: { 
          ...state.preferences.columns, 
          pinsVisible: count 
        } 
      } 
    });
  };

  // Sortable pin column component
  const SortablePinColumn = ({ column, tasks }: { column: PinColumnType; tasks: Task[] }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: column.id,
      data: {
        type: 'pin-column',
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Convert pin column to regular column format for TaskColumn
    const columnForTaskColumn = {
      id: column.id,
      title: column.title,
      color: column.color,
      position: column.order,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt,
      projectId: 'pins',
      type: 'project' as const,
      order: column.order,
      tasks: []
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes}
        className="flex-1 min-w-0 transition-all duration-200"
      >
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <TaskColumn
            column={columnForTaskColumn}
            tasks={tasks}
            overId={stableOverId} // ✨ Use stabilized overId to prevent jitter
            activeTask={activeTask}
            activeColumn={activeColumn}
            onSmartTaskAdd={undefined} // Disabled for pins
            showCompletedTasks={showCompletedTasks}
            isProjectColumn={true} // ✨ Treat pins like projects for immediate updates
            isEditing={editingColumnId === column.id}
            editingTitle={editingColumnTitle}
            onStartEdit={handleStartEditColumn}
            onCancelEdit={handleCancelEditColumn}
            onSaveEdit={handleSaveColumnTitle}
            onTitleChange={handleColumnTitleChange}
            projectId={undefined}
            kanbanColumnId={column.id}
            dragListeners={listeners}
            isDragging={isDragging}
            onDeleteColumn={handleDeleteColumn}
            isPinColumn={true}
            onColumnManager={handleColumnManager}
          />
        </SortableContext>
      </div>
    );
  };

  // Render columns
  const renderColumns = (columns: (PinColumnType | null | undefined)[]) => {
    const result = [];
    const realColumnsCount = columns.filter(c => c && c !== null && c !== undefined).length;
    const isSingle = realColumnsCount === 1 && (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === 1;
    
    for (let index = 0; index < columns.length; index++) {
      const column = columns[index];
      
      if (column === null) {
        // Add Column button
        result.push(
          <button
            key={`add-column-${index}`}
            onClick={() => handleAddColumn()}
            className={`flex flex-col items-center justify-center min-h-[120px] flex-1 min-w-0 rounded-lg transition-all duration-200 group ${
              isMinimalDesign
                ? 'border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                : 'backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-2 border-dashed border-white/40 dark:border-gray-600/50 hover:bg-white/40 dark:hover:bg-gray-900/50 hover:border-white/60 dark:hover:border-gray-500/60'
            }`}
            style={isMinimalDesign ? {
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF'
            } : undefined}
            title={pins.addNewColumn()}
          >
            <Plus className={`w-6 h-6 mb-1 transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200'
                : 'text-gray-700 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white'
            }`} />
            <span className={`text-xs font-medium transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200'
                : 'text-gray-700 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white'
            }`}>
              {pins.addColumn()}
            </span>
          </button>
        );
      } else if (column === undefined) {
        // Empty slot
        result.push(
          <div key={`empty-${index}`} className="flex-1 min-w-0">
            <div className="h-32"></div>
          </div>
        );
      } else {
        // Regular column
        const tasks = tasksByPinColumn[column.id] || [];
        const node = (
          <SortablePinColumn
            key={column.id}
            column={column}
            tasks={tasks}
          />
        );
        if (isSingle) {
          result.push(
            <div key={`single-wrap-${column.id}`} style={{ flex: '0 0 600px', maxWidth: 600, width: 600, margin: '0 auto' }}>
              {node}
            </div>
          );
        } else {
          result.push(node);
        }
      }
    }
    
    return result;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`h-full w-full flex overflow-hidden ${
        isMinimalDesign ? 'bg-white dark:bg-[#111827]' : ''
      }`}>
        
        {/* Sidebar - styled like ProjectKanbanBoard */}
        <div 
          className={`flex-shrink-0 h-full flex flex-col overflow-hidden transition-all duration-300 border-r ${
            isMinimalDesign
              ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-white/20 dark:border-gray-700/30'
          }`}
          style={{ 
            boxShadow: isMinimalDesign ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
            width: sidebarMinimized ? '0px' : '320px',
            minWidth: sidebarMinimized ? '0px' : '320px',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar Header - solid, not glass */}
          <div 
            className="relative flex items-center px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]"
            style={{ 
              height: '68px',
              minHeight: '68px',
              maxHeight: '68px',
              boxSizing: 'border-box'
            }}
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-lg font-semibold flex items-center space-x-2 text-gray-900 dark:text-white">
                <Pin className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
                <span>{t('pins.title') || 'Pins'}</span>
              </h1>
            </div>
          </div>
          
          {/* Hint Section */}
          <div className={`px-4 py-3 border-b ${
            isMinimalDesign
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
              : (isDarkMode ? 'border-white/15 bg-transparent' : 'border-gray-300/50 bg-white/30')
          }`}>
            <p className={`text-xs ${
              isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')
            }`}>
              {t('pins.drag_tasks_hint')}
            </p>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            {/* Today's Tasks Section */}
            <div className="mb-4">
              <button
                onClick={() => setShowTodayTasks(!showTodayTasks)}
                className={`w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" style={{ color: state.preferences.accentColor }} />
                  <span className={`text-sm font-medium ${
                    isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}>
                    Heute
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isMinimalDesign 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                  }`}>
                    {todayTasks.length}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                  showTodayTasks ? 'rotate-180' : ''
                } ${isMinimalDesign ? 'text-gray-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`} />
              </button>
              
              {showTodayTasks && (
                <div className="mt-1">
                  {todayTasks.length === 0 ? (
                    <p className={`px-4 py-2 text-xs italic ${
                      isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? 'text-gray-500' : 'text-gray-500')
                    }`}>
                      {t('pins.no_tasks_today')}
                    </p>
                  ) : (
                    todayTasks.map(task => (
                      <PinsSidebarTaskItem
                        key={task.id}
                        task={task}
                        formatEstimatedTime={formatEstimatedTime}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Divider */}
            <div className={`mx-4 border-t ${
              isMinimalDesign ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200/50 dark:border-gray-700/50'
            }`} />
            
            {/* Project Tasks Section */}
            <div className="mt-4">
              <div className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {t('pins.project_tasks')}
              </div>
              
              {projectTasks.length === 0 ? (
                <div className={`px-4 py-4 text-center ${
                  isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                }`}>
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{t('pins.no_project_tasks')}</p>
                </div>
              ) : (
                projectTasks.map(({ project, tasks: projTasks }) => (
                  <div key={project.id} className="mb-2">
                    <button
                      onClick={() => toggleProject(project.id)}
                      className={`w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color || state.preferences.accentColor }}
                        />
                        <span className={`text-sm font-medium truncate ${
                          isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                        }`}>
                          {project.title}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          isMinimalDesign 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                        }`}>
                          {projTasks.length}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
                        expandedProjects.has(project.id) ? 'rotate-180' : ''
                      } ${isMinimalDesign ? 'text-gray-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`} />
                    </button>
                    
                    {expandedProjects.has(project.id) && (
                      <div className="mt-1">
                        {projTasks.map(task => (
                          <PinsSidebarTaskItem
                            key={task.id}
                            task={task}
                            formatEstimatedTime={formatEstimatedTime}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div 
          className="flex-1 h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className={`flex-shrink-0 border-b shadow-sm ${
            isMinimalDesign
              ? 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800'
              : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200/60 dark:border-gray-700/60'
          }`}>
            <Header currentView="pins" />
          </div>

          {/* Compact Filter Bar - Elegant & Space-Efficient */}
          {(showFilterPanel || filterPinned) && (
            <div className="mx-4 mt-3">
              <CompactFilterBar
                priorityFilter={priorityFilter as PriorityOption | 'all'}
                dateFilter={dateFilter as DateFilterOption}
                tagFilters={tagFilters}
                showCompleted={showCompletedTasks}
                availableTags={state.tags.filter(tag => tag.count > 0).sort((a, b) => b.count - a.count)}
                onPriorityChange={(priority) => setPriorityFilter(priority)}
                onDateFilterChange={(filter) => setDateFilter(filter)}
                onTagToggle={(tagName) => {
                  if (tagFilters.includes(tagName)) {
                    setTagFilters(prev => prev.filter(t => t !== tagName));
                  } else {
                    setTagFilters(prev => [...prev, tagName]);
                  }
                }}
                onShowCompletedToggle={() => {
                  const newValue = !showCompletedTasks;
                  setShowCompletedTasks(newValue);
                  try { 
                    localStorage.setItem('taskfuchs-pins-show-completed', String(newValue)); 
                  } catch {}
                }}
                onShowCompletedToggle={() => {}}
                onClearAll={() => {
                          setPriorityFilter('all');
                          setTagFilters([]);
                  setDateFilter('all');
                }}
                accentColor={state.preferences.accentColor}
                isDarkMode={isDarkMode}
                isMinimalDesign={isMinimalDesign}
                isPinned={filterPinned}
                onPinnedChange={(pinned) => {
                  setFilterPinned(pinned);
                  try { localStorage.setItem('taskfuchs-pins-filter-pinned', String(pinned)); } catch {}
                  if (pinned) {
                    setShowFilterPanel(true);
                            }
                          }}
                isVisible={true}
                onClose={() => setShowFilterPanel(false)}
              />
            </div>
          )}

          {/* Board Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col relative px-4 pb-4" style={{ paddingTop: '35px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: 'auto', 
                gap: '12px',
                padding: '0',
                alignItems: 'stretch',
                width: '100%'
              }}>
                {displayColumns.length > 0 && (
                  <div 
                    ref={scrollContainerRef}
                    style={{ 
                      display: 'flex', 
                      gap: isMinimalDesign ? '5px' : '9px',
                      flex: 1,
                      alignItems: 'flex-start',
                      width: '100%',
                      marginTop: '0',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E1 #F1F5F9',
                      minWidth: 0,
                      position: 'relative',
                      outline: 'none'
                    }}
                  >
                    <SortableContext
                      items={displayColumns.filter((c): c is PinColumnType => !!c).map((c) => c.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {renderColumns(displayColumns)}
                    </SortableContext>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column Count Controls - Dynamically positioned */}
        {(() => {
          // PinsView uses the standard 80px sidebar
          const sidebarWidth = state.isNoteEditorFullScreen ? 0 : 80;
          const sidebarOffset = sidebarWidth / 2; // Half of sidebar width for centering
          
          return (
            <div 
              className="fixed bottom-4 z-30 transition-all duration-500 ease-in-out"
              style={{
                left: `calc(50% + ${sidebarOffset}px)`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-2 py-1 shadow-lg border border-gray-200 dark:border-gray-700">
                {[1, 3, 5, 7].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleColumnCountChange(count)}
                    className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                      (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === count
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={(state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === count ? { backgroundColor: state.preferences.accentColor } : {}}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Drag Overlay - Minimalist style like Planer */}
        <DragOverlay
          dropAnimation={null}
          style={{ 
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {activeTask && (
            <TaskCard
              task={activeTask}
              isInDragOverlay={true}
            />
          )}
        </DragOverlay>

        {/* Task Modal (rendered via portal to avoid container interference) */}
        {isTaskModalOpen && selectedTask && createPortal(
          <TaskModal
            // Always use freshest task instance from store (important during timer updates)
            task={state.tasks.find(t => t.id === selectedTask.id) || selectedTask}
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
          />,
          document.body
        )}

        {/* Pin Column Manager Modal */}
        <PinColumnManager
          isOpen={showColumnManager}
          onClose={() => setShowColumnManager(false)}
        />
      </div>
    </DndContext>
  );
} 