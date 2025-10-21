import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { 
  X, Calendar, Clock, Tag, Hash, Plus, Trash2, Save, AlertTriangle, 
  Eye, Edit, BookOpen, Link, FileText, Play, Pause, Square, Timer,
  CalendarDays, FolderOpen, ChevronDown, Target, Zap, Search, GripHorizontal,
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Quote, 
  Minus, CheckSquare, HelpCircle, EyeOff, Pin, Edit2, ChevronLeft, ChevronRight,
  ArrowLeftRight, Inbox, Bell, Maximize, Minimize, ChevronUp, GripVertical
} from 'lucide-react';
import { MarkdownRenderer } from '../Common/MarkdownRenderer';
import type { Task, Subtask, Column, RecurrenceRule, TaskReminder } from '../../types';
import { useApp } from '../../context/AppContext';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { SeriesEditModal } from '../Common/SeriesEditModal';
import { SeriesDeleteModal } from '../Common/SeriesDeleteModal';
import { WysiwygEditor } from '../Common/WysiwygEditor';
import { TimerControls } from '../Timer/TimerControls';
import { parseTaskInput } from '../../utils/taskParser';
import type { ParseResult } from '../../types';
import { format, addDays, startOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { playCompletionSound } from '../../utils/soundUtils';
import { RecurringTaskSection } from './RecurringTaskSection';


interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  // Optional: called after a successful save with the updated task
  onSaved?: (updatedTask: Task) => void;
  // Optional: show navigation controls and invoke when user clicks arrows
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  // Optional: control whether modal closes after save (default: true)
  shouldCloseOnSave?: boolean;
  // Optional: hint for in-modal content transition when switching tasks
  navDirection?: 'prev' | 'next' | null;
}

interface FormData {
  title: string;
  description: string;
  priority?: 'none' | 'low' | 'medium' | 'high';
  estimatedTime: number;
  tags: string[];
  subtasks: Subtask[];
  linkedNotes: string[];
  reminderDate?: string; // ISO date string for reminder
  reminderTime?: string; // Time in HH:mm format for reminder
  deadline?: string; // ISO date string for deadline
  projectId?: string; // Project assignment for flexible visibility
  kanbanColumnId?: string; // Kanban column assignment for project tasks
}

