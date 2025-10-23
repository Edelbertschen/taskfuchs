import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  DndContext, 
  DragOverlay, 
  rectIntersection,
  getFirstCollision,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, ChevronDown, ChevronUp, FolderClosed, Folder, Clock, X, Filter, AlertCircle, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { EventCard } from './EventCard';

import { ProjectToggle } from '../Projects/ProjectToggle';
import { TaskModal } from './TaskModal';
import { SmartTaskModal } from './SmartTaskModal';

import type { Task, Column } from '../../types';
import { format, addDays, startOfDay, isAfter, isBefore, isToday, parseISO, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { getBackgroundStyles, getDarkModeBackgroundStyles, getBackgroundOverlayStyles } from '../../utils/backgroundUtils';
import { Header } from '../Layout/Header';
import { MobilePullToRefresh } from '../Common/MobilePullToRefresh';

// Project Column Selection Modal
function ProjectColumnSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectColumn, 
  project, 
  task 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectColumn: (columnId: string) => void;
  project: any;
  task: Task;
}) {
  const { state } = useApp();
  
  if (!isOpen || !project) return null;

  // Get project's Kanban columns
  const projectColumns = state.viewState.projectKanban.columns?.filter(col => col.projectId === project.id) || [];
  
  // Add default project column
  const allColumns = [
    { id: project.id, title: 'Projektaufgaben', isDefault: true },
    ...projectColumns.map(col => ({ id: col.id, title: col.title, isDefault: false }))
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spalte auswählen
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Aufgabe "<strong>{task.title}</strong>" zu Projekt "<strong>{project.title}</strong>" hinzufügen:
          </p>
          
          {/* Column Options */}
          <div className="space-y-2">
            {allColumns.map((column) => (
              <button
                key={column.id}
                onClick={() => onSelectColumn(column.id)}
                className="w-full p-3 text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {column.title}
                </div>
                {column.isDefault && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Standard-Spalte
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Draggable Sidebar Task Component
function SidebarTaskItem({ task, formatEstimatedTime }: { task: Task, formatEstimatedTime: (minutes: number) => string | null }) {
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
    x: Math.max(0, transform.x), // Don't allow negative X (leftward movement)
    y: transform.y
  } : null;

  const style = {
    transform: constrainedTransform ? `translate3d(${constrainedTransform.x}px, ${constrainedTransform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 9998 : 1, // Ensure sidebar tasks are visible when dragging (below DragOverlay)
    scale: isDragging ? 1.02 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
  };

  const getPriorityBorderClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      case 'none':
      default:
        return ''; // No border for no priority
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
      className={`flex flex-col p-3 transition-all duration-200 cursor-move rounded-lg mx-3 mb-2 bg-white border border-gray-300 min-w-0 shadow-sm ${
        hasPriority ? `border-l-4 ${priorityBorderClass}` : ''
      } ${
        isDragging 
          ? 'bg-gray-50 border-gray-400 shadow-2xl ring-2 ring-blue-500/30' 
          : 'hover:bg-gray-50 hover:shadow-md'
      }`}
    >
      <div className="flex-1 min-w-0 mb-1">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
          {task.title}
        </h4>
      </div>
      
      <div className="flex items-center space-x-1 min-w-0">
        <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <span className="text-xs text-gray-600 font-medium truncate">
          {task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : t('tasks.no_planned_time')}
        </span>
      </div>
      
      {/* Drag indicator when dragging */}
      {isDragging && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
      )}
    </div>
  );
}

// Droppable Project Header Component
function DroppableProjectHeader({ project, tasks, isExpanded, onToggle, accentColor, glassEffects, isMinimalDesign }: {
  project: any;
  tasks: any[];
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: string;
  glassEffects?: any;
  isMinimalDesign?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `project-${project.id}`,
    data: {
      type: 'project-header',
      projectId: project.id,
      project: project
    }
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onToggle}
      className={`relative w-full flex items-center justify-between p-3 transition-all duration-200 rounded-lg mx-3 mb-2 min-w-0 ${
        isMinimalDesign
          ? `hover:bg-gray-50 dark:hover:bg-gray-800 ${
              isExpanded ? 'bg-gray-100 dark:bg-gray-800 border-l-4' : ''
            } ${isOver ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500' : ''}`
          : `${
        glassEffects?.enabled && glassEffects?.secondarySidebar
          ? 'hover:bg-black/40'
          : 'hover:bg-gray-800/50'
      } ${isExpanded ? 'bg-gray-800/30' : ''} ${
        isOver ? 'bg-blue-600/30 border border-blue-500/50' : ''
            }`
      }`}
      style={isMinimalDesign && isExpanded 
        ? { borderLeftColor: document.documentElement.classList.contains('dark') ? '#6b7280' : '#374151' } 
        : {}}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {isExpanded ? (
          <ChevronDown className={`w-4 h-4 flex-shrink-0 ${
            isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'
          }`} />
        ) : (
          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
            isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'
          }`} />
        )}
        <Folder className={`w-4 h-4 flex-shrink-0 ${
          isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : ''
        }`} style={!isMinimalDesign ? { color: accentColor } : {}} />
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm truncate text-left ${
            isMinimalDesign
              ? (isExpanded ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')
              : 'text-white'
          }`}>
            {project.title}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`text-xs flex-shrink-0 ${
              isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'
            }`}>
              {tasks.length > 0 
          ? (i18n.language === 'en' ? `${tasks.length} tasks` : `${tasks.length} Aufgaben`)
                          : t('tasks.no_tasks')}
            </span>
            {tasks.filter(t => t.priority === 'high').length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span className={`text-xs ${
                  isMinimalDesign ? 'text-red-600 dark:text-red-400' : 'text-red-400'
                }`}>
                  {tasks.filter(t => t.priority === 'high').length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {isOver && (
        <div className={`absolute inset-0 rounded-lg pointer-events-none flex items-center justify-center z-10 ${
          isMinimalDesign ? 'bg-blue-100/60 dark:bg-blue-900/40' : 'bg-blue-600/20'
        }`}>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-md shadow-lg ${
            isMinimalDesign
              ? 'text-blue-800 dark:text-blue-200 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-500'
              : 'text-blue-100 bg-blue-900/80 border border-blue-500/30'
          }`}>
            Zu Projekt zuordnen
          </span>
        </div>
      )}
    </button>
  );
}

