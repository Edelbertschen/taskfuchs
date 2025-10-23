import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './TopTimerBar.css';
import { 
  Play, 
  Pause, 
  Square, 
  Target,
  Focus,
  Coffee,
  AlertTriangle,
  ExternalLink,
  Check,
  X,
  Loader,
  SkipForward
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { timerService } from '../../utils/timerService';
import { formatTimeWithSecondsExact } from '../../utils/timeUtils';
import { TimerWarningModal } from './TimerWarningModal';
import { playCompletionSound } from '../../utils/soundUtils';

interface TopTimerBarProps {
  onOpenTask?: (taskId: string) => void;
}

export function TopTimerBar({ onOpenTask }: TopTimerBarProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [pomodoroSession, setPomodoroSession] = useState(timerService.getGlobalPomodoroSession());
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState<'estimated' | 'pomodoro'>('estimated');
  const [lastWarningTime, setLastWarningTime] = useState<{ estimated?: number; pomodoro?: number }>({});
  
  const activeTimer = state.activeTimer;
  const isRunning = activeTimer?.isActive && !activeTimer?.isPaused;
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  // Removed focus minutes display per request
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [quickAddValue, setQuickAddValue] = useState<string>('');
  const [showSyncDetail, setShowSyncDetail] = useState<boolean>(false);

  // Update Pomodoro session state regularly
  useEffect(() => {
    const interval = setInterval(() => {
      const newSession = timerService.getGlobalPomodoroSession();
      setPomodoroSession(newSession);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Track focus minutes – increments every 60s while a timer is running
  useEffect(() => {
    const storageKeyFor = (d: Date) => `taskfuchs-focus-minutes-${d.toISOString().slice(0,10)}`;
    const readToday = () => {
      try { return parseInt(localStorage.getItem(storageKeyFor(new Date())) || '0') || 0; } catch { return 0; }
    };
    const writeToday = (v: number) => { try { localStorage.setItem(storageKeyFor(new Date()), String(v)); } catch {} };
    // no UI display needed; keep logic minimal
    if (!isRunning) return;
    const id = setInterval(() => {
      const current = readToday() + 1; // add 1 minute
      writeToday(current);
    }, 60000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Global key handler for Quick Add (q)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '') || (e.target as HTMLElement)?.getAttribute('contenteditable') === 'true';
      if (!isInput && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setShowQuickAdd(true);
        setQuickAddValue('');
      } else if (e.key === 'Escape' && showQuickAdd) {
        setShowQuickAdd(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showQuickAdd]);

  // Monitor timer warnings – mit Sound bei Überlauf (einmalig), Pomodoro-Ende: UI-Modal einmalig
  useEffect(() => {
    if (!activeTimer || !isRunning) return;

    const task = state.tasks.find(t => t.id === activeTimer.taskId);
    if (!task) return;

    // Estimated time overrun – trigger exactly once when entering overtime
    if (task.estimatedTime) {
      if (activeTimer.isOvertime && typeof lastWarningTime.estimated === 'undefined') {
        // Play warn sound once on entering overtime
        try { playCompletionSound('notice', state.preferences.soundVolume); } catch {}
        setWarningType('estimated');
        setShowWarningModal(true);
        setLastWarningTime(prev => ({ ...prev, estimated: activeTimer.elapsedTime }));
      }
      // Reset guard when back within time (e.g., after adding time or new task)
      if (!activeTimer.isOvertime && typeof lastWarningTime.estimated !== 'undefined') {
        setLastWarningTime(prev => ({ ...prev, estimated: undefined }));
      }
    }

    // Check for Pomodoro session end (only if naturally reached, not when user manually skipped)
    if (
      activeTimer?.mode === 'pomodoro' && 
      pomodoroSession && 
      pomodoroSession.sessionRemainingTime <= 0
    ) {
      // Only once per session end
      if (typeof lastWarningTime.pomodoro === 'undefined') {
        setWarningType('pomodoro');
        setShowWarningModal(true);
        setLastWarningTime(prev => ({ ...prev, pomodoro: Date.now() }));
      }
    } else if (pomodoroSession && pomodoroSession.sessionRemainingTime > 0 && typeof lastWarningTime.pomodoro !== 'undefined') {
      // Reset guard once a new session or remaining time is positive again
      setLastWarningTime(prev => ({ ...prev, pomodoro: undefined }));
    }
  }, [activeTimer, isRunning, state.tasks, pomodoroSession, lastWarningTime, state.preferences.soundVolume]);

  const hasPomodoro = !!pomodoroSession && pomodoroSession.isActive;
  // Don't render if neither task timer nor pomodoro is present
  if (!activeTimer && !hasPomodoro) {
    return null;
  }

  const formatTime = (minutes: number): string => {
    try {
      if (typeof minutes !== 'number' || isNaN(minutes)) return '0:00';
      const sign = minutes < 0 ? '-' : '';
      let totalSeconds = Math.max(0, Math.round(Math.abs(minutes) * 60));
      const hours = Math.floor(totalSeconds / 3600);
      totalSeconds = totalSeconds % 3600;
      const mins = Math.floor(totalSeconds / 60);
      // Display as h:mm or mm (no seconds, no trailing 0s like mm0)
      if (hours > 0) {
        return `${sign}${hours}:${String(mins).padStart(2, '0')}`;
      }
      return `${sign}${mins}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0:00';
    }
  };

  const formatTimeShort = (minutes: number): string => {
    try {
      if (typeof minutes !== 'number' || isNaN(minutes)) {
        return '0m';
      }
      
      const absMinutes = Math.abs(minutes);
      const hours = Math.floor(absMinutes / 60);
      const mins = Math.floor(absMinutes % 60);
      const sign = minutes < 0 ? '-' : '';
      
      if (hours > 0) {
        return `${sign}${hours}h ${mins}m`;
      }
      return `${sign}${mins}m`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0m';
    }
  };

  // Format elapsed time with seconds (hh:mm:ss or mm:ss) using shared util
  const formatTimeWithSeconds = (minutes: number): string => formatTimeWithSecondsExact(minutes);

  const getProgressPercentage = () => {
    if (!activeTimer) return 0;
    
    const totalTime = activeTimer.estimatedTime || 0;
    const elapsedTime = activeTimer.elapsedTime || 0;
    
    if (totalTime <= 0) return 0;
    
    return Math.min((elapsedTime / totalTime) * 100, 100);
  };

  // Pomodoro progress percentage (0-100)
  const getPomodoroProgress = () => {
    if (!pomodoroSession) return 0;
    const total = pomodoroSession.sessionRemainingTime + pomodoroSession.sessionElapsedTime;
    if (total <= 0) return 0;
    return Math.min(100, (pomodoroSession.sessionElapsedTime / total) * 100);
  };

  // Get Pomodoro color based on type and progress
  const getPomodoroColor = () => {
    if (!pomodoroSession) return state.preferences.accentColor;
    if (pomodoroSession.type === 'work') {
      // Work phase: Red for normal, Orange for overtime
      return pomodoroSession.sessionRemainingTime <= 0 ? '#f97316' : '#ef4444';
    } else {
      // Break phase: Green
      return '#10b981';
    }
  };

  // Helpers for tooltips
  const getPomodoroPhaseLabel = () => {
    if (!pomodoroSession) return '';
    switch (pomodoroSession.type) {
      case 'work': return 'Arbeitsphase';
      case 'shortBreak': return 'Kurze Pause';
      case 'longBreak': return 'Lange Pause';
      default: return 'Pomodoro';
    }
  };

  const getPomodoroTooltip = () => {
    if (!pomodoroSession) return '';
    return `${getPomodoroPhaseLabel()} ${formatTime(Math.max(0, pomodoroSession.sessionRemainingTime || 0))} übrig`;
  };

  // Quick Add handler
  const handleQuickAddSubmit = () => {
    const raw = quickAddValue.trim();
    if (!raw) { setShowQuickAdd(false); return; }
    // Parse tags (#tag) and priority (!h/!m/!l) and time (e.g., 30m, 1h)
    const tags = Array.from(new Set((raw.match(/#[\w-]+/g) || []).map(t => t.replace(/^#/, ''))));
    let priority: 'high'|'medium'|'low'|'none' = 'none';
    if (/!h\b/i.test(raw)) priority = 'high'; else if (/!m\b/i.test(raw)) priority = 'medium'; else if (/!l\b/i.test(raw)) priority = 'low';
    let estimatedTime = 0;
    const timeMatch = raw.match(/(\d+)(h|m)\b/i);
    if (timeMatch) {
      const val = parseInt(timeMatch[1]);
      estimatedTime = timeMatch[2].toLowerCase() === 'h' ? val * 60 : val;
    }
    const title = raw
      .replace(/#[\w-]+/g, '')
      .replace(/!([hml])\b/gi, '')
      .replace(/(\d+)(h|m)\b/i, '')
      .trim() || 'Neue Aufgabe';
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title,
      description: '',
      priority,
      estimatedTime: estimatedTime || undefined,
      tags,
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: 'inbox',
      position: 0,
      subtasks: [],
    } as any;
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setShowQuickAdd(false);
  };

  // Unified controls for Task + Pomodoro to avoid duplicate buttons
  const handleUnifiedPlayPause = () => {
    // If task timer exists, toggle it
    if (activeTimer) {
      if (isRunning) {
        dispatch({ type: 'PAUSE_TIMER' });
        if (pomodoroSession && !pomodoroSession.isPaused) {
          timerService.pausePomodoroSession();
        }
      } else {
        dispatch({ type: 'RESUME_TIMER' });
        if (pomodoroSession && pomodoroSession.isPaused) {
          timerService.resumePomodoroSession();
        }
      }
      return;
    }
    // If no task timer, control Pomodoro only
    if (pomodoroSession) {
      if (pomodoroSession.isPaused) {
        timerService.resumePomodoroSession();
      } else {
        timerService.pausePomodoroSession();
      }
    }
  };

  const handleUnifiedStop = () => {
    if (activeTimer) {
      // Stop only the task timer; keep Pomodoro running
      dispatch({ type: 'STOP_TIMER' });
      return;
    }
    // If no task timer, stop Pomodoro
    if (pomodoroSession) {
      timerService.stopPomodoroSession();
    }
  };

  const handleOpenTask = () => {
    if (activeTimer?.taskId) {
      onOpenTask?.(activeTimer.taskId);
    }
  };

  const handlePomodoroSkipOrEnd = () => {
    if (!pomodoroSession) return;
    if (pomodoroSession.type === 'work') {
      // Skip work → start break immediately (continues running)
      timerService.skipPomodoroPhase();
    } else {
      // End break → start new work session (continues running)
      timerService.endPomodoroBreak();
    }
  };

  const handleEnterFocusMode = () => {
    try {
      window.dispatchEvent(new CustomEvent('navigate-to-focus'));
    } catch {
      dispatch({ type: 'SET_FOCUS_MODE', payload: true });
    }
  };

  const task = state.tasks.find(t => t.id === activeTimer?.taskId);
  const progressPercentage = activeTimer ? getProgressPercentage() : 0;
  const isOvertime = !!activeTimer && task?.estimatedTime && activeTimer.elapsedTime > task.estimatedTime;

  return (
    <>
      <div className="relative w-full z-50 top-timer-bar" style={{ zIndex: 40 }}>
        {/* Progress Bar */}
        <div 
          className={`absolute top-0 left-0 h-0.5 timer-progress-bar ${isOvertime ? 'overtime' : ''}`}
          style={{ 
            width: `${progressPercentage}%`,
            backgroundColor: isOvertime ? '#ef4444' : state.preferences.accentColor,
            opacity: 0.8
          }}
        />
        
        {/* Timer Bar */}
        <div 
          className="w-full timer-container border-b border-gray-200 dark:border-gray-700"
          style={{
            height: '44px',
            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className="h-full flex items-center justify-center">
            <div className="max-w-4xl w-full flex items-center justify-between px-6">
            {/* Left: Task Info or Pomodoro */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {activeTimer ? (
                <>
                  <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <button
                    onClick={handleOpenTask}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:opacity-80 transition-opacity truncate"
                    style={{ color: state.preferences.accentColor }}
                  >
                    {task?.title || 'Unbekannte Aufgabe'}
                  </button>
                </>
              ) : (
                hasPomodoro && (
                  <div className="flex items-center space-x-2">
                    {pomodoroSession?.type === 'work' ? (
                      <Target className="w-3.5 h-3.5" style={{ color: state.preferences.accentColor }} />
                    ) : (
                      <Coffee className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pomodoro</span>
                  </div>
                )
              )}
            </div>

            {/* Center: Timer Display */}
            <div className="flex items-center space-x-4">
              {/* Task Timer (if present) */}
              {activeTimer ? (
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-mono font-semibold ${isOvertime ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                    {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
                  </span>
                  {activeTimer.estimatedTime && (
                    <span className="text-xs text-gray-400">
                      / {formatTimeShort(activeTimer.estimatedTime)}
                    </span>
                  )}
                  {isOvertime && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* Pomodoro Timer (always when session exists; visible even without task timer) */}
              {pomodoroSession && (
                <>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center space-x-3" title={getPomodoroTooltip()}>
                    {/* Elegant Pomodoro Progress Ring */}
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      {/* Background ring */}
                      <svg className="absolute w-full h-full" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                          strokeWidth="2"
                        />
                        {/* Progress ring */}
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke={getPomodoroColor()}
                          strokeWidth="2"
                          strokeDasharray={`${(getPomodoroProgress() / 100) * 100.53} 100.53`}
                          style={{
                            transition: 'stroke-dasharray 1s linear, stroke 0.3s ease',
                          }}
                        />
                      </svg>
                      {/* Center tomato icon */}
                      <div className="relative z-10 text-lg" style={{ opacity: 0.9 }}>
                        {pomodoroSession.type === 'work' ? '🍅' : '☕'}
                      </div>
                    </div>
                    
                    {/* Time display */}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {pomodoroSession.type === 'work' ? 'Work' : 'Break'}
                      </span>
                      <span className="text-sm font-mono font-semibold" style={{ color: getPomodoroColor() }}>
                        {formatTimeWithSecondsExact(Math.max(0, pomodoroSession.sessionRemainingTime || 0))}
                      </span>
                    </div>
                    
                    {/* Session number */}
                    <span className="text-xs px-2 py-1 rounded-full" style={{ 
                      backgroundColor: `${getPomodoroColor()}20`,
                      color: getPomodoroColor()
                    }}>
                      #{pomodoroSession.sessionNumber}
                    </span>
                    
                    {/* Skip/End button */}
                    <button
                      onClick={handlePomodoroSkipOrEnd}
                      className="ml-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-110 border"
                      style={{ backgroundColor: 'transparent', color: getPomodoroColor(), borderColor: getPomodoroColor() }}
                      title={pomodoroSession.type === 'work' ? 'Phase überspringen' : 'Pause beenden'}
                    >
                      <SkipForward className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              {/* Unified controls (Task + Pomodoro) */}
              {(activeTimer || pomodoroSession) && (
                <>
                  <button
                    onClick={handleUnifiedPlayPause}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-white shadow-sm ${!activeTimer && state.preferences?.timer?.dimControlsWhenNoTask ? 'opacity-40 pointer-events-none' : 'hover:opacity-80'}`}
                    style={{ backgroundColor: state.preferences.accentColor }}
                    title={(activeTimer ? isRunning : !(pomodoroSession && pomodoroSession.isPaused)) ? 'Pausieren' : 'Fortsetzen'}
                  >
                    {(activeTimer ? isRunning : !(pomodoroSession && pomodoroSession.isPaused)) ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={handleUnifiedStop}
                    className={`w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center transition-all duration-200 shadow-sm hover:opacity-80 hover:bg-gray-500`}
                    title={activeTimer ? 'Aufgabentimer stoppen' : 'Pomodoro beenden'}
                  >
                    <Square className="w-3 h-3" />
                  </button>
                  {/* Dedicated Pomodoro stop when both are present */}
                  {activeTimer && pomodoroSession && (
                    <button
                      onClick={() => timerService.stopPomodoroSession()}
                      className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center transition-all duration-200 shadow-sm hover:opacity-90"
                      title="Pomodoro stoppen"
                    >
                      <Square className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
              {/* Sync badge removed from header; relocated to sidebar */}
              {/* Focus minutes display removed */}
              {/* Focus Mode Button */}
              <button
                onClick={handleEnterFocusMode}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: state.preferences.accentColor, color: 'white' }}
                title={t('focus.focus_mode') || 'Fokusmodus'}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Fokus</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add overlay */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" onClick={() => setShowQuickAdd(false)}>
          <div className="rounded-lg shadow-lg border bg-white dark:bg-gray-900 dark:text-white w-full max-w-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center gap-2">
              <input
                autoFocus
                value={quickAddValue}
                onChange={e => setQuickAddValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddSubmit(); if (e.key === 'Escape') setShowQuickAdd(false); }}
                placeholder="Blitz‑Task: Titel #tag 30m !h/!m/!l"
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button className="px-3 py-1 rounded-md text-white text-sm" style={{ backgroundColor: state.preferences.accentColor }} onClick={handleQuickAddSubmit}>Anlegen</button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Warning Modal */}
      {showWarningModal && task && (
        <TimerWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          taskTitle={task.title}
          taskId={task.id}
          timeExceeded={Math.max(0, activeTimer!.elapsedTime - (task.estimatedTime || 0))}
          type={warningType}
        />
      )}
    </>
  );
} 