import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Check, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

type View = 'planner' | 'inbox';

export function MobileShell() {
  const { state, dispatch } = useApp();
  const [view, setView] = useState<View>('planner');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newTaskText, setNewTaskText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accent = state.preferences.accentColor || '#f97316';

  // Auto-focus when input is shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  // Get tasks for current view
  const currentDayId = `date-${format(currentDate, 'yyyy-MM-dd')}`;
  const plannerTasks = state.tasks
    .filter(t => !t.completed && !t.archived && t.columnId === currentDayId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const inboxTasks = state.tasks
    .filter(t => !t.completed && !t.archived && t.columnId === 'inbox')
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const tasks = view === 'planner' ? plannerTasks : inboxTasks;

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (view === 'planner') {
        // Swipe between days
        if (deltaX > 0) {
          // Swipe right -> previous day
          setCurrentDate(prev => addDays(prev, -1));
        } else {
          // Swipe left -> next day
          setCurrentDate(prev => addDays(prev, 1));
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Add new task
  const handleAddTask = () => {
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString() + Math.random(),
      title: newTaskText.trim(),
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: view === 'planner' ? currentDayId : 'inbox',
      tags: [],
      subtasks: [],
      priority: 'medium',
      position: Date.now(),
    };

    dispatch({ type: 'ADD_TASK', payload: newTask });
    
    // Ensure date column exists
    if (view === 'planner') {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: format(currentDate, 'yyyy-MM-dd') });
    }

    setNewTaskText('');
    setShowInput(false);
  };

  // Complete task
  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: true, completedAt: new Date().toISOString() }
      });
    }
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  };

  // Format date header
  const dateHeader = () => {
    if (view === 'inbox') return 'Inbox';
    
    const today = startOfDay(new Date());
    if (isSameDay(currentDate, today)) return 'Heute';
    if (isSameDay(currentDate, addDays(today, 1))) return 'Morgen';
    if (isSameDay(currentDate, addDays(today, -1))) return 'Gestern';
    
    return format(currentDate, 'EEEE, d. MMMM', { locale: de });
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Minimalistic Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 text-gray-600 dark:text-gray-400"
        >
          <Menu className="w-5 h-5" />
        </button>

        {view === 'planner' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, -1))}
              className="p-1 text-gray-500 dark:text-gray-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-medium text-gray-900 dark:text-white min-w-[200px] text-center">
              {dateHeader()}
            </h1>
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, 1))}
              className="p-1 text-gray-500 dark:text-gray-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {view === 'inbox' && (
          <h1 className="text-base font-medium text-gray-900 dark:text-white">
            {dateHeader()}
          </h1>
        )}

        <div className="w-9" /> {/* Spacer for alignment */}
      </header>

      {/* Task List */}
      <div
        className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              accent={accent}
            />
          ))}
        </div>

        {/* Add Task Input */}
        {showInput ? (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTask();
              }}
              className="flex items-center space-x-2"
            >
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="flex-shrink-0 w-5 h-5 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Neue Aufgabe..."
                className="flex-1 text-base bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              {newTaskText.trim() && (
                <button
                  type="submit"
                  className="flex-shrink-0 text-sm font-medium"
                  style={{ color: accent }}
                >
                  Fertig
                </button>
              )}
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full px-4 py-3 text-left text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            + Neue Aufgabe
          </button>
        )}

        {/* Empty State */}
        {tasks.length === 0 && !showInput && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              {view === 'planner' ? 'Keine Aufgaben für diesen Tag' : 'Inbox ist leer'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="flex border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setView('planner')}
          className="flex-1 py-3 text-sm font-medium transition-colors"
          style={{
            color: view === 'planner' ? accent : '#9ca3af',
            borderTop: view === 'planner' ? `2px solid ${accent}` : '2px solid transparent'
          }}
        >
          Planer
        </button>
        <button
          onClick={() => setView('inbox')}
          className="flex-1 py-3 text-sm font-medium transition-colors"
          style={{
            color: view === 'inbox' ? accent : '#9ca3af',
            borderTop: view === 'inbox' ? `2px solid ${accent}` : '2px solid transparent'
          }}
        >
          Inbox
        </button>
      </nav>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowInput(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-50"
        style={{ backgroundColor: accent }}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-white dark:bg-gray-900 shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                TaskFuchs
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mobile Edition
              </p>
            </div>

            <nav className="flex-1 py-4">
              <button
                onClick={() => {
                  setView('planner');
                  setCurrentDate(new Date());
                  setMenuOpen(false);
                }}
                className="w-full px-6 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Heute
              </button>
              <button
                onClick={() => {
                  setView('inbox');
                  setMenuOpen(false);
                }}
                className="w-full px-6 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Inbox
              </button>
            </nav>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Version 1.0 Mobile
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal Task Row Component (TeuxDeux style)
interface TaskRowProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  accent: string;
}

function TaskRow({ task, onComplete, onDelete, accent }: TaskRowProps) {
  const [showActions, setShowActions] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    // Swipe left to show delete
    if (deltaX < -50) {
      setShowActions(true);
    } else if (deltaX > 50) {
      setShowActions(false);
    }

    touchStartX.current = null;
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete Action (revealed on swipe) */}
      {showActions && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 bg-red-500">
          <button
            onClick={() => onDelete(task.id)}
            className="text-white text-sm font-medium"
          >
            Löschen
          </button>
        </div>
      )}

      {/* Task Content */}
      <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-900">
        <button
          onClick={() => onComplete(task.id)}
          className="flex-shrink-0 mr-3"
        >
          <div
            className="w-5 h-5 rounded border-2 flex items-center justify-center"
            style={{ borderColor: accent }}
          >
            {task.completed && <Check className="w-3 h-3" style={{ color: accent }} />}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-base ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {task.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