export function TaskBoard() {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  
  // ✨ CRITICAL FIX: Precise sensors to prevent 100px springing on click
  // Mobile-friendly DnD activation: avoid accidental drags on tap/scroll
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 4,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 180,
      tolerance: 8,
    },
  });
  
  const sensors = useSensors(mouseSensor, touchSensor);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const [smartTaskTargetColumn, setSmartTaskTargetColumn] = useState<Column | null>(null);
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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  // Swipe detection for sidebar open/close
  const touchStartXRef = useRef<number | null>(null);
  const touchActiveRef = useRef<boolean>(false);
  const sidebarTouchStartXRef = useRef<number | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [mounted, setMounted] = useState(false);
  // ✨ REMOVED: originalExpandedProjects state since we no longer collapse projects during drag
  const [isProjectColumnSelectionModalOpen, setIsProjectColumnSelectionModalOpen] = useState(false);
  const [pendingDropProject, setPendingDropProject] = useState<any>(null);
  const [pendingDropTask, setPendingDropTask] = useState<Task | null>(null);
  
  // Ref for horizontal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ✨ Added: Alt+S shortcut for task sidebar with typing guard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const targetEl = event.target as HTMLElement | null;
      const isTypingElement = (el: HTMLElement | null) => !!el && (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable ||
        el.getAttribute('contenteditable') === 'true' ||
        el.closest?.('[contenteditable="true"]') !== null ||
        ['textbox','combobox','searchbox'].includes(el.getAttribute('role') || '')
      );
      const isTypingTarget = isTypingElement(activeEl) || isTypingElement(targetEl);

      if ((event.key === 's' || event.key === 'S') && event.altKey && !event.ctrlKey && !event.metaKey) {
        if (isTypingTarget) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-task-sidebar'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle event visibility toggle
  const handleToggleEventVisibility = useCallback((eventId: string) => {
    dispatch({ type: 'TOGGLE_EVENT_VISIBILITY', payload: eventId });
  }, [dispatch]);

  // Handle event collapse toggle
  const handleToggleEventCollapse = useCallback((eventId: string) => {
    dispatch({ type: 'TOGGLE_EVENT_COLLAPSE', payload: eventId });
  }, [dispatch]);

  // Sidebar slide-in animation
  // Mark mounted to enable transitions only after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Edge swipe handlers (open/close task sidebar)
  const onTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    const x = e.touches[0].clientX;
    const edgeZone = 24; // px from left edge
    if (x <= edgeZone || sidebarVisible) {
      touchStartXRef.current = x;
      touchActiveRef.current = true;
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchActiveRef.current || touchStartXRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    touchActiveRef.current = false;
    const threshold = 40;
    if (dx > threshold && !sidebarVisible) {
      setSidebarVisible(true);
      window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', { detail: { minimized: false } }));
      try { localStorage.setItem('taskfuchs-task-sidebar-visible', 'true'); } catch {}
    } else if (dx < -threshold && sidebarVisible) {
      setSidebarVisible(false);
      window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', { detail: { minimized: true } }));
      try { localStorage.setItem('taskfuchs-task-sidebar-visible', 'false'); } catch {}
    }
  };

  // Sidebar swipe close (within sidebar)
  const onSidebarTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    sidebarTouchStartXRef.current = e.touches[0].clientX;
  };
  const onSidebarTouchEnd = (e: React.TouchEvent) => {
    if (sidebarTouchStartXRef.current == null) return;
    const dx = e.changedTouches[0].clientX - sidebarTouchStartXRef.current;
    sidebarTouchStartXRef.current = null;
    const threshold = -40;
    if (dx < threshold) {
      setSidebarVisible(false);
      window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', { detail: { minimized: true } }));
      try { localStorage.setItem('taskfuchs-task-sidebar-visible', 'false'); } catch {}
    }
  };

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
    
    console.log('TaskBoard: Getting project tasks - Debug info:', {
      totalTasks: state.tasks.length,
      totalProjects: projectColumns.length,
      priorityFilter,
      projectIds: projectColumns.map(p => p.id)
    });
    
    const projectTasks = projectColumns.map(project => {
      // Get all tasks that belong to this project - check both projectId AND columnId for backward compatibility
      const allProjectTasks = state.tasks.filter(task => 
        task.projectId === project.id || task.columnId === project.id
      );
      
      console.log(`TaskBoard: Project ${project.title} - all tasks:`, {
        allTasks: allProjectTasks.length,
        taskDetails: allProjectTasks.map(t => ({
          id: t.id,
          title: t.title,
          projectId: t.projectId,
          columnId: t.columnId,
          completed: t.completed,
          archived: t.archived,
          reminderDate: t.reminderDate
        }))
      });
      
      // Filter for sidebar display: Only show tasks that are NOT in date columns (not planned yet)
      let tasks = allProjectTasks.filter(task => 
        !task.completed && 
        !task.archived &&
        task.columnId !== 'inbox' && // Exclude inbox tasks
        !task.reminderDate // Show only unplanned tasks (tasks without reminderDate)
      );
      
      console.log(`TaskBoard: Project ${project.title} - filtered for sidebar:`, {
        filteredTasks: tasks.length,
        tasks: tasks.map(t => ({ id: t.id, title: t.title, reminderDate: t.reminderDate }))
      });
      
      // Apply priority filter
      if (priorityFilter !== 'all') {
        if (priorityFilter === 'none') {
          tasks = tasks.filter(task => !task.priority || task.priority === 'none');
        } else {
          tasks = tasks.filter(task => task.priority === priorityFilter);
        }
      }
      
      // Apply tag filters
      if (state.activeTagFilters.length > 0) {
        tasks = tasks.filter(task => 
          state.activeTagFilters.some(tagFilter => task.tags.includes(tagFilter))
        );
      }
      
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
  }, [state.tasks, state.columns, priorityFilter, state.activeTagFilters]);

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
    const remainingMinutes = Math.round(minutes % 60);
    
    // Don't show if both hours and minutes are 0
    if (hours === 0 && remainingMinutes === 0) return null;
    
    if (hours === 0) {
      return `${remainingMinutes}min`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}min`;
    }
  };

  // Horizontal scroll functionality with Shift + Mouse wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Use SHIFT + Mouse wheel for column navigation (like the arrow buttons)
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Scroll direction: negative deltaY = scroll up = go left, positive deltaY = scroll down = go right
        const direction = e.deltaY > 0 ? 'next' : 'prev';
        
        // Use the same navigation as the arrow buttons
        handleDateNavigation(direction);
      }
    };

    // Event-Listener direkt am Container, nicht am Document
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    
        // Arrow key navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      
      // Check if we're focused on the board area (not input fields)
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (!isInputFocused && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
        
        const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';
        
        // Use the same navigation as the arrow buttons
        handleDateNavigation(direction);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ESC key listener for focus mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.focusMode) {
        dispatch({ type: 'SET_FOCUS_MODE', payload: false });
        dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.focusMode, dispatch]);

  // Custom collision detection for better drag experience
  const customCollisionDetection = (args: any) => {
    // First, let's see if there are any collisions with pointer
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // If there are no pointer collisions, use rectangle intersections
    return rectIntersection(args);
  };

  // Helper function to normalize task positions in columns
  const normalizeTaskPositions = (tasks: Task[], columnIds: string[]) => {
    const normalizedTasks = [...tasks];
    
    columnIds.forEach(columnId => {
      const columnTasks = normalizedTasks
        .filter(task => task.columnId === columnId)
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

  const handleDragStart = (event: DragStartEvent) => {
    const task = state.tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      
      // ✨ Removed manual positioning system
      
      // Add slight haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const newOverId = over ? over.id as string : null;
    
    // ✨ IMMEDIATE: Direct update without requestAnimationFrame to prevent timing issues
    if (newOverId !== overId) {
      console.log('TaskBoard: Drag over changed:', { 
        activeId: active.id, 
        from: overId, 
        to: newOverId
      });
    
    setOverId(newOverId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setOverId(null);

    if (!over) {
      console.log('TaskBoard: Drag ended without valid drop target');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = state.tasks.find(t => t.id === activeId);
    if (!activeTask) {
      console.log('TaskBoard: Active task not found:', { activeId, availableTaskIds: state.tasks.map(t => t.id).slice(0, 10) });
      return;
    }

    // Check if this is a sidebar task being dragged
    const isSidebarTask = active.data.current?.type === 'sidebar-task';
    const isRegularTask = !isSidebarTask && activeTask; // Regular task from columns
    
    console.log('TaskBoard: Drag end analysis:', {
      activeId,
      overId,
      isSidebarTask,
      isRegularTask,
      overType: over.data?.current?.type,
      overColumnId: over.data?.current?.columnId,
      overProjectId: over.data?.current?.projectId,
      activeTask: !!activeTask,
      taskTitle: activeTask?.title,
      taskCurrentColumn: activeTask?.columnId,
      taskCurrentProject: activeTask?.projectId
    });



    // Handle sidebar task dropped on column (assign to date)
    if (isSidebarTask && over.data?.current?.type === 'column') {
      const targetColumnId = over.data.current.columnId || overId;
      const targetColumn = state.columns.find(col => col.id === targetColumnId);
      
      console.log('TaskBoard: Sidebar task drop on column:', {
        targetColumnId,
        targetColumn: targetColumn ? { id: targetColumn.id, type: targetColumn.type, date: targetColumn.date } : null
      });
      
      if (targetColumn && targetColumn.type === 'date') {
        const newPosition = state.tasks
          .filter(t => t.columnId === targetColumnId)
          .length;
        
        const updatedTask = {
          ...activeTask,
          columnId: targetColumnId,
          position: newPosition,
          projectId: activeTask.projectId, // Keep project assignment
          reminderDate: targetColumn.date, // Set reminder date to match column
          updatedAt: new Date().toISOString()
        };

        dispatch({
          type: 'UPDATE_TASK',
          payload: updatedTask
        });

        console.log('TaskBoard: Sidebar task successfully assigned to date column:', { 
          taskId: activeId, 
          taskTitle: activeTask.title,
          targetColumnId, 
          reminderDate: targetColumn.date 
        });
        return;
      } else {
        console.log('TaskBoard: Target column is not a date column:', { 
          targetColumn: targetColumn ? { type: targetColumn.type } : 'not found' 
        });
      }
    }

    // Handle sidebar task dropped on task in date column
    if (isSidebarTask) {
      const overTask = state.tasks.find(t => t.id === overId);
      if (overTask && overTask.columnId?.startsWith('date-')) {
        const targetColumnId = overTask.columnId;
        const targetColumn = state.columns.find(col => col.id === targetColumnId);
        
        console.log('TaskBoard: Sidebar task drop on task in date column:', {
          targetColumnId,
          overTaskId: overTask.id,
          targetColumn: targetColumn ? { id: targetColumn.id, type: targetColumn.type, date: targetColumn.date } : null
        });
        
        if (targetColumn && targetColumn.type === 'date') {
          // Insert at the position of the task we dropped on
          const targetPosition = overTask.position || 0;
          
          const updatedTask = {
            ...activeTask,
            columnId: targetColumnId,
            position: targetPosition,
            projectId: activeTask.projectId, // Keep project assignment
            reminderDate: targetColumn.date, // Set reminder date to match column
            updatedAt: new Date().toISOString()
          };

          // Shift other tasks down
          const tasksToUpdate = state.tasks
            .filter(t => t.columnId === targetColumnId && (t.position || 0) >= targetPosition && t.id !== activeId)
            .map(t => ({ ...t, position: (t.position || 0) + 1, updatedAt: new Date().toISOString() }));

          dispatch({
            type: 'UPDATE_TASK',
            payload: updatedTask
          });

          // Update positions of other tasks
          tasksToUpdate.forEach(task => {
            dispatch({
              type: 'UPDATE_TASK',
              payload: task
            });
          });

          console.log('TaskBoard: Sidebar task successfully inserted in date column:', { 
            taskId: activeId, 
            taskTitle: activeTask.title,
            targetColumnId, 
            position: targetPosition,
            reminderDate: targetColumn.date,
            tasksShifted: tasksToUpdate.length
          });
          return;
        }
      }
      
      // If it's a sidebar task but not dropped on a valid date target, ignore
      return;
    }

    // Handle task dropped on project header (assign back to project)
    if (over.data?.current?.type === 'project-header') {
      const targetProjectId = over.data.current.projectId;
      const targetProject = over.data.current.project;
      
      console.log('TaskBoard: Task drop on project header:', {
        taskId: activeId,
        taskTitle: activeTask.title,
        taskType: isSidebarTask ? 'sidebar' : 'regular',
        targetProjectId,
        targetProject: targetProject ? { id: targetProject.id, title: targetProject.title } : null,
        currentTaskData: {
          projectId: activeTask.projectId,
          columnId: activeTask.columnId,
          reminderDate: activeTask.reminderDate
        }
      });
      
      if (targetProject && (isSidebarTask || isRegularTask)) {
        // Check if project has multiple columns (Kanban columns)
        const projectKanbanColumns = state.viewState.projectKanban.columns?.filter(col => col.projectId === targetProjectId) || [];
        
        if (projectKanbanColumns.length > 0) {
          // Project has Kanban columns - show column selection modal
          console.log('TaskBoard: Opening column selection modal for project with Kanban columns:', {
            projectId: targetProjectId,
            projectTitle: targetProject.title,
            kanbanColumns: projectKanbanColumns.length
          });
          
          setPendingDropProject(targetProject);
          setPendingDropTask(activeTask);
          setIsProjectColumnSelectionModalOpen(true);
          return;
        } else {
          // Project has no Kanban columns - assign directly to project
          const updatedTask = {
            ...activeTask,
            projectId: targetProjectId,
            columnId: targetProjectId, // Set to project column ID
            kanbanColumnId: undefined, // Clear any existing Kanban column assignment
            position: 0, // Put at top of project
            reminderDate: undefined, // Remove reminder date
            updatedAt: new Date().toISOString()
          };

          dispatch({
            type: 'UPDATE_TASK',
            payload: updatedTask
          });

          console.log('TaskBoard: Task successfully reassigned to project (no Kanban):', { 
            taskId: activeId, 
            taskTitle: activeTask.title,
            taskType: isSidebarTask ? 'sidebar' : 'regular',
            fromColumn: activeTask.columnId,
            toProject: targetProject.title
          });
          return;
        }
      }
    }

    // If it's a sidebar task but not dropped on a valid date column, ignore
    if (isSidebarTask) {
      return;
    }

    // Calculate available columns for this view (same logic as below)
    const currentDateStr = format(state.currentDate, 'yyyy-MM-dd');
    const allDateColumns = state.columns.filter(column => column.type === 'date');
    const currentDateIndex = allDateColumns.findIndex(col => col.date === currentDateStr);
    const startIndex = Math.max(0, currentDateIndex);
    const availableColumns = allDateColumns.slice(
      startIndex,
      startIndex + (state.preferences.columns.plannerVisible ?? state.preferences.columns.visible)
    );

    // Check what we're dropping on - use ALL columns for drop validation, not just date columns
    const isDroppingOnColumn = state.columns.some(col => col.id === overId);
    const isDroppingOnColumnTop = overId.endsWith('-top');
    const overTask = state.tasks.find(t => t.id === overId);
    
    console.log('TaskBoard: Drag end debug:', { 
      overId, 
      isDroppingOnColumn, 
      isDroppingOnColumnTop, 
      overTask: !!overTask,
      activeId,
      availableColumns: state.columns.map(col => col.id),
      targetColumnExists: state.columns.some(col => col.id === overId || col.id === overId.replace('-top', ''))
    });

    if (isDroppingOnColumnTop) {
      // Dropping on top drop zone - insert at position 0
      const targetColumnId = overId.replace('-top', '');
      
      // Validate that the target column exists - check all columns, not just date columns
      const targetColumn = state.columns.find(col => col.id === targetColumnId);
      if (!targetColumn) {
        console.warn('TaskBoard: Target column not found for top drop:', targetColumnId);
        return;
      }

      console.log('TaskBoard: Dropping on top zone:', { activeId, targetColumnId });

      // Shift all tasks in target column down by 1
      const updatedTasks = state.tasks.map(task => {
        if (task.id === activeId) {
          const updatedTask = { 
            ...task, 
            columnId: targetColumnId,
            position: 0,
            updatedAt: new Date().toISOString()
          };
          
          // If moving to a date column, update reminderDate to match
          if (targetColumnId.startsWith('date-')) {
            const dateStr = targetColumnId.replace('date-', '');
            updatedTask.reminderDate = dateStr;
            console.log('TaskBoard: Updating reminderDate to match column (top drop):', { 
              taskId: activeId, 
              columnId: targetColumnId, 
              reminderDate: dateStr 
            });
          }
          
          return updatedTask;
        } else if (task.columnId === targetColumnId && task.id !== activeId) {
          // Shift all tasks in target column down by 1
          return {
            ...task,
            position: (task.position || 0) + 1,
            updatedAt: new Date().toISOString()
          };
        }
        return task;
      });

      // Normalize positions in target column
      const normalizedTasks = normalizeTaskPositions(updatedTasks, [targetColumnId]);

      dispatch({
        type: 'SET_TASKS',
        payload: normalizedTasks
      });

      console.log('TaskBoard: Task inserted at top successfully:', { 
        activeId, 
        targetColumnId 
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    } else if (isDroppingOnColumn) {
      // Dropping on a column - insert at end
      const targetColumnId = overId;
      const columnTasks = state.tasks
        .filter(task => task.columnId === targetColumnId && task.id !== activeId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Insert at end: find the highest position and add 1
      const newPosition = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position || 0)) + 1 : 0;
      
      const updatedTask = { 
        ...activeTask, 
        columnId: targetColumnId,
        position: newPosition,
        updatedAt: new Date().toISOString()
      };
      
      // If moving to a date column, update reminderDate to match
      if (targetColumnId.startsWith('date-')) {
        const dateStr = targetColumnId.replace('date-', '');
        updatedTask.reminderDate = dateStr;
        console.log('TaskBoard: Updating reminderDate to match column:', { 
          taskId: activeId, 
          columnId: targetColumnId, 
          reminderDate: dateStr 
        });
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: updatedTask
      });

      console.log('TaskBoard: Task inserted at end successfully:', { 
        activeId, 
        targetColumnId,
        newPosition
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    } else if (overTask) {
      // Dropping on another task - improved logic for precise positioning
      const targetColumnId = overTask.columnId;
      const targetPosition = overTask.position || 0;
      
      console.log('TaskBoard: Dropping on task:', { 
        activeId, 
        targetTaskId: overTask.id, 
        targetColumnId, 
        targetPosition,
        activeTaskCurrentColumn: activeTask.columnId,
        activeTaskCurrentPosition: activeTask.position
      });

      // Get all tasks in target column, sorted by position
      const columnTasks = state.tasks
        .filter(task => task.columnId === targetColumnId && task.id !== activeId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      // If moving within the same column, calculate more intelligent positioning
      const isSameColumn = activeTask.columnId === targetColumnId;
      const activeTaskPosition = activeTask.position || 0;
      
      let newPosition = targetPosition;
      
      if (isSameColumn) {
        // Within same column: determine if we're moving up or down
        if (activeTaskPosition < targetPosition) {
          // Moving down: insert after the target task
          newPosition = targetPosition;
        } else {
          // Moving up: insert before the target task
          newPosition = targetPosition;
        }
      } else {
        // Different column: insert at target position
        newPosition = targetPosition;
      }

      // Update tasks with proper position management
      const updatedTasks = state.tasks.map(task => {
        if (task.id === activeId) {
          // Update the active task
          const updatedTask = {
            ...task,
            columnId: targetColumnId,
            position: newPosition,
            updatedAt: new Date().toISOString()
          };
          
          // If moving to a date column, update reminderDate to match
          if (targetColumnId.startsWith('date-')) {
            const dateStr = targetColumnId.replace('date-', '');
            updatedTask.reminderDate = dateStr;
            console.log('TaskBoard: Updating reminderDate to match column (task drop):', { 
              taskId: activeId, 
              columnId: targetColumnId, 
              reminderDate: dateStr 
            });
          }
          
          return updatedTask;
        } else if (task.columnId === targetColumnId && task.id !== activeId) {
          // Handle position shifts in target column
          if (isSameColumn) {
            // Same column movement
            if (activeTaskPosition < targetPosition && task.position > activeTaskPosition && task.position <= targetPosition) {
              // Moving down: shift tasks between old and new position up
              return {
                ...task,
                position: (task.position || 0) - 1,
                updatedAt: new Date().toISOString()
              };
            } else if (activeTaskPosition > targetPosition && task.position >= targetPosition && task.position < activeTaskPosition) {
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
        } else if (!isSameColumn && task.columnId === activeTask.columnId && task.id !== activeId) {
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

      // Normalize positions in both columns to ensure no gaps
      const normalizedTasks = normalizeTaskPositions(updatedTasks, [targetColumnId, ...(isSameColumn ? [] : [activeTask.columnId])]);

      dispatch({
        type: 'SET_TASKS',
        payload: normalizedTasks
      });

      console.log('TaskBoard: Task repositioned successfully:', { 
        activeId, 
        fromColumn: activeTask.columnId,
        toColumn: targetColumnId,
        fromPosition: activeTaskPosition,
        toPosition: newPosition,
        isSameColumn
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    } else {
      // Debug: No valid drop condition was met
      console.log('TaskBoard: No valid drop condition met:', {
        activeId,
        overId,
        isDroppingOnColumn,
        isDroppingOnColumnTop,
        hasOverTask: !!overTask,
        allConditions: {
          topZone: isDroppingOnColumnTop,
          column: isDroppingOnColumn,
          task: !!overTask
        }
      });
    }
    
    // ✨ REMOVED: Restore projects logic since we no longer collapse projects during drag
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverId(null);
    
    // ✨ REMOVED: Restore projects logic since we no longer collapse projects during drag
  };

  const handleProjectNavigation = (direction: 'prev' | 'next') => {
    dispatch({ type: 'NAVIGATE_PROJECTS', payload: direction });
  };

  const handleDateNavigation = (direction: 'prev' | 'next' | 'today') => {
    dispatch({ type: 'NAVIGATE_DATE', payload: direction });
  };



  const handleFocusColumn = (columnId: string) => {
    dispatch({ type: 'SET_FOCUS_MODE', payload: true });
    dispatch({ type: 'SET_FOCUSED_COLUMN', payload: columnId });
  };

  const handleSmartTaskAdd = (column: Column) => {
    setSmartTaskTargetColumn(column);
    setShowSmartTaskModal(true);
  };

  const handleArchiveCompletedTasks = (columnId: string) => {
    dispatch({
      type: 'ARCHIVE_COMPLETED_TASKS_IN_COLUMN',
      payload: columnId
    });
  };

  const handleExportTasks = (columnId: string) => {
    const column = state.columns.find(col => col.id === columnId);
    const tasks = state.tasks.filter(task => task.columnId === columnId && !task.completed);
    
    if (tasks.length === 0) {
              alert(i18n.language === 'en' ? 'No tasks available for export.' : 'Keine Aufgaben zum Exportieren vorhanden.');
      return;
    }

    const csvContent = [
      'Titel,Beschreibung,Priorität,Geschätzte Zeit,Tags',
      ...tasks.map(task => [
        `"${task.title}"`,
        `"${task.description || ''}"`,
        `"${task.priority || 'medium'}"`,
        `"${task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : ''}"`,
        `"${(task.tags || []).join(', ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `aufgaben-${column?.title || 'planer'}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskView = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };



  const handleTaskPlay = (task: Task) => {
    // Check if pomodoro is enabled and start timer accordingly
    const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
    dispatch({ 
      type: 'START_TIMER', 
      payload: { taskId: task.id, mode: timerMode } 
    });

    // Show focus mode prompt for 3 seconds
    try {
      window.dispatchEvent(new CustomEvent('show-focus-prompt', { detail: { taskId: task.id } }));
    } catch {}
  };

  // Remove add column functionality since we're removing project columns

  // Get date columns starting from the current date
  const currentDateStr = format(state.currentDate, 'yyyy-MM-dd');
  const allDateColumns = state.columns.filter(column => column.type === 'date');
  
  // Find the starting index for the current date
  const currentDateIndex = allDateColumns.findIndex(col => col.date === currentDateStr);
  const startIndex = Math.max(0, currentDateIndex);
  
  // Get visible date columns starting from current date
  const columnsToShow = state.preferences.columns.plannerVisible ?? state.preferences.columns.visible;
  const dateColumns = allDateColumns
    .slice(startIndex, startIndex + columnsToShow);


  
  const filteredTasks = state.tasks.filter(task => {
    // NEW FLEXIBLE LOGIC: Show tasks in TaskBoard based on multiple conditions
    
    // 1. Always show tasks that are directly assigned to date columns (primary assignment)
    if (task.columnId && task.columnId.startsWith('date-')) {
      return true;
    }
    
    // 2. Always show tasks in inbox
    if (task.columnId === 'inbox') {
      return true;
    }
    
    // 3. Show tasks with deadlines (they appear in date columns as deadline reminders)
    if (task.deadline) {
      return true;
    }
    
    // 4. Tasks with projectId but no reminderDate stay in project view only (unless they have deadline)
    if (task.projectId && !task.reminderDate && !task.deadline) {
      return false;
    }
    
    // 5. Tasks with projectId AND reminderDate are visible in both project and date planner
    // 6. Tasks without projectId but with valid columnId are shown normally
    
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query);
      const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(query));
      const matchesSubtasks = task.subtasks.some(subtask =>
        subtask.title.toLowerCase().includes(query) ||
        subtask.description?.toLowerCase().includes(query)
      );

      if (!matchesTitle && !matchesDescription && !matchesTags && !matchesSubtasks) {
        return false;
      }
    }

    // Tag-Filter: UND-Verknüpfung (alle gewählten Tags müssen vorhanden sein)
    if (state.activeTagFilters.length > 0) {
      const hasAllActiveTags = state.activeTagFilters.every(filterTag =>
        task.tags.includes(filterTag)
      );
      if (!hasAllActiveTags) {
        return false;
      }
    }

    // Priority-Filter: ODER-Verknüpfung (eine der gewählten Prioritäten muss zutreffen)
    if (state.activePriorityFilters.length > 0) {
      const taskPriority = task.priority || 'none';
      const hasActivePriority = state.activePriorityFilters.includes(taskPriority);
      if (!hasActivePriority) {
        return false;
      }
    }

    return true;
  });

  // Filter events for display in date columns
  const getEventsForColumn = (column: typeof dateColumns[0]): any[] => {
    if (!column?.date || !state.preferences.calendars?.showInPlanner) {
      return [];
    }

    const columnDate = parseISO(column.date);
    
    return state.events.filter(event => {
      const eventStart = parseISO(event.startTime);
      const eventEnd = event.endTime ? parseISO(event.endTime) : eventStart;
      
      // Include events that overlap with this day
      return (
        isSameDay(eventStart, columnDate) || 
        isSameDay(eventEnd, columnDate) ||
        (eventStart < columnDate && eventEnd > columnDate)
      );
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  // Get minimal design preference
  const isMinimalDesign = state.preferences.minimalDesign;

  const renderColumns = (columns: (typeof dateColumns[0] | null)[]) => {
    const elements: JSX.Element[] = [];
    const visibleCount = columns.filter(Boolean).length;
    const isSingle = visibleCount === 1 && state.preferences.columns.visible === 1;
    
    columns.forEach((column, index) => {
      // Handle empty placeholder columns
      if (!column) {
        elements.push(
          <div
            key={`placeholder-${index}`}
            className="flex-shrink-0 min-w-0 rounded-lg p-4 h-auto flex flex-col bg-gray-50 dark:bg-gray-800 border-2 border-transparent opacity-30"
          >
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-400 dark:text-gray-500">
                  <span className="truncate">Leere Spalte</span>
                </h3>
                <span className="text-sm px-2 py-1 rounded flex-shrink-0 text-gray-400 bg-gray-200 dark:bg-gray-700">
                  0
                </span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              Keine Spalte verfügbar
            </div>
          </div>
        );
        return;
      }

      const columnTasks = filteredTasks
        .filter(task => {
          // For date columns, show tasks based on multiple criteria
          if (column.type === 'date' && column.id.startsWith('date-')) {
            const dateStr = column.id.replace('date-', '');
            
            // 1. Tasks directly assigned to this date column (primary assignment)
          if (task.columnId === column.id) {
            return true;
          }
          
            // 2. Tasks with deadline matching this date (additional deadline display)
            if (task.deadline) {
              const taskDeadlineStr = task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline;
              if (taskDeadlineStr === dateStr) {
                return true; // Show as deadline reminder, even if task is elsewhere
              }
            }
            
            // 3. Tasks with reminderDate matching this date (if not project tasks)
            if (task.reminderDate === dateStr && !task.projectId) {
                return true;
              }
            }
            
          // For non-date columns (like inbox), show directly assigned tasks
          if (task.columnId === column.id) {
              return true;
          }
          
          return false;
        })
        .sort((a, b) => a.position - b.position);
      
      // Calculate which tasks are deadline reminders (not in their primary location)
      const deadlineReminderTaskIds: string[] = [];
      if (column.type === 'date' && column.id.startsWith('date-')) {
        const dateStr = column.id.replace('date-', '');
        
        for (const task of columnTasks) {
          if (task.deadline) {
            const taskDeadlineStr = task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline;
            // If task deadline matches this column date, and it's not the task's primary location
            if (taskDeadlineStr === dateStr && task.columnId !== column.id) {
              deadlineReminderTaskIds.push(task.id);
            }
          }
        }
      }
      
      // Build column node
      const columnNode = (
        <SortableContext
          key={column.id}
          items={columnTasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <TaskColumn
            column={column}
            tasks={columnTasks}
            events={getEventsForColumn(column)}
            overId={overId}
            activeTask={activeTask}
            onFocusColumn={handleFocusColumn}
            onSmartTaskAdd={handleSmartTaskAdd}
            showCompletedTasks={state.showCompletedTasks}
            onToggleEventVisibility={handleToggleEventVisibility}
            onToggleEventCollapse={handleToggleEventCollapse}
            isProjectColumn={false}
            deadlineReminderTaskIds={deadlineReminderTaskIds}
          />
        </SortableContext>
      );

      if (isSingle) {
        // In single-column view keep the column at a reasonable width like in multi-column layout
        elements.push(
          <div key={`single-wrap-${column.id}`} style={{ flex: '0 0 702px', maxWidth: 702, width: 702, margin: '0 auto' }}>
            {columnNode}
          </div>
        );
      } else {
        elements.push(columnNode);
      }
      
      // Add divider after column (except for the last column) in minimal design
      if (isMinimalDesign && index < columns.length - 1) {
        elements.push(
          <div
            key={`divider-${index}`}
            className="flex-shrink-0 w-px bg-gray-200 dark:bg-gray-700 self-stretch"
            style={{ minHeight: '400px' }}
          />
        );
      }
    });
    
    return elements;
  };



  // Get background styles for focus mode
  const isDarkMode = document.documentElement.classList.contains('dark');
  const focusBackgroundStyles = isDarkMode 
    ? getDarkModeBackgroundStyles(state.preferences)
    : getBackgroundStyles(state.preferences);
  const overlayStyles = getBackgroundOverlayStyles(state.preferences, isDarkMode);
  


  return (
        <div className={`h-full flex flex-col overflow-hidden w-full ${
      isMinimalDesign
        ? 'bg-white dark:bg-[#111827]'
        : 'bg-transparent'
    }`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Focus Mode Overlay */}
      {state.focusMode && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={focusBackgroundStyles}
          onClick={() => {
            dispatch({ type: 'SET_FOCUS_MODE', payload: false });
            dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
          }}
        >
          {/* Background overlay if needed */}
          {overlayStyles.position && (
            <div style={overlayStyles} />
          )}
          
          {/* Dark overlay for better readability */}
          {state.preferences.backgroundEffects?.overlay !== false && (
          <div 
            className="absolute inset-0 z-0"
            style={{
                background: `rgba(0, 0, 0, ${state.preferences.backgroundEffects?.overlayOpacity || 0.4})`
            }}
          />
          )}
          <div 
            className="w-full max-w-2xl h-full max-h-[90vh] p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full">
              <DndContext 
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                sensors={sensors}
              >
                {/* Find focused column */}
                {(() => {
                  const focusedColumn = state.focusedColumnId 
                    ? dateColumns.find(col => col.id === state.focusedColumnId)
                    : dateColumns.find(col => col.date === format(new Date(), 'yyyy-MM-dd')); // Default to today's date if no specific column is focused
                    
                  if (focusedColumn) {
                    const columnTasks = filteredTasks
                      .filter(task => {
                        // For date columns, show tasks based on multiple criteria
                        if (focusedColumn.type === 'date' && focusedColumn.id.startsWith('date-')) {
                          const dateStr = focusedColumn.id.replace('date-', '');
                          
                          // 1. Tasks directly assigned to this date column (primary assignment)
                        if (task.columnId === focusedColumn.id) {
                          return true;
                        }
                        
                          // 2. Tasks with deadline matching this date (additional deadline display)
                          if (task.deadline) {
                            const taskDeadlineStr = task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline;
                            if (taskDeadlineStr === dateStr) {
                              return true; // Show as deadline reminder, even if task is elsewhere
                            }
                          }
                          
                          // 3. Tasks with reminderDate matching this date (if not project tasks)
                          if (task.reminderDate === dateStr && !task.projectId) {
                              return true;
                            }
                          }
                          
                        // For non-date columns (like inbox), show directly assigned tasks
                        if (task.columnId === focusedColumn.id) {
                            return true;
                        }
                        
                        return false;
                      })
                      .sort((a, b) => a.position - b.position);
                    
                    // Calculate which tasks are deadline reminders for focus view
                    const focusDeadlineReminderTaskIds: string[] = [];
                    if (focusedColumn.type === 'date' && focusedColumn.id.startsWith('date-')) {
                      const dateStr = focusedColumn.id.replace('date-', '');
                      
                      for (const task of columnTasks) {
                        if (task.deadline) {
                          const taskDeadlineStr = task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline;
                          // If task deadline matches this column date, and it's not the task's primary location
                          if (taskDeadlineStr === dateStr && task.columnId !== focusedColumn.id) {
                            focusDeadlineReminderTaskIds.push(task.id);
                          }
                        }
                      }
                    }
                    
                    return (
                      <SortableContext
                        items={columnTasks.map(task => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <TaskColumn
                          column={focusedColumn}
                          tasks={columnTasks}
                          overId={overId}
                          activeTask={activeTask}
                          isFocusMode={true}
                          onFocusColumn={handleFocusColumn}
                          onSmartTaskAdd={handleSmartTaskAdd}
                          showCompletedTasks={state.showCompletedTasks}
                          isProjectColumn={false}
                          deadlineReminderTaskIds={focusDeadlineReminderTaskIds}
                        />
                      </SortableContext>
                    );
                  }
                  return null;
                })()}

                <DragOverlay
                  dropAnimation={{
                    duration: 300,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                  }}
                  style={{
                    zIndex: 9999, // Ensure dragged cards are always visible
                  }}
                >
                  {activeTask ? (
                    <div 
                      className="transform transition-all duration-200 animate-drag-overlay"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.05), transparent 70%)',
                        borderRadius: '12px',
                        padding: '4px',
                      }}
                    >
                      <TaskCard task={activeTask} isInDragOverlay />
                      
                      {/* Animated glow border effect */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          background: `linear-gradient(45deg, transparent, rgba(0, 0, 0, 0.1), transparent)`,
                          backgroundSize: '200% 100%',
                          animation: 'borderSweep 2s linear infinite',
                          borderRadius: '12px',
                        }}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                dispatch({ type: 'SET_FOCUS_MODE', payload: false });
                dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Normal Mode */}
      {!state.focusMode && (
        <DndContext 
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          sensors={sensors}
        >
        <div className="h-full w-full relative overflow-hidden">
          {/* Mobile overlay when sidebar is open */}
          {sidebarVisible && (
            <div 
              className="fixed inset-0 bg-black/50 z-10 sm:hidden"
              onClick={() => setSidebarVisible(false)}
            />
          )}
          {/* Project Tasks Sidebar */}
          {sidebarVisible && (
          <div 
            className={`absolute top-0 left-0 bottom-0 w-full sm:w-80 z-20 flex flex-col overflow-hidden min-w-0 ${
              isMinimalDesign
                ? 'border-r border-gray-200 dark:border-gray-800'
                : `backdrop-blur-xl ${document.documentElement.classList.contains('dark') ? 'bg-black/50' : 'bg-white/30'} border-r ${document.documentElement.classList.contains('dark') ? 'border-white/15' : 'border-gray-200'}`
            }`}
            style={{
              ...(isMinimalDesign 
                  ? { 
                      backgroundColor: document.documentElement.classList.contains('dark')
                        ? '#111827'
                        : '#FFFFFF'
                    }
                  : {}),
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
              transition: mounted ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              visibility: !mounted && !sidebarVisible ? 'hidden' : 'visible',
              maxWidth: '100%',
            }}
            onTouchStart={onSidebarTouchStart}
            onTouchEnd={onSidebarTouchEnd}
          >
            {/* Sidebar Header */}
            <div 
              className={`flex flex-col justify-center px-4 min-w-0 ${
                isMinimalDesign
                  ? 'border-b border-gray-200 dark:border-gray-800'
                  : 'border-b border-white/15 bg-transparent'
              }`}
              style={{ 
                ...(isMinimalDesign 
                    ? { 
                        backgroundColor: document.documentElement.classList.contains('dark')
                          ? '#111827'
                          : '#FFFFFF'
                      }
                    : {}),
                height: '68px',
                minHeight: '68px',
                maxHeight: '68px',
                boxSizing: 'border-box'
              }}
            >
              <h1 className={`text-lg font-semibold flex items-center space-x-2 min-w-0 ${
                isMinimalDesign ? 'text-black' : 'text-white'
              }`}>
                <Folder className="w-5 h-5 flex-shrink-0" style={{ color: state.preferences.accentColor }} />
                <span className="truncate">{t('navigation.planner')}</span>
              </h1>
            </div>
              
            {/* Filter Toggle Button - Below the line */}
            <div className="p-4">
              <div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                    isMinimalDesign 
                      ? (showFilters || priorityFilter !== 'all' || state.activeTagFilters.length > 0
                          ? 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700')
                      : (showFilters || priorityFilter !== 'all' || state.activeTagFilters.length > 0
                          ? 'bg-gray-600/40 border border-gray-500/50'
                          : 'bg-gray-700/40 hover:bg-gray-600/40 border border-gray-600/40')
                  }`}
                  style={{ 
                    backdropFilter: isMinimalDesign ? 'none' : 'blur(8px)',
                    boxShadow: showFilters ? `0 0 20px ${state.preferences.accentColor}20` : 'none'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Filter className={`w-4 h-4 ${isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`} />
                    <span className={`text-sm font-medium ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`}>Filter</span>
                    {(priorityFilter !== 'all' || state.activeTagFilters.length > 0) && (
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {(priorityFilter !== 'all' || state.activeTagFilters.length > 0) && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      >
                        {(priorityFilter !== 'all' ? 1 : 0) + state.activeTagFilters.length}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-300 ${
                        showFilters ? 'rotate-180' : ''
                      } ${isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`} 
                    />
                  </div>
                </button>

                {/* Expandable Filter Panel */}
                <div className={`overflow-hidden transition-all duration-300 ${
                  showFilters ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm border border-gray-600/30 space-y-4">
                    
                    {/* Priority Filters */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2 flex items-center space-x-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>Prioritäten</span>
                      </label>
                      
                      <div className="grid grid-cols-5 gap-1">
                        {/* All Priority Button */}
                        <button
                          onClick={() => setPriorityFilter('all')}
                          className={`h-8 rounded-md text-xs font-bold transition-all duration-200 ${
                            priorityFilter === 'all'
                              ? 'bg-white text-gray-800 shadow-lg scale-105'
                              : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-105'
                          }`}
                          title={t('tasks.filter.all_priorities')}
                        >
                          ALL
                        </button>
                        
                        {/* Individual Priority Buttons */}
                        {[
                                          { key: 'high', label: 'H', color: '#ef4444', title: t('tasks.priority.high') + ' Priorität' },
                { key: 'medium', label: 'M', color: '#f59e0b', title: t('tasks.priority.medium') + ' Priorität' },
                { key: 'low', label: 'L', color: '#10b981', title: t('tasks.priority.low') + ' Priorität' },
                { key: 'none', label: '–', color: '#9ca3af', title: t('tasks.priority.none') + ' Priorität' }
                        ].map(({ key, label, color, title }) => (
                          <button
                            key={key}
                            onClick={() => setPriorityFilter(key)}
                            className={`h-8 rounded-md text-xs font-bold transition-all duration-200 ${
                              priorityFilter === key
                                ? 'text-white shadow-lg scale-105'
                                : 'text-white/80 hover:text-white hover:scale-105'
                            }`}
                            title={title}
                            style={{
                              backgroundColor: priorityFilter === key ? color : `${color}60`,
                              boxShadow: priorityFilter === key ? `0 0 12px ${color}40` : 'none'
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>


                    {/* Tag Filters */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2 flex items-center space-x-2">
                        <Tag className="w-3 h-3" />
                        <span>Tags</span>
                      </label>
                      
                      {(() => {
                        const availableTags = state.tags.filter(tag => {
                          const actualTaskCount = state.tasks.filter(task => task.tags.includes(tag.name)).length;
                          return tag.count > 0 && actualTaskCount > 0;
                        });
                        
                        return availableTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {availableTags
                            .slice(0, 8) // Limit to 8 most used tags
                            .map(tag => {
                              const isActive = state.activeTagFilters.includes(tag.name);
                              return (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    dispatch({ type: 'TOGGLE_TAG_FILTER', payload: tag.name });
                                  }}
                                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                                    isActive
                                      ? 'text-white shadow-lg scale-105'
                                      : 'text-gray-300 bg-gray-700/60 hover:bg-gray-600/60 hover:scale-105'
                                  }`}
                                  style={{
                                    backgroundColor: isActive ? tag.color || state.preferences.accentColor : undefined,
                                    boxShadow: isActive ? `0 0 8px ${tag.color || state.preferences.accentColor}40` : 'none'
                                  }}
                                  title={`${tag.name} (${tag.count} Aufgaben)`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">
                          Keine Tags verfügbar
                        </div>
                        );
                      })()}
                    </div>

                    {/* Active Filters Summary */}
                    {(priorityFilter !== 'all' || state.activeTagFilters.length > 0) && (
                      <div className="pt-3 border-t border-gray-600/30">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${
                            isMinimalDesign ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'
                          }`}>Aktive Filter:</span>
                          <button
                            onClick={() => {
                              setPriorityFilter('all');
                              dispatch({ type: 'CLEAR_TAG_FILTERS' });
                            }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Alle löschen
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {priorityFilter !== 'all' && (
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded text-xs text-white"
                              style={{ 
                                backgroundColor: 
                                  priorityFilter === 'high' ? '#ef4444' :
                                  priorityFilter === 'medium' ? '#f59e0b' :
                                  priorityFilter === 'low' ? '#10b981' : '#9ca3af'
                              }}
                            >
                              {priorityFilter === 'high' ? 'Hoch' :
                               priorityFilter === 'medium' ? 'Mittel' :
                               priorityFilter === 'low' ? 'Niedrig' : 'Keine'} Priorität
                            </span>
                          )}
                          {state.activeTagFilters.map(tag => (
                            <span 
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: state.preferences.accentColor }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-end mt-4">
                <span className={`text-xs ${
                  isMinimalDesign ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'
                }`}>
                  {(() => {
                    const totalTasks = getProjectTasks.reduce((total, group) => total + group.tasks.length, 0);
                    return totalTasks > 0 
      ? (i18n.language === 'en' ? `${totalTasks} tasks` : `${totalTasks} Aufgaben`)
      : (i18n.language === 'en' ? 'No tasks' : 'Keine Aufgaben');
                  })()}
                </span>
              </div>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {/* Projektaufgaben Überschrift */}
              <div className="px-4 pt-2 pb-3 border-b border-gray-600/20">
                <h2 className={`text-sm font-medium flex items-center space-x-2 ${
                  isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300'
                }`}>
                  <span>{t('planner.project_tasks')}</span>
                </h2>
              </div>
              {getProjectTasks.length === 0 ? (
                <div className={`p-4 mt-4 text-center ${
                  isMinimalDesign ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'
                }`}>
                  <Folder className={`w-8 h-8 mx-auto mb-2 ${
                    isMinimalDesign ? 'opacity-60' : 'opacity-50'
                  }`} />
                  <p className="text-sm">{t('planner.no_project_tasks')}</p>
                </div>
              ) : (
                <div className="space-y-1 min-w-0">
                  {getProjectTasks.map(({ project, tasks }) => (
                    <div key={project.id} className="min-w-0">
                      {/* Project Header */}
                      <DroppableProjectHeader
                        project={project}
                        tasks={tasks}
                        isExpanded={expandedProjects.has(project.id)}
                        onToggle={() => toggleProject(project.id)}
                        accentColor={state.preferences.accentColor}
                        glassEffects={state.preferences.glassEffects}
                        isMinimalDesign={state.preferences.minimalDesign}
                      />

                      {/* Project Tasks */}
                      {expandedProjects.has(project.id) && (
                        <div className="space-y-1 mb-3 min-w-0">
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
          )}

          {/* Main Content Area */}
          <div 
            className="absolute top-0 right-0 bottom-0 flex flex-col overflow-hidden"
            style={{
              left: sidebarVisible ? '320px' : '0px',
              transition: mounted ? 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            }}
          >
            {/* Header - Only extends to the right of the sidebar */}
            <div className={`flex-shrink-0 border-b shadow-sm ${
              isMinimalDesign
                ? 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800'
                : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200/60 dark:border-gray-700/60'
            }`}>
              <Header currentView="tasks" />
            </div>
            
            <div 
              className="relative flex-1 flex flex-col bg-transparent"
              style={{ 
                overflow: 'hidden',
                height: '100%'
              }}
            >
              <MobilePullToRefresh onRefresh={async () => dispatch({ type: 'NO_OP' } as any)}>
              <div className="h-full flex flex-col relative z-10 px-4 pb-4">

            {/* Board Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%', 
              gap: '17px',
              padding: '0',
              alignItems: 'stretch',
              width: '100%'
            }}>
              {dateColumns.length > 0 && (
                  <div 
                    ref={scrollContainerRef}
                    style={{ 
                      display: 'flex', 
                      gap: isMinimalDesign ? '5px' : '9px',
                      alignItems: 'stretch',
                      width: '100%',
                      marginTop: '10px',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E1 #F1F5F9',
                      minWidth: 0, // Wichtig für flex-shrink
                      position: 'relative',
                      minHeight: '400px',
                      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {/* Mobile list fallback: stack columns vertically */}
                    <div className="w-full flex sm:hidden flex-col gap-4">
                      {renderColumns(dateColumns)}
                    </div>
                    <div className="w-full hidden sm:block">
                      <div style={{
                        display: 'flex',
                        gap: isMinimalDesign ? '5px' : '9px',
                        alignItems: 'stretch',
                        height: '100%',
                        minWidth: 'fit-content'
                      }}>
                        {renderColumns(dateColumns)}
                      </div>
                    </div>
                </div>
              )}


            </div>

            {/* ✨ Elegant Minimalist DragOverlay */}
            <DragOverlay
              dropAnimation={null}
              style={{
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
              {activeTask && (
                <div style={{
                  // ✨ PERFECT: Apply offset to inner element to compensate springing
                  // Adjust X offset based on sidebar visibility (320px sidebar width)
                  transform: `translateX(${sidebarVisible ? 'calc(-76px - 320px)' : '-76px'}) translateY(-100px)`,
                  filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.15))',
                }}>
                        <TaskCard task={activeTask} isInDragOverlay />
                        </div>
              )}
            </DragOverlay>
            
            {/* ✨ Butter-Smooth Apple-Style Animations */}
            <style>
              {`
                /* 🎯 Timer Active Card - Smooth Highlight */
                .timer-active-card {
                  border-color: var(--accent-color, #3B82F6) !important;
                  box-shadow: 0 0 0 1px var(--accent-color, #3B82F6) !important;
                  transition: all 200ms cubic-bezier(0.23, 1, 0.320, 1) !important;
                }
                
                /* 🌟 Smooth Focus Ring for Accessibility */
                *:focus-visible {
                  outline: 2px solid var(--accent-color, #3B82F6);
                  outline-offset: 2px;
                  transition: outline 150ms cubic-bezier(0.23, 1, 0.320, 1);
                }
                
                /* 📱 Smooth Scrollbars */
                ::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                
                ::-webkit-scrollbar-track {
                  background: transparent;
                }
                
                ::-webkit-scrollbar-thumb {
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 3px;
                  transition: all 200ms cubic-bezier(0.23, 1, 0.320, 1);
                }
                
                ::-webkit-scrollbar-thumb:hover {
                  background: rgba(0, 0, 0, 0.3);
                }
                
                /* Legacy - Keep minimal for compatibility */
                @keyframes dragFloat {
                  0%, 100% { transform: rotate(1deg) scale(1.02); }
                  50% { transform: rotate(-1deg) scale(1.02); }
                }
              `}
            </style>

              </div>
              </MobilePullToRefresh>
            </div>
          </div>
        </div>
        </DndContext>
      )}
      
      {/* Task Modal */}
      {isTaskModalOpen && selectedTask && createPortal(
        <TaskModal
          // Always use freshest task instance from store (important during timer updates)
          task={state.tasks.find(t => t.id === selectedTask.id) || selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
        />,
        document.body
      )}

      {/* Smart Task Modal */}
      {showSmartTaskModal && smartTaskTargetColumn && (
        <SmartTaskModal
          isOpen={showSmartTaskModal}
          onClose={() => setShowSmartTaskModal(false)}
          targetColumn={smartTaskTargetColumn}
                                    placeholder={t('forms.create_task_for', { title: smartTaskTargetColumn?.title || (i18n.language === 'en' ? 'Column' : 'Spalte') })}
        />
      )}

             {/* Project Column Selection Modal */}
       {isProjectColumnSelectionModalOpen && pendingDropTask && pendingDropProject && (
         <ProjectColumnSelectionModal
           isOpen={isProjectColumnSelectionModalOpen}
           onClose={() => {
             setIsProjectColumnSelectionModalOpen(false);
             setPendingDropProject(null);
             setPendingDropTask(null);
           }}
           project={pendingDropProject}
           task={pendingDropTask}
                        onSelectColumn={(columnId) => {
               setIsProjectColumnSelectionModalOpen(false);
               
               if (!pendingDropTask) return;
               
               // Determine if this is a Kanban column or project column
               const isKanbanColumn = state.viewState.projectKanban.columns.some(col => col.id === columnId);
               
               const updatedTask = {
                 ...pendingDropTask,
                 projectId: isKanbanColumn ? 
                   state.viewState.projectKanban.columns.find(col => col.id === columnId)?.projectId : 
                   columnId,
                 columnId: isKanbanColumn ? pendingDropProject.id : columnId,
                 kanbanColumnId: isKanbanColumn ? columnId : undefined,
                 position: 0,
                 reminderDate: undefined,
                 updatedAt: new Date().toISOString()
               };
               
               dispatch({
                 type: 'UPDATE_TASK',
                 payload: updatedTask
               });
               
               console.log('TaskBoard: Task assigned to project column via modal:', {
                 taskId: pendingDropTask.id,
                 columnId: columnId,
                 isKanbanColumn,
                 projectId: pendingDropProject.id,
                 updatedTask
               });
               
               // Clear pending drop state
               setPendingDropProject(null);
               setPendingDropTask(null);
             }}
        />
      )}



    </div>
  );
} 