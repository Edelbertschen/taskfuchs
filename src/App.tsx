import React, { useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WelcomeScreen } from './components/Auth/WelcomeScreen';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileShell } from './components/Layout/MobileShell';
import { MobileComingSoon } from './components/Common/MobileComingSoon';
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
import { BackupSetupModal } from './components/Common/BackupSetupModal';
import { OnboardingTour } from './components/Common/OnboardingTour';
import { UserGuide } from './components/Common/UserGuide';
import { LanguageSelectionModal } from './components/Common/LanguageSelectionModal';
import { useTranslation } from 'react-i18next';
import { BulkActionsBar } from './components/Common/BulkActionsBar';

import { ImageTest } from './components/Common/ImageTest';
import { FloatingAddButton } from './components/Common/FloatingAddButton';
import { LoadingSpinner } from './components/Common/LoadingSpinner';
import { Plus, Home, Inbox, CheckSquare, Columns, FileText, MoreHorizontal } from 'lucide-react';
import { MaterialIcon } from './components/Common/MaterialIcon';
import './App.css';
import { initializeAudioOnUserInteraction } from './utils/soundUtils';
// PWA update hook (provided by vite-plugin-pwa)
// @ts-ignore
import { isMobilePWAEnvironment } from './utils/device';
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
  const backupIntervalIdRef = React.useRef<number | null>(null);
  const [showLanguageSelection, setShowLanguageSelection] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = React.useState(false);
  const [userExitedFocus, setUserExitedFocus] = React.useState(false); // Track if user manually exited focus mode
  const [showFocusPrompt, setShowFocusPrompt] = React.useState<{visible: boolean; taskId?: string}>({ visible: false });
  const [showBackupSetup, setShowBackupSetup] = React.useState(false);
  const [showUserGuide, setShowUserGuide] = React.useState(false);
  
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();

  // Ensure i18n reflects stored preference (single source of truth)
  React.useEffect(() => {
    const prefLang = (state.preferences.language as 'de' | 'en' | undefined);
    if (prefLang && i18n.language !== prefLang) {
      try { i18n.changeLanguage(prefLang); } catch {}
    }
  }, [state.preferences.language, i18n]);

  // Immediately suggest backup setup if no directory defined yet
  React.useEffect(() => {
    try {
      const handle = (window as any).__taskfuchs_backup_dir__;
      if (!handle) {
        setShowBackupSetup(true);
      }
    } catch {}
  }, []);

  // Temporarily hold back mobile app: show Coming Soon screen on mobile viewports/PWA
  if (isMobilePWAEnvironment()) {
    return <MobileComingSoon />;
  }

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

  // Timer catch-up on visibility change (ensures elapsed time reflects background time)
  React.useEffect(() => {
    const onVisibility = () => {
      try {
        // Force UI update from timerService when we return to foreground
        const { timerService } = require('./utils/timerService');
        const active = timerService.getActiveTimer();
        if (active) {
          // Trigger a synthetic tick to refresh UI
          const context = timerService.getActiveTimer();
          if (context) {
            dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: context });
          }
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [dispatch]);

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
    
    // Handle User Guide open from anywhere
    const handleOpenUserGuide = () => setShowUserGuide(true);
    window.addEventListener('open-user-guide', handleOpenUserGuide as EventListener);

    return () => {
      window.removeEventListener('navigate-to-focus', handleNavigateToFocus as EventListener);
      window.removeEventListener('start-onboarding', handleStartOnboarding as EventListener);
      window.removeEventListener('open-user-guide', handleOpenUserGuide as EventListener);
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

  // Handle separate timer window (Electron + PWA)
  useEffect(() => {
    const isElectron = !!(window as any).require;

    if (isElectron) {
      // Electron: Use IPC for native window
      const { ipcRenderer } = (window as any).require('electron');

      // Open separate window when mode is set to separateWindow and timer is active
      if (state.preferences.timerDisplayMode === 'separateWindow' && state.activeTimer?.isActive) {
        // Request to open timer window
        ipcRenderer.send('open-timer-window', {
          timer: state.activeTimer,
          preferences: state.preferences,
          task: state.tasks?.find(t => t.id === state.activeTimer?.taskId),
          pomodoro: state.pomodoroSession
        });
      } else {
        // Close window when timer stops or mode changes
        ipcRenderer.send('close-timer-window');
      }

      // Listen for timer actions from separate window
      const handleTimerAction = (event: any, action: string) => {
        if (action === 'pause') {
          if (state.activeTimer?.isPaused) {
            dispatch({ type: 'RESUME_TIMER' });
          } else {
            dispatch({ type: 'PAUSE_TIMER' });
          }
        } else if (action === 'stop') {
          dispatch({ type: 'STOP_TIMER' });
        } else if (action === 'skip-pomodoro') {
          if (state.pomodoroSession?.type === 'work') {
            dispatch({ type: 'SKIP_POMODORO_SESSION' });
          } else {
            dispatch({ type: 'END_POMODORO_BREAK' });
          }
        }
      };

      ipcRenderer.on('timer-action', handleTimerAction);

      return () => {
        ipcRenderer.removeListener('timer-action', handleTimerAction);
      };
    } else {
      // PWA: Use window.open() for browser window
      // Store window reference globally
      if (state.preferences.timerDisplayMode === 'separateWindow' && state.activeTimer?.isActive) {
        if (!(window as any).__timerWindow || (window as any).__timerWindow.closed) {
          // Open new window
          const timerWindow = window.open(
            '/timer-window.html',
            'TaskFuchs Timer',
            'width=300,height=350,resizable=no,scrollbars=no,status=no,location=no,toolbar=no,menubar=no'
          );
          (window as any).__timerWindow = timerWindow;

          // Send initial data when window loads
          if (timerWindow) {
            timerWindow.addEventListener('load', () => {
              timerWindow.postMessage({
                type: 'timer-update',
                data: {
                  timer: state.activeTimer,
                  task: state.tasks?.find(t => t.id === state.activeTimer?.taskId),
                  pomodoro: state.pomodoroSession
                }
              }, '*');
            });
          }
        } else {
          // Update existing window
          (window as any).__timerWindow.postMessage({
            type: 'timer-update',
            data: {
              timer: state.activeTimer,
              task: state.tasks?.find(t => t.id === state.activeTimer?.taskId),
              pomodoro: state.pomodoroSession
            }
          }, '*');
        }
      } else {
        // Close window when timer stops or mode changes
        if ((window as any).__timerWindow && !(window as any).__timerWindow.closed) {
          (window as any).__timerWindow.close();
          (window as any).__timerWindow = null;
        }
      }

      // Listen for messages from timer window
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'timer-action') {
          const action = event.data.action;
          if (action === 'pause') {
            if (state.activeTimer?.isPaused) {
              dispatch({ type: 'RESUME_TIMER' });
            } else {
              dispatch({ type: 'PAUSE_TIMER' });
            }
          } else if (action === 'stop') {
            dispatch({ type: 'STOP_TIMER' });
          } else if (action === 'skip-pomodoro') {
            if (state.pomodoroSession?.type === 'work') {
              dispatch({ type: 'SKIP_POMODORO_SESSION' });
            } else {
              dispatch({ type: 'END_POMODORO_BREAK' });
            }
          }
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [state.preferences.timerDisplayMode, state.activeTimer, state.tasks, state.pomodoroSession, dispatch]);


  // Listen for PWA update notifications from SW bridge
  useEffect(() => {
    const onUpdate = () => setPwaUpdateAvailable(true);
    window.addEventListener('pwa-update-available', onUpdate as EventListener);
    return () => window.removeEventListener('pwa-update-available', onUpdate as EventListener);
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
        // Toggle timer pause/resume for active timer only when tab is visible and app has focus
        const isVisible = typeof document !== 'undefined' && !document.hidden;
        const hasFocus = typeof document !== 'undefined' && document.hasFocus && document.hasFocus();
        if (state.activeTimer?.isActive && isVisible && hasFocus) {
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
        window.dispatchEvent(new CustomEvent('open-user-guide'));
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

  // Dropbox Auto-Sync deaktiviert: kein Intervall mehr

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
  
  // Use image backgrounds when type is 'image'; otherwise use background utils.
  // If no image is chosen, we still render a default image (bg12) unless in Minimalismus-Modus.
  const backgroundStyles = isMinimalDesign 
    ? { backgroundColor: 'white' } // Force white background for minimal design
    : shouldShowBackground && backgroundType === 'image'
      ? {} // Image background handled separately below (with optional blur/overlay)
      : shouldShowBackground
        ? (isDarkMode 
            ? getDarkModeBackgroundStyles(state.preferences)
            : getBackgroundStyles(state.preferences))
        : {};
  
  // Resolve actual image to render: enforce bg12 (light) and bg13 (dark) pairing
  const resolvedBackgroundImage = (() => {
    const img = state.preferences.backgroundImage;
    if (backgroundType === 'image') {
      if (img) {
        const isBg12or13 = /\/backgrounds\/bg1(2|3)\.(png|jpg)$/.test(img);
        if (isBg12or13) {
          // Keep bg12/bg13 pairing when one of them is explicitly chosen
          return isDarkMode ? '/backgrounds/bg13.png' : '/backgrounds/bg12.png';
        }
        return img;
      }
      // Fallback when no image is chosen: always use bg12.png
      return '/backgrounds/bg12.png';
    }
    return undefined as unknown as string | undefined;
  })();


  // Bust cached splash/background assets when SW updates
  const assetVersion = (() => {
    try { return localStorage.getItem('tf_asset_v') || ''; } catch { return ''; }
  })();

  return (
    <div 
      className={`w-full h-full flex flex-col relative ${state.isBulkMode ? 'bulk-mode-active' : ''}`}
      style={backgroundStyles}
    >
      
      {/* Background Image with optional Blur - Behind everything */}
      {!isMinimalDesign && shouldShowBackground && backgroundType === 'image' && resolvedBackgroundImage && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${resolvedBackgroundImage}${assetVersion ? `?v=${assetVersion}` : ''})`,
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
      {resolvedBackgroundImage && shouldShowBackground && backgroundType === 'image' && state.preferences.backgroundEffects?.overlay !== false && (
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
          <div className="hidden md:block">
            <Sidebar 
              activeView={currentView} 
              onViewChange={handleViewChange} 
            />
          </div>
        )}
        
        {/* Content area - different layout for kanban/notes/inbox vs other views */}
        <div className="relative w-full h-full overflow-hidden pb-16 md:pb-0">
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
        visibleColumns={
          currentView === 'tasks'
            ? (state.preferences.columns.plannerVisible ?? state.preferences.columns.visible)
            : currentView === 'kanban'
              ? (state.preferences.columns.projectsVisible ?? state.preferences.columns.visible)
              : currentView === 'pins'
                ? (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible)
                : state.preferences.columns.visible
        }
        columnOptions={columnOptions}
        onColumnCountChange={(count) => {
          if (currentView === 'tasks') {
            dispatch({ type: 'UPDATE_PREFERENCES', payload: { columns: { ...state.preferences.columns, plannerVisible: count } } });
          } else if (currentView === 'kanban') {
            dispatch({ type: 'UPDATE_PREFERENCES', payload: { columns: { ...state.preferences.columns, projectsVisible: count } } });
          } else if (currentView === 'pins') {
            dispatch({ type: 'UPDATE_PREFERENCES', payload: { columns: { ...state.preferences.columns, pinsVisible: count } } });
          } else {
            handleColumnCountChange(count);
          }
        }}
        colors={colors}
      />

      {/* Floating Add Button - Fixed at bottom right */}
      <FloatingAddButton
        onCreateTask={() => setShowSmartTaskModal(true)}
        colors={colors}
      />

      {/* PWA Update Banner */}
      {pwaUpdateAvailable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100000]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-800 dark:text-gray-200">Neue Version verfügbar</span>
            <button
              onClick={() => { try { (window as any).__taskfuchs_applyUpdate?.(); } catch {} }}
              className="px-3 py-1.5 rounded-lg text-white text-sm"
              style={{ backgroundColor: colors.primary }}
            >
              Anwenden & Neu starten
            </button>
            <button
              onClick={() => setPwaUpdateAvailable(false)}
              className="px-2 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Später
            </button>
          </div>
        </div>
      )}

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

      {/* Global Task Modal - Render whenever a task is selected (e.g., from timer) */}
      {selectedTaskForModal && (
        <TaskModal
          task={state.tasks.find(task => task.id === selectedTaskForModal) || null}
          isOpen={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
        />
      )}
      {/* Global listeners to open modals from other components (e.g., search) */}
      {(function GlobalModalListeners() {
        React.useEffect(() => {
          // Expose a minimal global helper for imperative opens (fallback)
          (window as any).__taskfuchs_openTask = (id: string) => {
            setSelectedTaskForModal(id);
          };
          
          const handleOpenTaskModal = (e: any) => {
            const id = e?.detail?.taskId;
            if (id) {
              setSelectedTaskForModal(id);
            }
          };
          const handleOpenNoteModal = (e: any) => {
            const id = e?.detail?.noteId;
            if (id) {
              handleViewChange('notes');
              window.dispatchEvent(new CustomEvent('open-note-by-id', { detail: { noteId: id } }));
            }
          };
          const handleOpenBackupSetup = () => {
            setShowBackupSetup(true);
          };
          window.addEventListener('open-task-modal', handleOpenTaskModal as any);
          window.addEventListener('open-note-modal', handleOpenNoteModal as any);
          window.addEventListener('open-backup-setup', handleOpenBackupSetup as any);
          return () => {
            window.removeEventListener('open-task-modal', handleOpenTaskModal as any);
            window.removeEventListener('open-note-modal', handleOpenNoteModal as any);
            window.removeEventListener('open-backup-setup', handleOpenBackupSetup as any);
            try { delete (window as any).__taskfuchs_openTask; } catch {}
          };
        }, []);

  // Automated local JSON backup scheduler (File System Access API)
  React.useEffect(() => {
    if (backupIntervalIdRef.current) {
      clearInterval(backupIntervalIdRef.current);
      backupIntervalIdRef.current = null;
    }
    const prefs = state.preferences;
    if (!prefs?.backup?.enabled) return;
    const minutes = Math.max(1, prefs.backup.intervalMinutes || 60);
    const runBackup = async () => {
      try {
        const handle = (window as any).__taskfuchs_backup_dir__ as FileSystemDirectoryHandle | undefined;
        if (!handle) return;
        const { exportToJSON, writeBackupToDirectory } = await import('./utils/importExport');
        const data: any = {
          tasks: state.tasks,
          archivedTasks: (state as any).archivedTasks || [],
          columns: state.columns,
          tags: state.tags,
          notes: (state as any).notes?.notes || (state as any).notes || [],
          noteLinks: (state as any).noteLinks || [],
          preferences: state.preferences,
          viewState: (state as any).viewState || {},
          projectKanbanColumns: (state as any).viewState?.projectKanban?.columns || [],
          projectKanbanState: (state as any).viewState?.projectKanban || {},
          exportDate: new Date().toISOString(),
          version: '2.3'
        };
        const json = exportToJSON(data);
        const filename = `TaskFuchs_${new Date().toISOString().replace(/[:]/g,'-').slice(0,19)}.json`;
        await writeBackupToDirectory(handle, filename, json);
        (window as any).__taskfuchs_backup_toast__ = true;
        const prev = prefs.backup || { enabled: true, intervalMinutes: minutes, notify: true };
        dispatch({ type: 'UPDATE_PREFERENCES', payload: { backup: { enabled: prev.enabled, intervalMinutes: prev.intervalMinutes, notify: prev.notify, lastSuccess: new Date().toISOString() } } });
      } catch {}
    };
    const id = window.setInterval(runBackup, minutes * 60 * 1000);
    backupIntervalIdRef.current = id;
    return () => {
      if (backupIntervalIdRef.current) clearInterval(backupIntervalIdRef.current);
      backupIntervalIdRef.current = null;
    };
  }, [state.preferences.backup?.enabled, state.preferences.backup?.intervalMinutes, state.tasks, state.columns, state.tags, (state as any).notes, (state as any).viewState]);

        return null;
      })()}

      {/* Backup Setup Modal */}
      {showBackupSetup && (
        <BackupSetupModal
          isOpen={true}
          onClose={() => setShowBackupSetup(false)}
          onChooseDirectory={async () => {
            const { pickBackupDirectory } = await import('./utils/importExport');
            // @ts-ignore
            const handle = await pickBackupDirectory();
            if (handle) {
              try {
                // @ts-ignore
                const perm = await (handle as any).requestPermission?.({ mode: 'readwrite' });
                if (perm === 'granted' || perm === undefined) {
                  (window as any).__taskfuchs_backup_dir__ = handle;
                  try {
                    const name = (handle as any)?.name || '';
                    window.dispatchEvent(new CustomEvent('backup-dir-selected', { detail: { name } }));
                  } catch {}
                  // Auto-activate backups if not enabled yet
                  const prev = state.preferences.backup || { enabled: false, intervalMinutes: 60, notify: true };
                  if (!prev.enabled) {
                    dispatch({ type: 'UPDATE_PREFERENCES', payload: { backup: { enabled: true, intervalMinutes: prev.intervalMinutes || 60, notify: prev.notify ?? true, lastSuccess: prev.lastSuccess } } });
                  }
                }
              } catch {}
            }
          }}
        />
      )}
      {(() => { try { (window as any).__force_backup_modal_rerender__ = () => setShowBackupSetup(s => s); } catch {} return null; })()}

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
      
      {/* User Guide */}
      <UserGuide
        isOpen={showUserGuide}
        onClose={() => setShowUserGuide(false)}
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000]">
        <div className="mx-auto max-w-screen-sm">
          <div className="flex items-stretch justify-around bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/60 dark:border-gray-700/60 shadow-lg">
            {[
              { id: 'today', label: 'Heute', icon: Home },
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'tasks', label: 'Planer', icon: CheckSquare },
              { id: 'kanban', label: 'Projekte', icon: Columns },
              { id: 'notes', label: 'Notizen', icon: FileText },
            ].map(({ id, label, icon: Icon }) => {
              const active = currentView === id;
              return (
                <button
                  key={id}
                  onClick={() => handleViewChange(id)}
                  className="flex-1 py-2.5 flex flex-col items-center justify-center text-xs font-medium"
                  style={{ color: active ? colors.primary : (isDarkMode ? '#e5e7eb' : '#374151') }}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span>{label}</span>
                </button>
              );
            })}
            <button
              onClick={() => handleViewChange('settings')}
              className="flex-1 py-2.5 flex flex-col items-center justify-center text-xs font-medium"
              style={{ color: currentView === 'settings' ? colors.primary : (isDarkMode ? '#e5e7eb' : '#374151') }}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span>Mehr</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// App Router Component
function AppRouter() {
  const { state } = useAuth();
  const [guestMode, setGuestMode] = React.useState(false);

  // Handle guest mode
  const handleGuestMode = () => {
    setGuestMode(true);
  };

  // Show welcome screen if not authenticated and not in guest mode
  if (!state.isAuthenticated && !guestMode) {
    return <WelcomeScreen onGuestMode={handleGuestMode} />;
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
  // PWA update handling moved to main.tsx (no hook usage here)

  return (
    <AuthProvider>
      {/* No custom update banner: manual reload activates latest SW (skipWaiting+clientsClaim) */}
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
