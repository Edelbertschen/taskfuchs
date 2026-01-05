import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MarkdownRenderer } from '../Common/MarkdownRenderer';
import { 
  Plus, Check, Archive, Inbox, Sun, Sparkles, Filter, Undo2,
  GripVertical, LogOut, RefreshCw, X, ChevronRight, ChevronLeft,
  FileText, ListChecks, Zap, Heart, Eye, EyeOff, Tag, Pin,
  Mic, MicOff, Timer, Play, Pause, RotateCcw, Calendar, ArrowRight,
  Flag, AlertCircle, Circle, Target, Send, Wand2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LoginPage } from '../Auth/LoginPage';
import { syncAPI, aiAPI } from '../../services/apiService';
import type { Task } from '../../types';
import { format, addDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds for better sync

type MainView = 'planner' | 'pins';
type PlannerSubView = 'today' | 'inbox';

const ONBOARDING_KEY = 'taskfuchs_mobile_onboarding_done';

interface UndoState {
  task: Task;
  action: 'complete-archive' | 'delete';
  timeoutId: NodeJS.Timeout;
}

export function MobileShell() {
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Core state
  const [mainView, setMainView] = useState<MainView>('planner');
  const [plannerSubView, setPlannerSubView] = useState<PlannerSubView>('today');
  const [pinsColumnIndex, setPinsColumnIndex] = useState(0);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);
  
  // Long-Press Context Menu
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  
  // Focus Mode
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusTimerSeconds, setFocusTimerSeconds] = useState(25 * 60); // 25 min default
  const [focusTimerRunning, setFocusTimerRunning] = useState(false);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI Voice/Text Input
  const [isRecording, setIsRecording] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiInputMode, setAiInputMode] = useState<'text' | 'voice'>('text');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Column swipe state
  const [columnSwipeOffset, setColumnSwipeOffset] = useState(0);
  const [swipeThresholdReached, setSwipeThresholdReached] = useState(false);
  const columnSwipeStartX = useRef<number | null>(null);
  const isColumnSwiping = useRef(false);
  const hasVibratedThreshold = useRef(false);
  const pinsTabsRef = useRef<HTMLDivElement>(null);
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef<number | null>(null);
  
  // Landscape detection
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Pin columns - moved up to avoid TDZ (temporal dead zone) error
  const pinColumns = useMemo(() => 
    [...(state.pinColumns || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [state.pinColumns]
  );
  
  // Auto-scroll pins tabs to show active column
  useEffect(() => {
    if (mainView === 'pins' && pinsTabsRef.current && pinColumns.length > 0) {
      const container = pinsTabsRef.current;
      const tabWidth = container.scrollWidth / pinColumns.length;
      const scrollTo = Math.max(0, (pinsColumnIndex - 0.5) * tabWidth);
      container.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, [pinsColumnIndex, mainView, pinColumns.length]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Animations
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);
  const [deletedAnimation, setDeletedAnimation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Undo state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);

  // DnD State - Global drag tracking
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragTouchY = useRef<number>(0);

  // Language & Design
  const language = state.preferences.language || 'de';
  const dateLocale = language === 'en' ? enUS : de;
  const accent = state.preferences.accentColor || '#f97316';
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const backgroundImage = state.preferences.backgroundImage;
  
  // Check onboarding on mount
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
  }, [language, i18n]);

  // Shared refresh function for pull-to-refresh and auto-refresh
  // Syncs all data silently without UI interruption
  // WICHTIG: LocalStorage wird DIREKT bereinigt um Zombie-Tasks zu verhindern
  const refreshFromServer = useCallback(async () => {
    try {
      const data = await syncAPI.getFullData();
      
      // Sync all data types for complete consistency
      // ZOMBIE-FIX: Server-Daten sind die einzige Wahrheit - localStorage sofort bereinigen
      if (data.tasks) {
        dispatch({ type: 'SET_TASKS', payload: data.tasks });
        // WICHTIG: LocalStorage SOFORT mit Server-Daten überschreiben
        localStorage.setItem('taskfuchs-tasks', JSON.stringify(data.tasks));
      }
      if (data.archivedTasks) {
        dispatch({ type: 'SET_ARCHIVED_TASKS', payload: data.archivedTasks });
        // WICHTIG: LocalStorage SOFORT mit Server-Daten überschreiben
        localStorage.setItem('taskfuchs-archived-tasks', JSON.stringify(data.archivedTasks));
      }
      if (data.columns) {
        // Merge date columns (generated) with project columns (from server)
        const projectColumns = data.columns.filter((c: any) => c.type === 'project');
        const today = new Date();
        const dateColumns = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = format(date, 'yyyy-MM-dd');
          dateColumns.push({
            id: `date-${dateStr}`,
            title: format(date, 'dd.MM.yyyy'),
            type: 'date',
            date: dateStr,
            order: i + 1,
            tasks: [],
          });
        }
        dispatch({ type: 'SET_COLUMNS', payload: [...dateColumns, ...projectColumns] });
      }
      if (data.tags) {
        dispatch({ type: 'SET_TAGS', payload: data.tags });
      }
      if (data.pinColumns) {
        dispatch({ type: 'SET_PIN_COLUMNS', payload: data.pinColumns });
      }
      if (data.preferences) {
        dispatch({ type: 'UPDATE_PREFERENCES', payload: data.preferences });
      }
      if (data.viewState) {
        dispatch({ type: 'SET_VIEW_STATE', payload: data.viewState });
      }
      return true;
    } catch (error) {
      console.error('[MobileShell] Refresh failed:', error);
      return false;
    }
  }, [dispatch]);

  // Auto-refresh: Fetch fresh data from server every 30 seconds
  // This ensures Mobile stays in sync with Desktop changes
  useEffect(() => {
    const hasToken = !!localStorage.getItem('taskfuchs_jwt');
    if (!hasToken) return; // Only refresh if logged in
    
    // Periodic refresh every 30 seconds
    const interval = setInterval(refreshFromServer, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [refreshFromServer]);

  useEffect(() => {
    if (!undoState) { setUndoProgress(100); return; }
    const startTime = Date.now();
    const interval = setInterval(() => {
      const remaining = Math.max(0, 100 - ((Date.now() - startTime) / 5000) * 100);
      setUndoProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [undoState]);

  useEffect(() => {
    if (isAddingTask && inputRef.current) inputRef.current.focus();
  }, [isAddingTask]);

  // Data - ALWAYS use state.tasks from AppContext (same as Desktop)
  // This ensures Mobile and Desktop always show identical data
  const tasks = state.tasks;
  const hasToken = !!localStorage.getItem('taskfuchs_jwt');
  const isLoggedIn = authState.isOnlineMode || hasToken;
  
  // No offline mode - always use live data from server
  const isOffline = false;
  const todayId = `date-${format(new Date(), 'yyyy-MM-dd')}`;
  const activeTagFilters = state.activeTagFilters || [];
  const activePriorityFilters = state.activePriorityFilters || [];
  const showCompletedTasks = state.showCompletedTasks;
  const hasActiveFilters = activeTagFilters.length > 0 || activePriorityFilters.length > 0;

  const applyFilters = useCallback((taskList: Task[]) => {
    return taskList.filter(task => {
      if (!showCompletedTasks && task.completed) return false;
      if (task.archived) return false;
      if (activePriorityFilters.length > 0 && !activePriorityFilters.includes(task.priority || 'none')) return false;
      if (activeTagFilters.length > 0 && !activeTagFilters.some(tag => task.tags.includes(tag))) return false;
      return true;
    });
  }, [activeTagFilters, activePriorityFilters, showCompletedTasks]);

  // Planner tasks
  const todayTasks = applyFilters(tasks.filter(t => t.columnId === todayId))
    .sort((a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : (a.position || 0) - (b.position || 0)));
  const inboxTasks = applyFilters(tasks.filter(t => t.columnId === 'inbox'))
    .sort((a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : (a.position || 0) - (b.position || 0)));
  const todayCount = todayTasks.filter(t => !t.completed).length;
  const inboxCount = inboxTasks.filter(t => !t.completed).length;
  
  // Pin columns tasks
  const currentPinColumn = pinColumns[pinsColumnIndex];
  const pinTasks = useMemo(() => {
    if (!currentPinColumn) return [];
    return applyFilters(tasks.filter(t => t.pinColumnId === currentPinColumn.id))
      .sort((a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : (a.position || 0) - (b.position || 0)));
  }, [currentPinColumn, tasks, applyFilters]);
  
  // Current tasks based on active view
  const currentTasks = useMemo(() => {
    if (mainView === 'planner') {
      return plannerSubView === 'today' ? todayTasks : inboxTasks;
    } else {
      return pinTasks;
    }
  }, [mainView, plannerSubView, todayTasks, inboxTasks, pinTasks]);
  
  // Get current column name for display (sub-column within Pins)
  const currentPinColumnName = currentPinColumn?.title || '';

  // Column swipe handlers (for Planner Heute/Inbox and Pins)
  const SWIPE_THRESHOLD = 80; // Swipe threshold in pixels
  
  const handleColumnSwipeStart = (e: React.TouchEvent) => {
    columnSwipeStartX.current = e.touches[0].clientX;
    isColumnSwiping.current = false;
    hasVibratedThreshold.current = false;
    setSwipeThresholdReached(false);
  };
  
  const handleColumnSwipeMove = (e: React.TouchEvent) => {
    if (columnSwipeStartX.current === null) return;
    const deltaX = e.touches[0].clientX - columnSwipeStartX.current;
    
    // Only activate column swiping after 10px horizontal movement
    if (Math.abs(deltaX) > 10) {
      isColumnSwiping.current = true;
      setColumnSwipeOffset(deltaX);
      
      // Scroll pins tabs during swipe to preview next/previous column
      if (mainView === 'pins' && pinsTabsRef.current && pinColumns.length > 0) {
        const container = pinsTabsRef.current;
        const tabWidth = container.scrollWidth / pinColumns.length;
        const baseScroll = Math.max(0, (pinsColumnIndex - 0.5) * tabWidth);
        // Invert deltaX because swiping right means showing previous column (scroll left)
        const swipeScroll = baseScroll - (deltaX * 0.5);
        container.scrollLeft = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, swipeScroll));
      }
      
      // Check if we can swipe in this direction
      const canSwipeRight = (mainView === 'planner' && plannerSubView === 'inbox') || 
                            (mainView === 'pins' && pinsColumnIndex > 0);
      const canSwipeLeft = (mainView === 'planner' && plannerSubView === 'today') || 
                           (mainView === 'pins' && pinsColumnIndex < pinColumns.length - 1);
      
      // Threshold reached - haptic feedback once
      const thresholdReached = (deltaX > SWIPE_THRESHOLD && canSwipeRight) || 
                               (deltaX < -SWIPE_THRESHOLD && canSwipeLeft);
      
      if (thresholdReached && !hasVibratedThreshold.current) {
        hasVibratedThreshold.current = true;
        setSwipeThresholdReached(true);
        if ('vibrate' in navigator) navigator.vibrate(15); // Light haptic when threshold reached
      } else if (!thresholdReached && hasVibratedThreshold.current) {
        hasVibratedThreshold.current = false;
        setSwipeThresholdReached(false);
      }
    }
  };
  
  const handleColumnSwipeEnd = () => {
    if (!isColumnSwiping.current) {
      columnSwipeStartX.current = null;
      setColumnSwipeOffset(0);
      setSwipeThresholdReached(false);
      return;
    }
    
    let didSwitch = false;
    
    if (mainView === 'planner') {
      // Swipe between Heute and Inbox
      if (columnSwipeOffset > SWIPE_THRESHOLD && plannerSubView === 'inbox') {
        setPlannerSubView('today');
        didSwitch = true;
      } else if (columnSwipeOffset < -SWIPE_THRESHOLD && plannerSubView === 'today') {
        setPlannerSubView('inbox');
        didSwitch = true;
      }
    } else if (mainView === 'pins') {
      if (columnSwipeOffset > SWIPE_THRESHOLD && pinsColumnIndex > 0) {
        setPinsColumnIndex(prev => prev - 1);
        didSwitch = true;
      } else if (columnSwipeOffset < -SWIPE_THRESHOLD && pinsColumnIndex < pinColumns.length - 1) {
        setPinsColumnIndex(prev => prev + 1);
        didSwitch = true;
      }
    }
    
    // Strong haptic feedback on successful column switch
    if (didSwitch && 'vibrate' in navigator) {
      navigator.vibrate([20, 30, 20]); // Double pulse
    }
    
    columnSwipeStartX.current = null;
    isColumnSwiping.current = false;
    hasVibratedThreshold.current = false;
    setColumnSwipeOffset(0);
    setSwipeThresholdReached(false);
  };

  // Pull-to-refresh handlers
  const handlePullStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (!isPulling || pullStartY.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
    }
  };

  const handlePullEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      if ('vibrate' in navigator) navigator.vibrate(20);
      
      // Refresh data - activeView stays the same (local state)
      await refreshFromServer();
      
      // Brief delay for smooth animation
      await new Promise(r => setTimeout(r, 300));
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setIsPulling(false);
    pullStartY.current = null;
  };

  // Handlers
  const handleLogout = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    logout();
    setShowLogoutConfirm(false);
    // Reload to show login screen
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [logout]);

  const handleAddTask = useCallback(() => {
    if (!newTaskText.trim() || isOffline) return;
    
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const isToday = plannerSubView === 'today';
    
    // Apply active filters to new task
    const filterTags = activeTagFilters || [];
    const filterPriorities = activePriorityFilters || [];
    const finalPriority = filterPriorities.length === 1 ? filterPriorities[0] as Task['priority'] : undefined;
    
    const newTask: Task = {
      id: `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTaskText.trim(),
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: isToday ? `date-${todayDate}` : 'inbox',
      // Set reminderDate for "Today" tasks so they show the date
      reminderDate: isToday ? todayDate : undefined,
      tags: filterTags, // Apply active tag filters
      subtasks: [],
      priority: finalPriority, // Apply priority filter if exactly one is active
      position: Date.now(),
    };
    
    dispatch({ type: 'ADD_TASK', payload: newTask });
    if (isToday) {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: todayDate });
    }
    setNewTaskText('');
    setIsAddingTask(false);
    if ('vibrate' in navigator) navigator.vibrate(10);
  }, [newTaskText, plannerSubView, dispatch, isOffline, activeTagFilters, activePriorityFilters]);

  // Swipe right: Complete + Archive with 5s undo
  const handleCompleteTask = useCallback((taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isOffline) return;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (undoState) clearTimeout(undoState.timeoutId);
    setCompletedAnimation(taskId);
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 20]);
    setTimeout(() => {
      // Complete AND archive the task
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: true, archived: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      });
      const timeoutId = setTimeout(() => setUndoState(null), 5000);
      setUndoState({ task, action: 'complete-archive', timeoutId });
      setCompletedAnimation(null);
    }, 250);
  }, [state.tasks, dispatch, isOffline, undoState]);

  // Swipe left: Delete without archiving, with 5s undo
  const handleDeleteTask = useCallback((taskId: string) => {
    if (isOffline) return;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (undoState) clearTimeout(undoState.timeoutId);
    setDeletedAnimation(taskId);
    if ('vibrate' in navigator) navigator.vibrate(15);
    setTimeout(() => {
      // Remove the task completely (not archive)
      dispatch({ type: 'DELETE_TASK', payload: taskId });
      const timeoutId = setTimeout(() => setUndoState(null), 5000);
      setUndoState({ task, action: 'delete', timeoutId });
      setDeletedAnimation(null);
    }, 250);
  }, [state.tasks, dispatch, isOffline, undoState]);

  const handleUndo = useCallback(() => {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    if (undoState.action === 'complete-archive') {
      // Restore: uncomplete and unarchive
      dispatch({ type: 'UPDATE_TASK', payload: { ...undoState.task, completed: false, archived: false, completedAt: undefined, updatedAt: new Date().toISOString() } });
    } else if (undoState.action === 'delete') {
      // Restore: add the task back
      dispatch({ type: 'ADD_TASK', payload: { ...undoState.task, updatedAt: new Date().toISOString() } });
    }
    if ('vibrate' in navigator) navigator.vibrate(10);
    setUndoState(null);
  }, [undoState, dispatch]);

  // Find which task is under the touch point
  const findTaskAtPosition = useCallback((y: number): string | null => {
    for (const [taskId, element] of taskRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return taskId;
      }
    }
    return null;
  }, []);

  const handleDragStart = useCallback((taskId: string, touchY: number) => {
    setDraggedTaskId(taskId);
    dragTouchY.current = touchY;
    if ('vibrate' in navigator) navigator.vibrate(20);
  }, []);

  const handleDragMove = useCallback((touchY: number) => {
    if (!draggedTaskId) return;
    dragTouchY.current = touchY;
    const taskUnderFinger = findTaskAtPosition(touchY);
    if (taskUnderFinger && taskUnderFinger !== draggedTaskId) {
      setDragOverTaskId(taskUnderFinger);
    }
  }, [draggedTaskId, findTaskAtPosition]);

  const handleDragEnd = useCallback(() => {
    if (!draggedTaskId || !dragOverTaskId) { 
      setDraggedTaskId(null); 
      setDragOverTaskId(null); 
      return; 
    }
    
    const draggedTask = state.tasks.find(t => t.id === draggedTaskId);
    const targetTask = state.tasks.find(t => t.id === dragOverTaskId);
    
    if (draggedTask && targetTask) {
      // Swap positions
      const draggedPos = draggedTask.position || 0;
      const targetPos = targetTask.position || 0;
      
      dispatch({ 
        type: 'UPDATE_TASK', 
        payload: { ...draggedTask, position: targetPos, updatedAt: new Date().toISOString() } 
      });
      dispatch({ 
        type: 'UPDATE_TASK', 
        payload: { ...targetTask, position: draggedPos, updatedAt: new Date().toISOString() } 
      });
      
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
    
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  }, [draggedTaskId, dragOverTaskId, state.tasks, dispatch]);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) { case 'high': return '#ef4444'; case 'medium': return '#f59e0b'; case 'low': return '#3b82f6'; default: return 'transparent'; }
  };

  // Background position based on view
  const bgPosition = useMemo(() => {
    if (mainView === 'planner') {
      return plannerSubView === 'today' ? 'left center' : 'right center';
    } else {
      const total = Math.max(pinColumns.length - 1, 1);
      const percent = (pinsColumnIndex / total) * 100;
      return `${percent}% center`;
    }
  }, [mainView, plannerSubView, pinsColumnIndex, pinColumns.length]);

  // Handler for toggling subtasks - must be before early returns
  const handleToggleSubtask = useCallback((subtaskId: string) => {
    if (!selectedTask || isOffline) return;
    const updatedSubtasks = selectedTask.subtasks?.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed, updatedAt: new Date().toISOString() } : s
    );
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    setSelectedTask(updatedTask); // Update local state so UI updates immediately
    if ('vibrate' in navigator) navigator.vibrate(10);
  }, [selectedTask, dispatch, isOffline]);

  // ===== LONG-PRESS CONTEXT MENU HANDLERS =====
  const handleLongPress = useCallback((task: Task) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    setContextMenuTask(task);
  }, []);

  const handleSetPriority = useCallback((priority: 'high' | 'medium' | 'low' | 'none') => {
    if (!contextMenuTask) return;
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { ...contextMenuTask, priority: priority === 'none' ? undefined : priority, updatedAt: new Date().toISOString() } 
    });
    if ('vibrate' in navigator) navigator.vibrate(10);
    setContextMenuTask(null);
  }, [contextMenuTask, dispatch]);

  const handleMoveToTomorrow = useCallback(() => {
    if (!contextMenuTask) return;
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { ...contextMenuTask, columnId: `date-${tomorrow}`, reminderDate: tomorrow, updatedAt: new Date().toISOString() } 
    });
    dispatch({ type: 'ENSURE_DATE_COLUMN', payload: tomorrow });
    if ('vibrate' in navigator) navigator.vibrate(10);
    setContextMenuTask(null);
  }, [contextMenuTask, dispatch]);

  const handleAddToPin = useCallback((pinColumnId: string) => {
    if (!contextMenuTask) return;
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { ...contextMenuTask, pinColumnId, updatedAt: new Date().toISOString() } 
    });
    if ('vibrate' in navigator) navigator.vibrate(10);
    setContextMenuTask(null);
  }, [contextMenuTask, dispatch]);

  // ===== FOCUS MODE HANDLERS =====
  const startFocusMode = useCallback((task: Task) => {
    setFocusTask(task);
    setFocusTimerSeconds(25 * 60);
    setFocusTimerRunning(false);
    setContextMenuTask(null);
    if ('vibrate' in navigator) navigator.vibrate(20);
  }, []);

  const toggleFocusTimer = useCallback(() => {
    if (focusTimerRunning) {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
      setFocusTimerRunning(false);
    } else {
      focusTimerRef.current = setInterval(() => {
        setFocusTimerSeconds(prev => {
          if (prev <= 1) {
            if (focusTimerRef.current) clearInterval(focusTimerRef.current);
            setFocusTimerRunning(false);
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 100]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setFocusTimerRunning(true);
    }
  }, [focusTimerRunning]);

  const resetFocusTimer = useCallback(() => {
    if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    setFocusTimerRunning(false);
    setFocusTimerSeconds(25 * 60);
  }, []);

  const completeFocusTask = useCallback(() => {
    if (!focusTask) return;
    handleCompleteTask(focusTask.id);
    setFocusTask(null);
  }, [focusTask, handleCompleteTask]);

  // Cleanup focus timer on unmount
  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, []);

  // ===== AI VOICE/TEXT INPUT HANDLERS =====
  const handleAITextSubmit = useCallback(async () => {
    if (!newTaskText.trim() || isAIProcessing || isOffline) return;
    
    setIsAIProcessing(true);
    try {
      // Try AI parsing first
      const projects = state.columns.filter(c => c.type === 'project').map(c => c.title);
      const tags = state.tags.map(t => t.name);
      
      const response = await aiAPI.parseTask(newTaskText.trim(), { projects, tags });
      const parsed = response.parsed;
      
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      let columnId = plannerSubView === 'today' ? `date-${todayDate}` : 'inbox';
      let reminderDate: string | undefined;
      
      if (parsed.dueDate) {
        const date = new Date(parsed.dueDate);
        reminderDate = format(date, 'yyyy-MM-dd');
        columnId = `date-${reminderDate}`;
      }
      
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: parsed.title || newTaskText.trim(),
        description: parsed.description || '',
        completed: false,
        archived: false,
        tags: parsed.tags || [],
        subtasks: [],
        columnId,
        reminderDate,
        priority: parsed.priority as any,
        estimatedTime: parsed.duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: Date.now(),
      };
      
      dispatch({ type: 'ADD_TASK', payload: newTask });
      if (reminderDate) {
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: reminderDate });
      }
      
      setNewTaskText('');
      setIsAddingTask(false);
      if ('vibrate' in navigator) navigator.vibrate([10, 30, 10]);
    } catch (error) {
      console.error('AI parsing failed, using fallback:', error);
      // Fallback: Create task with original text
      handleAddTask();
    } finally {
      setIsAIProcessing(false);
    }
  }, [newTaskText, isAIProcessing, isOffline, state.columns, state.tags, plannerSubView, dispatch, handleAddTask]);

  // Speech Recognition reference
  const speechRecognitionRef = useRef<any>(null);

  const startVoiceRecording = useCallback(async () => {
    // Use Web Speech API directly - much simpler and works on iOS/Android
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      alert('Spracherkennung wird in diesem Browser nicht unterstützt. Bitte verwende Chrome, Safari oder Edge.');
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      speechRecognitionRef.current = recognition;
      
      recognition.lang = state.preferences.language === 'en' ? 'en-US' : 'de-DE';
      recognition.interimResults = true; // Show interim results while speaking
      recognition.continuous = true; // Keep listening until stopped
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsRecording(true);
        if ('vibrate' in navigator) navigator.vibrate(20);
      };
      
      recognition.onresult = (event: any) => {
        // Get the latest transcript
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update text field with what user is saying
        if (finalTranscript) {
          setNewTaskText(prev => (prev + ' ' + finalTranscript).trim());
        } else if (interimTranscript) {
          // Show interim results in placeholder or append temporarily
          setNewTaskText(prev => {
            const base = prev.replace(/\s*\[.*\]$/, ''); // Remove previous interim
            return base ? `${base} [${interimTranscript}]` : `[${interimTranscript}]`;
          });
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'not-allowed') {
          alert('Mikrofonzugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
        }
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        // Clean up interim markers
        setNewTaskText(prev => prev.replace(/\s*\[.*\]$/, '').trim());
        if ('vibrate' in navigator) navigator.vibrate(10);
      };
      
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Spracherkennung konnte nicht gestartet werden.');
    }
  }, [state.preferences.language]);

  const stopVoiceRecording = useCallback(() => {
    if (speechRecognitionRef.current && isRecording) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  }, [isRecording]);

  // Onboarding Screen
  if (showOnboarding) {
    return <OnboardingScreen step={onboardingStep} setStep={setOnboardingStep} onFinish={finishOnboarding} accent={accent} isDarkMode={isDarkMode} />;
  }

  // Not logged in - show the same login page as desktop
  if (!isLoggedIn && !isOffline) {
    return <LoginPage />;
  }

  // Focus Mode - Full screen task focus with timer
  if (focusTask) {
    return (
      <FocusModeView 
        task={focusTask} 
        onClose={() => { if (focusTimerRef.current) clearInterval(focusTimerRef.current); setFocusTask(null); setFocusTimerRunning(false); }}
        onComplete={completeFocusTask}
        accent={accent}
        isDarkMode={isDarkMode}
        timerSeconds={focusTimerSeconds}
        timerRunning={focusTimerRunning}
        onToggleTimer={toggleFocusTimer}
        onResetTimer={resetFocusTimer}
        onToggleSubtask={(subtaskId) => {
          if (!focusTask) return;
          const updatedSubtasks = focusTask.subtasks?.map(s => 
            s.id === subtaskId ? { ...s, completed: !s.completed, updatedAt: new Date().toISOString() } : s
          );
          const updatedTask = { ...focusTask, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
          dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
          setFocusTask(updatedTask);
          if ('vibrate' in navigator) navigator.vibrate(10);
        }}
      />
    );
  }

  // Task Detail View
  if (selectedTask) {
    return <TaskDetailView task={selectedTask} onClose={() => setSelectedTask(null)} accent={accent} isDarkMode={isDarkMode} onComplete={() => handleCompleteTask(selectedTask.id)} isOffline={isOffline} onToggleSubtask={handleToggleSubtask} />;
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
      {backgroundImage && (
        <div className="absolute inset-0 transition-all duration-500" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
      )}
      <div className="absolute inset-0 pointer-events-none" style={{ background: isDarkMode ? 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85))' : 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.8))' }} />

      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center z-20 transition-all duration-200"
        style={{ 
          top: `calc(max(env(safe-area-inset-top, 20px), 48px) + ${Math.min(pullDistance, 60)}px)`,
          opacity: pullDistance > 20 ? 1 : 0,
          transform: `scale(${Math.min(pullDistance / 60, 1)})`,
        }}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`} style={{ backgroundColor: accent }}>
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Header - with proper iOS safe area for notch/dynamic island */}
      <header 
        className="relative z-10 flex-shrink-0" 
        style={{ 
          paddingTop: isLandscape ? 'max(env(safe-area-inset-top, 8px), 16px)' : 'max(env(safe-area-inset-top, 20px), 48px)', 
          transform: `translateY(${pullDistance * 0.3}px)` 
        }}
      >
        {/* Row 1: Title + Action buttons */}
        <div className={`px-4 ${isLandscape ? 'pt-1 pb-0.5' : 'pt-2 pb-1'}`}>
          <div className="flex items-center justify-between">
            {/* Left: Title + Date */}
            <div className="flex items-baseline gap-2">
              <h1 className={`${isLandscape ? 'text-base' : 'text-lg'} font-bold`} style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                {mainView === 'planner' ? t('mobile.planner', 'Planer') : t('mobile.pins', 'Pins')}
              </h1>
              {mainView === 'planner' && plannerSubView === 'today' && (
                <span className="text-xs font-medium" style={{ color: accent }}>
                  {format(new Date(), isLandscape ? 'd. MMM' : 'EEE, d. MMM', { locale: dateLocale })}
                </span>
              )}
            </div>
            
            {/* Right: All action buttons - uniformly sized and centered */}
            <div className="flex items-center gap-1.5">
              {/* Tag filter */}
              <button 
                onClick={() => setShowTagFilter(!showTagFilter)} 
                className="w-9 h-9 flex items-center justify-center rounded-xl relative active:scale-95 transition-transform"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <Tag className="w-4 h-4" style={{ color: activeTagFilters.length > 0 ? accent : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }} />
                {activeTagFilters.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: accent }}>
                    {activeTagFilters.length}
                  </span>
                )}
              </button>
              {/* Toggle completed tasks */}
              <button 
                onClick={() => dispatch({ type: 'TOGGLE_SHOW_COMPLETED_TASKS' })} 
                className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                {showCompletedTasks ? (
                  <Eye className="w-4 h-4" style={{ color: accent }} />
                ) : (
                  <EyeOff className="w-4 h-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} />
                )}
              </button>
              {/* Logout */}
              <button 
                onClick={() => setShowLogoutConfirm(true)} 
                className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <LogOut className="w-4 h-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
              </button>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Filter className="w-3 h-3" style={{ color: accent }} />
              {activePriorityFilters.map(p => <span key={p} className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(p) }} />)}
            </div>
          )}
        </div>
        
        {/* Row 2: Tabs */}
        <div className={`px-4 ${isLandscape ? 'py-0.5' : 'py-1'}`}>
          {mainView === 'planner' ? (
            // Planner: Heute / Inbox tabs
            <div 
              className={`flex rounded-xl p-1 gap-1 ${isLandscape ? 'max-w-xs' : ''}`}
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
            >
              {(['today', 'inbox'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setPlannerSubView(v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 ${isLandscape ? 'py-1.5 px-2 text-xs' : 'py-2 px-3 text-sm'} rounded-lg font-semibold transition-all`}
                  style={{
                    backgroundColor: plannerSubView === v ? accent : 'transparent',
                    color: plannerSubView === v ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'),
                  }}
                >
                  {v === 'today' ? <Sun className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                  <span>{v === 'today' ? t('mobile.today', 'Heute') : t('mobile.inbox', 'Inbox')}</span>
                  {(v === 'today' ? todayCount : inboxCount) > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: plannerSubView === v ? 'rgba(255,255,255,0.25)' : `${accent}30`, color: plannerSubView === v ? '#fff' : accent }}>
                      {v === 'today' ? todayCount : inboxCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : pinColumns.length > 0 ? (
            // Pins: Column tabs - 2 visible, horizontal scroll, moves with swipe
            <div 
              ref={pinsTabsRef}
              className="flex rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar scroll-smooth" 
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              }}
              onScroll={(e) => {
                // Prevent default scroll behavior during swipe
                if (isColumnSwiping.current) {
                  e.preventDefault();
                }
              }}
            >
              {pinColumns.map((col, i) => (
                <button
                  key={col.id}
                  onClick={() => {
                    setPinsColumnIndex(i);
                    if ('vibrate' in navigator) navigator.vibrate(10);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    // Each tab takes 50% width minus padding (for 2 visible tabs)
                    flex: '0 0 calc(50% - 2px)',
                    minWidth: 'calc(50% - 2px)',
                    backgroundColor: pinsColumnIndex === i ? accent : 'transparent',
                    color: pinsColumnIndex === i ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'),
                  }}
                >
                  {col.color && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                  )}
                  <span className="truncate">{col.title}</span>
                </button>
              ))}
            </div>
          ) : (
            // Pins: No columns
            <div 
              className="flex rounded-xl p-1" 
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
            >
              <div className="flex-1 flex items-center justify-center py-2 px-3 text-sm" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
                {t('mobile.noPins', 'Keine Pins')}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Task List with Pull-to-Refresh and Column Swipe in empty areas */}
      <div 
        ref={scrollRef}
        className={`relative z-10 flex-1 overflow-y-auto ${isLandscape ? 'px-6' : 'px-4'}`}
        style={{ 
          transform: `translateY(${pullDistance * 0.3}px)`,
          paddingBottom: isLandscape ? 'calc(100px + env(safe-area-inset-bottom, 8px))' : 'calc(140px + env(safe-area-inset-bottom, 16px))',
        }}
        onTouchStart={(e) => {
          handlePullStart(e);
          // Only start column swipe if NOT touching a task card
          const target = e.target as HTMLElement;
          if (!target.closest('[data-task-card]')) {
            handleColumnSwipeStart(e);
          }
        }}
        onTouchMove={(e) => {
          handlePullMove(e);
          // Continue column swipe if it was started
          if (isColumnSwiping.current || columnSwipeStartX.current !== null) {
            handleColumnSwipeMove(e);
          }
        }}
        onTouchEnd={() => {
          handlePullEnd();
          handleColumnSwipeEnd();
        }}
      >
        <div className={`${isLandscape ? 'space-y-1.5 max-w-2xl mx-auto' : 'space-y-2'} pt-1`}>
          {currentTasks.map((task) => (
            <div key={task.id}>
              {/* Drop indicator ABOVE this task */}
              {dragOverTaskId === task.id && draggedTaskId && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-lg" 
                    style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} 
                  />
                  <div 
                    className="flex-1 h-0.5 rounded-full" 
                    style={{ 
                      background: `linear-gradient(90deg, ${accent}, ${accent}80, ${accent})`,
                      boxShadow: `0 0 6px ${accent}60`
                    }} 
                  />
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-lg" 
                    style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} 
                  />
                </div>
              )}
              <TaskCard
                task={task}
                accent={accent}
                isDarkMode={isDarkMode}
                disabled={isOffline}
                onTap={() => setSelectedTask(task)}
                onComplete={(e) => handleCompleteTask(task.id, e)}
                onDelete={() => handleDeleteTask(task.id)}
                onLongPress={() => handleLongPress(task)}
                isCompletingAnimation={completedAnimation === task.id}
                isDeletingAnimation={deletedAnimation === task.id}
                isDragging={draggedTaskId === task.id}
                isDragOver={dragOverTaskId === task.id}
                onDragStart={(touchY) => handleDragStart(task.id, touchY)}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                getPriorityColor={getPriorityColor}
                registerRef={(el) => {
                  if (el) taskRefs.current.set(task.id, el);
                  else taskRefs.current.delete(task.id);
                }}
              />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {currentTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            {!isOffline && mainView === 'planner' && plannerSubView === 'today' && state.preferences.enableCelebration ? (
              <>
                <div className="w-28 h-28 mb-2" style={{ filter: `drop-shadow(0 0 12px ${accent}30)` }}>
                  <img src="/salto.png" alt="Done!" className="w-full h-full object-contain" style={{ animation: 'gentle-bounce 2s ease-in-out infinite' }} />
                </div>
                <p className="text-base font-semibold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  {state.preferences.celebrationText || t('mobile.allDone', 'Alles erledigt!')}
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${accent}15` }}>
                  {mainView === 'planner' && plannerSubView === 'today' && <Sparkles className="w-7 h-7" style={{ color: accent }} />}
                  {mainView === 'planner' && plannerSubView === 'inbox' && <Inbox className="w-7 h-7" style={{ color: accent }} />}
                  {mainView === 'pins' && <Pin className="w-7 h-7" style={{ color: accent }} />}
                </div>
                <p className="text-sm font-semibold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  {mainView === 'planner' && plannerSubView === 'today' && t('mobile.allDone', 'Alles erledigt!')}
                  {mainView === 'planner' && plannerSubView === 'inbox' && t('mobile.inboxEmpty', 'Inbox ist leer')}
                  {mainView === 'pins' && (pinColumns.length === 0 ? t('mobile.noPins', 'Keine Pins') : t('mobile.columnEmpty', 'Spalte ist leer'))}
                </p>
                {mainView === 'pins' && pinColumns.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {t('mobile.createPinsDesktop', 'Erstelle Pins am Desktop')}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-24 left-4 right-4 z-50 rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#fff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
          <div className="h-1" style={{ width: `${undoProgress}%`, backgroundColor: undoState.action === 'delete' ? '#ef4444' : accent, transition: 'width 100ms' }} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
              {undoState.action === 'delete' ? t('mobile.taskDeleted', 'Gelöscht') : t('mobile.taskCompleted', 'Erledigt & archiviert')}
            </span>
            <button onClick={handleUndo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: `${accent}15`, color: accent }}>
              <Undo2 className="w-4 h-4" />{t('mobile.undo', 'Rückgängig')}
            </button>
          </div>
        </div>
      )}

      {/* Tag Filter Dropdown */}
      {showTagFilter && (
        <div 
          className="fixed inset-0 flex items-start justify-end p-4"
          style={{ zIndex: 9998, paddingTop: 'calc(max(env(safe-area-inset-top, 20px), 48px) + 50px)' }}
          onClick={() => setShowTagFilter(false)}
        >
          <div 
            className="w-64 max-h-80 overflow-y-auto rounded-2xl shadow-2xl"
            style={{ 
              backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  {t('mobile.filterByTag', 'Nach Tag filtern')}
                </span>
                {activeTagFilters.length > 0 && (
                  <button 
                    onClick={() => dispatch({ type: 'CLEAR_TAG_FILTERS' })}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: `${accent}20`, color: accent }}
                  >
                    {t('mobile.clearAll', 'Alle löschen')}
                  </button>
                )}
              </div>
            </div>
            <div className="p-2">
              {state.tags.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  {t('mobile.noTags', 'Keine Tags vorhanden')}
                </p>
              ) : (
                state.tags.map(tag => {
                  const isActive = activeTagFilters.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => dispatch({ type: 'TOGGLE_TAG_FILTER', payload: tag.name })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-all"
                      style={{ 
                        backgroundColor: isActive ? `${accent}20` : 'transparent',
                      }}
                    >
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: tag.color || accent }} 
                      />
                      <span 
                        className="flex-1 text-left text-sm font-medium truncate"
                        style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
                      >
                        {tag.name}
                      </span>
                      {isActive && (
                        <Check className="w-4 h-4" style={{ color: accent }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ zIndex: 9999 }}
        >
          {/* Backdrop - clickable to close */}
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} 
            onClick={() => setShowLogoutConfirm(false)}
          />
          
          {/* Dialog */}
          <div 
            className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ 
              backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
              zIndex: 10000
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
              {t('mobile.logoutTitle', 'Abmelden?')}
            </h3>
            <p className="text-sm mb-6" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
              {t('mobile.logoutMessage', 'Du wirst zur Anmeldeseite weitergeleitet.')}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform" 
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#fff' : '#1a1a1a' }}
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button 
                onClick={handleLogout} 
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white active:scale-95 transition-transform"
              >
                {t('common.logout', 'Abmelden')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu (Long-Press) */}
      {contextMenuTask && (
        <div 
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setContextMenuTask(null)}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
          <div 
            className="relative w-full rounded-t-3xl animate-slide-up"
            style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#fff', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </div>
            
            {/* Task Title */}
            <div className="px-5 pb-4">
              <p className="text-sm font-semibold truncate" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                {contextMenuTask.title}
              </p>
            </div>
            
            {/* Priority Section */}
            <div className="px-5 pb-4">
              <p className="text-xs font-medium mb-2" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                Priorität
              </p>
              <div className="flex gap-2">
                {[
                  { key: 'high', label: 'Hoch', color: '#ef4444', icon: '🔴' },
                  { key: 'medium', label: 'Mittel', color: '#f59e0b', icon: '🟡' },
                  { key: 'low', label: 'Niedrig', color: '#3b82f6', icon: '🔵' },
                  { key: 'none', label: 'Keine', color: isDarkMode ? '#6b7280' : '#9ca3af', icon: '⚪' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleSetPriority(p.key as any)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      contextMenuTask.priority === p.key || (!contextMenuTask.priority && p.key === 'none')
                        ? 'ring-2 ring-offset-2' 
                        : ''
                    }`}
                    style={{ 
                      backgroundColor: `${p.color}20`,
                      color: p.color,
                      ringColor: p.color,
                      ringOffsetColor: isDarkMode ? '#1c1c1e' : '#fff',
                    }}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="px-5 pb-4 space-y-2">
              {/* Move to Tomorrow */}
              <button
                onClick={handleMoveToTomorrow}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
              >
                <Calendar className="w-5 h-5" style={{ color: accent }} />
                <span className="text-sm font-medium" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  Auf Morgen verschieben
                </span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-40" style={{ color: isDarkMode ? '#fff' : '#000' }} />
              </button>
              
              {/* Focus Mode */}
              <button
                onClick={() => startFocusMode(contextMenuTask)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
              >
                <Target className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                <span className="text-sm font-medium" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  Focus-Modus starten
                </span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-40" style={{ color: isDarkMode ? '#fff' : '#000' }} />
              </button>
              
              {/* Add to Pins */}
              {pinColumns.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2 px-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Zu Pin hinzufügen
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pinColumns.slice(0, 4).map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleAddToPin(col.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                          contextMenuTask.pinColumnId === col.id ? 'ring-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: contextMenuTask.pinColumnId === col.id ? `${accent}30` : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                          color: isDarkMode ? '#fff' : '#1a1a1a',
                          ringColor: accent,
                        }}
                      >
                        <Pin className="w-3 h-3 inline mr-1.5" style={{ color: accent }} />
                        {col.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Cancel Button */}
            <div className="px-5 pb-2">
              <button
                onClick={() => setContextMenuTask(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDarkMode ? '#fff' : '#1a1a1a' }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Sheet with AI */}
      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={(e) => { if (e.target === e.currentTarget) { setIsAddingTask(false); setNewTaskText(''); } }}>
          <div className="absolute inset-0" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
          <div className="relative w-full rounded-t-2xl animate-slide-up" style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#fff', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <div className="flex justify-center py-2"><div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} /></div>
            
            {/* AI Badge */}
            <div className="flex items-center justify-center gap-2 pb-2">
              <Wand2 className="w-4 h-4" style={{ color: accent }} />
              <span className="text-xs font-medium" style={{ color: accent }}>KI-Erfassung aktiv</span>
            </div>
            
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                {/* Voice Recording Button */}
                <button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRecording ? 'animate-pulse' : 'active:scale-95'}`}
                  style={{ 
                    backgroundColor: isRecording ? '#ef4444' : `${accent}20`,
                  }}
                >
                  {isRecording ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5" style={{ color: accent }} />
                  )}
                </button>
                
                <input 
                  ref={inputRef} 
                  type="text" 
                  value={newTaskText} 
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') handleAITextSubmit(); 
                    if (e.key === 'Escape') { setIsAddingTask(false); setNewTaskText(''); } 
                  }}
                  placeholder={isRecording ? 'Spreche jetzt...' : 'z.B. "Meeting morgen 14 Uhr hohe Prio"'}
                  className="flex-1 text-base bg-transparent border-none outline-none" 
                  style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }} 
                  autoFocus 
                  disabled={isRecording}
                />
              </div>
              
              {/* Hint */}
              <p className="text-xs mt-2 px-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                💡 Die KI erkennt automatisch Datum, Priorität und Dauer
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  {plannerSubView === 'today' ? `📅 ${t('mobile.today', 'Heute')}` : `📥 ${t('mobile.inbox', 'Inbox')}`}
                </span>
                <div className="flex items-center gap-2">
                  {/* Cancel Button */}
                  <button 
                    onClick={() => { setIsAddingTask(false); setNewTaskText(''); if (isRecording) stopVoiceRecording(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95" 
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#fff' : '#1a1a1a' }}
                  >
                    <X className="w-4 h-4" />
                    Abbrechen
                  </button>
                  {/* Submit Button */}
                  <button 
                    onClick={handleAITextSubmit} 
                    disabled={!newTaskText.trim() || isAIProcessing} 
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all active:scale-95" 
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    {isAIProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analysiere...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Erstellen
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Zone for Column Navigation */}
      <div 
        className="fixed left-0 right-0 z-25"
        style={{ 
          bottom: isLandscape ? 'calc(44px + env(safe-area-inset-bottom, 0px))' : 'calc(56px + env(safe-area-inset-bottom, 0px))',
          height: isLandscape ? '40px' : '60px',
          background: isDarkMode 
            ? 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6), transparent)'
            : 'linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.6), transparent)',
        }}
        onTouchStart={handleColumnSwipeStart}
        onTouchMove={handleColumnSwipeMove}
        onTouchEnd={handleColumnSwipeEnd}
      >
        {/* Threshold indicator glow */}
        {swipeThresholdReached && (
          <div 
            className="absolute inset-x-0 bottom-0 h-1 transition-opacity"
            style={{ 
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              opacity: 0.8,
              boxShadow: `0 0 20px ${accent}`,
            }}
          />
        )}
        
        {/* Swipe Zone Content */}
        <div 
          className="h-full flex flex-col items-center justify-center px-4"
          style={{
            transform: `translateX(${columnSwipeOffset * 0.5}px)`,
            transition: isColumnSwiping.current ? 'none' : 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Swipe hint arrows + dots */}
          <div className="flex items-center gap-3">
            {/* Left arrow hint */}
            <div 
              className="transition-all duration-150"
              style={{ 
                transform: swipeThresholdReached && columnSwipeOffset > 0 ? 'scale(1.3) translateX(-2px)' : 'scale(1)',
                opacity: (mainView === 'planner' && plannerSubView === 'inbox') || (mainView === 'pins' && pinsColumnIndex > 0) 
                  ? (swipeThresholdReached && columnSwipeOffset > 0 ? 1 : 0.6) 
                  : 0.15,
              }}
            >
              <ChevronLeft 
                className="w-4 h-4" 
                style={{ 
                  color: accent,
                  filter: swipeThresholdReached && columnSwipeOffset > 0 ? `drop-shadow(0 0 4px ${accent})` : 'none',
                }} 
              />
            </div>
            
            {/* Pagination dots */}
            <div className="flex items-center gap-1.5">
              {mainView === 'planner' ? (
                // Planner: 2 dots (Heute, Inbox)
                (['today', 'inbox'] as const).map((v) => (
                  <div 
                    key={v}
                    className="transition-all duration-200"
                    style={{ 
                      width: plannerSubView === v ? '16px' : '6px',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: plannerSubView === v ? accent : (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'),
                      boxShadow: swipeThresholdReached && plannerSubView === v ? `0 0 8px ${accent}` : 'none',
                      transform: swipeThresholdReached ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))
              ) : (
                // Pins: dots for each column (max 7 visible)
                pinColumns.length > 0 && pinColumns.slice(
                  Math.max(0, pinsColumnIndex - 3),
                  Math.min(pinColumns.length, pinsColumnIndex + 4)
                ).map((col, displayIndex) => {
                  const actualIndex = Math.max(0, pinsColumnIndex - 3) + displayIndex;
                  return (
                    <div 
                      key={col.id}
                      className="transition-all duration-200"
                      style={{ 
                        width: pinsColumnIndex === actualIndex ? '16px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: pinsColumnIndex === actualIndex ? accent : (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'),
                        boxShadow: swipeThresholdReached && pinsColumnIndex === actualIndex ? `0 0 8px ${accent}` : 'none',
                        transform: swipeThresholdReached ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  );
                })
              )}
            </div>
            
            {/* Right arrow hint */}
            <div 
              className="transition-all duration-150"
              style={{ 
                transform: swipeThresholdReached && columnSwipeOffset < 0 ? 'scale(1.3) translateX(2px)' : 'scale(1)',
                opacity: (mainView === 'planner' && plannerSubView === 'today') || (mainView === 'pins' && pinsColumnIndex < pinColumns.length - 1) 
                  ? (swipeThresholdReached && columnSwipeOffset < 0 ? 1 : 0.6) 
                  : 0.15,
              }}
            >
              <ChevronRight 
                className="w-4 h-4" 
                style={{ 
                  color: accent,
                  filter: swipeThresholdReached && columnSwipeOffset < 0 ? `drop-shadow(0 0 4px ${accent})` : 'none',
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-30"
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: isDarkMode 
            ? 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8))'
            : 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.8))',
          backdropFilter: 'blur(20px)',
          borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <div className={`flex items-center justify-around ${isLandscape ? 'py-1' : 'py-2'}`}>
          {/* Planner Tab */}
          <button
            onClick={() => setMainView('planner')}
            className={`flex ${isLandscape ? 'flex-row gap-1.5 px-4' : 'flex-col gap-0.5 px-6'} items-center py-1 rounded-xl transition-all`}
            style={{ 
              backgroundColor: mainView === 'planner' ? `${accent}15` : 'transparent',
            }}
          >
            <Sun className={`${isLandscape ? 'w-4 h-4' : 'w-5 h-5'}`} style={{ color: mainView === 'planner' ? accent : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }} />
            <span className={`${isLandscape ? 'text-xs' : 'text-[10px]'} font-medium`} style={{ color: mainView === 'planner' ? accent : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }}>
              {t('mobile.planner', 'Planer')}
            </span>
          </button>
          
          {/* FAB - Add Task (only in Planner) */}
          {mainView === 'planner' && (
            <button 
              onClick={() => setIsAddingTask(true)}
              className={`${isLandscape ? 'w-10 h-10 -mt-3' : 'w-12 h-12 -mt-6'} rounded-full shadow-xl flex items-center justify-center active:scale-95`}
              style={{ backgroundColor: accent }}
            >
              <Plus className={`${isLandscape ? 'w-5 h-5' : 'w-6 h-6'} text-white`} strokeWidth={2.5} />
            </button>
          )}
          {mainView !== 'planner' && <div className={`${isLandscape ? 'w-10' : 'w-12'}`} />}
          
          {/* Pins Tab */}
          <button
            onClick={() => setMainView('pins')}
            className={`flex ${isLandscape ? 'flex-row gap-1.5 px-4' : 'flex-col gap-0.5 px-6'} items-center py-1 rounded-xl transition-all`}
            style={{ 
              backgroundColor: mainView === 'pins' ? `${accent}15` : 'transparent',
            }}
          >
            <Pin className={`${isLandscape ? 'w-4 h-4' : 'w-5 h-5'}`} style={{ color: mainView === 'pins' ? accent : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }} />
            <span className={`${isLandscape ? 'text-xs' : 'text-[10px]'} font-medium`} style={{ color: mainView === 'pins' ? accent : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }}>
              {t('mobile.pins', 'Pins')}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slide-out-right { to { transform: translateX(100%); opacity: 0; } }
        @keyframes slide-out-left { to { transform: translateX(-100%); opacity: 0; } }
        @keyframes gentle-bounce { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes success-pop { 
          0% { transform: scale(0); opacity: 0; } 
          50% { transform: scale(1.2); } 
          100% { transform: scale(1); opacity: 1; } 
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 250ms cubic-bezier(0.2, 0, 0, 1); }
        .animate-slide-out-right { animation: slide-out-right 250ms forwards; }
        .animate-slide-out-left { animation: slide-out-left 250ms forwards; }
        .animate-success-pop { animation: success-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-fade-in { animation: fade-in 200ms ease-out; }
      `}</style>
    </div>
  );
}

// ===== TASK CARD =====
interface TaskCardProps {
  task: Task; accent: string; isDarkMode: boolean; disabled: boolean;
  onTap: () => void; onComplete: (e?: React.MouseEvent) => void; onDelete: () => void;
  onLongPress: () => void; // NEW: Opens context menu
  isCompletingAnimation: boolean; isDeletingAnimation: boolean;
  isDragging: boolean; isDragOver: boolean;
  onDragStart: (touchY: number) => void; 
  onDragMove: (touchY: number) => void; 
  onDragEnd: () => void;
  getPriorityColor: (p: string | undefined) => string;
  registerRef: (el: HTMLDivElement | null) => void;
}

function TaskCard({ task, accent, isDarkMode, disabled, onTap, onComplete, onDelete, onLongPress, isCompletingAnimation, isDeletingAnimation, isDragging, isDragOver, onDragStart, onDragMove, onDragEnd, getPriorityColor, registerRef }: TaskCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDraggingSwipe, setIsDraggingSwipe] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isVerticalScroll = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const hasMoved = useRef(false);
  const SWIPE_THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isVerticalScroll.current = false;
    hasMoved.current = false;
    setIsDraggingSwipe(true);
    
    // Long press opens context menu (not drag)
    longPressTimer.current = setTimeout(() => { 
      setIsLongPressActive(true);
      onLongPress(); // Open context menu
    }, 400);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || touchStartX.current === null || touchStartY.current === null) return;
    hasMoved.current = true;
    
    // Cancel long press if user moves
    if (longPressTimer.current) { 
      clearTimeout(longPressTimer.current); 
      longPressTimer.current = null; 
    }
    
    // If long press was triggered, ignore swipe
    if (isLongPressActive) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX) * 0.5) { 
      isVerticalScroll.current = true; 
      return; 
    }
    if (isVerticalScroll.current) return;
    e.preventDefault();
    setSwipeOffset(Math.max(-100, Math.min(100, deltaX)));
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { 
      clearTimeout(longPressTimer.current); 
      longPressTimer.current = null; 
    }
    
    // If long press was active, just reset
    if (isLongPressActive) {
      setIsLongPressActive(false);
    } else {
      setIsDraggingSwipe(false);
      if (swipeOffset > SWIPE_THRESHOLD) onComplete();
      else if (swipeOffset < -SWIPE_THRESHOLD) onDelete();
      else if (!hasMoved.current && Math.abs(swipeOffset) < 10) onTap();
    }
    setSwipeOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const priorityColor = getPriorityColor(task.priority);
  const animationClass = isCompletingAnimation ? 'animate-slide-out-right' : isDeletingAnimation ? 'animate-slide-out-left' : '';
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

  return (
    <div 
      ref={registerRef}
      data-task-card="true"
      className={`relative overflow-hidden rounded-xl ${animationClass}`} 
      style={{ 
        opacity: isDragging ? 0.5 : 1, 
        transform: isDragOver ? 'scale(1.02) translateY(-2px)' : 'scale(1)', 
        transition: 'transform 150ms, box-shadow 150ms',
        boxShadow: isDragOver ? `0 4px 12px ${accent}40` : 'none'
      }}
    >
      {/* Swipe backgrounds - Right: Complete+Archive (green), Left: Delete (red) */}
      <div className="absolute inset-0 flex">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4" style={{ opacity: Math.min(swipeOffset / SWIPE_THRESHOLD, 1), backgroundColor: '#22c55e', width: Math.max(swipeOffset, 0) }}>
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4" style={{ opacity: Math.min(-swipeOffset / SWIPE_THRESHOLD, 1), backgroundColor: '#ef4444', width: Math.max(-swipeOffset, 0) }}>
          <X className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Card - userSelect: none prevents text selection during long-press */}
      <div className="relative rounded-xl overflow-hidden" style={{
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
        transform: `translateX(${swipeOffset}px)`,
        transition: isDraggingSwipe ? 'none' : 'transform 200ms',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {priorityColor !== 'transparent' && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: priorityColor }} />}
        <div className="flex items-center gap-2 p-2.5 pl-3">
          <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-25" style={{ color: isDarkMode ? '#fff' : '#000' }} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-tight truncate ${task.completed ? 'line-through opacity-50' : ''}`} style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>{task.title}</p>
          </div>
          {/* Right side icons - consistent height */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasSubtasks && <span className="text-xs" style={{ color: accent }}>{completedSubtasks}/{task.subtasks!.length}</span>}
            {task.description && <FileText className="w-3.5 h-3.5 opacity-40" style={{ color: isDarkMode ? '#fff' : '#000' }} />}
            <ChevronRight className="w-4 h-4 opacity-30" style={{ color: isDarkMode ? '#fff' : '#000' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TASK DETAIL VIEW =====
interface TaskDetailViewProps {
  task: Task; onClose: () => void; accent: string; isDarkMode: boolean; onComplete: () => void; isOffline: boolean;
  onToggleSubtask: (subtaskId: string) => void;
}

function TaskDetailView({ task, onClose, accent, isDarkMode, onComplete, isOffline, onToggleSubtask }: TaskDetailViewProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

  // Handle complete with animation
  const handleCompleteWithAnimation = () => {
    if (isOffline || task.completed) return;
    
    // Start animation
    setIsCompleting(true);
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 20]);
    
    // Show success state after button animation
    setTimeout(() => {
      setShowSuccess(true);
      onComplete();
      
      // Close after success animation
      setTimeout(() => {
        onClose();
      }, 600);
    }, 200);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 ${showSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`} 
      style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#fafafa' }}
    >
      {/* Success Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-green-500/20 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-success-pop shadow-2xl">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 20px), 48px) + 8px)' }}>
        <button onClick={onClose} className="p-2 -ml-2 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
          <X className="w-5 h-5" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }} />
        </button>
        <button 
          onClick={handleCompleteWithAnimation} 
          disabled={isOffline || isCompleting} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-all duration-200 ${isCompleting ? 'scale-110' : 'active:scale-95'}`}
          style={{ 
            backgroundColor: task.completed || showSuccess ? '#22c55e' : accent, 
            color: '#fff',
            boxShadow: isCompleting ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
          }}
        >
          <Check className={`w-4 h-4 transition-transform duration-200 ${isCompleting ? 'scale-125' : ''}`} />
          {task.completed ? 'Erledigt' : (isCompleting ? '✓' : 'Erledigen')}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Title */}
        <h1 className={`text-2xl font-bold leading-tight mb-6 ${task.completed ? 'line-through opacity-50' : ''}`} style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
          {task.title}
        </h1>

        {/* Description */}
        {task.description && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Beschreibung
            </h2>
            <div className="rounded-2xl p-4" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
              <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert" style={{ color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                <MarkdownRenderer content={task.description} />
              </div>
            </div>
          </div>
        )}

        {/* Subtasks */}
        {hasSubtasks && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                Unteraufgaben
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}20`, color: accent }}>
                {completedSubtasks}/{task.subtasks!.length}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(completedSubtasks / task.subtasks!.length) * 100}%`, backgroundColor: accent }} />
            </div>

            {/* Subtask list */}
            <div className="space-y-2">
              {task.subtasks!.map((subtask, index) => (
                <button 
                  key={subtask.id || index} 
                  onClick={() => subtask.id && onToggleSubtask(subtask.id)}
                  disabled={isOffline || !subtask.id}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]" 
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{ borderColor: subtask.completed ? '#22c55e' : accent, backgroundColor: subtask.completed ? '#22c55e' : 'transparent' }}>
                    {subtask.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${subtask.completed ? 'line-through opacity-50' : ''}`} style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                    {subtask.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no description and no subtasks */}
        {!task.description && !hasSubtasks && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}15` }}>
              <FileText className="w-8 h-8" style={{ color: accent }} />
            </div>
            <p className="text-sm" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Keine weiteren Details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== ONBOARDING =====
interface OnboardingScreenProps {
  step: number; setStep: (s: number) => void; onFinish: () => void; accent: string; isDarkMode: boolean;
}

function OnboardingScreen({ step, setStep, onFinish, accent, isDarkMode }: OnboardingScreenProps) {
  const steps = [
    { icon: Zap, title: 'Willkommen!', subtitle: 'TaskFuchs Companion', description: 'Deine Aufgaben immer dabei. Synchronisiert mit der Desktop-App, optimiert für unterwegs.' },
    { icon: ListChecks, title: 'Aufgaben-Gesten', subtitle: 'Schnell & Intuitiv', description: 'Wische auf Aufgaben: Rechts → Erledigt. Links → Löscht. Tippe für Details & Unteraufgaben.' },
    { icon: Pin, title: 'Spalten wechseln', subtitle: 'Swipe-Zone unten', description: 'Im unteren Bereich wischen, um zwischen Spalten zu navigieren. Punkte zeigen deine Position.' },
    { icon: Heart, title: 'Los geht\'s!', subtitle: 'Bereit', description: 'Deine Aufgaben warten. Viel Erfolg beim Produktivsein! 🦊' },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="h-[100dvh] w-full flex flex-col" style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#fafafa' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8" style={{ backgroundColor: `${accent}15` }}>
          <Icon className="w-12 h-12" style={{ color: accent }} />
        </div>

        {/* Text */}
        <p className="text-sm font-medium mb-2" style={{ color: accent }}>{current.subtitle}</p>
        <h1 className="text-3xl font-bold mb-4" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>{current.title}</h1>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
          {current.description}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 px-6 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 24px)' }}>
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all duration-300" style={{ backgroundColor: i === step ? accent : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'), transform: i === step ? 'scale(1.2)' : 'scale(1)' }} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onFinish()}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-98"
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          {step < steps.length - 1 ? 'Weiter' : 'Starten'}
        </button>

        {/* Skip */}
        {step < steps.length - 1 && (
          <button onClick={onFinish} className="w-full py-3 text-sm font-medium mt-2" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
            Überspringen
          </button>
        )}
      </div>
    </div>
  );
}

// ===== FOCUS MODE VIEW =====
interface FocusModeViewProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
  accent: string;
  isDarkMode: boolean;
  timerSeconds: number;
  timerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onToggleSubtask: (subtaskId: string) => void;
}

function FocusModeView({ task, onClose, onComplete, accent, isDarkMode, timerSeconds, timerRunning, onToggleTimer, onResetTimer, onToggleSubtask }: FocusModeViewProps) {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progress = ((25 * 60 - timerSeconds) / (25 * 60)) * 100;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{ 
        backgroundColor: isDarkMode ? '#0a0a0a' : '#fafafa',
        paddingTop: 'max(env(safe-area-inset-top, 20px), 48px)',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
      }}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-4">
        <button 
          onClick={onClose} 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
        >
          <X className="w-5 h-5" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }} />
        </button>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>Focus Mode</span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Timer Circle */}
        <div className="relative w-64 h-64 mb-8">
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="8"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke={timerRunning ? '#8b5cf6' : accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          
          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-5xl font-bold tracking-tight"
              style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
            >
              {formatTime(timerSeconds)}
            </span>
            <span 
              className="text-sm mt-2"
              style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              {timerRunning ? 'Läuft...' : 'Pausiert'}
            </span>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onResetTimer}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <RotateCcw className="w-6 h-6" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }} />
          </button>
          
          <button
            onClick={onToggleTimer}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
            style={{ 
              backgroundColor: timerRunning ? '#ef4444' : '#8b5cf6',
              boxShadow: timerRunning ? '0 0 30px rgba(239, 68, 68, 0.4)' : '0 0 30px rgba(139, 92, 246, 0.4)',
            }}
          >
            {timerRunning ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
          
          <button
            onClick={onComplete}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: '#22c55e' }}
          >
            <Check className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Task Info */}
        <div className="w-full max-w-sm px-4">
          <h1 
            className="text-xl font-bold text-center mb-4 leading-tight"
            style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
          >
            {task.title}
          </h1>
          
          {/* Subtasks */}
          {hasSubtasks && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  Unteraufgaben
                </span>
                <span className="text-xs font-semibold" style={{ color: accent }}>
                  {completedSubtasks}/{task.subtasks!.length}
                </span>
              </div>
              
              {/* Progress bar */}
              <div 
                className="h-1.5 rounded-full overflow-hidden mb-3"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(completedSubtasks / task.subtasks!.length) * 100}%`, backgroundColor: accent }}
                />
              </div>
              
              {/* Subtask list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {task.subtasks!.map((subtask, index) => (
                  <button
                    key={subtask.id || index}
                    onClick={() => subtask.id && onToggleSubtask(subtask.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all active:scale-[0.98]"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  >
                    <div 
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ 
                        borderColor: subtask.completed ? '#22c55e' : accent,
                        backgroundColor: subtask.completed ? '#22c55e' : 'transparent',
                      }}
                    >
                      {subtask.completed && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span 
                      className={`text-sm ${subtask.completed ? 'line-through opacity-50' : ''}`}
                      style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
                    >
                      {subtask.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