export function TaskModal({ task, isOpen, onClose, onSaved, onNavigatePrev, onNavigateNext, shouldCloseOnSave = true, navDirection = null }: TaskModalProps) {
  const { state, dispatch } = useApp();
  const { actions, forms, titles, messages, taskModal, pins } = useAppTranslation();
  const { t } = useTranslation();
  const [navPos, setNavPos] = useState<{ top: number; leftX: number; rightX: number } | null>(null);
  
  // Helper: preserve placement fields when updating
  const preservePlacement = (orig: Task, patch: Partial<Task>): Task => ({
    ...orig,
    ...patch,
    columnId: patch.columnId !== undefined ? patch.columnId : orig.columnId,
    projectId: patch.projectId !== undefined ? patch.projectId : orig.projectId,
    kanbanColumnId: patch.kanbanColumnId !== undefined ? patch.kanbanColumnId : orig.kanbanColumnId,
  } as Task);
  
  // Utility functions for dynamic accent colors
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'dd' }, // Slightly transparent for hover
      text: { color: accentColor },
      border: { borderColor: accentColor },
      progress: { 
        background: `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor} 100%)`
      },
      // Enhanced styles for reminders
      reminderBg: { backgroundColor: accentColor + '15' },
      reminderBgHover: { backgroundColor: accentColor + '25' },
      reminderBorder: { borderColor: accentColor + '50' },
      reminderText: { color: accentColor },
      reminderTextSecondary: { color: accentColor + 'cc' },

    };
  };
  const [formData, setFormData] = useState<FormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority,
    estimatedTime: task?.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : undefined,
    tags: task?.tags || [],
    subtasks: task?.subtasks || [],
    linkedNotes: task?.linkedNotes || [],
    reminderDate: task?.reminderDate,
    reminderTime: task?.reminderTime,
    deadline: task?.deadline,
    projectId: task?.projectId,
    kanbanColumnId: task?.kanbanColumnId,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNotesOverlay, setShowNotesOverlay] = useState(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [isDescriptionPreview, setIsDescriptionPreview] = useState(false);
  
  // Collapsible sections state - auto-expand if content exists
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isMetaExpanded, setIsMetaExpanded] = useState(true);

  // Auto-expand sections when they have content
  useEffect(() => {
    if (formData.subtasks.length > 0) {
      setIsSubtasksExpanded(true);
    }
    if (formData.linkedNotes.length > 0) {
      setIsNotesExpanded(true);
    }
  }, [formData.subtasks.length, formData.linkedNotes.length]);

  // Block all interactions behind the modal when opened
  useEffect(() => {
    if (isOpen) {
      // Block body scroll
      document.body.style.overflow = 'hidden';
      
      // Block all pointer events on the main app container
      const appElement = document.querySelector('#root');
      if (appElement) {
        (appElement as HTMLElement).style.pointerEvents = 'none';
      }
      
      // Add global event listeners to prevent drag interactions
      const preventDragEvents = (e: Event) => {
        if (e.target && !(e.target as Element).closest('.modal-content')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      const dragEvents = ['dragstart', 'drag', 'dragend', 'dragover', 'drop', 'dragenter', 'dragleave'];
      dragEvents.forEach(eventType => {
        document.addEventListener(eventType, preventDragEvents, { capture: true, passive: false });
      });
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore pointer events
        if (appElement) {
          (appElement as HTMLElement).style.pointerEvents = '';
        }
        
        // Remove global event listeners
        dragEvents.forEach(eventType => {
          document.removeEventListener(eventType, preventDragEvents, { capture: true });
        });
      };
    }
  }, [isOpen]);

  // Track modal position to place side navigation elegantly beside it
  const modalRef = useRef<HTMLDivElement | null>(null);
  // Track if the backdrop received the original mousedown to avoid immediate close
  const backdropMouseDownRef = useRef<boolean>(false);
  // Suppress backdrop close for the initial click that opened the modal (prevents immediate close)
  const suppressBackdropClickRef = useRef<boolean>(true);

  useEffect(() => {
    // Allow backdrop clicks only after the current event loop tick
    const id = setTimeout(() => { suppressBackdropClickRef.current = false; }, 0);
    return () => {
      suppressBackdropClickRef.current = true;
      clearTimeout(id);
    };
  }, []);
  const updateNavPositions = useCallback(() => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setNavPos({
      top: Math.round(rect.top + rect.height / 2),
      leftX: Math.round(rect.left + 4),
      rightX: Math.round(rect.right - 4),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateNavPositions();
    const onResize = () => updateNavPositions();
    const onScroll = () => updateNavPositions();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    const obs = new ResizeObserver(updateNavPositions);
    if (modalRef.current) obs.observe(modalRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      try { obs.disconnect(); } catch {}
    };
  }, [isOpen, updateNavPositions]);

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false); // Flag to prevent form reset during date updates
  const [showProjectColumnSelector, setShowProjectColumnSelector] = useState(false);
  const [showInlineProjectSelector, setShowInlineProjectSelector] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectColumns, setShowProjectColumns] = useState(false);
  const [showSeriesEditModal, setShowSeriesEditModal] = useState(false);
  const [pendingTaskData, setPendingTaskData] = useState<Task | null>(null);
  const [showSeriesDeleteModal, setShowSeriesDeleteModal] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [selectedProjectForColumns, setSelectedProjectForColumns] = useState<string | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isDescriptionPreviewMode, setIsDescriptionPreviewMode] = useState(true);
  
  // Multi-line subtask creation
  const [showMultiLineModal, setShowMultiLineModal] = useState(false);
  const [multiLineText, setMultiLineText] = useState('');
  const [currentSubtaskId, setCurrentSubtaskId] = useState<string | null>(null);
  const [pastePosition, setPastePosition] = useState({ x: 0, y: 0 });
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [liveUpdateTrigger, setLiveUpdateTrigger] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Deadline-specific state
  const [deadlineInputValue, setDeadlineInputValue] = useState('');
  
  // Reminder-specific state
  const [reminderTimeInput, setReminderTimeInput] = useState('');
  
  // Time management state
  const [showTimeManagement, setShowTimeManagement] = useState(false);
  const [showPinDropdown, setShowPinDropdown] = useState(false);


  // merged with modalRef above
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const newSubtaskRef = useRef<HTMLInputElement>(null);

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeHours, setEditTimeHours] = useState(0);
  const [editTimeMinutes, setEditTimeMinutes] = useState(0);
  const [isEditingEstimatedTime, setIsEditingEstimatedTime] = useState(false);
  // Legacy reminder fields - will be removed when fully migrated
  const [showReminderFields, setShowReminderFields] = useState(false);
  const [showDeadlineFields, setShowDeadlineFields] = useState(false);
  
  // Reminder editing state
  const [isEditingReminder, setIsEditingReminder] = useState(false);

  // Initialize showReminderFields only when reminder data exists
  useEffect(() => {
    // Only show reminder fields if a time is explicitly set (not just a date from column)
    setShowReminderFields(!!formData.reminderTime);
  }, [formData.reminderTime]);



  // Initialize showDeadlineFields only when deadline data exists
  useEffect(() => {
    setShowDeadlineFields(!!formData.deadline);
  }, [formData.deadline]);

  // Initialize showTimeManagement only when estimated time exists
  useEffect(() => {
    setShowTimeManagement(!!formData.estimatedTime && formData.estimatedTime > 0);
  }, [formData.estimatedTime]);

  // Initialize form data when task changes
  useEffect(() => {
    if (task && !isUpdatingDates) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        tags: [...task.tags],
        subtasks: task.subtasks.map(subtask => ({ ...subtask })),
        linkedNotes: task.linkedNotes || [],
        reminderDate: task.reminderDate,
        reminderTime: task.reminderTime,
        deadline: task.deadline,
        projectId: task.projectId,
        kanbanColumnId: task.kanbanColumnId,
      });
      setHasUnsavedChanges(false);
      setRecurrenceRule(null); // Reset recurrence rule when task changes
    }
  }, [task?.id, isUpdatingDates]);

  // Track changes to recurrence rule
  useEffect(() => {
    if (recurrenceRule) {
      setHasUnsavedChanges(true);
    }
  }, [recurrenceRule]);

  // Check for unsaved changes
  useEffect(() => {
    if (!task) return;
    
    const hasChanges = 
      formData.title !== task.title ||
      formData.description !== (task.description || '') ||
      formData.priority !== task.priority ||
      formData.estimatedTime !== task.estimatedTime ||
      formData.reminderDate !== task.reminderDate ||
      formData.reminderTime !== task.reminderTime ||
      formData.deadline !== task.deadline ||
      formData.projectId !== task.projectId ||
      formData.kanbanColumnId !== task.kanbanColumnId ||
      JSON.stringify(formData.tags.sort()) !== JSON.stringify(task.tags.sort()) ||
      JSON.stringify(formData.subtasks) !== JSON.stringify(task.subtasks) ||
      JSON.stringify(formData.linkedNotes.sort()) !== JSON.stringify((task.linkedNotes || []).sort());
    
    setHasUnsavedChanges(hasChanges);
  }, [formData, task]);

  // Handle modal close
  const handleClose = useCallback(() => {
    // Trigger graceful close animation before unmounting
    try {
      const modalEl = document.querySelector('.task-modal-root') as HTMLElement | null;
      const backdropEl = document.querySelector('.modal-backdrop') as HTMLElement | null;
      if (modalEl) {
        modalEl.classList.add('animate-modal-out');
      }
      if (backdropEl) {
        backdropEl.classList.add('animate-backdrop-out');
      }
    } catch {}
    const doClose = () => {
      if (hasUnsavedChanges) {
        setShowConfirmDialog(true);
      } else {
        onClose();
      }
    };
    // Allow CSS animation to play briefly
    setTimeout(doClose, 150);
  }, [hasUnsavedChanges, onClose]);

  // Handle ESC key and backdrop clicks
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isDescriptionExpanded) {
        setIsDescriptionExpanded(false);
      } else {
        handleClose();
      }
    }
  }, [isDescriptionExpanded, handleClose]);

  // Removed handleClickOutside to prevent unwanted modal closes
  // Modal should only close via explicit user actions: close button, escape key, or backdrop click

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleEscape);
    // Removed mousedown listener for handleClickOutside to prevent unwanted modal closes
    // Modal should only close via explicit user actions: close button, escape key, or backdrop click
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  // Live timer updates - update display every second when timer is active
  useEffect(() => {
    if (!task || !state.activeTimer || state.activeTimer.taskId !== task.id || !state.activeTimer.isActive || state.activeTimer.isPaused) {
      return;
    }

    const interval = setInterval(() => {
      setLiveUpdateTrigger(prev => prev + 1);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [task?.id, state.activeTimer?.taskId, state.activeTimer?.isActive, state.activeTimer?.isPaused]);

  // Update trigger when activeTimer changes (start/stop/pause/resume)
  useEffect(() => {
    setLiveUpdateTrigger(prev => prev + 1);
  }, [state.activeTimer?.isActive, state.activeTimer?.isPaused, state.activeTimer?.taskId]);

  // Function to process deadline input in various formats
  const processDeadlineInput = (input: string): string | null => {
    if (!input.trim()) return null;
    
    const cleaned = input.replace(/\D/g, ''); // Remove all non-digits
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0-based to 1-based
    const currentDay = today.getDate();
    
    try {
      // Handle various formats
      if (cleaned.length === 8) {
        // Format: ttmmjjjj (e.g., 21072025)
        const day = parseInt(cleaned.slice(0, 2));
        const month = parseInt(cleaned.slice(2, 4));
        const year = parseInt(cleaned.slice(4, 8));
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= currentYear) {
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      } else if (cleaned.length === 6) {
        // Format: ttmmjj (e.g., 210725)
        const day = parseInt(cleaned.slice(0, 2));
        const month = parseInt(cleaned.slice(2, 4));
        let year = parseInt(cleaned.slice(4, 6));
        
        // Convert 2-digit year to 4-digit year
        if (year < 50) {
          year += 2000; // 00-49 -> 2000-2049
        } else {
          year += 1900; // 50-99 -> 1950-1999
        }
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= currentYear) {
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      } else if (cleaned.length === 4) {
        // Format: ttmm (assume current year)
        const day = parseInt(cleaned.slice(0, 2));
        const month = parseInt(cleaned.slice(2, 4));
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          let year = currentYear;
          
          // If the month/day is in the past, use next year
          if (month < currentMonth || (month === currentMonth && day < currentDay)) {
            year += 1;
          }
          
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day && date.getMonth() === month - 1) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      } else if (cleaned.length === 2) {
        // Format: tt (assume current month and year)
        const day = parseInt(cleaned);
        
        if (day >= 1 && day <= 31) {
          let month = currentMonth;
          let year = currentYear;
          
          // If the day is in the past, use next month
          if (day < currentDay) {
            month += 1;
            if (month > 12) {
              month = 1;
              year += 1;
            }
          }
          
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      }
      
      // Try to parse tt.mm.jj or tt.mm.jjjj format
      const dotFormat = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (dotFormat) {
        const day = parseInt(dotFormat[1]);
        const month = parseInt(dotFormat[2]);
        let year = parseInt(dotFormat[3]);
        
        // Convert 2-digit year to 4-digit year
        if (year < 100) {
          if (year < 50) {
            year += 2000;
          } else {
            year += 1900;
          }
        }
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= currentYear) {
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
            return format(date, 'yyyy-MM-dd');
          }
        }
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
    }
    
    return null;
  };

  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false);
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop (not on modal content)
    if (e.target === e.currentTarget) {
      // Check if any dropdowns or interactive elements are open
      if (showInlineCalendar || showProjectPicker || showTagSelector || showInlineProjectSelector || showMarkdownHelp || showNotesOverlay) {
        // Close dropdowns first, don't close modal
        setShowInlineCalendar(false);
        setShowProjectPicker(false);
        setShowTagSelector(false);
        setShowInlineProjectSelector(false);
        setShowProjectColumns(false);
        setSelectedProjectForColumns(null);
        setProjectSearchQuery('');
        setIsCreatingColumn(false);
        setNewColumnTitle('');
        return;
      }
      
      // Use the same logic as the close button
      handleClose();
    }
  }, [handleClose, showInlineCalendar, showProjectPicker, showTagSelector, showInlineProjectSelector, showMarkdownHelp, showNotesOverlay]);

  const isRecurringTask = () => {
    return task && (
      task.parentSeriesId || 
      task.recurring?.enabled || 
      task.recurrenceRuleId
    );
  };

  const handleSave = useCallback(() => {
    if (!task) return;
    
    const taskData: Task = {
      ...task, // Start with all existing task data
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      estimatedTime: formData.estimatedTime || 0,
      tags: formData.tags,
      subtasks: formData.subtasks,
      linkedNotes: formData.linkedNotes,
      reminderDate: formData.reminderDate,
      reminderTime: formData.reminderTime,
      deadline: formData.deadline,
      projectId: formData.projectId,
      kanbanColumnId: formData.kanbanColumnId,
      updatedAt: new Date().toISOString(),
    } as Task;

    // Handle recurrence rule if provided
    if (recurrenceRule) {
      taskData.recurrenceRuleId = recurrenceRule.id;
      dispatch({ type: 'ADD_RECURRENCE_RULE', payload: recurrenceRule });
      
      // Convert recurrence rule to new recurring format for series system
      taskData.recurring = {
        enabled: true,
        type: recurrenceRule.pattern.type,
        interval: recurrenceRule.interval,
        daysOfWeek: recurrenceRule.weekdays?.map(day => {
          const dayMap: Record<string, number> = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          return dayMap[day] || 1;
        }),
        endDate: recurrenceRule.end.type === 'on' ? recurrenceRule.end.date : undefined,
        maxOccurrences: recurrenceRule.end.type === 'after' ? recurrenceRule.end.count : undefined
      };
      
      // Set due date if reminder date is provided
      if (formData.reminderDate) {
        taskData.dueDate = formData.reminderDate;
    taskData.deadline = formData.deadline; // Ensure deadline field is also set
      }
    } else {
      taskData.recurrenceRuleId = undefined;
      taskData.recurring = undefined;
      taskData.dueDate = formData.reminderDate || undefined;
        taskData.deadline = formData.deadline; // Set deadline field
    }

    // Determine where the task should be placed based on assignments
    if (formData.projectId && formData.reminderDate) {
      // Task assigned to BOTH project and date - visible in both views
      taskData.columnId = `date-${formData.reminderDate}`; // Primary location for storage
      taskData.projectId = formData.projectId; // Makes it visible in project view too
      taskData.kanbanColumnId = formData.kanbanColumnId; // Preserve kanban column assignment
      
      // Ensure date column exists
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: formData.reminderDate });
      
      // Ensure deadline column exists if deadline is set
      if (formData.deadline) {
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: formData.deadline });
      }
      
      console.log('✨ Task assigned to BOTH project and date:', {
        taskId: task.id,
        columnId: taskData.columnId,
        projectId: taskData.projectId,
        kanbanColumnId: taskData.kanbanColumnId
      });
      
    } else if (formData.projectId) {
      // Task assigned ONLY to project - visible only in project view
      taskData.columnId = formData.projectId; // Store in project column
      taskData.projectId = formData.projectId;
      taskData.kanbanColumnId = formData.kanbanColumnId; // Use selected kanban column
      taskData.reminderDate = undefined; // Clear any previous date assignment
      taskData.reminderTime = undefined;
      
      console.log('🗂️ Task assigned ONLY to project:', {
        taskId: task.id,
        projectId: taskData.projectId,
        kanbanColumnId: taskData.kanbanColumnId
      });
      
    } else if (formData.reminderDate) {
      // Task assigned to date - check if it should keep project assignment
      taskData.columnId = `date-${formData.reminderDate}`;
      
      // IMPORTANT: Preserve existing project assignment if task was already in a project
      // Only clear project if it was explicitly removed in the form
      if (task.projectId && !formData.projectId) {
        // Task WAS in a project but project was explicitly removed in form
        // In this case, we should show in BOTH date planner AND original project
        taskData.projectId = task.projectId; // Keep original project assignment
        taskData.kanbanColumnId = task.kanbanColumnId; // Keep original kanban column
        
        console.log('📅🗂️ Task assigned to date but keeping original project:', {
          taskId: task.id,
          columnId: taskData.columnId,
          projectId: taskData.projectId,
          kanbanColumnId: taskData.kanbanColumnId,
          date: formData.reminderDate
        });
      } else {
        // Task was not in a project originally, or project was explicitly set in form
        taskData.projectId = formData.projectId || undefined;
        taskData.kanbanColumnId = formData.kanbanColumnId || undefined;
        
        console.log('📅 Task assigned to date (no project preservation):', {
          taskId: task.id,
          columnId: taskData.columnId,
          projectId: taskData.projectId,
          date: formData.reminderDate
        });
      }
      
      // Ensure date column exists
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: formData.reminderDate });
      
      // Ensure deadline column exists if deadline is set
      if (formData.deadline) {
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: formData.deadline });
      }
      
    } else {
      // Task assigned to NEITHER project nor date - goes to inbox
      taskData.columnId = 'inbox';
      taskData.projectId = undefined;
      taskData.kanbanColumnId = undefined; // Clear kanban column assignment
      taskData.reminderDate = undefined;
      taskData.reminderTime = undefined;
      
      console.log('📥 Task assigned to INBOX (no project or date):', {
        taskId: task.id
      });
    }
    
    // Ensure deadline column exists if deadline is set (regardless of other assignments)
    if (formData.deadline) {
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: formData.deadline });
    }

    // Check if this is a recurring task (instance or series)
    if (isRecurringTask()) {
      // Store the pending task data and show series edit modal
      setPendingTaskData(taskData);
      setShowSeriesEditModal(true);
      return;
    }

    // Update the task with new assignment
    dispatch({
      type: 'UPDATE_TASK',
      payload: preservePlacement(task!, taskData)
    });

    console.log('💾 Task saved with flexible assignment:', {
      taskId: task.id,
      finalColumnId: taskData.columnId,
      finalProjectId: taskData.projectId,
      finalReminderDate: taskData.reminderDate,
      visibility: getTaskVisibilityFromData(taskData)
    });

    setHasUnsavedChanges(false);
    // Notify parent before closing to allow navigation/auto-advance flows
    try {
      onSaved && onSaved(taskData);
    } catch {}
    if (shouldCloseOnSave) {
      onClose();
    }
  }, [task, formData, dispatch, onClose, onSaved, shouldCloseOnSave, recurrenceRule]);

  // Helper function to determine task visibility from task data
  const getTaskVisibilityFromData = (taskData: Task) => {
    const hasProject = !!taskData.projectId;
    const hasDate = !!taskData.reminderDate;
    
    if (hasProject && hasDate) return 'both';
    if (hasProject) return 'project-only';
    if (hasDate) return 'planner-only';
    return 'inbox-only';
  };

  const handleEditInstance = () => {
    if (!pendingTaskData) return;
    
    // For "Nur diese Instanz", always just update the current task
    // No need to create copies - just update the existing instance
    dispatch({
      type: 'UPDATE_TASK',
      payload: preservePlacement(task!, pendingTaskData)
    });

    setShowSeriesEditModal(false);
    setPendingTaskData(null);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleEditSeries = () => {
    if (!pendingTaskData) return;
    
    // Update the series template
    const seriesId = pendingTaskData.parentSeriesId || pendingTaskData.id;
    const seriesTask = state.tasks.find(t => t.id === seriesId);
    
    if (seriesTask) {
      const updatedSeries = {
        ...seriesTask,
        title: pendingTaskData.title,
        description: pendingTaskData.description,
        priority: pendingTaskData.priority,
        estimatedTime: pendingTaskData.estimatedTime,
        tags: pendingTaskData.tags,
        reminderTime: pendingTaskData.reminderTime,
        projectId: pendingTaskData.projectId,
        kanbanColumnId: pendingTaskData.kanbanColumnId,
        updatedAt: new Date().toISOString(),
      };
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: updatedSeries
      });
    }

    // If this is an instance, also update it
    if (pendingTaskData.parentSeriesId) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: pendingTaskData
      });
    }

    setShowSeriesEditModal(false);
    setPendingTaskData(null);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleDeleteInstance = () => {
    if (!pendingDeleteTask) return;
    
    // Delete only this instance
    dispatch({
      type: 'DELETE_TASK',
      payload: pendingDeleteTask.id
    });

    setShowSeriesDeleteModal(false);
    setPendingDeleteTask(null);
    onClose();
  };

  const handleDeleteSeries = () => {
    if (!pendingDeleteTask) return;
    
    // Find the series template
    const seriesId = pendingDeleteTask.parentSeriesId || pendingDeleteTask.id;
    
    // Delete all instances of this series
    const allInstances = state.tasks.filter(t => 
      t.parentSeriesId === seriesId || 
      (t.recurrenceRuleId === pendingDeleteTask.recurrenceRuleId && t.id !== seriesId)
    );
    
    allInstances.forEach(instance => {
      dispatch({
        type: 'DELETE_TASK',
        payload: instance.id
      });
    });
    
    // Delete the series template
    dispatch({
      type: 'DELETE_TASK',
      payload: seriesId
    });

    setShowSeriesDeleteModal(false);
    setPendingDeleteTask(null);
    onClose();
  };

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, title: value }));
    
    // Always parse input for smart suggestions - no restrictions
    if (value.trim()) {
      const result = parseTaskInput(value);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, []);

  const applySmartParsing = useCallback(() => {
    if (parseResult?.success && parseResult.task) {
      const parsed = parseResult.task;
      setFormData(prev => ({
        ...prev,
        title: parsed.title,
        priority: parsed.priority || prev.priority,
        estimatedTime: parsed.estimatedTime || prev.estimatedTime,
        tags: parsed.tags.length > 0 ? [...new Set([...prev.tags, ...parsed.tags])] : prev.tags,
        // Also apply description and dueDate if parsed
        description: parsed.description || prev.description,
        reminderDate: parsed.dueDate || prev.reminderDate
      }));
      
      // Clear parse result after applying
      setParseResult(null);
      setHasUnsavedChanges(true);
    }
  }, [parseResult]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySmartParsing();
      // Focus next input (description or blur)
      if (textareaRef.current) {
        textareaRef.current.focus();
      } else {
        e.currentTarget.blur();
      }
    }
  }, [applySmartParsing]);

  const handleTitleBlur = useCallback(() => {
    // Apply smart parsing results when user finishes editing
    applySmartParsing();
  }, [applySmartParsing]);

  const addSubtask = () => {
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      completed: false,
      estimatedTime: undefined,
      trackedTime: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask]
    }));

    // Focus the new subtask input after a short delay
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-subtask-input]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }, 50);
  };

  const updateSubtask = (subtaskId: string, updates: Partial<Subtask>) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(subtask =>
        subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
      )
    }));
  };

  const deleteSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(subtask => subtask.id !== subtaskId)
    }));
  };

  const handleSubtaskKeyPress = (e: React.KeyboardEvent, subtaskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    }
  };

  // Handle paste event for subtasks
  const handleSubtaskPaste = (e: React.ClipboardEvent, subtaskId: string) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    
    // If pasted text has multiple lines, show options modal
    if (lines.length > 1) {
      e.preventDefault();
      setMultiLineText(pastedText);
      setCurrentSubtaskId(subtaskId);
      
      // Get cursor position for modal placement
      const rect = e.currentTarget.getBoundingClientRect();
      setPastePosition({
        x: rect.left + (rect.width / 2),
        y: rect.bottom + 10
      });
      
      setShowMultiLineModal(true);
    }
  };

  // Create multiple subtasks from multi-line text
  const createMultipleSubtasks = () => {
    if (!multiLineText || !currentSubtaskId) return;
    
    const lines = multiLineText.split('\n').filter(line => line.trim() !== '');
    
    // Find the index of the current subtask
    const currentIndex = formData.subtasks.findIndex(st => st.id === currentSubtaskId);
    
    if (currentIndex === -1) return;
    
    // Update the current subtask with the first line
    updateSubtask(currentSubtaskId, { title: lines[0].trim() });
    
    // Create new subtasks for the remaining lines
    const newSubtasks = lines.slice(1).map((line, index) => ({
      id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      title: line.trim(),
      description: '',
      completed: false,
      estimatedTime: undefined,
      trackedTime: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Insert new subtasks after the current one
    setFormData(prev => {
      const subtasks = [...prev.subtasks];
      subtasks.splice(currentIndex + 1, 0, ...newSubtasks);
      return {
        ...prev,
        subtasks
      };
    });
    
    setHasUnsavedChanges(true);
    setShowMultiLineModal(false);
    setMultiLineText('');
    setCurrentSubtaskId(null);
  };

  // Handle normal paste (single line behavior)
  const handleNormalPaste = () => {
    if (!multiLineText || !currentSubtaskId) return;
    
    // Just use the full text as-is (browser will handle the paste normally)
    const firstLine = multiLineText.split('\n')[0].trim();
    updateSubtask(currentSubtaskId, { title: firstLine });
    
    setHasUnsavedChanges(true);
    setShowMultiLineModal(false);
    setMultiLineText('');
    setCurrentSubtaskId(null);
  };

  const formatTime = (minutes: number) => {
    // Return empty string for 0 minutes to prevent showing "0m"
    if (minutes === 0 || !minutes) {
      return '';
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

  // Convert minutes to hours and minutes for editing
  const minutesToHoursAndMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  };

  // Convert hours and minutes back to total minutes
  const hoursAndMinutesToMinutes = (hours: number, minutes: number) => {
    return hours * 60 + minutes;
  };

  // Start editing time
  const startTimeEditing = () => {
    const currentTime = getCurrentTrackedTime();
    const { hours, minutes } = minutesToHoursAndMinutes(currentTime);
    setEditTimeHours(hours);
    setEditTimeMinutes(minutes);
    setIsEditingTime(true);
  };

  // Save edited time
  const saveEditedTime = () => {
    // Validate input
    const validHours = Math.max(0, editTimeHours);
    const validMinutes = Math.max(0, Math.min(59, editTimeMinutes));
    const newTrackedTime = hoursAndMinutesToMinutes(validHours, validMinutes);
    
    if (!task) return;

    // Update the task with new tracked time
    dispatch({
      type: 'UPDATE_TASK',
      payload: preservePlacement(task!, {
        trackedTime: newTrackedTime,
        updatedAt: new Date().toISOString()
      })
    });

    setIsEditingTime(false);
  };

  // Cancel time editing
  const cancelTimeEditing = () => {
    setIsEditingTime(false);
    setEditTimeHours(0);
    setEditTimeMinutes(0);
  };

  // Reset tracked time to zero
  const resetTrackedTime = () => {
    if (!task) return;
    
          if (window.confirm(taskModal.timeTrackedResetConfirm())) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: preservePlacement(task!, {
          trackedTime: 0,
          updatedAt: new Date().toISOString()
        })
      });
    }
  };

  // Live calculation that updates with liveUpdateTrigger
  const getCurrentTrackedTime = () => {
    // Force update by using liveUpdateTrigger
    liveUpdateTrigger; // This ensures re-calculation on timer updates
    if (!task) return 0;
    const currentTask = state.tasks.find(t => t.id === task.id);
    return currentTask?.trackedTime || task.trackedTime || 0;
  };

  const getProgressPercentage = () => {
    if (!task || !formData.estimatedTime) return 0;
    const trackedTime = getCurrentTrackedTime();
    return Math.min((trackedTime / formData.estimatedTime) * 100, 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500 hover:bg-red-600 border-red-500 text-white';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-white';
      case 'low': return 'bg-green-500 hover:bg-green-600 border-green-500 text-white';
      case 'none': return 'bg-gray-400 hover:bg-gray-500 border-gray-400 text-white';
      default: return 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-700';
    }
  };

  const getPriorityColorLight = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-700';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low': return 'bg-green-50 border-green-200 text-green-700';
      case 'none': return 'bg-gray-50 border-gray-200 text-gray-600';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  // Handle task completion toggle
  const handleToggleComplete = useCallback(() => {
    if (task) {
      const newCompletedState = !task.completed;
      
      // Play completion sound if task is being completed
      if (newCompletedState && state.preferences.sounds) {
        playCompletionSound(state.preferences.completionSound, state.preferences.soundVolume).catch(console.warn);
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          completed: newCompletedState,
          updatedAt: new Date().toISOString()
        }
      });
    }
  }, [task, dispatch, state.preferences]);

  // Handle task completion and close modal
  const handleCompleteAndClose = useCallback(() => {
    if (task) {
      // Mark task as completed
      const newCompletedState = true;
      
      // Play completion sound
      if (state.preferences.sounds) {
        playCompletionSound(state.preferences.completionSound, state.preferences.soundVolume).catch(console.warn);
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          completed: newCompletedState,
          updatedAt: new Date().toISOString()
        }
      });

      // Close modal
      onClose();
    }
  }, [task, dispatch, state.preferences, onClose]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Auto-resize description textarea
  useEffect(() => {
    if (isEditingDescription && textareaRef.current) {
      adjustTextareaHeight();
    }
  }, [isEditingDescription, formData.description]);

  // Live update timer and progress every second
  useEffect(() => {
    if (!isOpen || !task) return;
    
    const interval = setInterval(() => {
      // Force re-render to update progress display with latest timer values
      setLiveUpdateTrigger(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, task]);

  // Get all existing tags
  const getAllTags = () => {
    const allTags = new Set<string>();
    state.tasks.forEach(task => {
      task.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const getFilteredTags = () => {
    const allTags = getAllTags();
    if (!tagSearchTerm) return allTags;
    return allTags.filter(tag => 
      tag.toLowerCase().includes(tagSearchTerm.toLowerCase())
    );
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setTagSearchTerm('');
    setShowTagSelector(false);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSearchTerm.trim()) {
        addTag(tagSearchTerm.trim());
      }
    }
  };

  const unlinkNote = (noteId: string) => {
    setFormData(prev => ({
      ...prev,
      linkedNotes: prev.linkedNotes.filter(id => id !== noteId)
    }));
  };

  // Navigate to linked note
  const handleNavigateToNote = (noteId: string) => {
    const note = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).find(n => n.id === noteId);
    if (note) {
      // Close the modal first
      onClose();
      
      // Select the note and switch to editor
      dispatch({ type: 'SELECT_NOTE', payload: note });
      dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
      
      // Emit navigation event for any listeners
      window.dispatchEvent(new CustomEvent('navigate-to-notes', { 
        detail: { noteId } 
      }));
    }
  };

  const handleNavigateToProject = (projectId: string) => {
    const project = state.columns.find(col => col.id === projectId && col.type === 'project');
    if (project) {
      // Close the modal first
      onClose();
      
      // Navigate to the project
      window.dispatchEvent(new CustomEvent('navigate-to-project', {
        detail: { projectId }
      }));
    }
  };

  // Filter notes for search
  const getFilteredNotes = () => {
    return state.notes.notes
      .filter(note => !note.archived)
      .filter(note => {
        if (!notesSearchQuery.trim()) return true;
        
        const query = notesSearchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        );
      });
  };

  // WYSIWYG Editor Functions for Description
  const insertMarkdownInDescription = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    const newText = formData.description.substring(0, start) + before + selectedText + after + formData.description.substring(end);
    
    setFormData(prev => ({ ...prev, description: newText }));
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertHeadingInDescription = (level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertMarkdownInDescription(prefix);
  };

  const insertListInDescription = (ordered: boolean = false) => {
    const prefix = ordered ? '1. ' : '- ';
    insertMarkdownInDescription(prefix);
  };

  const insertCheckboxInDescription = () => {
    insertMarkdownInDescription('- [ ] ');
  };

  const insertHorizontalRuleInDescription = () => {
    insertMarkdownInDescription('\n\n---\n\n');
  };

  const insertLinkInDescription = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      const text = prompt('Link-Text (optional):') || url;
      insertMarkdownInDescription(`[${text}](${url})`);
    }
  };

  // Smart list continuation for description
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart, value } = textarea;
      
      // Find the current line
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionStart);
      const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      
      // Check for checkbox list first (has priority over regular lists)
      const checkboxMatch = currentLine.match(/^(\s*)(-|\*|\+)\s*(\[[ xX]\])\s*(.*)$/);
      if (checkboxMatch) {
        const [, indent, bullet, checkbox, content] = checkboxMatch;
        
        // If the line is empty (just checkbox), remove it and exit list mode
        if (!content.trim()) {
          e.preventDefault();
          const newText = value.substring(0, lineStart) + value.substring(selectionStart);
          setFormData(prev => ({ ...prev, description: newText }));
          
          // Set cursor position
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Continue the checkbox list with a new unchecked checkbox
        e.preventDefault();
        const newText = value.substring(0, selectionStart) + '\n' + indent + bullet + ' [ ] ' + value.substring(selectionStart);
        setFormData(prev => ({ ...prev, description: newText }));
        
        // Set cursor position
        setTimeout(() => {
          const newPosition = selectionStart + indent.length + bullet.length + 5; // "- [ ] " = 5 characters
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
        return;
      }

      // Check for unordered list (only if not a checkbox)
      const unorderedListMatch = currentLine.match(/^(\s*)(-|\*|\+)\s(.*)$/);
      if (unorderedListMatch && !currentLine.includes('[')) { // Make sure it's not a checkbox
        const [, indent, bullet, content] = unorderedListMatch;
        
        // If the line is empty (just bullet), remove it and exit list mode
        if (!content.trim()) {
          e.preventDefault();
          const newText = value.substring(0, lineStart) + value.substring(selectionStart);
          setFormData(prev => ({ ...prev, description: newText }));
          
          // Set cursor position
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Continue the unordered list
        e.preventDefault();
        const newText = value.substring(0, selectionStart) + '\n' + indent + bullet + ' ' + value.substring(selectionStart);
        setFormData(prev => ({ ...prev, description: newText }));
        
        // Set cursor position
        setTimeout(() => {
          const newPosition = selectionStart + indent.length + bullet.length + 2; // "- " = 2 characters
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
        return;
      }

      // Check for ordered list
      const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (orderedListMatch) {
        const [, indent, number, content] = orderedListMatch;
        
        // If the line is empty (just number), remove it and exit list mode
        if (!content.trim()) {
          e.preventDefault();
          const newText = value.substring(0, lineStart) + value.substring(selectionStart);
          setFormData(prev => ({ ...prev, description: newText }));
          
          // Set cursor position
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Continue the ordered list with incremented number
        e.preventDefault();
        const nextNumber = parseInt(number) + 1;
        const newText = value.substring(0, selectionStart) + '\n' + indent + nextNumber + '. ' + value.substring(selectionStart);
        setFormData(prev => ({ ...prev, description: newText }));
        
        // Set cursor position
        setTimeout(() => {
          const newPosition = selectionStart + indent.length + nextNumber.toString().length + 2; // ". " = 2 characters
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
        return;
      }
    }
  };

  // Auto-convert URLs to markdown links for description
  const handleDescriptionChange = (newContent: string) => {
    setFormData(prev => ({ ...prev, description: newContent }));
    
    // Auto-convert @URL to ![](URL) for images
    let processedContent = newContent.replace(/@(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))/gi, '![]($1)');
    
    // Auto-convert plain URLs to markdown links with title fetching
    const urlRegex = /(?<![\[\(])https?:\/\/[^\s\[\]()]+(?![\]\)])/g;
    const urls = newContent.match(urlRegex);
    
    if (urls) {
      urls.forEach(url => {
        // Skip if it's already part of a markdown link or image
        const beforeUrl = newContent.substring(0, newContent.indexOf(url));
        if (!beforeUrl.endsWith('[') && !beforeUrl.endsWith('](') && !beforeUrl.endsWith('@')) {
          fetchUrlTitle(url).then(title => {
            if (title && title !== url) {
              const markdownLink = `[${title}](${url})`;
              setFormData(prev => ({
                ...prev,
                description: prev.description.replace(url, markdownLink)
              }));
            }
          }).catch(() => {
            // Silently ignore errors
          });
        }
      });
    }
    
    // Update with processed content if changed
    if (processedContent !== newContent) {
      setFormData(prev => ({ ...prev, description: processedContent }));
    }
  };

  // Function to fetch URL title
  const fetchUrlTitle = async (url: string): Promise<string | null> => {
    try {
      // Use a CORS proxy or implement server-side title fetching
      // For now, try to extract title from common URL patterns
      
      // Wikipedia URLs
      if (url.includes('wikipedia.org/wiki/')) {
        const title = decodeURIComponent(url.split('/wiki/')[1].replace(/_/g, ' '));
        // Clean up common Wikipedia suffixes
        return title.replace(/\s*\([^)]*\)$/, '').trim();
      }
      
      // GitHub URLs
      if (url.includes('github.com/')) {
        const parts = url.split('github.com/')[1].split('/');
        if (parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      }
      
      // YouTube URLs
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        return 'YouTube Video';
      }
      
      // Stack Overflow URLs
      if (url.includes('stackoverflow.com/questions/')) {
        const parts = url.split('/questions/')[1].split('/');
        if (parts.length >= 2) {
          return decodeURIComponent(parts[1].replace(/-/g, ' '));
        }
        return 'Stack Overflow Question';
      }
      
      // Medium URLs
      if (url.includes('medium.com/')) {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.includes('-')) {
          return decodeURIComponent(lastPart.replace(/-/g, ' '));
        }
        return 'Medium Article';
      }
      
      // Twitter URLs
      if (url.includes('twitter.com/') || url.includes('x.com/')) {
        return 'Twitter/X Post';
      }
      
      // LinkedIn URLs
      if (url.includes('linkedin.com/')) {
        return 'LinkedIn Post';
      }
      
      // Try to fetch the actual title using a CORS proxy (if available)
      // This is a fallback for other URLs
      try {
        // Note: This would require a CORS proxy service or backend endpoint
        // For demonstration, we'll try a public CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
          const data = await response.json();
          const htmlContent = data.contents;
          
          // Extract title from HTML
          const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            let title = titleMatch[1].trim();
            // Clean up common title suffixes
            title = title.replace(/\s*[-|•]\s*[^-|•]*$/, '').trim();
            return title;
          }
        }
      } catch (fetchError) {
        // Silently fail for fetch errors
      }
      
      // Extract domain name as fallback
      try {
        const domain = new URL(url).hostname.replace(/^www\./, '');
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Handle paste events to convert URLs immediately
  const handleDescriptionPaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text is a URL
    const urlRegex = /^https?:\/\/[^\s]+$/;
    if (urlRegex.test(pastedText.trim())) {
      e.preventDefault();
      
      try {
        const urlObj = new URL(pastedText.trim());
        const domain = urlObj.hostname.replace('www.', '');
        const title = domain.charAt(0).toUpperCase() + domain.slice(1);
        
        // Check if the URL points to an image
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        const isImage = imageExtensions.some(ext => 
          pastedText.trim().toLowerCase().includes(ext)
        );
        
        const markdownContent = isImage 
          ? `![${title}](${pastedText.trim()})`
          : `[${title}](${pastedText.trim()})`;
        
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = formData.description.substring(0, start) + markdownContent + formData.description.substring(end);
          setFormData(prev => ({ ...prev, description: newContent }));
          
          // Set cursor position after the inserted link/image
          setTimeout(() => {
            textarea.setSelectionRange(start + markdownContent.length, start + markdownContent.length);
            adjustTextareaHeight();
          }, 0);
        }
      } catch (error) {
        // If URL parsing fails, just paste normally
      }
    }
  };

  // Handle spacebar to convert URLs
  const handleDescriptionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const { selectionStart, value } = textarea;
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      
      // Check if the current line ends with a URL
      const urlMatch = currentLine.match(/https?:\/\/[^\s]+$/);
      if (urlMatch) {
        const url = urlMatch[0];
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '');
          const title = domain.charAt(0).toUpperCase() + domain.slice(1);
          
          // Check if the URL points to an image
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
          const isImage = imageExtensions.some(ext => 
            url.toLowerCase().includes(ext)
          );
          
          const markdownContent = isImage 
            ? `![${title}](${url})`
            : `[${title}](${url})`;
          
          e.preventDefault();
          
          const newContent = value.substring(0, lineStart) + 
                           currentLine.replace(url, markdownContent) + 
                           ' ' + 
                           value.substring(selectionStart);
          
          setFormData(prev => ({ ...prev, description: newContent }));
          
          // Set cursor position after the space
          setTimeout(() => {
            const newPos = lineStart + currentLine.replace(url, markdownContent).length + 1;
            textarea.setSelectionRange(newPos, newPos);
            adjustTextareaHeight();
          }, 0);
        } catch (error) {
          // If URL parsing fails, just add space normally
        }
      }
    }
  };



  // Handle preview click to enter edit mode
  const handleDescriptionPreviewClick = () => {
    if (isDescriptionPreviewMode) {
      setIsDescriptionPreviewMode(false);
      setIsEditingDescription(true);
      // Automatisch vergrößern beim Klick auf die Vorschau
      setIsDescriptionExpanded(true);
      setTimeout(() => {
        textareaRef.current?.focus();
        // Set cursor to end of content
        if (textareaRef.current) {
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 100);
    }
  };

  const getFilteredProjects = () => {
    const projects = state.columns.filter(col => col.type === 'project');
    if (!projectSearchQuery) return projects;
    
    return projects.filter(project => 
      project.title.toLowerCase().includes(projectSearchQuery.toLowerCase())
    );
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectForColumns(projectId);
    setShowProjectColumns(true);
  };

  const handleBackToProjects = () => {
    setShowProjectColumns(false);
    setSelectedProjectForColumns(null);
    setIsCreatingColumn(false);
    setNewColumnTitle('');
  };

  const handleCreateColumn = () => {
    if (!newColumnTitle.trim() || !selectedProjectForColumns) return;
    
    dispatch({
      type: 'ADD_PROJECT_KANBAN_COLUMN',
      payload: {
        title: newColumnTitle.trim(),
        projectId: selectedProjectForColumns,
        color: state.preferences.accentColor
      }
    });
    
    setIsCreatingColumn(false);
    setNewColumnTitle('');
  };

  const handleProjectColumnSelect = (projectId: string, columnId?: string) => {
    console.log('🔍 Project column selected:', { 
      projectId, 
      columnId, 
      selectedProjectForColumns,
      currentFormData: formData
    });
    
    setFormData(prev => ({ 
      ...prev, 
      projectId,
      kanbanColumnId: columnId 
    }));
    
    console.log('✅ FormData updated with kanbanColumnId:', {
      projectId,
      kanbanColumnId: columnId
    });
    
    setHasUnsavedChanges(true);
    setShowProjectColumnSelector(false);
    setShowInlineProjectSelector(false);
    setShowProjectColumns(false);
    setSelectedProjectForColumns(null);
  };

  // Separate function for just selecting a column (keeping existing project)
  const handleColumnSelect = (columnId: string) => {
    console.log('🎯 Column selected (keeping current project):', { 
      columnId,
      currentProjectId: formData.projectId,
      selectedProjectForColumns,
      currentFormData: formData
    });
    
    // If no project is currently selected in formData, use selectedProjectForColumns
    const projectIdToUse = formData.projectId || selectedProjectForColumns;
    
    setFormData(prev => ({ 
      ...prev, 
      projectId: projectIdToUse,
      kanbanColumnId: columnId 
    }));
    
    console.log('✅ FormData updated with kanbanColumnId and projectId:', {
      projectId: projectIdToUse,
      kanbanColumnId: columnId
    });
    
    setHasUnsavedChanges(true);
    setShowProjectColumnSelector(false);
    setShowInlineProjectSelector(false);
    setShowProjectColumns(false);
    setSelectedProjectForColumns(null);
  };

  // Remove project assignment
  const handleRemoveProject = () => {
    setFormData(prev => ({ 
      ...prev, 
      projectId: undefined,
      kanbanColumnId: undefined 
    }));
    setHasUnsavedChanges(true);
  };

  // Remove date assignment
  const handleRemoveDate = () => {
    setFormData(prev => ({ 
      ...prev, 
      reminderDate: undefined, 
      reminderTime: undefined 
    }));
    setHasUnsavedChanges(true);
  };

  // Quick project assignment (without column selection)
  const handleQuickProjectAssign = (projectId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      projectId: projectId || undefined // Convert empty string to undefined
    }));
    setHasUnsavedChanges(true);
    setShowProjectPicker(false);
    setShowInlineProjectSelector(false);
  };

  const handleDateSelect = (date: Date) => {
    if (!task) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    console.log('📅 Date selected for task (will save on modal save):', {
      taskId: task.id,
      date: dateStr,
      currentFormData: formData
    });
    
    // Update formData instead of immediately dispatching
    setFormData(prev => ({
      ...prev,
      reminderDate: dateStr
    }));
    
    console.log('✅ FormData updated with reminderDate:', {
      reminderDate: dateStr
    });
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    // Close the calendar picker
    setShowInlineCalendar(false);
  };

  // Calendar helper functions
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Helper function to check task visibility status
  const getTaskVisibilityStatus = () => {
    if (!task) return { type: 'none', hasProject: false, hasReminder: false };
    
    // Use formData to show current (potentially unsaved) state
    const hasProjectAssignment = !!formData.projectId;
    const hasReminderDate = !!formData.reminderDate;
    
    if (hasProjectAssignment && hasReminderDate) return { type: 'both', hasProject: true, hasReminder: true };
    if (hasProjectAssignment) return { type: 'project', hasProject: true, hasReminder: false };
    if (hasReminderDate) return { type: 'planner', hasProject: false, hasReminder: true };
    return { type: 'inbox', hasProject: false, hasReminder: false };
  };

  const isTaskVisibleInBoth = () => {
    const status = getTaskVisibilityStatus();
    return status.type === 'both';
  };

  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    const threeYearsFromNow = addDays(today, 365 * 3); // 36 months
    return !isBefore(date, today) && !isAfter(date, threeYearsFromNow);
  };

  if (!isOpen || !task) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[99999999] modal-backdrop"
        style={{ 
          isolation: 'isolate',
          pointerEvents: 'auto',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
        onMouseDown={(e) => {
          if (suppressBackdropClickRef.current) {
            // Ignore initial click immediately after opening
            e.preventDefault();
            return;
          }
          // Register only if the press started on the backdrop itself
          if (e.target === e.currentTarget) {
            backdropMouseDownRef.current = true;
            e.preventDefault();
          } else {
            backdropMouseDownRef.current = false;
          }
        }}
        onMouseUp={() => {
          // Do not reset here; allow onClick to evaluate the flag first
        }}
        onClick={(e) => {
          if (suppressBackdropClickRef.current) {
            e.preventDefault();
            return;
          }
          // Close only if the interaction both started and ended on the backdrop
          if (e.target === e.currentTarget && backdropMouseDownRef.current) {
            e.preventDefault();
            backdropMouseDownRef.current = false;
            handleClose();
          }
          // Always reset after click evaluation
          backdropMouseDownRef.current = false;
        }}
      >
        {/* Modal Container */}
        <div 
          ref={modalRef}
          className="task-modal-root relative rounded-none sm:rounded-2xl shadow-2xl w-screen sm:w-full sm:max-w-6xl h-[100svh] sm:h-[90vh] overflow-hidden flex flex-col modal-content animate-modal-in"
          onClick={e => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          onDrag={(e) => e.preventDefault()}
          onDragEnd={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          style={{ 
            pointerEvents: 'auto',
            transform: navDirection === 'next' ? 'translateX(8px)' : navDirection === 'prev' ? 'translateX(-8px)' : 'translateX(0)',
            transition: 'transform 200ms ease',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.92) 100%)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25), inset 0 0 32px rgba(255, 255, 255, 0.3)',
          }}
        >
          <style>{`
            .dark .task-modal-root {
              background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.90) 100%) !important;
              border: 1.5px solid rgba(255, 255, 255, 0.15) !important;
              box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 0 32px rgba(255, 255, 255, 0.05) !important;
              backdrop-filter: blur(30px) !important;
              -webkit-backdrop-filter: blur(30px) !important;
            }
          `}</style>
          {/* Progress Line at Top */}
          {formData.estimatedTime > 0 && (
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-t-2xl overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(getProgressPercentage(), 100)}%`,
                  backgroundColor: (() => {
                    const isOvertime = getProgressPercentage() > 100;
                    
                    if (isOvertime) return '#ef4444'; // Red for overtime
                    return state.preferences.accentColor; // Always use accent color
                  })()
                }}
              />
            </div>
          )}

          {/* Header with editable title, date, and project */}
          <div className="relative p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title with Date and Project */}
            <div className="pr-12 flex items-center space-x-4">
              {/* Pin Dropdown vor dem Titel */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowPinDropdown(!showPinDropdown)}
                  className={`p-2 transition-all duration-200 rounded-lg ${
                    task?.pinColumnId
                      ? 'text-white shadow-sm'
                      : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={task?.pinColumnId ? getAccentColorStyles().bg : {}}
                  title={task?.pinColumnId ? `Gepinnt in ${state.pinColumns.find(col => col.id === task.pinColumnId)?.title || 'Unbekannt'}` : 'An Pins anheften'}
                >
                  <Pin className="w-6 h-6" />
                </button>

                {/* Pin Dropdown */}
                {showPinDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      {pins.selectPinColumn()}
                    </div>
                    
                    {/* Remove pin option */}
                    {task?.pinColumnId && (
                      <button
                        onClick={() => {
                          if (task) {
                            dispatch({
                              type: 'UNPIN_TASK',
                              payload: task.id
                            });
                          }
                          setShowPinDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>{pins.removePin()}</span>
                      </button>
                    )}

                    {/* Pin column options */}
                    {state.pinColumns.map((column) => (
                      <button
                        key={column.id}
                        onClick={() => {
                          if (task) {
                            dispatch({
                              type: 'ASSIGN_TASK_TO_PIN',
                              payload: { taskId: task.id, pinColumnId: column.id }
                            });
                          }
                          setShowPinDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                          task?.pinColumnId === column.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500"
                          style={{ backgroundColor: column.color || state.preferences.accentColor }}
                        />
                        <span className="text-gray-900 dark:text-white">{column.title}</span>
                        {task?.pinColumnId === column.id && (
                          <Pin className="w-3 h-3 ml-auto text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Timer Play Button - immer sichtbar */}
                <button
                  onClick={() => {
                    if (task) {
                      dispatch({
                        type: 'START_TIMER',
                        payload: {
                          taskId: task.id
                        }
                      });
                    }
                  }}
                  className={`flex-shrink-0 p-2 transition-all duration-200 rounded-lg hover:scale-105 ${
                    state.activeTimer?.taskId === task?.id && state.activeTimer?.isActive && !state.activeTimer?.isPaused
                      ? 'text-white shadow-sm'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={
                    state.activeTimer?.taskId === task?.id && state.activeTimer?.isActive && !state.activeTimer?.isPaused
                      ? getAccentColorStyles().bg
                      : { color: state.preferences.accentColor }
                  }
                  title={
                    state.activeTimer?.taskId === task?.id && state.activeTimer?.isActive && !state.activeTimer?.isPaused
                      ? 'Timer läuft'
                      : 'Timer starten'
                  }
                >
                  <Play className="w-6 h-6" />
                </button>
              

              
              <input
                ref={titleInputRef}
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="Aufgabentitel eingeben..."
                className={`text-xl sm:text-2xl font-bold bg-transparent border-none p-0 flex-1 min-w-0 focus:outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 ${
                  task?.completed
                    ? 'text-gray-400 dark:text-gray-500 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}
                autoFocus={false}
              />
              
              {/* Date & Project in Header */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                {/* Date */}
                <div className="relative dropdown-container">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowInlineCalendar(!showInlineCalendar);
                        setShowInlineProjectSelector(false);
                        setExpandedProject(null);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-700 font-medium"
                    >
                      <CalendarDays className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {formData.reminderDate 
                          ? format(new Date(formData.reminderDate), 'dd.MM.yyyy', { locale: de })
                          : taskModal.dateSelect()
                        }
                      </span>
                    </button>
                    
                    {/* Remove Date Button */}
                    {formData.reminderDate && (
                      <button
                        onClick={handleRemoveDate}
                        className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-colors flex items-center justify-center"
                        title="Datumszuordnung entfernen"
                      >
                        <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Kalender Pseudo-Overlay */}
                  {showInlineCalendar && (
                    <div className="absolute -left-32 top-full mt-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80">
                        {/* Header */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={previousMonth}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {format(currentMonth, 'MMMM yyyy', { locale: de })}
                            </h3>
                            
                            <button
                              onClick={nextMonth}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>

                        {/* Calendar body */}
                        <div className="p-3">
                          {/* Weekday Headers */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {[
                              t('planner.weekdays.mo'),
                              t('planner.weekdays.tu'), 
                              t('planner.weekdays.we'),
                              t('planner.weekdays.th'),
                              t('planner.weekdays.fr'),
                              t('planner.weekdays.sa'),
                              t('planner.weekdays.su')
                            ].map(day => (
                              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-300 py-1">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {(() => {
                              const monthStart = startOfMonth(currentMonth);
                              const monthEnd = endOfMonth(currentMonth);
                              const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                              const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                              const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                              const today = startOfDay(new Date());

                              return calendarDays.map((date, index) => {
                                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                                const isToday = isSameDay(date, today);
                                const isAvailable = isDateAvailable(date);
                                const isTaskDate = task?.columnId === `date-${format(date, 'yyyy-MM-dd')}`;

                                return (
                                  <button
                                    key={index}
                                    onClick={() => isAvailable ? handleDateSelect(date) : undefined}
                                    disabled={!isAvailable}
                                    className={`
                                      relative h-8 w-8 rounded-md text-xs font-medium transition-all duration-150 flex items-center justify-center
                                      ${!isCurrentMonth 
                                        ? 'text-gray-300 dark:text-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-700/50' 
                                        : isAvailable
                                          ? isToday
                                            ? 'text-white font-bold shadow-sm'
                                            : isTaskDate
                                              ? 'text-white font-bold shadow-sm ring-1 ring-white/50 dark:ring-gray-800/50'
                                              : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
                                      }
                                    `}
                                    style={
                                      isToday && isCurrentMonth 
                                        ? getAccentColorStyles().bg
                                        : isTaskDate && isCurrentMonth
                                          ? { backgroundColor: state.preferences.accentColor + 'aa' }
                                          : {}
                                    }
                                  >
                                    {date.getDate()}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Footer with quick actions */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleDateSelect(new Date())}
                                className="font-medium hover:opacity-80 transition-colors"
                                style={getAccentColorStyles().text}
                              >
                                Heute
                              </button>
                              <button
                                onClick={() => handleDateSelect(addDays(new Date(), 1))}
                                className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              >
                                Morgen
                              </button>
                              <button
                                onClick={() => handleDateSelect(addDays(new Date(), 7))}
                                className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              >
                                Nächste Woche
                              </button>
                            </div>
                            
                            <button
                              onClick={() => setShowInlineCalendar(false)}
                              className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              {actions.close()}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project */}
                <div className="relative dropdown-container">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowInlineProjectSelector(!showInlineProjectSelector);
                        setShowInlineCalendar(false);
                        if (!showInlineProjectSelector) {
                          setExpandedProject(null);
                          setShowProjectColumns(false);
                          setSelectedProjectForColumns(null);
                          setProjectSearchQuery('');
                          setIsCreatingColumn(false);
                          setNewColumnTitle('');
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-700 font-medium"
                    >
                      <FolderOpen className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {(() => {
                          if (formData.projectId) {
                            const project = state.columns.find(col => col.id === formData.projectId && col.type === 'project');
                            const projectTitle = project?.title || taskModal.projectUnknown();
                            
                            // Also show column if selected
                            if (formData.kanbanColumnId) {
                              const kanbanColumn = state.viewState.projectKanban.columns.find(col => col.id === formData.kanbanColumnId);
                              if (kanbanColumn) {
                                return `${projectTitle} → ${kanbanColumn.title}`;
                              }
                            }
                            
                            return projectTitle;
                          }
                          return taskModal.projectSelect();
                        })()}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                        showInlineProjectSelector ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Remove Project Button */}
                    {formData.projectId && (
                      <button
                        onClick={handleRemoveProject}
                        className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-colors flex items-center justify-center"
                        title="Projektzuordnung entfernen"
                      >
                        <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Projekt Pseudo-Overlay - Größer und nach links verschoben */}
                  {showInlineProjectSelector && (
                    <div className="absolute right-0 top-full mt-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[480px] h-[600px]">
                        {/* Header */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {showProjectColumns ? taskModal.columnSelect() : taskModal.projectSelect()}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {showProjectColumns && (
                                <button
                                  onClick={handleBackToProjects}
                                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center space-x-1"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                  <span>Zurück</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowInlineProjectSelector(false);
                                  setExpandedProject(null);
                                  setShowProjectColumns(false);
                                  setSelectedProjectForColumns(null);
                                  setProjectSearchQuery('');
                                  setIsCreatingColumn(false);
                                  setNewColumnTitle('');
                                }}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              >
                                {actions.close()}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Content Container with horizontal sliding */}
                        <div className="relative overflow-hidden">
                          {/* Project List */}
                          <div className={`transition-transform duration-300 ${
                            showProjectColumns ? '-translate-x-full' : 'translate-x-0'
                          }`}>
                            {/* Search Box */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Projekte suchen..."
                                  value={projectSearchQuery}
                                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-opacity-20 focus:border-transparent"
                                  style={{ 
                                    '--tw-ring-color': state.preferences.accentColor + '20'
                                  } as React.CSSProperties}
                                />
                              </div>
                            </div>

                            {/* Projects List */}
                            <div className="h-[500px] overflow-y-auto">
                              {/* No Project Option */}
                              <div 
                                onClick={() => handleQuickProjectAssign('')}
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {taskModal.projectNone()}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!formData.projectId && (
                                    <CheckSquare className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                              </div>
                              
                              {getFilteredProjects().map(project => (
                                <div key={project.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                  <div 
                                    onClick={() => handleProjectClick(project.id)}
                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: state.preferences.accentColor }}
                                      />
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {project.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {formData.projectId === project.id && (
                                        <CheckSquare className="w-4 h-4 text-green-500" />
                                      )}
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {getFilteredProjects().length === 0 && (
                                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                  {projectSearchQuery ? 'Keine Projekte gefunden' : 'Keine Projekte vorhanden'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Project Columns - Slides in from right */}
                          {showProjectColumns && selectedProjectForColumns && (
                            <div className={`absolute inset-0 bg-white dark:bg-gray-900 transition-transform duration-300 ease-in-out ${
                              showProjectColumns ? 'transform translate-x-0' : 'transform translate-x-full'
                            }`}>
                              {(() => {
                                const selectedProject = state.columns.find(col => col.id === selectedProjectForColumns);
                                const projectColumns = state.viewState.projectKanban.columns.filter(col => 
                                  col.projectId === selectedProjectForColumns
                                );

                                return (
                                  <div className="h-full flex flex-col">
                                    {/* Back Button */}
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                      <button
                                        onClick={handleBackToProjects}
                                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                      >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="text-sm">Zurück zu Projekten</span>
                                      </button>
                                    </div>

                                    {/* Project Header */}
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center space-x-3">
                                        <div 
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: state.preferences.accentColor }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {selectedProject?.title}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Project Columns */}
                                    <div className="flex-1 overflow-y-auto h-[500px]">
                                      {projectColumns.map(column => (
                                        <div
                                          key={column.id}
                                          onClick={() => {
                                            handleColumnSelect(column.id);
                                            setProjectSearchQuery('');
                                            setIsCreatingColumn(false);
                                            setNewColumnTitle('');
                                          }}
                                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                            formData.kanbanColumnId === column.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                              {column.color && (
                                                <div 
                                                  className="w-2 h-2 rounded-full"
                                                  style={{ backgroundColor: column.color }}
                                                />
                                              )}
                                              <span className="text-gray-900 dark:text-white">
                                                {column.title}
                                              </span>
                                            </div>
                                            {formData.kanbanColumnId === column.id && (
                                              <CheckSquare className="w-4 h-4 text-green-500" />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {/* Add new column option */}
                                      {!isCreatingColumn && (
                                        <button
                                          onClick={() => setIsCreatingColumn(true)}
                                          className="w-full px-4 py-3 text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                        >
                                          <div className="flex items-center space-x-2">
                                            <Plus className="w-4 h-4" />
                                            <span>{taskModal.new_column()}</span>
                                          </div>
                                        </button>
                                      )}

                                      {/* Create new column input */}
                                      {isCreatingColumn && (
                                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="text"
                                              value={newColumnTitle}
                                              onChange={(e) => setNewColumnTitle(e.target.value)}
                                              placeholder={taskModal.column_name_placeholder()}
                                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              autoFocus
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                  handleCreateColumn();
                                                } else if (e.key === 'Escape') {
                                                  setIsCreatingColumn(false);
                                                  setNewColumnTitle('');
                                                }
                                              }}
                                            />
                                            <button
                                              onClick={handleCreateColumn}
                                              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                                            >
                                              {taskModal.create()}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setIsCreatingColumn(false);
                                                setNewColumnTitle('');
                                              }}
                                              className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        {!showProjectColumns && (
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 dark:text-gray-400">
                                {getFilteredProjects().length} Projekte
                              </span>
                              <button
                                onClick={() => {
                                  // Move to main tasks (remove from project)
                                  if (task) {
                                    dispatch({
                                      type: 'UPDATE_TASK',
                                      payload: {
                                        ...task,
                                        columnId: 'inbox',
                                        kanbanColumnId: undefined,
                                        updatedAt: new Date().toISOString()
                                      }
                                    });
                                  }
                                  setShowInlineProjectSelector(false);
                                  setExpandedProject(null);
                                  setShowProjectColumns(false);
                                  setSelectedProjectForColumns(null);
                                  setProjectSearchQuery('');
                                  setIsCreatingColumn(false);
                                  setNewColumnTitle('');
                                }}
                                className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              >
                                {taskModal.move_to_inbox()}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Smart Parsing Preview - Elegant Overlay */}
            {parseResult && parseResult.success && parseResult.task && (
              <div className="absolute left-6 right-6 top-32 z-20 animate-in slide-in-from-top-2 duration-300">
                <div 
                  className="p-5 rounded-xl shadow-lg backdrop-blur-md border bg-white/95 dark:bg-gray-800/95"
                  style={{
                    borderColor: state.preferences.accentColor + '60',
                    boxShadow: `0 8px 32px 0 ${state.preferences.accentColor}40`,
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                      style={{
                        backgroundColor: state.preferences.accentColor + '20',
                      }}
                    >
                      <Zap 
                        className="w-4 h-4" 
                        style={{ color: state.preferences.accentColor }}
                      />
                    </div>
                    <div className="flex-1">
                      <div 
                        className="text-sm font-semibold mb-1"
                        style={{ color: state.preferences.accentColor }}
                      >
                        Smart-Parsing erkannt
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Drücken Sie Enter um die Änderungen zu übernehmen
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {parseResult.task.title && parseResult.task.title !== formData.title && (
                      <div 
                        className="px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: state.preferences.accentColor + '10',
                          color: state.preferences.accentColor,
                          border: `1px solid ${state.preferences.accentColor}30`,
                        }}
                      >
                        <strong>Titel:</strong> {parseResult.task.title}
                      </div>
                    )}
                    
                    {parseResult.task.estimatedTime && parseResult.task.estimatedTime > 0 && (
                      <div 
                        className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center"
                        style={{
                          backgroundColor: '#8b5cf6' + '15',
                          color: '#8b5cf6',
                          border: '1px solid #8b5cf630',
                        }}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {parseResult.task.estimatedTime}min
                      </div>
                    )}
                    
                    {parseResult.task.priority && (
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center ${
                        parseResult.task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                        parseResult.task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      }`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {parseResult.task.priority === 'high' ? 'Hoch' : 
                         parseResult.task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                      </div>
                    )}
                    
                    {parseResult.task.tags.map(tag => (
                      <div 
                        key={tag} 
                        className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center"
                        style={{
                          backgroundColor: '#6366f1' + '15',
                          color: '#6366f1',
                          border: '1px solid #6366f130',
                        }}
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </div>
                    ))}
                    
                    {parseResult.task.description && (
                      <div 
                        className="px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: '#6b7280' + '15',
                          color: '#6b7280',
                          border: '1px solid #6b728030',
                        }}
                      >
                        <strong>Beschreibung:</strong> {parseResult.task.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            





          </div>

          {/* Main Content */}
          <div className="flex flex-1 min-h-0">
            {/* Left Content Area */}
                          <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                {/* Priority Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {taskModal.descriptionTitle?.() || 'Priority'}
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { value: 'none', label: taskModal.priorityNone?.() || 'None', colorBg: 'rgba(107, 114, 128, 0.1)', colorBorder: 'rgb(107, 114, 128)', icon: '-' },
                      { value: 'low', label: taskModal.priorityLow?.() || 'Low', colorBg: 'rgba(34, 197, 94, 0.1)', colorBorder: 'rgb(34, 197, 94)', icon: '!' },
                      { value: 'medium', label: taskModal.priorityMedium?.() || 'Medium', colorBg: 'rgba(234, 179, 8, 0.1)', colorBorder: 'rgb(234, 179, 8)', icon: '!!' },
                      { value: 'high', label: taskModal.priorityHigh?.() || 'High', colorBg: 'rgba(239, 68, 68, 0.1)', colorBorder: 'rgb(239, 68, 68)', icon: '!!!' }
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                        className="relative group px-2.5 py-1.5 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-110"
                        style={{
                          backgroundColor: formData.priority === priority.value ? priority.colorBg : 'transparent',
                          borderLeft: `2px solid ${formData.priority === priority.value ? priority.colorBorder : 'transparent'}`,
                          opacity: formData.priority === priority.value ? '1' : '0.4',
                          paddingLeft: formData.priority === priority.value ? '10px' : '12px',
                          fontFamily: 'monospace',
                          letterSpacing: '-1px'
                        }}
                        title={priority.label}
                      >
                        {priority.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="relative">
                  {/* Header with close button */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {taskModal.description()}
                    </label>
                    {!isDescriptionPreviewMode && (
                      <button
                        onClick={() => {
                          setIsDescriptionPreviewMode(true);
                          setIsDescriptionExpanded(false);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title={taskModal.closeDescription()}
                      >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Single unified editor/preview frame */}
                  <div 
                    className={`relative w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 focus-within:border-accent ${
                      isDescriptionPreviewMode ? 'bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg' : 'bg-white dark:bg-gray-800'
                    } transition-colors duration-200 overflow-hidden group resize-y ${
                      isDescriptionExpanded ? 'h-[calc(100vh-300px)]' : 'h-auto min-h-24 max-h-96'
                    }`}
                    style={{
                      animation: !isDescriptionPreviewMode ? 'fadeInEditMode 0.3s ease-out' : 'none'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !isDescriptionPreviewMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDescriptionPreviewMode(true);
                        setIsDescriptionExpanded(false);
                      }
                    }}
                  >
                    {/* Resize handle - bottom right corner */}
                    {isDescriptionPreviewMode && formData.description?.trim() && (
                      <div className="absolute bottom-0 right-0 text-gray-300 dark:text-gray-600 cursor-se-resize p-2 opacity-50 hover:opacity-100 transition-opacity" title={taskModal.resize_tooltip?.() || 'Resize'}>
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    {/* Content area - no nested scrolling */}
                    {isDescriptionPreviewMode ? (
                      <div 
                        className={`text-gray-900 dark:text-white text-sm leading-relaxed p-4 wysiwyg-content cursor-text overflow-y-auto max-h-96 ${
                          !formData.description?.trim() ? 'flex items-center justify-center' : ''
                        }`}
                        onClick={() => {
                          setIsDescriptionPreviewMode(false);
                        }}
                        title={taskModal.click_to_edit_tooltip?.() || 'Click to edit'}
                      >
                        {!formData.description?.trim() && (
                          <span className="text-gray-400 dark:text-gray-500 text-sm italic opacity-60">
                            {taskModal.descriptionPlaceholder() || 'Click to edit...'}
                          </span>
                        )}
                        {formData.description?.trim() && (
                          <MarkdownRenderer 
                            content={formData.description}
                            onCheckboxChange={(newDescription) => {
                              setFormData(prev => ({ ...prev, description: newDescription }));
                              setHasUnsavedChanges(true);
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <WysiwygEditor
                        value={formData.description}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, description: value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder={taskModal.descriptionPlaceholder()}
                        className="h-full w-full p-4"
                        useFullHeight={true}
                        showToolbar={true}
                        onClickOutside={() => {
                          setIsDescriptionPreviewMode(true);
                          setIsDescriptionExpanded(false);
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Subtasks - Collapsible */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {taskModal.subtasks()} ({formData.subtasks.length})
                      </label>
                      {formData.subtasks.length > 0 && (
                        <button
                          onClick={() => setIsSubtasksExpanded(!isSubtasksExpanded)}
                          className="p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                              isSubtasksExpanded ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        addSubtask();
                        setIsSubtasksExpanded(true);
                      }}
                      className="flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      style={getAccentColorStyles().text}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{actions.add()}</span>
                    </button>
                  </div>

                  {isSubtasksExpanded && formData.subtasks.length > 0 && (
                    <div className="space-y-0 ml-6">
                      {formData.subtasks.map((subtask, index) => (
                        <div key={subtask.id} className="flex items-center space-x-3 py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={(e) => updateSubtask(subtask.id, { completed: e.target.checked })}
                            className="w-4 h-4 border-gray-300 rounded"
                            style={{ 
                              accentColor: state.preferences.accentColor,
                              ...getAccentColorStyles().text 
                            }}
                          />
                          <input
                            type="text"
                            value={subtask.title}
                            onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
                            onKeyPress={(e) => handleSubtaskKeyPress(e, subtask.id)}
                            onPaste={(e) => handleSubtaskPaste(e, subtask.id)}
                            placeholder={`${taskModal.subtasks()} ${index + 1}`}
                            className="flex-1 px-2 py-1 text-sm border border-transparent focus:border-gray-300 dark:focus:border-gray-600 rounded focus:outline-none bg-transparent text-gray-900 dark:text-white"
                            data-subtask-input
                          />
                          <button
                            onClick={() => deleteSubtask(subtask.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Meta Information */}
            <div className="w-72 bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto flex flex-col">
                              <div className="space-y-4">
                {/* Task Visibility Status Indicator */}
                {(() => {
                  const status = getTaskVisibilityStatus();
                  const accentColor = state.preferences.accentColor;
                  
                  const getStatusConfig = () => {
                    switch (status.type) {
                      case 'both':
                        return {
                          text: taskModal.visibility.projectAndPlanner(),
                          icon: 'ArrowLeftRight',
                          description: taskModal.visibility.projectAndPlannerDesc(),
                          color: accentColor
                        };
                      case 'project':
                        return {
                          text: taskModal.visibility.projectOnly(),
                          icon: 'FolderOpen',
                          description: taskModal.visibility.projectOnlyDesc(),
                          color: accentColor
                        };
                      case 'planner':
                        return {
                          text: taskModal.placeholder_only_im_planer?.() || 'Planner only',
                          icon: 'Calendar',
                          description: taskModal.placeholder_only_im_planer?.() || 'This task is visible in planner only',
                          color: accentColor
                        };
                      case 'inbox':
                        return {
                          text: taskModal.placeholder_im_eingang?.() || 'In Inbox',
                          icon: 'Inbox',
                          description: taskModal.placeholder_im_eingang?.() || 'This task is in inbox (no project or date assigned)',
                          color: accentColor
                        };
                      default:
                        return null;
                    }
                  };
                  
                  const config = getStatusConfig();
                  if (!config) return null;
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {taskModal.status()}
                      </label>
                      <div 
                        className="flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200"
                        style={{
                          backgroundColor: `${config.color}15`,
                          borderColor: `${config.color}30`,
                          color: config.color
                        }}
                        title={config.description}
                      >
                        <div className="flex-shrink-0" style={{ color: config.color }}>
                          {(() => {
                            switch (config.icon) {
                              case 'ArrowLeftRight':
                                return <ArrowLeftRight className="w-5 h-5" />;
                              case 'FolderOpen':
                                return <FolderOpen className="w-5 h-5" />;
                              case 'Calendar':
                                return <Calendar className="w-5 h-5" />;
                              case 'Inbox':
                                return <Inbox className="w-5 h-5" />;
                              default:
                                return null;
                            }
                          })()}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{config.text}</span>
                          {status.type === 'both' && (
                            <div className="flex items-center space-x-1 mt-1">
                              <div 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: config.color }}
                              />
                              <div 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: config.color }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Review Status */}
                {(() => {
                  const isTaskInReview = task?.reminderDate && new Date(task.reminderDate) > new Date();
                  if (!isTaskInReview) return null;
                  
                  const reviewDate = new Date(task.reminderDate);
                  const accentColor = state.preferences.accentColor;
                  
                  const removeReviewStatus = () => {
                    if (!task) return;
                    dispatch({
                      type: 'UPDATE_TASK',
                      payload: {
                        ...task,
                        reminderDate: undefined,
                        updatedAt: new Date().toISOString()
                      }
                    });
                    setHasUnsavedChanges(true);
                  };
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {taskModal.reviewStatus()}
                      </label>
                      <div 
                        className="p-3 rounded-lg border transition-all duration-200"
                        style={{
                          backgroundColor: `${accentColor}0D`,
                          borderColor: `${accentColor}25`,
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Clock 
                              className="w-4 h-4" 
                              style={{ color: accentColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {taskModal.postponed()}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                  {taskModal.review_am?.() || 'Review on'} {format(reviewDate, 'dd.MM.yyyy', { locale: de })}
                                </p>
                              </div>
                              <button
                                onClick={removeReviewStatus}
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                                title={taskModal.removeReviewStatus?.() || 'Remove review status'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Zeitmanagement */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {taskModal.timeManagement()}
                    </label>
                    {!showTimeManagement && (
                      <button
                        onClick={() => {
                          setShowTimeManagement(true);
                          setIsEditingEstimatedTime(true);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
                        style={getAccentColorStyles().text}
                        title="Zeitmanagement hinzufügen"
                      >
                        +
                      </button>
                    )}
                  </div>
                  
                  {showTimeManagement && (
                    <div className="space-y-3">
                    {/* Time Display Row */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-6">
                        {/* Tracked Time */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aufgezeichnet</div>
                          <button
                            onClick={startTimeEditing}
                            className="font-mono text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Klicken zum Bearbeiten"
                          >
                            {formatTime(getCurrentTrackedTime())}
                          </button>
                        </div>
                        
                        {/* Divider */}
                        <div className="text-gray-300 dark:text-gray-600">/</div>
                        
                        {/* Estimated Time */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Geschätzt</div>
                          <button
                            onClick={() => setIsEditingEstimatedTime(!isEditingEstimatedTime)}
                            className="font-mono text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Klicken zum Bearbeiten"
                          >
                            {formatTime(formData.estimatedTime)}
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress and Actions */}
                      <div className="flex items-center space-x-3">
                        {formData.estimatedTime > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {Math.round(getProgressPercentage())}%
                          </span>
                        )}
                        
                        {getCurrentTrackedTime() > 0 && (
                          <button
                            onClick={resetTrackedTime}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Aufgezeichnete Zeit zurücksetzen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Edit Tracked Time */}
                    {isEditingTime && (
                      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aufgezeichnete Zeit bearbeiten</div>
                        <div className="flex items-center space-x-2 mb-3">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={editTimeHours || ''}
                            onChange={(e) => setEditTimeHours(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                            style={{ 
                              '--tw-ring-color': state.preferences.accentColor + '50'
                            } as React.CSSProperties}
                            placeholder="0"
                            autoFocus
                          />
                          <span className="text-sm text-gray-500">h</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={editTimeMinutes || ''}
                            onChange={(e) => setEditTimeMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                            className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                            style={{ 
                              '--tw-ring-color': state.preferences.accentColor + '50'
                            } as React.CSSProperties}
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEditedTime}
                            className="flex-1 px-3 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: state.preferences.accentColor }}
                          >
                            Speichern
                          </button>
                          <button
                            onClick={cancelTimeEditing}
                            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Edit Estimated Time */}
                    {isEditingEstimatedTime && (
                      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Geschätzte Zeit bearbeiten</div>
                        <div className="flex items-center space-x-2 mb-3">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={formData.estimatedTime ? Math.floor(formData.estimatedTime / 60) : ''}
                            onChange={(e) => {
                              const hours = parseInt(e.target.value) || 0;
                              const minutes = formData.estimatedTime ? (formData.estimatedTime % 60) : 0;
                              const totalMinutes = hours * 60 + minutes;
                              setFormData(prev => ({ 
                                ...prev, 
                                estimatedTime: totalMinutes > 0 ? totalMinutes : undefined
                              }));
                            }}
                            className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                            style={{ 
                              '--tw-ring-color': state.preferences.accentColor + '50'
                            } as React.CSSProperties}
                            placeholder="0"
                            autoFocus
                          />
                          <span className="text-sm text-gray-500">h</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={formData.estimatedTime ? (formData.estimatedTime % 60) : ''}
                            onChange={(e) => {
                              const hours = formData.estimatedTime ? Math.floor(formData.estimatedTime / 60) : 0;
                              const minutes = parseInt(e.target.value) || 0;
                              const totalMinutes = hours * 60 + minutes;
                              setFormData(prev => ({ 
                                ...prev, 
                                estimatedTime: totalMinutes > 0 ? totalMinutes : undefined
                              }));
                            }}
                            className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                            style={{ 
                              '--tw-ring-color': state.preferences.accentColor + '50'
                            } as React.CSSProperties}
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setIsEditingEstimatedTime(false)}
                            className="flex-1 px-3 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: state.preferences.accentColor }}
                          >
                            Fertig
                          </button>
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, estimatedTime: undefined }));
                              setIsEditingEstimatedTime(false);
                            }}
                            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Zurücksetzen
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tags
                    </label>
                    <button
                      onClick={() => setShowTagSelector(!showTagSelector)}
                      className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
                      style={getAccentColorStyles().text}
                      title={showTagSelector ? 'Schließen' : 'Tag hinzufügen'}
                    >
                      {showTagSelector ? '×' : '+'}
                    </button>
                  </div>
                  
                  {/* Current Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="group inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: state.preferences.accentColor + '20',
                            color: state.preferences.accentColor
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:opacity-80 transition-all opacity-0 group-hover:opacity-100"
                            style={getAccentColorStyles().text}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag Selector */}
                  {showTagSelector && (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={tagSearchTerm}
                          onChange={(e) => setTagSearchTerm(e.target.value)}
                          onKeyPress={handleTagInputKeyPress}
                          placeholder="Tag suchen oder erstellen..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-800 text-sm"
                          style={{ 
                            '--tw-ring-color': state.preferences.accentColor 
                          } as React.CSSProperties}
                          autoFocus
                        />
                      </div>
                      
                      <div className="max-h-32 overflow-y-auto">
                        {getFilteredTags().map((tag) => (
                          <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            disabled={formData.tags.includes(tag)}
                            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                              formData.tags.includes(tag) 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                        
                        {tagSearchTerm && !getFilteredTags().includes(tagSearchTerm) && (
                          <button
                            onClick={() => addTag(tagSearchTerm)}
                            className="w-full text-left px-2 py-1 text-sm rounded font-medium hover:opacity-80 transition-colors"
                            style={{
                              backgroundColor: state.preferences.accentColor + '10',
                              color: state.preferences.accentColor
                            }}
                          >
                            + "{tagSearchTerm}" erstellen
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>



                {/* Linked Notes - Collapsible */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Verknüpfte Notizen
                      </label>
                      {formData.linkedNotes.length > 0 && (
                        <button
                          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                          className="text-left transition-colors hover:opacity-80"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                              isNotesExpanded ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowNotesOverlay(true);
                        setIsNotesExpanded(true);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
                      style={getAccentColorStyles().text}
                      title="Notiz verknüpfen"
                    >
                      +
                    </button>
                  </div>
                  
                  {isNotesExpanded && formData.linkedNotes.length > 0 && (
                    <div>
                      {formData.linkedNotes.length > 0 ? (
                        <div className="space-y-2">
                          {formData.linkedNotes.map((noteId) => {
                            const note = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).find(n => n.id === noteId);
                            return (
                              <div
                                key={noteId}
                                className="group flex items-center justify-between p-2 rounded-lg"
                                style={{
                                  backgroundColor: getAccentColorStyles().bg.backgroundColor + '15',
                                }}
                              >
                                <button
                                  onClick={() => handleNavigateToNote(noteId)}
                                  className="flex items-center space-x-2 flex-1 min-w-0 text-left rounded transition-colors p-1"
                                  title={`Zur Notiz: ${note?.title || 'Unbekannte Notiz'}`}
                                  style={{
                                    color: getAccentColorStyles().text.color,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor + '25';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <FileText 
                                    className="w-4 h-4 flex-shrink-0" 
                                    style={getAccentColorStyles().text}
                                  />
                                  <span className="text-sm truncate" style={getAccentColorStyles().text}>
                                    {note?.title || 'Unbekannte Notiz'}
                                  </span>
                                  <Link 
                                    className="w-3 h-3" 
                                    style={getAccentColorStyles().text}
                                  />
                                </button>
                                <button
                                  onClick={() => unlinkNote(noteId)}
                                  className="text-red-500 hover:text-red-700 transition-all duration-200 ml-2 opacity-0 group-hover:opacity-100"
                                  title="Verknüpfung entfernen"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
                          Keine Notizen verknüpft
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Simplified Reminder Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Erinnerung
                  </label>
                  
                  {/* Reminder Display/Edit */}
                  {task?.reminderDate && task?.reminderTime && !isEditingReminder ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 group">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(task.reminderDate), 'dd.MM.yyyy', { locale: de })}
                        </span>
                        <Clock className="w-4 h-4 text-gray-500 ml-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.reminderTime}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setIsEditingReminder(true)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Erinnerung bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const updatedTask = {
                              ...task!,
                              reminderDate: undefined,
                              reminderTime: undefined,
                              updatedAt: new Date().toISOString()
                            };
                            dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                            setHasUnsavedChanges(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Erinnerung entfernen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* When not editing and no reminder exists, show only a + button */}
                      {!isEditingReminder && !(task?.reminderDate && task?.reminderTime) && (
                        <button
                          onClick={() => {
                            setIsEditingReminder(true);
                            setReminderTimeInput(formData.reminderTime || '');
                          }}
                          className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
                          style={getAccentColorStyles().text}
                          title="Erinnerung hinzufügen"
                        >
                          +
                        </button>
                      )}
                      {isEditingReminder && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={task?.reminderDate || ''}
                            onChange={(e) => {
                              const updatedTask = {
                                ...task!,
                                reminderDate: e.target.value || undefined,
                                updatedAt: new Date().toISOString()
                              };
                              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                              setHasUnsavedChanges(true);
                            }}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-800/80"
                            placeholder="Datum auswählen"
                          />
                          <input
                            type="time"
                            value={task?.reminderTime || ''}
                            onChange={(e) => {
                              const updatedTask = {
                                ...task!,
                                reminderTime: e.target.value || undefined,
                                updatedAt: new Date().toISOString()
                              };
                              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                              setHasUnsavedChanges(true);
                            }}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-800/80"
                            placeholder="Zeit auswählen"
                          />
                          <div className="col-span-2 flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setIsEditingReminder(false)}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                              Fertig
                            </button>
                            {(task?.reminderDate || task?.reminderTime) && (
                              <button
                                onClick={() => {
                                  const updatedTask = {
                                    ...task!,
                                    reminderDate: undefined,
                                    reminderTime: undefined,
                                    updatedAt: new Date().toISOString()
                                  };
                                  dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
                                  setHasUnsavedChanges(true);
                                  setIsEditingReminder(false);
                                }}
                                className="flex items-center space-x-1 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                              >
                                <X className="w-3 h-3" />
                                <span>Entfernen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Deadline Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deadline
                  </label>
                    {!showDeadlineFields && (
                      <button
                        onClick={() => {
                          setShowDeadlineFields(true);
                          // Auto-set date if task has a date assignment but no deadline yet
                          if (!formData.deadline && task) {
                            // Check if task has a date from column assignment
                            if (task.columnId?.startsWith('date-')) {
                              const dateStr = task.columnId.replace('date-', '');
                              setFormData(prev => ({ ...prev, deadline: dateStr }));
                              setHasUnsavedChanges(true);
                            }
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
                        style={getAccentColorStyles().text}
                        title="Deadline hinzufügen"
                      >
                        +
                      </button>
                    )}
                  </div>
                  
                  {showDeadlineFields && (
                    <div className="space-y-3">
                      {/* Deadline Display or Input */}
                      <div>
                        {formData.deadline && !deadlineInputValue ? (
                          /* Display mode - same format as reminder */
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" style={getAccentColorStyles().reminderText} />
                              <button
                                onClick={() => {
                                  // Load current date into input field for editing
                                  const currentDate = new Date(formData.deadline);
                                  const formatted = format(currentDate, 'ddMMyy', { locale: de });
                                  setDeadlineInputValue(formatted);
                                }}
                                className="text-sm font-medium hover:opacity-80 transition-colors underline decoration-dotted"
                                style={getAccentColorStyles().reminderText}
                                title="Datum bearbeiten"
                              >
                            {format(new Date(formData.deadline), 'dd.MM.yyyy', { locale: de })}
                              </button>
                        </div>
                        <button
                          onClick={() => {
                                // Komplett löschen
                            setFormData(prev => ({ ...prev, deadline: undefined }));
                            setHasUnsavedChanges(true);
                                setDeadlineInputValue('');
                                setShowDeadlineFields(false);
                          }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Deadline löschen"
                        >
                              <X className="w-3 h-3" />
                        </button>
                    </div>
                  ) : (
                          /* Edit mode - input field */
                        <div className="flex-1 relative">
                          <input
                            type="text"
                              value={deadlineInputValue || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                                // Only allow digits - Remove any non-digit characters
                              const numericValue = value.replace(/\D/g, '');
                              
                                // Limit to 6 digits for ttmmjj format
                                if (numericValue.length <= 6) {
                                  setDeadlineInputValue(numericValue);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value;
                                const processedDate = processDeadlineInput(value);
                                
                                if (processedDate) {
                                  setFormData(prev => ({ ...prev, deadline: processedDate }));
                                  setHasUnsavedChanges(true);
                                  setDeadlineInputValue('');
                                } else {
                                  // Invalid input - clear field
                                  setDeadlineInputValue('');
                                  e.currentTarget.value = '';
                                }
                              } else if (e.key === 'Escape') {
                                // Reset input
                                setDeadlineInputValue('');
                                e.currentTarget.value = '';
                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={(e) => {
                              // Optional: Process on blur too, but only if user pressed Enter before
                              const value = e.target.value.trim();
                              if (!value) {
                                setDeadlineInputValue('');
                                return;
                              }
                            }}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 font-mono text-sm"
                            style={{ 
                              '--tw-ring-color': state.preferences.accentColor,
                              '--tw-ring-opacity': '0.5'
                            } as React.CSSProperties}
                              placeholder="ttmmjj"
                            autoComplete="off"
                              maxLength={6}
                              autoFocus
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            ⏎
                          </div>
                        </div>
                        )}
                        





                              </div>
                    </div>
                  )}
                </div>

              {/* Recurring Task Section */}
              <RecurringTaskSection
                task={task}
                onRecurrenceChange={setRecurrenceRule}
                className="mt-4"
              />

              </div>

              {/* Creation & Update Info - at bottom */}
              <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex-1">
                    <span className="font-medium">{taskModal.created()}:</span><br />
                    {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                  <div className="flex-1 text-right">
                    <span className="font-medium">{taskModal.lastModified()}:</span><br />
                    {format(new Date(task.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky bottom-0">
            {/* Action Buttons */}
            <div className="flex items-center justify-between p-3 sm:p-6">
              {/* Delete Button - Left Side */}
              <button
                onClick={() => {
                  if (!task) return;
                  
                  // Check if this is a recurring task
                  if (isRecurringTask()) {
                    setPendingDeleteTask(task);
                    setShowSeriesDeleteModal(true);
                  } else {
                    // Normal confirmation for non-recurring tasks
                    if (window.confirm(taskModal.deleteConfirm().replace('{title}', task.title))) {
                      dispatch({ type: 'DELETE_TASK', payload: task.id });
                      onClose();
                    }
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Löschen</span>
              </button>

              {/* Completion Button - Center */}
              <button
                onClick={task?.completed ? handleToggleComplete : handleCompleteAndClose}
                className="flex items-center space-x-2 px-5 py-3 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:opacity-90"
                style={{ backgroundColor: state.preferences.accentColor }}
                title={task?.completed ? 'Als nicht erledigt markieren' : 'Aufgabe abhaken und schließen'}
              >
                <CheckSquare className="w-5 h-5 text-white" />
                <span>
                  {task?.completed ? 'Aufgabe unerledigt' : 'Aufgabe erledigt'}
                </span>
              </button>

              {/* Save/Cancel - Right Side */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center space-x-2 px-5 py-2 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed hover:opacity-90"
                  style={hasUnsavedChanges ? getAccentColorStyles().bg : {}}
                >
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Elegant side navigation fixed next to modal edges */}
        {navPos && onNavigatePrev && (
          <button
            onClick={onNavigatePrev}
            className="fixed hidden sm:flex items-center justify-center w-10 h-10 rounded-full shadow-xl transition-transform hover:scale-110"
            style={{
              left: `${navPos.leftX}px`,
              top: `${navPos.top}px`,
              transform: 'translate(-70%, -50%)',
              backgroundColor: state.preferences.accentColor,
              boxShadow: `0 6px 20px rgba(0,0,0,0.25), 0 0 0 3px ${state.preferences.accentColor}33`,
              zIndex: 100000001,
            }}
            title={"Vorherige Aufgabe"}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {navPos && onNavigateNext && (
          <button
            onClick={onNavigateNext}
            className="fixed hidden sm:flex items-center justify-center w-10 h-10 rounded-full shadow-xl transition-transform hover:scale-110"
            style={{
              left: `${navPos.rightX}px`,
              top: `${navPos.top}px`,
              transform: 'translate(-30%, -50%)',
              backgroundColor: state.preferences.accentColor,
              boxShadow: `0 6px 20px rgba(0,0,0,0.25), 0 0 0 3px ${state.preferences.accentColor}33`,
              zIndex: 100000001,
            }}
            title={"Nächste Aufgabe"}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
                    <div 
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999999999]"
                      style={{ pointerEvents: 'auto' }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.preventDefault()}
                      onDrag={(e) => e.preventDefault()}
                      onDragEnd={(e) => e.preventDefault()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                    >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Änderungen verwerfen
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Möchten Sie das Modal ohne Speichern schließen?
                </p>
              </div>
            </div>
            
            <div className="flex justify-between space-x-3">
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Schließen
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleSave();
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                  style={getAccentColorStyles().bg}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Notes Linking Overlay */}
      {showNotesOverlay && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999999999]"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          onDrag={(e) => e.preventDefault()}
          onDragEnd={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notizen verknüpfen
              </h3>
              <button
                onClick={() => {
                  setShowNotesOverlay(false);
                  setNotesSearchQuery('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={notesSearchQuery}
                  onChange={(e) => setNotesSearchQuery(e.target.value)}
                  placeholder="Notizen durchsuchen..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {getFilteredNotes().map((note) => (
                  <div 
                    key={note.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.linkedNotes.includes(note.id)
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    style={formData.linkedNotes.includes(note.id) ? {
                      backgroundColor: state.preferences.accentColor + '15',
                      borderColor: state.preferences.accentColor + '50'
                    } : {}}
                    onClick={() => {
                      if (formData.linkedNotes.includes(note.id)) {
                        unlinkNote(note.id);
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          linkedNotes: [...prev.linkedNotes, note.id]
                        }));
                        
                        // Dispatch bidirectional link
                        if (task) {
                          dispatch({
                            type: 'LINK_TASK_TO_NOTE',
                            payload: { taskId: task.id, noteId: note.id }
                          });
                        }
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        formData.linkedNotes.includes(note.id)
                          ? 'border-gray-300 dark:border-gray-500'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                      style={formData.linkedNotes.includes(note.id) ? {
                        backgroundColor: state.preferences.accentColor,
                        borderColor: state.preferences.accentColor
                      } : {}}>
                        {formData.linkedNotes.includes(note.id) && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {note.content ? note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '') : 'Keine Inhalte'}
                        </p>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{note.tags.length - 3} weitere
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getFilteredNotes().length === 0 && notesSearchQuery.trim() && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Notizen gefunden</p>
                  <p className="text-xs mt-1">Versuchen Sie einen anderen Suchbegriff</p>
                </div>
              )}
              
              {getFilteredNotes().length === 0 && !notesSearchQuery.trim() && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Notizen verfügbar</p>
                  <p className="text-xs mt-1">Erstellen Sie zuerst eine Notiz, um sie zu verknüpfen</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.linkedNotes.length} Notizen ausgewählt
                </div>
                <button
                  onClick={() => {
                    setShowNotesOverlay(false);
                    setNotesSearchQuery('');
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                  style={getAccentColorStyles().bg}
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Markdown Help Modal */}
      {showMarkdownHelp && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999999999]" 
          onClick={() => setShowMarkdownHelp(false)}
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          onDrag={(e) => e.preventDefault()}
          onDragEnd={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          <div 
            role="dialog" 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Markdown Formatierung
              </h3>
              <button
                onClick={() => setShowMarkdownHelp(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Text Formatierung</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                    **Fett** oder __Fett__<br/>
                    *Kursiv* oder _Kursiv_<br/>
                    ~~Durchgestrichen~~<br/>
                    `Code`
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Überschriften</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                    # Große Überschrift<br/>
                    ## Mittlere Überschrift<br/>
                    ### Kleine Überschrift
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Listen</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                    - Punkt 1<br/>
                    - Punkt 2<br/>
                    &nbsp;&nbsp;- Unterpunkt<br/><br/>
                    1. Nummerierte Liste<br/>
                    2. Punkt 2
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Links & Zitate</h4>
                                       <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                     [Link Text](https://example.com)<br/><br/>
                     &gt; Dies ist ein Zitat
                   </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Codeblöcke</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                    ```<br/>
                    Mehrzeiliger Code<br/>
                    Zeile 2<br/>
                    ```
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trennlinien</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded font-mono text-xs">
                    ---
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <button
                onClick={() => setShowMarkdownHelp(false)}
                className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                style={getAccentColorStyles().bg}
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Project Column Selector */}

      {/* Series Edit Modal */}
      <SeriesEditModal
        isOpen={showSeriesEditModal}
        onClose={() => {
          setShowSeriesEditModal(false);
          setPendingTaskData(null);
        }}
        onEditInstance={handleEditInstance}
        onEditSeries={handleEditSeries}
        taskTitle={pendingTaskData?.title || ''}
      />

      {/* Series Delete Modal */}
      <SeriesDeleteModal
        isOpen={showSeriesDeleteModal}
        onClose={() => {
          setShowSeriesDeleteModal(false);
          setPendingDeleteTask(null);
        }}
        onDeleteInstance={handleDeleteInstance}
        onDeleteSeries={handleDeleteSeries}
        taskTitle={pendingDeleteTask?.title || ''}
      />

      {/* Multi-line Subtask Creation Modal */}
      {showMultiLineModal && (
        <div 
          className="fixed inset-0 z-[9999999999]"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setShowMultiLineModal(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          onDrag={(e) => e.preventDefault()}
          onDragEnd={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowMultiLineModal(false);
            } else if (e.key === 'Enter') {
              createMultipleSubtasks();
            }
          }}
        >
          <div 
            className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[400px]"
            style={{
              left: `${pastePosition.x}px`,
              top: `${pastePosition.y}px`,
              transform: 'translateX(-50%)',
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onDrag={(e) => e.preventDefault()}
            onDragEnd={(e) => e.preventDefault()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                  <span 
                    className="w-5 h-5 flex items-center justify-center rounded text-sm"
                    style={{
                      backgroundColor: `${state.preferences.accentColor}20`,
                      color: state.preferences.accentColor
                    }}
                  >📋</span>
                  <span>Mehrere Zeilen erkannt</span>
                </h3>
                <button
                  onClick={() => setShowMultiLineModal(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{
                    color: state.preferences.accentColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Sie möchten {multiLineText.split('\n').filter(line => line.trim() !== '').length} Zeilen einfügen.
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleNormalPaste}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md transition-colors border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{
                  borderColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}10`;
                  e.currentTarget.style.borderColor = `${state.preferences.accentColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: state.preferences.accentColor }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  ></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Normal einfügen</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Nur die erste Zeile wird eingefügt</div>
                </div>
              </button>
              
              <button
                onClick={createMultipleSubtasks}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors border"
                style={{
                  backgroundColor: `${state.preferences.accentColor}10`,
                  borderColor: `${state.preferences.accentColor}30`,
                  color: state.preferences.accentColor
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}15`;
                  e.currentTarget.style.borderColor = `${state.preferences.accentColor}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}10`;
                  e.currentTarget.style.borderColor = `${state.preferences.accentColor}30`;
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: state.preferences.accentColor }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  ></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold" style={{ color: state.preferences.accentColor }}>
                    Mehrere Einträge anlegen
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Jede Zeile wird zu einer Unteraufgabe
                  </div>
                </div>
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Vorschau der Zeilen:
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  <kbd 
                    className="px-1 py-0.5 text-xs rounded font-medium"
                    style={{
                      backgroundColor: `${state.preferences.accentColor}20`,
                      color: state.preferences.accentColor,
                      border: `1px solid ${state.preferences.accentColor}40`
                    }}
                  >Enter</kbd> für mehrere • <kbd 
                    className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 rounded"
                  >Esc</kbd> zum Abbrechen
                </div>
              </div>
              <div 
                className="max-h-20 overflow-y-auto text-xs font-mono p-2 rounded border"
                style={{
                  backgroundColor: `${state.preferences.accentColor}05`,
                  borderColor: `${state.preferences.accentColor}20`
                }}
              >
                {multiLineText.split('\n').filter(line => line.trim() !== '').slice(0, 5).map((line, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300 truncate">
                    <span 
                      className="font-medium"
                      style={{ color: state.preferences.accentColor }}
                    >
                      {index + 1}.
                    </span> {line.trim()}
                  </div>
                ))}
                {multiLineText.split('\n').filter(line => line.trim() !== '').length > 5 && (
                  <div className="text-gray-500 dark:text-gray-400">
                    ... und {multiLineText.split('\n').filter(line => line.trim() !== '').length - 5} weitere
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );

  const handleReminderUpdate = (updatedTask: Task) => {
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    setHasUnsavedChanges(true);
  };



  // Add global styles for animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes checkboxPop {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes fadeInEditMode {
        from {
          opacity: 0;
          transform: scale(0.98);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes slideDown {
        from {
          max-height: 0;
          opacity: 0;
        }
        to {
          max-height: 500px;
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
      {createPortal(modalContent, document.body)}
    </>
  );
} 