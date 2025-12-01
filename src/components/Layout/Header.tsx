import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  LogOut, 
  User, 
  Filter, 
  X, 
  Sun, 
  Moon, 
  Hash,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  FolderOpen,
  FolderClosed,
  Bell,
  BellRing,
  Clock,
  CheckCircle,
  CheckSquare,
  LayoutGrid,
  List,
  MoreHorizontal,
  ChevronLeft,
  Columns,
  Settings,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  MoveRight,
  HelpCircle,
  Sparkles,
  FileText,
  Info,
  Printer,
  Edit3,
  Trash2,
  Pin
} from 'lucide-react';
import { ProfileModal } from '../Common/ProfileModal';
import { DatePickerSlider } from '../Common/DatePickerSlider';
import { UserGuide } from '../Common/UserGuide';
import { OnboardingTour } from '../Common/OnboardingTour';
import { ProjectTimebudgetHeader } from '../Projects/ProjectTimebudgetHeader';
import { ProjectTimebudgetDetailModal } from '../Projects/ProjectTimebudgetDetailModal';
import { ColumnManager } from '../Projects/ColumnManager';
import { exportPlannerToPrint } from '../../utils/plannerExport';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useDebounce } from '../../utils/performance';

interface HeaderProps {
  currentView: string;
}

