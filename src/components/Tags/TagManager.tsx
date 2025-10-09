import React, { useState, useMemo } from 'react';
import { Hash, Edit2, Trash2, Palette, BarChart3, FileText, CheckSquare, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { getBackgroundStyles, getDarkModeBackgroundStyles } from '../../utils/backgroundUtils';
import { Header } from '../Layout/Header';


export function TagManager() {
  const { state, dispatch } = useApp();
  const { tagManager } = useAppTranslation();
  const { t } = useTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');

  // Auto-sync effect to ensure all used tags are in global tags
  React.useEffect(() => {
    const allUsedTags = new Set<string>();
    
    // Collect all tags from tasks
    state.tasks.forEach(task => {
      task.tags.forEach(tag => allUsedTags.add(tag));
    });
    
    // Collect all tags from notes
    state.notes.notes.forEach(note => {
      note.tags.forEach(tag => allUsedTags.add(tag));
    });
    
    // Check if any used tags are missing from global tags
    const missingTags: string[] = [];
    allUsedTags.forEach(tagName => {
      const exists = state.tags.some(tag => tag.name === tagName);
      if (!exists) {
        missingTags.push(tagName);
      }
    });
    
    // Add missing tags to global tags
    missingTags.forEach(tagName => {
      const newTag = {
        id: `auto-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: tagName,
        color: '#6b7280',
        count: 0
      };
      dispatch({ type: 'ADD_TAG', payload: newTag });
    });
  }, [state.tasks, state.notes.notes, state.tags, dispatch]);

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [colorPicker, setColorPicker] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<any>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const colors = [
    '#6b7280', '#64748b', '#71717a', '#52525b',
    '#525252', '#404040', '#737373', '#666b7c',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  // Close add modal function
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewTagName('');
  };

  // Add new tag function
  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: `tag-${Date.now()}`,
        name: newTagName.trim(),
        color: '#6b7280',
        count: 0
      };
      
      dispatch({
        type: 'ADD_TAG',
        payload: newTag
      });
      
      handleCloseAddModal();
    }
  };

  // Edit tag functions
  const handleEditTag = (tag: any) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
  };

  const handleEditSave = (tagId: string) => {
    if (editName.trim() && editName !== '') {
      // Find the existing tag to preserve other properties
      const existingTag = state.tags.find(t => t.id === tagId);
      if (existingTag) {
        dispatch({
          type: 'UPDATE_TAG',
          payload: { 
            id: tagId, 
            name: editName.trim(),
            color: existingTag.color,
            count: existingTag.count
          }
        });
      }
    }
    setEditingTag(null);
    setEditName('');
  };

  // Get all task tags with usage counts
  const taskTags = useMemo(() => {
    const taskTagMap = new Map<string, number>();
    state.tasks.forEach(task => {
      task.tags.forEach(tag => {
        taskTagMap.set(tag, (taskTagMap.get(tag) || 0) + 1);
      });
    });
    
    // Include all tags from state.tags, even unused ones
    const allTags = new Map<string, any>();
    
    // Add used tags from tasks
    Array.from(taskTagMap.entries()).forEach(([name, count]) => {
      const existingTag = state.tags.find(t => t.name === name);
      allTags.set(name, {
        id: existingTag?.id || `task-tag-${name}`,
        name,
        count,
        color: existingTag?.color || '#6b7280'
      });
    });
    
    // Add unused tags from state.tags
    state.tags.forEach(tag => {
      if (!allTags.has(tag.name)) {
        allTags.set(tag.name, {
          id: tag.id,
          name: tag.name,
          count: 0,
          color: tag.color
        });
      }
    });
    
    return Array.from(allTags.values());
  }, [state.tasks, state.tags]);

  // Get all note tags with usage counts
  const noteTags = useMemo(() => {
    const noteTagMap = new Map<string, number>();
    
    state.notes.notes.forEach(note => {
      note.tags.forEach(tag => {
        noteTagMap.set(tag, (noteTagMap.get(tag) || 0) + 1);
      });
    });
    
    // Include all tags from state.tags, even unused ones
    const allTags = new Map<string, any>();
    
    // Add used tags from notes
    Array.from(noteTagMap.entries()).forEach(([name, count]) => {
      const existingTag = state.tags.find(t => t.name === name);
      allTags.set(name, {
        id: existingTag?.id || `note-tag-${name}`,
        name,
        count,
        color: existingTag?.color || '#6b7280'
      });
    });
    
    // Add unused tags from state.tags
    state.tags.forEach(tag => {
      if (!allTags.has(tag.name)) {
        allTags.set(tag.name, {
          id: tag.id,
          name: tag.name,
          count: 0,
          color: tag.color
        });
      }
    });

    return Array.from(allTags.values());
  }, [state.notes.notes, state.tags]);

  // Filter out email-specific tags from taskTags since they don't apply to tasks
  const filteredTaskTags = useMemo(() => {
    return taskTags.filter(tag => tag.name !== 'email');
  }, [taskTags]);

  // Current tags based on active tab
  const currentTags = activeTab === 'tasks' ? filteredTaskTags : noteTags;

  const handleStartEdit = (tag: any) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
  };

  const handleSaveEdit = () => {
    if (editingTag && editName.trim()) {
      const currentTag = currentTags.find(t => t.id === editingTag);
      if (currentTag && currentTag.name !== editName.trim()) {
        if (activeTab === 'tasks') {
          // Update tag in global tags if it exists
          const globalTag = state.tags.find(t => t.name === currentTag.name);
          if (globalTag) {
            dispatch({
              type: 'UPDATE_TAG',
              payload: { ...globalTag, name: editName.trim() }
            });
          }

          // Update tag name in all tasks
          const updatedTasks = state.tasks.map(task => ({
            ...task,
            tags: task.tags.map(tagName => tagName === currentTag.name ? editName.trim() : tagName)
          }));
          dispatch({ type: 'SET_TASKS', payload: updatedTasks });
        } else {
          // Update tag name in all notes
          const updatedNotes = state.notes.notes.map(note => ({
            ...note,
            tags: note.tags.map(tagName => tagName === currentTag.name ? editName.trim() : tagName)
          }));
          dispatch({ type: 'SET_NOTES', payload: updatedNotes });
        }
      }
    }
    setEditingTag(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditName('');
  };

  const handleColorChange = (tagId: string, color: string) => {
    if (activeTab === 'tasks') {
      const currentTag = currentTags.find(t => t.id === tagId);
      if (currentTag) {
        const globalTag = state.tags.find(t => t.name === currentTag.name);
        if (globalTag) {
          dispatch({
            type: 'UPDATE_TAG',
            payload: { ...globalTag, color }
          });
        } else {
          // Create new global tag with color
          dispatch({
            type: 'ADD_TAG',
            payload: { id: tagId, name: currentTag.name, color, count: currentTag.count }
          });
        }
      }
    }
    setColorPicker(null);
  };

  const handleDeleteTag = (tag: any) => {
    setTagToDelete(tag);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteTag = () => {
    if (!tagToDelete) return;

    if (activeTab === 'tasks') {
      // Remove tag from all tasks
      const updatedTasks = state.tasks.map(task => ({
        ...task,
        tags: task.tags.filter(tagName => tagName !== tagToDelete.name)
      }));
      dispatch({ type: 'SET_TASKS', payload: updatedTasks });
      
      // Remove from global tags if it exists
      const globalTag = state.tags.find(t => t.name === tagToDelete.name);
      if (globalTag) {
        dispatch({ type: 'DELETE_TAG', payload: globalTag.id });
      }
    } else {
      // Remove tag from all notes
      const updatedNotes = state.notes.notes.map(note => ({
        ...note,
        tags: note.tags.filter(tagName => tagName !== tagToDelete.name)
      }));
      dispatch({ type: 'SET_NOTES', payload: updatedNotes });
    }
    
    setTagToDelete(null);
    setShowDeleteModal(false);
  };

  const getItemsWithTag = (tagName: string) => {
    if (activeTab === 'tasks') {
      return state.tasks.filter(task => task.tags.includes(tagName));
    } else {
      return state.notes.notes.filter(note => note.tags.includes(tagName));
    }
  };

  const totalTags = currentTags.length;
  const totalTagUsage = currentTags.reduce((sum, tag) => sum + tag.count, 0);
  const mostUsedTag = currentTags.reduce((prev, current) => 
    (prev.count > current.count) ? prev : current, { count: 0, name: '', color: '#6b7280' }
  );

  // ESC key handler for modals
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddModal) {
          handleCloseAddModal();
        } else if (showDeleteModal) {
          setShowDeleteModal(false);
          setTagToDelete(null);
        }
      }
    };

    if (showAddModal || showDeleteModal) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showAddModal, showDeleteModal]);

  // Get background styles based on preferences
  const isDarkMode = document.documentElement.classList.contains('dark');
  const backgroundStyles = isMinimalDesign
    ? { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }
    : (isDarkMode ? getDarkModeBackgroundStyles(state.preferences) : getBackgroundStyles(state.preferences));

  return (
    <div 
      className={`h-full w-full relative overflow-hidden ${
        isMinimalDesign
          ? 'bg-white dark:bg-[#111827]'
          : 'bg-transparent'
      }`}
      style={backgroundStyles}
    >
      
      {/* Background Overlay */}
      {!isMinimalDesign && state.preferences.backgroundEffects?.overlay !== false && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: `rgba(0, 0, 0, ${state.preferences.backgroundEffects?.overlayOpacity || 0.4})`
          }}
        />
      )}



      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 relative z-10">
        {/* Tag Statistics */}
        <div className="mb-6 flex items-center justify-between">
          <div className={`px-4 py-3 rounded-xl border ${
            isMinimalDesign
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
              : 'bg-white/10 border-white/20 backdrop-blur-xl shadow-lg'
          }`}>
            <p className={`text-sm font-medium ${isMinimalDesign ? 'text-gray-700 dark:text-gray-200' : 'text-white'}`}
               style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5' }}>
              {totalTags} {totalTags === 1 ? 'Tag' : 'Tags'} • {totalTagUsage} {totalTagUsage === 1 ? 'Verwendung' : 'Verwendungen'}
            </p>
          </div>
          
          {/* Add Tag Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 ${isMinimalDesign ? 'text-white' : 'text-white backdrop-blur-xl border border-white/20'}`}
            style={{ 
              backgroundColor: `${state.preferences.accentColor}E6`,
              boxShadow: isMinimalDesign ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.15)',
              textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = state.preferences.accentColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}E6`;
            }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium text-sm" style={{ lineHeight: '1.5' }}>{tagManager.addTag()}</span>
          </button>
        </div>

                {/* Content Container */}
        <div className="max-w-4xl mx-auto">

        {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-lg border p-4 ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <Hash 
              className="w-8 h-8" 
              style={{ color: state.preferences.accentColor }}
            />
            <div>
              <p className={`text-sm ${
                isMinimalDesign
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-600'
              }`}>{tagManager.totalTags()}</p>
              <p className={`text-2xl font-bold ${
                isMinimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-900'
              }`}>{totalTags}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <BarChart3 
              className="w-8 h-8" 
              style={{ color: state.preferences.accentColor }}
            />
            <div>
              <p className={`text-sm ${
                isMinimalDesign
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-600'
              }`}>{tagManager.tagUsage()}</p>
              <p className={`text-2xl font-bold ${
                isMinimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-900'
              }`}>{totalTagUsage}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: state.preferences.accentColor }}
            >
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={`text-sm ${
                isMinimalDesign
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-600'
              }`}>{tagManager.mostUsed()} ({activeTab === 'tasks' ? tagManager.tasks() : tagManager.notes()})</p>
              <p className={`text-lg font-bold truncate ${
                isMinimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-900'
              }`}>
                {mostUsedTag.name || tagManager.noTags()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div className={`rounded-lg border ${
        isMinimalDesign
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-4 border-b ${
          isMinimalDesign
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${
            isMinimalDesign
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-900'
          }`}>{tagManager.allTags()}</h2>
        </div>

        <div className="p-4">
          {/* Tab Navigation */}
          <div className={`flex space-x-1 mb-6 rounded-lg p-1 ${
            isMinimalDesign
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'bg-gray-100'
          }`}>
                          <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'tasks'
                    ? (isMinimalDesign
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm')
                    : (isMinimalDesign
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{tagManager.taskTags(taskTags.length)}</span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'notes'
                    ? (isMinimalDesign
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm')
                    : (isMinimalDesign
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        : 'text-gray-600 hover:text-gray-900')
                }`}
              >
              <FileText className="w-4 h-4" />
              <span>{tagManager.noteTags(noteTags.length)}</span>
            </button>
          </div>

          {currentTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{activeTab === 'tasks' ? tagManager.noTaskTags() : tagManager.noNoteTags()}</p>
              <p className="text-sm">
                {activeTab === 'tasks' ? tagManager.tagsAutoCreatedTasks() : tagManager.tagsAutoCreatedNotes()}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentTags
                .sort((a, b) => b.count - a.count)
                .map((tag) => {
                  return (
                    <div
                      key={tag.id}
                      className="relative inline-flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-200 bg-white border hover:shadow-lg min-w-[120px]"
                      style={{ 
                        borderColor: `${state.preferences.accentColor}30`,
                        backgroundColor: `${state.preferences.accentColor}08`
                      }}
                    >
                      {/* Tag Name */}
                      {editingTag === tag.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleEditSave(tag.id)}
                          onKeyPress={(e) => e.key === 'Enter' && handleEditSave(tag.id)}
                          className="text-sm font-medium bg-transparent focus:outline-none flex-1"
                          style={{ color: state.preferences.accentColor }}
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="text-sm font-medium cursor-pointer flex-1" 
                          style={{ color: state.preferences.accentColor }}
                          onClick={() => handleEditTag(tag)}
                          title={tagManager.clickToEdit()}
                        >
                          #{tag.name}
                        </span>
                      )}

                      {/* Count Badge */}
                      <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${state.preferences.accentColor}15`,
                          color: state.preferences.accentColor
                        }}
                      >
                        {tag.count}
                      </span>

                      {/* Delete Button - Always Visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tag);
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        title={tagManager.deleteTag()}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteModal(false);
            setTagToDelete(null);
          }}
        >
          <div 
            className={`rounded-lg p-6 w-96 shadow-xl border ${
              isMinimalDesign
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isMinimalDesign
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-900 dark:text-white'
            }`}>{tagManager.deleteTagTitle()}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('tag_manager.delete_confirmation', { name: tagToDelete?.name || '' })}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                {tagManager.cancel()}
              </button>
              <button
                onClick={() => {
                  handleConfirmDeleteTag();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                {tagManager.delete()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseAddModal}
        >
          <div 
            className={`rounded-lg p-6 w-96 shadow-xl border ${
              isMinimalDesign
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isMinimalDesign
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-900 dark:text-white'
            }`}>{tagManager.addNewTag()}</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={tagManager.tagNamePlaceholder()}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 mb-4 transition-colors focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              style={{
                borderColor: newTagName ? state.preferences.accentColor : undefined,
                '--tw-ring-color': state.preferences.accentColor
              } as React.CSSProperties}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              onKeyDown={(e) => e.key === 'Escape' && handleCloseAddModal()}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCloseAddModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                {tagManager.cancel()}
              </button>
              <button
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className="px-4 py-2 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg"
                style={{ 
                  backgroundColor: !newTagName.trim() ? undefined : state.preferences.accentColor,
                  opacity: !newTagName.trim() ? 0.5 : 1
                }}
              >
                {tagManager.add()}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}