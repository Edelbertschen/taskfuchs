import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { 
  Tag, 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  Archive, 
  Trash2,
  Zap,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  FolderOpen,
  Hash,
  Flag,
  Inbox,
  Plus,
  Filter,
  List,
  Search,
  CheckSquare,
  Pin as PinIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import { TaskModal } from '../Tasks/TaskModal';
import { DatePickerModal } from '../Common/DatePickerModal';
import { ProjectColumnSelector } from '../Projects/ProjectColumnSelector';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { TagInput } from '../Tags/TagInput';
import { parseTaskInput } from '../../utils/taskParser';
import { Header } from '../Layout/Header';
import type { Task, Column, ParseResult } from '../../types';
import { format, addDays, startOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { getBackgroundStyles, getDarkModeBackgroundStyles } from '../../utils/backgroundUtils';
import { MobilePullToRefresh } from '../Common/MobilePullToRefresh';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { MobileSnackbar } from '../Common/MobileSnackbar';

export function InboxView() {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  const { actions, forms, titles, messages, inboxView } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  const dateLocale = i18n.language === 'de' ? de : enUS;
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  // Modal navigation state for sequencing inbox tasks
  const [modalTaskIndex, setModalTaskIndex] = useState<number>(-1);
  const [modalNavDirection, setModalNavDirection] = useState<'prev' | 'next' | null>(null);
  
  // Track task IDs that were edited during this session (tasks stay visible until user leaves)
  // Only tasks WITHOUT a date AND WITHOUT a project are considered "true" inbox tasks
  const [sessionEditedTaskIds, setSessionEditedTaskIds] = useState<Set<string>>(new Set());

  // Define inboxTasks early so it can be used in functions below
  // Tasks in inbox: columnId='inbox' AND no date AND no project
  // OR tasks edited during this session (stay visible until leaving the area)
  const inboxTasks = useMemo(() => state.tasks
    .filter(task => {
      // True inbox task: columnId is inbox AND no date AND no project assigned
      const isTrueInbox = task.columnId === 'inbox' && !task.reminderDate && !task.projectId;
      // Or it was edited this session (stays visible until user leaves)
      const isSessionEdited = sessionEditedTaskIds.has(task.id);
      return isTrueInbox || isSessionEdited;
    })
    .filter(task => !task.completed) // Exclude completed tasks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [state.tasks, sessionEditedTaskIds]);

  const openInboxTaskAt = (idx: number) => {
    const flat = inboxTasks;
    if (idx < 0 || idx >= flat.length) return;
    setSelectedTaskForModal(flat[idx]);
    setModalTaskIndex(idx);
    setShowTaskModal(true);
  };

  const openFirstInboxTask = () => {
    if (inboxTasks.length > 0) {
      setModalNavDirection(null);
      openInboxTaskAt(0);
    }
  };

  const navigatePrevTask = () => {
    if (modalTaskIndex > 0) {
      const nextIdx = modalTaskIndex - 1;
      setModalNavDirection('prev');
      openInboxTaskAt(nextIdx);
    }
  };

  const navigateNextTask = () => {
    const flat = inboxTasks;
    if (modalTaskIndex >= 0 && modalTaskIndex < flat.length - 1) {
      const nextIdx = modalTaskIndex + 1;
      setModalNavDirection('next');
      openInboxTaskAt(nextIdx);
    }
  };

  // Auto-advance after save - Keep task visible in inbox until user leaves
  const handleTaskSaved = (updated: Task) => {
    // Add the updated task to sessionEditedTaskIds so it stays visible during this session
    setSessionEditedTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.add(updated.id);
      return newSet;
    });
    
    // Recompute current index against list INCLUDING session-edited tasks
    const flat = state.tasks
      .filter(t => {
        // True inbox task: columnId is inbox AND no date AND no project
        const isTrueInbox = t.columnId === 'inbox' && !t.reminderDate && !t.projectId;
        // Or it was edited this session
        const isSessionEdited = sessionEditedTaskIds.has(t.id) || t.id === updated.id;
        return isTrueInbox || isSessionEdited;
      })
      .filter(t => !t.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (flat.length === 0) {
      setShowTaskModal(false);
      setSelectedTaskForModal(null);
      setModalTaskIndex(-1);
      return;
    }
    
    // Update the selected task with the new data so changes are visible
    const updatedTask = flat.find(t => t.id === updated.id);
    if (updatedTask) {
      setSelectedTaskForModal(updatedTask);
    }
    
    // Don't auto-advance - let user stay on current task
    const currentIdx = flat.findIndex(t => t.id === updated.id);
    if (currentIdx >= 0) {
      setModalTaskIndex(currentIdx);
    }
  };
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<Task | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedTaskForProject, setSelectedTaskForProject] = useState<Task | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  // Pin picker state
  const [showPinPicker, setShowPinPicker] = useState(false);
  const [selectedTaskForPin, setSelectedTaskForPin] = useState<Task | null>(null);
  
  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  // Bulk actions modal state
  const [showBulkProjectModal, setShowBulkProjectModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showBulkCalendar, setShowBulkCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Project selector state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectColumns, setShowProjectColumns] = useState(false);
  const [selectedProjectForColumns, setSelectedProjectForColumns] = useState<string | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Snackbar for undo archive
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastArchivedTask, setLastArchivedTask] = useState<Task | null>(null);

  // Sidebar slide-in animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowBulkCalendar(false);
      }
    };

    if (showBulkCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBulkCalendar]);

  // Get accent color
  const accentColor = state.preferences.accentColor || '#f97316';

  // Utility functions for dynamic accent colors
  const getAccentColorStyles = () => {
    return {
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'dd' },
      text: { color: accentColor },
      border: { borderColor: accentColor },
    };
  };

  // Calendar helper functions
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    const threeYearsFromNow = addDays(today, 365 * 3);
    return !isBefore(date, today) && !isAfter(date, threeYearsFromNow);
  };

  const handleBulkDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const columnId = `date-${dateStr}`;
    
    // Ensure the date column exists
    dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
    
    // Move all selected tasks to the date column
    selectedTasks.forEach(taskId => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        // Create update payload - PRESERVE project assignment
        let updatePayload: any = {
          ...task,
          columnId: columnId,
          reminderDate: dateStr,
          // IMPORTANT: Keep projectId and kanbanColumnId so task stays visible in project view
          projectId: task.projectId, // Preserve project assignment
          kanbanColumnId: task.kanbanColumnId, // Preserve kanban column
          updatedAt: new Date().toISOString()
        };

        // Update the task (this automatically moves it by setting columnId)
        dispatch({
          type: 'UPDATE_TASK',
          payload: updatePayload
        });
      }
    });
    
    // Reset selection and close calendar
    setSelectedTasks(new Set());
    setShowBulkActions(false);
    setShowBulkCalendar(false);
  };

  // Group tasks by created date
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    inboxTasks.forEach(task => {
      const createdDate = format(new Date(task.createdAt), 'yyyy-MM-dd');
      if (!groups[createdDate]) {
        groups[createdDate] = [];
      }
      groups[createdDate].push(task);
    });

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groups).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map(date => ({
      date,
      displayDate: format(new Date(date), i18n.language === 'de' ? 'EEEE, d. MMMM yyyy' : 'EEEE, MMMM d, yyyy', { locale: dateLocale }),
      tasks: groups[date]
    }));
  }, [inboxTasks, dateLocale, i18n.language]);

  // Get unique dates for sidebar filter
  const availableDates = useMemo(() => {
    return groupedTasks.map(group => ({
      id: group.date,
      label: group.displayDate,
      count: group.tasks.length
    }));
  }, [groupedTasks]);

  // Filter tasks by selected date
  const filteredGroups = useMemo(() => {
    if (!selectedDateFilter) return groupedTasks;
    return groupedTasks.filter(group => group.date === selectedDateFilter);
  }, [groupedTasks, selectedDateFilter]);

  // Get available columns for assignment (excluding inbox)
  const availableColumns = state.columns.filter(col => col.id !== 'inbox');
  const dateColumns = availableColumns.filter(col => col.type === 'date');
  const projectColumns = availableColumns.filter(col => col.type === 'project');
  const availableTags = state.tags;
  
  // Count for header badge - only count TRUE inbox tasks (not session-edited ones with dates/projects)
  const trueInboxCount = useMemo(() => 
    state.tasks.filter(task => 
      task.columnId === 'inbox' && 
      !task.reminderDate && 
      !task.projectId && 
      !task.completed
    ).length,
  [state.tasks]);
  
  const inboxCount = selectedDateFilter
    ? filteredGroups.reduce((acc, group) => acc + group.tasks.length, 0)
    : trueInboxCount;

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
    
    // Close dropdowns when no tasks are selected
    if (newSelected.size === 0) {
      setShowBulkCalendar(false);
    }
  };

  const handleTaskClick = (task: Task, event: React.MouseEvent) => {
    // Handle CTRL/CMD + Click for multi-selection
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      
      // Enable multi-select mode if not already active
      if (!multiSelectMode) {
        setMultiSelectMode(true);
      }
      
      // Toggle selection
      const isSelected = selectedTasks.has(task.id);
      handleTaskSelect(task.id, !isSelected);
      return;
    }
    
    // Regular click behavior depends on selection mode
    if (multiSelectMode) {
      // In selection mode: single click toggles selection
      const isSelected = selectedTasks.has(task.id);
      handleTaskSelect(task.id, !isSelected);
      return;
    }

    // Not in selection mode: open task modal directly
    handleEditTask(task);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === inboxTasks.length) {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
      // Close dropdowns when deselecting all
      setShowBulkCalendar(false);
    } else {
      setSelectedTasks(new Set(inboxTasks.map(task => task.id)));
      setShowBulkActions(true);
    }
  };

  const toggleMultiSelectMode = () => {
    const newMode = !multiSelectMode;
    setMultiSelectMode(newMode);
    
    // Clear selections when exiting multi-select mode
    if (!newMode) {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
      setShowBulkCalendar(false);
    }
  };

  const handleBulkAssignToColumn = (columnId: string) => {
    selectedTasks.forEach(taskId => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { ...task, columnId }
        });
      }
    });
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  };

  const handleBulkAddTag = (tagName: string) => {
    selectedTasks.forEach(taskId => {
      const task = state.tasks.find(t => t.id === taskId);
      if (task && !task.tags.includes(tagName)) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { 
            ...task, 
            tags: [...task.tags, tagName]
          }
        });
      }
    });
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    const tasksToDelete = Array.from(selectedTasks);
    tasksToDelete.forEach((taskId, index) => {
      setTimeout(() => {
        dispatch({
          type: 'DELETE_TASK',
          payload: taskId
        });
      }, index * 10);
    });
    
    setSelectedTasks(new Set());
    setShowBulkActions(false);
    setShowBulkDeleteModal(false);
    // Close dropdowns after deletion
    setShowBulkCalendar(false);
  };

  // Bulk action handlers
  const handleBulkProjectAssign = () => {
    setShowBulkProjectModal(!showBulkProjectModal);
    setShowBulkTagModal(false);
    setShowBulkCalendar(false);
    setShowProjectColumns(false);
    setSelectedProjectForColumns(null);
    setProjectSearchQuery('');
    setIsCreatingColumn(false);
    setNewColumnTitle('');
  };

  const handleBulkTagAdd = () => {
    setShowBulkTagModal(!showBulkTagModal);
    setShowBulkProjectModal(false);
    setShowBulkCalendar(false);
  };

  const handleToggleDateDropdown = () => {
    setShowBulkCalendar(!showBulkCalendar);
    setShowBulkProjectModal(false);
    setShowBulkTagModal(false);
  };

  const handleBulkAssignAndClose = (columnId: string) => {
    handleBulkAssignToColumn(columnId);
    setShowBulkCalendar(false);
  };

  const handleBulkProjectModalSelect = (projectId: string, columnId?: string) => {
    Array.from(selectedTasks).forEach(taskId => {
      const task = inboxTasks.find(t => t.id === taskId);
      if (task) {
        let updatePayload: any = {
          ...task,
          columnId: undefined,
          kanbanColumnId: undefined,
          updatedAt: new Date().toISOString()
        };
        
        if (columnId && columnId !== projectId) {
          updatePayload.columnId = projectId;
          updatePayload.kanbanColumnId = columnId;
        } else {
          updatePayload.columnId = projectId;
          updatePayload.kanbanColumnId = undefined;
        }
        
        dispatch({
          type: 'UPDATE_TASK',
          payload: updatePayload
        });
      }
    });
    
    setSelectedTasks(new Set());
    setShowBulkActions(false);
    setShowBulkProjectModal(false);
    setShowProjectColumns(false);
    setSelectedProjectForColumns(null);
    setProjectSearchQuery('');
    setIsCreatingColumn(false);
    setNewColumnTitle('');
  };

  const handleBulkTagModalAdd = (tagName: string) => {
    handleBulkAddTag(tagName);
    setShowBulkTagModal(false);
  };

  // Project selector functions
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
        color: accentColor
      }
    });
    
    setIsCreatingColumn(false);
    setNewColumnTitle('');
  };

  const handleTaskAssign = (task: Task, columnId: string) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, columnId }
    });
  };

  const handleTaskAddTag = (task: Task, tagName: string) => {
    if (!task.tags.includes(tagName)) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { 
          ...task, 
          tags: [...task.tags, tagName]
        }
      });
    }
  };

  const handleEditTask = (task: Task) => {
    // Ensure modal navigation knows the current index so arrows render
    const idx = inboxTasks.findIndex(t => t.id === task.id);
    setModalTaskIndex(idx);
    setModalNavDirection(null);
    setSelectedTaskForModal(task);
    setShowTaskModal(true);
  };

  const handleDateSelect = (task: Task) => {
    setSelectedTaskForDate(task);
    setShowDatePicker(true);
  };

  const handleDateAssign = (columnId: string) => {
    if (selectedTaskForDate) {
      // Extract date from column ID (format: date-YYYY-MM-DD) or from column's date property
      let reminderDate = undefined;
      if (columnId.startsWith('date-')) {
        reminderDate = columnId.replace('date-', '');
      } else {
        // Find the column and get its date
        const column = state.columns.find(c => c.id === columnId);
        if (column && column.date) {
          reminderDate = column.date;
        }
      }
      
      // Add to sessionEditedTaskIds so task stays visible until user leaves inbox
      setSessionEditedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedTaskForDate.id);
        return newSet;
      });
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: { 
          ...selectedTaskForDate, 
          reminderDate, // Set the reminder date
          // Keep task in inbox - don't change columnId
          updatedAt: new Date().toISOString()
        }
      });
      setSelectedTaskForDate(null);
    }
  };

  const handleProjectSelect = (task: Task) => {
    setSelectedTaskForProject(task);
    setShowProjectModal(true);
  };

  const handleProjectAssign = (projectId: string, columnId?: string) => {
    if (selectedTaskForProject) {
      // Add to sessionEditedTaskIds so task stays visible until user leaves inbox
      setSessionEditedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedTaskForProject.id);
        return newSet;
      });
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...selectedTaskForProject,
          projectId, // Set project ID
          kanbanColumnId: columnId && columnId !== projectId ? columnId : undefined,
          // Keep task in inbox - don't change columnId
          updatedAt: new Date().toISOString()
        }
      });
      
      setSelectedTaskForProject(null);
    }
  };

  const handleAssignTaskToPin = (task: Task, pinColumnId: string) => {
    if (!pinColumnId) return;
    
    // Add to sessionEditedTaskIds so task stays visible until user leaves inbox
    setSessionEditedTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.add(task.id);
      return newSet;
    });
    
    dispatch({ type: 'ASSIGN_TASK_TO_PIN', payload: { taskId: task.id, pinColumnId } });
  };

  const handlePinSelect = (task: Task) => {
    setSelectedTaskForPin(task);
    setShowPinPicker(true);
  };

  const handlePinAssign = (pinColumnId: string) => {
    if (selectedTaskForPin) {
      // Add to sessionEditedTaskIds so task stays visible until user leaves inbox
      setSessionEditedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedTaskForPin.id);
        return newSet;
      });
      
      dispatch({ 
        type: 'ASSIGN_TASK_TO_PIN', 
        payload: { taskId: selectedTaskForPin.id, pinColumnId } 
      });
      setShowPinPicker(false);
      setSelectedTaskForPin(null);
    }
  };

  // Reactive dark mode check
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const useGlobalBackground = !isMinimalDesign && state.preferences.backgroundImage && state.preferences.backgroundType === 'image';
  const backgroundStyles = isMinimalDesign
    ? { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }
    : useGlobalBackground
      ? {}
      : (isDarkMode ? getDarkModeBackgroundStyles(state.preferences) : getBackgroundStyles(state.preferences));

  // Keyboard navigation within modal
  useEffect(() => {
    if (!showTaskModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrevTask();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNextTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTaskModal, modalTaskIndex, inboxTasks.length]);

  return (
    <div 
      className={`h-full w-full relative overflow-hidden ${
        isMinimalDesign
          ? 'bg-white dark:bg-[#111827]'
          : 'bg-transparent'
      }`}
      style={backgroundStyles}
    >
      {/* Header - positioned to account for sidebar */}
      <div 
        className="absolute top-0 right-0 z-10"
        style={{
          left: sidebarVisible ? '320px' : '0px', // 320px = w-80
          transition: 'left 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div className={`flex-shrink-0 ${
          isMinimalDesign
            ? 'bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-700'
            : 'bg-transparent'
        }`}>
          <Header currentView="inbox" />
        </div>
      </div>
      
      {/* Sidebar - Full height from top to bottom */}
      <div 
        className={`absolute top-0 left-0 bottom-0 w-full sm:w-80 flex flex-col overflow-hidden z-20 border-r ${
          isMinimalDesign
            ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
            : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-white/20 dark:border-gray-700/30'
        }`}
        style={{
          boxShadow: isMinimalDesign ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Header - matching main header style */}
        <div 
          className="relative flex items-center px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]"
          style={{ 
            height: '68px',
            minHeight: '68px',
            maxHeight: '68px',
            boxSizing: 'border-box'
          }}
        >
          {/* Main header content - centered */}
          <div className="flex items-center justify-between w-full">
            <h1 className="text-lg font-semibold flex items-center space-x-2 text-gray-900 dark:text-white"
                style={{ textShadow: 'none', lineHeight: '1.5' }}>
              <Inbox className="w-5 h-5" style={{ color: accentColor }} />
              <span>{inboxView.title()}</span>
              {inboxCount > 0 && (
                <span
                  className="text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full border"
                  style={{ lineHeight: '1' }}
                >
                  {inboxCount}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              {/* Buttons removed - they were irritating */}
            </div>
          </div>


        </div>

        {/* Date Filter List */}
        <div className="flex-1 overflow-y-auto sidebar-content"
        style={{
          backgroundColor: isMinimalDesign
            ? (isDarkMode ? '#111827' : 'rgba(255, 255, 255, 0.5)')
            : 'transparent'
        }}>
          <div className={`border-b ${
            isMinimalDesign
              ? 'border-gray-200 dark:border-gray-800'
              : 'border-white/10 dark:border-gray-700/30'
          }`}
          style={{
            backgroundColor: isMinimalDesign
            ? (isDarkMode ? '#111827' : 'rgba(255, 255, 255, 0.5)')
            : 'transparent'
          }}>
            <div className={`px-4 py-3 ${
              isMinimalDesign
                ? ''
                : ''
            }`}
            style={{
              backgroundColor: isMinimalDesign
            ? (isDarkMode ? '#111827' : 'rgba(255, 255, 255, 0.5)')
            : 'transparent'
            }}>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className={`text-sm font-medium flex items-center ${isMinimalDesign ? 'text-gray-800 dark:text-gray-300' : (isDarkMode ? `isDarkMode ? 'text-white' : 'text-gray-900'` : 'text-gray-900')}`}
                    style={{ textShadow: 'none', lineHeight: '1.5', minHeight: '20px' }}>
                  {inboxView.filterByDate()}
                </h2>
              </div>
            </div>
            
            {/* All Tasks Option */}
            <div
              onClick={() => setSelectedDateFilter(null)}
              className={`p-4 cursor-pointer transition-colors relative ${
                isMinimalDesign
                  ? 'border-b border-gray-200 dark:border-gray-700 hover:bg-white/30 dark:hover:bg-gray-700'
                  : 'border-b border-white/15 hover:bg-white/10'
              }`}
              style={!selectedDateFilter 
                ? { 
                    borderLeft: `4px solid ${accentColor}`,
                    backgroundColor: `${accentColor}1A`
                  }
                : {}
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <List className={`w-4 h-4 flex-shrink-0 ${isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : `isDarkMode ? (isDarkMode ? 'text-white/70' : 'text-gray-70') : 'text-gray-700'`}`} />
                  <h3 className={`font-medium text-sm flex items-center ${isMinimalDesign ? 'text-gray-800 dark:text-white' : `isDarkMode ? 'text-white' : 'text-gray-900'`}`}
                      style={{ textShadow: 'none', lineHeight: '1.5', minHeight: '20px' }}>
                    {inboxView.allTasks()}
                  </h3>
                </div>
                <span className={`text-sm ml-2 font-medium ${isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? (isDarkMode ? 'text-white/60' : 'text-gray-60') : 'text-gray-600')}`}
                      style={{ textShadow: 'none', lineHeight: '1.5' }}>
                  {inboxTasks.length}
                </span>
              </div>
            </div>

            {/* Date Options */}
            {availableDates.map((dateOption) => (
              <div
                key={dateOption.id}
                onClick={() => setSelectedDateFilter(dateOption.id)}
                className={`p-4 cursor-pointer transition-colors relative ${
                  isMinimalDesign
                    ? 'border-b border-gray-200 dark:border-gray-700 hover:bg-white/30 dark:hover:bg-gray-700'
                    : 'border-b border-white/15 hover:bg-white/10'
                }`}
                style={selectedDateFilter === dateOption.id 
                  ? { 
                      borderLeft: `4px solid ${accentColor}`,
                      backgroundColor: `${accentColor}1A`
                    }
                  : {}
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Calendar className={`w-4 h-4 flex-shrink-0 ${isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : `isDarkMode ? (isDarkMode ? 'text-white/70' : 'text-gray-70') : 'text-gray-700'`}`} />
                                    <h3 className={`font-medium text-sm truncate ${isMinimalDesign ? 'text-gray-800 dark:text-white' : `isDarkMode ? 'text-white' : 'text-gray-900'`}`}
                    style={{ textShadow: 'none', lineHeight: '1.5' }}>
                      {dateOption.label}
                    </h3>
                  </div>
                  <span className={`text-sm ml-2 font-medium ${isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : (isDarkMode ? (isDarkMode ? 'text-white/60' : 'text-gray-60') : 'text-gray-600')}`}
                        style={{ textShadow: 'none', lineHeight: '1.5' }}>
                    {dateOption.count}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Clear Filter Option */}
          {selectedDateFilter && (
            <div className="p-4">
              <button
                onClick={() => setSelectedDateFilter(null)}
                className={`w-full text-left px-3 py-2 transition-colors rounded-md text-sm font-medium flex items-center space-x-2 ${isMinimalDesign ? 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                style={{ lineHeight: '1.5', minHeight: '36px' }}
              >
                <X className="w-4 h-4" />
                <span style={{ textShadow: 'none' }}>
                  {t('inbox_view.remove_filter', { defaultValue: 'Filter entfernen' })}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - positioned to the right of sidebar */}
      <div 
        className={`absolute top-0 right-0 bottom-0 flex flex-col overflow-hidden ${
          isMinimalDesign
            ? ''
            : 'bg-transparent'
        }`}
        style={{
          left: sidebarVisible ? '320px' : '0px', // 320px = w-80
          transition: 'left 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          paddingTop: '64px', // Height of header
        }}
        onTouchStart={(e) => {
          const x = e.touches[0].clientX;
          (window as any)._inboxSwipeStartX = x;
        }}
        onTouchEnd={(e) => {
          const start = (window as any)._inboxSwipeStartX as number | undefined;
          if (start == null) return;
          const endX = e.changedTouches[0].clientX;
          const dx = endX - start;
          if (!sidebarVisible && start < 24 && dx > 60) setSidebarVisible(true);
          if (sidebarVisible && dx < -60) setSidebarVisible(false);
          (window as any)._inboxSwipeStartX = undefined;
        }}
      >
        {/* Content Area - main task list */}
        <MobilePullToRefresh onRefresh={async () => dispatch({ type: 'NO_OP' } as any)}>
        <div className="p-6 h-full flex flex-col">
          {/* Top Right Add Button */}
          <div className="mb-6 flex items-center justify-end">
            <button
              onClick={() => setShowSmartTaskModal(true)}
              data-quick-add-button
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 ${isMinimalDesign ? `isDarkMode ? 'text-white' : 'text-gray-900'` : 'text-white backdrop-blur-xl border border-white/20'}`}
              style={{ 
                backgroundColor: `${accentColor}E6`,
                boxShadow: isMinimalDesign ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.15)',
                textShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${accentColor}E6`;
              }}
              title={inboxView.newTaskTooltip()}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium text-sm" style={{ lineHeight: '1.5' }}>{t('actions.add')}</span>
            </button>
          </div>
          

          {/* Bulk Actions */}
          {showBulkActions && (
            <div 
              className="mb-6 p-4 rounded-xl border backdrop-blur-2xl"
              style={{
                background: `${accentColor}26`, // 15% opacity
                borderColor: `${accentColor}66`, // 40% opacity
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}
            >
                              <div className="flex items-center justify-between mb-3">
                                  <span className={`text-sm font-medium ${isMinimalDesign ? 'text-gray-700 dark:text-gray-200' : (isDarkMode ? (isDarkMode ? 'text-white/80' : 'text-gray-80') : 'text-gray-800')}`}
                   style={{ textShadow: 'none', lineHeight: '1.5' }}>
                  {selectedTasks.size} {actions.tasksSelected()}
                </span>
                
                <div className="flex items-center space-x-2">
                                    <div className="relative dropdown-container">
                    <button 
                      onClick={handleToggleDateDropdown}
                      className="px-3 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1 text-white/70 hover:text-white"
                      style={showBulkCalendar ? { backgroundColor: accentColor, lineHeight: '1.5', minHeight: '32px' } : { lineHeight: '1.5', minHeight: '32px' }}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{actions.schedule()}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showBulkCalendar ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Kalender Pseudo-Overlay */}
                    {showBulkCalendar && (
                      <div className="absolute left-0 top-full mt-2 z-[9999] animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80">
                          {/* Header */}
                          <div className="bg-gray-50 dark:bg-gray-750 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={previousMonth}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                              
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
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
                              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                                                              <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-1" style={{ lineHeight: '1.5' }}>
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

                                  return (
                                    <button
                                      key={index}
                                      onClick={() => isAvailable ? handleBulkDateSelect(date) : undefined}
                                      disabled={!isAvailable}
                                      className={`
                                        relative h-8 w-8 rounded-md text-sm font-medium transition-all duration-150 flex items-center justify-center
                                        ${!isCurrentMonth 
                                          ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-100/50 dark:hover:bg-gray-700/50' 
                                          : isAvailable
                                            ? isToday
                                              ? 'text-white font-bold shadow-sm'
                                              : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
                                        }
                                      `}
                                      style={
                                        isToday && isCurrentMonth 
                                          ? getAccentColorStyles().bg
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
                                  onClick={() => handleBulkDateSelect(new Date())}
                                  className="font-medium hover:opacity-80 transition-colors"
                                  style={getAccentColorStyles().text}
                                >
                                  {actions.today()}
                                </button>
                                <button
                                  onClick={() => handleBulkDateSelect(addDays(new Date(), 1))}
                                  className="font-medium text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                  style={{ lineHeight: '1.5' }}
                                >
                                  {actions.tomorrow()}
                                </button>
                                <button
                                  onClick={() => handleBulkDateSelect(addDays(new Date(), 7))}
                                  className="font-medium text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                  style={{ lineHeight: '1.5' }}
                                >
                                  {actions.nextWeek()}
                                </button>
                              </div>
                              
                              <button
                                onClick={() => setShowBulkCalendar(false)}
                                className="font-medium text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                style={{ lineHeight: '1.5' }}
                              >
                                {actions.close()}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative dropdown-container">
                    <button 
                      onClick={handleBulkProjectAssign}
                      className="px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1 text-white/70 hover:text-white"
                      style={showBulkProjectModal ? { backgroundColor: accentColor } : {}}
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>{actions.assign()}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showBulkProjectModal ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Projekt Slider */}
                    {showBulkProjectModal && (
                      <div className="absolute right-0 top-full mt-2 z-[9999] animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[480px] h-[600px]">
                          {/* Header */}
                          <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {showProjectColumns ? inboxView.columnSelect() : inboxView.projectSelect()}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {showProjectColumns && (
                                  <button
                                    onClick={handleBackToProjects}
                                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center space-x-1"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                    <span>{actions.back()}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setShowBulkProjectModal(false);
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
                                    placeholder={inboxView.searchProjects()}
                                    value={projectSearchQuery}
                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-opacity-20 focus:border-transparent"
                                    style={{ 
                                      '--tw-ring-color': accentColor + '20'
                                    } as React.CSSProperties}
                                  />
                                </div>
                              </div>

                              {/* Projects List */}
                              <div className="h-[500px] overflow-y-auto">
                                {getFilteredProjects().map(project => {
                                  const projectKanbanColumns = state.viewState.projectKanban.columns.filter(col => 
                                    col.projectId === project.id
                                  );

                                  return (
                                    <div key={project.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                      <div 
                                        onClick={() => handleProjectClick(project.id)}
                                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div 
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: accentColor }}
                                          />
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {project.title}
                                          </span>
                                          {projectKanbanColumns.length > 0 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              ({projectKanbanColumns.length} {actions.columnsCount()})
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {getFilteredProjects().length === 0 && (
                                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    {projectSearchQuery ? inboxView.noProjectsFound() : inboxView.noProjectsAvailable()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Project Columns - Slides in from right */}
                            {showProjectColumns && selectedProjectForColumns && (
                              <div className="absolute inset-0 bg-white dark:bg-gray-800 transform translate-x-full animate-in slide-in-from-right-full duration-300" 
                                   style={{ transform: showProjectColumns ? 'translateX(0)' : 'translateX(100%)' }}>
                                {(() => {
                                  const selectedProject = state.columns.find(col => col.id === selectedProjectForColumns);
                                  const projectKanbanColumns = state.viewState.projectKanban.columns.filter(col => 
                                    col.projectId === selectedProjectForColumns
                                  );

                                  return (
                                    <div className="h-full flex flex-col">
                                      {/* Project Header */}
                                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center space-x-3">
                                          <div 
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: accentColor }}
                                          />
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {selectedProject?.title}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Project Columns */}
                                      <div className="flex-1 overflow-y-auto h-[500px]">
                                        {projectKanbanColumns.map(column => (
                                          <div
                                            key={column.id}
                                            onClick={() => {
                                              handleBulkProjectModalSelect(selectedProjectForColumns, column.id);
                                            }}
                                            className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
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
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {projectKanbanColumns.length === 0 && !isCreatingColumn && (
                                          <div className="px-4 py-8 text-center">
                                            <div className="text-gray-500 dark:text-gray-400 mb-4">
                                              {inboxView.noColumnsInProject()}
                                            </div>
                                            <button
                                              onClick={() => setIsCreatingColumn(true)}
                                              className="px-4 py-2 text-sm text-white rounded-lg transition-colors inline-flex items-center space-x-2"
                                              style={{ backgroundColor: accentColor }}
                                            >
                                              <Plus className="w-4 h-4" />
                                              <span>{inboxView.createColumn()}</span>
                                            </button>
                                          </div>
                                        )}

                                        {/* Create Column Form */}
                                        {isCreatingColumn && (
                                          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                            <div className="space-y-3">
                                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                {inboxView.newColumn()}
                                              </h4>
                                              <input
                                                type="text"
                                                value={newColumnTitle}
                                                onChange={(e) => setNewColumnTitle(e.target.value)}
                                                placeholder={t('forms.column_name_placeholder')}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-opacity-20 focus:border-transparent"
                                                style={{ 
                                                  '--tw-ring-color': accentColor + '20'
                                                } as React.CSSProperties}
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleCreateColumn();
                                                  }
                                                }}
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={handleCreateColumn}
                                                  className="px-3 py-1 text-xs text-white rounded transition-colors"
                                                  style={{ backgroundColor: accentColor }}
                                                >
                                                  {inboxView.create()}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setIsCreatingColumn(false);
                                                    setNewColumnTitle('');
                                                  }}
                                                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                  {inboxView.cancel()}
                                                </button>
                                              </div>
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
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative dropdown-container">
                    <button 
                      onClick={handleBulkTagAdd}
                      className="px-3 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1 text-white/70 hover:text-white"
                      style={showBulkTagModal ? { backgroundColor: accentColor, lineHeight: '1.5', minHeight: '32px' } : { lineHeight: '1.5', minHeight: '32px' }}
                    >
                      <Hash className="w-3 h-3" />
                      <span>{actions.tag()}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showBulkTagModal ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Tag Slider */}
                    {showBulkTagModal && (
                      <div className="absolute right-0 top-full mt-2 z-[9999] animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-64">
                          {/* Header */}
                          <div className="bg-gray-50 dark:bg-gray-750 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                                          <h3 className="text-sm font-medium text-gray-900 dark:text-white" style={{ lineHeight: '1.5' }}>
                                {actions.addTag()}
                              </h3>
                              <button
                                onClick={() => setShowBulkTagModal(false)}
                              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              style={{ lineHeight: '1.5' }}
                              >
                                {actions.close()}
                              </button>
                            </div>
                          </div>

                          {/* Tag Input */}
                          <div className="p-3">
                            <TagInput
                              taskTags={[]}
                              onTagsChange={(tags) => {
                                if (tags.length > 0) {
                                  handleBulkTagModalAdd(tags[tags.length - 1]);
                                }
                              }}
                              placeholder="Neuen Tag eingeben..."
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors flex items-center space-x-1"
                    style={{ lineHeight: '1.5', minHeight: '32px' }}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{inboxView.deleteButton()}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {inboxTasks.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl max-w-md mx-4 ${
                  isMinimalDesign
                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'bg-white/80 dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/10 shadow-[0_16px_40px_rgba(31,38,135,0.15)] backdrop-blur-xl relative overflow-hidden'
                }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    isMinimalDesign
                      ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      : 'bg-gray-100 dark:bg-white/15 border border-gray-200 dark:border-white/25 shadow-lg'
                  } relative z-10`}>
                    <Archive className={`w-8 h-8 ${
                      isMinimalDesign
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-gray-700 dark:text-white'
                    }`} />
                </div>
                  <h3 className="text-lg font-semibold mb-2 relative z-10 text-gray-900 dark:text-white">
                  {inboxView.emptyState.title()}
                </h3>
                  <p className="mb-6 relative z-10 text-gray-800 dark:text-gray-200">
                  {inboxView.emptyState.description()}
                </p>
                <button
                  onClick={() => setShowSmartTaskModal(true)}
                    className="text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:scale-105 backdrop-blur-xl border border-white/20 relative z-10"
                    style={{ 
                      backgroundColor: `${accentColor}E6`,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                      textShadow: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${accentColor}E6`;
                    }}
                >
                    <Zap className="w-5 h-5" />
                    <span className="font-medium">{inboxView.emptyState.createFirst()}</span>
                </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {filteredGroups.map((group, groupIndex) => (
                  <div key={group.date} className={groupIndex > 0 ? 'mt-8' : ''}>
                    {/* Date Header */}
                    <div className="mb-6">
                      <h2 className={`text-lg font-semibold mb-3 flex items-center ${isMinimalDesign ? 'text-gray-800 dark:text-white' : `isDarkMode ? 'text-white' : 'text-gray-900'`}`}
                          style={{ textShadow: 'none', lineHeight: '1.5', minHeight: '28px' }}>
                        {group.displayDate}
                      </h2>
                      <div className={`h-px ${isMinimalDesign ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white/20'} backdrop-blur-xl`}></div>
                    </div>
                    
                    {/* Tasks for this date */}
                    <div className="space-y-[5px]">
                      {group.tasks.map((task) => (
                        <SwipeableTaskCard
                          key={task.id}
                          onSwipeLeft={() => {
                            setLastArchivedTask(task);
                            handleTaskAssign(task, 'archive');
                            setSnackbarOpen(true);
                          }}
                          onSwipeRight={() => handleTaskClick(task, undefined)}
                        >
                          <InboxTaskCard
                            task={task}
                            isSelected={selectedTasks.has(task.id)}
                            onSelect={(selected) => handleTaskSelect(task.id, selected)}
                            onEdit={() => handleEditTask(task)}
                            onDateSelect={() => handleDateSelect(task)}
                            onProjectSelect={() => handleProjectSelect(task)}
                            onPinSelect={() => handlePinSelect(task)}
                            onAssignToColumn={(columnId) => handleTaskAssign(task, columnId)}
                            onAddTag={(tagName) => handleTaskAddTag(task, tagName)}
                            availableColumns={availableColumns}
                            availableTags={availableTags}
                            editingTaskId={editingTaskId}
                            setEditingTaskId={setEditingTaskId}
                            accentColor={accentColor}
                            isMinimalDesign={isMinimalDesign}
                            isDarkMode={isDarkMode}
                            multiSelectMode={multiSelectMode}
                            onTaskClick={(event) => handleTaskClick(task, event)}
                          />
                        </SwipeableTaskCard>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </MobilePullToRefresh>
      </div>

      {/* Modals */}
      <MobileSnackbar
        open={snackbarOpen}
        message={t('actions.archived', { defaultValue: 'Archiviert' })}
        onAction={() => {
          if (lastArchivedTask) {
            // move back to inbox
            dispatch({ type: 'UPDATE_TASK', payload: { ...lastArchivedTask, columnId: 'inbox' } });
          }
          setSnackbarOpen(false);
        }}
        onClose={() => setSnackbarOpen(false)}
      />
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={() => setShowSmartTaskModal(false)}
        placeholder={inboxView.placeholders.newTask({ defaultValue: 'Neue Aufgabe für Inbox erstellen...' })}
      />

      {selectedTaskForModal && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskForModal(null);
            setModalTaskIndex(-1);
            setModalNavDirection(null);
          }}
          // Always pass the freshest task instance from global state (so pinning updates instantly)
          task={(state.tasks.find(t => t.id === selectedTaskForModal.id) as any) || selectedTaskForModal}
          onSaved={handleTaskSaved}
          onNavigatePrev={modalTaskIndex > 0 ? navigatePrevTask : undefined}
          onNavigateNext={modalTaskIndex >= 0 && modalTaskIndex < inboxTasks.length - 1 ? navigateNextTask : undefined}
          shouldCloseOnSave={false}
          navDirection={modalNavDirection}
        />
      )}

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => {
          setShowDatePicker(false);
          setSelectedTaskForDate(null);
        }}
        onSelectDate={handleDateAssign}
        availableColumns={availableColumns}
        title={t('titles.assign_task_date')}
        allowAnyDate={true}
      />

      <ProjectColumnSelector
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setSelectedTaskForProject(null);
        }}
        onSelect={handleProjectAssign}
        taskId={selectedTaskForProject?.id}
        currentProjectId={selectedTaskForProject?.columnId?.startsWith('project-') ? selectedTaskForProject.columnId : undefined}
        currentColumnId={selectedTaskForProject?.kanbanColumnId}
      />

      {/* Pin Column Picker Modal */}
      {showPinPicker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 max-h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PinIcon className="w-5 h-5" style={{ color: accentColor }} />
                Pin-Spalte wählen
              </h3>
            </div>
            <div className="p-2 max-h-[40vh] overflow-y-auto">
              {state.pinColumns.map(pinColumn => (
                <button
                  key={pinColumn.id}
                  onClick={() => handlePinAssign(pinColumn.id)}
                  className={`w-full px-4 py-3 text-left rounded-lg transition-colors flex items-center gap-3 ${
                    selectedTaskForPin?.pinColumnId === pinColumn.id
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <PinIcon 
                    className="w-4 h-4 flex-shrink-0" 
                    style={{ color: selectedTaskForPin?.pinColumnId === pinColumn.id ? accentColor : undefined }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {pinColumn.title}
                  </span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowPinPicker(false);
                  setSelectedTaskForPin(null);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
                    title={inboxView.tooltips.deleteTasks()}
                  message={inboxView.deleteConfirmation.multiple(selectedTasks.size)}
        simple={true}
      />

    </div>
  );
}

// Simple InboxTaskCard component
interface InboxTaskCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDateSelect: () => void;
  onProjectSelect: () => void;
  onPinSelect: () => void;
  onAssignToColumn: (columnId: string) => void;
  onAddTag: (tagName: string) => void;
  availableColumns: Column[];
  availableTags: any[];
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  accentColor: string;
  isMinimalDesign: boolean;
  isDarkMode: boolean;
  multiSelectMode: boolean;
  onTaskClick: (event: React.MouseEvent) => void;
}

function InboxTaskCard({ 
  task, 
  isSelected, 
  onSelect, 
  onEdit,
  onDateSelect,
  onProjectSelect,
  onPinSelect,
  onAssignToColumn, 
  onAddTag, 
  availableColumns, 
  availableTags,
  editingTaskId,
  setEditingTaskId,
  accentColor,
  isMinimalDesign,
  isDarkMode,
  multiSelectMode,
  onTaskClick
}: InboxTaskCardProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const { actions, inboxView } = useAppTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const priorityButtonRef = React.useRef<HTMLButtonElement>(null);

  // Handle priority change
  const handlePriorityChange = (priority: 'none' | 'low' | 'medium' | 'high') => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        priority,
        updatedAt: new Date().toISOString()
      }
    });
    setShowPriorityPopup(false);
  };

  // Close priority popup when clicking outside
  useEffect(() => {
    if (!showPriorityPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is inside the popup container (which includes the button)
      const popupContainer = priorityButtonRef.current?.parentElement;
      if (popupContainer && !popupContainer.contains(e.target as Node)) {
        setShowPriorityPopup(false);
      }
    };
    // Use setTimeout to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPriorityPopup]);

  // Handle context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPriorityPopup(false); // Close priority popup when context menu opens
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleComplete = () => {
    // If task is being completed, archive it directly
    if (!task.completed) {
      dispatch({
        type: 'ARCHIVE_TASK',
        payload: task.id
      });
    } else {
      // If task is already completed (unchecking), just toggle completion
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: false }
      });
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    dispatch({
      type: 'DELETE_TASK',
      payload: task.id
    });
    setShowDeleteModal(false);
  };

  const handleStartEdit = () => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() !== task.title) {
      const parseResult = parseTaskInput(editTitle);
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          ...parseResult,
          updatedAt: new Date().toISOString()
        }
      });
    }
    setEditingTaskId(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle(task.title);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const [isHovered, setIsHovered] = useState(false);

  // Check if this is the onboarding sample task
  const isOnboardingSampleTask = task.id === 'onboarding-sample-task';

  return (
    <>
    <div 
      data-task-id={task.id}
      data-onboarding-task-card={isOnboardingSampleTask ? 'true' : undefined}
      className="group rounded-xl transition-all duration-200 cursor-pointer backdrop-blur-2xl"
      style={{
        // Dark mode: use much darker glass so text is readable over backgrounds
        background: isDarkMode
            ? 'rgba(17, 24, 39, 0.75)'
            : '#FFFFFF',
        borderWidth: isSelected ? '2px' : '1px',
        borderStyle: 'solid',
        borderColor: isSelected
          ? accentColor
          : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#E5E7EB'),
        boxShadow: isSelected
          ? (isDarkMode ? '0 10px 36px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.2)')
          : (isDarkMode ? '0 6px 20px rgba(0, 0, 0, 0.45)' : '0 2px 8px rgba(0, 0, 0, 0.1)')
      }}
      onClick={onTaskClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-4 py-3">
        <div className="flex items-center space-x-3">
          {/* Selection indicator removed; selection is now highlighted by background color like Things3 */}

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {false && editingTaskId === task.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveEdit}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-white/30 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 backdrop-blur-xl"
                style={{
                  background: isDarkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                  textShadow: 'none',
                  '--tw-ring-color': `${accentColor}66`
                } as React.CSSProperties}
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-2">
                <span 
                  className={`flex-1 text-sm font-medium ${
                    task.completed 
                      ? `line-through ${isMinimalDesign ? 'text-gray-400 dark:text-gray-500' : (isDarkMode ? `isDarkMode ? (isDarkMode ? 'text-white/70' : 'text-gray-70') : 'text-gray-700'` : 'text-gray-500')}` 
                      : isMinimalDesign ? 'text-black dark:text-white' : (isDarkMode ? `isDarkMode ? 'text-white' : 'text-gray-900'` : 'text-gray-900')
                  }`}
                  style={{ textShadow: 'none' }}
                  
                >
                  {task.title}
                </span>
                {/* Priority Badge - display only, not clickable */}
                {task.priority && task.priority !== 'none' && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-xl"
                    style={{
                      background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.8)' :
                                 task.priority === 'medium' ? 'rgba(245, 158, 11, 0.8)' :
                                 'rgba(34, 197, 94, 0.8)',
                      color: 'white',
                      textShadow: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {t(`tasks.priority.${task.priority}`)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Complete Icon - Erscheint nur bei Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleComplete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-lg backdrop-blur-xl border border-white/20 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{
              background: task.completed 
                ? 'rgba(34, 197, 94, 0.8)' 
                : 'rgba(255, 255, 255, 0.1)',
              color: task.completed ? 'white' : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgb(17, 24, 39)')
            }}
            title="Aufgabe abhaken"
          >
            <Check className="w-4 h-4" />
          </button>

          {/* Actions - Icons light up permanently when set */}
          <div 
            className={`flex items-center space-x-2 ${isOnboardingSampleTask ? 'onboarding-pulse-icons' : ''}`}
            data-onboarding-task-icons={isOnboardingSampleTask ? 'true' : undefined}
          >
            {/* Priority button - always visible if priority set, otherwise on hover */}
            <button
              ref={priorityButtonRef}
              data-task-icon="priority"
              onClick={(e) => {
                e.stopPropagation();
                setShowPriorityPopup(!showPriorityPopup);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-200 hover:scale-110 ${
                (task.priority && task.priority !== 'none') || isOnboardingSampleTask
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ 
                background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                           task.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' :
                           task.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' :
                           'rgba(255, 255, 255, 0.1)',
                borderColor: task.priority === 'high' ? 'rgb(239, 68, 68)' :
                            task.priority === 'medium' ? 'rgb(245, 158, 11)' :
                            task.priority === 'low' ? 'rgb(34, 197, 94)' :
                            'rgba(255, 255, 255, 0.2)',
                color: task.priority === 'high' ? 'rgb(239, 68, 68)' :
                      task.priority === 'medium' ? 'rgb(245, 158, 11)' :
                      task.priority === 'low' ? 'rgb(34, 197, 94)' :
                      (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgb(17, 24, 39)')
              }}
              title="Priorität ändern"
            >
              <Flag className="w-4 h-4" />
            </button>
            {/* Date button - always visible if date set, otherwise on hover */}
            <button
              data-task-icon="date"
              onClick={(e) => {
                e.stopPropagation();
                onDateSelect();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-200 hover:scale-110 ${
                task.reminderDate || isOnboardingSampleTask
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ 
                background: task.reminderDate ? `${accentColor}20` : 'rgba(255, 255, 255, 0.1)',
                borderColor: task.reminderDate ? accentColor : 'rgba(255, 255, 255, 0.2)',
                color: task.reminderDate ? accentColor : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgb(17, 24, 39)')
              }}
              title="Termin setzen"
            >
              <Calendar className="w-4 h-4" />
            </button>
            {/* Project button - always visible if project set, otherwise on hover */}
            <button
              data-task-icon="project"
              onClick={(e) => {
                e.stopPropagation();
                onProjectSelect();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-200 hover:scale-110 ${
                task.projectId || isOnboardingSampleTask
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ 
                background: task.projectId ? `${accentColor}20` : 'rgba(255, 255, 255, 0.1)',
                borderColor: task.projectId ? accentColor : 'rgba(255, 255, 255, 0.2)',
                color: task.projectId ? accentColor : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgb(17, 24, 39)')
              }}
              title="Zu Projekt zuweisen"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            {/* Pin button - always visible if pinned, otherwise on hover */}
            <button
              data-task-icon="pin"
              onClick={(e) => {
                e.stopPropagation();
                if (task.pinColumnId) {
                  // Unpin
                  dispatch({
                    type: 'UNPIN_TASK',
                    payload: task.id
                  });
                } else {
                  // Open pin picker to select column
                  onPinSelect();
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all duration-200 hover:scale-110 ${
                task.pinColumnId || isOnboardingSampleTask
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ 
                background: task.pinColumnId ? `${accentColor}20` : 'rgba(255, 255, 255, 0.1)',
                borderColor: task.pinColumnId ? accentColor : 'rgba(255, 255, 255, 0.2)',
                color: task.pinColumnId ? accentColor : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgb(17, 24, 39)')
              }}
              title={task.pinColumnId ? "Entpinnen" : "Pin-Spalte wählen"}
            >
              <PinIcon className="w-4 h-4" />
            </button>
            {/* Delete button - only on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg backdrop-blur-xl border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100 ${isDarkMode ? 'text-white/70 hover:text-red-400' : 'text-gray-900 hover:text-red-600'}`}
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                              title={actions.delete()}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
                    title={inboxView.tooltips.deleteTask()}
        message={`Möchten Sie die Aufgabe "${task.title}" wirklich löschen?`}
        simple={true}
      />
    </div>

    {/* Priority Popup - rendered via Portal to ensure it's on top of everything */}
    {showPriorityPopup && priorityButtonRef.current && createPortal(
      <div 
        className="fixed z-[99999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
        style={{ 
          left: priorityButtonRef.current.getBoundingClientRect().right - 140,
          top: priorityButtonRef.current.getBoundingClientRect().bottom + 4
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {[
          { value: 'high', label: t('tasks.priority.high'), color: 'rgb(239, 68, 68)' },
          { value: 'medium', label: t('tasks.priority.medium'), color: 'rgb(245, 158, 11)' },
          { value: 'low', label: t('tasks.priority.low'), color: 'rgb(34, 197, 94)' },
          { value: 'none', label: t('tasks.priority.none') || 'Keine', color: 'rgb(156, 163, 175)' }
        ].map((prio) => (
          <button
            key={prio.value}
            onClick={(e) => {
              e.stopPropagation();
              handlePriorityChange(prio.value as any);
            }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
              task.priority === prio.value || (!task.priority && prio.value === 'none') ? 'bg-gray-50 dark:bg-gray-700/50' : ''
            }`}
          >
            <Flag className="w-4 h-4" style={{ color: prio.color }} />
            <span className="text-gray-700 dark:text-gray-300">{prio.label}</span>
            {(task.priority === prio.value || (!task.priority && prio.value === 'none')) && (
              <Check className="w-4 h-4 ml-auto" style={{ color: accentColor }} />
            )}
          </button>
        ))}
      </div>,
      document.body
    )}

    {/* Context Menu - rendered via Portal to ensure it's on top of everything */}
    {contextMenu && createPortal(
      <div 
        className="fixed z-[99999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            handleComplete();
            setContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>{task.completed ? 'Als offen markieren' : 'Aufgabe abhaken'}</span>
        </button>
        <button
          onClick={() => {
            if (task.reminderDate) {
              // Remove date
              dispatch({
                type: 'UPDATE_TASK',
                payload: {
                  ...task,
                  reminderDate: undefined,
                  columnId: 'inbox', // Move back to inbox when date is removed
                  updatedAt: new Date().toISOString()
                }
              });
            } else {
              // Set date
              onDateSelect();
            }
            setContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>{task.reminderDate ? 'Datum entfernen' : 'Termin setzen'}</span>
        </button>
        {/* Priority submenu in context menu */}
        <div className="relative group/priority">
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4" style={{ 
                color: task.priority === 'high' ? 'rgb(239, 68, 68)' :
                       task.priority === 'medium' ? 'rgb(245, 158, 11)' :
                       task.priority === 'low' ? 'rgb(34, 197, 94)' : undefined
              }} />
              <span>{t('task_modal.priority')}</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* Priority submenu */}
          <div className="absolute left-full top-0 ml-1 hidden group-hover/priority:block bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
            {[
              { value: 'high', label: t('tasks.priority.high'), color: 'rgb(239, 68, 68)' },
              { value: 'medium', label: t('tasks.priority.medium'), color: 'rgb(245, 158, 11)' },
              { value: 'low', label: t('tasks.priority.low'), color: 'rgb(34, 197, 94)' },
              { value: 'none', label: t('tasks.priority.none') || 'Keine', color: 'rgb(156, 163, 175)' }
            ].map((prio) => (
              <button
                key={prio.value}
                onClick={() => {
                  handlePriorityChange(prio.value as any);
                  setContextMenu(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                  task.priority === prio.value || (!task.priority && prio.value === 'none') ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                }`}
              >
                <Flag className="w-4 h-4" style={{ color: prio.color }} />
                <span className="text-gray-700 dark:text-gray-300">{prio.label}</span>
                {(task.priority === prio.value || (!task.priority && prio.value === 'none')) && (
                  <Check className="w-4 h-4 ml-auto" style={{ color: accentColor }} />
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            onProjectSelect();
            setContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Zu Projekt zuweisen</span>
        </button>
        <button
          onClick={() => {
            if (task.pinColumnId) {
              // Unpin
              dispatch({
                type: 'UNPIN_TASK',
                payload: task.id
              });
            } else {
              // Open pin picker
              onPinSelect();
            }
            setContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <PinIcon className="w-4 h-4" />
          <span>{task.pinColumnId ? 'Entpinnen' : 'Pin-Spalte wählen'}</span>
        </button>
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        <button
          onClick={() => {
            handleDelete();
            setContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Löschen</span>
        </button>
      </div>,
      document.body
    )}
    </>
  );
} 
