import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreHorizontal, 
  Trash2, 
  Flag, 
  Clock, 
  Tag, 
  Calendar, 
  Copy,
  CalendarDays,
  CalendarClock,
  Check,
  X,
  Bell,
  Pin,
  ChevronRight,
  FolderKanban
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { Task } from '../../types';
import { DatePickerModal } from '../Common/DatePickerModal';

interface TaskContextMenuProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSetDate?: (dateType: 'today' | 'tomorrow' | 'next-week' | 'custom') => void;
  mousePosition: { x: number; y: number };
}

export function TaskContextMenu({ 
  task, 
  isOpen,
  onClose,
  onDelete, 
  onDuplicate, 
  onSetDate,
  mousePosition
}: TaskContextMenuProps) {
  const { state, dispatch } = useApp();
  const { pins, tasks } = useAppTranslation();
  const { t, i18n } = useTranslation();
  const [showPrioritySubmenu, setShowPrioritySubmenu] = useState(false);
  const [showDateSubmenu, setShowDateSubmenu] = useState(false);
  const [showTimeSubmenu, setShowTimeSubmenu] = useState(false);
  const [showTagsSubmenu, setShowTagsSubmenu] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderSubmenu, setShowReminderSubmenu] = useState(false);
  const [customReminderInput, setCustomReminderInput] = useState('');
  const [isEditingReminder, setIsEditingReminder] = useState(false);
  const [showPinSubmenu, setShowPinSubmenu] = useState(false);
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<'right' | 'left'>('right');
  const timeInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close menu on ESC key or outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      
      const target = event.target as Element;
      
      // Don't close if clicking within menu or any of its elements
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on input fields or form elements
      if (target.tagName === 'INPUT' || target.tagName === 'FORM' || target.closest('form')) {
        return;
      }
      
      // Don't close if clicking on reminder input specifically
      if (reminderInputRef.current && (target === reminderInputRef.current || reminderInputRef.current.contains(target))) {
        return;
      }
      
      // Don't close if clicking on any element with high z-index (other menus/modals)
      const clickedElement = target.closest('[style*="z-index"]');
      if (clickedElement) {
        const zIndex = parseInt(window.getComputedStyle(clickedElement).zIndex || '0');
        if (zIndex >= 999999) {
          return;
        }
      }
      
      // Only close if it's a legitimate outside click
      onClose();
      setShowPrioritySubmenu(false);
      setShowDateSubmenu(false);
      setShowTimeSubmenu(false);
      setShowTagsSubmenu(false);
      setShowReminderSubmenu(false);
      setShowPinSubmenu(false);
      setShowProjectSubmenu(false);
      setIsEditingTag(false);
      setIsEditingTime(false);
      setIsEditingReminder(false);
      setShowDatePicker(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        setShowPrioritySubmenu(false);
        setShowDateSubmenu(false);
        setShowTimeSubmenu(false);
        setShowTagsSubmenu(false);
        setShowReminderSubmenu(false);
        setShowPinSubmenu(false);
        setShowProjectSubmenu(false);
        setIsEditingTag(false);
        setIsEditingTime(false);
        setIsEditingReminder(false);
        setShowDatePicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Position menu near mouse click, but keep it on screen
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const { x, y } = mousePosition;
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let top = y;
      let left = x;

      // Adjust position to keep menu on screen
      if (left + menuRect.width > windowWidth) {
        left = windowWidth - menuRect.width - 10;
      }
      if (top + menuRect.height > windowHeight) {
        top = windowHeight - menuRect.height - 10;
      }
      if (left < 0) left = 10;
      if (top < 0) top = 10;

      setMenuPosition({ top, left });
    }
  }, [isOpen, mousePosition]);

  const calculateSubmenuPosition = () => {
    if (!menuRef.current) return;
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const submenuWidth = 200; // Approximate submenu width
    
    // If there's not enough space on the right, show submenu on the left
    if (menuRect.right + submenuWidth > windowWidth) {
      setSubmenuPosition('left');
    } else {
      setSubmenuPosition('right');
    }
  };

  const getSubmenuClasses = (additionalClasses = "") => {
    const baseClasses = "absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-150";
    const positionClasses = submenuPosition === 'right' 
      ? 'left-full top-0 ml-1' 
      : 'right-full top-0 mr-1';
    return `${baseClasses} ${positionClasses} ${additionalClasses}`;
  };

  // Priority functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#9CA3AF';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return t('tasks.priority.high', 'High');
      case 'medium': return t('tasks.priority.medium', 'Medium');
      case 'low': return t('tasks.priority.low', 'Low');
      default: return t('tasks.priority.none', 'None');
    }
  };

  const handlePriorityChange = (e: React.MouseEvent, priority: 'high' | 'medium' | 'low' | 'none') => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_TASK',
      payload: { 
        ...task, 
        priority: priority === 'none' ? undefined : priority 
      }
    });
    setShowPrioritySubmenu(false);
  };

  // Time functions
  const handleTimeChange = (e: React.MouseEvent, minutes: number) => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_TASK',
      payload: { 
        ...task, 
        estimatedTime: minutes === 0 ? undefined : minutes 
      }
    });
    setShowTimeSubmenu(false);
  };

  const handleStartEditingTime = () => {
    setIsEditingTime(true);
    setTimeInput(task.estimatedTime?.toString() || '');
    setTimeout(() => {
      timeInputRef.current?.focus();
      timeInputRef.current?.select();
    }, 0);
  };

  const handleCustomTimeSubmit = () => {
    const minutes = parseInt(timeInput);
    if (!isNaN(minutes) && minutes >= 0) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { 
          ...task, 
          estimatedTime: minutes === 0 ? undefined : minutes 
        }
      });
    }
    setIsEditingTime(false);
    setTimeInput('');
    setShowTimeSubmenu(false);
  };

  const handleCustomTimeCancel = () => {
    setIsEditingTime(false);
    setTimeInput('');
  };

  // Tag functions
  const handleTagToggle = (tagName: string) => {
    const currentTags = task.tags || [];
    const newTags = currentTags.includes(tagName) 
      ? currentTags.filter(tag => tag !== tagName)
      : [...currentTags, tagName];
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: { 
        ...task, 
        tags: newTags.length > 0 ? newTags : undefined 
      }
    });
  };

  const handleStartEditingTag = () => {
    setIsEditingTag(true);
    setNewTagInput('');
    setTimeout(() => {
      tagInputRef.current?.focus();
    }, 0);
  };

  const handleCreateNewTag = () => {
    const tagName = newTagInput.trim();
    if (!tagName) return;

    // Check if tag already exists
    const existingTag = state.tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    
    if (!existingTag) {
      // Create new tag
      const newTag = {
        id: `tag-${Date.now()}`,
        name: tagName,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        count: 0
      };
      
      dispatch({
        type: 'ADD_TAG',
        payload: newTag
      });
    }

    // Add tag to task
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { 
          ...task, 
          tags: [...currentTags, tagName]
        }
      });
    }

    setIsEditingTag(false);
    setNewTagInput('');
  };

  const handleCancelEditingTag = () => {
    setIsEditingTag(false);
    setNewTagInput('');
  };

  // Date functions
  const handleDateAssignment = (e: React.MouseEvent, dateType: 'today' | 'tomorrow' | 'next-week' | 'custom' | 'none') => {
    e.stopPropagation();
    
    if (dateType === 'none') {
      // Remove date from task
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          columnId: 'inbox', // Move to inbox when removing date
          reminderDate: undefined,
          dueDate: undefined
        }
      });
      setShowDateSubmenu(false);
      onClose();
      return;
    }
    
    if (dateType === 'custom') {
      setShowDatePicker(true);
      setShowDateSubmenu(false);
      return;
    }
    
    if (onSetDate) {
      onSetDate(dateType);
    }
    
    setShowDateSubmenu(false);
  };

  const handleCustomDateSelect = (selectedDate: Date) => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const columnId = `date-${dateString}`;
    
    // Check if column exists, create if not
    const existingColumn = state.columns.find(col => col.id === columnId);
    if (!existingColumn) {
      dispatch({
        type: 'ADD_COLUMN',
        payload: {
          id: columnId,
          title: format(selectedDate, 'dd.MM.yyyy'),
          type: 'date',
          date: dateString,
          order: state.columns.filter(col => col.type === 'date').length,
          tasks: []
        }
      });
    }
    
    // Move task to the date column
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        columnId: columnId
      }
    });
    
    setShowDatePicker(false);
  };

  // Reminder functions
  const handleReminderChange = (e: React.MouseEvent, reminderType: string) => {
    e.stopPropagation();
    
    if (reminderType === 'none') {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          reminderDate: undefined,
          reminderTime: undefined
        }
      });
    } else {
      const now = new Date();
      let reminderDate: Date;
      
      switch (reminderType) {
        case '15min':
          reminderDate = new Date(now.getTime() + 15 * 60 * 1000);
          break;
        case '1hour':
          reminderDate = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '1.5hour':
          reminderDate = new Date(now.getTime() + 90 * 60 * 1000);
          break;
        case '2hour':
          reminderDate = new Date(now.getTime() + 120 * 60 * 1000);
          break;
        case '3hour':
          reminderDate = new Date(now.getTime() + 180 * 60 * 1000);
          break;
        case '4hour':
          reminderDate = new Date(now.getTime() + 240 * 60 * 1000);
          break;
        case '1day':
          reminderDate = addDays(now, 1);
          break;
        default:
          reminderDate = now;
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          reminderDate: format(reminderDate, 'yyyy-MM-dd'),
          reminderTime: format(reminderDate, 'HH:mm')
        }
      });
    }
    
    setShowReminderSubmenu(false);
  };

  const handleStartEditingReminder = () => {
    setIsEditingReminder(true);
    setCustomReminderInput('');
    setTimeout(() => {
      reminderInputRef.current?.focus();
      reminderInputRef.current?.select();
    }, 0);
  };

  const handleCustomReminderSubmit = () => {
    const minutes = parseInt(customReminderInput);
    if (!isNaN(minutes) && minutes > 0) {
      const now = new Date();
      const reminderDate = new Date(now.getTime() + minutes * 60 * 1000);
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          reminderDate: format(reminderDate, 'yyyy-MM-dd'),
          reminderTime: format(reminderDate, 'HH:mm')
        }
      });
    }
    setIsEditingReminder(false);
    setCustomReminderInput('');
    setShowReminderSubmenu(false);
  };

  const handleCancelEditingReminder = () => {
    setIsEditingReminder(false);
    setCustomReminderInput('');
  };



  if (!isOpen) return null;

  const MenuContent = () => (
    <div
      ref={menuRef}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        position: 'fixed',
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 999999, // Extremely high z-index
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >


      {/* Priority Section */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showPrioritySubmenu) {
              calculateSubmenuPosition();
            }
            setShowPrioritySubmenu(!showPrioritySubmenu);
            setShowDateSubmenu(false); // Close other submenu
            setShowTimeSubmenu(false); // Close other submenu
            setShowTagsSubmenu(false); // Close other submenu
            setShowReminderSubmenu(false); // Close other submenu
            setIsEditingTag(false); // Exit tag editing
            setIsEditingReminder(false); // Exit reminder editing
            setShowDatePicker(false); // Close date picker
            setNewTagInput(''); // Clear tag input
            setCustomReminderInput(''); // Clear reminder input
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span className="flex-1 text-left">{t('task_context_menu.priority')}</span>
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: getPriorityColor(task.priority || 'none') }}
            />
            <span className="text-xs text-gray-500">{getPriorityText(task.priority || 'none')}</span>
          </div>
        </button>
        
        {showPrioritySubmenu && (
          <div 
            className={getSubmenuClasses("min-w-[140px]")}
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handlePriorityChange(e, 'high')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>{t('tasks.priority.high', 'High')}</span>
              {task.priority === 'high' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'medium')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>{t('tasks.priority.medium', 'Medium')}</span>
              {task.priority === 'medium' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'low')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>{t('tasks.priority.low', 'Low')}</span>
              {task.priority === 'low' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'none')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>{t('tasks.priority.none', 'None')}</span>
              {(task.priority === 'none' || !task.priority) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Time Estimation */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showTimeSubmenu) {
              calculateSubmenuPosition();
            }
            setShowTimeSubmenu(!showTimeSubmenu);
            setShowPrioritySubmenu(false); // Close other submenu
            setShowDateSubmenu(false); // Close other submenu
            setShowTagsSubmenu(false); // Close other submenu
            setShowReminderSubmenu(false); // Close other submenu
            setIsEditingTag(false); // Exit tag editing
            setIsEditingReminder(false); // Exit reminder editing
            setShowDatePicker(false); // Close date picker
            setNewTagInput(''); // Clear tag input
            setCustomReminderInput(''); // Clear reminder input
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Clock className="w-4 h-4" />
          <span className="flex-1 text-left">{t('task_context_menu.time_estimation')}</span>
          {task.estimatedTime && task.estimatedTime > 0 && (
            <span className="text-xs text-gray-500">{task.estimatedTime}m</span>
          )}
        </button>
        
        {showTimeSubmenu && (
          <div 
            className={getSubmenuClasses("min-w-[160px] py-2")}
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            {/* Quick time buttons */}
            {[15, 30, 45, 60, 90, 120].map(minutes => (
              <button
                key={minutes}
                onClick={(e) => handleTimeChange(e, minutes)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{minutes}min</span>
                {task.estimatedTime === minutes && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            
            {/* Custom time input */}
            <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              {!isEditingTime ? (
                <button
                  onClick={handleStartEditingTime}
                  className="w-full flex items-center gap-3 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Eigene Zeit...</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={timeInputRef}
                    type="number"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    placeholder="Min"
                    min="0"
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomTimeSubmit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCustomTimeCancel();
                      }
                    }}
                    onFocus={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      // Only blur if clicking outside the entire time submenu
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onInput={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <button
                    onClick={handleCustomTimeSubmit}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                    title={t('task_context_menu.confirm')}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCustomTimeCancel}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Abbrechen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={(e) => handleTimeChange(e, 0)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{t('task_context_menu.no_time')}</span>
              {!task.estimatedTime && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showTagsSubmenu) {
              calculateSubmenuPosition();
            }
            setShowTagsSubmenu(!showTagsSubmenu);
            setShowPrioritySubmenu(false); // Close other submenus
            setShowDateSubmenu(false);
            setShowTimeSubmenu(false);
            setShowReminderSubmenu(false);
            setShowDatePicker(false); // Close date picker
            if (showTagsSubmenu) {
              setNewTagInput(''); // Clear input when closing
              setIsEditingTag(false); // Exit editing when closing
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Tag className="w-4 h-4" />
          <span className="flex-1 text-left">{t('task_context_menu.tags')}</span>
          {task.tags && task.tags.length > 0 && (
            <span className="text-xs text-gray-500">{task.tags.length}</span>
          )}
        </button>
        
        {showTagsSubmenu && (
          <div 
            className={getSubmenuClasses("min-w-[200px] py-2")}
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            {state.tags.length > 0 && (
              <>
                {state.tags.map((tag) => {
                  const isSelected = task.tags?.includes(tag.name) || false;
                  return (
                    <button
                      key={tag.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTagToggle(tag.name);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="flex-1 text-left">{tag.name}</span>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </button>
                  );
                })}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              </>
            )}
            
            {/* New tag input */}
            <div className="px-3 py-2">
              {!isEditingTag ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditingTag();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span>{t('task_context_menu.new_tag')}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Tag"
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewTag();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEditingTag();
                      }
                    }}
                    onFocus={(e) => e.stopPropagation()}
                    onBlur={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onInput={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateNewTag();
                    }}
                    disabled={!newTagInput.trim()}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                    title={t('task_context_menu.create_tag')}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEditingTag();
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Abbrechen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date Assignment */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showDateSubmenu) {
              calculateSubmenuPosition();
            }
            setShowDateSubmenu(!showDateSubmenu);
            setShowPrioritySubmenu(false); // Close other submenu
            setShowTimeSubmenu(false); // Close other submenu
            setShowTagsSubmenu(false); // Close other submenu
            setShowReminderSubmenu(false); // Close other submenu
            setIsEditingTag(false); // Exit tag editing
            setIsEditingReminder(false); // Exit reminder editing
            setShowDatePicker(false); // Close date picker
            setNewTagInput(''); // Clear tag input
            setCustomReminderInput(''); // Clear reminder input
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span className="flex-1 text-left">{t('task_context_menu.date')}</span>
        </button>
        
        {showDateSubmenu && (
          <div 
            className={getSubmenuClasses("min-w-[160px]")}
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handleDateAssignment(e, 'today')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <CalendarDays className="w-4 h-4 text-green-600" />
              <span>{t('task_context_menu.today')}</span>
            </button>
            <button
              onClick={(e) => handleDateAssignment(e, 'tomorrow')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>{t('task_context_menu.tomorrow')}</span>
            </button>
            <button
              onClick={(e) => handleDateAssignment(e, 'next-week')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>{t('task_context_menu.next_week')}</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            <button
              onClick={(e) => handleDateAssignment(e, 'custom')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>{t('task_context_menu.choose_date')}</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            <button
              onClick={(e) => handleDateAssignment(e, 'none')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
              <span>{t('task_context_menu.no_date', 'Kein Datum')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showReminderSubmenu) {
              calculateSubmenuPosition();
            }
            setShowReminderSubmenu(!showReminderSubmenu);
            setShowPrioritySubmenu(false); // Close other submenu
            setShowDateSubmenu(false); // Close other submenu
            setShowTimeSubmenu(false); // Close other submenu
            setShowTagsSubmenu(false); // Close other submenu
            setIsEditingTag(false); // Exit tag editing
            setIsEditingReminder(false); // Exit reminder editing
            setShowDatePicker(false); // Close date picker
            setNewTagInput(''); // Clear tag input
            setCustomReminderInput(''); // Clear reminder input
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="flex-1 text-left">{t('task_context_menu.reminder')}</span>
          {(task.reminderDate && task.reminderTime) && (
            <span className="text-xs text-gray-500">{task.reminderTime}</span>
          )}
        </button>
        
        {showReminderSubmenu && (
          <div 
            className={getSubmenuClasses("min-w-[220px]")}
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            {/* Quick reminder buttons */}
            <button
              onClick={(e) => handleReminderChange(e, '15min')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-blue-600" />
              <span>{t('task_context_menu.in_15_min')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '1hour')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-green-600" />
              <span>{t('task_context_menu.in_1_hour')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '1.5hour')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-green-600" />
              <span>{t('task_context_menu.in_1_5_hours')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '2hour')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-orange-600" />
              <span>{t('task_context_menu.in_2_hours')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '3hour')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-orange-600" />
              <span>{t('task_context_menu.in_3_hours')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '4hour')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-orange-600" />
              <span>{t('task_context_menu.in_4_hours')}</span>
            </button>
            
            <button
              onClick={(e) => handleReminderChange(e, '1day')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-4 h-4 text-purple-600" />
            <span>{t('task_context_menu.tomorrow')}</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            
            {/* Custom reminder input */}
            <div 
              className="px-3 py-2"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {!isEditingReminder ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditingReminder();
                  }}
                  className="w-full flex items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded"
                >
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span>Eigene Zeit...</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCustomReminderSubmit();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={reminderInputRef}
                    type="number"
                    value={customReminderInput}
                    autoFocus
                    onChange={(e) => setCustomReminderInput(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setTimeout(() => {
                        reminderInputRef.current?.focus();
                        reminderInputRef.current?.select();
                      }, 0);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomReminderSubmit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEditingReminder();
                      }
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onInput={(e) => e.stopPropagation()}
                    placeholder="Min"
                    tabIndex={0}
                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <button
                    type="submit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomReminderSubmit();
                    }}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                    title={t('task_context_menu.set_reminder')}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEditingReminder();
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Abbrechen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>
           
           <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
           
           <button
             onClick={(e) => handleReminderChange(e, 'none')}
             className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
           >
             <Bell className="w-4 h-4 text-gray-400" />
             <span>{t('task_context_menu.no_reminder')}</span>
             {!(task.reminderDate && task.reminderTime) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
           </button>
         </div>
       )}
     </div>

     <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

     {/* Pin Options */}
     {task.pinColumnId ? (
       <button
         onClick={(e) => {
           e.stopPropagation();
           dispatch({
             type: 'UNPIN_TASK',
             payload: task.id
           });
           onClose();
         }}
         className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
       >
         <Pin className="w-4 h-4" />
         <span>{pins.removePin()}</span>
       </button>
    ) : state.pinColumns.length === 0 ? (
      // No pin columns - directly pin to default
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Create default pin column if none exists and pin the task
          const now = new Date().toISOString();
          const defaultColumn = {
            id: 'default-pin-' + Date.now(),
            title: t('pins.default_column', 'Pinned'),
            color: state.preferences.accentColor,
            order: 0,
            createdAt: now,
            updatedAt: now
          };
          dispatch({
            type: 'ADD_PIN_COLUMN',
            payload: defaultColumn
          });
          dispatch({
            type: 'ASSIGN_TASK_TO_PIN',
            payload: { taskId: task.id, pinColumnId: defaultColumn.id }
          });
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Pin className="w-4 h-4" />
        <span>{t('task_context_menu.set_pin')}</span>
      </button>
    ) : state.pinColumns.length === 1 ? (
      // Only one pin column - directly pin to it
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch({
            type: 'ASSIGN_TASK_TO_PIN',
            payload: { taskId: task.id, pinColumnId: state.pinColumns[0].id }
          });
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Pin className="w-4 h-4" />
        <span>{t('task_context_menu.set_pin')}</span>
      </button>
    ) : (
      // Multiple pin columns - show submenu
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPinSubmenu(!showPinSubmenu);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Pin className="w-4 h-4" />
          <span>{t('task_context_menu.set_pin')}</span>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
        
        {showPinSubmenu && (
          <div 
            className={`absolute top-0 ${submenuPosition === 'right' ? 'left-full' : 'right-full'} z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48`}
            style={{ marginLeft: submenuPosition === 'right' ? '4px' : '-4px' }}
          >
            {state.pinColumns.map((column) => (
              <button
                key={column.id}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({
                    type: 'ASSIGN_TASK_TO_PIN',
                    payload: { taskId: task.id, pinColumnId: column.id }
                  });
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500"
                  style={{ backgroundColor: column.color || state.preferences.accentColor }}
                />
                <span>{column.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )}

     {/* Project Assignment */}
     {(() => {
       // Get all projects (columns with type 'project')
       const projects = state.columns.filter(col => col.type === 'project');
       const currentProject = projects.find(p => task.projectId === p.id);
       
       if (projects.length === 0) {
         return null; // No projects available
       }
       
       return (
         <div className="relative">
           <button
             onClick={(e) => {
               e.stopPropagation();
               if (!showProjectSubmenu) {
                 calculateSubmenuPosition();
               }
               setShowProjectSubmenu(!showProjectSubmenu);
               setShowPrioritySubmenu(false);
               setShowDateSubmenu(false);
               setShowTimeSubmenu(false);
               setShowTagsSubmenu(false);
               setShowReminderSubmenu(false);
               setShowPinSubmenu(false);
             }}
             className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
           >
             <FolderKanban className="w-4 h-4" />
             <span className="flex-1 text-left">{t('task_context_menu.project', 'Projekt')}</span>
             {currentProject && (
               <span className="text-xs text-gray-500 truncate max-w-20">{currentProject.title}</span>
             )}
             <ChevronRight className="w-4 h-4" />
           </button>
           
           {showProjectSubmenu && (
             <div 
               className={getSubmenuClasses("min-w-[200px] max-h-80 overflow-y-auto")}
               style={{ zIndex: 1000000 }}
               onClick={(e) => e.stopPropagation()}
             >
               {/* Remove from project option */}
               {task.projectId && (
                 <>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       dispatch({
                         type: 'UPDATE_TASK',
                         payload: { 
                           ...task, 
                           projectId: undefined,
                           kanbanColumnId: undefined
                         }
                       });
                       setShowProjectSubmenu(false);
                       setExpandedProjectId(null);
                       onClose();
                     }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                   >
                     <X className="w-4 h-4" />
                     <span>{t('task_context_menu.remove_from_project', 'Aus Projekt entfernen')}</span>
                   </button>
                   <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                 </>
               )}
               
               {/* Project list with expandable columns */}
               {projects.map((project) => {
                 const isSelected = task.projectId === project.id;
                 const isExpanded = expandedProjectId === project.id;
                const projectKanbanColumns = state.viewState.projectKanban.columns
                  .filter(col => col.projectId === project.id)
                  .sort((a, b) => (a.order || 0) - (b.order || 0));
                 
                 // Handler for direct project assignment (creates column if needed)
                 const handleDirectProjectAssign = (e: React.MouseEvent) => {
                   e.stopPropagation();
                   
                   let targetColumnId: string;
                   
                   if (projectKanbanColumns.length === 0) {
                     // No columns exist - create "Allgemein" column
                     const newColumnId = `kanban-col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                     const columnTitle = i18n.language === 'en' ? 'General' : 'Allgemein';
                     
                     dispatch({
                       type: 'ADD_PROJECT_KANBAN_COLUMN',
                       payload: {
                         id: newColumnId,
                         title: columnTitle,
                         projectId: project.id,
                         order: 0
                       }
                     });
                     
                     targetColumnId = newColumnId;
                   } else {
                     // Use first column
                     targetColumnId = projectKanbanColumns[0].id;
                   }
                   
                   // Assign task to project and column
                   dispatch({
                     type: 'UPDATE_TASK',
                     payload: { 
                       ...task, 
                       projectId: project.id,
                       kanbanColumnId: targetColumnId
                     }
                   });
                   
                   setShowProjectSubmenu(false);
                   setExpandedProjectId(null);
                   onClose();
                 };
                 
                 return (
                   <div key={project.id}>
                     {/* Project header - click on name to assign directly, chevron to expand */}
                     <div
                       className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                         isExpanded 
                           ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                           : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                       }`}
                     >
                       <div 
                         className="w-3 h-3 rounded flex-shrink-0" 
                         style={{ backgroundColor: project.color || state.preferences.accentColor }}
                       />
                       {/* Project name - click to assign directly */}
                       <button
                         onClick={handleDirectProjectAssign}
                         className="flex-1 text-left truncate font-medium hover:underline"
                         title={projectKanbanColumns.length === 0 
                           ? t('task_context_menu.assign_create_column', 'Zuweisen (erstellt "Allgemein"-Spalte)')
                           : t('task_context_menu.assign_first_column', 'Zur ersten Spalte zuweisen')
                         }
                       >
                         {project.title}
                       </button>
                       {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                       {/* Chevron to expand columns */}
                       {projectKanbanColumns.length > 0 && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setExpandedProjectId(isExpanded ? null : project.id);
                           }}
                           className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                         >
                           <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                         </button>
                       )}
                     </div>
                     
                     {/* Expanded column list */}
                     {isExpanded && projectKanbanColumns.length > 0 && (
                       <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-600">
                         {projectKanbanColumns.map((column) => {
                           const isColumnSelected = task.kanbanColumnId === column.id;
                           return (
                             <button
                               key={column.id}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 dispatch({
                                   type: 'UPDATE_TASK',
                                   payload: { 
                                     ...task, 
                                     projectId: project.id,
                                     kanbanColumnId: column.id
                                   }
                                 });
                                 setShowProjectSubmenu(false);
                                 setExpandedProjectId(null);
                                 onClose();
                               }}
                               className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                                 isColumnSelected
                                   ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300'
                                   : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                               }`}
                             >
                               <span className="flex-1 text-left truncate">{column.title}</span>
                               {isColumnSelected && <Check className="w-3 h-3" />}
                             </button>
                           );
                         })}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       );
     })()}

     <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

     {/* Duplicate */}
     <button
       onClick={(e) => {
         e.stopPropagation();
         if (onDuplicate) onDuplicate();
         onClose();
       }}
       className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
     >
       <Copy className="w-4 h-4" />
       <span>{t('task_context_menu.duplicate')}</span>
     </button>

     <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

     {/* Delete */}
     <button
       onClick={(e) => {
         e.stopPropagation();
         onDelete();
         onClose();
       }}
       className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
     >
       <Trash2 className="w-4 h-4" />
                   <span>{t('task_context_menu.delete')}</span>
     </button>
   </div>
 );

 return createPortal(
   <>
     <MenuContent />
     
     {showDatePicker && (
       <DatePickerModal
         isOpen={showDatePicker}
         onClose={() => setShowDatePicker(false)}
         onSelectDate={(columnId: string) => {
           // Extract date from columnId (format: "date-yyyy-mm-dd")
           const dateStr = columnId.replace('date-', '');
           const selectedDate = new Date(dateStr + 'T00:00:00');
           handleCustomDateSelect(selectedDate);
         }}
         availableColumns={state.columns.filter(col => col.type === 'date')}
         title={t('task_context_menu.select_date')}
         allowAnyDate={true}
       />
     )}
   </>,
   document.body
 );
} 