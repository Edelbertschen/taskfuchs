import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Check, 
  Archive, 
  Inbox, 
  Sun,
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type View = 'today' | 'inbox';

export function MobileShell() {
  const { state, dispatch } = useApp();
  const [activeView, setActiveView] = useState<View>('today');
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);
  const [archivedAnimation, setArchivedAnimation] = useState<string | null>(null);

  // Design Settings from Online App
  const accent = state.preferences.accentColor || '#f97316';
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const backgroundType = state.preferences.backgroundType;
  const backgroundImage = state.preferences.backgroundImage;
  const backgroundColor = state.preferences.backgroundColor;
  const gradientFrom = state.preferences.gradientFrom;
  const gradientTo = state.preferences.gradientTo;
  const gradientDirection = state.preferences.gradientDirection || 'to bottom right';

  // Auto-focus input when adding task
  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  // Get today's date column ID
  const todayId = `date-${format(new Date(), 'yyyy-MM-dd')}`;

  // Filter settings from online app
  const activeTagFilters = state.activeTagFilters || [];
  const activePriorityFilters = state.activePriorityFilters || [];
  const showCompletedTasks = state.showCompletedTasks;
  
  // Check if any filters are active
  const hasActiveFilters = activeTagFilters.length > 0 || activePriorityFilters.length > 0;

  // Apply filters to tasks
  const applyFilters = useCallback((tasks: Task[]) => {
    return tasks.filter(task => {
      // Completed filter
      if (!showCompletedTasks && task.completed) return false;
      
      // Archived filter - always hide archived
      if (task.archived) return false;
      
      // Priority filter
      if (activePriorityFilters.length > 0) {
        const taskPriority = task.priority || 'none';
        if (!activePriorityFilters.includes(taskPriority)) return false;
      }
      
      // Tag filter
      if (activeTagFilters.length > 0) {
        const hasMatchingTag = activeTagFilters.some(filterTag => 
          task.tags.includes(filterTag)
        );
        if (!hasMatchingTag) return false;
      }
      
      return true;
    });
  }, [activeTagFilters, activePriorityFilters, showCompletedTasks]);

  // Get tasks for each view with filters applied
  const todayTasks = applyFilters(
    state.tasks.filter(t => t.columnId === todayId)
  ).sort((a, b) => {
    // Completed tasks at bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.position || 0) - (b.position || 0);
  });

  const inboxTasks = applyFilters(
    state.tasks.filter(t => t.columnId === 'inbox')
  ).sort((a, b) => {
    // Completed tasks at bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.position || 0) - (b.position || 0);
  });

  const currentTasks = activeView === 'today' ? todayTasks : inboxTasks;

  // Count of tasks (only uncompleted for badge)
  const todayCount = todayTasks.filter(t => !t.completed).length;
  const inboxCount = inboxTasks.filter(t => !t.completed).length;

  // Handle view swipe
  const handleViewTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleViewTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || isTransitioning) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      e.preventDefault();
      // Limit swipe offset with elastic effect
      const maxOffset = window.innerWidth * 0.8;
      const resistance = 0.4;
      let offset = deltaX;
      
      // Apply resistance at boundaries
      if ((activeView === 'today' && deltaX > 0) || (activeView === 'inbox' && deltaX < 0)) {
        offset = deltaX * resistance;
      }
      
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, offset)));
    }
  };

  const handleViewTouchEnd = () => {
    if (touchStartX.current === null) return;
    
    const threshold = window.innerWidth * 0.25;
    
    if (swipeOffset < -threshold && activeView === 'today') {
      // Swipe left: go to inbox
      setIsTransitioning(true);
      setSwipeOffset(-window.innerWidth);
      setTimeout(() => {
        setActiveView('inbox');
        setSwipeOffset(0);
        setIsTransitioning(false);
      }, 300);
    } else if (swipeOffset > threshold && activeView === 'inbox') {
      // Swipe right: go to today
      setIsTransitioning(true);
      setSwipeOffset(window.innerWidth);
      setTimeout(() => {
        setActiveView('today');
        setSwipeOffset(0);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Add new task
  const handleAddTask = useCallback(() => {
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTaskText.trim(),
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: activeView === 'today' ? todayId : 'inbox',
      tags: [],
      subtasks: [],
      priority: 'medium',
      position: Date.now(),
    };

    dispatch({ type: 'ADD_TASK', payload: newTask });
    
    // Ensure date column exists for today
    if (activeView === 'today') {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: format(new Date(), 'yyyy-MM-dd') });
    }

    setNewTaskText('');
    setIsAddingTask(false);
    
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [newTaskText, activeView, todayId, dispatch]);

  // Complete/uncomplete task with animation (toggle)
  const handleCompleteTask = useCallback((taskId: string) => {
    setCompletedAnimation(taskId);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 20]);
    }
    
    setTimeout(() => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        const isNowCompleted = !task.completed;
        dispatch({
          type: 'UPDATE_TASK',
          payload: { 
            ...task, 
            completed: isNowCompleted, 
            completedAt: isNowCompleted ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          }
        });
      }
      setCompletedAnimation(null);
    }, 400);
  }, [state.tasks, dispatch]);

  // Archive task with animation
  const handleArchiveTask = useCallback((taskId: string) => {
    setArchivedAnimation(taskId);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
    
    setTimeout(() => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { 
            ...task, 
            archived: true,
            updatedAt: new Date().toISOString()
          }
        });
      }
      setArchivedAnimation(null);
    }, 400);
  }, [state.tasks, dispatch]);

  // Generate background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (backgroundType === 'image' && backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    } else if (backgroundType === 'gradient' && gradientFrom && gradientTo) {
      return {
        background: `linear-gradient(${gradientDirection}, ${gradientFrom}, ${gradientTo})`,
      };
    } else if (backgroundType === 'color' && backgroundColor) {
      return {
        backgroundColor: backgroundColor,
      };
    }
    return {};
  };

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col overflow-hidden relative"
      style={{
        ...getBackgroundStyle(),
        backgroundColor: isDarkMode ? '#0a0a0a' : '#fafafa',
      }}
    >
      {/* Background Overlay for readability */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDarkMode 
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8))'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0.7))',
        }}
      />

      {/* Header - iOS Style */}
      <header 
        className="relative z-10 flex-shrink-0 pt-safe"
        style={{
          paddingTop: 'env(safe-area-inset-top, 20px)',
        }}
      >
        <div className="px-5 pt-4 pb-2">
          {/* Greeting */}
          <p 
            className="text-sm font-medium mb-1"
            style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}
          >
            {getGreeting()}
          </p>
          
          {/* View Title */}
          <h1 
            className="text-3xl font-bold tracking-tight"
            style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
          >
            {activeView === 'today' ? 'Heute' : 'Inbox'}
          </h1>
          
          {/* Date or count indicator */}
          <p 
            className="text-sm mt-1 font-medium"
            style={{ color: accent }}
          >
            {activeView === 'today' 
              ? format(new Date(), 'EEEE, d. MMMM', { locale: de })
              : `${inboxCount} ${inboxCount === 1 ? 'Aufgabe' : 'Aufgaben'}`
            }
          </p>
          
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${accent}15`,
                  color: accent,
                }}
              >
                <Filter className="w-3 h-3" />
                <span>Filter aktiv</span>
              </div>
              
              {/* Show active priority filters */}
              {activePriorityFilters.map(priority => (
                <span 
                  key={priority}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 
                                     priority === 'medium' ? 'rgba(251, 191, 36, 0.15)' :
                                     priority === 'low' ? 'rgba(59, 130, 246, 0.15)' :
                                     'rgba(156, 163, 175, 0.15)',
                    color: priority === 'high' ? '#ef4444' : 
                           priority === 'medium' ? '#f59e0b' :
                           priority === 'low' ? '#3b82f6' :
                           '#9ca3af',
                  }}
                >
                  {priority === 'high' ? '🔴 Hoch' : 
                   priority === 'medium' ? '🟡 Mittel' : 
                   priority === 'low' ? '🔵 Niedrig' : 
                   '⚪ Keine'}
                </span>
              ))}
              
              {/* Show active tag filters */}
              {activeTagFilters.slice(0, 3).map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${accent}15`,
                    color: accent,
                  }}
                >
                  #{tag}
                </span>
              ))}
              {activeTagFilters.length > 3 && (
                <span 
                  className="text-xs font-medium"
                  style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                >
                  +{activeTagFilters.length - 3} mehr
                </span>
              )}
            </div>
          )}
        </div>

        {/* View Switcher Pills */}
        <div className="px-5 py-3">
          <div 
            className="flex rounded-2xl p-1 gap-1"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <button
              onClick={() => setActiveView('today')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                backgroundColor: activeView === 'today' ? accent : 'transparent',
                color: activeView === 'today' ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                boxShadow: activeView === 'today' ? `0 4px 12px ${accent}40` : 'none',
              }}
            >
              <Sun className="w-4 h-4" />
              <span>Heute</span>
              {todayCount > 0 && (
                <span 
                  className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: activeView === 'today' ? 'rgba(255,255,255,0.25)' : `${accent}20`,
                    color: activeView === 'today' ? '#fff' : accent,
                  }}
                >
                  {todayCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveView('inbox')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                backgroundColor: activeView === 'inbox' ? accent : 'transparent',
                color: activeView === 'inbox' ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                boxShadow: activeView === 'inbox' ? `0 4px 12px ${accent}40` : 'none',
              }}
            >
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
              {inboxCount > 0 && (
                <span 
                  className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: activeView === 'inbox' ? 'rgba(255,255,255,0.25)' : `${accent}20`,
                    color: activeView === 'inbox' ? '#fff' : accent,
                  }}
                >
                  {inboxCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Task List - Swipeable Container */}
      <div 
        ref={containerRef}
        className="relative z-10 flex-1 overflow-hidden"
        onTouchStart={handleViewTouchStart}
        onTouchMove={handleViewTouchMove}
        onTouchEnd={handleViewTouchEnd}
      >
        <div 
          className="h-full overflow-y-auto px-5 pb-32"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isTransitioning || touchStartX.current === null ? 'transform 300ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
          }}
        >
          {/* Task Cards */}
          <div className="space-y-3 pt-2">
            {currentTasks.map((task, index) => (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                accent={accent}
                isDarkMode={isDarkMode}
                onComplete={() => handleCompleteTask(task.id)}
                onArchive={() => handleArchiveTask(task.id)}
                isCompletingAnimation={completedAnimation === task.id}
                isArchivingAnimation={archivedAnimation === task.id}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              />
            ))}
          </div>

          {/* Empty State */}
          {currentTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${accent}15` }}
              >
                {activeView === 'today' ? (
                  <Sparkles className="w-10 h-10" style={{ color: accent }} />
                ) : (
                  <Inbox className="w-10 h-10" style={{ color: accent }} />
                )}
              </div>
              <p 
                className="text-lg font-semibold mb-1"
                style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
              >
                {activeView === 'today' ? 'Alles erledigt!' : 'Inbox ist leer'}
              </p>
              <p 
                className="text-sm"
                style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
              >
                {activeView === 'today' 
                  ? 'Genieße deinen freien Tag 🦊' 
                  : 'Tippe +, um eine neue Aufgabe hinzuzufügen'}
              </p>
            </div>
          )}

          {/* Swipe Hint Indicator */}
          <div className="flex justify-center mt-8 pb-4">
            <div className="flex gap-2">
              <div 
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: activeView === 'today' ? accent : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                  transform: activeView === 'today' ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              <div 
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: activeView === 'inbox' ? accent : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                  transform: activeView === 'inbox' ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Input Overlay */}
      {isAddingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddingTask(false);
              setNewTaskText('');
            }
          }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          
          {/* Input Sheet */}
          <div 
            className="relative w-full rounded-t-3xl overflow-hidden animate-slide-up"
            style={{
              backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div 
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}
              />
            </div>
            
            {/* Input Area */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: accent }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask();
                    if (e.key === 'Escape') {
                      setIsAddingTask(false);
                      setNewTaskText('');
                    }
                  }}
                  placeholder={activeView === 'today' ? 'Was steht heute an?' : 'Neue Aufgabe...'}
                  className="flex-1 text-lg bg-transparent border-none outline-none"
                  style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
                  autoFocus
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <span 
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ 
                      backgroundColor: `${accent}15`,
                      color: accent,
                    }}
                  >
                    {activeView === 'today' ? '📅 Heute' : '📥 Inbox'}
                  </span>
                </div>
                
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskText.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                  style={{
                    backgroundColor: accent,
                    color: '#fff',
                    boxShadow: newTaskText.trim() ? `0 4px 12px ${accent}40` : 'none',
                  }}
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddingTask(true)}
        className="fixed z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95"
        style={{
          right: '20px',
          bottom: 'calc(env(safe-area-inset-bottom, 20px) + 20px)',
          backgroundColor: accent,
          boxShadow: `0 8px 24px ${accent}50`,
        }}
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>

      {/* TaskFuchs Branding */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-2 pointer-events-none"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)',
        }}
      >
        <span 
          className="text-xs font-medium tracking-wide"
          style={{ color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }}
        >
          🦊 TaskFuchs Companion
        </span>
        {hasActiveFilters && (
          <span 
            className="text-[10px] mt-0.5"
            style={{ color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}
          >
            Filter aus Online-App aktiv
          </span>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-out-right {
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes slide-out-left {
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }
        
        @keyframes fade-in-up {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 300ms cubic-bezier(0.2, 0, 0, 1);
        }
        
        .animate-slide-out-right {
          animation: slide-out-right 400ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        
        .animate-slide-out-left {
          animation: slide-out-left 400ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 400ms cubic-bezier(0.2, 0, 0, 1) both;
        }
      `}</style>
    </div>
  );
}

