import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Plus, Check, X, ArrowRight, CheckCircle2, Circle, CheckSquare, Edit2, Bell, BellOff, MoreHorizontal, Calendar } from 'lucide-react';
import type { Task } from '../../types';

// Simple ID generator (replacing uuid)
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  reminderDate?: string;
  reminderTime?: string;
}

interface ContextMenu {
  x: number;
  y: number;
  itemId: string;
  type: 'active' | 'completed';
}

export function ChecklistWidget() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Get checklist items from global state
  const checklistItems = state.checklistItems || [];
  
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [selectedItemForReminder, setSelectedItemForReminder] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking outside the context menu
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    
    const handleContextMenuOutside = (e: MouseEvent) => {
      // Prevent default browser context menu when our custom one is open
      if (contextMenu) {
        e.preventDefault();
      }
    };
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleContextMenuOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', handleContextMenuOutside);
      };
    }
  }, [contextMenu]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  // Add new checklist item
  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: generateId(),
        text: newItemText.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      dispatch({
        type: 'ADD_CHECKLIST_ITEM',
        payload: newItem
      });
      
      setNewItemText('');
      setIsAdding(false);
    }
  };

  // Toggle checklist item completion
  const handleToggleItem = (itemId: string) => {
    const item = checklistItems.find(item => item.id === itemId);
    if (item) {
      dispatch({
        type: 'UPDATE_CHECKLIST_ITEM',
        payload: {
          ...item,
          completed: !item.completed,
          updatedAt: new Date().toISOString()
        }
      });
    }
  };

  // Start editing an item
  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
    setContextMenu(null);
  };

  // Save edited item
  const handleSaveEdit = () => {
    if (editingItemId && editingText.trim()) {
      const item = checklistItems.find(item => item.id === editingItemId);
      if (item) {
        dispatch({
          type: 'UPDATE_CHECKLIST_ITEM',
          payload: {
            ...item,
            text: editingText.trim(),
            updatedAt: new Date().toISOString()
          }
        });
      }
    }
    setEditingItemId(null);
    setEditingText('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingText('');
  };

  // Delete checklist item
  const handleDeleteItem = (itemId: string) => {
    dispatch({
      type: 'DELETE_CHECKLIST_ITEM',
      payload: itemId
    });
    setContextMenu(null);
  };

  // Set reminder for item
  const handleSetReminder = (itemId: string) => {
    setSelectedItemForReminder(itemId);
    setShowReminderInput(true);
    setReminderDate('');
    setReminderTime('');
    setContextMenu(null);
  };

  // Remove reminder from item
  const handleRemoveReminder = (itemId: string) => {
    const item = checklistItems.find(item => item.id === itemId);
    if (item) {
      dispatch({
        type: 'UPDATE_CHECKLIST_ITEM',
        payload: {
          ...item,
          reminderDate: undefined,
          reminderTime: undefined,
          updatedAt: new Date().toISOString()
        }
      });
    }
    setContextMenu(null);
  };

  // Handle reminder save
  const handleReminderSave = () => {
    if (selectedItemForReminder && reminderDate) {
      const item = checklistItems.find(item => item.id === selectedItemForReminder);
      if (item) {
        dispatch({
          type: 'UPDATE_CHECKLIST_ITEM',
          payload: {
            ...item,
            reminderDate: reminderDate,
            reminderTime: reminderTime || undefined,
            updatedAt: new Date().toISOString()
          }
        });
      }
    }
    setShowReminderInput(false);
    setSelectedItemForReminder(null);
    setReminderDate('');
    setReminderTime('');
  };

  // Handle reminder cancel
  const handleReminderCancel = () => {
    setShowReminderInput(false);
    setSelectedItemForReminder(null);
    setReminderDate('');
    setReminderTime('');
  };

  // Convert checklist item to full task
  const handleConvertToTask = (item: ChecklistItem) => {
    const newTask: Task = {
      id: generateId(),
      title: item.text,
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: 'inbox', // Add to inbox
      tags: [],
      subtasks: [],
      priority: 'medium',
      position: Date.now(),
      reminderDate: item.reminderDate,
      reminderTime: item.reminderTime
    };

    dispatch({ type: 'ADD_TASK', payload: newTask });
    handleDeleteItem(item.id);
    
    // Show notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: generateId(),
        type: 'success',
        title: t('dashboard.checklist.task_created'),
        message: `"${item.text}" ${t('dashboard.checklist.task_added_to_inbox')}`,
        timestamp: new Date().toISOString(),
        read: false
      }
    });
    
    setContextMenu(null);
  };

  // Handle key press for adding items
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewItemText('');
    }
  };

  // Handle key press for editing items
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, itemId: string, type: 'active' | 'completed') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
      type
    });
  };

  // Get active (non-completed) items
  const activeItems = checklistItems.filter(item => !item.completed);
  const completedItems = checklistItems.filter(item => item.completed);

  return (
    <div className="h-full flex flex-col">
      {/* Checklist items */}
      <div className="flex-1 overflow-y-auto">
        {/* Active items */}
        {activeItems.length > 0 && (
          <div className="space-y-1">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center space-x-3 py-1.5 px-2 rounded-md transition-all duration-200 ${
                  isMinimalDesign 
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' 
                    : 'hover:bg-white/10'
                }`}
                onContextMenu={(e) => handleContextMenu(e, item.id, 'active')}
              >
                <button
                  onClick={() => handleToggleItem(item.id)}
                  className="flex-shrink-0 hover:scale-110 transition-transform"
                >
                  <Circle className="w-4 h-4 text-gray-400 hover:text-green-500" />
                </button>
                
                {editingItemId === item.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={handleEditKeyPress}
                      onBlur={handleSaveEdit}
                      className="flex-1 px-2 py-1 text-sm bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2"
                      style={{
                        '--tw-ring-color': state.preferences.accentColor
                      } as React.CSSProperties}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <span 
                      className="text-sm text-gray-900 dark:text-white" 
                      style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                    >
                      {item.text}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {/* Reminder indicator */}
                      {item.reminderDate && (
                        <Bell 
                          className="w-3 h-3" 
                          style={{ color: state.preferences.accentColor }}
                        />
                      )}
                      
                      {/* Actions */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1 text-gray-500 hover:text-blue-500 rounded transition-colors"
                          title={t('actions.edit')}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completed items */}
        {completedItems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.checklist.completed')} ({completedItems.length})
              </h4>
            </div>
            <div className="space-y-1">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center space-x-3 py-1.5 px-2 rounded-md opacity-60 transition-all duration-200 ${
                    isMinimalDesign 
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' 
                      : 'hover:bg-white/5'
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, item.id, 'completed')}
                >
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </button>
                  
                  <span 
                    className="flex-1 text-sm line-through text-gray-400 dark:text-gray-500" 
                    style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {checklistItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isMinimalDesign 
                ? 'bg-gray-100 dark:bg-gray-700' 
                : 'bg-white/10 backdrop-blur-sm border border-white/20'
            }`}>
              <CheckSquare className="w-6 h-6 text-gray-400 dark:text-gray-300" />
            </div>
            <p className="font-medium mb-1 text-sm text-gray-900 dark:text-white">
              {t('dashboard.checklist.no_entries')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.checklist.click_to_add')}
            </p>
          </div>
        )}
      </div>

      {/* Add new item at bottom */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {isAdding ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('dashboard.checklist.add_new_entry')}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2"
              style={{
                '--tw-ring-color': state.preferences.accentColor
              } as React.CSSProperties}
              autoFocus
            />
            <button
              onClick={handleAddItem}
              className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewItemText('');
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-sm rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.checklist.add_entry')}</span>
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && createPortal(
        <div 
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[160px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'active' && (
            <>
              <button
                onClick={() => {
                  const item = checklistItems.find(i => i.id === contextMenu.itemId);
                  if (item) handleStartEdit(item);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t('actions.edit')}</span>
              </button>
              
              {(() => {
                const item = checklistItems.find(i => i.id === contextMenu.itemId);
                return item?.reminderDate ? (
                  <button
                    onClick={() => handleRemoveReminder(contextMenu.itemId)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <BellOff className="w-4 h-4" />
                    <span>{t('actions.remove_reminder')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetReminder(contextMenu.itemId)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{t('tasks.context_menu.set_reminder')}</span>
                  </button>
                );
              })()}
              
              <button
                onClick={() => {
                  const item = checklistItems.find(i => i.id === contextMenu.itemId);
                  if (item) handleConvertToTask(item);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowRight className="w-4 h-4" />
                                    <span>{t('simple_today_view.convert_to_task')}</span>
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
            </>
          )}
          
          <button
            onClick={() => handleDeleteItem(contextMenu.itemId)}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="w-4 h-4" />
            <span>{t('actions.delete')}</span>
          </button>
        </div>,
        document.body
      )}

            {/* Reminder Input Modal */}
      {showReminderInput && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('forms.set_reminder')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tasks.context_menu.date')}
                </label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  style={{
                    '--tw-ring-color': state.preferences.accentColor
                  } as React.CSSProperties}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('forms.time_optional')}
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  style={{
                    '--tw-ring-color': state.preferences.accentColor
                  } as React.CSSProperties}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleReminderCancel}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
 {t('actions.cancel')}
              </button>
              <button
                onClick={handleReminderSave}
                disabled={!reminderDate}
                className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  backgroundColor: state.preferences.accentColor
                }}
                onMouseEnter={(e) => {
                  if (!reminderDate) return;
                  e.currentTarget.style.backgroundColor = state.preferences.accentColor + 'dd';
                }}
                onMouseLeave={(e) => {
                  if (!reminderDate) return;
                  e.currentTarget.style.backgroundColor = state.preferences.accentColor;
                }}
              >
 {t('actions.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 