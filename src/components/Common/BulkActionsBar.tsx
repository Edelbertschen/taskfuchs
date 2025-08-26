import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Trash2, 
  Check, 
  CheckSquare, 
  Archive, 
  Tag as TagIcon, 
  Star,
  ArrowRight,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import type { TaskPriority } from '../../types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface BulkActionsBarProps {
  className?: string;
}

export function BulkActionsBar({ className = '' }: BulkActionsBarProps) {
  const { state, dispatch } = useApp();
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  
  const barRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const selectedCount = state.selectedTaskIds?.length || 0;
  
  const handleClearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'TOGGLE_BULK_MODE' });
  }, [dispatch]);

  // Close only dropdown menus (keep bulk mode active)
  const closeAllMenus = useCallback(() => {
    setShowPriorityMenu(false);
    setShowTagMenu(false);
    setShowMoveMenu(false);
    setShowMoreMenu(false);
    setNewTagInput('');
  }, []);

  // Open only one menu at a time - atomic state update
  const openMenuExclusively = useCallback((menuType: 'priority' | 'tag' | 'move' | 'more') => {
    // Set all menu states atomically - only the selected one to true, all others to false
    setShowPriorityMenu(menuType === 'priority');
    setShowTagMenu(menuType === 'tag');
    setShowMoveMenu(menuType === 'move');
    setShowMoreMenu(menuType === 'more');
    setNewTagInput('');
  }, []);

  // Close all dropdown menus when bulk mode is activated
  useEffect(() => {
    if (state.isBulkMode) {
      closeAllMenus();
    }
  }, [state.isBulkMode, closeAllMenus]);

  // Focus tag input when tag menu opens
  useEffect(() => {
    if (showTagMenu && tagInputRef.current) {
      setTimeout(() => tagInputRef.current?.focus(), 100);
    }
  }, [showTagMenu]);

  // Handle outside clicks and ESC key to close bar
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        // Check if clicked element is a task card or task-related element
        const target = event.target as HTMLElement;
        
        // Don't close if clicking on task cards or task-related elements
        const isTaskRelated = target.closest('[data-task-card]') || 
                             target.closest('[data-task-item]') ||
                             target.closest('.task-card') ||
                             target.closest('.sidebar-task-item') ||
                             target.closest('[data-sidebar-task]') ||
                             target.closest('.task-list-item');

        // ALSO don't close if clicking on dropdown elements that might be outside the bar
        const isDropdownRelated = target.closest('.absolute') || // Dropdown containers
                                  target.closest('[role="menu"]') ||
                                  target.closest('[role="menuitem"]') ||
                                  showPriorityMenu || showTagMenu || showMoveMenu || showMoreMenu; // Any menu is open
        
        
        if (!isTaskRelated && !isDropdownRelated) {
          handleClearSelection();
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClearSelection();
      }
    };

    if (state.isBulkMode && selectedCount >= 0) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [state.isBulkMode, selectedCount, handleClearSelection, showPriorityMenu, showTagMenu, showMoveMenu, showMoreMenu]);

  const handlePrioritySelect = (priority: TaskPriority) => {
    dispatch({ 
      type: 'BULK_UPDATE_PRIORITY', 
      payload: { 
        taskIds: state.selectedTaskIds, 
        priority: priority 
      }
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  const handleTagAdd = (tagName: string) => {
    if (!tagName.trim()) return;
    
    dispatch({ 
      type: 'BULK_ADD_TAG', 
      payload: { 
        taskIds: state.selectedTaskIds, 
        tagId: tagName.trim() 
      }
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  const handleCreateNewTag = () => {
    if (newTagInput.trim()) {
      // First create the tag if it doesn't exist
      const existingTag = state.tags.find(tag => tag.name.toLowerCase() === newTagInput.trim().toLowerCase());
      if (!existingTag) {
        const newTag = {
          id: `tag-${Date.now()}`,
          name: newTagInput.trim(),
          color: state.preferences.accentColor,
          count: 0
        };
        dispatch({ type: 'ADD_TAG', payload: newTag });
      }
      
      // Then add it to selected tasks
      handleTagAdd(newTagInput.trim());
      setNewTagInput('');
    }
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateNewTag();
    }
  };

  const handleMove = (columnId: string) => {
    dispatch({ 
      type: 'BULK_MOVE_TASKS', 
      payload: { 
        taskIds: state.selectedTaskIds, 
        columnId: columnId 
      }
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  // Helper function to format column titles with weekday
  const formatColumnTitle = (column: any) => {
    console.log('Formatting column:', column); // Debug log
    
    // Method 1: Check if it's a date column with date field
    if (column.isDateColumn && column.date) {
      try {
        const date = parseISO(column.date);
        const weekday = format(date, 'E', { locale: de }); // Short weekday (Mo, Di, Mi, ...)
        console.log(`Method 1 success: ${weekday}, ${column.title}`);
        return `${weekday}, ${column.title}`;
      } catch (error) {
        console.log('Method 1 parseISO error:', error);
      }
    }
    
    // Method 2: Check if column.id looks like a date (YYYY-MM-DD)
    if (column.id && /^\d{4}-\d{2}-\d{2}$/.test(column.id)) {
      try {
        const date = parseISO(column.id);
        const weekday = format(date, 'E', { locale: de });
        console.log(`Method 2 success: ${weekday}, ${column.title}`);
        return `${weekday}, ${column.title}`;
      } catch (error) {
        console.log('Method 2 parseISO error:', error);
      }
    }
    
    // Method 3: Check if column.title looks like a date (DD.MM.YYYY)
    const dateMatch = column.title?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dateMatch) {
      try {
        const [, day, month, year] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const weekday = format(date, 'E', { locale: de });
        console.log(`Method 3 success: ${weekday}, ${column.title}`);
        return `${weekday}, ${column.title}`;
      } catch (error) {
        console.log('Method 3 date creation error:', error);
      }
    }
    
    // Regular column - just return title
    console.log(`Regular column: ${column.title}`);
    return column.title;
  };

  const handleBulkComplete = () => {
    dispatch({ 
      type: 'BULK_COMPLETE_TASKS', 
      payload: state.selectedTaskIds 
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  const handleBulkUncomplete = () => {
    dispatch({ 
      type: 'BULK_UNCOMPLETE_TASKS', 
      payload: state.selectedTaskIds 
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  const handleBulkArchive = () => {
    dispatch({ 
      type: 'BULK_ARCHIVE_TASKS', 
      payload: state.selectedTaskIds 
    });
    closeAllMenus(); // Only close menus, keep bulk mode active
  };

  const handleBulkDelete = () => {
    if (confirm(`${selectedCount} Aufgabe${selectedCount === 1 ? '' : 'n'} löschen?`)) {
      dispatch({ 
        type: 'BULK_DELETE_TASKS', 
        payload: state.selectedTaskIds 
      });
      // Note: BULK_DELETE_TASKS already clears selection and exits bulk mode in the reducer
    }
  };

  // Get accent color styles
  const accentColor = state.preferences.accentColor;

  if (!state.isBulkMode) {
    return null;
  }

  // Show empty state when in bulk mode but no tasks selected
  if (selectedCount === 0) {
    return (
      <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 ${className}`}>
        <div
          ref={barRef}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center space-x-4 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: accentColor }}
            >
              ✓
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Bereit für Auswahl
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

          {/* Close Button */}
          <button
            onClick={handleClearSelection}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="Bulk-Modus verlassen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 ${className}`}>
      <div 
        ref={barRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center space-x-4 backdrop-blur-xl"
      >
        {/* Selection Count */}
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: accentColor }}
          >
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ausgewählt
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Complete/Uncomplete Toggle */}
          <button
            onClick={handleBulkComplete}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="Als erledigt markieren"
          >
            <Check className="w-5 h-5" />
          </button>

          <button
            onClick={handleBulkUncomplete}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="Als unerledigt markieren"
          >
            <CheckSquare className="w-5 h-5" />
          </button>

          {/* Priority Menu */}
          <div className="relative">
            <button
              onClick={() => openMenuExclusively('priority')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Priorität setzen"
            >
              <Star className="w-5 h-5" />
            </button>
            
            {showPriorityMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-32">
                {(['high', 'medium', 'low', 'none'] as TaskPriority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePrioritySelect(priority)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Star className={`w-4 h-4 ${
                      priority === 'high' ? 'text-red-500' :
                      priority === 'medium' ? 'text-yellow-500' :
                      priority === 'low' ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <span className="capitalize">
                      {priority === 'none' ? 'Keine' : 
                       priority === 'high' ? 'Hoch' :
                       priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Menu */}
          <div className="relative">
            <button
              onClick={() => openMenuExclusively('tag')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Tag hinzufügen"
            >
              <TagIcon className="w-5 h-5" />
            </button>
            
            {showTagMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-48 max-h-64 overflow-y-auto">
                {/* New Tag Input */}
                <div className="px-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyPress={handleTagInputKeyPress}
                      placeholder="Neuen Tag erstellen..."
                      className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        '--tw-ring-color': state.preferences.accentColor + '80'
                      } as React.CSSProperties}
                    />
                    <button
                      onClick={handleCreateNewTag}
                      disabled={!newTagInput.trim()}
                      className="p-1 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: state.preferences.accentColor }}
                      title="Tag erstellen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Existing Tags */}
                <div className="max-h-40 overflow-y-auto">
                  {state.tags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagAdd(tag.name)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || state.preferences.accentColor }}
                      />
                      <span>{tag.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">#{tag.count || 0}</span>
                    </button>
                  ))}
                  {state.tags.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      Keine Tags vorhanden
                      <br />
                      <span className="text-xs">Erstellen Sie einen neuen Tag oben</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Move Menu */}
          <div className="relative">
            <button
              onClick={() => openMenuExclusively('move')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Verschieben"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {showMoveMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-40 max-h-48 overflow-y-auto">
                {state.columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => handleMove(column.id)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {formatColumnTitle(column)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => openMenuExclusively('more')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Weitere Aktionen"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMoreMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-32">
                <button
                  onClick={handleBulkArchive}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-600 dark:text-gray-400"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archivieren</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-600 dark:text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Löschen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Close Button */}
        <button
          onClick={handleClearSelection}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="Auswahl aufheben"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 