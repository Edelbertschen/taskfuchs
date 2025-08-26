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
  Loader
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { timerService } from '../../utils/timerService';
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

  // Update Pomodoro session state regularly
  useEffect(() => {
    const interval = setInterval(() => {
      const newSession = timerService.getGlobalPomodoroSession();
      setPomodoroSession(newSession);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Monitor timer warnings - AKTIVIERT für Modal-Anzeige
  useEffect(() => {
    if (!activeTimer || !isRunning) return;

    const task = state.tasks.find(t => t.id === activeTimer.taskId);
    if (!task) return;

    // Check for estimated time warning
    if (task.estimatedTime && activeTimer.elapsedTime >= task.estimatedTime) {
      const warningKey = `${activeTimer.taskId}-estimated-${Math.floor(activeTimer.elapsedTime)}`;
      if (!lastWarningTime.estimated || activeTimer.elapsedTime - lastWarningTime.estimated >= 5) {
        // Play penetrating alarm sound
        playCompletionSound('alarm', state.preferences.soundVolume);
        setWarningType('estimated');
        setShowWarningModal(true);
        setLastWarningTime(prev => ({ ...prev, estimated: activeTimer.elapsedTime }));
      }
    }

    // Check for Pomodoro session end
    if (activeTimer.mode === 'pomodoro' && pomodoroSession && pomodoroSession.sessionRemainingTime <= 0) {
      if (!lastWarningTime.pomodoro || Date.now() - lastWarningTime.pomodoro >= 60000) {
        // Play ENHANCED Pomodoro completion sound
        playCompletionSound('pomodoro_alarm', state.preferences.soundVolume);
        setWarningType('pomodoro');
        setShowWarningModal(true);
        setLastWarningTime(prev => ({ ...prev, pomodoro: Date.now() }));
      }
    }
  }, [activeTimer, isRunning, state.tasks, pomodoroSession, lastWarningTime, state.preferences.soundVolume]);

  // Don't render if no active timer
  if (!activeTimer) {
    return null;
  }

  const formatTime = (minutes: number): string => {
    try {
      if (typeof minutes !== 'number' || isNaN(minutes)) {
        return '0:00';
      }
      
      const absMinutes = Math.abs(minutes);
      const hours = Math.floor(absMinutes / 60);
      const mins = Math.floor(absMinutes % 60);
      const secs = Math.floor((absMinutes % 1) * 60);
      const sign = minutes < 0 ? '-' : '';
      
      if (hours > 0) {
        return `${sign}${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
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

  const getProgressPercentage = () => {
    if (!activeTimer) return 0;
    
    const totalTime = activeTimer.estimatedTime || 0;
    const elapsedTime = activeTimer.elapsedTime || 0;
    
    if (totalTime <= 0) return 0;
    
    return Math.min((elapsedTime / totalTime) * 100, 100);
  };

  const handlePlayPause = () => {
    if (isRunning) {
      dispatch({ type: 'PAUSE_TIMER' });
    } else {
      dispatch({ type: 'RESUME_TIMER' });
    }
  };

  const handleStop = () => {
    dispatch({ type: 'STOP_TIMER' });
  };

  const handleOpenTask = () => {
    if (activeTimer?.taskId) {
      onOpenTask?.(activeTimer.taskId);
    }
  };

  const handleSkipPomodoroPhase = () => {
    if (pomodoroSession) {
      // Skip to next phase
      timerService.skipPomodoroPhase();
    }
  };

  const handleEndPomodoroBreak = () => {
    if (pomodoroSession && (pomodoroSession.type === 'shortBreak' || pomodoroSession.type === 'longBreak')) {
      // End break and start new work session
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
  const progressPercentage = getProgressPercentage();
  const isOvertime = task?.estimatedTime && activeTimer.elapsedTime > task.estimatedTime;

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
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className="h-full flex items-center justify-center">
            <div className="max-w-4xl w-full flex items-center justify-between px-6">
            {/* Left: Task Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <button
                onClick={handleOpenTask}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:opacity-80 transition-opacity truncate"
                style={{ color: state.preferences.accentColor }}
              >
                {task?.title || 'Unbekannte Aufgabe'}
              </button>
            </div>

            {/* Center: Timer Display */}
            <div className="flex items-center space-x-4">
              {/* Task Timer */}
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-mono font-semibold ${isOvertime ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {formatTime(activeTimer.elapsedTime || 0)}
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

              {/* Pomodoro Timer */}
              {activeTimer.mode === 'pomodoro' && pomodoroSession && (
                <>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center space-x-2">
                    <Coffee className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-lg font-mono font-semibold text-red-500">
                      {formatTime(pomodoroSession.sessionRemainingTime || 0)}
                    </span>
                    <span className="text-xs text-gray-400">
                      #{pomodoroSession.sessionNumber}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
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

              <button
                onClick={handlePlayPause}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-80 text-white shadow-sm"
                style={{ backgroundColor: isRunning ? '#f59e0b' : state.preferences.accentColor }}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              
              <button
                onClick={handleStop}
                className="w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 text-white flex items-center justify-center transition-all duration-200 hover:opacity-80 shadow-sm"
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timer Warning Modal */}
      {showWarningModal && task && (
        <TimerWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          taskTitle={task.title}
          taskId={task.id}
          timeExceeded={Math.max(0, activeTimer.elapsedTime - (task.estimatedTime || 0))}
          type={warningType}
        />
      )}
    </>
  );
} 