import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { 
  DndContext, 
  DragStartEvent, 
  DragEndEvent, 
  DragOverEvent,
  useDroppable,
  pointerWithin,
  rectIntersection,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, Plus, Settings, Edit2, Sparkles, X, MoreHorizontal, MoreVertical, Columns, Focus, ChevronUp, ChevronDown, Filter, Hash, AlertCircle, Circle, CheckCircle, Archive, Clock, Trash2, Check, FileText, Info, Pin, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskCard } from '../Tasks/TaskCard';
import { TaskColumn } from '../Tasks/TaskColumn';
import { DropIndicator } from '../Tasks/DropIndicator';
import { ProjectManager } from '../Projects/ProjectManager';
import { ColumnManager } from '../Projects/ColumnManager';
import { ProjectToggle } from '../Projects/ProjectToggle';
import { ProjectColumnSelector } from '../Projects/ProjectColumnSelector';
import { ProjectTimebudgetModal } from '../Projects/ProjectTimebudgetModal';
import { ProjectTimebudgetIcon } from '../Projects/ProjectTimebudgetIcon';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import { TaskModal } from '../Tasks/TaskModal';
import { Header } from '../Layout/Header';
import type { Task, Column, ProjectKanbanColumn } from '../../types';
import { format, addDays, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

export function ProjectKanbanBoard() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const { actions, forms, titles, messages, kanban } = useAppTranslation();
  
  // ✨ CRITICAL FIX: Precise sensors to prevent springing (same as TaskBoard)
  // Mobile-friendly DnD activation
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
  const isMinimalDesign = state.preferences.minimalDesign;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const [smartTaskTargetColumn, setSmartTaskTargetColumn] = useState<any>(null);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(() => {
    try {
      const savedMin = localStorage.getItem('taskfuchs-project-sidebar-minimized');
      const minimized = savedMin ? JSON.parse(savedMin) : false;
      return !minimized;
    } catch {
      return true;
    }
  });
  const [sidebarMinimized, setSidebarMinimized] = useState(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-project-sidebar-minimized');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Project Assignment Modal states
  const [showProjectColumnSelector, setShowProjectColumnSelector] = useState(false);
  const [draggedTaskForProjectAssignment, setDraggedTaskForProjectAssignment] = useState<Task | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  // Removed local columnOffset - now using state.projectColumnOffset from global state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [shouldEditNewColumn, setShouldEditNewColumn] = useState(false);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [projectMenuDropdown, setProjectMenuDropdown] = useState<string | null>(null);
  
  // Time budget modal state
  const [showTimebudgetModal, setShowTimebudgetModal] = useState(false);
  const [timebudgetProject, setTimebudgetProject] = useState<Column | null>(null);
  
  // Notes linking state
  const [showNotesSlider, setShowNotesSlider] = useState(false);
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  
  // Archive confirmation modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveModalData, setArchiveModalData] = useState<{
    columnId: string;
    columnTitle: string;
    completedCount: number;
  } | null>(null);

  // Ref for horizontal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use default sensors (like TaskBoard)

  // Do not auto-open sidebar; initial state is derived from persisted minimized state

  // Close project menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setProjectMenuDropdown(null);
    };

    if (projectMenuDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [projectMenuDropdown]);

  // Send initial sidebar state to header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('project-sidebar-state-changed', {
      detail: { minimized: sidebarMinimized }
    }));
    
    // Send initial notes slider state to header
    window.dispatchEvent(new CustomEvent('notes-slider-state-changed', {
      detail: { isOpen: showNotesSlider }
    }));
  }, []); // Only on mount

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    // Ensure the sidebar system is considered visible and just toggle minimized
    setSidebarVisible(true);
    setSidebarMinimized(prev => {
      const newState = !prev;
      try { localStorage.setItem('taskfuchs-project-sidebar-minimized', JSON.stringify(newState)); } catch {}
      window.dispatchEvent(new CustomEvent('project-sidebar-state-changed', {
        detail: { minimized: newState }
      }));
      return newState;
    });
  };

  // ESC key listener for focus mode and modal + sidebar shortcut
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
        el.closest('[contenteditable="true"]') !== null ||
        ['textbox','combobox','searchbox'].includes(el.getAttribute('role') || '')
      );
      const isTypingTarget = isTypingElement(activeEl) || isTypingElement(targetEl);

      // Toggle secondary sidebar with Alt+S (and not when typing)
      if ((event.key === 's' || event.key === 'S') && event.altKey && !event.ctrlKey && !event.metaKey) {
        if (isTypingTarget) {
          return; // do not handle shortcut while typing
        }
        event.preventDefault();
        toggleSidebar();
        return;
      }
      if (event.key === 'Escape') {
        if (showNotesSlider) {
          setShowNotesSlider(false);
        } else if (showNoteSearch) {
          setShowNoteSearch(false);
        } else if (state.focusMode) {
          dispatch({ type: 'SET_FOCUS_MODE', payload: false });
          dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.focusMode, showNotesSlider, showNoteSearch, dispatch]);

  // Column manager handler
  const handleOpenColumnManager = () => {
    // Only open column manager if a project is selected
    if (selectedProject) {
      setShowColumnManager(true);
    } else {
      console.warn('Cannot open column manager: No project selected');
    }
  };

  // Custom event handlers for header integration
  useEffect(() => {

    const handleToggleFilter = () => {
      setShowFilterDropdown(prev => !prev);
    };

    const handleEditProjectName = (event: CustomEvent) => {
      const { projectId, projectTitle } = event.detail;
      setEditingProjectId(projectId);
      setEditingProjectTitle(projectTitle);
    };

    const handleToggleSidebar = () => {
      toggleSidebar();
    };

    const handleToggleNotesSlider = () => {
      setShowNotesSlider(prev => {
        const newValue = !prev;
        
        // Notify header about the state change
        window.dispatchEvent(new CustomEvent('notes-slider-state-changed', {
          detail: { isOpen: newValue }
        }));
        
        return newValue;
      });
    };

    window.addEventListener('open-column-manager', handleOpenColumnManager);
    window.addEventListener('toggle-kanban-filter', handleToggleFilter);
    window.addEventListener('edit-project-name', handleEditProjectName);
    window.addEventListener('toggle-project-sidebar', handleToggleSidebar);
    window.addEventListener('toggle-notes-slider', handleToggleNotesSlider);
    
    return () => {
      window.removeEventListener('open-column-manager', handleOpenColumnManager);
      window.removeEventListener('toggle-kanban-filter', handleToggleFilter);
      window.removeEventListener('edit-project-name', handleEditProjectName);
      window.removeEventListener('toggle-project-sidebar', handleToggleSidebar);
      window.removeEventListener('toggle-notes-slider', handleToggleNotesSlider);
    };
  }, [dispatch, setEditingProjectId, setEditingProjectTitle]);



  // Get all projects - sorted by order property to match ProjectManager
  const projects = state.columns
    .filter(col => col.type === 'project')
    .sort((a, b) => a.order - b.order);
  const selectedProjectId = state.viewState.projectKanban.selectedProjectId;
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Auto-focus the container for keyboard navigation
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.focus();
    }
  }, [selectedProject]);

  // Horizontal scrolling & navigation:
  // - Mouse/trackpad wheel scrolls horizontally across columns
  // - SHIFT + wheel navigates projects (prev/next)
  // - Arrow keys scroll horizontally across columns
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Determine dominant axis (support both classic mice and trackpads)
      const absX = Math.abs(e.deltaX || 0);
      const absY = Math.abs(e.deltaY || 0);
      const raw = absX > absY ? (e.deltaX || 0) : (e.deltaY || 0);

      if (e.shiftKey) {
        // Keep legacy behavior: SHIFT + wheel navigates projects
        e.preventDefault();
        e.stopPropagation();
        const direction = raw > 0 ? 'next' : 'prev';
        dispatch({ type: 'NAVIGATE_PROJECTS', payload: direction });
        return;
      }

      // Default: scroll horizontally by the dominant delta
      e.preventDefault();
      e.stopPropagation();
      container.scrollLeft += raw;
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're focused on inputs or modals
      const activeElement = document.activeElement as HTMLElement | null;
      const isInputFocused = !!activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        !!activeElement.closest('[role="dialog"]') ||
        !!activeElement.closest('.modal')
      );

      if (!isInputFocused && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const container = scrollContainerRef.current;
        if (!container) return;
        e.preventDefault();
        const step = 120; // pixels per key press
        container.scrollLeft += (e.key === 'ArrowLeft' ? -step : step);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel as EventListener);
      }
      document.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [dispatch]);

  // Get project-specific custom columns, sorted by order
  const projectColumns = state.viewState.projectKanban.columns
    .filter(col => col.projectId === selectedProject?.id)
    .sort((a, b) => a.order - b.order);

  // Get linked notes for the selected project
  const linkedNotes = selectedProject 
    ? (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => 
        (note.linkedProjects || []).includes(selectedProject.id)
      )
    : [];

  // Handler for note click
  const handleNoteClick = (note: any) => {
    // Navigate to notes view
    window.dispatchEvent(new CustomEvent('navigate-to-notes', { 
      detail: { noteId: note.id } 
    }));
    dispatch({ type: 'SELECT_NOTE', payload: note });
    dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
  };

  // Handler for unlinking note
  const handleUnlinkNote = (noteId: string) => {
    if (selectedProject) {
      dispatch({
        type: 'UNLINK_NOTE_FROM_PROJECT',
        payload: { noteId, projectId: selectedProject.id }
      });
    }
  };

  // Handler for linking note
  const handleLinkNote = (noteId: string) => {
    if (selectedProject) {
      dispatch({
        type: 'LINK_NOTE_TO_PROJECT',
        payload: { noteId, projectId: selectedProject.id }
      });
      setShowNoteSearch(false);
      setNoteSearchQuery('');
    }
  };

  // Handler for pinning note to project (only one note can be pinned per project)
  const handlePinNote = (noteId: string) => {
    if (selectedProject) {
      // First unpin any currently pinned note for this project
      const currentlyPinnedNote = linkedNotes.find(note => 
        note.pinnedToProjects?.includes(selectedProject.id)
      );
      
      if (currentlyPinnedNote && currentlyPinnedNote.id !== noteId) {
        dispatch({
          type: 'UNPIN_NOTE_FROM_PROJECT',
          payload: { noteId: currentlyPinnedNote.id, projectId: selectedProject.id }
        });
      }
      
      // Then pin the new note
      dispatch({
        type: 'PIN_NOTE_TO_PROJECT',
        payload: { noteId, projectId: selectedProject.id }
      });
    }
  };

  // Handler for unpinning note from project
  const handleUnpinNote = (noteId: string) => {
    if (selectedProject) {
      dispatch({
        type: 'UNPIN_NOTE_FROM_PROJECT',
        payload: { noteId, projectId: selectedProject.id }
      });
    }
  };

  // Handle project assignment for dragged tasks
  const handleProjectAssignment = (projectId: string, columnId?: string) => {
    if (draggedTaskForProjectAssignment && targetProjectId) {
      let updatePayload = {
        ...draggedTaskForProjectAssignment,
        columnId: undefined,
        kanbanColumnId: undefined,
        updatedAt: new Date().toISOString()
      };
      
      if (columnId && columnId !== projectId) {
        // Assign to specific kanban column within project
        updatePayload.columnId = projectId;
        updatePayload.kanbanColumnId = columnId;
      } else {
        // Assign to project without specific column
        updatePayload.columnId = projectId;
        updatePayload.kanbanColumnId = undefined;
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: updatePayload
      });
      
      // Reset states
      setDraggedTaskForProjectAssignment(null);
      setTargetProjectId(null);
      setShowProjectColumnSelector(false);

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    }
  };

  const handleCloseProjectColumnSelector = () => {
    setShowProjectColumnSelector(false);
    setDraggedTaskForProjectAssignment(null);
    setTargetProjectId(null);
  };

  // Get available notes for linking
  const availableNotes = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => 
    !linkedNotes.some(linkedNote => linkedNote.id === note.id) &&
    note.title.toLowerCase().includes(noteSearchQuery.toLowerCase())
  );

  // Get pinned note for current project
  const pinnedNote = selectedProject 
    ? linkedNotes.find(note => note.pinnedToProjects?.includes(selectedProject.id))
    : null;

  // Create display columns from project kanban columns only
  const displayColumns: (Column | null)[] = useMemo(() => {
    if (!selectedProject) return [];
    
    // Convert project kanban columns to display columns
    const allColumns: Column[] = projectColumns.map((col) => ({
      id: col.id,
      title: col.title,
      type: 'project' as const,
      order: col.order,
      tasks: []
    }));

    // Apply column offset and limit based on user preference
    const visibleColumnCount = state.preferences.columns.projectsVisible ?? state.preferences.columns.visible;
    const startIndex = state.projectColumnOffset;
    const result: (Column | null)[] = [];
    
    // Calculate total items including the "Add Column" button
    const totalItems = allColumns.length + 1; // +1 for the "Add Column" button
    
    // Fill exactly visibleColumnCount slots
    for (let i = 0; i < visibleColumnCount; i++) {
      const itemIndex = startIndex + i;
      if (itemIndex < allColumns.length) {
        // Regular column
        result.push(allColumns[itemIndex]);
      } else if (itemIndex === allColumns.length) {
        // "Add Column" button position
        result.push(null); // null indicates "Add Column" button
      } else {
        // Beyond all items - empty slot
        result.push(undefined as any); // undefined indicates empty slot
      }
    }

    return result;
  }, [selectedProject, projectColumns, state.preferences.columns.projectsVisible, state.preferences.columns.visible, state.projectColumnOffset]);

  // Auto-edit newly created columns
  useEffect(() => {
    if (shouldEditNewColumn && projectColumns.length > 0) {
      // Find the newest column (highest order number)
      const newestColumn = projectColumns.reduce((latest, current) => 
        current.order > latest.order ? current : latest
      );
      
      if (newestColumn) {
        setEditingColumnId(newestColumn.id);
        setEditingColumnTitle(newestColumn.title);
        setShouldEditNewColumn(false);
      }
    }
  }, [shouldEditNewColumn, projectColumns]);

  // New DeleteProjectModal Component
  const DeleteProjectModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    project, 
    taskCount 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    project: Column | null; 
    taskCount: number; 
  }) => {
    const [confirmText, setConfirmText] = useState('');

    // Reset confirmation text when modal opens/closes
    useEffect(() => {
      if (isOpen) {
        setConfirmText('');
      }
    }, [isOpen]);

    if (!isOpen || !project) return null;

    return (
              <div className="fixed inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className={`relative rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-800'
            : 'bg-white dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {kanban.project.deleteTitle()}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {kanban.project.deleteConfirm(project.title)}
            </p>
            {taskCount > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                {kanban.project.deleteWarning(taskCount)}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {kanban.project.deleteInputLabel()}
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder={kanban.project.deletePlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              {kanban.project.deleteCancel()}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
                              disabled={confirmText !== kanban.project.deletePlaceholder()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {kanban.project.deleteButton()}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Sortable Project Component
  const SortableProject = ({ project }: { project: Column }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: project.id });

    // Add droppable for tasks
    const {
      setNodeRef: setDroppableRef,
      isOver: isTaskDropZone,
    } = useDroppable({
      id: `project-drop-${project.id}`,
      data: {
        type: 'project-drop-zone',
        projectId: project.id,
      },
    });

    const style = {
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Combine refs for sortable and droppable
    const combinedRef = (node: HTMLElement | null) => {
      setNodeRef(node);
      setDroppableRef(node);
    };

    // Get all columns for THIS specific project (not just the selected project)
    const allProjectColumns = state.viewState.projectKanban.columns
      .filter(col => col.projectId === project.id);
      
    const projectTaskCount = state.tasks.filter(t => 
      !t.completed && (
        allProjectColumns.some(col => col.id === t.kanbanColumnId) || t.projectId === project.id
      )
    ).length;

    const isEditing = editingProjectId === project.id;
    const isSelected = selectedProject?.id === project.id;
    const isHovered = hoveredProjectId === project.id;
    const projectIndex = projects.findIndex(p => p.id === project.id);

    return (
      <div
        ref={combinedRef}
        {...attributes}
        {...listeners}
        className={`relative p-4 cursor-pointer transition-colors group h-16 ${
          isMinimalDesign
            ? `border-b border-gray-200 hover:bg-gray-50 ${
                isSelected ? 'bg-gray-100 border-l-4' : ''
              }`
            : `border-b border-white/15 hover:bg-black/40 ${
                isSelected ? 'border-l-4' : ''
              }`
        } ${
          isTaskDropZone && activeTask ? 'ring-2 ring-offset-1' : ''
        }`}
        onClick={() => !isEditing && handleProjectSelect(project.id)}
        style={{
          ...style,
          backgroundColor: isMinimalDesign
            ? (isSelected 
                ? getAccentColorStyles().bgLight.backgroundColor
                : isTaskDropZone && activeTask
                ? '#f3f4f6'
                : 'transparent')
            : (isSelected 
                ? (getAccentColorStyles().bg.backgroundColor + '1A') 
                : isTaskDropZone && activeTask
                ? (getAccentColorStyles().bg.backgroundColor + '20')
                : 'transparent'),
          borderLeftColor: isSelected 
            ? getAccentColorStyles().border.borderColor
            : 'transparent',
          ...(isTaskDropZone && activeTask ? {
            ringColor: isMinimalDesign 
              ? getAccentColorStyles().border.borderColor + '50'
              : getAccentColorStyles().border.borderColor + '50'
          } : {})
        }}
        onMouseEnter={() => {
          setHoveredProjectId(project.id);
        }}
        onMouseLeave={() => {
          setHoveredProjectId(null);
        }}
      >
        {/* Normal Project Display */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-2">
            {isEditing ? (
              <input
                type="text"
                value={editingProjectTitle}
                onChange={(e) => setEditingProjectTitle(e.target.value)}
                onKeyDown={handleProjectTitleKeyDown}
                onBlur={handleSaveProjectTitle}
                className={`w-full px-2 py-1 text-sm font-medium rounded focus:outline-none focus:ring-2 ${
                  isMinimalDesign
                    ? 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-gray-400'
                    : 'bg-gray-600 border border-gray-500 text-white focus:ring-blue-500'
                }`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className={`text-sm font-medium truncate ${
                isMinimalDesign
                  ? (isSelected 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-700 dark:text-gray-300')
                  : (isSelected 
                      ? `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'` 
                      : `document.documentElement.classList.contains('dark') ? 'text-gray-200' : 'text-gray-900'`)
              }`}>
                {project.title}
              </h3>
            )}
          </div>
          
                  {/* Right side - Task count and indicators */}
        {!isEditing && (
          <div className="flex items-center space-x-1">
            {/* Timebudget indicator icon */}
            <ProjectTimebudgetIcon 
              project={project} 
              className="mr-1"
              onClick={() => {
                setTimebudgetProject(project);
                setShowTimebudgetModal(true);
              }}
            />
            
            {/* Task count indicator in circle */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isMinimalDesign
                ? 'bg-gray-300 border border-gray-400'
                : 'bg-gray-600'
            }`}>
              <span className={`text-xs font-medium ${
                isMinimalDesign
                  ? 'text-gray-700'
                  : `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
              }`}>
                {projectTaskCount}
              </span>
            </div>

            {/* Three-dots menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuDropdown(projectMenuDropdown === project.id ? null : project.id);
                }}
                className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                  isMinimalDesign
                    ? 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    : 'hover:bg-gray-600'
                }`}
                title="Projekt-Optionen"
              >
                <MoreVertical className={`w-4 h-4 ${
                  isMinimalDesign
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-300'
                }`} />
              </button>

              {/* Dropdown Menu */}
              {projectMenuDropdown === project.id && (
                <div 
                  className={`absolute right-0 top-8 w-48 rounded-lg shadow-lg border z-50 ${
                    isMinimalDesign
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-gray-800 border-gray-600'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setTimebudgetProject(project);
                        setShowTimebudgetModal(true);
                        setProjectMenuDropdown(null);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
                        isMinimalDesign
                          ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Kapazitätsplanung</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  // Filter tasks for current project kanban columns only
  const filteredTasks = state.tasks.filter(task => {
    if (!selectedProject) {
      console.log('ProjectKanbanBoard: No selectedProject available', { 
        projects: projects.length, 
        selectedProjectId,
        availableProjects: projects.map(p => ({ id: p.id, title: p.title }))
      });
      return false;
    }
    
    // IMPORTANT: Show tasks that belong to this project
    // 1. Tasks with kanbanColumnId that belongs to this project's columns
    // 2. Tasks with direct projectId (for backward compatibility)
    // 3. Inbox tasks (no projectId/kanbanColumnId) should NEVER appear in project kanban boards
    const hasKanbanColumn = task.kanbanColumnId && projectColumns.some(col => col.id === task.kanbanColumnId);
    const hasDirectProjectId = task.projectId === selectedProject.id;
    const belongsToProject = hasKanbanColumn || hasDirectProjectId;
    
    if (!belongsToProject) {
      console.log('ProjectKanbanBoard: Task does not belong to project', {
        taskId: task.id,
        taskTitle: task.title,
        taskProjectId: task.projectId,
        taskKanbanColumnId: task.kanbanColumnId,
        hasKanbanColumn,
        hasDirectProjectId,
        selectedProjectId: selectedProject.id,
        projectColumnsCount: projectColumns.length,
        belongsToProject
      });
      return false;
    }
    
    console.log('ProjectKanbanBoard: Task belongs to project', {
      taskId: task.id,
      taskTitle: task.title,
      selectedProjectId: selectedProject.id,
      hasKanbanColumn,
      hasDirectProjectId,
      belongsToProject
    });

    // Apply search filter
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

    // Apply tag filters
    if (state.activeTagFilters.length > 0) {
      const hasAllActiveTags = state.activeTagFilters.every(filterTag =>
        task.tags.includes(filterTag)
      );
      if (!hasAllActiveTags) {
        return false;
      }
    }

    // Apply priority filters
    if (state.activePriorityFilters.length > 0) {
      const taskPriority = task.priority || 'none';
      const hasActivePriority = state.activePriorityFilters.includes(taskPriority);
      if (!hasActivePriority) {
        return false;
      }
    }

    // Apply completed tasks filter (Projects-specific flag)
    if (!state.viewState.projectKanban.showCompleted && task.completed) {
      return false;
    }

    return true;
  });

  // Custom collision detection
  // ✨ REMOVED: Custom collision detection to prevent springing
  // Using default collision detection for smoother drag & drop

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    // Column dragging removed - only handle tasks and projects
    if (activeData?.type === 'task') {
      const task = state.tasks.find(t => t.id === active.id);
      if (task) {
        setActiveTask(task);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else {
        // Check if it's a project being dragged
        const project = projects.find(p => p.id === active.id);
        if (project) {
          setActiveProjectId(project.id);
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setOverId(null);
    setActiveProjectId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle task dropped on planner assignment zone
    if (activeTask && overData?.type === 'planner-assignment') {
      // Create a custom event for planner assignment
      const plannerEvent = new CustomEvent('plannerAssignment', {
        detail: { task: activeTask }
      });
      window.dispatchEvent(plannerEvent);
      return;
    }

    // Column reordering removed - columns are no longer draggable

    // Handle project reordering
    if (activeProjectId && over.id !== active.id) {
      const oldIndex = projects.findIndex(p => p.id === active.id);
      const newIndex = projects.findIndex(p => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedProjects = arrayMove(projects, oldIndex, newIndex);
        reorderedProjects.forEach((project, index) => {
          dispatch({
            type: 'UPDATE_COLUMN',
            payload: {
              ...project,
              order: index
            }
          });
        });
      }
      return;
    }

    // Handle task dropped on project in sidebar
    if (activeTask && activeData?.type === 'task') {
      const targetProject = projects.find(p => p.id === over.id);
      if (targetProject && targetProject.id !== selectedProject?.id) {
        // Show project column selector for cross-project assignment
        setDraggedTaskForProjectAssignment(activeTask);
        setTargetProjectId(targetProject.id);
        setShowProjectColumnSelector(true);
        return;
      }
    }

    if (!activeTask || !selectedProject) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropping on a column
    const targetColumn = projectColumns.find(col => col.id === overId);
    const isDroppingOnColumnTop = overId.endsWith('-top');
    const overTask = state.tasks.find(t => t.id === overId);

    if (isDroppingOnColumnTop) {
      // Dropping on top drop zone - insert at position 0
      const targetColumnId = overId.replace('-top', '');
      const targetColumn = projectColumns.find(col => col.id === targetColumnId);
      
      if (targetColumn) {
        // Shift all tasks in target column down by 1
        const updatedTasks = state.tasks.map(task => {
          if (task.id === activeId) {
            return {
              ...task,
              columnId: selectedProject.id,
              kanbanColumnId: targetColumn.id,
              position: 0,
              updatedAt: new Date().toISOString()
            };
          } else if (task.kanbanColumnId === targetColumn.id && task.id !== activeId) {
            // Shift all tasks in target column down by 1
            return {
              ...task,
              position: task.position + 1,
              updatedAt: new Date().toISOString()
            };
          }
          return task;
        });

        dispatch({
          type: 'SET_TASKS',
          payload: updatedTasks
        });

        // Success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 10, 30]);
        }
      }
    } else if (targetColumn) {
      // Dropping on a column - place at the end
      const columnTasks = state.tasks
        .filter(task => task.kanbanColumnId === targetColumn.id && task.id !== activeId)
        .sort((a, b) => a.position - b.position);
      
      const newPosition = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position)) + 1 : 0;
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...activeTask,
          columnId: selectedProject.id,
          kanbanColumnId: targetColumn.id,
          position: newPosition
        }
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    } else if (overTask && overTask.kanbanColumnId) {
      // Dropping on a task - insert at that position
      const targetColumnId = overTask.kanbanColumnId;
      const targetPosition = overTask.position;
      const currentPosition = activeTask.position;
      const currentColumnId = activeTask.kanbanColumnId;

      // Update all tasks in the target column
      const updatedTasks = state.tasks.map(task => {
        if (task.id === activeId) {
          // Move the dragged task to the target position
          return {
            ...task,
            columnId: selectedProject.id,
            kanbanColumnId: targetColumnId,
            position: targetPosition
          };
        } else if (task.kanbanColumnId === targetColumnId && task.id !== activeId) {
          if (currentColumnId === targetColumnId) {
            // Moving within the same column
            if (currentPosition < targetPosition) {
              // Moving down: shift tasks between current and target position up
              if (task.position > currentPosition && task.position <= targetPosition) {
                return {
                  ...task,
                  position: task.position - 1
                };
              }
            } else {
              // Moving up: shift tasks between target and current position down
              if (task.position >= targetPosition && task.position < currentPosition) {
                return {
                  ...task,
                  position: task.position + 1
                };
              }
            }
          } else {
            // Moving to a different column: shift tasks in target column down
            if (task.position >= targetPosition) {
              return {
                ...task,
                position: task.position + 1
              };
            }
          }
        } else if (task.kanbanColumnId === currentColumnId && task.id !== activeId && currentColumnId !== targetColumnId) {
          // Shift tasks in the old column up to fill the gap
          if (task.position > currentPosition) {
            return {
              ...task,
              position: task.position - 1
            };
          }
        }
        return task;
      });

      dispatch({
        type: 'SET_TASKS',
        payload: updatedTasks
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverId(null);
    setActiveProjectId(null);
  };

  const handleProjectSelect = (projectId: string) => {
    dispatch({ type: 'SET_PROJECT_KANBAN_SELECTED_PROJECT', payload: projectId });
  };

  const handleColumnCountChange = (count: number) => {
    if (count === 1) {
      // Toggle focus mode
      dispatch({ type: 'SET_FOCUS_MODE', payload: !state.focusMode });
    } else {
      // Disable focus mode and set column count
      dispatch({ type: 'SET_FOCUS_MODE', payload: false });
      dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          columns: { 
            ...state.preferences.columns, 
            visible: count 
          } 
        } 
      });
    }
  };

  const handleAddColumn = () => {
    if (!selectedProject) return;
    
    dispatch({
      type: 'ADD_PROJECT_KANBAN_COLUMN',
      payload: {
        title: '',
        projectId: selectedProject.id,
        color: '#6b7280'
      }
    });
    
    // Trigger auto-editing for the next new column
    setShouldEditNewColumn(true);
    
    // Auto-scroll to show the new column
    // Use setTimeout to ensure the new column is added to the DOM first
    setTimeout(() => {
      if (scrollContainerRef.current) {
        // Scroll to the far right to show the new column
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      }
    }, 100);
  };

  const handleStartEditColumn = (columnId: string, currentTitle: string) => {
    setEditingColumnId(columnId);
    setEditingColumnTitle(currentTitle);
  };

  const handleSaveColumnTitle = (columnId?: string, newTitle?: string) => {
    const columnIdToUse = columnId || editingColumnId;
    const titleToUse = newTitle || editingColumnTitle;
    
    if (!columnIdToUse) return;
    
    // If the title is empty, delete the column (except for main project column)
    if (!titleToUse.trim()) {
      if (columnIdToUse !== selectedProject?.id) {
        // Check if this is the last custom column
        const remainingColumns = projectColumns.filter(col => col.id !== columnIdToUse);
        
        if (remainingColumns.length === 0) {
          // Show warning that at least one column must exist
          alert('Mindestens eine Spalte muss vorhanden bleiben. Ein Projekt ohne Spalten ist nicht möglich.');
          if (columnId && newTitle !== undefined) {
            // For external calls, we can't update the editing title directly
            return;
          }
          setEditingColumnTitle(projectColumns.find(col => col.id === columnIdToUse)?.title || '');
          return;
        }
        
        // Delete empty custom column
        dispatch({
          type: 'DELETE_PROJECT_KANBAN_COLUMN',
          payload: columnIdToUse
        });
      }
      setEditingColumnId(null);
      setEditingColumnTitle('');
      return;
    }
    
    // Check if we're editing the main project column
    if (columnIdToUse === selectedProject?.id) {
      // Update the project title
      dispatch({
        type: 'UPDATE_COLUMN',
        payload: {
          id: columnIdToUse,
          title: titleToUse.trim(),
          type: 'project'
        } as Column
      });
    } else {
      // Update a custom project column
      dispatch({
        type: 'UPDATE_PROJECT_KANBAN_COLUMN',
        payload: {
          columnId: columnIdToUse,
          title: titleToUse.trim()
        }
      });
    }
    
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleColumnTitleChange = (columnId: string, title: string) => {
    setEditingColumnTitle(title);
  };

  const handleColumnTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveColumnTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditColumn();
    }
  };

  const handleTaskEdit = (task: Task) => {
    // Use global TaskModal at app root for robustness (avoids local unmounts)
    try {
      window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
    } catch {}
  };

  const handleTaskPlay = (task: Task) => {
    const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
    dispatch({ type: 'START_TIMER', payload: { taskId: task.id, mode: timerMode } });
  };

  const handleSmartTaskAdd = (column: Column) => {
    // Convert to project column format for SmartTaskModal
    setSmartTaskTargetColumn({
      ...column,
      projectId: selectedProject?.id,
      kanbanColumnId: column.id
    });
    setShowSmartTaskModal(true);
  };

  const handleFocusColumn = (columnId: string) => {
    dispatch({ type: 'SET_FOCUS_MODE', payload: true });
    dispatch({ type: 'SET_FOCUSED_COLUMN', payload: columnId });
  };

  const handleArchiveCompletedTasks = (columnId: string) => {
    const columnTasks = filteredTasks.filter(task => task.kanbanColumnId === columnId);
    const completedTasksCount = columnTasks.filter(task => task.completed).length;
    
    if (completedTasksCount === 0) return;
    
    const column = displayColumns.find(col => col?.id === columnId);
    const columnTitle = column?.title || 'der Spalte';
    
    setArchiveModalData({
      columnId,
      columnTitle,
      completedCount: completedTasksCount
    });
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    if (archiveModalData) {
      dispatch({
        type: 'ARCHIVE_COMPLETED_TASKS_IN_COLUMN',
        payload: archiveModalData.columnId
      });
    }
    setShowArchiveModal(false);
    setArchiveModalData(null);
  };

  const handleStartEditProject = (projectId: string, currentTitle: string) => {
    setEditingProjectId(projectId);
    setEditingProjectTitle(currentTitle);
  };

  const handleSaveProjectTitle = () => {
    if (editingProjectId && editingProjectTitle.trim()) {
      dispatch({
        type: 'UPDATE_COLUMN',
        payload: {
          id: editingProjectId,
          title: editingProjectTitle.trim(),
          type: 'project'
        } as Column
      });
    }
    setEditingProjectId(null);
    setEditingProjectTitle('');
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setEditingProjectTitle('');
  };

  const handleProjectTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveProjectTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditProject();
    }
  };

  const handleMoveProject = (projectId: string, direction: 'up' | 'down') => {
    const currentIndex = projects.findIndex(p => p.id === projectId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= projects.length) return;
    
    const reorderedProjects = arrayMove(projects, currentIndex, newIndex);
    
    // Use REORDER_PROJECTS dispatch action
    dispatch({
      type: 'REORDER_PROJECTS',
      payload: { projectIds: reorderedProjects.map(p => p.id) }
    });
  };

  const handleStartDeleteProject = (projectId: string) => {
    setDeleteConfirmProjectId(projectId);
    setDeleteConfirmText('');
  };

  const handleConfirmDeleteProject = () => {
    if (!deleteConfirmProjectId) return;

    // Find the project to delete
    const projectToDelete = projects.find(p => p.id === deleteConfirmProjectId);
    if (!projectToDelete) return;

    // Delete all tasks in this project (main column and custom columns)
    const projectTaskIds = state.tasks
      .filter(t => 
        t.columnId === deleteConfirmProjectId || 
        (projectColumns.some(col => col.projectId === deleteConfirmProjectId && col.id === t.kanbanColumnId))
      )
      .map(t => t.id);

    // Delete the tasks
    projectTaskIds.forEach(taskId => {
      dispatch({ type: 'DELETE_TASK', payload: taskId });
    });

    // Delete all custom columns for this project
    const projectCustomColumns = projectColumns.filter(col => col.projectId === deleteConfirmProjectId);
    projectCustomColumns.forEach(col => {
      dispatch({ type: 'DELETE_PROJECT_KANBAN_COLUMN', payload: col.id });
    });

    // Delete the project itself
    dispatch({ type: 'DELETE_PROJECT', payload: deleteConfirmProjectId });

    // If this was the selected project, select another one
    if (selectedProject?.id === deleteConfirmProjectId) {
      const remainingProjects = projects.filter(p => p.id !== deleteConfirmProjectId);
      if (remainingProjects.length > 0) {
        handleProjectSelect(remainingProjects[0].id);
      }
    }

    // Reset state
    setDeleteConfirmProjectId(null);
    setDeleteConfirmText('');
  };

  const handleCancelDeleteProject = () => {
    setDeleteConfirmProjectId(null);
    setDeleteConfirmText('');
  };

  const handleOpenNewProjectModal = () => {
    setNewProjectName('');
    setShowNewProjectModal(true);
  };

  const handleCreateNewProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProjectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the new project column
    dispatch({
      type: 'ADD_COLUMN',
      payload: {
        id: newProjectId,
        title: newProjectName.trim(),
        type: 'project',
        order: projects.length,
        tasks: []
      }
    });
    
    // Auto-select the new project
    dispatch({ type: 'SET_PROJECT_KANBAN_SELECTED_PROJECT', payload: newProjectId });
    
    // Close modal and reset
    setShowNewProjectModal(false);
    setNewProjectName('');
  };

  const handleCancelNewProject = () => {
    setShowNewProjectModal(false);
    setNewProjectName('');
  };

  const handleNewProjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateNewProject();
    } else if (e.key === 'Escape') {
      handleCancelNewProject();
    }
  };

  // Navigation now handled by global state in App.tsx

  // Toggle column collapse state
  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(columnId)) {
        newCollapsed.delete(columnId);
      } else {
        newCollapsed.add(columnId);
      }
      return newCollapsed;
    });
  };

  // Simple column component without drag functionality - just like in TaskBoard
  const SimpleKanbanColumn = ({ column, tasks }: { column: Column, tasks: Task[] }) => {
    return (
      <div className="flex-1 min-w-0">
        <TaskColumn
          column={column}
          tasks={tasks}
          overId={overId}
          activeTask={activeTask}
          activeColumn={null}
          onFocusColumn={handleFocusColumn}
          onSmartTaskAdd={handleSmartTaskAdd}
          showCompletedTasks={state.viewState.projectKanban.showCompleted}
          isProjectColumn={true}
          isEditing={editingColumnId === column.id}
          editingTitle={editingColumnTitle}
          onStartEdit={handleStartEditColumn}
          onCancelEdit={handleCancelEditColumn}
          onSaveEdit={handleSaveColumnTitle}
          onTitleChange={handleColumnTitleChange}
          projectId={selectedProject?.id}
          kanbanColumnId={column.id}
          onColumnManager={handleOpenColumnManager}
          // No dragListeners or isDragging - columns are not draggable anymore
        />
      </div>
    );
  };

  // Render columns using TaskColumn component (exactly like TaskBoard)
  const renderColumns = (columns: (Column | null | undefined)[]) => {
    const result = [];
    
    for (let index = 0; index < columns.length; index++) {
      const column = columns[index];
      
      if (column === null) {
        // null indicates "Add Column" button position
        result.push(
          <div key={`add-column-wrapper-${index}`} className="flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddColumn();
            }}
              className={`w-full flex flex-col items-center justify-center min-h-[120px] rounded-lg transition-all duration-200 group ${
              isMinimalDesign
                ? 'border-2 border-dashed border-gray-300 hover:border-gray-400'
                : 'bg-gray-100 bg-opacity-20 hover:bg-opacity-35 dark:bg-gray-700 dark:bg-opacity-20 dark:hover:bg-opacity-35 border border-dashed border-gray-300 border-opacity-40 dark:border-gray-600 dark:border-opacity-40'
            }`}
            style={isMinimalDesign ? {
              backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF'
            } : undefined}
            title={actions.add_column()}
          >
            <Plus className={`w-6 h-6 mb-1 transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800'
                : 'text-white group-hover:text-white'
            }`} />
            <span className={`text-xs font-medium transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800'
                : 'text-white group-hover:text-white'
            }`}>
              {actions.add_column()}
            </span>
          </button>
          </div>
        );
      } else if (column === undefined) {
        // undefined indicates empty slot
        result.push(
          <div
            key={`empty-${index}`}
            className="flex-1 min-w-0"
            style={{ alignSelf: 'flex-start', marginTop: '0px' }}
          />
        );
      } else {
        // Regular column
        const columnTasks = filteredTasks
          .filter(task => task.kanbanColumnId === column.id)
          .sort((a, b) => a.position - b.position);
        
        result.push(
          <SortableContext
            key={column.id}
            items={columnTasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <SimpleKanbanColumn 
              column={column}
              tasks={columnTasks}
            />
          </SortableContext>
        );
        
        // Add divider after column (except for the last column) in minimal design
        if (isMinimalDesign && index < columns.length - 1) {
          result.push(
            <div
              key={`divider-${index}`}
              className="flex-shrink-0 w-px bg-gray-200 dark:bg-gray-700 self-stretch"
              style={{ minHeight: '400px' }}
            />
          );
        }
      }
    }
    
    return result;
  };

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      bgLight: { backgroundColor: accentColor + '1A' }, // 10% opacity
      border: { borderColor: accentColor },
    };
  };

  // Filter functions
  const handleToggleProjectPriority = (priority: string) => {
    const currentFilters = state.viewState.projectKanban.priorityFilters;
    const newFilters = currentFilters.includes(priority as any)
      ? currentFilters.filter(p => p !== priority)
      : [...currentFilters, priority as any];
    dispatch({ type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS', payload: newFilters });
  };

  const handleToggleProjectTag = (tagName: string) => {
    const currentFilters = state.viewState.projectKanban.tagFilters;
    const newFilters = currentFilters.includes(tagName)
      ? currentFilters.filter(t => t !== tagName)
      : [...currentFilters, tagName];
    dispatch({ type: 'SET_PROJECT_KANBAN_TAG_FILTERS', payload: newFilters });
  };

  const handleClearAllProjectFilters = () => {
    dispatch({ type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS', payload: [] });
    dispatch({ type: 'SET_PROJECT_KANBAN_TAG_FILTERS', payload: [] });
  };

  const getTaskCountForProjectPriority = (priority: string): number => {
    // Get all project tasks without priority filter applied
    const projectTasks = state.tasks.filter(task => {
      if (!selectedProject) return false;
      
      // Show tasks from project kanban columns only
      const isProjectColumnTask = task.kanbanColumnId && projectColumns.some(col => col.id === task.kanbanColumnId);
      
      if (!isProjectColumnTask) return false;

      // Apply search filter
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

      // Apply tag filters
      if (state.viewState.projectKanban.tagFilters.length > 0) {
        const hasAllActiveTags = state.viewState.projectKanban.tagFilters.every(filterTag =>
          task.tags.includes(filterTag)
        );
        if (!hasAllActiveTags) {
          return false;
        }
      }

      return true;
    });

    return projectTasks.filter(task => {
      const taskPriority = task.priority || 'none';
      return taskPriority === priority;
    }).length;
  };

  const getTaskCountForProjectTag = (tagName: string): number => {
    // Get all project tasks without tag filter applied
    const projectTasks = state.tasks.filter(task => {
      if (!selectedProject) return false;
      
      // Show tasks from project kanban columns only
      const isProjectColumnTask = task.kanbanColumnId && projectColumns.some(col => col.id === task.kanbanColumnId);
      
      if (!isProjectColumnTask) return false;

      // Apply search filter
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

      // Apply priority filters
      if (state.viewState.projectKanban.priorityFilters.length > 0) {
        const taskPriority = task.priority || 'none';
        const hasActivePriority = state.viewState.projectKanban.priorityFilters.includes(taskPriority);
        if (!hasActivePriority) {
          return false;
        }
      }

      return true;
    });

    return projectTasks.filter(task => task.tags.includes(tagName)).length;
  };

  const priorities = [
    { value: 'none', label: 'Keine' },
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' }
  ];

  // ✨ Track mouse position for drag overlay (replaces DragOverlay)
  useEffect(() => {
    if (!activeTask) {
      setDragOffset(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate sidebar width (320px when visible, 0px when minimized)
      const sidebarWidth = (sidebarVisible && !sidebarMinimized) ? 320 : 0;
      
      setDragOffset({
        x: e.clientX - sidebarWidth,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeTask, sidebarVisible, sidebarMinimized]);


  return (
    <DndContext 
      onDragStart={handleDragStart} 
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
              // ✨ REMOVED: Using default collision detection for smoother drag & drop
      sensors={sensors}
    >
      <div className={`h-full w-full flex overflow-hidden ${
        isMinimalDesign ? 'bg-white dark:bg-[#111827]' : ''
      }`}>
        {/* Projects Sidebar - Now using flexbox instead of absolute positioning */}
        <div className={`flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 ${
          isMinimalDesign
            ? 'border-r border-gray-200 dark:border-gray-800'
            : `backdrop-blur-xl ${document.documentElement.classList.contains('dark') ? 'bg-black/50' : 'bg-white/30'} border-r ${document.documentElement.classList.contains('dark') ? 'border-white/15' : 'border-gray-200'}`
        }`}
        style={{ 
              ...(isMinimalDesign 
                  ? { 
                      backgroundColor: document.documentElement.classList.contains('dark')
                        ? '#111827'  // Elegant dark blue-gray for dark mode
                        : '#FFFFFF'
                    }
                  : {}),
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            // Flexbox sizing
            width: sidebarMinimized ? '0px' : '320px',
            marginLeft: sidebarMinimized ? '-320px' : '0px',
            }}
          >
                {/* Header */}
                <div 
                  className={`relative flex items-center px-4 ${
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
                  {/* Main header content - centered */}
                  <div className="flex items-center justify-between w-full">
                    {projects.length > 0 ? (
                      <>
                        <h1 className={`text-lg font-semibold flex items-center space-x-2 ${
                          isMinimalDesign 
                            ? (document.documentElement.classList.contains('dark')
                                ? `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
                                : 'text-black')
                            : `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
                        }`}>
                          <Columns className="w-5 h-5" style={getAccentColorStyles().text} />
                          <span>{t('projects.title')}</span>
                        </h1>
                        {/* Removed redundant subtitle below main title */}
                        <button
                          onClick={handleOpenNewProjectModal}
                          className={`p-2 rounded-md transition-colors duration-200 ${
                            isMinimalDesign 
                              ? (document.documentElement.classList.contains('dark')
                                  ? 'text-white bg-gray-800 hover:bg-gray-700'
                                  : 'text-black bg-gray-100 hover:bg-gray-200')
                              : 'text-white shadow-sm'
                          }`}
                          style={isMinimalDesign ? {} : getAccentColorStyles().bg}
                          onMouseEnter={(e) => {
                            if (!isMinimalDesign) {
                              e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isMinimalDesign) {
                              e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                            }
                          }}
                          title={t('projects.create_new_project')}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <h1 className={`text-lg font-semibold flex items-center space-x-2 ${
                        isMinimalDesign ? 'text-black' : `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
                      }`}>
                        <Columns className="w-5 h-5" style={getAccentColorStyles().text} />
                        <span>{t('projects.title')}</span>
                      </h1>
                    )}
                  </div>

                </div>

                {/* Stats Section - Clean and spacious */}
                <div className={`px-4 py-3 border-b ${
                  isMinimalDesign
                    ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                    : state.preferences.glassEffects?.enabled && state.preferences.glassEffects?.secondarySidebar
                      ? (document.documentElement.classList.contains('dark') ? 'border-white/15 bg-transparent' : 'border-gray-300/50 bg-white/30')
                      : 'border-gray-800 bg-[#1a1d21]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isMinimalDesign 
                        ? (document.documentElement.classList.contains('dark')
                            ? 'text-gray-300'
                            : 'text-gray-700')
                        : (document.documentElement.classList.contains('dark') ? 'text-gray-300' : 'text-gray-900')
                    }`}>
                      {selectedProject ? (t('tasks.title') + `: ${filteredTasks.length}`) : (t('projects.no_project_selected'))}
                    </span>
                    <span className={`text-sm font-medium ${
                      isMinimalDesign 
                        ? (document.documentElement.classList.contains('dark')
                            ? 'text-gray-300'
                            : 'text-gray-700')
                        : (document.documentElement.classList.contains('dark') ? 'text-gray-300' : 'text-gray-900')
                    }`}>
                      {t('projects.title') + `: ${projects.length}`}
                    </span>
                  </div>
                </div>

                {/* Projects List - Sortable */}
                <div className="flex-1 overflow-y-auto">
                  <SortableContext 
                    items={projects.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {projects.map((project) => (
                      <SortableProject key={project.id} project={project} />
                    ))}
                  </SortableContext>
                  
                  {/* Empty state */}
                  {projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                        isMinimalDesign 
                          ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600' 
                          : (document.documentElement.classList.contains('dark') ? 'bg-gray-700 dark:bg-gray-700' : 'bg-gray-200')
                      }`}>
                        <Columns className={`w-6 h-6 ${
                          isMinimalDesign 
                            ? 'text-gray-500 dark:text-gray-400' 
                            : (document.documentElement.classList.contains('dark') ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600')
                        }`} />
                      </div>
                      <h3 className={`text-base font-medium mb-2 ${
                        isMinimalDesign 
                          ? 'text-gray-900 dark:text-white' 
                          : (document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900')
                      }`}>
                        {t('projects.no_projects_title')}
                      </h3>
                      <p className={`text-sm mb-6 max-w-md ${
                        isMinimalDesign 
                          ? 'text-gray-600 dark:text-gray-300' 
                          : (document.documentElement.classList.contains('dark') ? 'text-gray-400' : 'text-gray-700')
                      }`}>
                        {t('projects.no_projects_description')}
                      </p>
                  <button
                    onClick={handleOpenNewProjectModal}
                        className="px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 text-white font-medium hover:scale-105 active:scale-95"
                        style={{ 
                          backgroundColor: state.preferences.accentColor,
                          boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
                    }}
                  >
                        <Plus className="w-5 h-5" />
                        <span>{t('projects.create_first_project')}</span>
                  </button>
                </div>
                )}
                </div>


          </div>

        {/* Notes Management Slider */}
        {showNotesSlider && selectedProject && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-[1px]"
              onClick={() => setShowNotesSlider(false)}
            ></div>
            
            {/* Slider Panel */}
            <div 
              className={`fixed top-0 z-50 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ease-out rounded-b-lg ${
                showNotesSlider ? 'translate-y-0' : '-translate-y-full'
              }`}
              style={{
                marginTop: '60px', // Header height
                left: (sidebarVisible && !sidebarMinimized) ? '400px' : '80px', // 80px (Hauptsidebar) + 320px (Projektsidebar) = 400px
                width: '380px',
                maxWidth: '90vw'
              }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Slider Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg" style={{ backgroundColor: state.preferences.accentColor + '20' }}>
                    <FileText className="w-3 h-3" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Notizen verwalten
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ({linkedNotes.length})
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setShowNoteSearch(true);
                      setShowNotesSlider(false);
                    }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('add_note')}</span>
                  </button>
                  <button
                    onClick={() => setShowNotesSlider(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Slider Content */}
              <div className="p-3 max-h-[40vh] overflow-y-auto">
                {linkedNotes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {linkedNotes.map(note => {
                      const isPinned = note.pinnedToProjects?.includes(selectedProject.id);
                      return (
                        <div
                          key={note.id}
                          className="group flex flex-col p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm hover:scale-[1.01]"
                          style={{
                            borderColor: isPinned ? state.preferences.accentColor + '50' : undefined,
                            backgroundColor: isPinned ? state.preferences.accentColor + '05' : undefined
                          }}
                        >
                          <button
                            onClick={() => handleNoteClick(note)}
                            className="flex-1 text-left mb-1"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <FileText className="w-3 h-3 flex-shrink-0" style={{ color: state.preferences.accentColor }} />
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {note.title || 'Unbenannte Notiz'}
                              </span>
                              {isPinned && (
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: state.preferences.accentColor }}></div>
                              )}
                            </div>
                            {note.content && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {note.content.substring(0, 80)}...
                              </p>
                            )}
                          </button>
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={() => isPinned ? handleUnpinNote(note.id) : handlePinNote(note.id)}
                              className="p-1 text-gray-400 hover:text-yellow-500 transition-all duration-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                              title={isPinned ? t('remove_pin') : t('pin_to_project')}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleUnlinkNote(note.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title={t('remove_link')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium mb-1">{t('no_linked_notes')}</p>
                    <p className="text-xs">{t('click_to_add_notes')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Main Content Area - Positioned to the right of sidebar */}
        <div className="absolute top-0 right-0 bottom-0 flex flex-col overflow-hidden"
          style={{
            left: (sidebarVisible && !sidebarMinimized) ? '320px' : '0px', // 320px = w-80
            transition: 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Header - Only extends to the right of the project sidebar */}
          <div className={`flex-shrink-0 border-b shadow-sm ${
            isMinimalDesign
              ? 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800'
              : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200/60 dark:border-gray-700/60'
          }`}>
            <Header currentView="kanban" />
          </div>
                  
          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main Board Area */}
            {selectedProject ? (
              <div 
                className="relative h-full flex flex-col"
                      style={{
                  overflow: 'hidden'
                }}
              >
                {/* Filter Slider - Below Controls */}
                {selectedProject && showFilterDropdown && (
                    <div className="backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm animate-in slide-in-from-top-2 duration-300" style={{ backgroundColor: '#e5e7eb' }}>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: state.preferences.accentColor + '20' }}>
                            <Filter className="w-4 h-4" style={{ color: state.preferences.accentColor }} />
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Filter
                          </h3>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {(state.viewState.projectKanban.priorityFilters.length > 0 || state.viewState.projectKanban.tagFilters.length > 0) && (
                            <button
                              onClick={handleClearAllProjectFilters}
                              className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded-lg"
                            >
                              <X className="w-3 h-3" />
                              <span>{t('clear_all_filters')}</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => setShowFilterDropdown(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                            title={t('close_filter')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {/* Priority Filters */}
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 flex-shrink-0">
                            Prioritäten:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {priorities.map((priority) => {
                              const isActive = state.viewState.projectKanban.priorityFilters.includes(priority.value as any);
                              const taskCount = getTaskCountForProjectPriority(priority.value);
                              
                              return (
                                <button
                                  key={priority.value}
                                  onClick={() => handleToggleProjectPriority(priority.value)}
                                  className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
                                    isActive
                                      ? 'text-white shadow-sm'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                  style={isActive ? { backgroundColor: state.preferences.accentColor } : {}}
                                >
                                  <span>{priority.label}</span>
                                  <span className="ml-1 text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                                    {taskCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tag Filters */}
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 flex-shrink-0">
                            Tags:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const availableTags = state.tags.filter(tag => {
                                const actualTaskCount = filteredTasks.filter(task => task.tags.includes(tag.name)).length;
                                return tag.count > 0 && actualTaskCount > 0;
                              });
                              
                              return availableTags.length > 0 ? (
                                availableTags.sort((a, b) => b.count - a.count).map((tag) => {
                                  const isActive = state.viewState.projectKanban.tagFilters.includes(tag.name);
                                  const itemCount = getTaskCountForProjectTag(tag.name);
                                  
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={() => handleToggleProjectTag(tag.name)}
                                      className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
                                        isActive
                                          ? 'text-white shadow-sm'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                      }`}
                                      style={isActive ? { backgroundColor: state.preferences.accentColor } : {}}
                                    >
                                      <span>{tag.name}</span>
                                      <span className="ml-1 text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                                        {itemCount}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {t('no_tags_available')}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Linked Notes Section */}


                  {/* Kanban Board - Using TaskColumn like TaskBoard */}
                  <div className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col relative px-4 pb-4">
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                        height: '100%', 
                        gap: '17px',
                        padding: '0',
                        alignItems: 'stretch',
                        width: '100%'
                    }}>
                      {displayColumns.length > 0 && (
                          <div 
                            ref={scrollContainerRef}
                            tabIndex={0}
                            
                            style={{ 
                              flex: 1,
                              width: '100%',
                              height: '100%',
                              marginTop: '10px',
                              overflowX: 'auto',
                              overflowY: 'hidden', // Container scrolls horizontal, columns scroll vertical
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#CBD5E1 #F1F5F9',
                              minWidth: 0, // Wichtig für flex-shrink
                              position: 'relative',
                              outline: 'none', // Remove focus outline
                              paddingRight: '40px', // Extra space to ensure "Add Column" button is reachable
                              scrollBehavior: 'smooth' // Smooth scrolling
                            }}
                          >
                            <SortableContext
                              items={projectColumns.map(col => col.id)}
                              strategy={horizontalListSortingStrategy}
                            >
                              <div style={{ 
                                display: 'flex', 
                                gap: isMinimalDesign ? '5px' : '9px',
                                alignItems: 'stretch',
                                height: '100%',
                                minWidth: 'fit-content' // Ensure container is wide enough for all content
                              }}>
                                {renderColumns(displayColumns)}
                              </div>
                            </SortableContext>
                          </div>

                      )}
                    </div>
                  </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl shadow-2xl max-w-md mx-4 backdrop-blur-3xl ${
                isMinimalDesign
                  ? 'bg-white/5 dark:bg-gray-900/5 border border-white/10 dark:border-gray-700/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)]'
                  : (document.documentElement.classList.contains('dark')
                      ? 'bg-white/5 border border-white/10 shadow-[0_16px_40px_rgba(31,38,135,0.2)]'
                      : 'bg-white/40 border border-white/30 shadow-[0_16px_40px_rgba(31,38,135,0.1)]')
              } before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none relative overflow-hidden`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-xl ${
                  isMinimalDesign
                    ? 'bg-white/15 dark:bg-gray-700/15 border border-white/25 dark:border-gray-600/25 shadow-lg'
                    : 'bg-white/15 border border-white/25 shadow-lg'
                } relative z-10`}>
                  <Columns className={`w-8 h-8 ${
                    isMinimalDesign
                      ? 'text-white dark:text-white'
                      : `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
                  }`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 relative z-10 ${
                  isMinimalDesign
                    ? 'text-white dark:text-white'
                    : `document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-900'`
                } drop-shadow-lg`}>
                  {t('projects.no_project_selected')}
                </h3>
                <p className={`mb-6 relative z-10 ${
                  isMinimalDesign
                    ? 'text-white/90 dark:text-white/90'
                    : 'text-white/90'
                } drop-shadow-lg`}>
                  {t('projects.select_project_sidebar')}
                </p>
              </div>
            </div>
          )}
        </div>
            </div>


        {/* Modals */}
        {/* Task modal is opened globally via the 'open-task-modal' event */}

        {showSmartTaskModal && (
          <SmartTaskModal
            isOpen={showSmartTaskModal}
            onClose={() => {
              setShowSmartTaskModal(false);
            }}
            targetColumn={smartTaskTargetColumn}
                                  placeholder={forms.createTaskFor({ title: smartTaskTargetColumn?.title || 'Projekt' })}
            projectId={selectedProject?.id}
            kanbanColumnId={smartTaskTargetColumn?.kanbanColumnId || smartTaskTargetColumn?.id}
          />
        )}

        <ProjectManager
          isOpen={showProjectManager}
          onClose={() => setShowProjectManager(false)}
        />
        
        {selectedProject && (
          <ColumnManager
            isOpen={showColumnManager}
            onClose={() => setShowColumnManager(false)}
            projectId={selectedProject.id}
            projectTitle={selectedProject.title}
          />
        )}

        <DeleteProjectModal
          isOpen={deleteConfirmProjectId !== null}
          onClose={handleCancelDeleteProject}
          onConfirm={handleConfirmDeleteProject}
          project={deleteConfirmProjectId ? projects.find(p => p.id === deleteConfirmProjectId) || null : null}
          taskCount={deleteConfirmProjectId ? state.tasks.filter(t => 
            projectColumns.some(col => col.projectId === deleteConfirmProjectId && col.id === t.kanbanColumnId)
          ).length : 0}
        />

        {/* Time Budget Modal */}
        {showTimebudgetModal && timebudgetProject && (
          <ProjectTimebudgetModal
            isOpen={showTimebudgetModal}
            onClose={() => {
              setShowTimebudgetModal(false);
              setTimebudgetProject(null);
            }}
            project={timebudgetProject}
          />
        )}

        {/* Project Column Selector Modal */}
        {showProjectColumnSelector && targetProjectId && (
          <ProjectColumnSelector
            isOpen={showProjectColumnSelector}
            onClose={handleCloseProjectColumnSelector}
            onSelect={handleProjectAssignment}
            taskId={draggedTaskForProjectAssignment?.id}
            currentProjectId={draggedTaskForProjectAssignment?.columnId?.startsWith('project-') ? draggedTaskForProjectAssignment.columnId : undefined}
            currentColumnId={draggedTaskForProjectAssignment?.kanbanColumnId}
          />
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center"
            onClick={handleCancelNewProject}
          >
            <div 
              className={`rounded-lg shadow-xl p-6 m-4 w-full max-w-md ${
                isMinimalDesign
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-white dark:bg-gray-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('projects.create_new_project')}
              </h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('projects.project_name')}
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleNewProjectKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  style={{
                    focusRingColor: state.preferences.accentColor,
                    '--tw-ring-color': state.preferences.accentColor
                  } as React.CSSProperties}
                  placeholder={t('projects.project_name_placeholder')}
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelNewProject}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('projects.cancel')}
                </button>
                <button
                  onClick={handleCreateNewProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: newProjectName.trim() 
                      ? state.preferences.accentColor 
                      : '#9ca3af'
                  }}
                  onMouseEnter={(e) => {
                    if (newProjectName.trim()) {
                      e.currentTarget.style.backgroundColor = state.preferences.accentColor + 'E6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newProjectName.trim()) {
                      e.currentTarget.style.backgroundColor = state.preferences.accentColor;
                    }
                  }}
                >
                  {t('projects.create')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note Search Modal */}
        {showNoteSearch && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center" onClick={() => setShowNoteSearch(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-96" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notiz verknüpfen</h3>
                <div className="mt-2 relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
                    style={{
                      focusRingColor: state.preferences.accentColor,
                      '--tw-ring-color': state.preferences.accentColor
                    } as React.CSSProperties}
                    placeholder={t('search_notes')}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {availableNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => handleLinkNote(note.id)}
                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {note.title || 'Unbenannte Notiz'}
                        </div>
                        {note.content && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {note.content.substring(0, 80)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {availableNotes.length === 0 && (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {noteSearchQuery ? t('no_notes_found') : t('all_notes_linked')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* CSS animations for drag overlay */}
        <style>
          {`
            @keyframes dragFloat {
              0%, 100% { transform: rotate(2deg) scale(1.08) translateY(0px); }
              25% { transform: rotate(1deg) scale(1.08) translateY(-2px); }
              50% { transform: rotate(2.5deg) scale(1.08) translateY(-1px); }
              75% { transform: rotate(1.5deg) scale(1.08) translateY(-1.5px); }
            }
            
            @keyframes dragGlow {
              0% { filter: drop-shadow(0 25px 35px rgb(0 0 0 / 0.25)) drop-shadow(0 15px 20px rgb(0 0 0 / 0.15)) drop-shadow(0 0 20px rgb(59 130 246 / 0.3)); }
              100% { filter: drop-shadow(0 25px 35px rgb(0 0 0 / 0.25)) drop-shadow(0 15px 20px rgb(0 0 0 / 0.15)) drop-shadow(0 0 30px rgb(59 130 246 / 0.5)); }
            }
            
            @keyframes borderSweep {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            
            .animate-drag-overlay {
              background: radial-gradient(circle at center, rgba(0, 0, 0, 0.03), transparent 70%);
            }
          `}
        </style>
        
        {/* Archive Confirmation Modal */}
        {showArchiveModal && archiveModalData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ 
                  backgroundColor: `${state.preferences.accentColor}20` 
                }}>
                  <div className="text-3xl">🦊</div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-3">
                {t('archive_tasks')}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
                {t('archive_confirmation', { count: archiveModalData.completedCount, column: archiveModalData.columnTitle })}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowArchiveModal(false);
                    setArchiveModalData(null);
                  }}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirmArchive}
                  className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all hover:shadow-lg"
                  style={{ 
                    backgroundColor: state.preferences.accentColor,
                    boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
                  }}
                >
                  {t('ok')}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ✨ Custom Drag Preview using Portal - Direct Mouse Tracking (No Offset!) */}
        {activeTask && dragOffset && createPortal(
          <div
            style={{
              position: 'fixed',
              top: dragOffset.y - 40,
              left: dragOffset.x - 75,
              width: '320px',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'rotate(3deg) scale(1.02)',
              filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.2))',
            }}
          >
            <TaskCard
              task={activeTask}
              isInDragOverlay={true}
            />
          </div>,
          document.body
        )}
      </div>
    </DndContext>
  );
}