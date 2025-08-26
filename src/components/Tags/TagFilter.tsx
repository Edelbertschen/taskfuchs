import React from 'react';
import { X, Hash, Filter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface TagFilterProps {
  className?: string;
}

export function TagFilter({ className = "" }: TagFilterProps) {
  const { state, dispatch } = useApp();
  const { tagFilter } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  const { tags, activeTagFilters } = state;

  const handleToggleTag = (tagName: string) => {
    dispatch({ type: 'TOGGLE_TAG_FILTER', payload: tagName });
  };

  const handleClearFilters = () => {
    dispatch({ type: 'CLEAR_TAG_FILTERS' });
  };

  const getTaskCountForTag = (tagName: string): number => {
    return state.tasks.filter(task => task.tags.includes(tagName)).length;
  };

  // Filter tags to only show those that have tasks
  const availableTags = tags.filter(tag => {
    const taskCount = getTaskCountForTag(tag.name);
    return taskCount > 0;
  });

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className={`border-b px-4 py-0.5 ${
      isMinimalDesign
        ? 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
    } ${className}`}>
      <div className="flex items-center justify-between">
        {/* Filter Icon and Title */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className={`text-sm font-medium ${
            isMinimalDesign
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {tagFilter.filterLabel()}
          </span>
        </div>

        {/* Clear All Button */}
        {activeTagFilters.length > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>{tagFilter.clearAll()}</span>
          </button>
        )}
      </div>

      {/* Tag Pills */}
      <div className="flex flex-wrap gap-2 mt-1">
        {availableTags
          .sort((a, b) => b.count - a.count) // Sort by usage count
          .map((tag) => {
            const isActive = activeTagFilters.includes(tag.name);
            const taskCount = getTaskCountForTag(tag.name);
            
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 ${
                  isActive
                    ? 'text-white shadow-md transform scale-105 bg-gray-600 dark:bg-gray-500'
                    : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="truncate max-w-20">{tag.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  isActive 
                    ? 'bg-white bg-opacity-20 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {taskCount}
                </span>
              </button>
            );
          })}
      </div>

      {/* Active Filters Summary */}
      {activeTagFilters.length > 0 && (
        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{tagFilter.activeFilters()}</span>
            <div className="flex flex-wrap gap-1">
              {activeTagFilters.map((tagName) => {
                return (
                  <span
                    key={tagName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white rounded-full bg-gray-600 dark:bg-gray-500"
                  >
                    <span className="truncate max-w-16">{tagName}</span>
                    <button
                      onClick={() => handleToggleTag(tagName)}
                      className="hover:bg-black hover:bg-opacity-20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 