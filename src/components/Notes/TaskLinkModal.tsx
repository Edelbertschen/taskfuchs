import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, Filter, Hash, Clock, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TaskLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkTask: (taskId: string) => void;
  excludeTaskIds: string[];
}

export function TaskLinkModal({ isOpen, onClose, onLinkTask, excludeTaskIds }: TaskLinkModalProps) {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
    };
  };

  // Filter available tasks
  const availableTasks = useMemo(() => {
    let filtered = state.tasks.filter(task => 
      !excludeTaskIds.includes(task.id) && !task.completed
    );

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Priority filter
    if (selectedPriority) {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(task =>
        selectedTags.some(tag => task.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) => {
      // Sort by priority (high > medium > low > none)
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.reminderDate && b.reminderDate) {
        return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime();
      }
      if (a.reminderDate) return -1;
      if (b.reminderDate) return 1;
      
      // Finally by title
      return a.title.localeCompare(b.title);
    });
  }, [state.tasks, excludeTaskIds, searchQuery, selectedPriority, selectedTags]);

  // Get all available tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    state.tasks.forEach(task => {
      task.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [state.tasks]);

  const handleTaskSelect = useCallback((task: Task) => {
    onLinkTask(task.id);
    onClose();
  }, [onLinkTask, onClose]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedPriority('');
    setSelectedTags([]);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return 'Keine';
    }
  };

  const formatTime = (minutes: number) => {
    // Return null for 0 minutes to prevent showing "0m"
    if (minutes === 0 || !minutes) {
      return null;
    }
    
    // Runde auf ganze Minuten, keine Nachkommastellen
    const roundedMinutes = Math.floor(Math.abs(minutes));
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    const sign = minutes < 0 ? '-' : '';
    
    if (hours > 0) {
      return `${sign}${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${sign}${mins}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Aufgabe verknüpfen
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Aufgaben durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': getAccentColorStyles().ring['--tw-ring-color']
              } as React.CSSProperties}
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                showFilters || selectedPriority || selectedTags.length > 0
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={showFilters || selectedPriority || selectedTags.length > 0 ? getAccentColorStyles().bg : {}}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {(selectedPriority || selectedTags.length > 0) && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">
                  {(selectedPriority ? 1 : 0) + selectedTags.length}
                </span>
              )}
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {availableTasks.length} von {state.tasks.filter(t => !t.completed && !excludeTaskIds.includes(t.id)).length} Aufgaben
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priorität
                </label>
                <div className="flex flex-wrap gap-2">
                  {['high', 'medium', 'low', 'none'].map(priority => (
                    <button
                      key={priority}
                      onClick={() => setSelectedPriority(selectedPriority === priority ? '' : priority)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedPriority === priority
                          ? 'text-white'
                          : getPriorityColor(priority)
                      }`}
                      style={selectedPriority === priority ? getAccentColorStyles().bg : {}}
                    >
                      {getPriorityLabel(priority)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2 py-1 rounded text-sm transition-all ${
                          selectedTags.includes(tag)
                            ? 'text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                        style={selectedTags.includes(tag) ? getAccentColorStyles().bg : {}}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {(selectedPriority || selectedTags.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="text-sm transition-colors"
                  style={getAccentColorStyles().text}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Alle Filter entfernen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {availableTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Keine Aufgaben gefunden
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || selectedPriority || selectedTags.length > 0
                  ? 'Versuche andere Suchbegriffe oder entferne Filter.'
                  : 'Alle verfügbaren Aufgaben sind bereits verknüpft oder abgeschlossen.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white transition-colors" 
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = getAccentColorStyles().text.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '';
                      }}
                    >
                      {task.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                      {task.estimatedTime && task.estimatedTime > 0 && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(task.estimatedTime)}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(task.dueDate), 'dd.MM.yyyy', { locale: de })}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {task.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: getAccentColorStyles().bg.backgroundColor + '1A', // 10% opacity
                            color: getAccentColorStyles().text.color
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{task.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 