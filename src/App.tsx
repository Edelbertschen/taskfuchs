import React, { useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WelcomeScreen } from './components/Auth/WelcomeScreen';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { TaskBoard } from './components/Tasks/TaskBoard';
import { InboxView } from './components/Inbox/InboxView';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { PinsView } from './components/Pins/PinsView';
import { NotesView } from './components/Notes/NotesView';


// Lazy-loaded components for better performance
import { 
  Settings,
  TagManager,
  ArchiveView,
  StatisticsView,
  SeriesView
} from './components/Lazy/LazyComponents';
import { SimpleTodayView } from './components/Dashboard/SimpleTodayView';
import { FocusView } from './components/Focus/FocusView';
import { ReviewView } from './components/Review/ReviewView';
import { SmartTaskModal } from './components/Tasks/SmartTaskModal';
import { TaskModal } from './components/Tasks/TaskModal';
import { TopTimerBar } from './components/Timer/TopTimerBar';
import { FloatingTimerModal } from './components/Timer/FloatingTimerModal';
import { NotificationManager } from './components/Common/NotificationManager';
import { OnboardingTour } from './components/Common/OnboardingTour';
import { LanguageSelectionModal } from './components/Common/LanguageSelectionModal';
import { useTranslation } from 'react-i18next';
import { BulkActionsBar } from './components/Common/BulkActionsBar';

import { ImageTest } from './components/Common/ImageTest';
import { FloatingAddButton } from './components/Common/FloatingAddButton';
import { LoadingSpinner } from './components/Common/LoadingSpinner';
import { Plus } from 'lucide-react';
import { MaterialIcon } from './components/Common/MaterialIcon';
import './App.css';
import { initializeAudioOnUserInteraction } from './utils/soundUtils';
import { getBackgroundStyles, getDarkModeBackgroundStyles } from './utils/backgroundUtils';
import { format } from 'date-fns';
import PerformanceMonitor from './components/Common/PerformanceMonitor';

