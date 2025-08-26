import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  Square, 
  Target,
  Coffee,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Move3d,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { timerService } from '../../utils/timerService';

interface FloatingTimerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function FloatingTimerModal({ isVisible, onOpenTask, onClose }: FloatingTimerModalProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [pomodoroSession, setPomodoroSession] = useState(timerService.getGlobalPomodoroSession());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUltraMinimal, setIsUltraMinimal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320 - 24, y: window.innerHeight - 180 - 24 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  const activeTimer = state.activeTimer;
  const isRunning = activeTimer?.isActive && !activeTimer?.isPaused;
  const isMinimalDesign = state.preferences.minimalDesign;

  // Update Pomodoro session state regularly
  useEffect(() => {
    const interval = setInterval(() => {
      const newSession = timerService.getGlobalPomodoroSession();
      setPomodoroSession(newSession);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    
    setIsDragging(true);
    const rect = modalRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within screen bounds
      const maxX = window.innerWidth - (isUltraMinimal ? 260 : isExpanded ? 400 : 280);
      const maxY = window.innerHeight - (isUltraMinimal ? 50 : isExpanded ? 200 : 120);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isExpanded]);

  // Don't render if no active timer or not visible
  if (!activeTimer || !isVisible) {
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
    <div
      ref={modalRef}
      className={`fixed z-[9999] transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
      style={{
        left: position.x,
        top: position.y,
        width: isUltraMinimal ? '260px' : isExpanded ? '400px' : '280px',
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'rotate(0deg) scale(1)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Glass Container */}
      <div className={`relative rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${
        isDarkMode
          ? 'bg-gray-900/95 border-gray-700/80 backdrop-blur-xl'
          : 'bg-white/95 border-white/20 backdrop-blur-xl'
      }`}
      style={{
        boxShadow: isDarkMode
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      }}>
        
        {/* Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-1 transition-all duration-300 rounded-t-2xl"
          style={{ 
            width: `${progressPercentage}%`,
            backgroundColor: isOvertime ? '#ef4444' : state.preferences.accentColor,
            opacity: isDarkMode ? 0.9 : 0.8,
            boxShadow: isOvertime 
              ? isDarkMode 
                ? '0 0 12px rgba(239, 68, 68, 0.8)' 
                : '0 0 8px rgba(239, 68, 68, 0.6)'
              : isDarkMode 
                ? `0 0 12px ${state.preferences.accentColor}60` 
                : `0 0 8px ${state.preferences.accentColor}40`
          }}
        />

        {/* Header */}
        <div className={`${isUltraMinimal ? 'p-2' : 'p-4'} ${isUltraMinimal ? '' : `border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700/60' : 'border-gray-200/40'}`}`}>
          <div className="flex items-center justify-between">
            {!isUltraMinimal && (
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 transition-all duration-300" style={{ 
                  color: state.preferences.accentColor, 
                  filter: isDarkMode 
                    ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' 
                    : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                }} />
                <span className={`text-sm font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'text-white'
                    : 'text-gray-900'
                }`}
                      style={{ 
                        textShadow: isDarkMode 
                          ? '0 1px 3px rgba(0, 0, 0, 0.8)' 
                          : '0 1px 2px rgba(255, 255, 255, 0.8)'
                      }}>
                  Timer
                </span>
              </div>
            )}
            
            {/* Ultra Minimal Content - One Line */}
            {isUltraMinimal && (
              <div className="flex items-center space-x-3 flex-1 mr-2">
                <Target className="w-3 h-3 transition-all duration-300" style={{ 
                  color: state.preferences.accentColor,
                  filter: isDarkMode 
                    ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' 
                    : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                }} />
                <span className={`text-xs font-medium truncate flex-1 transition-all duration-300 ${
                  isDarkMode 
                    ? 'text-white'
                    : 'text-gray-800'
                }`}
                      style={{ 
                        textShadow: isDarkMode 
                          ? '0 1px 3px rgba(0, 0, 0, 0.8)' 
                          : '0 1px 2px rgba(255, 255, 255, 0.8)'
                      }}>
                  {task?.title || 'Unbekannte Aufgabe'}
                </span>
                <span className={`text-sm font-mono font-bold transition-all duration-300 ${
                  isOvertime 
                    ? 'text-red-500' 
                    : isDarkMode 
                      ? 'text-white'
                      : 'text-gray-900'
                }`}
                style={{ 
                  textShadow: isDarkMode 
                    ? '0 1px 4px rgba(0, 0, 0, 0.9)' 
                    : '0 1px 2px rgba(255, 255, 255, 0.8)'
                }}>
                  {formatTime(activeTimer.elapsedTime || 0)}
                </span>
                {isOvertime && (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
                <button
                  onClick={handlePlayPause}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 text-white shadow-lg backdrop-blur-sm"
                  style={{ backgroundColor: isRunning ? '#f59e0b' : state.preferences.accentColor }}
                >
                  {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            )}
            <div className="flex items-center space-x-1">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
                title={isDarkMode ? 'Helles Widget aktivieren' : 'Dunkles Widget aktivieren'}
                style={{
                  boxShadow: isDarkMode 
                    ? '0 4px 8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                    : '0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
              >
                              {isDarkMode ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
              </button>
              
              {/* Size Toggle */}
              <button
                onClick={() => {
                  if (isUltraMinimal) {
                    setIsUltraMinimal(false);
                    setIsExpanded(false);
                  } else if (isExpanded) {
                    setIsExpanded(false);
                  } else {
                    setIsUltraMinimal(true);
                  }
                }}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'hover:bg-gray-800 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={isUltraMinimal ? 'Normal' : isExpanded ? 'Minimieren' : 'Ultra-Minimal'}
              >
                {isUltraMinimal ? (
                  <Maximize2 className="w-3 h-3" />
                ) : isExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </button>

              <button
                onClick={onClose}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'hover:bg-gray-800 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Schließen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!isUltraMinimal && (
        <div className="p-4">
          {/* Task Info */}
          <div className="mb-3">
            <button
              onClick={handleOpenTask}
              className={`text-sm font-medium hover:opacity-80 transition-all duration-300 truncate block w-full text-left ${
                isDarkMode 
                  ? 'text-white'
                  : 'text-gray-800'
              }`}
              style={{ 
                color: isDarkMode 
                  ? state.preferences.accentColor 
                    : state.preferences.accentColor,
                textShadow: isDarkMode 
                  ? '0 1px 3px rgba(0, 0, 0, 0.8)' 
                  : '0 1px 2px rgba(255, 255, 255, 0.8)',
                filter: isDarkMode 
                  ? `drop-shadow(0 0 8px ${state.preferences.accentColor}40)` 
                  : 'none'
              }}
            >
              {task?.title || 'Unbekannte Aufgabe'}
            </button>
          </div>

          {/* Timer Display */}
          <div className="mb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className={`text-2xl font-mono font-bold transition-all duration-300 ${
                isOvertime 
                  ? 'text-red-500' 
                  : isDarkMode 
                    ? 'text-white'
                    : 'text-gray-900'
              }`}
              style={{ 
                textShadow: isDarkMode 
                  ? '0 2px 8px rgba(0, 0, 0, 0.9)' 
                  : '0 1px 4px rgba(255, 255, 255, 0.8)',
                filter: isDarkMode && !isOvertime 
                  ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.3))' 
                  : 'none'
              }}>
                {formatTime(activeTimer.elapsedTime || 0)}
              </span>
              {isOvertime && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
            
            {activeTimer.estimatedTime && (
              <div className="text-center">
                <span className={`text-xs transition-all duration-300 ${
                  isDarkMode 
                    ? 'text-white/70'
                    : 'text-gray-600'
                }`}
                      style={{ 
                        textShadow: isDarkMode 
                          ? '0 1px 2px rgba(0, 0, 0, 0.8)' 
                          : '0 1px 2px rgba(255, 255, 255, 0.8)'
                      }}>
                  / {formatTimeShort(activeTimer.estimatedTime)}
                </span>
              </div>
            )}

            {/* Pomodoro Timer */}
            {activeTimer.mode === 'pomodoro' && pomodoroSession && isExpanded && (
              <div className={`mt-3 pt-3 border-t transition-colors duration-300 ${
                isDarkMode ? 'border-white/10' : 'border-gray-300/60'
              }`}>
                <div className="flex items-center justify-center space-x-2">
                  <Coffee className="w-4 h-4 text-red-500" />
                  <span className="text-lg font-mono font-semibold text-red-500">
                    {formatTime(pomodoroSession.sessionRemainingTime || 0)}
                  </span>
                  <span className={`text-xs transition-all duration-300 ${
                    isDarkMode 
                      ? 'text-white/70'
                      : 'text-gray-600'
                  }`}
                        style={{ 
                          textShadow: isDarkMode 
                            ? '0 1px 2px rgba(0, 0, 0, 0.8)' 
                            : '0 1px 2px rgba(255, 255, 255, 0.8)'
                        }}>
                    #{pomodoroSession.sessionNumber}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleEnterFocusMode}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 text-white"
              style={{ backgroundColor: state.preferences.accentColor }}
              title={t('focus.focus_mode') || 'Fokusmodus'}
            >
              Fokusmodus
            </button>
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 text-white shadow-lg backdrop-blur-sm"
              style={{ 
                backgroundColor: isRunning ? '#f59e0b' : state.preferences.accentColor,
                boxShadow: isDarkMode 
                  ? '0 8px 16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                  : '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8)'
              }}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleStop}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg backdrop-blur-sm"
              style={{
                boxShadow: isDarkMode 
                  ? '0 8px 16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                  : '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8)'
              }}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}

        {/* Drag Handle */}
        <div className={`absolute ${isUltraMinimal ? 'top-1 right-8' : 'top-2 right-14'} opacity-40 hover:opacity-70 transition-all duration-300`}>
          <Move3d className={`w-3 h-3 transition-all duration-300 ${
            isDarkMode 
              ? 'text-white/60'
              : 'text-gray-600'
          }`}
                  style={{ 
                    filter: isDarkMode 
                      ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' 
                      : 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.8))'
                  }} />
        </div>
      </div>
    </div>
  );
} 