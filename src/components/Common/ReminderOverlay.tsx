import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, Check, Timer, AlertCircle, ChevronDown, ExternalLink } from 'lucide-react';
import { Task } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';

interface ReminderOverlayProps {
  task: Task;
  isVisible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
  onTaskClick?: (task: Task) => void;
}

export function ReminderOverlay({ task, isVisible, onDismiss, onComplete, onSnooze, onTaskClick }: ReminderOverlayProps) {
  const { state } = useApp();
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  if (!isVisible) return null;

  const accentColor = state.preferences.accentColor;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-red-600';
      case 'medium': return 'from-yellow-500 to-yellow-600'; 
      case 'low': return 'from-green-500 to-green-600';
      case 'none': return 'from-gray-500 to-gray-600';
      default: return 'accent-gradient';
    }
  };

  const getBackgroundGradient = (priority?: string): string => {
    switch (priority) {
      case 'high': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'medium': return 'linear-gradient(135deg, #eab308, #ca8a04)';
      case 'low': return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case 'none': return 'linear-gradient(135deg, #6b7280, #4b5563)';
      default: return `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    return priority === 'high' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />;
  };

  const snoozeOptions = [
    { minutes: 5, label: '5 Min' },
    { minutes: 10, label: '10 Min' },
    { minutes: 15, label: '15 Min' },
    { minutes: 30, label: '30 Min' },
    { minutes: 60, label: '1 Std' },
    { minutes: 120, label: '2 Std' },
    { minutes: 1440, label: '1 Tag' },
  ];

  const handleTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1900] pointer-events-none" style={{ isolation: 'isolate' }}>
      <div className="fixed top-6 right-6 pointer-events-auto animate-in slide-in-from-right duration-300">
        <div 
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-96 max-w-[calc(100vw-3rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Header */}
          <div 
            className="p-4 text-white relative overflow-hidden"
            style={{
              background: task.priority && task.priority !== 'none' 
                ? getBackgroundGradient(task.priority)
                : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
            }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 bg-white/10 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)'
              }}></div>
            </div>
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getPriorityIcon(task.priority)}
                <div>
                  <h3 className="font-semibold text-lg">Erinnerung</h3>
                  <p className="text-white/80 text-sm">
                    {task.reminderTime && format(new Date(`2000-01-01T${task.reminderTime}`), 'HH:mm')}
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Clickable Task Title */}
            <div className="mb-4">
              {onTaskClick ? (
                <button
                  onClick={handleTaskClick}
                  className="group w-full text-left"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 line-clamp-2 group-hover:underline transition-all">
                    {task.title}
                  </h4>
                  <div className="flex items-center space-x-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ color: accentColor }}>
                    <ExternalLink className="w-3 h-3" />
                    <span className="text-xs">Aufgabe öffnen</span>
                  </div>
                </button>
              ) : (
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2">
                  {task.title}
                </h4>
              )}
            </div>
            
            {task.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                {task.description}
              </p>
            )}

            {/* Task Details */}
            <div className="space-y-2 mb-5">
              {task.priority && task.priority !== 'none' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Priorität:</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                  </span>
                </div>
              )}
              
              {task.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.slice(0, 3).map(tag => (
                      <span 
                        key={tag} 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                    {task.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{task.tags.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={onComplete}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Erledigt</span>
                </button>
                
                <button
                  onClick={onDismiss}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Später
                </button>
              </div>

              {/* Snooze Section */}
              <div className="relative">
                <button
                  onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-white rounded-xl transition-colors font-medium shadow-sm hover:shadow-md"
                  style={{
                    backgroundColor: accentColor,
                    filter: showSnoozeOptions ? 'brightness(0.9)' : 'brightness(1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = showSnoozeOptions ? 'brightness(0.9)' : 'brightness(1)'}
                >
                  <Timer className="w-4 h-4" />
                  <span>Schlummern</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSnoozeOptions ? 'rotate-180' : ''}`} />
                </button>

                {showSnoozeOptions && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-md overflow-hidden">
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {snoozeOptions.map((option) => (
                        <button
                          key={option.minutes}
                          onClick={() => {
                            onSnooze(option.minutes);
                            setShowSnoozeOptions(false);
                          }}
                          className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded transition-colors hover:text-white"
                          style={{
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${accentColor}20`;
                            e.currentTarget.style.color = accentColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '';
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 