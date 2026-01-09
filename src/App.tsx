import React, { useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CelebrationProvider } from './context/CelebrationContext';
import { ToastProvider } from './context/ToastContext';
import { EmailProvider, useEmail } from './context/EmailContext';
import { WelcomeScreen } from './components/Auth/WelcomeScreen';
import { LoginPage } from './components/Auth/LoginPage';
import { UserManagement } from './components/Admin/UserManagement';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileShell } from './components/Layout/MobileShell';
import { MobileComingSoon } from './components/Common/MobileComingSoon';
import { isStandalonePWA } from './utils/device';
import { Header } from './components/Layout/Header';
import { TaskBoard } from './components/Tasks/TaskBoard';
import { InboxView } from './components/Inbox/InboxView';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { PinsView } from './components/Pins/PinsView';


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
import { SmartTaskModal } from './components/Tasks/SmartTaskModal';
import { AiBulkTaskModal } from './components/Tasks/AiBulkTaskModal';
import { TaskModal } from './components/Tasks/TaskModal';
import { TopTimerBar } from './components/Timer/TopTimerBar';
import { FloatingTimerModal } from './components/Timer/FloatingTimerModal';
import { NotificationManager } from './components/Common/NotificationManager';
import { BackupSetupModal } from './components/Common/BackupSetupModal';
import { OnboardingTour } from './components/Common/OnboardingTour';
import { NewsModal, shouldShowNews } from './components/Common/NewsModal';
import { ChangelogModal } from './components/Common/ChangelogModal';
import { MobileAppModal, shouldShowMobileAppModal } from './components/Common/MobileAppModal';
import { UserGuide } from './components/Common/UserGuide';
import { LanguageSelectionModal } from './components/Common/LanguageSelectionModal';
import { useTranslation } from 'react-i18next';
import { BulkActionsBar } from './components/Common/BulkActionsBar';

import { ImageTest } from './components/Common/ImageTest';
import { FloatingAddButton } from './components/Common/FloatingAddButton';
import { LoadingSpinner } from './components/Common/LoadingSpinner';
import { AppLoadingScreen } from './components/Common/AppLoadingScreen';
import { EmailSidebar } from './components/Email';
import { Plus, Home, Inbox, CheckSquare, Columns, FileText, MoreHorizontal, X } from 'lucide-react';
import { MaterialIcon } from './components/Common/MaterialIcon';
import './App.css';
import { initializeAudioOnUserInteraction } from './utils/soundUtils';
// PWA update hook (provided by vite-plugin-pwa)
// @ts-ignore
import { isMobilePWAEnvironment } from './utils/device';
import { getBackgroundStyles, getDarkModeBackgroundStyles } from './utils/backgroundUtils';
import { format } from 'date-fns';
import { timerService } from './utils/timerService';
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

type ViewType = 'today' | 'tasks' | 'kanban' | 'focus' | 'pins' | 'archive' | 'inbox' | 'statistics' | 'series' | 'admin';

// Column Switcher Component with scroll arrows
interface ColumnSwitcherProps {
  currentView: string;
  isNoteEditorFullScreen: boolean;
  visibleColumns: number;
  columnOptions: number[];
  onColumnCountChange: (count: number) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  colors: any;
}

function ColumnSwitcher({ 
  currentView, 
  isNoteEditorFullScreen, 
  visibleColumns, 
  columnOptions, 
  onColumnCountChange,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
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

  // Show for tasks, kanban, and pins views
  if (currentView !== 'tasks' && currentView !== 'kanban' && currentView !== 'pins') {
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
    
    if (currentView === 'pins') {
      return 80; // Only main sidebar
    }
    
    return 80; // Default sidebar width
  };
  
  const sidebarWidth = getSidebarWidth();
  const sidebarOffset = sidebarWidth / 2; // Half of sidebar width for centering

  // Separate arrow button component - larger, standalone style
  const ArrowButton = ({ direction, disabled }: { direction: 'prev' | 'next'; disabled: boolean }) => (
    <button
      onClick={() => !disabled && onNavigate(direction)}
      disabled={disabled}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none shadow-lg border ${
        disabled 
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50' 
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-110 active:scale-95'
      }`}
      title={direction === 'prev' ? 'Nach links scrollen' : 'Nach rechts scrollen'}
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {direction === 'prev' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
  
  return (
    <div 
      className="fixed bottom-4 z-30 transition-all duration-500 ease-in-out pointer-events-none"
      style={{
        left: `calc(50% + ${sidebarOffset}px)`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-6 pointer-events-auto">
        {/* Left arrow - separate from column selector */}
        <ArrowButton direction="prev" disabled={!canNavigatePrev} />
        
        {/* Column count buttons - centered */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-2 py-1 shadow-lg border border-gray-200 dark:border-gray-700">
          {columnOptions.map((count) => (
            <button
              key={count}
              onClick={() => onColumnCountChange(count)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
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
        
        {/* Right arrow - separate from column selector */}
        <ArrowButton direction="next" disabled={!canNavigateNext} />
      </div>
    </div>
  );
}

// Email Layout Wrapper - Handles sidebar push layout
function EmailLayoutWrapper() {
  const { state: emailState } = useEmail();
  
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${emailState.isOpen ? 'mr-[350px]' : ''}`}>
        <MainApp />
      </div>
      <EmailSidebar />
    </div>
  );
}

