import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Tag, 
  AlertCircle, 
  CheckCircle,
  Circle,
  CalendarOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import type { TaskPriority } from '../../types';

export function ProjectKanbanFilters() {
  const { state, dispatch } = useApp();
  const { common } = useAppTranslation();
  const { tags, viewState } = state;
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const { searchQuery, priorityFilters, tagFilters, showCompleted, hideScheduledTasks } = viewState.projectKanban;

  const handleSearchChange = (query: string) => {
    dispatch({
      type: 'SET_PROJECT_KANBAN_SEARCH',
      payload: query
    });
  };

  const handlePriorityFilterToggle = (priority: TaskPriority) => {
    const newFilters = priorityFilters.includes(priority)
      ? priorityFilters.filter(p => p !== priority)
      : [...priorityFilters, priority];

    dispatch({
      type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS',
      payload: newFilters
    });
  };

  const handleTagFilterToggle = (tag: string) => {
    const newFilters = tagFilters.includes(tag)
      ? tagFilters.filter(t => t !== tag)
      : [...tagFilters, tag];

    dispatch({
      type: 'SET_PROJECT_KANBAN_TAG_FILTERS',
      payload: newFilters
    });
  };

  const handleShowCompletedToggle = () => {
    dispatch({
      type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED',
      payload: !showCompleted
    });
  };

  const handleHideScheduledToggle = () => {
    dispatch({
      type: 'SET_PROJECT_KANBAN_HIDE_SCHEDULED',
      payload: !hideScheduledTasks
    });
  };

  const clearAllFilters = () => {
    dispatch({ type: 'SET_PROJECT_KANBAN_SEARCH', payload: '' });
    dispatch({ type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS', payload: [] });
    dispatch({ type: 'SET_PROJECT_KANBAN_TAG_FILTERS', payload: [] });
    dispatch({ type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED', payload: false });
    dispatch({ type: 'SET_PROJECT_KANBAN_HIDE_SCHEDULED', payload: false });
  };

  const hasActiveFilters = searchQuery || priorityFilters.length > 0 || tagFilters.length > 0 || showCompleted || hideScheduledTasks;

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'none':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-3 h-3" />;
      case 'medium':
        return <Circle className="w-3 h-3" />;
      case 'low':
        return <CheckCircle className="w-3 h-3" />;
      case 'none':
        return <Circle className="w-3 h-3 opacity-50" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return common.priority.high;
      case 'medium':
        return common.priority.medium;
      case 'low':
        return common.priority.low;
      case 'none':
        return common.priority.none;
      default:
        return priority;
    }
  };

  // Get available tags from tasks
  const availableTags = tags.filter(tag => {
    // Prüfe sowohl tag.count als auch die tatsächliche Anzahl der Aufgaben
    const actualTaskCount = state.tasks.filter(task => task.tags.includes(tag.name)).length;
    return tag.count > 0 && actualTaskCount > 0;
  });

  return (
    <div className="flex flex-col space-y-4">
      {/* Search and Filter Row */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={common.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <button
            onClick={() => setShowPriorityFilter(!showPriorityFilter)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
              priorityFilters.length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">{common.priority}</span>
            {priorityFilters.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {priorityFilters.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showPriorityFilter && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700" style={{ zIndex: 50 }}>
              <div className="p-2">
                {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(priority => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityFilterToggle(priority)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      priorityFilters.includes(priority)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {getPriorityIcon(priority)}
                    <span>{getPriorityLabel(priority)}</span>
                    {priorityFilters.includes(priority) && (
                      <CheckCircle className="w-3 h-3 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div className="relative">
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
              tagFilters.length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium">{common.tags}</span>
            {tagFilters.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {tagFilters.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showTagFilter && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700" style={{ zIndex: 50 }}>
              <div className="p-2 max-h-60 overflow-y-auto">
                {availableTags.length > 0 ? (
                  availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagFilterToggle(tag.name)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        tagFilters.includes(tag.name)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      <span className="flex-1 text-left">{tag.name}</span>
                      <span className="text-xs text-gray-500">({tag.count})</span>
                      {tagFilters.includes(tag.name) && (
                        <CheckCircle className="w-3 h-3 ml-auto" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {common.noTagsAvailable}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Show Completed Toggle */}
        <button
          onClick={handleShowCompletedToggle}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            showCompleted
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{common.completed()}</span>
        </button>

        {/* Hide Scheduled Tasks Toggle - Things3 style "Focus" */}
        <button
          onClick={handleHideScheduledToggle}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            hideScheduledTasks
              ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
          title={common.hideScheduledTooltip?.() || 'Zeige nur heutige und unterminierte Aufgaben'}
        >
          <CalendarOff className="w-4 h-4" />
          <span className="text-sm font-medium">{common.hideScheduled?.() || 'Jederzeit'}</span>
        </button>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">{common.clear_filters()}</span>
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              <Search className="w-3 h-3 mr-1" />
              {`${common.searchQuery}: "${searchQuery}"`}
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {priorityFilters.map(priority => (
            <span
              key={priority}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}
            >
              {getPriorityIcon(priority)}
              <span className="ml-1">{getPriorityLabel(priority)}</span>
              <button
                onClick={() => handlePriorityFilterToggle(priority)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          
          {tagFilters.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <button
                onClick={() => handleTagFilterToggle(tag)}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          
          {showCompleted && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              {common.show_completed()}
              <button
                onClick={handleShowCompletedToggle}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {hideScheduledTasks && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600">
              <CalendarOff className="w-3 h-3 mr-1" />
              {common.hideScheduled?.() || 'Jederzeit'}
              <button
                onClick={handleHideScheduledToggle}
                className="ml-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
} 