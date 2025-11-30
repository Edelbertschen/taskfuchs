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
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastWarningTime, setLastWarningTime] = useState<number | undefined>();
  
  const activeTimer = state.activeTimer;
  const isRunning = activeTimer?.isActive && !activeTimer?.isPaused;
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  // Removed focus minutes display per request
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [quickAddValue, setQuickAddValue] = useState<string>('');
  const [showSyncDetail, setShowSyncDetail] = useState<boolean>(false);

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

  // Monitor timer warnings – mit Sound bei Überlauf (einmalig)
  useEffect(() => {
    if (!activeTimer || !isRunning) return;

    const task = state.tasks.find(t => t.id === activeTimer.taskId);
    if (!task) return;

    // Estimated time overrun – trigger exactly once when entering overtime
    if (task.estimatedTime) {
      if (activeTimer.isOvertime && typeof lastWarningTime === 'undefined') {
        // Play warn sound once on entering overtime
        try { playCompletionSound('notice', state.preferences.soundVolume); } catch {}
        setShowWarningModal(true);
        setLastWarningTime(activeTimer.elapsedTime);
      }
      // Reset guard when back within time (e.g., after adding time or new task)
      if (!activeTimer.isOvertime && typeof lastWarningTime !== 'undefined') {
        setLastWarningTime(undefined);
      }
    }
  }, [activeTimer, isRunning, state.tasks, lastWarningTime, state.preferences.soundVolume]);

  // Don't render if no timer is present
  if (!activeTimer) {
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

  // Controls for Task Timer
  const handlePlayPause = () => {
    if (activeTimer) {
      if (isRunning) {
        dispatch({ type: 'PAUSE_TIMER' });
      } else {
        dispatch({ type: 'RESUME_TIMER' });
      }
    }
  };

  const handleStop = () => {
    if (activeTimer) {
      dispatch({ type: 'STOP_TIMER' });
    }
  };

  const handleOpenTask = () => {
    if (activeTimer?.taskId) {
      onOpenTask?.(activeTimer.taskId);
    }
  };

  const task = state.tasks.find(t => t.id === activeTimer?.taskId);
  const progressPercentage = activeTimer ? getProgressPercentage() : 0;
  const isOvertime = !!activeTimer && task?.estimatedTime && activeTimer.elapsedTime > task.estimatedTime;

  return (
    <>
      <div className="relative w-full z-50 top-timer-bar" style={{ zIndex: 40 }}>
        {/* Elegant Progress Bar - thin accent line at top */}
        <div 
          className="absolute top-0 left-0 h-[2px] transition-all duration-300"
          style={{ 
            width: `${progressPercentage}%`,
            background: isOvertime 
              ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' 
              : `linear-gradient(90deg, ${state.preferences.accentColor} 0%, ${state.preferences.accentColor}99 100%)`
          }}
        />
        
        {/* Compact Timer Bar */}
        <div 
          className="w-full border-b border-gray-100 dark:border-gray-800/50"
          style={{
            height: '36px',
            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="h-full flex items-center justify-center px-4">
            <div className="max-w-5xl w-full flex items-center justify-center gap-6">
              
              {/* Task Title - left aligned */}
              {activeTimer && task && (
                  <button
                    onClick={handleOpenTask}
                  className="text-xs font-medium truncate max-w-[200px] hover:opacity-80 transition-opacity"
                    style={{ color: state.preferences.accentColor }}
                  title={task.title}
                  >
                  {task.title}
                  </button>
              )}

              {/* Timer Display - elegant center */}
              {activeTimer && (
                <div className="flex items-center gap-2">
                  <span 
                    className={`text-base font-semibold tracking-tight ${isOvertime ? 'text-red-500' : ''}`}
                    style={{ 
                      fontVariantNumeric: 'tabular-nums',
                      color: isOvertime ? undefined : (isDarkMode ? '#f4f4f5' : '#18181b'),
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
                  </span>
                  {activeTimer.estimatedTime && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      / {formatTimeShort(activeTimer.estimatedTime)}
                    </span>
                  )}
                  {isOvertime && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50">
                      <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                    </div>
                  )}
                </div>
              )}

              {/* Controls - compact pill style */}
              {activeTimer && (
                <div className="flex items-center gap-1 p-0.5 rounded-full bg-gray-100 dark:bg-gray-800/80">
                  <button
                    onClick={handlePlayPause}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all text-white hover:scale-105 active:scale-95"
                    style={{ backgroundColor: state.preferences.accentColor }}
                    title={isRunning ? 'Pausieren' : 'Fortsetzen'}
                  >
                    {isRunning ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={handleStop}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Timer stoppen"
                  >
                    <Square className="w-2.5 h-2.5" fill="currentColor" />
                  </button>
                </div>
                  )}
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
        />
      )}
    </>
  );
} 