// Main App Component (authenticated users)
function MainApp() {
  const [currentView, setCurrentView] = React.useState('today');
  const [previousView, setPreviousView] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [lastViewBeforeFocus, setLastViewBeforeFocus] = React.useState('today');
  const [showSmartTaskModal, setShowSmartTaskModal] = React.useState(false);
  const [showAiBulkTaskModal, setShowAiBulkTaskModal] = React.useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = React.useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = React.useState<string | null>(null);
  const backupIntervalIdRef = React.useRef<number | null>(null);
  const [showLanguageSelection, setShowLanguageSelection] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showNewsModal, setShowNewsModal] = React.useState(false);
  const [showChangelogModal, setShowChangelogModal] = React.useState(false);
  const [showMobileAppModal, setShowMobileAppModal] = React.useState(false);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = React.useState(false);
  const [showBackupSetup, setShowBackupSetup] = React.useState(false);
  const [showUserGuide, setShowUserGuide] = React.useState(false);
  
  // Column navigation state (for scroll arrows)
  const [canNavigatePrev, setCanNavigatePrev] = React.useState(false);
  const [canNavigateNext, setCanNavigateNext] = React.useState(true);
  
  const { state, dispatch } = useApp();
  const { state: authState } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Check if we're in online mode (not guest mode) - backup only relevant for guest mode
  const isOnlineMode = authState.isOnlineMode;

  // Ensure i18n reflects stored preference (single source of truth)
  React.useEffect(() => {
    const prefLang = (state.preferences.language as 'de' | 'en' | undefined);
    if (prefLang && i18n.language !== prefLang) {
      try { i18n.changeLanguage(prefLang); } catch {}
    }
  }, [state.preferences.language, i18n]);

  // Backup setup is now triggered via sidebar warning icon instead of auto-popup
  // The 'open-backup-setup' event handler (below) will open the modal when clicked

  // Show news modal after a short delay (only if not seen yet and no onboarding)
  React.useEffect(() => {
    if (!showOnboarding && shouldShowNews()) {
      const timer = setTimeout(() => {
        setShowNewsModal(true);
      }, 2000); // Show after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [showOnboarding]);

  // Show mobile app modal after news modal (only if not seen yet)
  React.useEffect(() => {
    if (!showOnboarding && !showNewsModal && shouldShowMobileAppModal()) {
      const timer = setTimeout(() => {
        setShowMobileAppModal(true);
      }, 3000); // Show after 3 seconds, after news modal
      return () => clearTimeout(timer);
    }
  }, [showOnboarding, showNewsModal]);

  // Listen for scroll state updates from child views (TaskBoard, ProjectKanbanBoard, PinsView)
  React.useEffect(() => {
    const handleScrollStateUpdate = (e: CustomEvent<{ canPrev: boolean; canNext: boolean }>) => {
      setCanNavigatePrev(e.detail.canPrev);
      setCanNavigateNext(e.detail.canNext);
    };

    window.addEventListener('column-scroll-state', handleScrollStateUpdate as EventListener);
    return () => {
      window.removeEventListener('column-scroll-state', handleScrollStateUpdate as EventListener);
    };
  }, []);

  // Handle navigation requests from the ColumnSwitcher
  const handleColumnNavigate = React.useCallback((direction: 'prev' | 'next') => {
    window.dispatchEvent(new CustomEvent('column-navigate', { detail: { direction } }));
  }, []);

  // Mobile: Show elegant mobile companion app
  if (isMobilePWAEnvironment()) {
    return <MobileShell />;
  }

  // Quick navigation with subtle fade/morph effect
  const handleViewChange = React.useCallback((newView: string) => {
    if (newView === currentView || isTransitioning) return;
    
    setPreviousView(currentView);
    setIsTransitioning(true);
    
    // Almost instant view change with quick fade
    setTimeout(() => {
      setCurrentView(newView);
      
      // End transition quickly
      setTimeout(() => {
        setIsTransitioning(false);
        setPreviousView(null);
      }, 80);
    }, 30);
  }, [currentView, isTransitioning]);

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
    // Handle Onboarding start from anywhere - clear stored state to start fresh
    const handleStartOnboarding = () => {
      // Clear any stored onboarding state so it starts from the beginning
      sessionStorage.removeItem('taskfuchs-onboarding-state');
      setShowOnboarding(true);
    };
    window.addEventListener('start-onboarding', handleStartOnboarding as EventListener);
    
    // Handle User Guide open from anywhere
    const handleOpenUserGuide = () => setShowUserGuide(true);
    window.addEventListener('open-user-guide', handleOpenUserGuide as EventListener);

    // Handle Changelog open from anywhere
    const handleOpenChangelog = () => setShowChangelogModal(true);
    window.addEventListener('open-changelog', handleOpenChangelog as EventListener);

    return () => {
      window.removeEventListener('navigate-to-focus', handleNavigateToFocus as EventListener);
      window.removeEventListener('start-onboarding', handleStartOnboarding as EventListener);
      window.removeEventListener('open-user-guide', handleOpenUserGuide as EventListener);
      window.removeEventListener('open-changelog', handleOpenChangelog as EventListener);
    };
  }, [currentView, dispatch]);

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
          task: state.tasks?.find(t => t.id === state.activeTimer?.taskId)
        });
        
        // Setup interval to send updates every second for smooth counting
        if (!(window as any).__electronTimerUpdateInterval) {
          const updateInterval = setInterval(() => {
            ipcRenderer.send('update-timer-window', {
              timer: state.activeTimer,
              preferences: state.preferences,
              task: state.tasks?.find(t => t.id === state.activeTimer?.taskId)
            });
          }, 1000);
          (window as any).__electronTimerUpdateInterval = updateInterval;
        }
      } else {
        // Close window when timer stops or mode changes
        ipcRenderer.send('close-timer-window');
        
        // Clear update interval
        if ((window as any).__electronTimerUpdateInterval) {
          clearInterval((window as any).__electronTimerUpdateInterval);
          (window as any).__electronTimerUpdateInterval = null;
        }
      }

      // Listen for timer actions from separate window
      const handleTimerAction = (event: any, action: string) => {
        if (action === 'pause') {
          // Pause BOTH timers
          if (state.activeTimer?.isPaused) {
            dispatch({ type: 'RESUME_TIMER' });
          } else {
            dispatch({ type: 'PAUSE_TIMER' });
          }
        } else if (action === 'complete-task') {
          // Complete task, Pomodoro continues
          if (state.activeTimer?.taskId) {
            const task = state.tasks?.find(t => t.id === state.activeTimer.taskId);
            if (task) {
              dispatch({
                type: 'UPDATE_TASK',
                payload: { ...task, completed: true }
              });
            }
          }
        } else if (action === 'stop-task') {
          // Stop task timer only, Pomodoro continues
          dispatch({ type: 'STOP_TIMER' });
        } else if (action === 'stop-all') {
          // Stop task timer AND reset Pomodoro
          dispatch({ type: 'STOP_TIMER' });
          // Note: Pomodoro session handled separately
        } else if (action === 'skip-pomodoro') {
          // Skip pomodoro phase - handled by Pomodoro component
        }
      };

      ipcRenderer.on('timer-action', handleTimerAction);

      return () => {
        ipcRenderer.removeListener('timer-action', handleTimerAction);
        // Clear update interval on cleanup
        if ((window as any).__electronTimerUpdateInterval) {
          clearInterval((window as any).__electronTimerUpdateInterval);
          (window as any).__electronTimerUpdateInterval = null;
        }
      };
    } else {
      // PWA: Use window.open() for browser window
      // Store window reference globally
      if (state.preferences.timerDisplayMode === 'separateWindow' && state.activeTimer?.isActive) {
        if (!(window as any).__timerWindow || (window as any).__timerWindow.closed) {
          // Open new window - compact size
          const timerWindow = window.open(
            '/timer-window.html',
            'TaskFuchs Timer',
            'width=260,height=90,resizable=no,scrollbars=no,status=no,location=no,toolbar=no,menubar=no'
          );
          (window as any).__timerWindow = timerWindow;

          // Send initial data when window loads
          if (timerWindow) {
            timerWindow.addEventListener('load', () => {
              const sendUpdate = () => {
                if (timerWindow && !timerWindow.closed) {
                  timerWindow.postMessage({
                    type: 'timer-update',
                    data: {
                      timer: state.activeTimer,
                      task: state.tasks?.find(t => t.id === state.activeTimer?.taskId),
                      preferences: {
                        theme: state.preferences.theme,
                        accentColor: state.preferences.accentColor
                      }
                    }
                  }, '*');
                }
              };
              
              // Send initial update
              sendUpdate();
              
              // Setup interval for regular updates (every second)
              const updateInterval = setInterval(sendUpdate, 1000);
              (window as any).__timerUpdateInterval = updateInterval;
            });
          }
        } else {
          // Update existing window
          if ((window as any).__timerWindow && !(window as any).__timerWindow.closed) {
            (window as any).__timerWindow.postMessage({
              type: 'timer-update',
              data: {
                timer: state.activeTimer,
                task: state.tasks?.find(t => t.id === state.activeTimer?.taskId),
                preferences: {
                  theme: state.preferences.theme,
                  accentColor: state.preferences.accentColor
                }
              }
            }, '*');
          }
        }
      } else {
        // Close window when timer stops or mode changes
        if ((window as any).__timerWindow && !(window as any).__timerWindow.closed) {
          (window as any).__timerWindow.close();
          (window as any).__timerWindow = null;
        }
        // Clear update interval
        if ((window as any).__timerUpdateInterval) {
          clearInterval((window as any).__timerUpdateInterval);
          (window as any).__timerUpdateInterval = null;
        }
      }

      // Listen for messages from timer window
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'timer-action') {
          const action = event.data.action;
          if (action === 'pause') {
            // Pause BOTH timers
            if (state.activeTimer?.isPaused) {
              dispatch({ type: 'RESUME_TIMER' });
            } else {
              dispatch({ type: 'PAUSE_TIMER' });
            }
          } else if (action === 'complete-task') {
            // Complete task, Pomodoro continues
            if (state.activeTimer?.taskId) {
              const task = state.tasks?.find(t => t.id === state.activeTimer.taskId);
              if (task) {
                dispatch({
                  type: 'UPDATE_TASK',
                  payload: { ...task, completed: true }
                });
              }
            }
          } else if (action === 'stop-task') {
            // Stop task timer only, Pomodoro continues
            dispatch({ type: 'STOP_TIMER' });
          } else if (action === 'stop-all') {
            // Stop task timer AND reset Pomodoro
            dispatch({ type: 'STOP_TIMER' });
            // Note: Pomodoro session handled separately
          } else if (action === 'skip-pomodoro') {
            // Skip pomodoro phase - handled by Pomodoro component
          }
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
        // Clear update interval on cleanup
        if ((window as any).__timerUpdateInterval) {
          clearInterval((window as any).__timerUpdateInterval);
          (window as any).__timerUpdateInterval = null;
        }
      };
    }
  }, [state.preferences.timerDisplayMode, state.activeTimer, state.tasks, state.preferences.theme, state.preferences.accentColor, dispatch]);


  // Listen for PWA update notifications from SW bridge
  useEffect(() => {
    const onUpdate = () => setPwaUpdateAvailable(true);
    window.addEventListener('pwa-update-available', onUpdate as EventListener);
    return () => window.removeEventListener('pwa-update-available', onUpdate as EventListener);
  }, []);

  // Handle exit from focus mode
  const handleExitFocus = () => {
    console.log('🎯 Exiting focus mode, returning to:', lastViewBeforeFocus);
    handleViewChange(lastViewBeforeFocus);
  };

  // Check if user should see onboarding (only first start)
  // Use a ref to ensure this only runs once per mount
  const onboardingCheckedRef = React.useRef(false);
  
  React.useEffect(() => {
    // Only check once per component mount to prevent race conditions
    if (onboardingCheckedRef.current) return;
    
    const hasCompletedOnboarding = localStorage.getItem('taskfuchs-onboarding-complete') === 'true' || state.preferences.hasCompletedOnboarding;
    const alreadyShownThisSession = sessionStorage.getItem('taskfuchs-onboarding-shown') === 'true';
    
    // Show onboarding directly for first-time users (no splash modal)
    if (!hasCompletedOnboarding && !alreadyShownThisSession) {
      onboardingCheckedRef.current = true;
      // Small delay to ensure DOM is fully ready
      setTimeout(() => {
        setShowOnboarding(true);
        sessionStorage.setItem('taskfuchs-onboarding-shown', 'true');
      }, 100);
    } else {
      onboardingCheckedRef.current = true;
    }
  }, [state.preferences.hasCompletedOnboarding]);

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
          '5': 'tags',
          '6': 'statistics',
          '7': 'archive',
          '8': 'settings'
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

      // Focus Mode shortcut removed - was conflicting with browser search (Cmd/Ctrl+F)

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
          // Don't close onboarding on ESC - users should use the skip button
          // This prevents accidental closure
          // setShowOnboarding(false);
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
      // Only handle SHIFT + wheel
      if (!e.shiftKey) return;
      
      // Ignore if user is in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
        const direction = e.deltaY > 0 ? 'next' : 'prev';
        
        if (currentView === 'tasks') {
          e.preventDefault();
          dispatch({ type: 'NAVIGATE_DATE', payload: direction });
        } else if (currentView === 'kanban') {
          e.preventDefault();
          dispatch({ type: 'NAVIGATE_PROJECTS', payload: direction });
      } else if (currentView === 'pins') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pins-column-navigate', { detail: { direction } }));
      }
    };

    // Use capture phase to ensure we get the event first
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
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

  // Listen for navigation events
  useEffect(() => {
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
    };

    window.addEventListener('navigate-to-tasks', handleNavigateToTasks as EventListener);
    window.addEventListener('navigate-to-settings', handleNavigateToSettings as EventListener);
    window.addEventListener('navigate-to-project', handleNavigateToProject as EventListener);

    return () => {
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
      case 'admin':
        return <UserManagement />;
      default:
        return <SimpleTodayView />;
    }
  };

  // Column options for column controls - Different options for different views
  const columnOptions = [1, 3, 5, 7];

  // Determine if we're in dark mode (reactive based on state, not DOM)
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
  
  // Resolve actual image to render: enforce light/dark pairing for paired backgrounds
  const resolvedBackgroundImage = (() => {
    const img = state.preferences.backgroundImage;
    if (backgroundType === 'image') {
      if (img) {
        // Check for bg12/bg13 pair
        const isBg12or13 = /\/backgrounds\/bg1(2|3)\.(png|jpg|webp)$/.test(img);
        if (isBg12or13) {
          return isDarkMode ? '/backgrounds/bg13.webp' : '/backgrounds/bg12.webp';
        }
        // Check for bg14/bg15 pair
        const isBg14or15 = /\/backgrounds\/bg1(4|5)\.(png|jpg|webp)$/.test(img);
        if (isBg14or15) {
          return isDarkMode ? '/backgrounds/bg15.webp' : '/backgrounds/bg14.webp';
        }
        // Check for bg16/bg17 pair
        const isBg16or17 = /\/backgrounds\/bg1(6|7)\.(png|jpg|webp)$/.test(img);
        if (isBg16or17) {
          return isDarkMode ? '/backgrounds/bg17.webp' : '/backgrounds/bg16.webp';
        }
        // Check for bg18/bg19 pair
        const isBg18or19 = /\/backgrounds\/bg1(8|9)\.(png|jpg|webp)$/.test(img);
        if (isBg18or19) {
          return isDarkMode ? '/backgrounds/bg19.webp' : '/backgrounds/bg18.webp';
        }
        // Check for bg22/bg23 pair
        const isBg22or23 = /\/backgrounds\/bg2(2|3)\.(png|jpg|webp)$/.test(img);
        if (isBg22or23) {
          return isDarkMode ? '/backgrounds/bg23.webp' : '/backgrounds/bg22.webp';
        }
        // Check for bg24/bg25 pair
        const isBg24or25 = /\/backgrounds\/bg2(4|5)\.(png|jpg|webp)$/.test(img);
        if (isBg24or25) {
          return isDarkMode ? '/backgrounds/bg25.webp' : '/backgrounds/bg24.webp';
        }
        // Check for bg26/bg27 pair
        const isBg26or27 = /\/backgrounds\/bg2(6|7)\.(png|jpg|webp)$/.test(img);
        if (isBg26or27) {
          return isDarkMode ? '/backgrounds/bg27.webp' : '/backgrounds/bg26.webp';
        }
        return img;
      }
      // Fallback when no image is chosen: always use bg12.webp
      return '/backgrounds/bg12.webp';
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
        
        {/* Content area - different layout for kanban/inbox vs other views */}
        <div className="relative w-full h-full overflow-hidden pb-16 md:pb-0">
          {/* Current View - subtle fade transition */}
          <div 
            className="absolute inset-0"
            style={{
              opacity: isTransitioning ? 0.85 : 1,
              transition: 'opacity 80ms ease-out'
            }}
          >
            {currentView === 'focus' ? (
              // Focus mode - full screen without any chrome
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
            ) : currentView === 'pins' ? (
              // Pins layout - has its own header
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
        onNavigate={handleColumnNavigate}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
        colors={colors}
      />

      {/* Floating Add Button - Fixed at bottom right */}
      {/* Floating Add Button - KI nur für authentifizierte Benutzer (Web App mit MS-Login) */}
      <FloatingAddButton
        onCreateTask={() => setShowSmartTaskModal(true)}
        onAiBulkTask={(authState.isAuthenticated && (state.preferences.enableAI ?? true)) ? () => setShowAiBulkTaskModal(true) : undefined}
        colors={colors}
      />

      {/* PWA Update Banner - Nutzer entscheidet */}
      {pwaUpdateAvailable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100000] animate-slide-in-from-bottom">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('pwa.update_available') || 'Neue Version verfügbar'}
              </span>
            </div>
            <button
              onClick={() => { 
                try { (window as any).__taskfuchs_applyUpdate?.(); } catch {} 
              }}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: colors.primary }}
            >
              {t('pwa.update_now') || 'Jetzt aktualisieren'}
            </button>
            <button
              onClick={() => setPwaUpdateAvailable(false)}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t('pwa.update_later') || 'Später'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Smart Task Modal */}
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={() => setShowSmartTaskModal(false)}
                    placeholder={t('forms.create_task_for_inbox')}
      />

      {/* AI Bulk Task Modal - Nur für authentifizierte Benutzer (Web App mit MS-Login) */}
      {authState.isAuthenticated && (
      <AiBulkTaskModal
        isOpen={showAiBulkTaskModal}
        onClose={() => setShowAiBulkTaskModal(false)}
      />
      )}

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
          const handleCloseTaskModal = () => {
            setSelectedTaskForModal(null);
          };
          const handleOpenBackupSetup = () => {
            // Only open backup setup in guest mode (not online mode)
            const jwt = localStorage.getItem('taskfuchs_jwt');
            if (!jwt) {
              setShowBackupSetup(true);
            }
          };
          window.addEventListener('open-task-modal', handleOpenTaskModal as any);
          window.addEventListener('close-task-modal', handleCloseTaskModal);
          window.addEventListener('open-backup-setup', handleOpenBackupSetup as any);
          return () => {
            window.removeEventListener('open-task-modal', handleOpenTaskModal as any);
            window.removeEventListener('close-task-modal', handleCloseTaskModal);
            window.removeEventListener('open-backup-setup', handleOpenBackupSetup as any);
            try { delete (window as any).__taskfuchs_openTask; } catch {}
          };
        }, []);

  // Initialize and manage backup service (only in guest mode, not online mode)
  React.useEffect(() => {
    // Skip backup initialization in online mode - data is in the database
    if (isOnlineMode) return;
    
    const initBackup = async () => {
      try {
        const { backupService } = await import('./utils/backupService');
        await backupService.initialize();
      } catch (e) {
        console.warn('Failed to initialize backup service:', e);
      }
    };
    initBackup();
  }, [isOnlineMode]);

  // Automated local JSON backup scheduler using BackupService
  // Store state ref for backup data getter (to avoid re-triggering useEffect on every state change)
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    // Skip auto-backup in online mode - data is in the database
    if (isOnlineMode) return;
    
    const setupAutoBackup = async () => {
      try {
        const { backupService } = await import('./utils/backupService');
        const prefs = state.preferences;
        
        if (!prefs?.backup?.enabled || !backupService.isConfigured()) {
          backupService.stopAutoBackup();
          return;
        }
        
        const minutes = Math.max(1, prefs.backup.intervalMinutes || 60);
        
        // Use stateRef to always get current state without re-triggering useEffect
        const getBackupData = () => {
          const currentState = stateRef.current;
          return {
            tasks: currentState.tasks,
            archivedTasks: (currentState as any).archivedTasks || [],
            columns: currentState.columns,
            tags: currentState.tags,
            boards: (currentState as any).boards || [],
            preferences: currentState.preferences,
            viewState: (currentState as any).viewState || {},
            projectKanbanColumns: (currentState as any).viewState?.projectKanban?.columns || [],
            projectKanbanState: (currentState as any).viewState?.projectKanban || {},
            pinColumns: (currentState as any).pinColumns || [],
            recurrence: (currentState as any).recurrence || {},
            events: (currentState as any).events || [],
            calendarSources: (currentState as any).calendarSources || [],
            exportDate: new Date().toISOString(),
            version: '3.0'
          };
        };
        
        backupService.startAutoBackup(
          minutes, 
          getBackupData,
          (result) => {
            if (result.success && result.timestamp) {
              dispatch({ 
                type: 'UPDATE_PREFERENCES', 
                payload: { 
                  backup: { 
                    ...prefs.backup, 
                    lastSuccess: result.timestamp 
                  } 
                } 
              });
            }
          }
        );
      } catch (e) {
        console.warn('Failed to setup auto-backup:', e);
      }
    };
    
    setupAutoBackup();
    
    return () => {
      import('./utils/backupService').then(({ backupService }) => {
        backupService.stopAutoBackup();
      }).catch(() => {});
    };
  // Only re-run when backup config changes or online mode changes, NOT when data changes
  }, [state.preferences.backup?.enabled, state.preferences.backup?.intervalMinutes, isOnlineMode]);

  // Dropbox auto-sync scheduler
  React.useEffect(() => {
    const dropboxPrefs = state.preferences.dropbox;
    if (!dropboxPrefs?.enabled || !dropboxPrefs?.autoSync || !dropboxPrefs?.appKey) {
      return;
    }

    // Store state reference for auto-sync
    (window as any).__taskfuchs_state__ = state;

    // Start auto-sync
    const startAutoSync = async () => {
      try {
        const { startAutoSync: start } = await import('./utils/dropboxSync');
        const { getDropboxClient: getClient } = await import('./utils/dropboxClient');
        
        // Check if authenticated
        const client = getClient(dropboxPrefs.appKey);
        if (!client.isAuthenticated()) {
          console.log('[Dropbox] Not authenticated, skipping auto-sync');
          return;
        }
        
        const intervalMinutes = dropboxPrefs.syncInterval || 5;
        start(state, dispatch, intervalMinutes);
      } catch (e) {
        console.error('[Dropbox] Failed to start auto-sync:', e);
      }
    };

    startAutoSync();

    return () => {
      // Stop auto-sync on cleanup
      import('./utils/dropboxSync').then(({ stopAutoSync }) => {
        stopAutoSync();
      });
    };
  }, [state.preferences.dropbox?.enabled, state.preferences.dropbox?.autoSync, state.preferences.dropbox?.appKey, state.preferences.dropbox?.syncInterval]);

  // Update state reference for auto-sync
  React.useEffect(() => {
    (window as any).__taskfuchs_state__ = state;
  }, [state]);

        return null;
      })()}

      {/* Backup Setup Modal - Only show in guest mode (not online mode) */}
      {!isOnlineMode && showBackupSetup && (
        <BackupSetupModal
          isOpen={true}
          onClose={() => setShowBackupSetup(false)}
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
        onNavigate={(view) => handleViewChange(view as ViewType)}
      />

      {/* News Modal */}
      <NewsModal
        isOpen={showNewsModal}
        onClose={() => setShowNewsModal(false)}
      />

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
      />

      {/* Mobile App Modal */}
      <MobileAppModal
        isOpen={showMobileAppModal}
        onClose={() => setShowMobileAppModal(false)}
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
  const { t } = useTranslation();
  const { state, loginWithMicrosoft } = useAuth();
  
  // Check if running in offline-only mode (PWA deployment without backend)
  // When VITE_OFFLINE_MODE=true, the app is always in guest mode with no login
  const isOfflineOnlyMode = import.meta.env.VITE_OFFLINE_MODE === 'true';
  
  // Detect if running as PWA (installed app) vs web browser
  const isPWA = React.useMemo(() => isStandalonePWA(), []);
  
  // Force guest mode in offline-only mode or PWA mode
  const forceGuestMode = isOfflineOnlyMode || isPWA;
  
  // Check if user explicitly chose guest mode this session
  // PWA/offline-only mode always starts in guest mode (no login required)
  const [guestMode, setGuestMode] = React.useState(() => {
    // Offline-only or PWA mode: always guest mode by default
    if (forceGuestMode) {
      return true;
    }
    // Web mode: check localStorage for explicit guest mode
    return localStorage.getItem('taskfuchs-guest-mode') === 'true';
  });

  // Handle guest mode
  const handleGuestMode = () => {
    try {
      localStorage.setItem('taskfuchs-guest-mode', 'true');
    } catch {}
    setGuestMode(true);
  };

  // Handle going online from guest mode (disabled in offline-only mode)
  const handleGoOnline = () => {
    // Prevent going online in offline-only PWA mode
    if (isOfflineOnlyMode) {
      console.log('[AppRouter] Online mode disabled in offline-only deployment');
      return;
    }
    loginWithMicrosoft();
  };

  // Listen for logout events to exit guest mode and show login
  React.useEffect(() => {
    const handleLogout = () => {
      // In offline-only or PWA mode, stay in guest mode after logout
      if (forceGuestMode) {
        return;
      }
      // In web mode, clear guest mode flag to show login page
      localStorage.removeItem('taskfuchs-guest-mode');
      setGuestMode(false);
    };
    
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [forceGuestMode]);

  // Check if on auth callback - LoginPage will handle showing loading state
  const isAuthCallback = window.location.pathname === '/auth/callback';

  // Show loading screen while restoring session OR while data is loading (online mode)
  // This prevents the double loading screen flash by keeping one continuous loading state
  if (state.isRestoringSession || (state.isOnlineMode && !isOfflineOnlyMode && !state.isDataLoaded)) {
    const message = state.isRestoringSession 
      ? t('app.restoringSession', 'Restoring session...')
      : t('app.loadingData', 'Loading your data...');
    return (
      <AppProvider>
        <AppLoadingScreen message={message} />
      </AppProvider>
    );
  }

  // If authenticated (online mode), show main app (data is already loaded)
  // In offline-only mode, ignore online mode state and stay in guest mode
  if (state.isOnlineMode && !isOfflineOnlyMode) {
    return (
      <AppProvider>
        <CelebrationProvider>
          <EmailProvider>
            <EmailLayoutWrapper />
          </EmailProvider>
        </CelebrationProvider>
      </AppProvider>
    );
  }

  // In web browser mode (not PWA/offline-only): show login page if not explicitly in guest mode
  // PWA/offline-only mode: always skip login page, go directly to guest mode
  if (!guestMode && !forceGuestMode) {
    return <LoginPage isProcessingCallback={isAuthCallback} />;
  }

  // Show main app in guest mode (localStorage only) with "Go Online" context
  // Note: In offline-only mode, the "Go Online" button is disabled/hidden
  // EmailProvider is included even in guest mode to prevent useEmail hook errors
  // (email features simply won't be functional without authentication)
  return (
    <GuestModeContext.Provider value={{ goOnline: handleGoOnline, isOfflineOnly: isOfflineOnlyMode }}>
      <AppProvider>
        <CelebrationProvider>
          <EmailProvider>
            <MainApp />
          </EmailProvider>
        </CelebrationProvider>
      </AppProvider>
    </GuestModeContext.Provider>
  );
}

// Context for guest mode "Go Online" functionality
// isOfflineOnly: when true, hides the "Go Online" button (PWA deployment without backend)
const GuestModeContext = React.createContext<{ goOnline: () => void; isOfflineOnly: boolean } | null>(null);
export const useGuestMode = () => React.useContext(GuestModeContext);

// Root App Component
function App() {
  // PWA update handling moved to main.tsx (no hook usage here)

  return (
    <ToastProvider>
      <AuthProvider>
        {/* No custom update banner: manual reload activates latest SW (skipWaiting+clientsClaim) */}
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
