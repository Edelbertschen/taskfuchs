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
  Bell
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { DatePickerModal } from '../Common/DatePickerModal';

interface TaskActionsMenuProps {
  task: Task;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSetDate?: (dateType: 'today' | 'tomorrow' | 'next-week' | 'custom') => void;
  className?: string;
}

export function TaskActionsMenu({ 
  task, 
  onDelete, 
  onDuplicate, 
  onSetDate,
  className = '' 
}: TaskActionsMenuProps) {
  const { state, dispatch } = useApp();
  const [isOpen, setIsOpen] = useState(false);
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
  const [submenuPosition, setSubmenuPosition] = useState<'right' | 'left'>('right');
  const timeInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close menu ONLY when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Prevent any automatic closing - only close on explicit outside clicks
      if (!isOpen) return;
      
      const target = event.target as Element;
      
      // Don't close if clicking within menu or any of its elements
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking within button
      if (buttonRef.current && buttonRef.current.contains(target)) {
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
      setIsOpen(false);
      setShowPrioritySubmenu(false);
      setShowDateSubmenu(false);
      setShowTimeSubmenu(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowPrioritySubmenu(false);
        setShowDateSubmenu(false);
        setShowTimeSubmenu(false);
        setShowTagsSubmenu(false);
        setShowReminderSubmenu(false);
        setIsEditingTime(false);
        setIsEditingTag(false);
        setIsEditingReminder(false);
        setShowDatePicker(false);
        setTimeInput('');
        setNewTagInput('');
        setCustomReminderInput('');
      }
    };

    if (isOpen) {
      // Add event listeners with capture: true for higher priority
      document.addEventListener('mousedown', handleClickOutside, { capture: true });
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, { capture: true });
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }
  }, [isOpen]);

  // Calculate menu position to ensure it's always visible
  const calculateMenuPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 280;
    
    let top = buttonRect.bottom + 4;
    let left = buttonRect.left;

    // Adjust if menu would go off right edge
    if (left + menuWidth > window.innerWidth) {
      left = buttonRect.right - menuWidth;
    }

    // Adjust if menu would go off bottom edge
    if (top + menuHeight > window.innerHeight) {
      top = buttonRect.top - menuHeight - 4;
    }

    // Ensure menu doesn't go off left edge
    if (left < 8) {
      left = 8;
    }

    // Ensure menu doesn't go off top edge
    if (top < 8) {
      top = 8;
    }

    setMenuPosition({ top, left });
  };

  // Calculate submenu position to prevent overflow
  const calculateSubmenuPosition = () => {
    if (!menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const submenuWidth = 200; // Approximate submenu width
    
    // Check if there's enough space on the right
    const spaceOnRight = window.innerWidth - menuRect.right;
    
    if (spaceOnRight >= submenuWidth + 16) { // 16px margin
      setSubmenuPosition('right');
    } else {
      setSubmenuPosition('left');
    }
  };

  // Get submenu positioning classes
  const getSubmenuClasses = (additionalClasses: string) => {
    const baseClasses = `absolute top-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 ${additionalClasses}`;
    
    if (submenuPosition === 'right') {
      return `${baseClasses} left-full ml-1`;
    } else {
      return `${baseClasses} right-full mr-1`;
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculateMenuPosition();
    }
    setIsOpen(!isOpen);
    setShowPrioritySubmenu(false);
    setShowDateSubmenu(false);
    setShowTimeSubmenu(false);
    setIsEditingTime(false);
    setTimeInput('');
  };

  const handlePriorityChange = (e: React.MouseEvent, priority: 'high' | 'medium' | 'low' | 'none') => {
    e.stopPropagation();
    e.preventDefault();
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        priority,
        updatedAt: new Date().toISOString()
      }
    });
    
    // Close menu immediately after selection
    setIsOpen(false);
    setShowPrioritySubmenu(false);
    setShowDateSubmenu(false);
    setShowTimeSubmenu(false);
    setShowTagsSubmenu(false);
    setShowReminderSubmenu(false);
    setIsEditingTag(false);
    setIsEditingReminder(false);
    setShowDatePicker(false);
    setNewTagInput('');
    setCustomReminderInput('');
  };

  const handleDateAssignment = (e: React.MouseEvent, dateType: 'today' | 'tomorrow' | 'next-week' | 'custom' | 'none') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (dateType === 'none') {
      // Remove date from task
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          columnId: 'inbox', // Move to inbox when removing date
          reminderDate: undefined,
          dueDate: undefined,
          updatedAt: new Date().toISOString()
        }
      });
      
      console.log(`📅 Removed date from task "${task.title}"`);
      
      // Close menu
      setIsOpen(false);
      setShowDateSubmenu(false);
      return;
    }
    
    if (dateType === 'custom') {
      setShowDatePicker(true);
      return; // Keep menu open for date picker
    }
    
    // Calculate target date
    let targetDate: Date;
    const today = new Date();
    
    switch (dateType) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = addDays(today, 1);
        break;
      case 'next-week':
        targetDate = addDays(startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }), 0); // Next Monday
        break;
      default:
        return;
    }
    
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    const targetColumnId = `date-${targetDateStr}`;
    
    // Ensure the date column exists
    dispatch({ type: 'ENSURE_DATE_COLUMN', payload: targetDateStr });
    
    // Move task to the target date column - PRESERVE project assignment
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        columnId: targetColumnId,
        reminderDate: targetDateStr,
        // IMPORTANT: Keep projectId and kanbanColumnId so task stays visible in project view
        projectId: task.projectId, // Preserve project assignment
        kanbanColumnId: task.kanbanColumnId, // Preserve kanban column
        updatedAt: new Date().toISOString()
      }
    });
    
    console.log(`📅 Moved task "${task.title}" to date column ${targetColumnId}`);
    
    // Close menu immediately after selection
    setIsOpen(false);
    setShowDateSubmenu(false);
    setShowPrioritySubmenu(false);
    setShowTimeSubmenu(false);
    setShowTagsSubmenu(false);
    setShowReminderSubmenu(false);
    setIsEditingTag(false);
    setIsEditingReminder(false);
    setShowDatePicker(false);
    setNewTagInput('');
    setCustomReminderInput('');
  };

  const handleCustomDateSelect = (selectedDate: Date) => {
    const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
    const targetColumnId = `date-${targetDateStr}`;
    
    // Ensure the date column exists
    dispatch({ type: 'ENSURE_DATE_COLUMN', payload: targetDateStr });
    
    // Move task to the selected date column - PRESERVE project assignment
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        columnId: targetColumnId,
        reminderDate: targetDateStr,
        // IMPORTANT: Keep projectId and kanbanColumnId so task stays visible in project view
        projectId: task.projectId, // Preserve project assignment
        kanbanColumnId: task.kanbanColumnId, // Preserve kanban column
        updatedAt: new Date().toISOString()
      }
    });
    
    console.log(`📅 Moved task "${task.title}" to custom date column ${targetColumnId}`);
    
    // Close both date picker and menu
    setShowDatePicker(false);
    setIsOpen(false);
    setShowDateSubmenu(false);
    setShowPrioritySubmenu(false);
    setShowTimeSubmenu(false);
    setShowTagsSubmenu(false);
    setShowReminderSubmenu(false);
    setIsEditingTag(false);
    setIsEditingReminder(false);
    setNewTagInput('');
    setCustomReminderInput('');
  };

  const handleReminderChange = (e: React.MouseEvent, reminderType: 'none' | '15min' | '1hour' | '1.5hour' | '2hour' | '3hour' | '4hour' | '1day' | 'custom') => {
    e.stopPropagation();
    e.preventDefault();
    
    let reminderDate: string | undefined;
    let reminderTime: string | undefined;
    
    if (reminderType !== 'none' && reminderType !== 'custom') {
      const now = new Date();
      
      switch (reminderType) {
        case '15min':
          now.setMinutes(now.getMinutes() + 15);
          break;
        case '1hour':
          now.setHours(now.getHours() + 1);
          break;
        case '1.5hour':
          now.setMinutes(now.getMinutes() + 90);
          break;
        case '2hour':
          now.setHours(now.getHours() + 2);
          break;
        case '3hour':
          now.setHours(now.getHours() + 3);
          break;
        case '4hour':
          now.setHours(now.getHours() + 4);
          break;
        case '1day':
          now.setDate(now.getDate() + 1);
          break;
      }
      
      reminderDate = format(now, 'yyyy-MM-dd');
      reminderTime = format(now, 'HH:mm');
    } else if (reminderType === 'custom') {
      // Keep submenu open for custom reminder input
      return;
    }
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        reminderDate,
        reminderTime,
        updatedAt: new Date().toISOString()
      }
    });
    
    console.log(`🔔 Set reminder for task "${task.title}": ${reminderDate} ${reminderTime}`);
    
    // Close menu immediately after selection
    setIsOpen(false);
    setShowReminderSubmenu(false);
    setShowDateSubmenu(false);
    setShowPrioritySubmenu(false);
    setShowTimeSubmenu(false);
    setShowTagsSubmenu(false);
    setIsEditingTag(false);
    setIsEditingReminder(false);
    setShowDatePicker(false);
    setNewTagInput('');
    setCustomReminderInput('');
  };

  const handleStartEditingReminder = () => {
    setIsEditingReminder(true);
    setTimeout(() => {
      if (reminderInputRef.current) {
        reminderInputRef.current.focus();
        reminderInputRef.current.select();
      }
    }, 100);
  };

  const handleCustomReminderSubmit = () => {
    const minutesInput = parseInt(customReminderInput);
    if (!isNaN(minutesInput) && minutesInput > 0) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + minutesInput);
      
      const reminderDate = format(now, 'yyyy-MM-dd');
      const reminderTime = format(now, 'HH:mm');
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          reminderDate,
          reminderTime,
          updatedAt: new Date().toISOString()
        }
      });
      
      console.log(`🔔 Set custom reminder for task "${task.title}" in ${minutesInput} minutes: ${reminderDate} ${reminderTime}`);
      
      setCustomReminderInput('');
      setIsEditingReminder(false);
      setIsOpen(false);
      setShowReminderSubmenu(false);
      setShowDateSubmenu(false);
      setShowPrioritySubmenu(false);
      setShowTimeSubmenu(false);
      setShowTagsSubmenu(false);
      setIsEditingTag(false);
      setShowDatePicker(false);
      setNewTagInput('');
    }
  };

  const handleCancelEditingReminder = () => {
    setCustomReminderInput('');
    setIsEditingReminder(false);
  };

  const handleTimeChange = (e: React.MouseEvent, minutes: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        estimatedTime: minutes === 0 ? undefined : minutes,
        updatedAt: new Date().toISOString()
      }
    });
    
    // Close menu immediately after selection
    setIsOpen(false);
    setShowTimeSubmenu(false);
    setShowPrioritySubmenu(false);
    setShowDateSubmenu(false);
    setShowTagsSubmenu(false);
    setShowReminderSubmenu(false);
    setIsEditingTag(false);
    setIsEditingReminder(false);
    setShowDatePicker(false);
    setNewTagInput('');
    setCustomReminderInput('');
  };

  const handleCustomTimeSubmit = () => {
    const timeValue = parseInt(timeInput);
    if (!isNaN(timeValue) && timeValue >= 0) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          estimatedTime: timeValue === 0 ? undefined : timeValue,
          updatedAt: new Date().toISOString()
        }
      });
      
      setTimeInput('');
      setIsEditingTime(false);
      setIsOpen(false);
      setShowTimeSubmenu(false);
      setShowPrioritySubmenu(false);
      setShowDateSubmenu(false);
      setShowTagsSubmenu(false);
      setShowReminderSubmenu(false);
      setIsEditingTag(false);
      setIsEditingReminder(false);
      setShowDatePicker(false);
      setNewTagInput('');
      setCustomReminderInput('');
    }
  };

  const handleCustomTimeCancel = () => {
    setTimeInput('');
    setIsEditingTime(false);
  };

  const handleTagToggle = (tagName: string) => {
    const currentTags = task.tags || [];
    const updatedTags = currentTags.includes(tagName)
      ? currentTags.filter(tag => tag !== tagName)
      : [...currentTags, tagName];
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, tags: updatedTags }
    });
  };

  const handleCreateNewTag = () => {
    const tagName = newTagInput.trim();
    if (!tagName) return;
    
    // Check if tag already exists
    const existingTag = state.tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag) {
      // Tag already exists, just add it to the task
      handleTagToggle(existingTag.name);
    } else {
      // Create new tag and add it to the task
      const newTag = {
        id: `tag-${tagName}`,
        name: tagName,
        color: '#6b7280', // Default gray color
        count: 1
      };
      
      // Add tag to global tags
      dispatch({
        type: 'ADD_TAG',
        payload: newTag
      });
      
      // Add tag to current task
      const currentTags = task.tags || [];
      const updatedTags = [...currentTags, tagName];
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, tags: updatedTags }
      });
    }
    
    // Clear input and exit editing mode
    setNewTagInput('');
    setIsEditingTag(false);
  };

  const handleStartEditingTag = () => {
    setIsEditingTag(true);
    setTimeout(() => {
      tagInputRef.current?.focus();
    }, 50);
  };

  const handleCancelEditingTag = () => {
    setNewTagInput('');
    setIsEditingTag(false);
  };

  const handleStartEditingTime = () => {
    setIsEditingTime(true);
    setTimeInput(task.estimatedTime?.toString() || '');
    // Focus input after state update
    setTimeout(() => {
      timeInputRef.current?.focus();
    }, 10);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'; // red-500
      case 'medium': return '#f59e0b'; // yellow-500  
      case 'low': return '#10b981'; // green-500
      default: return '#9ca3af'; // gray-400
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return 'Keine';
    }
  };

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
          <span className="flex-1 text-left">Priorität</span>
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
              <span>Hoch</span>
              {task.priority === 'high' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'medium')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Mittel</span>
              {task.priority === 'medium' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'low')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Niedrig</span>
              {task.priority === 'low' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
            </button>
            <button
              onClick={(e) => handlePriorityChange(e, 'none')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>Keine</span>
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
          <span className="flex-1 text-left">Zeitschätzung</span>
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
                    title="Bestätigen"
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
              <span>Keine Zeit</span>
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
          <span className="flex-1 text-left">Tags</span>
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
                  <span>Neues Tag...</span>
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
                    title="Tag erstellen"
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
          <span className="flex-1 text-left">Datum</span>
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
              <span>Heute</span>
            </button>
            <button
              onClick={(e) => handleDateAssignment(e, 'tomorrow')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>Morgen</span>
            </button>
            <button
              onClick={(e) => handleDateAssignment(e, 'next-week')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Nächste Woche</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            <button
              onClick={(e) => handleDateAssignment(e, 'custom')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Datum wählen...</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            <button
              onClick={(e) => handleDateAssignment(e, 'none')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
              <span>Kein Datum</span>
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
          <span className="flex-1 text-left">Erinnerung</span>
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
               <span>In 15 Min</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '1hour')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-green-600" />
               <span>In 1 Stunde</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '1.5hour')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-green-600" />
               <span>In 1 Stunde 30 Minuten</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '2hour')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-orange-600" />
               <span>In 2 Stunden</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '3hour')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-orange-600" />
               <span>In 3 Stunden</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '4hour')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-orange-600" />
               <span>In 4 Stunden</span>
             </button>
             
             <button
               onClick={(e) => handleReminderChange(e, '1day')}
               className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Bell className="w-4 h-4 text-purple-600" />
               <span>Morgen</span>
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
                     title="Erinnerung setzen"
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
              <span>Keine Erinnerung</span>
              {!(task.reminderDate && task.reminderTime) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

      {/* Duplicate */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onDuplicate) onDuplicate();
          setIsOpen(false);
          setShowTimeSubmenu(false);
          setShowPrioritySubmenu(false);
          setShowDateSubmenu(false);
          setShowTagsSubmenu(false);
          setShowReminderSubmenu(false);
          setIsEditingReminder(false);
          setShowDatePicker(false);
          setCustomReminderInput('');
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Duplizieren</span>
      </button>

      <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          setIsOpen(false);
          setShowTimeSubmenu(false);
          setShowPrioritySubmenu(false);
          setShowDateSubmenu(false);
          setShowTagsSubmenu(false);
          setShowReminderSubmenu(false);
          setIsEditingReminder(false);
          setShowDatePicker(false);
          setCustomReminderInput('');
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>Löschen</span>
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleMenuToggle}
        className={`p-1.5 rounded-md text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ${className}`}
        title="Aktionen"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && createPortal(<MenuContent />, document.body)}
      
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
          title="Datum auswählen"
          allowAnyDate={true}
        />
      )}
    </>
  );
} 