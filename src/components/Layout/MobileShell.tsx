import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Check, 
  Archive, 
  Inbox, 
  Sun,
  Sparkles,
  Filter,
  WifiOff,
  Undo2,
  GripVertical,
  LogOut,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import {
  initOfflineDB,
  cacheTasks,
  getCachedTasks,
  getCacheMeta,
  formatCacheAge,
  isOnline,
  subscribeToNetworkStatus
} from '../../services/mobileOfflineStorage';

type View = 'today' | 'inbox';

interface UndoState {
  task: Task;
  action: 'archive' | 'complete';
  timeoutId: NodeJS.Timeout;
}

export function MobileShell() {
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<View>('today');
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);
  const [archivedAnimation, setArchivedAnimation] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Undo state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);

  // Offline State
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [cachedTasks, setCachedTasks] = useState<Task[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // DnD State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Language
  const language = state.preferences.language || 'de';
  const dateLocale = language === 'en' ? enUS : de;
  
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Initialize offline storage
  useEffect(() => {
    const init = async () => {
      await initOfflineDB();
      const cached = await getCachedTasks();
      const meta = await getCacheMeta();
      setCachedTasks(cached);
      if (meta) setCacheTimestamp(meta.timestamp);
    };
    init();
  }, []);

  // Cache tasks when online
  useEffect(() => {
    if (!isOffline && state.tasks.length > 0) {
      cacheTasks(state.tasks).then(() => setCacheTimestamp(Date.now()));
    }
  }, [state.tasks, isOffline]);

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if ('vibrate' in navigator) navigator.vibrate([50, 100, 50]);
    };
    const handleOffline = () => {
      setIsOffline(true);
      if ('vibrate' in navigator) navigator.vibrate(200);
    };
    return subscribeToNetworkStatus(handleOnline, handleOffline);
  }, []);

  // Undo progress animation
  useEffect(() => {
    if (!undoState) {
      setUndoProgress(100);
      return;
    }
    const startTime = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, 100 - ((Date.now() - startTime) / duration) * 100);
      setUndoProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [undoState]);

  // Use state.tasks directly - this ensures sync with desktop
  // Only fallback to cache when truly offline AND no data
  const tasks = state.tasks.length > 0 ? state.tasks : (isOffline ? cachedTasks : state.tasks);

  // Check if logged in
  const isLoggedIn = authState.isOnlineMode || state.tasks.length > 0;

  // Design Settings
  const accent = state.preferences.accentColor || '#f97316';
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const backgroundImage = state.preferences.backgroundImage;

  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  const todayId = `date-${format(new Date(), 'yyyy-MM-dd')}`;

  // Filters
  const activeTagFilters = state.activeTagFilters || [];
  const activePriorityFilters = state.activePriorityFilters || [];
  const showCompletedTasks = state.showCompletedTasks;
  const hasActiveFilters = activeTagFilters.length > 0 || activePriorityFilters.length > 0;

  const applyFilters = useCallback((taskList: Task[]) => {
    return taskList.filter(task => {
      if (!showCompletedTasks && task.completed) return false;
      if (task.archived) return false;
      if (activePriorityFilters.length > 0) {
        if (!activePriorityFilters.includes(task.priority || 'none')) return false;
      }
      if (activeTagFilters.length > 0) {
        if (!activeTagFilters.some(tag => task.tags.includes(tag))) return false;
      }
      return true;
    });
  }, [activeTagFilters, activePriorityFilters, showCompletedTasks]);

  const todayTasks = applyFilters(tasks.filter(t => t.columnId === todayId))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.position || 0) - (b.position || 0);
    });

  const inboxTasks = applyFilters(tasks.filter(t => t.columnId === 'inbox'))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.position || 0) - (b.position || 0);
    });

  const currentTasks = activeView === 'today' ? todayTasks : inboxTasks;
  const todayCount = todayTasks.filter(t => !t.completed).length;
  const inboxCount = inboxTasks.filter(t => !t.completed).length;

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if ('vibrate' in navigator) navigator.vibrate(10);
    // Trigger a re-render by waiting a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    logout();
    // Clear cached data
    setCachedTasks([]);
    setCacheTimestamp(null);
    if ('vibrate' in navigator) navigator.vibrate(20);
    // Redirect will happen automatically via App.tsx
  }, [logout]);

  // Add task
  const handleAddTask = useCallback(() => {
    if (!newTaskText.trim() || isOffline) return;
    const newTask: Task = {
      id: `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTaskText.trim(),
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: activeView === 'today' ? todayId : 'inbox',
      tags: [],
      subtasks: [],
      priority: 'medium',
      position: Date.now(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    if (activeView === 'today') {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: format(new Date(), 'yyyy-MM-dd') });
    }
    setNewTaskText('');
    setIsAddingTask(false);
    if ('vibrate' in navigator) navigator.vibrate(10);
  }, [newTaskText, activeView, todayId, dispatch, isOffline]);

  // Complete task
  const handleCompleteTask = useCallback((taskId: string) => {
    if (isOffline) return;
    setCompletedAnimation(taskId);
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 20]);
    setTimeout(() => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { 
            ...task, 
            completed: !task.completed, 
            completedAt: !task.completed ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          }
        });
      }
      setCompletedAnimation(null);
    }, 250);
  }, [state.tasks, dispatch, isOffline]);

  // Archive task with undo
  const handleArchiveTask = useCallback((taskId: string) => {
    if (isOffline) return;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (undoState) clearTimeout(undoState.timeoutId);
    setArchivedAnimation(taskId);
    if ('vibrate' in navigator) navigator.vibrate(15);
    setTimeout(() => {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, archived: true, updatedAt: new Date().toISOString() }
      });
      const timeoutId = setTimeout(() => setUndoState(null), 5000);
      setUndoState({ task, action: 'archive', timeoutId });
      setArchivedAnimation(null);
    }, 250);
  }, [state.tasks, dispatch, isOffline, undoState]);

  // Undo
  const handleUndo = useCallback(() => {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...undoState.task, archived: false, updatedAt: new Date().toISOString() }
    });
    if ('vibrate' in navigator) navigator.vibrate(10);
    setUndoState(null);
  }, [undoState, dispatch]);

  // DnD
  const handleDragStart = useCallback((taskId: string) => {
    if (isOffline) return;
    setDraggedTaskId(taskId);
    if ('vibrate' in navigator) navigator.vibrate(20);
  }, [isOffline]);

  const handleDragOver = useCallback((taskId: string) => {
    if (draggedTaskId && draggedTaskId !== taskId) setDragOverTaskId(taskId);
  }, [draggedTaskId]);

  const handleDragEnd = useCallback(() => {
    if (!draggedTaskId || !dragOverTaskId || isOffline) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const draggedTask = state.tasks.find(t => t.id === draggedTaskId);
    const targetTask = state.tasks.find(t => t.id === dragOverTaskId);
    if (draggedTask && targetTask) {
      dispatch({ type: 'UPDATE_TASK', payload: { ...draggedTask, position: targetTask.position, updatedAt: new Date().toISOString() } });
      dispatch({ type: 'UPDATE_TASK', payload: { ...targetTask, position: draggedTask.position || Date.now(), updatedAt: new Date().toISOString() } });
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  }, [draggedTaskId, dragOverTaskId, state.tasks, dispatch, isOffline]);

  // Priority color
  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return 'transparent';
    }
  };

  // Background position based on active view (parallax effect)
  const bgPosition = activeView === 'today' ? 'left center' : 'right center';

  // Not logged in state
  if (!isLoggedIn && !isOffline) {
    return (
      <div 
        className="h-[100dvh] w-full flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#fafafa' }}
      >
        <div className="w-20 h-20 mb-6">
          <img src="/foxicon-512.png" alt="TaskFuchs" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
          TaskFuchs Companion
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
          {t('mobile.loginRequired', 'Bitte melde dich zuerst im Browser an und öffne dann diese App erneut.')}
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
          <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
            {t('mobile.sessionRequired', 'Session erforderlich')}
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          <RefreshCw className="w-4 h-4" />
          {t('mobile.retry', 'Erneut versuchen')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
      {/* Background with parallax */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 transition-all duration-500 ease-out"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: bgPosition,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
      
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDarkMode 
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85))'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.8))',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-xl font-bold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                {activeView === 'today' ? t('mobile.today', 'Heute') : t('mobile.inbox', 'Inbox')}
              </h1>
              <span className="text-sm font-medium" style={{ color: accent }}>
                {activeView === 'today' ? format(new Date(), 'EEE, d. MMM', { locale: dateLocale }) : `${inboxCount}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg transition-all"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <RefreshCw 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} 
                />
              </button>
              
              {/* Offline indicator */}
              {isOffline && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <WifiOff className="w-3 h-3" style={{ color: '#f59e0b' }} />
                </div>
              )}
              
              {/* Logout button */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 rounded-lg transition-all"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <LogOut className="w-4 h-4" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
              </button>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Filter className="w-3 h-3" style={{ color: accent }} />
              {activePriorityFilters.map(p => (
                <span key={p} className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(p) }} />
              ))}
              {activeTagFilters.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs font-medium" style={{ color: accent }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tab Switcher - Better visibility */}
        <div className="px-4 py-2">
          <div 
            className="flex rounded-xl p-1 gap-1"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <button
              onClick={() => setActiveView('today')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeView === 'today' ? accent : 'transparent',
                color: activeView === 'today' ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'),
              }}
            >
              <Sun className="w-4 h-4" />
              <span>{t('mobile.today', 'Heute')}</span>
              {todayCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ backgroundColor: activeView === 'today' ? 'rgba(255,255,255,0.25)' : `${accent}30`, color: activeView === 'today' ? '#fff' : accent }}>
                  {todayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('inbox')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeView === 'inbox' ? accent : 'transparent',
                color: activeView === 'inbox' ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'),
              }}
            >
              <Inbox className="w-4 h-4" />
              <span>{t('mobile.inbox', 'Inbox')}</span>
              {inboxCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ backgroundColor: activeView === 'inbox' ? 'rgba(255,255,255,0.25)' : `${accent}30`, color: activeView === 'inbox' ? '#fff' : accent }}>
                  {inboxCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Task List */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-24">
        <div className="space-y-2 pt-1">
          {currentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              accent={accent}
              isDarkMode={isDarkMode}
              disabled={isOffline}
              onComplete={() => handleCompleteTask(task.id)}
              onArchive={() => handleArchiveTask(task.id)}
              isCompletingAnimation={completedAnimation === task.id}
              isArchivingAnimation={archivedAnimation === task.id}
              isDragging={draggedTaskId === task.id}
              isDragOver={dragOverTaskId === task.id}
              onDragStart={() => handleDragStart(task.id)}
              onDragOver={() => handleDragOver(task.id)}
              onDragEnd={handleDragEnd}
              getPriorityColor={getPriorityColor}
            />
          ))}
        </div>

        {/* Empty State */}
        {currentTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            {!isOffline && activeView === 'today' && state.preferences.enableCelebration ? (
              <>
                <div className="w-28 h-28 mb-2" style={{ filter: `drop-shadow(0 0 12px ${accent}30)` }}>
                  <img src="/salto.png" alt="All done!" className="w-full h-full object-contain" style={{ animation: 'gentle-bounce 2s ease-in-out infinite' }} />
                </div>
                <p className="text-base font-semibold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  {state.preferences.celebrationText || t('mobile.allDone', 'Alles erledigt!')}
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: isOffline ? 'rgba(245, 158, 11, 0.15)' : `${accent}15` }}>
                  {isOffline ? <WifiOff className="w-7 h-7" style={{ color: '#f59e0b' }} /> 
                    : activeView === 'today' ? <Sparkles className="w-7 h-7" style={{ color: accent }} /> 
                    : <Inbox className="w-7 h-7" style={{ color: accent }} />}
                </div>
                <p className="text-sm font-semibold" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
                  {isOffline && cachedTasks.length === 0 ? t('mobile.noOfflineData', 'Keine Offline-Daten')
                    : activeView === 'today' ? t('mobile.allDone', 'Alles erledigt!')
                    : t('mobile.inboxEmpty', 'Inbox ist leer')}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Undo Toast */}
      {undoState && (
        <div 
          className="fixed bottom-24 left-4 right-4 z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{ 
            backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <div className="h-1 transition-all duration-100" style={{ width: `${undoProgress}%`, backgroundColor: accent }} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium" style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}>
              {t('mobile.taskArchived', 'Aufgabe archiviert')}
            </span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Undo2 className="w-4 h-4" />
              {t('mobile.undo', 'Rückgängig')}
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div 
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }}
            onClick={e => e.stopPropagation()}
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
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#fff' : '#1a1a1a' }}
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white"
              >
                {t('common.logout', 'Abmelden')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Sheet */}
      {isAddingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsAddingTask(false); setNewTaskText(''); } }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
          <div className="relative w-full rounded-t-2xl overflow-hidden animate-slide-up" style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#fff', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: accent }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setIsAddingTask(false); setNewTaskText(''); } }}
                  placeholder={activeView === 'today' ? t('mobile.whatToday', 'Was steht heute an?') : t('mobile.newTask', 'Neue Aufgabe...')}
                  className="flex-1 text-base bg-transparent border-none outline-none"
                  style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  {activeView === 'today' ? `📅 ${t('mobile.today', 'Heute')}` : `📥 ${t('mobile.inbox', 'Inbox')}`}
                </span>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskText.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ backgroundColor: accent, color: '#fff' }}
                >
                  {t('mobile.add', 'Hinzufügen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => !isOffline && setIsAddingTask(true)}
        disabled={isOffline}
        className="fixed z-40 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50"
        style={{
          right: '16px',
          bottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
          backgroundColor: isOffline ? '#9ca3af' : accent,
        }}
      >
        {isOffline ? <WifiOff className="w-5 h-5 text-white" /> : <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />}
      </button>

      {/* Branding */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-1 pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 4px) + 4px)' }}>
        <span className="text-[10px]" style={{ color: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>🦊</span>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-out-right { to { transform: translateX(100%); opacity: 0; } }
        @keyframes slide-out-left { to { transform: translateX(-100%); opacity: 0; } }
        @keyframes gentle-bounce { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        .animate-slide-up { animation: slide-up 250ms cubic-bezier(0.2, 0, 0, 1); }
        .animate-slide-out-right { animation: slide-out-right 250ms cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-slide-out-left { animation: slide-out-left 250ms cubic-bezier(0.4, 0, 1, 1) forwards; }
      `}</style>
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: Task;
  accent: string;
  isDarkMode: boolean;
  disabled: boolean;
  onComplete: () => void;
  onArchive: () => void;
  isCompletingAnimation: boolean;
  isArchivingAnimation: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  getPriorityColor: (p: string | undefined) => string;
}

function TaskCard({
  task, accent, isDarkMode, disabled,
  onComplete, onArchive,
  isCompletingAnimation, isArchivingAnimation,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDragEnd,
  getPriorityColor
}: TaskCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDraggingSwipe, setIsDraggingSwipe] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isVerticalScroll = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  
  const SWIPE_THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isVerticalScroll.current = false;
    setIsDraggingSwipe(true);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      onDragStart();
      if ('vibrate' in navigator) navigator.vibrate(30);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || touchStartX.current === null || touchStartY.current === null) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
      isVerticalScroll.current = true;
      return;
    }
    if (isVerticalScroll.current) return;
    e.preventDefault();
    const maxOffset = 100;
    let offset = deltaX;
    if (Math.abs(offset) > maxOffset) offset = Math.sign(offset) * (maxOffset + (Math.abs(offset) - maxOffset) * 0.2);
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress) {
      onDragEnd();
      setIsLongPress(false);
    } else {
      setIsDraggingSwipe(false);
      if (swipeOffset > SWIPE_THRESHOLD) onComplete();
      else if (swipeOffset < -SWIPE_THRESHOLD) onArchive();
    }
    setSwipeOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const priorityColor = getPriorityColor(task.priority);
  const animationClass = isCompletingAnimation ? 'animate-slide-out-right' : isArchivingAnimation ? 'animate-slide-out-left' : '';
  const completeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);
  const archiveProgress = Math.min(-swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div 
      className={`relative overflow-hidden rounded-xl ${animationClass}`}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 150ms, opacity 150ms',
      }}
      onTouchMove={() => isLongPress && onDragOver()}
    >
      {/* Swipe Actions */}
      <div className="absolute inset-0 flex">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4" style={{ opacity: completeProgress, backgroundColor: '#22c55e', width: Math.max(swipeOffset, 0) }}>
          <Check className="w-5 h-5 text-white" style={{ transform: `scale(${0.5 + completeProgress * 0.5})` }} />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4" style={{ opacity: archiveProgress, backgroundColor: '#ef4444', width: Math.max(-swipeOffset, 0) }}>
          <Archive className="w-5 h-5 text-white" style={{ transform: `scale(${0.5 + archiveProgress * 0.5})` }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
          transform: `translateX(${swipeOffset}px)`,
          transition: isDraggingSwipe ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Priority stripe */}
        {priorityColor !== 'transparent' && (
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: priorityColor }} />
        )}
        
        <div className="flex items-center gap-2 p-2.5 pl-3">
          <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-25" style={{ color: isDarkMode ? '#fff' : '#000' }} />
          
          <button onClick={() => !disabled && onComplete()} disabled={disabled} className="flex-shrink-0">
            <div 
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              style={{ 
                borderColor: task.completed ? '#22c55e' : (disabled ? '#9ca3af' : accent),
                backgroundColor: task.completed ? '#22c55e' : 'transparent',
              }}
            >
              {task.completed && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <p 
              className={`text-sm font-medium leading-tight truncate ${task.completed ? 'line-through opacity-50' : ''}`}
              style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
            >
              {task.title}
            </p>
            {(task.tags.length > 0 || task.estimatedTime) && (
              <div className="flex items-center gap-2 mt-0.5">
                {task.estimatedTime && task.estimatedTime > 0 && (
                  <span className="text-xs" style={{ color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{task.estimatedTime}min</span>
                )}
                {task.tags.length > 0 && (
                  <span className="text-xs" style={{ color: accent }}>#{task.tags[0]}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
