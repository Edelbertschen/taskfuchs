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
import { FolderOpen, Plus, Settings, Edit2, Sparkles, X, MoreHorizontal, Columns, Focus, ChevronUp, ChevronDown, Filter, Hash, AlertCircle, Circle, CheckCircle, Archive, Clock, Trash2, Check, FileText, Info, Pin, Tag, GripVertical, Calendar, SlidersHorizontal, Pencil, Palette, LayoutGrid } from 'lucide-react';
import { CompactFilterBar, DateFilterOption, PriorityOption } from '../Common/CompactFilterBar';
import { useApp } from '../../context/AppContext';
import { TaskCard } from '../Tasks/TaskCard';
import { TaskColumn } from '../Tasks/TaskColumn';
import { DropIndicator } from '../Tasks/DropIndicator';
import { ProjectManager } from '../Projects/ProjectManager';
import { ColumnManager } from '../Projects/ColumnManager';
import { ProjectToggle } from '../Projects/ProjectToggle';
import { ProjectColumnSelector } from '../Projects/ProjectColumnSelector';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import { TaskModal } from '../Tasks/TaskModal';
import { Header } from '../Layout/Header';
import type { Task, Column, ProjectKanbanColumn } from '../../types';
import type { OutlookEmail } from '../../types/email';
import { format, addDays, startOfDay, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEmail } from '../../context/EmailContext';
import { createTaskFromEmail } from '../../utils/emailToTask';

