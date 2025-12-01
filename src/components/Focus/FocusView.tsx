import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Square, Check, X, Plus, Minus, Clock, Timer, Calendar, ChevronRight, Star, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCelebration } from '../../context/CelebrationContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import type { Task } from '../../types';
import { playCompletionSound } from '../../utils/soundUtils';
import { TaskModal } from '../Tasks/TaskModal';
import { getBackgroundStyles, getDarkModeBackgroundStyles } from '../../utils/backgroundUtils';
import { timerService } from '../../utils/timerService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FocusViewProps {
  onExit?: () => void;
}

export function FocusView({ onExit }: FocusViewProps) {
  const { state, dispatch } = useApp();
  const { triggerCelebration } = useCelebration();
  const { t, focusView } = useAppTranslation();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTimeAdjustment, setShowTimeAdjustment] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [timerTick, setTimerTick] = useState(0);
  const [autoProgressMessage, setAutoProgressMessage] = useState<string | null>(null);
  const [selectedTaskForTime, setSelectedTaskForTime] = useState<string | null>(null);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState('');
  
  // Debouncing for time adjustments to fix the multiple click bug
  const [isAdjusting, setIsAdjusting] = useState(false);
  const adjustmentTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Get current task from active timer
  const getCurrentTask = (): Task | null => {
    if (state.activeTimer?.taskId) {
      const task = state.tasks.find(t => t.id === state.activeTimer?.taskId && !t.completed);
      return task || null;
    }
    return null;
  };

  const [currentTask, setCurrentTask] = useState<Task | null>(getCurrentTask());
  const [isManuallySetTask, setIsManuallySetTask] = useState(false);

  // Update current task when active timer changes (but not when manually set)
  useEffect(() => {
    // Don't override manually set tasks
    if (isManuallySetTask) {
      setIsManuallySetTask(false);
      return;
    }
    
    const newCurrentTask = getCurrentTask();
    if (newCurrentTask?.id !== currentTask?.id) {
      setCurrentTask(newCurrentTask);
    }
  }, [state.activeTimer?.taskId, state.tasks, currentTask?.id, isManuallySetTask]);

  // Update current task when the task data changes (including estimated time)
  useEffect(() => {
    if (currentTask) {
      const updatedTask = state.tasks.find(t => t.id === currentTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(currentTask)) {
        setCurrentTask(updatedTask);
      }
    }
  }, [state.tasks, currentTask]);

  // ESC key handler - Always exit focus mode, but keep timer running
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        console.log('ESC key pressed in FocusView');
        e.stopPropagation();
        e.preventDefault();
        
        // Close modals first, but if no modals are open, exit focus mode
        if (showTimeAdjustment) {
          console.log('Closing time adjustment modal');
          setShowTimeAdjustment(false);
          setCustomTimeInput('');
        } else if (showTaskModal) {
          console.log('Closing task modal');
          setShowTaskModal(false);
          setSelectedTaskForModal(null);
        } else if (selectedTaskForTime) { 
          console.log('Closing selectedTaskForTime modal');
          setSelectedTaskForTime(null);
          setEstimatedTimeInput('');
        } else {
          // Always exit focus mode on ESC, but keep timer running
          console.log('Exiting focus mode');
          dispatch({ type: 'SET_FOCUS_MODE', payload: false });
          dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
          if (onExit) {
            onExit();
          }
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleEscKey, true);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [showTimeAdjustment, showTaskModal, selectedTaskForTime, onExit, dispatch]);

  // Exit handler - Keep timer running when exiting focus mode
  const handleExit = useCallback(() => {
    // Reset focus mode state when exiting, but keep timer running
    dispatch({ type: 'SET_FOCUS_MODE', payload: false });
    dispatch({ type: 'SET_FOCUSED_COLUMN', payload: null });
    
    if (onExit) {
      onExit();
    }
  }, [dispatch, onExit]);

  // Format time with support for negative values
  const formatTime = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absoluteSeconds = Math.abs(Math.floor(seconds));
    const hours = Math.floor(absoluteSeconds / 3600);
    const minutes = Math.floor((absoluteSeconds % 3600) / 60);
    const secs = absoluteSeconds % 60;
    
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSecs = secs.toString().padStart(2, '0');
    
    const timeString = hours > 0 
      ? `${hours.toString().padStart(2, '0')}:${paddedMinutes}:${paddedSecs}`
      : `${paddedMinutes}:${paddedSecs}`;
    
    return isNegative ? `-${timeString}` : timeString;
  };

  // Get timer information
  const getTimerInfo = () => {
    const activeTimer = state.activeTimer;
    // Get current active timer task or manually selected task
    const timerTask = activeTimer?.taskId ? state.tasks.find(t => t.id === activeTimer.taskId && !t.completed) : null;
    const taskForTimer = timerTask || currentTask;
    if (!activeTimer || activeTimer.taskId !== taskForTimer?.id) {
      return {
        isActive: false,
        isPaused: false,
        elapsedTime: 0,
        remainingTime: (taskForTimer?.estimatedTime || 0) * 60,
        totalTime: (taskForTimer?.estimatedTime || 0) * 60,
        progress: 0
      };
    }

    const totalTime = activeTimer.elapsedTime + activeTimer.remainingTime;
    const progress = totalTime > 0 ? Math.min(1, activeTimer.elapsedTime / totalTime) : 0;

    return {
      isActive: activeTimer.isActive,
      isPaused: activeTimer.isPaused,
      elapsedTime: activeTimer.elapsedTime,
      remainingTime: activeTimer.remainingTime,
      totalTime,
      progress
    };
  };

  const timerInfo = getTimerInfo();

  // Timer update interval for smooth seconds display
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerInfo.isActive && !timerInfo.isPaused) {
      interval = setInterval(() => {
        setTimerTick(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerInfo.isActive, timerInfo.isPaused]);

  // Timer controls
  const handleTimerToggle = () => {
    // Get current active timer task or manually selected task
    const timerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
    const taskToControl = timerTask || currentTask;
    if (!taskToControl) return;

    if (timerInfo.isActive && !timerInfo.isPaused) {
      dispatch({ type: 'PAUSE_TIMER' });
    } else {
      const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
      dispatch({
        type: 'START_TIMER',
        payload: { taskId: taskToControl.id, mode: timerMode }
      });
    }
  };

  const handleStopTimer = () => {
    // Get current active timer task or manually selected task
    const timerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
    const taskToControl = timerTask || currentTask;
    if (!taskToControl) return;
    dispatch({ type: 'STOP_TIMER' });
    // Don't automatically exit focus mode when stopping timer
    // User can manually exit with ESC or exit button
  };

  const handleCompleteTask = async () => {
    // Get current active timer task or manually selected task
    const timerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
    const taskToComplete = timerTask || currentTask;
    if (!taskToComplete) return;

    setIsAnimating(true);
    
    if (timerInfo.isActive) {
      // Stop only the task timer; keep Pomodoro running
      dispatch({ type: 'STOP_TIMER' });
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        // Ensure Pomodoro session remains active
        if (state.preferences?.pomodoro?.enabled && timerService.isPomodoroActive()) {
          timerService.resumePomodoroSession();
        }
      } catch {}
    }

    // Trigger celebration animation
    triggerCelebration();

    // Mark current task as completed
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...taskToComplete,
        completed: true,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    // Auto-progression: Find next task and start timer
    setTimeout(async () => {
      setIsAnimating(false);
      
      // Get remaining tasks (after current task is completed)
      const remainingTasks = getTodaysTasks().filter(task => 
        task.id !== taskToComplete.id && !task.completed && !task.archived
      );
      
      if (remainingTasks.length > 0) {
        // Prefer task with estimated time, but fallback to first task
        const nextTaskWithTime = remainingTasks.find(task => task.estimatedTime && task.estimatedTime > 0);
        const nextTask = nextTaskWithTime || remainingTasks[0];
        
        if (nextTask) {
          console.log('🎯 Auto-progression: Moving to next task:', nextTask.title);
          
          // Show auto-progress message
          const hasEstimatedTime = nextTask.estimatedTime && nextTask.estimatedTime > 0;
          setAutoProgressMessage(
            hasEstimatedTime 
              ? `Nächste Aufgabe: ${nextTask.title}` 
              : `Nächste Aufgabe: ${nextTask.title} (Timer manuell starten)`
          );
          
          // Set next task as current after brief delay
          setTimeout(() => {
            setIsManuallySetTask(true);
            setCurrentTask(nextTask);
            
            // Auto-start timer only if task has estimated time
            if (hasEstimatedTime) {
              const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
              dispatch({
                type: 'START_TIMER',
                payload: { taskId: nextTask.id, mode: timerMode }
              });
            }
            
            // Hide auto-progress message
            setTimeout(() => {
              setAutoProgressMessage(null);
            }, 3000); // Slightly longer for tasks without time
          }, 500);
          
          return; // Don't exit focus mode, continue with next task
        }
      }
      
      // No more tasks available - exit focus mode
      console.log('🏁 No more tasks available, exiting focus mode');
      setCurrentTask(null);
      if (onExit) {
        onExit();
      }
    }, 1000);
  };

  // Enhanced time adjustment with debouncing to fix the bug
  const handleTimeAdjustment = useCallback((minutes: number) => {
    // Get current active timer task or manually selected task
    const timerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
    const taskToAdjust = timerTask || currentTask;
    if (!taskToAdjust || isAdjusting) return;
    
    setIsAdjusting(true);
    
    // Clear any existing timeout
    if (adjustmentTimeoutRef.current) {
      clearTimeout(adjustmentTimeoutRef.current);
    }
    
    // Handle time adjustment properly
    const currentTime = taskToAdjust.estimatedTime || 0;
    const newTime = currentTime + minutes;
    // If task has no time estimate and we're subtracting, don't create one
    // If task has time estimate or we're adding time, ensure minimum of 1 minute
    const newEstimatedTime = (!taskToAdjust.estimatedTime && minutes < 0) 
      ? undefined 
      : Math.max(1, newTime);
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...taskToAdjust,
        estimatedTime: newEstimatedTime,
        updatedAt: new Date().toISOString()
      }
    });

    if (timerInfo.isActive) {
      timerService.adjustTimerTime(minutes);
    }
    
    // Reset the adjusting flag after a short delay
    adjustmentTimeoutRef.current = setTimeout(() => {
      setIsAdjusting(false);
    }, 300);
  }, [state.activeTimer, state.tasks, currentTask, timerInfo.isActive, isAdjusting, dispatch]);

  // Handle custom time adjustment
  const handleCustomTimeAdjustment = () => {
    const timeValue = parseInt(customTimeInput);
    if (!isNaN(timeValue)) {
      handleTimeAdjustment(timeValue);
    }
      setShowTimeAdjustment(false);
    setCustomTimeInput('');
  };

  // Circular Progress Component - Compact Design
  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress * circumference);
    
    return (
      <div className="relative w-60 h-60 flex items-center justify-center">
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-gray-100 dark:text-gray-800"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={state.preferences.accentColor}
            strokeWidth="3"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-light text-white tabular-nums tracking-tight"
               style={{ textShadow: '0 2px 16px rgba(0, 0, 0, 0.9)' }}>
            {timerInfo.remainingTime < 0 
              ? `+${formatTime(Math.abs(timerInfo.remainingTime))}`
              : formatTime(timerInfo.remainingTime)
            }
          </div>
          <div className="text-xs font-medium text-white/80 mt-1 tracking-wide uppercase"
               style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)' }}>
            {timerInfo.remainingTime < 0 ? focusView.timerStatusOverflow() : focusView.timerStatusRemaining()}
          </div>
        </div>
      </div>
    );
  };

  // Compact Time Adjustment Controls
  const TimeAdjustmentControls = () => {
    // Get current active timer task or manually selected task
    const timerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
    const taskForControls = timerTask || currentTask;
    const mostCurrentTask = taskForControls ? state.tasks.find(t => t.id === taskForControls.id) : null;
    const currentEstimatedTime = mostCurrentTask?.estimatedTime || 0;
    
    return (
      <div className="flex flex-col items-center gap-4 mb-6">
        {/* Estimated time display */}
        <div className="text-center">
          <div className="text-xs font-medium text-white/80 mb-1 tracking-wide uppercase"
               style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
            Geschätzte Zeit
          </div>
          <div className="text-xl font-light text-white tabular-nums"
               style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
              {formatTime(currentEstimatedTime * 60)}
            </div>
          </div>
          
        {/* Minimal adjustment buttons */}
        <div className="flex items-center gap-4">
          {[
            { value: -10, label: '−10' },
            { value: -5, label: '−5' },
            { value: -1, label: '−1' },
          ].map(({ value, label }) => (
          <button
              key={value}
              onClick={() => handleTimeAdjustment(value)}
              disabled={isAdjusting}
              className="w-12 h-12 rounded-full border border-white/20 hover:border-white/40 text-white hover:text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium backdrop-blur-sm bg-white/10 hover:bg-white/20"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
              title={`${Math.abs(value)} Minute${Math.abs(value) > 1 ? 'n' : ''} abziehen`}
            >
              {label}
          </button>
          ))}
          
          <div className="w-px h-8 bg-white/20 mx-2" />
          
          {[
            { value: 1, label: '+1' },
            { value: 5, label: '+5' },
            { value: 10, label: '+10' },
          ].map(({ value, label }) => (
          <button
              key={value}
              onClick={() => handleTimeAdjustment(value)}
              disabled={isAdjusting}
              className="w-12 h-12 rounded-full border border-white/20 hover:border-white/40 text-white hover:text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium backdrop-blur-sm bg-white/10 hover:bg-white/20"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
              title={focusView.addMinutes(value)}
          >
              {label}
          </button>
          ))}
        </div>
        
        {/* Custom time button */}
        <button
          onClick={() => setShowTimeAdjustment(true)}
          className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200 underline underline-offset-4"
          style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}
        >
          Benutzerdefiniert eingeben
        </button>
      </div>
    );
  };

  // Custom time input modal - Minimal design
  const CustomTimeInputModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowTimeAdjustment(false)} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-light text-gray-900 dark:text-white mb-6 text-center">
                      {focusView.adjustTime()}
        </h3>
        
        <div className="mb-6">
          <input
            type="number"
            value={customTimeInput}
            onChange={(e) => setCustomTimeInput(e.target.value)}
            placeholder="z.B. 15 oder -5"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-800 dark:text-white text-center text-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomTimeAdjustment();
              }
            }}
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {focusView.timeAdjustmentHelp()}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowTimeAdjustment(false)}
            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCustomTimeAdjustment}
            className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: state.preferences.accentColor }}
          >
            Anpassen
          </button>
        </div>
      </div>
    </div>
  );

  // Filter series tasks to show only next instance per series
  const filterSeriesTasks = (tasks: Task[]): Task[] => {
    // First, exclude all template tasks (isSeriesTemplate: true)
    const nonTemplateTasks = tasks.filter(task => !task.isSeriesTemplate);
    
    // Group tasks by their parentSeriesId
    const seriesGroups = new Map<string, Task[]>();
    const nonSeriesTasks: Task[] = [];
    
    nonTemplateTasks.forEach(task => {
      if (task.parentSeriesId) {
        if (!seriesGroups.has(task.parentSeriesId)) {
          seriesGroups.set(task.parentSeriesId, []);
        }
        seriesGroups.get(task.parentSeriesId)!.push(task);
      } else {
        nonSeriesTasks.push(task);
      }
    });
    
    // For each series, keep only the next due instance
    const nextSeriesInstances: Task[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    seriesGroups.forEach((instances, seriesId) => {
      // Sort instances by due date
      const sortedInstances = instances.sort((a, b) => {
        // Prioritize instances with dueDate set
        const aDate = a.dueDate || a.reminderDate || today;
        const bDate = b.dueDate || b.reminderDate || today;
        return aDate.localeCompare(bDate);
      });
      
      // Find the next upcoming instance (today or future)
      const upcomingInstance = sortedInstances.find(instance => {
        const instanceDate = instance.dueDate || instance.reminderDate || today;
        return instanceDate >= today;
      });
      
      // If no upcoming instance, take the most recent one
      if (upcomingInstance) {
        nextSeriesInstances.push(upcomingInstance);
      } else if (sortedInstances.length > 0) {
        nextSeriesInstances.push(sortedInstances[sortedInstances.length - 1]);
      }
    });
    
    return [...nonSeriesTasks, ...nextSeriesInstances];
  };

  // Get today's incomplete tasks or focused column tasks
  const getTodaysTasks = (): Task[] => {
    // If a specific column is focused, get tasks from that column
    if (state.focusedColumnId) {
      const focusedTasks = state.tasks.filter(task => 
        task.columnId === state.focusedColumnId && 
        !task.completed && 
        !task.archived
      );
      
      // Filter series tasks to show only next instance per series
      const filteredTasks = filterSeriesTasks(focusedTasks);
      
      // Sort by position to match the exact order from the column
      return filteredTasks.sort((a, b) => {
        // Completed tasks go to the bottom (same as TaskColumn)
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // Sort by position to maintain exact column order
        return (a.position || 0) - (b.position || 0);
      });
    }
    
    // Default behavior: get all incomplete tasks
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get all incomplete tasks
    const incompleteTasks = state.tasks.filter(task => !task.completed && !task.archived);
    
    // Filter series tasks to show only next instance per series
    const filteredTasks = filterSeriesTasks(incompleteTasks);
    
    // Sort by priority and creation date
    return filteredTasks.sort((a, b) => {
      // First sort by priority
      const priorityOrder = { high: 4, medium: 3, low: 2, none: 1 };
      const aPriority = priorityOrder[a.priority || 'none'];
      const bPriority = priorityOrder[b.priority || 'none'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Add estimated time to task
  const handleAddEstimatedTime = (taskId: string, estimatedTime: number) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        estimatedTime,
        updatedAt: new Date().toISOString()
      }
    });
  };

  // Handle time submission for task estimation
  const handleTimeSubmit = () => {
    const timeValue = parseInt(estimatedTimeInput);
    if (selectedTaskForTime && !isNaN(timeValue) && timeValue > 0) {
      handleAddEstimatedTime(selectedTaskForTime, timeValue);
      setSelectedTaskForTime(null);
      setEstimatedTimeInput('');
    }
  };

  // Start timer with selected task
  const handleStartTaskTimer = (task: Task) => {
    if (!task.estimatedTime) {
      // Don't start if no estimated time
      return;
    }

    // Set current task first to immediately show focus modal
    setIsManuallySetTask(true);
    setCurrentTask(task);
    
    // Then start timer
    const timerMode = state.preferences?.pomodoro?.enabled ? 'pomodoro' : 'normal';
    dispatch({
      type: 'START_TIMER',
      payload: { taskId: task.id, mode: timerMode }
    });
  };

  // Open task modal for editing
  const handleOpenTaskModal = (task: Task) => {
    setSelectedTaskForModal(task);
    setShowTaskModal(true);
  };

  // Close task modal
  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTaskForModal(null);
  };

  // Task Selection Component
  const TaskSelectionView = () => {
    const todaysTasks = getTodaysTasks();

    // No separate ESC handler needed - the global handler will take care of this

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'text-red-500 dark:text-red-400';
        case 'medium': return 'text-yellow-500 dark:text-yellow-400';
        case 'low': return 'text-blue-500 dark:text-blue-400';
        default: return 'text-gray-400 dark:text-gray-500';
      }
    };

    const getPriorityIcon = (priority: string) => {
      switch (priority) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🔵';
        default: return '⚪';
      }
    };

    const getPriorityBorderClass = (priority?: string) => {
      switch (priority) {
        case 'high':
          return 'border-l-red-500';
        case 'medium':
          return 'border-l-yellow-500';
        case 'low':
          return 'border-l-green-500';
        case 'none':
          return 'border-l-gray-400';
        default:
          return 'border-l-gray-300 dark:border-l-gray-600';
      }
    };

    // Check if a timer is running for a specific task
    const isTimerRunning = (taskId: string): boolean => {
      return state.activeTimer?.taskId === taskId && state.activeTimer?.isActive;
    };

    const isTimerPaused = (taskId: string): boolean => {
      return state.activeTimer?.taskId === taskId && state.activeTimer?.isActive && state.activeTimer?.isPaused;
    };

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className={`rounded-3xl p-12 shadow-2xl border ${
          state.preferences.minimalDesign
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'backdrop-blur-2xl border-white/20'
        }`}
             style={!state.preferences.minimalDesign ? {
               background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2))',
               boxShadow: '0 32px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
             } : {}}>
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className={`text-xs font-medium tracking-[0.2em] mb-6 uppercase ${
              state.preferences.minimalDesign
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-white/90'
            }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.8)' }}>
              {focusView.focusMode()}
            </div>
            
            <h1 className={`text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-4 ${
              state.preferences.minimalDesign
                ? 'text-gray-900 dark:text-white'
                : 'text-white'
            }`}
                style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
              {state.focusedColumnId ? (
                (() => {
                  const column = state.columns.find(col => col.id === state.focusedColumnId);
                  if (column?.id.startsWith('date-')) {
                    const dateString = column.id.replace('date-', '');
                    const date = new Date(dateString + 'T00:00:00');
                    return format(date, 'EEEE, d. MMMM', { locale: de });
                  }
                  return column ? column.title : focusView.selectTask();
                })()
              ) : (
                focusView.selectTask()
              )}
            </h1>
            
            <p className={`text-lg font-medium max-w-2xl mx-auto leading-relaxed ${
              state.preferences.minimalDesign
                ? 'text-gray-600 dark:text-gray-300'
                : 'text-white/95'
            }`}
               style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
              {state.focusedColumnId ? (
                (() => {
                  const result = focusView.tasksFromColumn(todaysTasks.length);
                  // Fallback if translation doesn't work - replace {count} manually
                  if (result.includes('{count}')) {
                    return result.replace('{count}', todaysTasks.length.toString());
                  }
                  return result;
                })()
              ) : (
                focusView.selectTaskInstruction()
              )}
            </p>
            
            {/* ESC Key Hint */}
            <div className="mt-6">
              <p className={`text-sm font-medium ${
                state.preferences.minimalDesign
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-white/80'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.7)' }}>
                <kbd className={`px-3 py-1.5 text-xs rounded font-semibold ${
                  state.preferences.minimalDesign
                    ? 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white'
                }`}
                     style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.8)' }}>ESC</kbd>
                {' '}{focusView.toExit()}
              </p>
            </div>
          </div>

          {/* Tasks List */}
          {todaysTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className={`w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center ${
                state.preferences.minimalDesign
                  ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30'
              }`}>
                <Check className={`w-8 h-8 ${
                  state.preferences.minimalDesign
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-white'
                }`} style={{ filter: state.preferences.minimalDesign ? 'none' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' }} />
              </div>
              <h3 className={`text-xl font-semibold mb-4 ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}
                  style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.9)' }}>
                {focusView.allTasksCompleted()}
              </h3>
              <p className={`mb-8 font-medium ${
                state.preferences.minimalDesign
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-white/90'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
                {focusView.allTasksFinished()}
              </p>
              <button
                onClick={handleExit}
                className={`px-8 py-3 text-white rounded-lg font-semibold transition-all duration-200 hover:opacity-90 ${
                  state.preferences.minimalDesign
                    ? 'shadow-lg border border-gray-200 dark:border-gray-700'
                    : 'backdrop-blur-sm border border-white/20'
                }`}
                style={{ 
                  backgroundColor: state.preferences.accentColor,
                  textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                  boxShadow: state.preferences.minimalDesign 
                    ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                    : '0 4px 16px rgba(0, 0, 0, 0.3)'
                }}
              >
                {focusView.backToOverview()}
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todaysTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className={`group relative flex items-center rounded-lg border transition-all duration-200 hover:shadow-md border-l-4 ${getPriorityBorderClass(task.priority)} ${isTimerRunning(task.id) ? 'ring-2 ring-offset-1' : ''} ${
                    state.preferences.minimalDesign 
                      ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      : 'backdrop-blur-sm'
                  }`}
                  style={{ 
                    minHeight: '50px', 
                    maxHeight: '50px',
                    ...(state.preferences.minimalDesign ? {} : {
                      background: isTimerRunning(task.id) 
                        ? (isTimerPaused(task.id) ? 'rgba(255, 193, 7, 0.15)' : `${state.preferences.accentColor}15`)
                        : 'rgba(255, 255, 255, 0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }),
                    ...(isTimerRunning(task.id) ? { 
                      ringColor: state.preferences.accentColor + '50'
                    } : {})
                  }}
                >
                  {/* Timer Status Indicator */}
                  {isTimerRunning(task.id) && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <div 
                        className={`w-3 h-3 rounded-full ${isTimerPaused(task.id) ? 'bg-yellow-500' : 'bg-green-500'} shadow-sm`}
                        style={{
                          backgroundColor: isTimerPaused(task.id) ? '#f59e0b' : state.preferences.accentColor,
                          animation: isTimerPaused(task.id) ? 'none' : 'pulse 2s infinite'
                        }}
                      />
                    </div>
                  )}

                  {/* Hauptinhalt */}
                  <div className="flex-1 min-w-0 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          {/* Timer Status Text Indicator */}
                          {isTimerRunning(task.id) && (
                            <div className="flex items-center gap-1 mr-2">
                              {isTimerPaused(task.id) ? (
                                <Pause className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: state.preferences.accentColor }}>
                                  <div className="w-full h-full rounded-full animate-pulse" style={{ backgroundColor: state.preferences.accentColor }}></div>
                                </div>
                              )}
                              <span className="text-xs font-semibold text-white" 
                                    style={{ 
                                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                                      ...(isTimerPaused(task.id) ? { color: '#fbbf24' } : { color: state.preferences.accentColor })
                                    }}>
                                {isTimerPaused(task.id) ? focusView.timerStatusPaused() : focusView.timerStatusRunning()}
                              </span>
                            </div>
                          )}

                          <h3 
                            className="text-sm font-semibold truncate text-white" 
                            style={{ 
                              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                              ...(isTimerRunning(task.id) && !isTimerPaused(task.id) ? { 
                                color: state.preferences.accentColor,
                                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))'
                              } : {})
                            }}
                          >
                            {task.title}
                          </h3>
                          
                          {/* Nur geschätzte Zeit anzeigen, falls vorhanden */}
                          {task.estimatedTime && task.estimatedTime > 0 && (
                            <span className="flex items-center gap-1 text-xs text-white/80 font-medium"
                                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}>
                              <Timer className="w-3 h-3" style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.7))' }} />
                              {Math.floor(task.estimatedTime / 60) > 0 && `${Math.floor(task.estimatedTime / 60)}h `}
                              {(task.estimatedTime % 60) > 0 && `${task.estimatedTime % 60}min`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">


                        {isTimerRunning(task.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsManuallySetTask(true);
                              setCurrentTask(task);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-white rounded text-xs font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 backdrop-blur-sm border border-white/20"
                            style={{ 
                              backgroundColor: state.preferences.accentColor,
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            <Eye className="w-3 h-3" style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5))' }} />
                            Anzeigen
                          </button>
                        ) : !task.estimatedTime ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskForTime(task.id);
                            }}
                            className="px-2 py-1 text-xs font-semibold border rounded transition-all duration-200 hover:scale-105 text-white backdrop-blur-sm"
                            style={{
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                            }}
                          >
                            {focusView.estimateTime()}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTaskTimer(task);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-white rounded text-xs font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 backdrop-blur-sm border border-white/20"
                            style={{ 
                              backgroundColor: state.preferences.accentColor,
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            <Play className="w-3 h-3" style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5))' }} />
                            Starten
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {todaysTasks.length > 10 && (
            <div className="text-center mt-6">
              <p className="text-sm text-white/80 font-medium"
                 style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
                {(() => {
                  const count = todaysTasks.length - 10;
                  const result = focusView.moreTasks(count);
                  // Fallback if translation doesn't work - replace {count} manually
                  if (result.includes('{count}')) {
                    return result.replace('{count}', count.toString());
                  }
                  return result;
                })()}
              </p>
            </div>
          )}

          {/* Time Estimation Modal */}
          {selectedTaskForTime && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedTaskForTime(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-light text-gray-900 dark:text-white mb-6 text-center">
                    {focusView.addEstimatedTime()}
                </h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {focusView.timeInMinutes()}
                  </label>
                  <input
                    type="number"
                    value={estimatedTimeInput}
                    onChange={(e) => setEstimatedTimeInput(e.target.value)}
                    placeholder="z.B. 30"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-800 dark:text-white text-center text-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTimeSubmit();
                      }
                    }}
                    autoFocus
                  />
                  
                  {/* Quick time buttons */}
                  <div className="flex gap-2 mt-4 flex-wrap justify-center">
                    {[15, 30, 45, 60, 90, 120].map(minutes => (
                      <button
                        key={minutes}
                        onClick={() => setEstimatedTimeInput(minutes.toString())}
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                      >
                        {minutes}min
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedTaskForTime(null)}
                    className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm font-medium"
                  >
                    {focusView.cancel()}
                  </button>
                  <button
                    onClick={handleTimeSubmit}
                    disabled={!estimatedTimeInput || parseInt(estimatedTimeInput) <= 0}
                    className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    {focusView.add()}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get background styles - only use in glassmorphism mode
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const backgroundStyles = state.preferences.minimalDesign 
    ? (isDarkMode ? { backgroundColor: '#111827' } : { backgroundColor: '#ffffff' })
    : (isDarkMode 
    ? getDarkModeBackgroundStyles(state.preferences)
        : getBackgroundStyles(state.preferences));

  // Determine what to show: If timer is active, always show the timer task, otherwise show task selection
  const activeTimerTask = state.activeTimer?.taskId ? state.tasks.find(t => t.id === state.activeTimer.taskId && !t.completed) : null;
  const shouldShowTaskSelection = !activeTimerTask && !currentTask;

  // Render task selection when no active timer and no manual task selection
  if (shouldShowTaskSelection) {
    return (
      <div className={`h-full flex items-center justify-center p-8 relative ${
        state.preferences.minimalDesign
          ? 'bg-white dark:bg-gray-900'
          : ''
      }`} style={backgroundStyles}>
        <button
          onClick={handleExit}
          className={`fixed top-8 right-8 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-105 z-50 ${
            state.preferences.minimalDesign
              ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg'
              : 'border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm'
          }`}
          title="Verlassen (ESC)"
        >
          <X className={`w-5 h-5 ${
            state.preferences.minimalDesign
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-white'
          }`} />
        </button>
        
        <TaskSelectionView />
      </div>
    );
  }

  // Use active timer task if available, otherwise use current task
  const displayTask = activeTimerTask || currentTask;

  return (
    <div className={`h-full flex items-center justify-center p-8 relative ${
      state.preferences.minimalDesign
        ? 'bg-white dark:bg-gray-900'
        : ''
    }`} style={backgroundStyles}>
      
      {/* Auto-Progress Notification */}
      {autoProgressMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: state.preferences.accentColor }}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{autoProgressMessage}</span>
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>
      )}
      
      {/* Minimal Exit Button */}
      <button
        onClick={handleExit}
        className={`fixed top-8 right-8 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-105 z-50 ${
          state.preferences.minimalDesign
            ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg'
            : 'border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm'
        }`}
                  title={focusView.exitFocusMode()}
      >
        <X className={`w-5 h-5 ${
          state.preferences.minimalDesign
            ? 'text-gray-700 dark:text-gray-300'
            : 'text-white'
        }`} />
      </button>

      {/* Main Focus Card - Compact Design */}
      <div className={`w-full max-w-3xl mx-auto transition-all duration-700 ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
                  <div className={`rounded-3xl p-8 shadow-2xl border ${
                    state.preferences.minimalDesign
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'backdrop-blur-2xl bg-white/20 dark:bg-gray-900/20 border-white/20 dark:border-gray-700/20'
                  }`}>
          
          {/* Compact Header */}
          <div className="text-center mb-8">
            <div className={`text-xs font-medium tracking-[0.2em] mb-3 uppercase ${
              state.preferences.minimalDesign
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-white'
            }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
              {focusView.focusMode()}
            </div>
            
            <h1 
              onClick={() => handleOpenTaskModal(displayTask!)}
              className={`text-2xl md:text-3xl font-light leading-tight cursor-pointer hover:opacity-70 transition-opacity duration-300 tracking-tight ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}
              style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 12px rgba(0, 0, 0, 0.9)' }}
            >
              {displayTask!.title}
            </h1>
            
            {displayTask!.description && (
              <div className={`text-sm font-light mt-3 max-w-xl mx-auto leading-relaxed prose prose-sm max-w-none ${
                state.preferences.minimalDesign
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-white/90'
              }`}
                style={{ 
                  textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 6px rgba(0, 0, 0, 0.7)', 
                  color: 'inherit' 
                }}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a 
                        {...props} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:opacity-80 transition-opacity"
                        style={{ color: state.preferences.accentColor }}
                      />
                    ),
                    input: ({ node, ...props }) => (
                      <input 
                        {...props} 
                        className="mr-2"
                        style={{ accentColor: state.preferences.accentColor }}
                        disabled={false}
                      />
                    )
                  }}
                >
                  {displayTask!.description}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Compact Circular Timer */}
          <div className="flex justify-center mb-8">
            <CircularProgress progress={timerInfo.progress} />
          </div>

          {/* Compact Time Controls */}
          <TimeAdjustmentControls />

          {/* Compact Stats */}
          <div className="flex justify-center gap-8 text-center mb-8">
            <div>
              <div className={`text-xs font-medium mb-1 tracking-wide uppercase ${
                state.preferences.minimalDesign
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-white/80'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.8)' }}>Vergangen</div>
              <div className={`text-lg font-light tabular-nums ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
                {formatTime(timerInfo.elapsedTime)}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 tracking-wide uppercase ${
                state.preferences.minimalDesign
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-white/80'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.8)' }}>Fortschritt</div>
              <div className={`text-lg font-light tabular-nums ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
                {Math.round(timerInfo.progress * 100)}%
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 tracking-wide uppercase ${
                state.preferences.minimalDesign
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-white/80'
              }`}
                 style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.8)' }}>Geplant</div>
              <div className={`text-lg font-light tabular-nums ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}
                     style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
                {formatTime(timerInfo.totalTime)}
              </div>
            </div>
          </div>

          {/* Overtime Warning - Compact */}
          {timerInfo.remainingTime < 0 && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
              <div className="text-center text-red-600 dark:text-red-400 text-sm font-medium">
                {focusView.timeExceeded({ time: formatTime(Math.abs(timerInfo.remainingTime)) })}
              </div>
            </div>
          )}

          {/* Compact Controls */}
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={handleStopTimer}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                state.preferences.minimalDesign
                  ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-sm'
                  : 'border-white/20 hover:border-white/40 text-white hover:text-white backdrop-blur-sm bg-white/10 hover:bg-white/20'
              }`}
              style={{ filter: state.preferences.minimalDesign ? 'none' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            >
              <Square className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleTimerToggle}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg"
              style={{ 
                backgroundColor: state.preferences.accentColor,
                boxShadow: `0 6px 24px ${state.preferences.accentColor}20`
              }}
            >
              {timerInfo.isActive && !timerInfo.isPaused ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            
            <button
              onClick={handleCompleteTask}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                state.preferences.minimalDesign
                  ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                  : 'border-white/20 hover:border-white/40 text-white hover:text-white backdrop-blur-sm bg-white/10 hover:bg-white/20'
              }`}
              style={{ filter: state.preferences.minimalDesign ? 'none' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Exit Hint */}
          <div className="text-center mt-6">
            <p className={`text-xs font-light ${
              state.preferences.minimalDesign
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-white/60'
            }`}
               style={{ textShadow: state.preferences.minimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)' }}>
              {focusView.keyboardShortcuts()}
            </p>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (selectedTaskForModal || displayTask) && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999999 }}
        >
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
            onClick={handleCloseTaskModal} 
          />
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ zIndex: 10000000 }}
          >
            <TaskModal
              isOpen={showTaskModal}
              task={selectedTaskForModal || displayTask!}
              onClose={handleCloseTaskModal}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Custom Time Input Modal */}
      {showTimeAdjustment && <CustomTimeInputModal />}
    </div>
  );
} 