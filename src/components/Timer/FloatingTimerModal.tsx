import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipForward, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTimeWithSecondsExact } from '../../utils/timeUtils';
import { timerService } from '../../utils/timerService';

interface FloatingTimerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function FloatingTimerModal({ isVisible, onOpenTask }: FloatingTimerModalProps) {
  const { state, dispatch } = useApp();
  const [position, setPosition] = useState({ x: window.innerWidth - 280, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const activeTimer = state.activeTimer;
  const isDarkMode = document.documentElement.classList.contains('dark');

  const task = activeTimer?.taskId 
    ? state.tasks?.find(t => t.id === activeTimer.taskId)
    : null;

  const isOvertime = activeTimer?.estimatedTime && activeTimer.elapsedTime 
    ? activeTimer.elapsedTime > activeTimer.estimatedTime
    : false;


  const formatTimeShort = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

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

  // Dragging logic - only handle left mouse button, ignore right-click for context menu
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore right-click (button 2) and middle-click (button 1) - only handle left-click (button 0)
    if (e.button !== 0) return;
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

  if (!isVisible || !activeTimer?.isActive) return null;

  const accentColor = state.preferences.accentColor;

  return (
    <div
      data-floating-timer
      className={`fixed z-[9998] overflow-hidden ${
        isDarkMode 
          ? 'bg-zinc-900/95 border border-zinc-700/50' 
          : 'bg-white/95 border border-gray-200/80'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: '16px',
        boxShadow: isDarkMode 
          ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' 
          : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Progress indicator at top */}
      {activeTimer.estimatedTime && (
        <div className="h-0.5 bg-gray-100 dark:bg-zinc-800">
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${Math.min(100, (activeTimer.elapsedTime / activeTimer.estimatedTime) * 100)}%`,
              backgroundColor: isOvertime ? '#ef4444' : accentColor,
            }}
          />
        </div>
      )}

      <div className="p-3">
        {/* Task Title */}
        {task && (
          <button 
            className="text-[10px] font-medium mb-2 truncate block w-full text-left cursor-pointer hover:opacity-70 transition-opacity uppercase tracking-wide"
            style={{ color: accentColor }}
            onClick={() => onOpenTask?.(task.id)}
            title={task.title}
          >
            {task.title}
          </button>
        )}

        {/* Timer Display - Large and elegant */}
        <div className="flex items-end justify-between">
          <div>
            <div 
              className={`text-2xl font-semibold ${isOvertime ? 'text-red-500' : ''}`}
              style={{ 
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
                color: isOvertime ? undefined : (isDarkMode ? '#fafafa' : '#18181b')
              }}
            >
              {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
            </div>
            {activeTimer.estimatedTime && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-400">
                  von {formatTimeShort(activeTimer.estimatedTime)}
                </span>
                {isOvertime && (
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                    Überschritten
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Compact Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ backgroundColor: accentColor }}
              title={activeTimer.isPaused ? 'Fortsetzen' : 'Pause'}
            >
              {activeTimer.isPaused ? (
                <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-white" />
              )}
            </button>
            <button
              onClick={handleStop}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                isDarkMode 
                  ? 'text-zinc-500 hover:text-zinc-300' 
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title="Stoppen"
            >
              <Square className="w-2.5 h-2.5" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
