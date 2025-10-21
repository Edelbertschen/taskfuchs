import React, { useState, useMemo, useEffect } from 'react';
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

  const openInboxTaskAt = (idx: number) => {
    const flat = inboxTasks; // already sorted newest first
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

  // Auto-advance after save
  const handleTaskSaved = (updated: Task) => {
    // If task moved out of inbox, recompute current index against updated list
    const flat = state.tasks
      .filter(t => t.columnId === 'inbox')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (flat.length === 0) {
      setShowTaskModal(false);
      setSelectedTaskForModal(null);
      setModalTaskIndex(-1);
      return;
    }
    // Determine next index based on current direction or default forward
    const currentId = updated.id;
    const currentIdx = flat.findIndex(t => t.id === currentId);
    const baseNext = currentIdx >= 0 ? currentIdx + 1 : modalTaskIndex + 1;
    const nextIdx = Math.min(baseNext, flat.length - 1);
    // Advance if there is another task; else close
    if (nextIdx > (currentIdx >= 0 ? currentIdx : modalTaskIndex) && nextIdx < flat.length) {
      setModalNavDirection('next');
      setSelectedTaskForModal(flat[nextIdx]);
      setModalTaskIndex(nextIdx);
      // keep modal open
    } else {
      setShowTaskModal(false);
      setSelectedTaskForModal(null);
      setModalTaskIndex(-1);
    }
  };
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<Task | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedTaskForProject, setSelectedTaskForProject] = useState<Task | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
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

  // Get inbox tasks
  const inboxTasks = state.tasks
    .filter(task => task.columnId === 'inbox')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
  // Count for header badge
  const inboxCount = selectedDateFilter
    ? filteredGroups.reduce((acc, group) => acc + group.tasks.length, 0)
    : inboxTasks.length;

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
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...selectedTaskForDate, columnId }
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
      let updatePayload = {
        ...selectedTaskForProject,
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
      
      setSelectedTaskForProject(null);
    }
  };

  const handleAssignTaskToPin = (task: Task, pinColumnId: string) => {
    if (!pinColumnId) return;
    dispatch({ type: 'ASSIGN_TASK_TO_PIN', payload: { taskId: task.id, pinColumnId } });
  };

  // Get background styles: rely on global App background for custom image to ensure consistency
  const isDarkMode = document.documentElement.classList.contains('dark');
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
      
      {/* Background Overlay */}
      {!isMinimalDesign && state.preferences.backgroundEffects?.overlay !== false && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: `rgba(0, 0, 0, ${state.preferences.backgroundEffects?.overlayOpacity || 0.4})`
          }}
        />
      )}
      
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
        className={`absolute top-0 left-0 bottom-0 w-full sm:w-80 flex flex-col overflow-hidden z-20 ${
          isMinimalDesign
            ? 'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'
            : 'backdrop-blur-xl bg-black/50 border-r border-white/15'
        }`}
        style={{
          boxShadow: isMinimalDesign 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Header */}
        <div 
          className={`relative flex items-center px-4 ${
            isMinimalDesign
              ? 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              : 'border-b border-white/15 bg-transparent'
          }`}
          style={{ 
            height: '68px',
            minHeight: '68px',
            maxHeight: '68px',
            boxSizing: 'border-box'
          }}
        >
          {/* Main header content - centered */}
          <div className="flex items-center justify-between w-full">
            <h1 className={`text-lg font-semibold flex items-center space-x-2 ${isMinimalDesign ? 'text-black dark:text-white' : 'text-white'}`}
                style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)', lineHeight: '1.5' }}>
              <Inbox className="w-5 h-5" style={{ color: accentColor }} />
              <span>{inboxView.title()}</span>
              {inboxCount > 0 && (
                <span
                  className={`${isMinimalDesign ? 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600' : 'text-white/90 bg-white/10 border-white/20'} inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full border`}
                  style={{ lineHeight: '1' }}
                >
                  {inboxCount}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              {/* Open top inbox task */}
              <button
                onClick={openFirstInboxTask}
                className={`px-3 py-2 rounded-md transition-all duration-200 text-white shadow-sm ${
                  isMinimalDesign 
                    ? 'border border-gray-200 dark:border-gray-600' 
                    : 'backdrop-blur-xl border border-white/20'
                }`}
                style={{ 
                  backgroundColor: `${accentColor}E6`,
                  boxShadow: isMinimalDesign 
                    ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${accentColor}E6`;
                }}
                title={t('inbox_view.open_first_task', { defaultValue: 'Oberste Aufgabe öffnen' })}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              {/* Create new task */}
              <button
                onClick={() => setShowSmartTaskModal(true)}
                className={`p-2 rounded-md transition-colors duration-200 text-white shadow-sm ${
                  isMinimalDesign 
                    ? 'border border-gray-200 dark:border-gray-600' 
                    : 'backdrop-blur-xl border border-white/20'
                }`}
                style={{ 
                  backgroundColor: `${accentColor}E6`,
                  boxShadow: isMinimalDesign 
                    ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${accentColor}E6`;
                }}
                title={inboxView.newTaskTooltip()}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>


        </div>

        {/* Date Filter List */}
        <div className="flex-1 overflow-y-auto sidebar-content">
          <div className={`border-b ${
            isMinimalDesign
              ? 'border-gray-200 dark:border-gray-700'
              : 'border-white/15'
          }`}>
            <div className={`px-4 py-3 ${
              isMinimalDesign
                ? 'bg-gray-50 dark:bg-gray-800'
                : 'bg-white/10'
            }`}>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className={`text-sm font-medium flex items-center ${isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`}
                    style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5', minHeight: '20px' }}>
                  {inboxView.filterByDate()}
                </h2>
              </div>
            </div>
            
            {/* All Tasks Option */}
            <div
              onClick={() => setSelectedDateFilter(null)}
              className={`p-4 cursor-pointer transition-colors relative ${
                isMinimalDesign
                  ? 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                  <List className={`w-4 h-4 flex-shrink-0 ${isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}`} />
                  <h3 className={`font-medium text-sm flex items-center ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`}
                      style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5', minHeight: '20px' }}>
                    {inboxView.allTasks()}
                  </h3>
                </div>
                <span className={`text-sm ml-2 font-medium ${isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/60'}`}
                      style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5' }}>
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
                    ? 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                    <Calendar className={`w-4 h-4 flex-shrink-0 ${isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'}`} />
                                    <h3 className={`font-medium text-sm truncate ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`}
                    style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5' }}>
                      {dateOption.label}
                    </h3>
                  </div>
                  <span className={`text-sm ml-2 font-medium ${isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-white/60'}`}
                        style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5' }}>
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
                <span style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
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
            ? 'bg-white dark:bg-[#111827]'
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
        <div className="p-6">
          {/* Top Right Add Button */}
          <div className="mb-6 flex items-center justify-end">
            <button
              onClick={() => setShowSmartTaskModal(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 ${isMinimalDesign ? 'text-white' : 'text-white backdrop-blur-xl border border-white/20'}`}
              style={{ 
                backgroundColor: `${accentColor}E6`,
                boxShadow: isMinimalDesign ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.15)',
                textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)'
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
          
          {/* Actions Bar */}
          <div className="flex items-center justify-end mb-6 space-x-2">
            {/* Multi-Select Mode Toggle */}
            <button
              onClick={toggleMultiSelectMode}
              className={`transition-all duration-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                multiSelectMode 
                  ? isMinimalDesign 
                    ? 'text-white shadow-md' 
                    : 'text-white backdrop-blur-xl border border-white/20'
                  : isMinimalDesign 
                    ? 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700' 
                    : 'text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-xl'
              }`}
              style={{ 
                backgroundColor: multiSelectMode ? `${accentColor}E6` : 'transparent',
                textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', 
                lineHeight: '1.5', 
                minHeight: '32px' 
              }}
              title="Mehrfachauswahl (STRG/CMD + Klick)"
            >
              <CheckSquare className={`w-4 h-4 ${multiSelectMode ? 'fill-current' : ''}`} />
              <span>{multiSelectMode ? t('inbox_view.multiSelectMode', { defaultValue: 'Multi-select' }) : t('inbox_view.select', { defaultValue: 'Select' })}</span>
            </button>

            {/* Select All - only show when multi-select is active */}
            {multiSelectMode && (
              <button
                onClick={handleSelectAll}
                className={`transition-colors px-3 py-2 rounded-lg text-sm font-medium flex items-center ${isMinimalDesign ? 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-xl'}`}
                style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5', minHeight: '32px' }}
              >
                {selectedTasks.size === inboxTasks.length ? t('inbox_view.deselect_all') : t('inbox_view.select_all')}
              </button>
            )}
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
                                  <span className={`text-sm font-medium ${isMinimalDesign ? 'text-gray-700 dark:text-gray-200' : 'text-white/80'}`}
                   style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)', lineHeight: '1.5' }}>
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
                      <div className="absolute left-0 top-full mt-2 z-30 animate-in slide-in-from-top-2 duration-200">
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
                      <div className="absolute right-0 top-full mt-2 z-30 animate-in slide-in-from-top-2 duration-200">
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
                      <div className="absolute right-0 top-full mt-2 z-30 animate-in slide-in-from-top-2 duration-200">
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
                    : 'bg-white/5 border border-white/10 shadow-[0_16px_40px_rgba(31,38,135,0.2)] backdrop-blur-3xl before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none relative overflow-hidden'
                }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    isMinimalDesign
                      ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      : 'bg-white/15 border border-white/25 backdrop-blur-xl shadow-lg'
                  } relative z-10`}>
                    <Archive className={`w-8 h-8 ${
                      isMinimalDesign
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-white'
                    }`} />
                </div>
                  <h3 className={`text-lg font-semibold mb-2 relative z-10 ${
                    isMinimalDesign
                      ? 'text-gray-900 dark:text-white'
                      : 'text-white drop-shadow-lg'
                  }`}>
                  {inboxView.emptyState.title()}
                </h3>
                  <p className={`mb-6 relative z-10 ${
                    isMinimalDesign
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-white/90 drop-shadow-lg'
                  }`}>
                  {inboxView.emptyState.description()}
                </p>
                <button
                  onClick={() => setShowSmartTaskModal(true)}
                    className="text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:scale-105 backdrop-blur-xl border border-white/20 relative z-10"
                    style={{ 
                      backgroundColor: `${accentColor}E6`,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
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
                      <h2 className={`text-lg font-semibold mb-3 flex items-center ${isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-white'}`}
                          style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)', lineHeight: '1.5', minHeight: '28px' }}>
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
                            onAssignToColumn={(columnId) => handleTaskAssign(task, columnId)}
                            onAddTag={(tagName) => handleTaskAddTag(task, tagName)}
                            availableColumns={availableColumns}
                            availableTags={availableTags}
                            editingTaskId={editingTaskId}
                            setEditingTaskId={setEditingTaskId}
                            accentColor={accentColor}
                            isMinimalDesign={isMinimalDesign}
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
  onAssignToColumn: (columnId: string) => void;
  onAddTag: (tagName: string) => void;
  availableColumns: Column[];
  availableTags: any[];
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  accentColor: string;
  isMinimalDesign: boolean;
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
  onAssignToColumn, 
  onAddTag, 
  availableColumns, 
  availableTags,
  editingTaskId,
  setEditingTaskId,
  accentColor,
  isMinimalDesign,
  multiSelectMode,
  onTaskClick
}: InboxTaskCardProps) {
  const { state, dispatch } = useApp();
  const { actions, inboxView } = useAppTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleComplete = () => {
    // Stop timer if it's running for this task
    if (state.activeTimer && state.activeTimer.taskId === task.id) {
      dispatch({
        type: 'STOP_TIMER'
      });
    }
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, completed: !task.completed }
    });
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

  return (
    <div 
      className="group rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-2xl hover:scale-[1.02]"
      style={{
        // Dark mode: use much darker glass so text is readable over backgrounds
        background: isSelected
          ? `${accentColor}26`
          : (document.documentElement.classList.contains('dark')
              ? 'rgba(17, 24, 39, 0.75)'
              : 'rgba(255, 255, 255, 0.15)'),
        borderColor: isSelected
          ? `${accentColor}66`
          : (document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)'),
        boxShadow: isSelected
          ? (document.documentElement.classList.contains('dark') ? '0 10px 36px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.2)')
          : (document.documentElement.classList.contains('dark') ? '0 6px 20px rgba(0, 0, 0, 0.45)' : '0 4px 16px rgba(0, 0, 0, 0.1)')
      }}
      onClick={onTaskClick}
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
                  background: document.documentElement.classList.contains('dark') ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                  '--tw-ring-color': `${accentColor}66`
                } as React.CSSProperties}
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-2">
                <span 
                  className={`flex-1 text-sm font-medium ${
                    task.completed 
                      ? `line-through ${isMinimalDesign ? 'text-gray-400 dark:text-gray-500' : 'text-white/70'}` 
                      : isMinimalDesign ? 'text-black dark:text-white' : (document.documentElement.classList.contains('dark') ? 'text-white' : 'text-white')
                  }`}
                  style={{ textShadow: isMinimalDesign ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)' }}
                  
                >
                  {task.title}
                </span>
                {task.priority && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-xl"
                    style={{
                      background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.8)' :
                                 task.priority === 'medium' ? 'rgba(245, 158, 11, 0.8)' :
                                 'rgba(34, 197, 94, 0.8)',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {task.priority}
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
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-lg backdrop-blur-xl border border-white/20 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{
              background: task.completed 
                ? 'rgba(34, 197, 94, 0.8)' 
                : 'rgba(255, 255, 255, 0.1)',
              color: 'white'
            }}
            title="Aufgabe abhaken"
          >
            <Check className="w-4 h-4" />
          </button>

          {/* Actions */}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDateSelect();
              }}
              className="p-2 text-white/70 hover:text-white rounded-lg backdrop-blur-xl border border-white/20 transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              title="Termin setzen"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProjectSelect();
              }}
              className="p-2 text-white/70 hover:text-white rounded-lg backdrop-blur-xl border border-white/20 transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              title="Zu Projekt zuweisen"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 text-white/70 hover:text-red-400 rounded-lg backdrop-blur-xl border border-white/20 transition-all duration-200 hover:scale-110"
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
  );
} 