// Swipeable Task Card Component
interface SwipeableTaskCardProps {
  task: Task;
  accent: string;
  isDarkMode: boolean;
  onComplete: () => void;
  onArchive: () => void;
  isCompletingAnimation: boolean;
  isArchivingAnimation: boolean;
  style?: React.CSSProperties;
}

function SwipeableTaskCard({
  task,
  accent,
  isDarkMode,
  onComplete,
  onArchive,
  isCompletingAnimation,
  isArchivingAnimation,
  style,
}: SwipeableTaskCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isVerticalScroll = useRef(false);
  
  const SWIPE_THRESHOLD = 80;
  const MAX_OFFSET = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isVerticalScroll.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Determine if this is a vertical scroll
    if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
      isVerticalScroll.current = true;
      return;
    }
    
    if (isVerticalScroll.current) return;
    
    e.preventDefault();
    
    // Apply elastic resistance at boundaries
    let offset = deltaX;
    if (Math.abs(offset) > MAX_OFFSET) {
      const excess = Math.abs(offset) - MAX_OFFSET;
      offset = Math.sign(offset) * (MAX_OFFSET + excess * 0.2);
    }
    
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (swipeOffset > SWIPE_THRESHOLD) {
      // Swipe right: complete (or uncomplete if already completed)
      onComplete();
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      // Swipe left: archive
      onArchive();
    }
    
    setSwipeOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };
  
  // Determine swipe actions based on task state
  const rightAction = task.completed ? 'Wiederherstellen' : 'Erledigen';
  const rightColor = task.completed ? '#f59e0b' : '#22c55e'; // amber for restore, green for complete

  // Animation class
  const animationClass = isCompletingAnimation 
    ? 'animate-slide-out-right' 
    : isArchivingAnimation 
    ? 'animate-slide-out-left' 
    : 'animate-fade-in-up';

  // Progress indicators
  const completeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);
  const archiveProgress = Math.min(-swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl ${animationClass}`}
      style={style}
    >
      {/* Action Indicators */}
      <div className="absolute inset-0 flex">
        {/* Complete/Restore - Left side revealed on swipe right */}
        <div 
          className="absolute inset-y-0 left-0 flex items-center pl-5 transition-opacity"
          style={{ 
            opacity: completeProgress,
            backgroundColor: rightColor,
            width: Math.max(swipeOffset, 0),
          }}
        >
          <Check 
            className="w-6 h-6 text-white" 
            style={{ 
              transform: `scale(${0.5 + completeProgress * 0.5})`,
              opacity: completeProgress,
            }}
          />
        </div>
        
        {/* Archive (Red) - Right side revealed on swipe left */}
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 transition-opacity"
          style={{ 
            opacity: archiveProgress,
            backgroundColor: '#ef4444',
            width: Math.max(-swipeOffset, 0),
          }}
        >
          <Archive 
            className="w-6 h-6 text-white" 
            style={{ 
              transform: `scale(${0.5 + archiveProgress * 0.5})`,
              opacity: archiveProgress,
            }}
          />
        </div>
      </div>

      {/* Card Content */}
      <div
        className="relative rounded-2xl p-4"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: isDarkMode 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
            : '0 4px 16px rgba(0,0,0,0.08)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onComplete}
            className="flex-shrink-0 mt-0.5"
          >
            <div 
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
              style={{ 
                borderColor: task.completed ? '#22c55e' : accent,
                backgroundColor: task.completed ? '#22c55e' : 'transparent',
              }}
            >
              {task.completed && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p 
              className={`text-base font-medium leading-snug transition-all duration-200 ${
                task.completed ? 'line-through opacity-50' : ''
              }`}
              style={{ color: isDarkMode ? '#fff' : '#1a1a1a' }}
            >
              {task.title}
            </p>
            
            {/* Meta info */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.priority && task.priority !== 'none' && task.priority !== 'medium' && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: task.priority === 'high' 
                      ? 'rgba(239, 68, 68, 0.15)' 
                      : 'rgba(59, 130, 246, 0.15)',
                    color: task.priority === 'high' ? '#ef4444' : '#3b82f6',
                  }}
                >
                  {task.priority === 'high' ? '🔴 Hoch' : '🔵 Niedrig'}
                </span>
              )}
              
              {task.estimatedTime && task.estimatedTime > 0 && (
                <span 
                  className="text-xs font-medium"
                  style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                >
                  ⏱ {task.estimatedTime}min
                </span>
              )}
              
              {task.tags.length > 0 && (
                <span 
                  className="text-xs font-medium"
                  style={{ color: accent }}
                >
                  #{task.tags[0]}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Swipe Hint on first card */}
        {swipeOffset !== 0 && (
          <div 
            className="absolute inset-x-0 bottom-0 text-center text-xs pb-1 transition-opacity"
            style={{ 
              color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
              opacity: Math.abs(swipeOffset) > 20 ? 0 : 1,
            }}
          >
            {swipeOffset > 0 ? `→ ${rightAction}` : '← Archivieren'}
          </div>
        )}
      </div>
    </div>
  );
}