export function ProjectKanbanBoard() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const { actions, forms, titles, messages, kanban } = useAppTranslation();
  const { performEmailToTaskAction } = useEmail();
  
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

  // Reactive dark mode - derived from state, not DOM
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  // Removed local columnOffset - now using state.projectColumnOffset from global state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [shouldEditNewColumn, setShouldEditNewColumn] = useState(false);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterPinned, setFilterPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-project-filter-pinned');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [hidePinnedTasks, setHidePinnedTasks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taskfuchs-project-hide-pinned');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  
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
  
  // Color picker state - lifted up to prevent reset during re-renders
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);
  const [customColorInput, setCustomColorInput] = useState<string>('#2196F3');
  
  // Context menu state - lifted up to prevent reset during re-renders (timer updates)
  const [contextMenuProjectId, setContextMenuProjectId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Ref for horizontal scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Close color picker when clicking outside
  useEffect(() => {
    if (!colorPickerProjectId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a color picker popover
      if (target.closest('[data-color-picker]')) return;
      setColorPickerProjectId(null);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerProjectId]);
  
  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenuProjectId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the context menu
      if (target.closest('[data-context-menu]')) return;
      setContextMenuProjectId(null);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenuProjectId]);

  // Use default sensors (like TaskBoard)

  // Do not auto-open sidebar; initial state is derived from persisted minimized state


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
  // - SHIFT + wheel navigates columns (handled globally in App.tsx)
  // - Arrow keys navigate columns

  // Listen for column navigation from ColumnSwitcher arrows
  useEffect(() => {
    const handleColumnNavigate = (e: CustomEvent<{ direction: 'prev' | 'next' }>) => {
      dispatch({ type: 'NAVIGATE_PROJECTS', payload: e.detail.direction });
    };

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
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';
        dispatch({ type: 'NAVIGATE_PROJECTS', payload: direction });
      }
    };

    window.addEventListener('column-navigate', handleColumnNavigate as EventListener);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('column-navigate', handleColumnNavigate as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
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

  // Dispatch scroll state for ColumnSwitcher arrows
  useEffect(() => {
    const visibleCount = state.preferences.columns.projectsVisible ?? state.preferences.columns.visible;
    const totalColumns = projectColumns.length + 1; // +1 for "Add Column" button
    const canPrev = state.projectColumnOffset > 0;
    const canNext = state.projectColumnOffset + visibleCount < totalColumns;
    window.dispatchEvent(new CustomEvent('column-scroll-state', { 
      detail: { canPrev, canNext } 
    }));
  }, [state.projectColumnOffset, projectColumns.length, state.preferences.columns.projectsVisible, state.preferences.columns.visible]);

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

  // Delete Project Modal - uses lifted state to prevent input reset during re-renders
  const deleteProject = deleteConfirmProjectId ? projects.find(p => p.id === deleteConfirmProjectId) || null : null;
  const deleteTaskCount = deleteConfirmProjectId ? state.tasks.filter(t => 
    projectColumns.some(col => col.projectId === deleteConfirmProjectId && col.id === t.kanbanColumnId)
  ).length : 0;

  // Compact color palette for projects
  const PROJECT_COLORS = [
    '#E54D42', '#E89830', '#DFBF3C', '#4CAF50', '#26A69A', 
    '#2196F3', '#5C6BC0', '#9C27B0', '#EC407A', '#78909C'
  ];

  // Sortable Project Component
  const SortableProject = ({ project }: { project: Column }) => {
    // Use lifted state for color picker to prevent reset during re-renders
    const showColorPicker = colorPickerProjectId === project.id;
    const setShowColorPicker = (show: boolean) => {
      if (show) {
        setColorPickerProjectId(project.id);
        setCustomColorInput(project.color || '#2196F3');
      } else {
        setColorPickerProjectId(null);
      }
    };
    const customColor = customColorInput;
    const setCustomColor = setCustomColorInput;
    
    // Use lifted state for context menu to prevent reset during re-renders
    const showContextMenu = contextMenuProjectId === project.id;
    const colorPickerRef = useRef<HTMLDivElement>(null);
    
    // Handle right-click context menu
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setContextMenuProjectId(project.id);
    };
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
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
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    // Show drop indicator when another project is being dragged over this one
    const showDropIndicator = isOver && activeProjectId && activeProjectId !== project.id;

    // Combine refs for sortable and droppable
    const combinedRef = (node: HTMLElement | null) => {
      setNodeRef(node);
      setDroppableRef(node);
    };

    // Get all columns for THIS specific project (not just the selected project)
    const allProjectColumns = state.viewState.projectKanban.columns
      .filter(col => col.projectId === project.id);
      
    // Count only tasks that are actually IN the project's kanban columns (not archived, not completed)
    const projectTaskCount = state.tasks.filter(t => 
      !t.completed && 
      !t.archived &&
      allProjectColumns.some(col => col.id === t.kanbanColumnId)
    ).length;

    const isEditing = editingProjectId === project.id;
    
    // Handle color change
    const handleColorChange = (color: string | undefined) => {
      dispatch({
        type: 'UPDATE_COLUMN',
        payload: { ...project, color }
      });
      setColorPickerProjectId(null);
    };
    const isSelected = selectedProject?.id === project.id;
    const isHovered = hoveredProjectId === project.id;
    const projectIndex = projects.findIndex(p => p.id === project.id);

    return (
      <div className="relative">
        {/* Drop Indicator - shows where the project will be inserted */}
        {showDropIndicator && (
          <div 
            className="absolute -top-0.5 left-2 right-2 h-1 rounded-full z-20 animate-pulse"
            style={{ backgroundColor: state.preferences.accentColor }}
          />
        )}
        
      <div
        ref={combinedRef}
          className={`relative p-4 pl-5 cursor-pointer transition-all duration-200 group h-16 ${
          isMinimalDesign
              ? `border-b border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`
            : `border-b border-white/15 hover:bg-black/40`
        } ${
          isTaskDropZone && activeTask ? 'ring-2 ring-offset-1' : ''
          } ${
            isDragging ? 'opacity-30 scale-95' : ''
        }`}
        onClick={() => !isEditing && handleProjectSelect(project.id)}
        onContextMenu={handleContextMenu}
        style={{
          ...style,
          backgroundColor: isMinimalDesign
            ? (isSelected 
                ? getAccentColorStyles().bgLight.backgroundColor
                : isTaskDropZone && activeTask
                ? '#f3f4f6'
                  : isDragging 
                  ? 'transparent'
                  : undefined)
            : (isSelected 
                ? (getAccentColorStyles().bg.backgroundColor + '1A') 
                : isTaskDropZone && activeTask
                ? (getAccentColorStyles().bg.backgroundColor + '20')
                  : isDragging
                  ? 'transparent'
                  : undefined),
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
        {/* Selection Indicator - Thin accent bar on the very left edge */}
        {isSelected && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 z-10"
            style={{
              backgroundColor: getAccentColorStyles().border.borderColor
            }}
          />
        )}
        
        {/* Project Color Bar - Left Edge (offset when selected) */}
        <div
          className={`absolute top-0 bottom-0 w-2 transition-all duration-200 ${isSelected ? 'left-1' : 'left-0'}`}
          style={{
            backgroundColor: project.color || 'transparent'
          }}
        />
        
        {/* Normal Project Display */}
        <div className="flex items-center justify-between">
          {/* Drag Handle */}
          <div 
            className={`flex-shrink-0 mr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${
              isDragging ? 'opacity-100' : ''
            }`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className={`w-4 h-4 ${
              isMinimalDesign
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-400'
            }`} />
          </div>
          
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
                      ? (isDarkMode ? 'text-white' : 'text-gray-900')
                      : (isDarkMode ? 'text-gray-200' : 'text-gray-900'))
              }`}>
                {project.title}
              </h3>
            )}
          </div>
          
                  {/* Right side - Task count and color picker */}
        {!isEditing && (
          <div className="flex items-center space-x-2" ref={colorPickerRef}>
            {/* Color Picker Button - compact */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className={`w-4 h-4 rounded-full transition-all duration-200 hover:scale-125 flex-shrink-0 opacity-0 group-hover:opacity-100 ${
                showColorPicker ? 'opacity-100 scale-110' : ''
              }`}
              style={{
                backgroundColor: project.color || '#d1d5db',
                boxShadow: project.color ? `0 0 0 2px ${project.color}30` : 'none'
              }}
              title={t('projects.change_color', 'Farbe ändern')}
            />
            
            {/* Task count indicator */}
            <span className={`text-sm font-medium ${
              isMinimalDesign
                ? 'text-gray-500 dark:text-gray-400' 
                : (isDarkMode ? 'text-white/60' : 'text-gray-600')
              }`}>
                {projectTaskCount}
              </span>

            {/* Elegant Color Picker Popover */}
            {showColorPicker && (
              <div 
                data-color-picker="true"
                className="absolute right-2 top-14 z-[100] p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                {/* No Color Option */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                    handleColorChange(undefined);
                  }}
                  className={`w-full mb-2 px-2 py-1.5 text-xs rounded-lg transition-all duration-150 flex items-center gap-2 ${
                    !project.color 
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <X className="w-3 h-3" />
                  {t('projects.no_color', 'Keine Farbe')}
              </button>

                {/* Preset Colors */}
                <div className="flex gap-1.5 mb-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorChange(color);
                      }}
                      className={`w-5 h-5 rounded-full transition-all duration-150 hover:scale-125 ${
                        project.color === color ? 'ring-2 ring-offset-1 ring-gray-500 dark:ring-offset-gray-800' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {/* Custom Color */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    title={t('projects.custom_color', 'Eigene Farbe')}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(customColor);
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-1"
                  >
                    {t('projects.custom_color', 'Eigene Farbe')}
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}
        </div>
        </div>
        
        {/* Context Menu */}
        {showContextMenu && createPortal(
          <div
            data-context-menu="true"
            className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: contextMenuPos.x,
              top: contextMenuPos.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Projekt umbenennen */}
            <button
              onClick={() => {
                setContextMenuProjectId(null);
                handleStartEditProject(project.id, project.title);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              <span>{t('projects.rename', 'Projekt umbenennen')}</span>
            </button>
            
            {/* Farbe zuweisen */}
            <button
              onClick={() => {
                setContextMenuProjectId(null);
                setShowColorPicker(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Palette className="w-4 h-4" />
              <span>{t('projects.assign_color', 'Farbe zuweisen')}</span>
            </button>
            
            {/* Spalten organisieren */}
            <button
              onClick={() => {
                setContextMenuProjectId(null);
                handleProjectSelect(project.id);
                setShowColumnManager(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t('projects.organize_columns', 'Spalten organisieren')}</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            
            {/* Projekt löschen */}
            <button
              onClick={() => {
                setContextMenuProjectId(null);
                setDeleteConfirmProjectId(project.id);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('projects.delete', 'Projekt löschen')}</span>
            </button>
          </div>,
          document.body
        )}
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

    // Apply tag filters (using project-specific filters)
    if (state.viewState.projectKanban.tagFilters.length > 0) {
      const hasAllActiveTags = state.viewState.projectKanban.tagFilters.every(filterTag =>
        task.tags.includes(filterTag)
      );
      if (!hasAllActiveTags) {
        return false;
      }
    }
    
    // Apply priority filters (using project-specific filters)
    if (state.viewState.projectKanban.priorityFilters.length > 0) {
      const taskPriority = task.priority || 'none';
      const hasActivePriority = state.viewState.projectKanban.priorityFilters.includes(taskPriority);
      if (!hasActivePriority) {
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

    // Apply date filter
    const dateFilter = state.viewState.projectKanban.dateFilter || 'all';
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

    // Apply hide pinned tasks filter
    if (hidePinnedTasks && task.pinned) {
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
    
    // Handle task dragging
    if (activeData?.type === 'task') {
      const task = state.tasks.find(t => t.id === active.id);
      if (task) {
        setActiveTask(task);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
      return;
    }
    
    // Handle column dragging
    if (activeData?.type === 'column') {
      setActiveColumnId(active.id as string);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    }
    
    // Handle project dragging (from sidebar)
        const project = projects.find(p => p.id === active.id);
        if (project) {
          setActiveProjectId(project.id);
          if (navigator.vibrate) {
            navigator.vibrate(50);
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
    setActiveColumnId(null);

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

    // Handle column reordering
    if (activeData?.type === 'column' && over.id !== active.id && selectedProject) {
      const oldIndex = projectColumns.findIndex(col => col.id === active.id);
      const newIndex = projectColumns.findIndex(col => col.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedColumns = arrayMove(projectColumns, oldIndex, newIndex);
        dispatch({
          type: 'REORDER_PROJECT_KANBAN_COLUMNS',
          payload: {
            projectId: selectedProject.id,
            columnIds: reorderedColumns.map(col => col.id)
          }
        });
      }
      return;
    }

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
    
    // Use default title if empty - never delete columns automatically
    const finalTitle = titleToUse.trim() || t('projects.newColumn', 'Neue Spalte');
    
    // Check if we're editing the main project column
    if (columnIdToUse === selectedProject?.id) {
      // Update the project title
      dispatch({
        type: 'UPDATE_COLUMN',
        payload: {
          id: columnIdToUse,
          title: finalTitle,
          type: 'project'
        } as Column
      });
    } else {
      // Update a custom project column
      dispatch({
        type: 'UPDATE_PROJECT_KANBAN_COLUMN',
        payload: {
          columnId: columnIdToUse,
          title: finalTitle
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
    dispatch({ type: 'START_TIMER', payload: { taskId: task.id } });
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

  // Email drop handler for project kanban columns
  const handleEmailDropOnColumn = async (email: OutlookEmail, column: Column, position: number) => {
    if (!selectedProject) return;
    
    try {
      const task = createTaskFromEmail(email, column);
      
      // Set project-specific fields
      task.projectId = selectedProject.id;
      task.kanbanColumnId = column.id;
      task.columnId = selectedProject.id; // Column ID is the project ID for project tasks
      
      // Get existing tasks in the column and calculate position
      const columnTasks = state.tasks
        .filter(t => t.projectId === selectedProject.id && t.kanbanColumnId === column.id && !t.completed)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Calculate the new position based on insert index
      if (columnTasks.length === 0 || position >= columnTasks.length) {
        task.position = Date.now();
      } else if (position === 0) {
        const firstTaskPosition = columnTasks[0]?.position || Date.now();
        task.position = Number(firstTaskPosition) - 1000;
      } else {
        const prevPosition = Number(columnTasks[position - 1]?.position || 0);
        const nextPosition = Number(columnTasks[position]?.position || Date.now());
        task.position = Math.floor((prevPosition + nextPosition) / 2);
      }
      
      dispatch({
        type: 'ADD_TASK',
        payload: task
      });

      // Perform configured action on the email (mark read, archive, etc.)
      await performEmailToTaskAction(email.id);

      // Show success notification
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `email-task-${Date.now()}`,
          title: t('email.taskCreated', 'Task created'),
          message: t('email.taskCreatedFromEmail', 'Task created from email: {{title}}', { title: email.subject }),
          timestamp: new Date().toISOString(),
          type: 'success' as const,
          read: false
        }
      });
    } catch (error) {
      console.error('Failed to create task from dropped email:', error);
    }
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

  // Sortable column component with drag handle
  const SortableKanbanColumn = ({ column, tasks }: { column: Column, tasks: Task[] }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
    } = useSortable({ 
      id: column.id,
      data: { type: 'column' }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    // Show drop indicator when another column is being dragged over this one
    const showDropIndicator = isOver && activeColumnId && activeColumnId !== column.id;

    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={`flex-1 min-w-0 relative group/column transition-all duration-200 ${
          isDragging ? 'opacity-30 scale-[0.98]' : ''
        }`}
      >
        {/* Left Drop Indicator for Column */}
        {showDropIndicator && (
          <div 
            className="absolute -left-1 top-0 bottom-0 w-1 rounded-full z-20 animate-pulse"
            style={{ backgroundColor: state.preferences.accentColor }}
          />
        )}
          {/* Drag Handle for Column - appears on hover */}
          <div 
            {...attributes}
            {...listeners}
            className={`absolute -left-2 top-3 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-lg opacity-0 group-hover/column:opacity-100 transition-all duration-150 ${
              isDragging ? 'opacity-100 scale-110' : ''
            } ${
              isMinimalDesign 
                ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm' 
                : 'bg-white/20 hover:bg-white/30 shadow-lg'
            }`}
            title="Spalte verschieben"
          >
            <GripVertical className={`w-4 h-4 ${
              isMinimalDesign 
                ? 'text-gray-500 dark:text-gray-400' 
                : 'text-gray-200'
            }`} />
          </div>
          
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
          onEmailDrop={handleEmailDropOnColumn}
          isDragging={isDragging}
        />
      </div>
    );
  };

  // Render columns using TaskColumn component (exactly like TaskBoard)
  const renderColumns = (columns: (Column | null | undefined)[]) => {
    const result = [];
    const realColumnsCount = columns.filter(c => c && c !== null && c !== undefined).length;
    const visibleColumnsSetting = state.preferences.columns.projectsVisible ?? state.preferences.columns.visible;
    const isSingle = realColumnsCount === 1 && visibleColumnsSetting === 1;
    
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
                ? 'border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                : 'backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-2 border-dashed border-white/40 dark:border-gray-600/50 hover:bg-white/40 dark:hover:bg-gray-900/50 hover:border-white/60 dark:hover:border-gray-500/60'
            }`}
            style={isMinimalDesign ? {
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF'
            } : undefined}
            title={actions.add_column()}
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
          >
            <div className="h-32"></div>
          </div>
        );
      } else {
        // Regular column
        const columnTasks = filteredTasks
          .filter(task => task.kanbanColumnId === column.id)
          .sort((a, b) => a.position - b.position);
        
        const columnNode = (
          <SortableContext
            key={column.id}
            items={columnTasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <SortableKanbanColumn 
              column={column}
              tasks={columnTasks}
            />
          </SortableContext>
        );
        
        // In single-column view, wrap with fixed width (600px like Pins)
        if (isSingle) {
          result.push(
            <div key={`single-wrap-${column.id}`} style={{ flex: '0 0 600px', maxWidth: 600, width: 600, margin: '0 auto' }}>
              {columnNode}
            </div>
          );
        } else {
          result.push(columnNode);
        }
        
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
    dispatch({ type: 'SET_PROJECT_KANBAN_DATE_FILTER', payload: 'all' });
    dispatch({ type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED', payload: false });
    setHidePinnedTasks(false);
    try { localStorage.setItem('taskfuchs-project-hide-pinned', 'false'); } catch {}
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
        <div 
          className={`flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 border-r ${
          isMinimalDesign
              ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-white/20 dark:border-gray-700/30'
        }`}
        style={{ 
            boxShadow: isMinimalDesign ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
            width: sidebarMinimized ? '0px' : '320px',
            marginLeft: sidebarMinimized ? '-320px' : '0px',
            }}
          >
                {/* Header */}
                <div 
            className="relative flex items-center px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]"
                  style={{ 
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
                  <h1 className="text-lg font-semibold flex items-center space-x-2 text-gray-900 dark:text-white">
                          <Columns className="w-5 h-5" style={getAccentColorStyles().text} />
                          <span>{t('projects.title')}</span>
                        </h1>
                        {/* Removed redundant subtitle below main title */}
                        <button
                          onClick={handleOpenNewProjectModal}
                          className={`p-2 rounded-md transition-colors duration-200 ${
                            isMinimalDesign 
                              ? (isDarkMode
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
                        isMinimalDesign ? 'text-black dark:text-white' : (isDarkMode ? 'text-white' : 'text-gray-900')
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
                      ? (isDarkMode ? 'border-white/15 bg-transparent' : 'border-gray-300/50 bg-white/30')
                      : (isDarkMode ? 'border-gray-800 bg-[#1a1d21]' : 'border-gray-300 bg-gray-100')
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isMinimalDesign 
                        ? (isDarkMode
                            ? 'text-gray-300'
                            : 'text-gray-700')
                        : (isDarkMode ? 'text-gray-300' : 'text-gray-900')
                    }`}>
                      {selectedProject ? (t('tasks.title') + `: ${filteredTasks.length}`) : (t('projects.no_project_selected'))}
                    </span>
                    <span className={`text-sm font-medium ${
                      isMinimalDesign 
                        ? (isDarkMode
                            ? 'text-gray-300'
                            : 'text-gray-700')
                        : (isDarkMode ? 'text-gray-300' : 'text-gray-900')
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
                          : (isDarkMode ? 'bg-gray-700 dark:bg-gray-700' : 'bg-gray-200')
                      }`}>
                        <Columns className={`w-6 h-6 ${
                          isMinimalDesign 
                            ? 'text-gray-500 dark:text-gray-400' 
                            : (isDarkMode ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600')
                        }`} />
                      </div>
                      <h3 className={`text-base font-medium mb-2 ${
                        isMinimalDesign 
                          ? 'text-gray-900 dark:text-white' 
                          : (isDarkMode ? 'text-white' : 'text-gray-900')
                      }`}>
                        {t('projects.no_projects_title')}
                      </h3>
                      <p className={`text-sm mb-6 max-w-md ${
                        isMinimalDesign 
                          ? 'text-gray-600 dark:text-gray-300' 
                          : (isDarkMode ? 'text-gray-400' : 'text-gray-700')
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
                className="relative flex-1 flex flex-col min-h-0"
              >
                {/* Compact Filter Bar - Elegant & Space-Efficient */}
                {selectedProject && (showFilterDropdown || filterPinned) && (
                  <div className="mx-4 mt-3 flex-shrink-0">
                    <CompactFilterBar
                      priorityFilter={
                        state.viewState.projectKanban.priorityFilters.length === 1
                          ? state.viewState.projectKanban.priorityFilters[0] as PriorityOption
                          : 'all'
                      }
                      dateFilter={(state.viewState.projectKanban.dateFilter || 'all') as DateFilterOption}
                      tagFilters={state.viewState.projectKanban.tagFilters}
                      showCompleted={state.viewState.projectKanban.showCompleted}
                      hidePinned={hidePinnedTasks}
                      availableTags={state.tags.filter(tag => {
                                const actualTaskCount = filteredTasks.filter(task => task.tags.includes(tag.name)).length;
                                return tag.count > 0 && actualTaskCount > 0;
                      }).sort((a, b) => b.count - a.count)}
                      onPriorityChange={(priority) => {
                        if (priority === 'all') {
                          dispatch({ type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS', payload: [] });
                        } else {
                          dispatch({ type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS', payload: [priority as any] });
                        }
                      }}
                      onDateFilterChange={(filter) => {
                        dispatch({ type: 'SET_PROJECT_KANBAN_DATE_FILTER', payload: filter });
                      }}
                      onTagToggle={handleToggleProjectTag}
                      onShowCompletedToggle={() => {
                        dispatch({ type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED', payload: !state.viewState.projectKanban.showCompleted });
                      }}
                      onHidePinnedToggle={() => {
                        const newValue = !hidePinnedTasks;
                        setHidePinnedTasks(newValue);
                        try { localStorage.setItem('taskfuchs-project-hide-pinned', String(newValue)); } catch {}
                      }}
                      onClearAll={handleClearAllProjectFilters}
                      accentColor={state.preferences.accentColor}
                      isDarkMode={isDarkMode}
                      isMinimalDesign={isMinimalDesign}
                      isPinned={filterPinned}
                      onPinnedChange={(pinned) => {
                        setFilterPinned(pinned);
                        try { localStorage.setItem('taskfuchs-project-filter-pinned', String(pinned)); } catch {}
                        if (pinned) {
                          setShowFilterDropdown(true);
                        }
                      }}
                      isVisible={true}
                      onClose={() => setShowFilterDropdown(false)}
                      showHidePinnedOption={true}
                    />
                  </div>
                )}

                {/* Linked Notes Section */}


                  {/* Kanban Board - Using TaskColumn like TaskBoard */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 flex flex-col relative px-4 pb-4" style={{ paddingTop: '35px' }}>
                    <div className="flex flex-col flex-1 min-h-0 gap-3 w-full">
                      {displayColumns.length > 0 && (
                          <div 
                            ref={scrollContainerRef}
                            tabIndex={0}
                            className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-10"
                            style={{ 
                              scrollBehavior: 'smooth',
                              outline: 'none'
                            }}
                          >
                            <SortableContext
                              items={projectColumns.map(col => col.id)}
                              strategy={horizontalListSortingStrategy}
                            >
                              <div style={{ 
                                display: 'flex', 
                                gap: isMinimalDesign ? '5px' : '9px',
                                alignItems: 'flex-start',
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
                  : (isDarkMode
                      ? 'bg-white/5 border border-white/10 shadow-[0_16px_40px_rgba(31,38,135,0.2)]'
                      : 'bg-white/40 border border-white/30 shadow-[0_16px_40px_rgba(31,38,135,0.1)]')
              } before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none relative overflow-hidden`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-xl ${
                  isMinimalDesign
                    ? 'bg-white/15 dark:bg-gray-700/15 border border-white/25 dark:border-gray-600/25 shadow-lg'
                    : (isDarkMode ? 'bg-white/15 border border-white/25 shadow-lg' : 'bg-gray-200/60 border border-gray-300/40 shadow-lg')
                } relative z-10`}>
                  <Columns className={`w-8 h-8 ${
                    isMinimalDesign
                      ? 'text-white dark:text-white'
                      : (isDarkMode ? 'text-white' : 'text-gray-900')
                  }`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 relative z-10 ${
                  isMinimalDesign
                    ? 'text-white dark:text-white'
                    : (isDarkMode ? 'text-white' : 'text-gray-900')
                } drop-shadow-lg`}>
                  {t('projects.no_project_selected')}
                </h3>
                <p className={`mb-6 relative z-10 ${
                  isMinimalDesign
                    ? 'text-white/90 dark:text-white/90'
                    : (isDarkMode ? 'text-white/90' : 'text-gray-700')
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

        {/* Delete Project Modal - inline to use lifted state */}
        {deleteConfirmProjectId !== null && deleteProject && (
          <div className="fixed inset-0 flex items-center justify-center z-[999999]">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCancelDeleteProject} />
            <div className={`relative rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-[1000000] ${
              isMinimalDesign
                ? 'bg-white dark:bg-gray-800'
                : 'bg-white dark:bg-gray-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('kanban.project.delete_title')}
                </h3>
                <button
                  onClick={handleCancelDeleteProject}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('kanban.project.delete_confirm', { name: deleteProject.title })}
                </p>
                {deleteTaskCount > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                    {t('kanban.project.delete_warning', { count: deleteTaskCount })}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('kanban.project.delete_input_label')}
                </p>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('kanban.project.delete_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelDeleteProject}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('kanban.project.delete_cancel')}
                </button>
                <button
                  onClick={handleConfirmDeleteProject}
                  disabled={deleteConfirmText !== t('kanban.project.delete_placeholder')}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('kanban.project.delete_button')}
                </button>
              </div>
            </div>
          </div>
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



        {/* ✨ Elegant DragOverlay for Tasks, Projects, and Columns */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          style={{
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {activeTask && (
            <div style={{
              transform: 'translateX(-70px) translateY(10px)',
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.15))',
            }}>
              <TaskCard
                task={activeTask}
                isInDragOverlay={true}
              />
            </div>
          )}
          
          {/* Project Drag Overlay */}
          {activeProjectId && (() => {
            const project = projects.find(p => p.id === activeProjectId);
            if (!project) return null;
            
            const projectTaskCount = state.tasks.filter(t => 
              !t.completed && 
              !t.archived &&
              state.viewState.projectKanban.columns
                .filter(col => col.projectId === project.id)
                .some(col => col.id === t.kanbanColumnId)
            ).length;
            
            return (
              <div 
                className={`p-4 rounded-xl shadow-2xl border-2 ${
                  isMinimalDesign
                    ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-800 border-gray-500'
                }`}
                style={{
                  width: '280px',
                  transform: 'rotate(2deg) scale(1.02)',
                  boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px ${state.preferences.accentColor}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Project Color Indicator */}
                    {project.color && (
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <h3 className={`text-sm font-semibold truncate ${
                      isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
                    }`}>
                      {project.title}
                    </h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    isMinimalDesign 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-white/20 text-white'
                  }`}>
                    {projectTaskCount} Tasks
                  </span>
                </div>
              </div>
            );
          })()}
          
          {/* Column Drag Overlay */}
          {activeColumnId && (() => {
            const column = projectColumns.find(c => c.id === activeColumnId);
            if (!column) return null;
            
            const columnTasks = filteredTasks.filter(t => t.kanbanColumnId === column.id);
            
            return (
              <div 
                className={`rounded-xl shadow-2xl border-2 overflow-hidden ${
                  isMinimalDesign
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-800/90 border-gray-500'
                }`}
                style={{
                  width: '300px',
                  maxHeight: '400px',
                  transform: 'rotate(1deg) scale(1.02)',
                  boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px ${state.preferences.accentColor}`,
                }}
              >
                {/* Column Header */}
                <div 
                  className={`px-4 py-3 border-b ${
                    isMinimalDesign
                      ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${
                      isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'
                    }`}>
                      {column.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isMinimalDesign 
                        ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        : 'bg-white/20 text-white'
                    }`}>
                      {columnTasks.length}
                    </span>
                  </div>
                </div>
                
                {/* Preview Tasks */}
                <div className="p-2 space-y-1 max-h-[300px] overflow-hidden">
                  {columnTasks.slice(0, 3).map(task => (
                    <div 
                      key={task.id}
                      className={`px-3 py-2 rounded-lg text-xs truncate ${
                        isMinimalDesign
                          ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-gray-600 text-gray-200'
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {columnTasks.length > 3 && (
                    <div className={`text-xs text-center py-1 ${
                      isMinimalDesign ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      +{columnTasks.length - 3} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DragOverlay>
      </div>
    </DndContext>
  );
}