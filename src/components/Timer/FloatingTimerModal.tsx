import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Square, SkipForward, GripVertical, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTimeWithSecondsExact } from '../../utils/timeUtils';

interface FloatingTimerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function FloatingTimerModal({ isVisible, onOpenTask, onClose }: FloatingTimerModalProps) {
  
  const { state, dispatch } = useApp();
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const activeTimer = state.activeTimer;
  const pomodoroSession = state.pomodoroSession;
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Get task details
  const task = activeTimer?.taskId 
    ? state.tasks?.find(t => t.id === activeTimer.taskId)
    : null;

  // Calculate if overtime
  const isOvertime = activeTimer?.estimatedTime && activeTimer.elapsedTime 
    ? activeTimer.elapsedTime > activeTimer.estimatedTime
    : false;

  // Get Pomodoro color
  const getPomodoroColor = () => {
    if (!pomodoroSession) return state.preferences.accentColor || '#f97316';
    return pomodoroSession.type === 'work' 
      ? (state.preferences.accentColor || '#f97316')
      : '#10b981';
  };

  // Get Pomodoro progress (0-100)
  const getPomodoroProgress = () => {
    if (!pomodoroSession || !pomodoroSession.sessionDuration) return 0;
    const elapsed = pomodoroSession.sessionElapsedTime || 0;
    const duration = pomodoroSession.sessionDuration;
    return Math.min(100, (elapsed / duration) * 100);
  };

  // Handle Pomodoro skip/end
  const handlePomodoroSkipOrEnd = () => {
    if (!pomodoroSession) return;
    if (pomodoroSession.type === 'work') {
      dispatch({ type: 'SKIP_POMODORO_SESSION' });
    } else {
      dispatch({ type: 'END_POMODORO_BREAK' });
    }
  };

  // Timer controls
  const handlePlayPause = () => {
    if (!activeTimer) return;
    if (activeTimer.isPaused) {
      dispatch({ type: 'RESUME_TIMER' });
    } else {
      dispatch({ type: 'PAUSE_TIMER' });
    }
  };

  const handleStop = () => {
    dispatch({ type: 'STOP_TIMER' });
  };

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Don't render if not visible or no active timer
  if (!isVisible || !activeTimer?.isActive) return null;

  return (
    <div
      className={`fixed z-[9999] rounded-lg shadow-2xl ${
        isDarkMode 
          ? 'bg-gray-800/95 border border-gray-700' 
          : 'bg-white/95 border border-gray-200'
      } backdrop-blur-md`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle and close */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timer</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Task Title */}
        {task && (
          <div 
            className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-orange-500 transition-colors"
            onClick={() => onOpenTask?.(task.id)}
            title={task.title}
          >
            {task.title}
          </div>
        )}

        {/* Main Timer Display */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className={`text-3xl font-mono font-bold ${
              isOvertime ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')
            }`}>
              {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
            </span>
            {activeTimer.estimatedTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Geschätzt: {Math.floor(activeTimer.estimatedTime / 60)}h {activeTimer.estimatedTime % 60}m
              </span>
            )}
          </div>
          
          {/* Timer Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={activeTimer.isPaused ? 'Fortsetzen' : 'Pausieren'}
            >
              {activeTimer.isPaused ? (
                <Play className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
              ) : (
                <Pause className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
              )}
            </button>
            <button
              onClick={handleStop}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        {/* Overtime Warning */}
        {isOvertime && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400">Über geschätzter Zeit</span>
          </div>
        )}

        {/* Pomodoro Section */}
        {pomodoroSession && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Pomodoro Progress Ring */}
              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  {/* Background ring */}
                  <svg className="absolute w-full h-full" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                      strokeWidth="3"
                    />
                    {/* Progress ring */}
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke={getPomodoroColor()}
                      strokeWidth="3"
                      strokeDasharray={`${(getPomodoroProgress() / 100) * 125.66} 125.66`}
                      style={{
                        transition: 'stroke-dasharray 1s linear, stroke 0.3s ease',
                      }}
                    />
                  </svg>
                  {/* Center icon */}
                  <div className="relative z-10 text-xl">
                    {pomodoroSession.type === 'work' ? '🍅' : '☕'}
                  </div>
                </div>

                {/* Time and session info */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {pomodoroSession.type === 'work' ? 'Arbeit' : 'Pause'}
                  </span>
                  <span className="text-lg font-mono font-semibold" style={{ color: getPomodoroColor() }}>
                    {formatTimeWithSecondsExact(Math.max(0, pomodoroSession.sessionRemainingTime || 0))}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Session #{pomodoroSession.sessionNumber}
                  </span>
                </div>
              </div>

              {/* Skip/End button */}
              <button
                onClick={handlePomodoroSkipOrEnd}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 border"
                style={{ 
                  backgroundColor: 'transparent', 
                  color: getPomodoroColor(), 
                  borderColor: getPomodoroColor() 
                }}
                title={pomodoroSession.type === 'work' ? 'Phase überspringen' : 'Pause beenden'}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
