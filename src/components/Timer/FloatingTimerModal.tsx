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

  return (
    <div
      className={`fixed z-[9998] rounded-lg shadow-2xl ${
        isDarkMode 
          ? 'bg-zinc-900 border border-zinc-800' 
          : 'bg-white border border-gray-200'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '240px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-4">
        {/* Task Title */}
        {task && (
          <div 
            className="text-xs font-medium mb-3 truncate cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: '#71717a' }}
            onClick={() => onOpenTask?.(task.id)}
            title={task.title}
          >
            {task.title}
          </div>
        )}

        {/* Main Timer */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={`text-3xl font-semibold tracking-tight ${
              isOvertime ? 'text-red-500' : (isDarkMode ? 'text-zinc-50' : 'text-zinc-900')
            }`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatTimeWithSecondsExact(activeTimer.elapsedTime || 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {activeTimer.estimatedTime && (
                <span className="text-xs text-zinc-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  / {formatTimeShort(activeTimer.estimatedTime)}
                </span>
              )}
              {isOvertime && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  OVER
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePlayPause}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all hover:opacity-90 hover:scale-105 active:scale-95"
              style={{ backgroundColor: state.preferences.accentColor }}
              title={activeTimer.isPaused ? 'Resume' : 'Pause'}
            >
              {activeTimer.isPaused ? (
                <Play className="w-3.5 h-3.5 text-white" fill="white" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-white" />
              )}
            </button>
            <button
              onClick={handleStop}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                isDarkMode 
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
              title="Stop"
            >
              <Square className="w-3 h-3" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
