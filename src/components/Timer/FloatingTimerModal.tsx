import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Square, SkipForward, GripVertical, AlertTriangle, Target, Coffee } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTimeWithSecondsExact } from '../../utils/timeUtils';
import { timerService } from '../../utils/timerService';

interface FloatingTimerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function FloatingTimerModal({ isVisible, onOpenTask, onClose }: FloatingTimerModalProps) {
  
  const { state, dispatch } = useApp();
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pomodoroSession, setPomodoroSession] = useState(timerService.getGlobalPomodoroSession());

  const activeTimer = state.activeTimer;
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Update Pomodoro session state regularly
  useEffect(() => {
    const interval = setInterval(() => {
      const newSession = timerService.getGlobalPomodoroSession();
      setPomodoroSession(newSession);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get task details
  const task = activeTimer?.taskId 
    ? state.tasks?.find(t => t.id === activeTimer.taskId)
    : null;

  // Calculate if overtime
  const isOvertime = activeTimer?.estimatedTime && activeTimer.elapsedTime 
    ? activeTimer.elapsedTime > activeTimer.estimatedTime
    : false;

  // Get Pomodoro color based on type and progress
  const getPomodoroColor = () => {
    if (!pomodoroSession) return state.preferences.accentColor;
    if (pomodoroSession.type === 'work') {
      return pomodoroSession.sessionRemainingTime <= 0 ? '#f97316' : '#ef4444';
    } else {
      return '#10b981';
    }
  };

  // Pomodoro progress percentage (0-100)
  const getPomodoroProgress = () => {
    if (!pomodoroSession) return 0;
    const total = pomodoroSession.sessionRemainingTime + pomodoroSession.sessionElapsedTime;
    if (total <= 0) return 0;
    return Math.min(100, (pomodoroSession.sessionElapsedTime / total) * 100);
  };

  // Handle Pomodoro skip/end
  const handlePomodoroSkipOrEnd = () => {
    if (!pomodoroSession) return;
    if (pomodoroSession.type === 'work') {
      timerService.skipPomodoroWorkSession();
    } else {
      timerService.endPomodoroBreak();
    }
  };

  const formatTimeShort = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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

  const isRunning = activeTimer?.isActive && !activeTimer?.isPaused;
  const hasPomodoro = !!pomodoroSession && pomodoroSession.isActive;

  return (
    <div
      className={`fixed z-[9999] rounded-xl shadow-2xl ${
        isDarkMode 
          ? 'bg-gray-900/98 border border-gray-700' 
          : 'bg-white/98 border border-gray-200'
      } backdrop-blur-xl`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '360px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle and close */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TaskFuchs Timer</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content - Matching TopTimerBar layout */}
      <div className="p-4">
        {/* Task Title */}
        {task && (
          <div 
            className="text-sm font-medium text-gray-900 dark:text-white mb-4 truncate cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onOpenTask?.(task.id)}
            title={task.title}
          >
            {task.title}
          </div>
        )}

        {/* Timer Display Section */}
        <div className="space-y-4">
          {/* Main Task Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-mono font-semibold ${
                isOvertime ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')
              }`}>
                {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
              </span>
              {activeTimer.estimatedTime && (
                <span className="text-xs text-gray-400">
                  / {formatTimeShort(activeTimer.estimatedTime)}
                </span>
              )}
              {isOvertime && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: state.preferences.accentColor }}
                title={activeTimer.isPaused ? 'Fortsetzen' : 'Pausieren'}
              >
                {activeTimer.isPaused ? (
                  <Play className="w-4 h-4 text-white" />
                ) : (
                  <Pause className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={handleStop}
                className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center transition-all duration-200 hover:opacity-80"
                title="Timer stoppen"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pomodoro Section - Matching TopTimerBar */}
          {hasPomodoro && pomodoroSession && (
            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                {/* Left side: Progress Ring + Info */}
                <div className="flex items-center space-x-3">
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
                    {/* Center tomato/coffee icon */}
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
                </div>

                {/* Right side: Skip/End button */}
                <button
                  onClick={handlePomodoroSkipOrEnd}
                  className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-110 border"
                  style={{ 
                    backgroundColor: 'transparent', 
                    color: getPomodoroColor(), 
                    borderColor: getPomodoroColor() 
                  }}
                  title={pomodoroSession.type === 'work' ? 'Phase überspringen' : 'Pause beenden'}
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
