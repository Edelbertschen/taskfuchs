import React from 'react';
import { Play, Pause, Square, Clock, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TimerControlsProps {
  taskId: string;
  estimatedTime: number;
  trackedTime: number;
  size?: 'sm' | 'md' | 'lg';
  showTime?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function TimerControls({
  taskId,
  estimatedTime,
  trackedTime,
  size = 'md',
  showTime = true,
  showProgress = true,
  className = ''
}: TimerControlsProps) {
  const { state, dispatch } = useApp();
  const activeTimer = state.activeTimer;
  const isActiveTimer = activeTimer?.taskId === taskId;
  const isRunning = isActiveTimer && activeTimer.isActive && !activeTimer.isPaused;
  const isPaused = isActiveTimer && activeTimer.isPaused;

  const handlePlay = () => {
    if (isRunning) {
      dispatch({ type: 'PAUSE_TIMER' });
    } else if (isPaused) {
      dispatch({ type: 'RESUME_TIMER' });
    } else {
      const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
      dispatch({ type: 'START_TIMER', payload: { taskId, mode: timerMode } });
    }
  };

  const handleStop = () => {
    dispatch({ type: 'STOP_TIMER' });
  };

  const formatTime = (minutes: number) => {
    // For timer display, we might want to show 0m, but let's make it consistent
    if (minutes === 0 || !minutes) {
      return '0m'; // Keep 0m for timer display since it's important to show current time
    }
    
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = () => {
    if (!estimatedTime || estimatedTime === 0) return 0;
    return Math.min((trackedTime / estimatedTime) * 100, 100);
  };

  const getAccentColor = () => {
    return state.preferences.accentColor || '#0ea5e9';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'w-8 h-8',
          icon: 'w-4 h-4',
          text: 'text-xs',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          button: 'w-12 h-12',
          icon: 'w-6 h-6',
          text: 'text-base',
          gap: 'gap-3'
        };
      default: // md
        return {
          button: 'w-10 h-10',
          icon: 'w-5 h-5',
          text: 'text-sm',
          gap: 'gap-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex flex-col items-center ${sizeClasses.gap} ${className}`}>
      {/* Timer Controls */}
      <div className={`flex items-center ${sizeClasses.gap}`}>
        <button
          onClick={handlePlay}
          className={`${sizeClasses.button} flex items-center justify-center rounded-full text-white transition-all duration-200 hover:scale-105 shadow-lg`}
          style={{
            backgroundColor: getAccentColor(),
            boxShadow: `0 4px 14px 0 ${getAccentColor()}4a`
          }}
          title={isRunning ? 'Pausieren' : 'Starten'}
        >
          {isRunning ? (
            <Pause className={sizeClasses.icon} />
          ) : (
            <Play className={sizeClasses.icon} />
          )}
        </button>

        {(isRunning || isPaused) && (
          <button
            onClick={handleStop}
            className={`${sizeClasses.button} flex items-center justify-center rounded-full bg-gray-500 text-white transition-all duration-200 hover:scale-105 hover:bg-gray-600 shadow-lg`}
            title="Stoppen"
          >
            <Square className={sizeClasses.icon} />
          </button>
        )}
      </div>

      {/* Time Display */}
      {showTime && (
        <div className={`flex items-center ${sizeClasses.gap} ${sizeClasses.text} text-gray-600 dark:text-gray-400`}>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(trackedTime)}</span>
          </div>
          {estimatedTime > 0 && (
            <>
              <span>/</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{formatTime(estimatedTime)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && estimatedTime > 0 && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-1">
            <span className={`${sizeClasses.text} text-gray-600 dark:text-gray-400`}>
              Fortschritt
            </span>
            <span className={`${sizeClasses.text} font-medium`} style={{ color: getAccentColor() }}>
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${getProgressPercentage()}%`,
                background: `linear-gradient(90deg, ${getAccentColor()}22 0%, ${getAccentColor()} 100%)`
              }}
            />
          </div>
        </div>
      )}

      {/* Active Timer Indicator */}
      {isRunning && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Aktiv</span>
        </div>
      )}
    </div>
  );
} 