// Color generation functions
const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return [h * 360, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number) => {
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - s * Math.min(l, 1 - l) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

type ViewType = 'today' | 'tasks' | 'notes' | 'kanban' | 'focus' | 'pins' | 'archive' | 'inbox' | 'statistics' | 'review' | 'series';

// Column Switcher Component
interface ColumnSwitcherProps {
  currentView: string;
  isNoteEditorFullScreen: boolean;
  visibleColumns: number;
  columnOptions: number[];
  onColumnCountChange: (count: number) => void;
  colors: any;
}

function ColumnSwitcher({ 
  currentView, 
  isNoteEditorFullScreen, 
  visibleColumns, 
  columnOptions, 
  onColumnCountChange, 
  colors 
}: ColumnSwitcherProps) {
  const [projectSidebarMinimized, setProjectSidebarMinimized] = React.useState(false);
  const [taskSidebarMinimized, setTaskSidebarMinimized] = React.useState(false);

  // Listen for project sidebar state changes
  React.useEffect(() => {
    const handleProjectSidebarStateChange = (event: any) => {
      setProjectSidebarMinimized(event.detail.minimized);
    };

    window.addEventListener('project-sidebar-state-changed', handleProjectSidebarStateChange);
    
    return () => {
      window.removeEventListener('project-sidebar-state-changed', handleProjectSidebarStateChange);
    };
  }, []);

  // Listen for task sidebar state changes
  React.useEffect(() => {
    const handleTaskSidebarStateChange = (event: any) => {
      setTaskSidebarMinimized(event.detail.minimized);
    };

    window.addEventListener('task-sidebar-state-changed', handleTaskSidebarStateChange);
    
    return () => {
      window.removeEventListener('task-sidebar-state-changed', handleTaskSidebarStateChange);
    };
  }, []);

  // Only show for tasks and kanban views
  if (currentView !== 'tasks' && currentView !== 'kanban') {
    return null;
  }

  // Calculate dynamic sidebar width based on view and fullscreen state
  const getSidebarWidth = () => {
    if (isNoteEditorFullScreen) {
      return 0; // No sidebar in fullscreen mode
    }
    
    if (currentView === 'tasks') {
      // TaskBoard has project sidebar (320px) + main sidebar (80px) = 400px when project sidebar visible
      // Only main sidebar (80px) when project sidebar hidden
      return taskSidebarMinimized ? 80 : 400;
    }
    
    if (currentView === 'kanban') {
      // Kanban has project sidebar - 320px when expanded, 80px when minimized (reacts to project-sidebar-state-changed events)
      return projectSidebarMinimized ? 80 : 320;
    }
    
    return 80; // Default sidebar width
  };
  
  const sidebarWidth = getSidebarWidth();
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
        {columnOptions.map((count) => (
          <button
            key={count}
            onClick={() => onColumnCountChange(count)}
            className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
              visibleColumns === count
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            style={visibleColumns === count ? {
              backgroundColor: colors.primary
            } : {}}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main App Component (authenticated users)
function MainApp() {
  const [currentView, setCurrentView] = React.useState('today');
  const [previousView, setPreviousView] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [transitionDirection, setTransitionDirection] = React.useState<'left' | 'right'>('right');
  const [lastViewBeforeFocus, setLastViewBeforeFocus] = React.useState('today');
  const [showSmartTaskModal, setShowSmartTaskModal] = React.useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = React.useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = React.useState<string | null>(null);
  const [showLanguageSelection, setShowLanguageSelection] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [userExitedFocus, setUserExitedFocus] = React.useState(false); // Track if user manually exited focus mode
  const [showFocusPrompt, setShowFocusPrompt] = React.useState<{visible: boolean; taskId?: string}>({ visible: false });
  
  const { state, dispatch } = useApp();
  const { t } = useTranslation();

  // View order for navigation direction
  const viewOrder = ['today', 'inbox', 'tasks', 'kanban', 'notes', 'tags', 'archive', 'statistics', 'settings', 'focus', 'review'];

  // Enhanced navigation with smooth slide transitions
  const handleViewChange = React.useCallback((newView: string) => {
    if (newView === currentView || isTransitioning) return;
    
    // Determine slide direction
    const currentIndex = viewOrder.indexOf(currentView);
    const newIndex = viewOrder.indexOf(newView);
    const direction = newIndex > currentIndex ? 'right' : 'left';
    
    setTransitionDirection(direction);
    setPreviousView(currentView);
    setIsTransitioning(true);
    
    // After a small delay, update the current view
    setTimeout(() => {
      setCurrentView(newView);
      
      // End transition after slide completes
      setTimeout(() => {
        setIsTransitioning(false);
        setPreviousView(null);
      }, 300);
    }, 50);
  }, [currentView, isTransitioning, viewOrder]);

  // Auto-focus mode functionality
  const checkIsTopTaskOfToday = (taskId: string): boolean => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayColumn = state.columns.find(col => col.id === `date-${today}`);
    
    if (!todayColumn) return false;
    
    const todayTasks = state.tasks.filter(task => 
      task.columnId === todayColumn.id && !task.completed
    ).sort((a, b) => a.position - b.position);
    
    return todayTasks.length > 0 && todayTasks[0].id === taskId;
  };

  // Auto-switch to focus mode when timer starts for any task - DISABLED
  // useEffect(() => {
  //   const taskId = state.activeTimer?.taskId;
  //   if (taskId && currentView !== 'focus') {
  //     if (state.preferences.enableFocusMode && checkIsTopTaskOfToday(taskId) && !userExitedFocus) {
  //       setLastViewBeforeFocus(currentView); // Save current view before switching to focus
  //       setCurrentView('focus');
  //     }
  //   }
  // }, [state.activeTimer?.isActive, state.activeTimer?.isPaused, state.activeTimer?.taskId, currentView, state.preferences.enableFocusMode, userExitedFocus]);

  // Auto-switch to focus mode when focus mode is enabled via column focus
  useEffect(() => {
    if (state.focusMode && currentView !== 'focus') {
      setLastViewBeforeFocus(currentView);
      setCurrentView('focus');
    }
  }, [state.focusMode, currentView]);

  // Navigation events
  useEffect(() => {
    const handleNavigateToFocus = () => {
      setLastViewBeforeFocus(currentView);
      dispatch({ type: 'SET_FOCUS_MODE', payload: true });
      setCurrentView('focus');
    };

    window.addEventListener('navigate-to-focus', handleNavigateToFocus as EventListener);
    // Handle Onboarding start from anywhere
    const handleStartOnboarding = () => setShowOnboarding(true);
    window.addEventListener('start-onboarding', handleStartOnboarding as EventListener);

    return () => {
      window.removeEventListener('navigate-to-focus', handleNavigateToFocus as EventListener);
      window.removeEventListener('start-onboarding', handleStartOnboarding as EventListener);
    };
  }, [currentView, dispatch]);

  // Listen for focus prompt events (timer started)
  useEffect(() => {
    const handler = (e: any) => {
      setShowFocusPrompt({ visible: true, taskId: e?.detail?.taskId });
      setTimeout(() => setShowFocusPrompt({ visible: false }), 3000);
    };
    window.addEventListener('show-focus-prompt', handler as EventListener);
    return () => window.removeEventListener('show-focus-prompt', handler as EventListener);
  }, []);

  // Reset userExitedFocus when timer stops or new timer starts
  useEffect(() => {
    if (!state.activeTimer?.isActive) {
      // Timer stopped - reset the flag
      setUserExitedFocus(false);
    }
  }, [state.activeTimer?.isActive, state.activeTimer?.taskId]);

  // Handle exit from focus mode
  const handleExitFocus = () => {
    console.log('🎯 Exiting focus mode, returning to:', lastViewBeforeFocus);
    setUserExitedFocus(true); // Mark that user manually exited focus mode
    handleViewChange(lastViewBeforeFocus);
  };

  // Check if user should see language selection or onboarding (only first start)
  React.useEffect(() => {
    const hasSeen = localStorage.getItem('taskfuchs-onboarding-complete') === 'true' || state.preferences.hasCompletedOnboarding;
    if (!hasSeen) {
      if (!state.preferences.language) {
        setShowLanguageSelection(true);
      } else {
        setShowOnboarding(true);
      }
    }
  }, [state.preferences.hasCompletedOnboarding, state.preferences.language]);

  // Handle language selection completion
  const handleLanguageSelected = (language: 'de' | 'en') => {
    setShowLanguageSelection(false);
    // After language is selected, show onboarding
    setTimeout(() => {
      setShowOnboarding(true);
    }, 100);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or other interactive element
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) return;

      // Don't trigger shortcuts if modal is open
      if (showSmartTaskModal || selectedTaskForModal || showLanguageSelection || showOnboarding) {
        return;
      }

      // 🚀 Bulk Operations
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_BULK_MODE' });
      }

      // 🚀 Select All Tasks (when in bulk mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && state.isBulkMode) {
        e.preventDefault();
        const visibleTaskIds = state.tasks
          .map(task => task.id);
        dispatch({ type: 'SELECT_ALL_TASKS', payload: visibleTaskIds });
      }

      // 🚀 Extended Keyboard Shortcuts System

      // Navigation shortcuts (1-9)
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const viewMap: { [key: string]: string } = {
          '1': 'today',
          '2': 'inbox', 
          '3': 'tasks',
          '4': 'kanban',
          '5': 'notes',
          '6': 'tags',
          '7': 'statistics',
          '8': 'archive',
          '9': 'settings'
        };
        if (viewMap[e.key]) {
          handleViewChange(viewMap[e.key]);
        }
      }

      // Quick actions
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowSmartTaskModal(true);
      }

      // 🚀 New: Focus Mode (F)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (currentView === 'focus') {
          // Exit focus mode
          handleViewChange('today');
        } else {
          // Enter focus mode
          handleViewChange('focus');
        }
      }

      // 🚀 New: Review Mode (R)
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleViewChange('review');
      }

      // 🚀 New: Timer Controls (Space)
      if (e.key === ' ') {
        e.preventDefault();
        // Toggle timer pause/resume for active timer
        if (state.activeTimer?.isActive) {
          if (state.activeTimer.isPaused) {
            dispatch({ type: 'RESUME_TIMER' });
          } else {
            dispatch({ type: 'PAUSE_TIMER' });
          }
        }
      }

      // 🚀 New: User Guide (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        // Dispatch custom event to open user guide
        window.dispatchEvent(new CustomEvent('openUserGuide'));
      }

      // Escape key always closes current modal or exits focus mode
      if (e.key === 'Escape') {
        // Clear any text selection when escaping
        document.getSelection()?.removeAllRanges();
        
        if (currentView === 'focus') {
          handleViewChange(lastViewBeforeFocus);
        } else if (showSmartTaskModal) {
          setShowSmartTaskModal(false);
        } else if (selectedTaskForModal) {
          setSelectedTaskForModal(null);
        } else if (showLanguageSelection) {
          setShowLanguageSelection(false);
        } else if (showOnboarding) {
          setShowOnboarding(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentView, lastViewBeforeFocus, showSmartTaskModal, selectedTaskForModal, showLanguageSelection, showOnboarding, state.isBulkMode, state.tasks, handleViewChange, dispatch]);

  // 🚀 Global Mouse Event Handlers for preventing text selection during multi-select
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Prevent text selection when using modifier keys for multi-select
      if (e.shiftKey || ((e.ctrlKey || e.metaKey) && state.isBulkMode)) {
        // Don't prevent selection in input fields, textareas, or contenteditable
        const target = e.target as HTMLElement;
        const isInputElement = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.getAttribute('contenteditable') === 'true' ||
                              target.closest('input') ||
                              target.closest('textarea') ||
                              target.closest('[contenteditable="true"]');
                              
        if (!isInputElement) {
          e.preventDefault();
          // Clear any existing selection
          document.getSelection()?.removeAllRanges();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [state.isBulkMode]);

  // Global SHIFT + Mouse wheel navigation for boards
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        const direction = e.deltaY > 0 ? 'next' : 'prev';
        
        if (currentView === 'tasks' || currentView === 'review') {
          e.preventDefault();
          dispatch({ type: 'NAVIGATE_DATE', payload: direction });
        } else if (currentView === 'kanban') {
          e.preventDefault();
          dispatch({ type: 'NAVIGATE_PROJECTS', payload: direction });
        }
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [currentView, dispatch]);

  // Generate dynamic colors based on accent color
  const colors = useMemo(() => {
    const accentColor = state.preferences.accentColor || '#f97316';
    const [h, s, l] = hexToHsl(accentColor);
    
    return {
      primary: accentColor,
      dark: hslToHex(h, Math.min(s, 80), Math.max(l - 20, 10)),
    };
  }, [state.preferences.accentColor]);

  // Initialize audio on any user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudioOnUserInteraction().catch(console.warn);
    };

    // Add event listeners for various user interactions
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  // Listen for navigation to notes events
  useEffect(() => {
    const handleNavigateToNotes = (event: CustomEvent) => {
      handleViewChange('notes');
      // If noteId is provided, select the note and switch to editor
      if (event.detail?.noteId) {
        const note = state.notes.notes.find(n => n.id === event.detail.noteId);
        if (note) {
          dispatch({ type: 'SELECT_NOTE', payload: note });
          dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
        }
      }
    };

    const handleNavigateToTasks = (event: CustomEvent) => {
      handleViewChange('tasks');
      // Open task modal if taskId is provided
      if (event.detail?.taskId) {
        setSelectedTaskForModal(event.detail.taskId);
      }
    };

    const handleNavigateToSettings = (event: CustomEvent) => {
      handleViewChange('settings');
    };

    const handleNavigateToProject = (event: CustomEvent) => {
      handleViewChange('kanban');
      // If projectId is provided in the event detail, we could potentially set focus on that project
      // For now, we just navigate to the kanban view
    };

    window.addEventListener('navigate-to-notes', handleNavigateToNotes as EventListener);
    window.addEventListener('navigate-to-tasks', handleNavigateToTasks as EventListener);
    window.addEventListener('navigate-to-settings', handleNavigateToSettings as EventListener);
    window.addEventListener('navigate-to-project', handleNavigateToProject as EventListener);

    return () => {
      window.removeEventListener('navigate-to-notes', handleNavigateToNotes as EventListener);
      window.removeEventListener('navigate-to-tasks', handleNavigateToTasks as EventListener);
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings as EventListener);
      window.removeEventListener('navigate-to-project', handleNavigateToProject as EventListener);
    };
  }, []);

  const handleColumnCountChange = (count: number) => {
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
  };



  const renderMainContent = (view: string) => {
    switch (view) {
      case 'today':
        return <SimpleTodayView />;
      case 'focus':
        return <FocusView onExit={handleExitFocus} />;
      case 'review':
        return <ReviewView />;
      case 'inbox':
        return <InboxView />;
      case 'tasks':
        return <TaskBoard />;
      case 'kanban':
        return <KanbanBoard />;
      case 'pins':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Pins..." />}>
            <PinsView />
          </Suspense>
        );
      case 'notes':
        return <NotesView />;
      case 'series':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Serien..." />}>
            <SeriesView />
          </Suspense>
        );
      case 'tags':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Tags..." />}>
            <TagManager />
          </Suspense>
        );
      case 'archive':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Archiv..." />}>
            <ArchiveView />
          </Suspense>
        );
      case 'statistics':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Statistiken..." />}>
            <StatisticsView />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingSpinner message="Lade Einstellungen..." />}>
            <Settings />
          </Suspense>
        );
      case 'imagetest':
        return <ImageTest />;
      default:
        return <SimpleTodayView />;
    }
  };

  // Column options for column controls - Different options for different views
  const columnOptions = [1, 3, 5, 7];

  // Determine if we're in dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');
  const isMinimalDesign = state.preferences.minimalDesign;

  // Check if there are any projects
  const hasProjects = state.columns.filter(col => col.type === 'project').length > 0;
  
  // Get background styles for all views except focus
  // Show background for all main views including dashboard, tasks, projects, kanban, etc.
  const shouldShowBackground = !['focus'].includes(currentView);
  
  // Get background type (default to 'image' for backward compatibility)
  const backgroundType = state.preferences.backgroundType || 'image';
  
  // Only use backgroundUtils for non-image backgrounds to avoid duplicate background images
  const backgroundStyles = isMinimalDesign 
    ? { backgroundColor: 'white' } // Force white background for minimal design
    : shouldShowBackground && state.preferences.backgroundImage && backgroundType === 'image'
      ? {} // Don't use backgroundUtils if we have a custom background image (handled separately with blur)
      : shouldShowBackground
        ? (isDarkMode 
            ? getDarkModeBackgroundStyles(state.preferences)
            : getBackgroundStyles(state.preferences))
        : {};
  


  return (
    <div 
      className={`w-full h-full flex flex-col relative ${state.isBulkMode ? 'bulk-mode-active' : ''}`}
      style={backgroundStyles}
    >
      {/* Background Image with optional Blur - Behind everything */}
      {!isMinimalDesign && state.preferences.backgroundImage && shouldShowBackground && backgroundType === 'image' && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${state.preferences.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            // Force blur for testing - always apply blur if backgroundEffects exists
            ...(state.preferences.backgroundEffects?.blur === true && {
              filter: 'blur(5px) brightness(0.8)',
              WebkitFilter: 'blur(5px) brightness(0.8)',
              transform: 'scale(1.1)', // Prevent blur edge artifacts
              transition: 'filter 0.3s ease-in-out'
            }),
            zIndex: -1
          }}
        />
      )}
      
      {/* Optional Dark Overlay over background */}
      {state.preferences.backgroundImage && shouldShowBackground && backgroundType === 'image' && state.preferences.backgroundEffects?.overlay !== false && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(0, 0, 0, ${state.preferences.backgroundEffects?.overlayOpacity || 0.4})`,
            zIndex: 0
          }}
        />
      )}
      

      {/* Timer Display - Based on user preference */}
      {currentView !== 'focus' && state.preferences.timerDisplayMode === 'topBar' && (
        <TopTimerBar
          onOpenTask={(taskId) => {
            handleViewChange('tasks');
            setSelectedTaskForModal(taskId);
          }}
        />
      )}

      {/* Floating Timer Modal - Only show if preference is set to floating widget */}
      {state.preferences.timerDisplayMode === 'floatingWidget' && (
        <FloatingTimerModal
          isVisible={!!state.activeTimer?.isActive}
          onClose={() => setShowFloatingTimer(false)}
          onOpenTask={(taskId) => {
            handleViewChange('tasks');
            setSelectedTaskForModal(taskId);
          }}
        />
      )}
      
      {/* Main Content Container */}
      <div className="flex-1 flex relative min-h-0 z-10">
        {/* Show main sidebar, hidden in fullscreen note editor and focus mode */}
        {!state.isNoteEditorFullScreen && currentView !== 'focus' && (
          <Sidebar 
            activeView={currentView} 
            onViewChange={handleViewChange} 
          />
        )}
        
        {/* Content area - different layout for kanban/notes/inbox vs other views */}
        <div className="relative w-full h-full overflow-hidden">
          {/* Current View */}
          <div 
            className={`absolute inset-0 transition-transform duration-300 ease-out ${
              isTransitioning 
                ? (transitionDirection === 'right' ? '-translate-x-full' : 'translate-x-full')
                : 'translate-x-0'
            }`}
          >
            {currentView === 'focus' ? (
              // Focus mode - full screen without any chrome
              <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                {renderMainContent(currentView)}
              </div>
            ) : currentView === 'notes' ? (
              // Full width content for notes (it has its own sidebar)
              <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                {renderMainContent(currentView)}
              </div>
            ) : currentView === 'kanban' ? (
              // Kanban layout - let ProjectKanbanBoard handle its own layout
              <div className="flex-1 min-w-0 h-full smooth-scroll">
                {renderMainContent(currentView)}
              </div>
            ) : currentView === 'inbox' ? (
              // Inbox layout - let InboxView handle its own layout and header
              <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                {renderMainContent(currentView)}
              </div>
            ) : currentView === 'tasks' ? (
              // Tasks layout - let TaskBoard handle its own layout without header
              <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                {renderMainContent(currentView)}
              </div>
            ) : (
              // Normal layout with header for other views
              <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Only show header if not in today view or fullscreen note editor */}
                {currentView !== 'today' && !state.isNoteEditorFullScreen && (
                  <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm transition-all duration-300">
                    <Header 
                      currentView={currentView}
                    />
                  </div>
                )}
                <div className="flex-1 allow-scroll-y smooth-scroll">
                  {renderMainContent(currentView)}
                </div>
              </div>
            )}
          </div>

          {/* Previous View (sliding out) */}
          {isTransitioning && previousView && (
            <div 
              className={`absolute inset-0 transition-transform duration-300 ease-out ${
                transitionDirection === 'right' ? 'translate-x-full' : '-translate-x-full'
              }`}
            >
              {previousView === 'focus' ? (
                // Focus mode - full screen without any chrome
                <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                  {renderMainContent(previousView)}
                </div>
              ) : previousView === 'notes' ? (
                // Full width content for notes (it has its own sidebar)
                <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                  {renderMainContent(previousView)}
                </div>
              ) : previousView === 'kanban' ? (
                // Kanban layout - let ProjectKanbanBoard handle its own layout
                <div className="flex-1 min-w-0 h-full smooth-scroll">
                  {renderMainContent(previousView)}
                </div>
              ) : previousView === 'inbox' ? (
                // Inbox layout - let InboxView handle its own layout and header
                <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                  {renderMainContent(previousView)}
                </div>
              ) : previousView === 'tasks' ? (
                // Tasks layout - let TaskBoard handle its own layout without header
                <div className="flex-1 allow-scroll-y smooth-scroll h-full">
                  {renderMainContent(previousView)}
                </div>
              ) : (
                // Normal layout with header for other views
                <div className="flex-1 flex flex-col min-w-0 h-full relative">
                  {/* Only show header if not in today view or fullscreen note editor */}
                  {previousView !== 'today' && !state.isNoteEditorFullScreen && (
                    <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm transition-all duration-300">
                      <Header 
                        currentView={previousView}
                      />
                    </div>
                  )}
                  <div className="flex-1 allow-scroll-y smooth-scroll">
                    {renderMainContent(previousView)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Column Controls - Dynamically positioned at bottom center of board area */}  
      <ColumnSwitcher 
        currentView={currentView}
        isNoteEditorFullScreen={state.isNoteEditorFullScreen}
        visibleColumns={state.preferences.columns.visible}
        columnOptions={columnOptions}
        onColumnCountChange={handleColumnCountChange}
        colors={colors}
      />

      {/* Floating Add Button - Fixed at bottom right */}
      <FloatingAddButton
        onCreateTask={() => setShowSmartTaskModal(true)}
        onCreateNote={() => {
          const newNote = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: '',
            content: '',
            tags: [],
            linkedTasks: [],
            linkedNotes: [],
            linkedProjects: [],
            pinned: false,
            archived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          dispatch({ type: 'ADD_NOTE', payload: newNote });
          dispatch({ type: 'SELECT_NOTE', payload: newNote });
          dispatch({ type: 'SET_NOTES_EDITING', payload: true });
          setCurrentView('notes');
        }}
        colors={colors}
      />

      {/* Focus Mode Prompt */}
      {showFocusPrompt.visible && createPortal(
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[999999] pointer-events-auto animate-in slide-in-from-top-2 duration-300">
          <div className="glass-effect rounded-xl border border-white/20 px-4 py-3 shadow-2xl flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: state.preferences.accentColor }} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Fokusmodus starten?</span>
            <button
              onClick={() => {
                dispatch({ type: 'SET_FOCUS_MODE', payload: true });
                setShowFocusPrompt({ visible: false });
                setLastViewBeforeFocus(currentView);
                setCurrentView('focus');
              }}
              className="ml-2 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
              style={{ backgroundColor: state.preferences.accentColor }}
            >
              Start
            </button>
            <button
              onClick={() => setShowFocusPrompt({ visible: false })}
              className="px-3 py-1.5 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Nein
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Smart Task Modal */}
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={() => setShowSmartTaskModal(false)}
                    placeholder={t('forms.create_task_for_inbox')}
      />

      {/* Global Task Modal - Only render when not in specific views that have their own TaskModals */}
      {selectedTaskForModal && (() => {
        console.log('App.tsx: currentView:', currentView);
        console.log('App.tsx: selectedTaskForModal:', selectedTaskForModal);
        console.log('App.tsx: Should render global TaskModal:', currentView !== 'tasks' && currentView !== 'inbox' && currentView !== 'kanban');
        return currentView !== 'tasks' && currentView !== 'inbox' && currentView !== 'kanban';
      })() && (
        <TaskModal
          task={state.tasks.find(task => task.id === selectedTaskForModal) || null}
          isOpen={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
        />
      )}
      
      {/* Notification Manager */}
      <NotificationManager />
      
      {/* Language Selection Modal */}
      <LanguageSelectionModal
        isOpen={showLanguageSelection}
        onLanguageSelected={handleLanguageSelected}
      />
      
      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      
      {/* 🚀 Performance Monitor - temporär deaktiviert wegen useEffect-Loop */}
      {false && process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor 
          componentName="TaskFuchs" 
          showDetails={true}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar />

    </div>
  );
}

// App Router Component
function AppRouter() {
  const { state } = useAuth();
  const [guestMode, setGuestMode] = React.useState(false);
  const [showOnboardingAtStart, setShowOnboardingAtStart] = React.useState(false);

  // Handle guest mode
  const handleGuestMode = () => {
    setGuestMode(true);
  };

  // Show onboarding on first visit before any screen (LandingPage or App)
  React.useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('taskfuchs-onboarding-complete') === 'true';
      if (!hasSeen) setShowOnboardingAtStart(true);
    } catch {}
  }, []);

  // Show welcome screen if not authenticated and not in guest mode
  if (!state.isAuthenticated && !guestMode) {
    return (
      <>
        <WelcomeScreen onGuestMode={handleGuestMode} />
        <OnboardingTour isOpen={showOnboardingAtStart} onClose={() => setShowOnboardingAtStart(false)} />
      </>
    );
  }

  // Show main app if authenticated or in guest mode
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

// Root App Component
function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