export const Header = memo(function Header({ currentView }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const { logout, state: authState, isGuest } = useAuth();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [projectSidebarMinimized, setProjectSidebarMinimized] = useState(false);
  const [taskSidebarMinimized, setTaskSidebarMinimized] = useState(false);
  const [pinsSidebarMinimized, setPinsSidebarMinimized] = useState(true);
  const [notesSliderOpen, setNotesSliderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Project states
  const [showProjectTimebudgetModal, setShowProjectTimebudgetModal] = useState(false);
  const [editingProjectTitle, setEditingProjectTitle] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  // 🔍 Performance Boost: Debounced search für bessere Performance 
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms Delay
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{tasks: any[], notes: any[]}>({tasks: [], notes: []});
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      // Always clear input on open and focus
      setSearchQuery('');
      setShowSearchResults(false);
      searchInputRef.current.value = '' as any;
      searchInputRef.current.focus();
    }
  }, [isSearchOpen, setSearchQuery]);

  // Handle keyboard shortcuts and custom events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close filter panel with Escape key
      if (event.key === 'Escape' && isFilterOpen) {
        setIsFilterOpen(false);
      }
      // Close search with Escape key
      if (event.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
      // Close more menu with Escape key
      if (event.key === 'Escape' && showMoreMenu) {
        setShowMoreMenu(false);
      }

    };

    const handleSidebarStateChange = (event: CustomEvent) => {
      setProjectSidebarMinimized(event.detail.minimized);
    };

    const handleTaskSidebarStateChange = (event: CustomEvent) => {
      setTaskSidebarMinimized(event.detail.minimized);
    };

    const handlePinsSidebarStateChange = (event: CustomEvent) => {
      setPinsSidebarMinimized(event.detail.minimized);
    };

    const handleNotesSliderStateChange = (event: CustomEvent) => {
      setNotesSliderOpen(event.detail.isOpen);
    };

    // 🚀 Handle Help Shortcut Event
    const handleOpenUserGuide = () => {
      setShowUserGuide(true);
    };
    const handleStartOnboarding = () => {
      setShowOnboarding(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('project-sidebar-state-changed', handleSidebarStateChange);
    window.addEventListener('task-sidebar-state-changed', handleTaskSidebarStateChange);
    window.addEventListener('pins-sidebar-state-changed', handlePinsSidebarStateChange);
    window.addEventListener('notes-slider-state-changed', handleNotesSliderStateChange);
    window.addEventListener('open-user-guide', handleOpenUserGuide);
    window.addEventListener('start-onboarding', handleStartOnboarding);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('project-sidebar-state-changed', handleSidebarStateChange);
      window.removeEventListener('task-sidebar-state-changed', handleTaskSidebarStateChange);
      window.removeEventListener('pins-sidebar-state-changed', handlePinsSidebarStateChange);
      window.removeEventListener('notes-slider-state-changed', handleNotesSliderStateChange);
      window.removeEventListener('open-user-guide', handleOpenUserGuide);
      window.removeEventListener('start-onboarding', handleStartOnboarding);
    };
  }, []);

  // Close filter panel when leaving tasks, notes, or pins view
  useEffect(() => {
    if (currentView !== 'tasks' && currentView !== 'notes' && currentView !== 'pins' && isFilterOpen) {
      setIsFilterOpen(false);
    }
  }, [currentView, isFilterOpen]);

  // Close search when clicking outside (but not filter - user controls that)
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Ignore clicks within the search results portal
    if (target && target.closest('[data-search-portal="true"]')) {
      return;
    }
    if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
      setIsSearchOpen(false);
      setShowSearchResults(false);
    }
    if (notificationRef.current && !notificationRef.current.contains(target)) {
      setShowNotifications(false);
    }
    if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
      setShowMoreMenu(false);
    }

  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Also close header menus on view changes to avoid lingering popovers
  useEffect(() => {
    setShowNotifications(false);
    setIsSearchOpen(false);
    setShowSearchResults(false);
    setShowMoreMenu(false);
    setIsFilterOpen(false);
  }, [currentView]);

  // Check for due tasks and create notifications
  useEffect(() => {
    const checkTaskNotifications = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      state.tasks.forEach(task => {
        if (!task.completed && task.reminderDate === currentDate && task.reminderTime === currentTime) {
          // Check if notification already exists
          const existingNotification = state.notifications.find(
            n => n.taskId === task.id && n.type === 'reminder'
          );

          if (!existingNotification) {
            const notification = {
              id: `${task.id}-${now.getTime()}`,
              taskId: task.id,
                    title: t('header.task_due'),
      message: t('header.task_due_message', { title: task.title }),
              timestamp: now.toISOString(),
              type: 'reminder' as const,
              read: false,
            };

            dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkTaskNotifications, 60000);
    checkTaskNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [state.tasks, state.notifications, dispatch]);

  // Live search function - jetzt mit debounced query
  const performLiveSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults({tasks: [], notes: []});
      setShowSearchResults(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    
    // Search tasks
    const matchingTasks = state.tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      task.subtasks.some(subtask => 
        subtask.title.toLowerCase().includes(searchTerm) ||
        subtask.description?.toLowerCase().includes(searchTerm)
      )
    ).slice(0, 10);

    // Search notes
    const matchingNotes = (state.notes?.notes || []).filter(note => 
      note.title?.toLowerCase().includes(searchTerm) ||
      note.content?.toLowerCase().includes(searchTerm) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    ).slice(0, 10);

    setSearchResults({tasks: matchingTasks, notes: matchingNotes});
    setShowSearchResults(true);
  }, [state.tasks, state.notes]);

  // Effect für debounced search
  useEffect(() => {
    if (currentView === 'settings') {
      // Settings search - dispatch custom event for settings component to handle
      window.dispatchEvent(new CustomEvent('settings-search', { 
        detail: { query: debouncedSearchQuery } 
      }));
      return;
    }
    
    // Perform live search for tasks and notes nur bei debounced query
    performLiveSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, currentView, performLiveSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query); // Sofort UI updaten
    // Actual search wird durch useEffect mit debouncedSearchQuery getriggert
  }, []);

  // Handle search result clicks
  const handleTaskClick = useCallback((task: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setShowSearchResults(false);
    
    try {
      // Open TaskModal globally
      window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
      // Also set a global helper if available
      (window as any).__taskfuchs_openTask?.(task.id);
    } catch {
      // Fallback: navigate to tasks and rely on global modal in App.tsx
      window.dispatchEvent(new CustomEvent('navigate-to-tasks'));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
        (window as any).__taskfuchs_openTask?.(task.id);
      }, 50);
    }
  }, []);

  const handleNoteClick = useCallback((note: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Open Note directly via global event
    window.dispatchEvent(new CustomEvent('open-note-modal', { detail: { noteId: note.id } }));
  }, []);

  // Handle keyboard shortcuts for search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm(t('header.logout_confirm'))) {
      logout();
    }
  }, [logout]);

  const handleProfile = useCallback(() => {
    setShowProfileModal(true);
  }, []);

  const handleSettings = useCallback(() => {
    setShowMoreMenu(false);
    // Navigate to settings by dispatching custom event
    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
  }, []);



  const toggleDarkMode = useCallback(() => {
    const newTheme = state.preferences.theme === 'dark' ? 'light' : 'dark';
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { theme: newTheme }
    });
  }, [state.preferences.theme, dispatch]);

  const toggleTaskView = () => {
    const newView = state.viewState.taskView === 'board' ? 'list' : 'board';
    dispatch({ type: 'SET_TASK_VIEW', payload: newView });
  };

  const handleToggleTag = (tagName: string) => {
    dispatch({ type: 'TOGGLE_TAG_FILTER', payload: tagName });
  };

  const handleClearFilters = () => {
    dispatch({ type: 'CLEAR_TAG_FILTERS' });
  };

  const getTaskCountForTag = (tagName: string): number => {
    return state.tasks.filter(task => task.tags.includes(tagName)).length;
  };

  const getTaskCountForPriority = (priority: string): number => {
    return state.tasks.filter(task => task.priority === priority).length;
  };

  const activeFiltersCount = state.activeTagFilters.length + state.activePriorityFilters.length;

  const handleTogglePriority = (priority: string) => {
    dispatch({ type: 'TOGGLE_PRIORITY_FILTER', payload: priority });
  };

  const handleClearAllFilters = () => {
    dispatch({ type: 'CLEAR_TAG_FILTERS' });
    dispatch({ type: 'CLEAR_PRIORITY_FILTERS' });
  };

  // Notes-specific handlers
  const handleToggleNoteTag = (tagName: string) => {
    dispatch({ type: 'TOGGLE_NOTE_TAG_FILTER', payload: tagName });
  };

  const handleClearNoteFilters = () => {
    dispatch({ type: 'CLEAR_NOTES_TAG_FILTERS' });
  };

  const getNoteTags = () => {
    const tags = new Set<string>();
    (Array.isArray(state.notes?.notes) ? state.notes.notes : []).forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  const getNoteCountForTag = (tagName: string): number => {
    return (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => note.tags.includes(tagName)).length;
  };

  const unreadNotifications = state.notifications.filter(n => !n.read);

  const priorities = [
    { value: 'none', label: t('header.priority_none') },
    { value: 'low', label: t('tasks.priority.low') },
    { value: 'medium', label: t('tasks.priority.medium') },
    { value: 'high', label: t('tasks.priority.high') }
  ];

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notification.id });
    
    // Close notification dropdown
    setShowNotifications(false);
    
    // Navigate to the task if it exists
    if (notification.taskId) {
      // Switch to tasks view and scroll to task
      dispatch({ type: 'SET_VIEW_MODE', payload: 'columns' });
    }
  };

  const markAllNotificationsRead = () => {
    state.notifications.forEach(notification => {
      if (!notification.read) {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notification.id });
      }
    });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  };

  const handleExportPlanner = () => {
    // Get current date columns (visible columns)
    const currentDateStr = format(state.currentDate, 'yyyy-MM-dd');
    const allDateColumns = state.columns.filter(column => column.type === 'date');
    const currentDateIndex = allDateColumns.findIndex(col => col.date === currentDateStr);
    const startIndex = Math.max(0, currentDateIndex);
    const visibleColumns = allDateColumns.slice(startIndex, startIndex + state.preferences.columns.visible);
    
    // Get tasks for visible columns
    const visibleTasks = state.tasks.filter(task => {
      // Same logic as TaskBoard
      if (task.projectId && !task.reminderDate) {
        return false;
      }
      return visibleColumns.some(col => col.id === task.columnId);
    });
    
    // Generate export
    exportPlannerToPrint({
      columns: visibleColumns,
      tasks: visibleTasks,
      columnCount: state.preferences.columns.visible,
      exportDate: format(new Date(), i18n.language === 'de' ? 'eeee, d. MMMM yyyy' : 'eeee, MMMM d, yyyy', { locale: i18n.language === 'de' ? de : enUS })
    });
  };

  const handleDateSelect = (columnId: string) => {
    setShowDatePicker(false);
    if (columnId.startsWith('date-')) {
      const dateStr = columnId.replace('date-', '');
      const targetDate = new Date(dateStr);
      dispatch({ type: 'SET_CURRENT_DATE', payload: targetDate });
    }
  };

  const moveOverdueTasksToToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayDate = new Date(today + 'T00:00:00');
    let todayColumn = state.columns.find(col => col.type === 'date' && col.date === today);
    
    // Ensure today's column exists (important after day change / app restart)
    if (!todayColumn) {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: today });
      // Use the predictable ID immediately; reducer will create the column
      todayColumn = { id: `date-${today}`, type: 'date' } as any;
    }

    // Find ALL incomplete tasks from past dates (same logic as getOverdueTaskCount)
    const overdueTasks = state.tasks.filter(task => {
      if (task.completed) return false;
      
      // Method 1: Check if task is in a currently visible past date column
      const taskColumn = state.columns.find(col => col.id === task.columnId);
      if (taskColumn && taskColumn.type === 'date' && taskColumn.date) {
        const columnDate = new Date(taskColumn.date + 'T00:00:00');
        if (columnDate < todayDate) {
          return true;
        }
      }
      
      // Method 2: Check if task belongs to a date column that no longer exists
      // Date column IDs follow the pattern: date-YYYY-MM-DD
      if (task.columnId.startsWith('date-')) {
        const dateString = task.columnId.replace('date-', '');
        // Validate that it's a proper date format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const taskDate = new Date(dateString + 'T00:00:00');
          if (taskDate < todayDate) {
            return true;
          }
        }
      }
      
      return false;
    });

    if (overdueTasks.length === 0) {
      // Show brief notification that no tasks need to be moved
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `no-overdue-${Date.now()}`,
                title: t('header.no_overdue_tasks'),
      message: t('header.all_tasks_current'),
          timestamp: new Date().toISOString(),
          type: 'success' as const,
          read: false
        }
      });
      return;
    }

    // Calculate new positions for tasks in today's column
    const todayTasks = state.tasks.filter(task => task.columnId === todayColumn.id);
    const safePositions = todayTasks.map(t => (typeof t.position === 'number' && !isNaN(t.position) ? t.position : 0));
    const maxPosition = safePositions.length > 0 ? Math.max(...safePositions) : -1;

    // Move all overdue tasks to today
    overdueTasks.forEach((task, index) => {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          columnId: todayColumn.id,
          position: maxPosition + 1 + index,
          reminderDate: today, // Set the reminder date to today
          updatedAt: new Date().toISOString()
        }
      });
    });

    // Show success notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: `moved-overdue-${Date.now()}`,
        title: t('header.tasks_moved'),
        message: t('header.overdue_moved_message', { count: overdueTasks.length }),
        timestamp: new Date().toISOString(),
        type: 'success' as const,
        read: false
      }
    });
  };

  const jumpToToday = () => {
    const today = new Date();
    dispatch({ type: 'SET_CURRENT_DATE', payload: today });
  };

  // Check if we're in the tasks view
  const isTasksView = state.viewState.currentMode === 'columns';

  // Count overdue tasks for display - checks ALL past tasks regardless of column visibility
  const getOverdueTaskCount = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayDate = new Date(today + 'T00:00:00');
    
    const overdueTasks = state.tasks.filter(task => {
      if (task.completed) return false;
      
      // Method 1: Check if task is in a currently visible past date column
      const taskColumn = task.columnId ? state.columns.find(col => col.id === task.columnId) : null;
      if (taskColumn && taskColumn.type === 'date' && taskColumn.date) {
        const columnDate = new Date(taskColumn.date + 'T00:00:00');
        if (columnDate < todayDate) {
          return true;
        }
      }
      
      // Method 2: Check if task belongs to a date column that no longer exists
      // Date column IDs follow the pattern: date-YYYY-MM-DD
      if (task.columnId && task.columnId.startsWith('date-')) {
        const dateString = task.columnId.replace('date-', '');
        // Validate that it's a proper date format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const taskDate = new Date(dateString + 'T00:00:00');
          if (taskDate < todayDate) {
            return true;
          }
        }
      }
      
      return false;
    });

    return overdueTasks.length;
  };

  const overdueCount = currentView === 'tasks' ? getOverdueTaskCount() : 0;

  const isMinimalDesign = state.preferences.minimalDesign;

  return (
    <>
      <header 
        className={isMinimalDesign 
          ? "border-b border-gray-200 dark:border-gray-800 px-6 py-3 relative z-[99999]"
          : "backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 px-6 py-3 relative z-[99999] shadow-sm"
        }
              style={isMinimalDesign 
        ? {
            backgroundColor: document.documentElement.classList.contains('dark')
              ? '#111827'  // Elegant dark blue-gray for dark mode
              : '#ffffff'
          }
        : { 
              backgroundColor: document.documentElement.classList.contains('dark')
                  ? 'rgba(17, 24, 39, 0.95)'
                  : 'rgba(255, 255, 255, 0.95)'
            }
        }
      >
        <div className="flex items-center justify-between w-full min-h-[44px]">
          {/* Left side - Date Navigation or Project Title */}
          <div className="flex items-center space-x-3">
            {/* Date Navigation for Tasks View */}
            {currentView === 'tasks' && isTasksView && (
              <div className="flex items-center space-x-3">
                {/* Task Sidebar Toggle Button */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-task-sidebar'));
                  }}
                  className="flex items-center justify-center w-[44px] h-[44px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title={taskSidebarMinimized ? t('planner.show_project_tasks') : t('planner.hide_project_tasks')}
                >
                  {taskSidebarMinimized ? (
                    <PanelLeftOpen className="w-5 h-5" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5" />
                  )}
                </button>

                {/* Jump to Today Button (only show if today's column is not visible) */}
                {(() => {
                  try {
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const currentDateStr = format(state.currentDate, 'yyyy-MM-dd');
                    const allDateColumns = state.columns.filter((c: any) => c.type === 'date');
                    const currentIndex = allDateColumns.findIndex((c: any) => c.date === currentDateStr);
                    const startIndex = Math.max(0, currentIndex);
                    const visible = Math.max(1, state.preferences?.columns?.visible || 1);
                    const visibleDateColumns = allDateColumns.slice(startIndex, startIndex + visible);
                    const todayVisible = visibleDateColumns.some((c: any) => c.date === todayStr);
                    if (todayVisible) return null;
                  } catch (e) {
                    // If anything fails, show the button as a fallback
                  }
                  return (
                    <button
                      onClick={jumpToToday}
                      className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 h-[44px] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:scale-105 hover:shadow-sm"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = state.preferences.accentColor;
                        (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '';
                      }}
                      title={t('planner.jump_to_today')}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span className="font-medium">{t('header.today')}</span>
                    </button>
                  );
                })()}

                {/* Date Picker Button (icon-only) */}
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`group p-2.5 rounded-xl transition-all duration-200 h-[44px] w-[44px] flex items-center justify-center ${
                    showDatePicker
                      ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 active:scale-95'
                  }`}
                  title={t('header.date_select')}
                >
                  <Calendar className="w-4 h-4" />
                </button>


              </div>
            )}

            {/* Project Controls for Kanban View */}
            {currentView === 'kanban' && (
              <>
                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-project-sidebar'));
                  }}
                  className="flex items-center justify-center w-[44px] h-[44px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title={projectSidebarMinimized ? t('header.show_project_sidebar') : t('header.hide_project_sidebar')}
                >
                  {projectSidebarMinimized ? (
                    <PanelLeftOpen className="w-5 h-5" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5" />
                  )}
                </button>

                {(() => {
                  const selectedProject = state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId);
                  if (!selectedProject) return null;
                  
                  // Find pinned note for this project
                  const pinnedNote = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).find(note => 
                    note.pinnedToProjects?.includes(selectedProject.id)
                  );
                  
                  return (
                    <div className="flex items-center h-[44px] space-x-3">
                      <span className="text-gray-900 dark:text-white font-semibold text-lg">
                        {selectedProject.title}
                      </span>
                      
                      {/* Project Timebudget Display */}
                      <ProjectTimebudgetHeader project={selectedProject} />

                      
                      {/* Info Icon for Notes Slider */}
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('toggle-notes-slider'));
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                          notesSliderOpen 
                            ? 'text-white' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        style={{ 
                          backgroundColor: notesSliderOpen ? state.preferences.accentColor : undefined,
                        }}
                        title={notesSliderOpen ? t('header.notes_hide_details') : t('header.notes_show_details')}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      
                      {pinnedNote && (
                        <button
                          onClick={() => {
                            // Navigate to notes and open the pinned note
                            dispatch({ type: 'SELECT_NOTE', payload: pinnedNote });
                            dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
                            window.dispatchEvent(new CustomEvent('navigate-to-notes', { 
                              detail: { noteId: pinnedNote.id } 
                            }));
                          }}
                          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:scale-105 active:scale-95"
                          style={{
                            borderColor: state.preferences.accentColor + '30',
                          }}
                          title={`${t('notes.pinned_note')}: ${pinnedNote.title || t('notes.untitled_note')}`}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: state.preferences.accentColor }}></div>
                          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: state.preferences.accentColor }} />
                          <span 
                            className="text-sm font-medium max-w-[150px] truncate" 
                            style={{ color: state.preferences.accentColor }}
                          >
                            {pinnedNote.title || t('notes.untitled_note')}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
            
            {/* Pins Controls */}
            {currentView === 'pins' && (
              <>
                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-pins-sidebar'));
                  }}
                  className="flex items-center justify-center w-[44px] h-[44px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title={pinsSidebarMinimized ? (t('pins.show_sidebar') || 'Aufgaben anzeigen') : (t('pins.hide_sidebar') || 'Aufgaben ausblenden')}
                >
                  {pinsSidebarMinimized ? (
                    <PanelLeftOpen className="w-5 h-5" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5" />
                  )}
                </button>

                {/* Title when sidebar is minimized */}
                {pinsSidebarMinimized && (
                  <div className="flex items-center h-[44px] space-x-2">
                    <Pin className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
                    <span className="text-gray-900 dark:text-white font-semibold text-lg">
                      {t('pins.title') || 'Pins'}
                    </span>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Center - Search and Filter Controls */}
          <div className="flex items-center space-x-3">
            {/* Search Button/Field */}
            <div ref={searchContainerRef} className="relative">
              {!isSearchOpen ? (
                <button
                  onClick={() => { setIsSearchOpen(true); setSearchQuery(''); setShowSearchResults(false); }}
                  className="group p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 h-[44px] w-[44px] flex items-center justify-center"
                  title={t('header.search')}
                >
                  <Search className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center transform transition-all duration-300 ease-out">
                  <div ref={searchContainerRef} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={
                        currentView === 'settings'
                          ? t('header.search_placeholder_settings', { defaultValue: 'Einstellungen durchsuchen...' })
                          : t('header.search_placeholder_general', { defaultValue: 'Aufgaben und Notizen durchsuchen...' })
                      }
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      className="w-96 pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 h-[44px]"
                    />
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        setShowSearchResults(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    
                    {/* Search Results Dropdown - Rendered as Portal */}
                    {showSearchResults && (searchResults.tasks.length > 0 || searchResults.notes.length > 0) && createPortal(
                      <div 
                        data-search-portal="true"
                        className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-96 overflow-hidden z-[99999] backdrop-blur-sm"
                        style={{
                          top: (searchContainerRef.current?.getBoundingClientRect().bottom || 0) + 8,
                          left: searchContainerRef.current?.getBoundingClientRect().left || 0,
                          width: Math.max(480, searchContainerRef.current?.getBoundingClientRect().width || 256),
                          position: 'fixed'
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {searchResults.tasks.length > 0 && (
                          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              {t('header.search_results_tasks', { count: searchResults.tasks.length, defaultValue: `${searchResults.tasks.length} Aufgaben` })}
                            </h4>
                            <div className="space-y-1">
                              {searchResults.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  onClick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                                  className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {task.title}
                                      </p>
                                      {task.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                      {task.priority && task.priority !== 'none' && (
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        }`}>
                                          {task.priority === 'high' ? t('tasks.priority.high') : task.priority === 'medium' ? t('tasks.priority.medium') : t('tasks.priority.low')}
                                        </span>
                                      )}
                                      {task.tags.length > 0 && (
                                        <div className="flex items-center space-x-1">
                                          {task.tags.slice(0, 2).map((tag, index) => (
                                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                                              {tag}
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
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {searchResults.notes.length > 0 && (
                          <div className="p-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              {t('header.search_results_notes', { count: searchResults.notes.length, defaultValue: `${searchResults.notes.length} Notizen` })}
                            </h4>
                            <div className="space-y-1">
                              {searchResults.notes.map((note) => (
                                <div
                                  key={note.id}
                                  onClick={(e) => { e.stopPropagation(); handleNoteClick(note); }}
                                  className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {note.title}
                                      </p>
                                      {note.content && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                        </p>
                                      )}
                                    </div>
                                    {note.tags.length > 0 && (
                                      <div className="flex items-center space-x-1 ml-2">
                                        {note.tags.slice(0, 2).map((tag, index) => (
                                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                                            {tag}
                                          </span>
                                        ))}
                                        {note.tags.length > 2 && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            +{note.tags.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Button - Show in Tasks, Notes, Kanban and Pins view */}
            {(currentView === 'tasks' || currentView === 'notes' || currentView === 'kanban' || currentView === 'pins') && (
              <div ref={filterContainerRef} className="relative">
                <button
                  onClick={() => {
                    if (currentView === 'kanban') {
                      // For kanban view, dispatch custom event
                      window.dispatchEvent(new CustomEvent('toggle-kanban-filter'));
                    } else if (currentView === 'pins') {
                      // For pins view, dispatch custom event
                      window.dispatchEvent(new CustomEvent('toggle-pins-filter'));
                    } else {
                      setIsFilterOpen(!isFilterOpen);
                    }
                  }}
                  className={`group p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 h-[44px] w-[44px] flex items-center justify-center ${
                    (currentView === 'tasks' && (activeFiltersCount > 0 || isFilterOpen)) ||
                    (currentView === 'notes' && (state.notes.selectedTags.length > 0 || isFilterOpen)) ||
                    (currentView === 'kanban' && ((state.viewState.projectKanban.priorityFilters.length > 0 || state.viewState.projectKanban.tagFilters.length > 0) || isFilterOpen)) ||
                    (currentView === 'pins' && isFilterOpen)
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={
                    (currentView === 'tasks' && (activeFiltersCount > 0 || isFilterOpen)) ||
                    (currentView === 'notes' && (state.notes.selectedTags.length > 0 || isFilterOpen)) ||
                    (currentView === 'kanban' && ((state.viewState.projectKanban.priorityFilters.length > 0 || state.viewState.projectKanban.tagFilters.length > 0) || isFilterOpen)) ||
                    (currentView === 'pins' && isFilterOpen)
                      ? { backgroundColor: state.preferences.accentColor }
                      : {}
                  }
                  title={t('header.filter')}
                >
                  <div className="relative">
                    <Filter className="w-5 h-5" />
                    {((currentView === 'tasks' && activeFiltersCount > 0) || 
                      (currentView === 'notes' && state.notes.selectedTags.length > 0) ||
                      (currentView === 'kanban' && (state.viewState.projectKanban.priorityFilters.length > 0 || state.viewState.projectKanban.tagFilters.length > 0))) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-900 text-xs rounded-full flex items-center justify-center font-medium">
                        {currentView === 'tasks' ? activeFiltersCount : 
                         currentView === 'notes' ? state.notes.selectedTags.length :
                         currentView === 'kanban' ? state.viewState.projectKanban.priorityFilters.length + state.viewState.projectKanban.tagFilters.length :
                         0}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}


          </div>

          {/* Right side - Completed Tasks Toggle, Notifications, User */}
          <div className="flex items-center space-x-2 mr-4">

            {/* Todoist Sync Status Widget removed */}

            {/* Move Overdue Tasks Button - In Tasks View and Today View when there are overdue tasks */}
            {(currentView === 'tasks' || currentView === 'today') && overdueCount > 0 && (
              <button
                onClick={moveOverdueTasksToToday}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-lg transition-colors h-[44px]"
                title={t('header.move_overdue_tasks_tooltip', { count: overdueCount })}
              >
                <MoveRight className="w-4 h-4" />
                <span className="font-medium">
                  {t('header.overdue_tasks', { count: overdueCount })}
                </span>
              </button>
            )}

            {/* Hide Completed Tasks Button removed in favor of menu */}
            {(false) && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SHOW_COMPLETED_TASKS' })}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors h-[44px] w-24 justify-center relative"
                title={t('header.completed_tasks_toggle_tooltip', { show: state.showCompletedTasks })}
              >
                <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">
                  {t('header.completed_tasks')}
                </span>
                {state.showCompletedTasks && (
                  <div 
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  />
                )}
              </button>
            )}

            {/* Calendar Events Toggle Button removed - now in menu */}



            {/* Bulk Mode Toggle removed - now in menu */}

            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="group p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 relative h-[44px] w-[44px] flex items-center justify-center"
                title={`${unreadNotifications.length} ungelesene Benachrichtigungen`}
              >
                {unreadNotifications.length > 0 ? (
                  <BellRing className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && createPortal(
                <div 
                  className="fixed top-20 right-6 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden"
                  style={{ zIndex: 200 }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Benachrichtigungen
                      </h3>
                      <div className="flex space-x-2">
                        {unreadNotifications.length > 0 && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Alle lesen
                          </button>
                        )}
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Alle löschen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-64 overflow-y-auto">
                    {state.notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Keine Benachrichtigungen</p>
                      </div>
                    ) : (
                      state.notifications
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.type === 'reminder' ? 'bg-blue-500' :
                                notification.type === 'deadline' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${
                                    !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    {new Date(notification.timestamp).toLocaleTimeString(t('common.locale'), { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                                <p className={`text-sm mt-1 ${
                                  !notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {notification.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* User Actions */}
            {authState.user && !isGuest() && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                {/* Username removed */}
                
                {/* Profile Button (removed for planner - moved to sidebar header) */}
                
                {/* Dreipunkt-Menu - Hide in views without menu items (e.g., inbox) */}
                {currentView !== 'inbox' && (
                <div ref={moreMenuRef} className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="group p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 h-[44px] w-[44px] flex items-center justify-center"
                    title="Mehr"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {/* More Menu Dropdown */}
                  {showMoreMenu && createPortal(
                    <div 
                      className="fixed top-20 right-6 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
                      style={{ zIndex: 200 }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="py-2">
                        {/* Projekt-Funktionen - only in kanban view with selected project */}
                        {currentView === 'kanban' && (() => {
                          const selectedProject = state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId);
                          return selectedProject ? (
                          <>
                            {/* Zeitbudget */}
                            {selectedProject.timebudget && (
                            <button
                              onClick={() => {
                                  setShowProjectTimebudgetModal(true);
                                  setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Clock className="w-4 h-4" />
                                <span>{t('projects.time_budget')}</span>
                              </button>
                            )}
                            
                            {/* Spalten organisieren */}
                            <button
                              onClick={() => {
                                setShowColumnManager(true);
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Columns className="w-4 h-4" />
                              <span>{t('header.organize_columns')}</span>
                            </button>
                            
                            {/* Projekt umbenennen */}
                            <button
                              onClick={() => {
                                setEditingProjectTitle(true);
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{t('projects.rename_project')}</span>
                            </button>
                            
                            {/* Projekt löschen */}
                            <button
                              onClick={() => {
                                if (confirm(t('common.confirm_delete'))) {
                                  dispatch({ type: 'DELETE_COLUMN', payload: selectedProject.id });
                                }
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{t('projects.delete_project')}</span>
                            </button>
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          </>
                          ) : null;
                        })()}
                        {/* Kanban: Toggle completed visibility */}
                        {currentView === 'kanban' && (
                          <>
                            <button
                              onClick={() => {
                                dispatch({ type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED', payload: !state.viewState.projectKanban.showCompleted });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.completed_tasks_toggle_tooltip', { show: state.viewState.projectKanban.showCompleted })}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{state.viewState.projectKanban.showCompleted ? t('header.completed_hide') : t('header.completed_show')}</span>
                              {state.viewState.projectKanban.showCompleted && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          </>
                        )}
                        
                        {/* Planer exportieren - only in tasks view */}
                        {currentView === 'tasks' && (
                          <>
                            {/* Completed first */}
                            <button
                              onClick={() => {
                                dispatch({ type: 'TOGGLE_SHOW_COMPLETED_TASKS' });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.completed_tasks_toggle_tooltip', { show: state.showCompletedTasks })}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{state.showCompletedTasks ? t('header.completed_hide') : t('header.completed_show')}</span>
                              {state.showCompletedTasks && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                handleExportPlanner();
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                              <span>{t('header.export_planner')}</span>
                            </button>
                            {/* Toggle events in planner */}
                            <button
                              onClick={() => {
                                const newShowInPlanner = !state.preferences.calendars?.showInPlanner;
                                dispatch({ 
                                  type: 'UPDATE_PREFERENCES', 
                                  payload: { 
                                    calendars: { 
                                      ...state.preferences.calendars,
                                      showInPlanner: newShowInPlanner 
                                    } 
                                  } 
                                });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.events_toggle_tooltip', { show: state.preferences.calendars?.showInPlanner || false })}
                            >
                              <Calendar className="w-4 h-4" />
                              <span>{state.preferences.calendars?.showInPlanner ? t('header.events_hide') : t('header.events_show')}</span>
                              {state.preferences.calendars?.showInPlanner && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>
                            {/* Toggle bulk selection */}
                            <button
                              onClick={() => {
                                dispatch({ type: 'TOGGLE_BULK_MODE' });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={state.isBulkMode ? t('header.bulk_mode_end') : t('header.bulk_mode_start')}
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span>{state.isBulkMode ? t('header.bulk_mode_end') : t('header.bulk_mode')}</span>
                              {state.selectedTaskIds.length > 0 && (
                                <span className="absolute right-4 text-xs text-gray-500">{state.selectedTaskIds.length > 9 ? '9+' : state.selectedTaskIds.length}</span>
                              )}
                            </button>
                          </>
                        )}
                        {/* Removed: settings, user guide, onboarding, personal capacity now on sidebar user icon */}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
                )}
              </>
            )}
            
            {isGuest() && (
              <>
                {/* Dreipunkt-Menu for Guests */}
                <div ref={moreMenuRef} className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="group p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 h-[44px] w-[44px] flex items-center justify-center mr-2"
                    title="Mehr"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {/* Menu Dropdown for Guests */}
                  {showMoreMenu && createPortal(
                    <div 
                      className="fixed top-20 right-6 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
                      style={{ zIndex: 200 }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="py-2">
                        {/* Projekt-Funktionen - only in kanban view with selected project */}
                        {currentView === 'kanban' && (() => {
                          const selectedProject = state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId);
                          return selectedProject ? (
                          <>
                            {/* Zeitbudget */}
                            {selectedProject.timebudget && (
                            <button
                              onClick={() => {
                                  setShowProjectTimebudgetModal(true);
                                  setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Clock className="w-4 h-4" />
                                <span>{t('projects.time_budget')}</span>
                              </button>
                            )}
                            
                            {/* Spalten organisieren */}
                            <button
                              onClick={() => {
                                setShowColumnManager(true);
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Columns className="w-4 h-4" />
                              <span>{t('header.organize_columns')}</span>
                            </button>
                            
                            {/* Projekt umbenennen */}
                            <button
                              onClick={() => {
                                setEditingProjectTitle(true);
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{t('projects.rename_project')}</span>
                            </button>
                            
                            {/* Projekt löschen */}
                            <button
                              onClick={() => {
                                if (confirm(t('common.confirm_delete'))) {
                                  dispatch({ type: 'DELETE_COLUMN', payload: selectedProject.id });
                                }
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{t('projects.delete_project')}</span>
                            </button>
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          </>
                          ) : null;
                        })()}
                        {/* Tasks view (guest): Completed first at top */}
                        {currentView === 'tasks' && (
                          <>
                            {/* Completed at top */}
                            <button
                              onClick={() => {
                                dispatch({ type: 'TOGGLE_SHOW_COMPLETED_TASKS' });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.completed_tasks_toggle_tooltip', { show: state.showCompletedTasks })}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{state.showCompletedTasks ? t('header.completed_hide') : t('header.completed_show')}</span>
                              {state.showCompletedTasks && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                            {/* Events toggle */}
                            <button
                              onClick={() => {
                                const newShowInPlanner = !state.preferences.calendars?.showInPlanner;
                                dispatch({ 
                                  type: 'UPDATE_PREFERENCES', 
                                  payload: { 
                                    calendars: { 
                                      ...state.preferences.calendars,
                                      showInPlanner: newShowInPlanner 
                                    } 
                                  } 
                                });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.events_toggle_tooltip', { show: state.preferences.calendars?.showInPlanner || false })}
                            >
                              <Calendar className="w-4 h-4" />
                              <span>{state.preferences.calendars?.showInPlanner ? t('header.events_hide') : t('header.events_show')}</span>
                              {state.preferences.calendars?.showInPlanner && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>

                            {/* Bulk selection */}
                            <button
                              onClick={() => {
                                dispatch({ type: 'TOGGLE_BULK_MODE' });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={state.isBulkMode ? t('header.bulk_mode_end') : t('header.bulk_mode_start')}
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span>{state.isBulkMode ? t('header.bulk_mode_end') : t('header.bulk_mode')}</span>
                              {state.selectedTaskIds.length > 0 && (
                                <span className="absolute right-4 text-xs text-gray-500">{state.selectedTaskIds.length > 9 ? '9+' : state.selectedTaskIds.length}</span>
                              )}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          </>
                        )}
                        {/* Kanban: Toggle completed visibility (guest) */}
                        {currentView === 'kanban' && (
                          <>
                            <button
                              onClick={() => {
                                dispatch({ type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED', payload: !state.viewState.projectKanban.showCompleted });
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                              title={t('header.completed_tasks_toggle_tooltip', { show: state.viewState.projectKanban.showCompleted })}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{state.viewState.projectKanban.showCompleted ? t('header.completed_hide') : t('header.completed_show')}</span>
                              {state.viewState.projectKanban.showCompleted && (
                                <span 
                                  className="absolute right-4 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                />
                              )}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          </>
                        )}
                        
                        {/* Planer exportieren - only in tasks view */}
                        {currentView === 'tasks' && (
                          <>
                            <button
                              onClick={() => {
                                handleExportPlanner();
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                              <span>{t('header.export_planner')}</span>
                            </button>
                          </>
                        )}
                        {/* Removed: settings, user guide, onboarding (moved to sidebar user icon) */}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
                
                {/* Guest mode badge removed */}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Filter Panel - Compact Slider */}
      {(currentView === 'tasks' || currentView === 'notes') && isFilterOpen && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 duration-300 z-[100] relative">
          <div className="max-w-7xl mx-auto px-4 py-3">
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
                {((currentView === 'tasks' && activeFiltersCount > 0) || 
                  (currentView === 'notes' && state.notes.selectedTags.length > 0)) && (
                  <button
                    onClick={currentView === 'tasks' ? handleClearAllFilters : handleClearNoteFilters}
                    className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-lg"
                  >
                    <X className="w-3 h-3" />
                    <span>Alle löschen</span>
                  </button>
                )}
                
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title={t('header.filter_close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* Priority Filters - Only for Tasks */}
              {currentView === 'tasks' && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 flex-shrink-0">
                    Prioritäten:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {priorities.map((priority) => {
                      const isActive = state.activePriorityFilters.includes(priority.value);
                      const taskCount = getTaskCountForPriority(priority.value);
                      
                      return (
                        <button
                          key={priority.value}
                          onClick={() => handleTogglePriority(priority.value)}
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
              )}

              {/* Tag Filters */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 flex-shrink-0">
                  Tags:
                </span>
                <div className="flex flex-wrap gap-2">
                  {((currentView === 'tasks' && state.tags.filter(tag => getTaskCountForTag(tag.name) > 0).length > 0) || 
                    (currentView === 'notes' && getNoteTags().filter(tagName => getNoteCountForTag(tagName) > 0).length > 0)) ? (
                    (currentView === 'tasks' ? 
                      state.tags.filter(tag => getTaskCountForTag(tag.name) > 0).sort((a, b) => b.count - a.count) :
                      getNoteTags().filter(tagName => getNoteCountForTag(tagName) > 0).map(tagName => ({ name: tagName }))
                    ).map((tag) => {
                        const isActive = currentView === 'tasks' ? 
                          state.activeTagFilters.includes(tag.name) :
                          state.notes.selectedTags.includes(tag.name);
                        const itemCount = currentView === 'tasks' ? 
                          getTaskCountForTag(tag.name) :
                          getNoteCountForTag(tag.name);
                        
                        return (
                          <button
                            key={currentView === 'tasks' ? (tag as any).id || tag.name : tag.name}
                            onClick={() => currentView === 'tasks' ? handleToggleTag(tag.name) : handleToggleNoteTag(tag.name)}
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
                      Keine Tags vorhanden
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      {/* Date Picker Slider */}
      <DatePickerSlider
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDateSelect}
        availableColumns={state.columns}
        title={t('header.navigate_to_date')}
        allowAnyDate={true}
        accentColor={state.preferences.accentColor}
      />



      {/* User Guide Modal */}
      <UserGuide 
        isOpen={showUserGuide} 
        onClose={() => setShowUserGuide(false)} 
      />

      {/* Onboarding Tour disabled here (handled centrally in App) */}

      {/* Project Timebudget Modal */}
      {showProjectTimebudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <ProjectTimebudgetDetailModal 
            project={state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId)}
            isOpen={true}
            onClose={() => setShowProjectTimebudgetModal(false)}
          />
        </div>
      )}

      {/* Project Rename Modal */}
      {editingProjectTitle && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ margin: 0, padding: 0 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingProjectTitle(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4" style={{ color: state.preferences.accentColor }}>
              {t('projects.rename_project')}
            </h3>
            <input
              type="text"
              defaultValue={state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId)?.title}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:outline-none"
              style={{
                '--tw-ring-color': state.preferences.accentColor,
                '--focus-border-color': state.preferences.accentColor
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = state.preferences.accentColor;
                e.target.style.boxShadow = `0 0 0 2px ${state.preferences.accentColor}25`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '';
                e.target.style.boxShadow = '';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newTitle = e.currentTarget.value.trim();
                  if (newTitle) {
                    dispatch({
                      type: 'UPDATE_PROJECT_TITLE',
                      payload: {
                        projectId: state.viewState.projectKanban.selectedProjectId,
                        title: newTitle
                      }
                    });
                  }
                  setEditingProjectTitle(false);
                } else if (e.key === 'Escape') {
                  setEditingProjectTitle(false);
                }
              }}
              autoFocus
            />
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  const newTitle = input?.value.trim();
                  if (newTitle) {
                    dispatch({
                      type: 'UPDATE_PROJECT_TITLE',
                      payload: {
                        projectId: state.viewState.projectKanban.selectedProjectId,
                        title: newTitle
                      }
                    });
                  }
                  setEditingProjectTitle(false);
                }}
                className="px-3 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: state.preferences.accentColor }}
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => setEditingProjectTitle(false)}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Column Manager Modal */}
      {showColumnManager && (() => {
        const selectedProject = state.columns.find(col => col.type === 'project' && col.id === state.viewState.projectKanban.selectedProjectId);
        return selectedProject ? (
          <ColumnManager
            isOpen={true}
            onClose={() => setShowColumnManager(false)}
            projectId={selectedProject.id}
            projectTitle={selectedProject.title}
          />
        ) : null;
      })()}

    </>
  );
}); 