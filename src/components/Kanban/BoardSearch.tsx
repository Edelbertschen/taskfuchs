import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { Task, KanbanBoard } from '../../types';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  Tag, 
  Flag,
  CheckCircle,
  Circle
} from 'lucide-react';
import { useDebounce } from '../../utils/performance';

interface BoardSearchProps {
  board?: KanbanBoard;
  onTasksFiltered: (tasks: Task[]) => void;
  className?: string;
}

interface SearchFilters {
  query: string;
  priority: string[];
  tags: string[];
  status: string[];
  dateRange: {
    from?: string;
    to?: string;
  };
  assignee?: string;
}

export function BoardSearch({ board, onTasksFiltered, className = '' }: BoardSearchProps) {
  const { state } = useApp();
  const { tasks, tags: allTags } = state;
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    priority: [],
    tags: [],
    status: [],
    dateRange: {},
    assignee: undefined
  });

  // 🔍 Performance Boost: Debounced query für bessere Performance bei großen Task-Listen
  const debouncedQuery = useDebounce(filters.query, 250); // 250ms Delay für Board-Suche

  // Filter tasks based on current filters - jetzt mit debounced query
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Text search mit debounced query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.subtasks.some(subtask => 
          subtask.title.toLowerCase().includes(query) ||
          subtask.description?.toLowerCase().includes(query)
        ) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(task =>
        filters.tags.some(tag => task.tags.includes(tag))
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => {
        if (filters.status.includes('completed') && task.completed) return true;
        if (filters.status.includes('pending') && !task.completed) return true;
        return false;
      });
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(task => {
        if (!task.reminderDate) return false;
        
        const taskDate = task.reminderDate;
        const fromValid = !filters.dateRange.from || taskDate >= filters.dateRange.from;
        const toValid = !filters.dateRange.to || taskDate <= filters.dateRange.to;
        
        return fromValid && toValid;
      });
    }

    return filtered;
  }, [tasks, debouncedQuery, filters.priority, filters.tags, filters.status, filters.dateRange]);

  // Notify parent component of filtered tasks
  React.useEffect(() => {
    onTasksFiltered(filteredTasks);
  }, [filteredTasks, onTasksFiltered]);

  const handleQueryChange = (query: string) => {
    setFilters(prev => ({ ...prev, query })); // Sofort UI updaten
    // Actual filtering passiert mit debouncedQuery im useMemo
  };

  const handlePriorityToggle = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority]
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value || undefined
      }
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      query: '',
      priority: [],
      tags: [],
      status: [],
      dateRange: {},
      assignee: undefined
    });
  };

  const hasActiveFilters = filters.query || 
    filters.priority.length > 0 || 
    filters.tags.length > 0 || 
    filters.status.length > 0 ||
    filters.dateRange.from || 
    filters.dateRange.to;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700';
      case 'low': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={board ? `In "${board.name}" suchen...` : 'Aufgaben suchen...'}
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md border transition-colors ${
              showFilters 
                ? 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter</span>
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-2 h-2"></span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Alle Filter zurücksetzen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {filteredTasks.length} von {tasks.length} Aufgaben
          {hasActiveFilters && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              (gefiltert)
            </span>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Flag className="inline w-4 h-4 mr-1" />
              Priorität
            </label>
            <div className="flex flex-wrap gap-2">
              {['high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePriorityToggle(priority)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filters.priority.includes(priority)
                      ? getPriorityColor(priority)
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  {priority === 'high' ? 'Hoch' : priority === 'medium' ? 'Mittel' : 'Niedrig'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CheckCircle className="inline w-4 h-4 mr-1" />
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'pending', label: 'Offen', icon: Circle },
                { key: 'completed', label: 'Erledigt', icon: CheckCircle }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleStatusToggle(key)}
                  className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-full border transition-colors ${
                    filters.status.includes(key)
                      ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {allTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.name)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      filters.tags.includes(tag.name)
                        ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    #{tag.name} ({tag.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Fälligkeitsdatum
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Von</label>
                <input
                  type="date"
                  value={filters.dateRange.from || ''}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bis</label>
                <input
                  type="date"
                  value={filters.dateRange.to || ''}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 