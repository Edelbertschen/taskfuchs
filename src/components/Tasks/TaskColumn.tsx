import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar, Clock, Edit2, Check, X, Sparkles, Trash2, Focus, Archive, Download, FileText, FileDown, Settings, GripVertical, Plus, MoreHorizontal } from 'lucide-react';
import type { Column, Task } from '../../types';
import type { OutlookEmail } from '../../types/email';
import { TaskCard } from './TaskCard';
import { EventCard, getEventDurationMinutes } from './EventCard';
import { DropIndicator } from './DropIndicator';
import { SmartTaskModal } from './SmartTaskModal';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { ProjectManager } from '../Projects/ProjectManager';
import { ColumnContextMenu } from './ColumnContextMenu';
import { format, isToday } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { OptimizedTaskList } from './OptimizedTaskList';
import { EMAIL_DRAG_TYPE } from '../Email/EmailItem';

// Top Drop Zone component for inserting tasks at position 0
function TopDropZone({ columnId, accentColor }: { columnId: string; accentColor: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${columnId}-top`,
    data: { type: 'column-top', columnId }
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-lg mb-2 ${
        isOver 
          ? 'h-16 border-2 border-dashed' 
          : 'h-2'
      }`}
      style={{ 
        borderColor: isOver ? `${accentColor}60` : 'transparent',
        backgroundColor: isOver ? `${accentColor}10` : 'transparent',
      }}
    >
      {isOver && (
        <div className="h-full flex items-center justify-center">
          <span className="text-xs font-medium" style={{ color: accentColor }}>
            An oberster Position einfügen
          </span>
        </div>
      )}
    </div>
  );
}

interface TaskColumnProps {
  column: Column;
  tasks: Task[];
  events?: any[];
  isFocusMode?: boolean;
  onFocusColumn?: (columnId: string) => void;
  onSmartTaskAdd?: (column: Column) => void;
  showCompletedTasks?: boolean;
  onToggleEventVisibility?: (eventId: string) => void;
  onToggleEventCollapse?: (eventId: string) => void;
  activeTask?: Task | null;
  activeColumn?: any | null;
  overId?: string | null;
  // Project-specific props
  isProjectColumn?: boolean;
  // External editing state management props
  isEditing?: boolean;
  editingTitle?: string;
  onStartEdit?: (columnId: string, currentTitle: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (columnId: string, title: string) => void;
  onTitleChange?: (columnId: string, title: string) => void;
  // Project context props
  projectId?: string;
  kanbanColumnId?: string;
  // Drag & drop props
  dragListeners?: any;
  isDragging?: boolean;
  // External delete handler (for Pins, etc.)
  onDeleteColumn?: (columnId: string) => void;
  // Array of task IDs that should be marked as deadline reminders
  deadlineReminderTaskIds?: string[];
  // Pin column flag
  isPinColumn?: boolean;
  // Column manager handler
  onColumnManager?: () => void;
  // Email drag-and-drop handler (position is the index where the task should be inserted)
  onEmailDrop?: (email: OutlookEmail, column: Column, position: number) => void;
}

const TaskColumn = React.memo(({
  column,
  tasks,
  events = [],
  isFocusMode = false,
  onFocusColumn,
  onSmartTaskAdd,
  showCompletedTasks = true,
  onToggleEventVisibility,
  onToggleEventCollapse,
  activeTask,
  activeColumn,
  overId,
  isProjectColumn = false,
  // External editing state management props
  isEditing: externalIsEditing,
  editingTitle: externalEditingTitle,
  onStartEdit: externalOnStartEdit,
  onCancelEdit: externalOnCancelEdit,
  onSaveEdit: externalOnSaveEdit,
  onTitleChange: externalOnTitleChange,
  // Project context props
  projectId,
  kanbanColumnId,
  // Drag & drop props
  dragListeners,
  isDragging,
  // External delete handler
  onDeleteColumn: externalOnDeleteColumn,
  // Deadline reminder task IDs
  deadlineReminderTaskIds = [],
  // Pin column flag
  isPinColumn = false,
  // Column manager handler
  onColumnManager,
  // Email drag-and-drop handler
  onEmailDrop
}: TaskColumnProps) => {
  const { state, dispatch } = useApp();
  const { actions, forms, titles, messages, taskColumn } = useAppTranslation();
  const taskColumnAny = taskColumn as any;
  const { i18n, t } = useTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Reactive dark mode check
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveModalData, setArchiveModalData] = useState<{
    completedCount: number;
    columnTitle: string;
  } | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  // Removed header day progress bar
  
  // Email drag-and-drop state
  const [isEmailDragOver, setIsEmailDragOver] = useState(false);
  const [emailDropIndex, setEmailDropIndex] = useState<number>(-1);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Email drag-and-drop handlers with position tracking
  const handleEmailDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(EMAIL_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsEmailDragOver(true);
      
      // Calculate drop position based on cursor Y position
      if (taskListRef.current) {
        const taskElements = taskListRef.current.querySelectorAll('[data-task-index]');
        const cursorY = e.clientY;
        let insertIndex = tasks.length; // Default to end
        
        for (let i = 0; i < taskElements.length; i++) {
          const taskEl = taskElements[i] as HTMLElement;
          const rect = taskEl.getBoundingClientRect();
          const taskMiddle = rect.top + rect.height / 2;
          
          if (cursorY < taskMiddle) {
            insertIndex = parseInt(taskEl.dataset.taskIndex || '0', 10);
            break;
          }
        }
        
        setEmailDropIndex(insertIndex);
      }
    }
  };

  const handleEmailDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsEmailDragOver(false);
      setEmailDropIndex(-1);
    }
  };

  const handleEmailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropPosition = emailDropIndex >= 0 ? emailDropIndex : tasks.length;
    setIsEmailDragOver(false);
    setEmailDropIndex(-1);
    
    const emailData = e.dataTransfer.getData(EMAIL_DRAG_TYPE);
    if (!emailData || !onEmailDrop) return;
    
    try {
      const email: OutlookEmail = JSON.parse(emailData);
      onEmailDrop(email, column, dropPosition);
    } catch (error) {
      console.error('Failed to parse email data for drop:', error);
    }
  };
  
  // ✨ ANTI-JITTER: Stabilized overId that doesn't change rapidly when over drop zones
  const [stableOverId, setStableOverId] = useState<string | null>(null);
  const stabilizeTimeoutRef = useRef<NodeJS.Timeout>();

  // ✨ ULTRA-ANTI-FLICKER: Immediate updates for projects and pins
  useEffect(() => {
    if (stabilizeTimeoutRef.current) {
      clearTimeout(stabilizeTimeoutRef.current);
    }
    
    // For project columns and pin columns: immediate updates to prevent any flicker
    // Pin columns already provide stabilized overId from PinsView
    if (isProjectColumn || isPinColumn) {
      setStableOverId(overId);
      return;
    }
    
    // For planner columns: minimal delay
    stabilizeTimeoutRef.current = setTimeout(() => {
      setStableOverId(overId);
    }, 4); // 4ms - ultra responsive
    
    return () => {
      if (stabilizeTimeoutRef.current) {
        clearTimeout(stabilizeTimeoutRef.current);
      }
    };
  }, [overId, isProjectColumn, isPinColumn]);

  const { 
    setNodeRef, 
    isOver, 
    active 
  } = useDroppable({
    id: column.id,
    data: { 
      type: 'column', 
      columnId: column.id, 
      columnType: column.type 
    }
  });

  // Use external editing state if provided, otherwise use internal state
  const isCurrentlyEditing = externalIsEditing !== undefined ? externalIsEditing : isEditing;
  const currentEditTitle = externalEditingTitle !== undefined ? externalEditingTitle : editTitle;

  // Update editTitle when column title changes
  useEffect(() => {
    setEditTitle(column.title);
  }, [column.title]);



  const totalEstimatedTime = tasks.reduce((total, task) => {
    // Only include non-completed tasks in time estimation
    if (task.completed) return total;
    
    const taskTime = task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : 0;
    const subtaskTime = task.subtasks.reduce((subTotal, subtask) => 
      subTotal + (subtask.completed ? 0 : (subtask.estimatedTime || 0)), 0
    );
    return total + taskTime + subtaskTime;
  }, 0);

  // Calculate total event time (only for visible events)
  const totalEventTime = events.reduce((total, event) => {
    const hiddenEvents = (state.preferences.calendars as any)?.hiddenEvents || [];
    if (hiddenEvents.includes(event.id)) return total; // Skip hidden events
    
    return total + getEventDurationMinutes(event);
  }, 0);

  // Combine task and event times
  const totalColumnTime = totalEstimatedTime + totalEventTime;

  const totalTrackedTime = tasks.reduce((total, task) => {
    const taskTime = task.trackedTime || 0;
    const subtaskTime = task.subtasks.reduce((subTotal, subtask) => 
      subTotal + (subtask.trackedTime || 0), 0
    );
    return total + taskTime + subtaskTime;
  }, 0);

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
      return `${sign}${hours}h ${mins}m`;
    }
    return `${sign}${mins}m`;
  };

  const getColumnTitle = () => {
    // Check if this is a date column
    const isDateColumn = column.id.startsWith('date-');
    if (!isDateColumn) {
      return {
        title: column.title,
        dayName: '',
        dateString: '',
        isCurrentDay: false,
        isDateColumn: false
      };
    }

    try {
      const dateString = column.id.replace('date-', '');
      const date = new Date(dateString + 'T00:00:00');
      
      if (isNaN(date.getTime())) {
        return {
          title: column.title,
          dayName: '',
          dateString: '',
          isCurrentDay: false,
          isDateColumn: false
        };
      }

      const dayName = format(date, 'EEEE', { locale: i18n.language === 'en' ? undefined : de });
      const formattedDate = format(date, 'dd.MM.', { locale: i18n.language === 'en' ? undefined : de });
      const isCurrentDay = isToday(date);

      return {
        title: column.title,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dateString: formattedDate,
        isCurrentDay,
        isDateColumn: true
      };
    } catch (error) {
      console.error('Error parsing date from column ID:', error);
      return {
        title: column.title,
        dayName: '',
        dateString: '',
        isCurrentDay: false,
        isDateColumn: false
      };
    }
  };

  // (Progress bar removed)

  // Handler functions
  const handleSaveTitle = () => {
    const titleToSave = currentEditTitle.trim();
    if (titleToSave && titleToSave !== column.title) {
      if (externalOnSaveEdit) {
        externalOnSaveEdit(column.id, titleToSave);
      } else {
        if (isProjectColumn) {
          dispatch({
            type: 'UPDATE_PROJECT_KANBAN_COLUMN',
            payload: {
              columnId: column.id,
              title: titleToSave
            }
          });
        } else {
          dispatch({
            type: 'UPDATE_COLUMN',
            payload: { ...column, title: titleToSave }
          });
        }
        setIsEditing(false);
      }
    } else if (!externalOnSaveEdit) {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    if (externalOnCancelEdit) {
      externalOnCancelEdit();
    } else {
      setEditTitle(column.title);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAddTask = () => {
    if (onSmartTaskAdd) {
      // Use parent's SmartTaskModal for chain input (like in ProjectKanbanBoard)
      onSmartTaskAdd(column);
    } else {
      // Use local modal for traditional behavior
    setShowSmartTaskModal(true);
    }
  };

  const handleDeleteColumn = () => {
    if (tasks.length > 0) {
      setShowDeleteModal(true);
    } else {
      confirmDeleteColumn();
    }
  };

  const confirmDeleteColumn = () => {
    if (isProjectColumn) {
      dispatch({
        type: 'DELETE_PROJECT_KANBAN_COLUMN',
        payload: column.id
      });
      setShowDeleteModal(false);
    } else {
      if (tasks.length > 0) {
        tasks.forEach((task, index) => {
          setTimeout(() => {
            dispatch({
              type: 'DELETE_TASK',
              payload: task.id
            });
          }, index * 10);
        });
      }
      
      setTimeout(() => {
        dispatch({
          type: 'DELETE_COLUMN',
          payload: column.id
        });
        setShowDeleteModal(false);
      }, tasks.length * 20);
    }
  };

  const handleFocusColumn = () => {
    if (onFocusColumn) {
      onFocusColumn(column.id);
    }
  };

  const handleArchiveCompletedTasks = () => {
    const completedTasksForArchive = tasks.filter(
      task => task.completed && !deadlineReminderTaskIds.includes(task.id)
    );
    const completedTasksCount = completedTasksForArchive.length;
    if (completedTasksCount === 0) return;
    
    setArchiveModalData({
      completedCount: completedTasksCount,
      columnTitle: column.title
    });
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    console.log('🎯 Archive Modal: OK clicked');
    console.log('📊 Archive Modal Data:', archiveModalData);
    console.log('📂 Column ID:', column.id);
    const completedTasksForArchive = tasks.filter(
      task => task.completed && !deadlineReminderTaskIds.includes(task.id)
    );
    console.log('✅ Completed tasks in column:', completedTasksForArchive);
    
    if (archiveModalData) {
      console.log('📤 Dispatching ARCHIVE_COMPLETED_TASKS_IN_COLUMN action');
      dispatch({
        type: 'ARCHIVE_COMPLETED_TASKS_IN_COLUMN',
        payload: {
          columnId: column.id,
          taskIds: completedTasksForArchive.map(task => task.id)
        }
      });
      console.log('✅ Archive action dispatched successfully');
    } else {
      console.error('❌ No archive modal data available');
    }
    
    setShowArchiveModal(false);
    setArchiveModalData(null);
    console.log('🔒 Archive modal closed');
  };

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleOpenContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleExportTasks = () => {
    const tasksToExport = tasks.filter(task => !task.completed);
    
    if (tasksToExport.length === 0) {
      alert('Keine Aufgaben zum Exportieren vorhanden.');
      return;
    }

    const csvContent = [
      'Titel,Beschreibung,Priorität,Geschätzte Zeit,Tags',
      ...tasksToExport.map(task => [
        `"${task.title}"`,
        `"${task.description || ''}"`,
        `"${task.priority || 'medium'}"`,
        `"${task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : ''}"`,
        `"${(task.tags || []).join(', ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `aufgaben-${column.title}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTasksAsPDF = () => {
    const titleInfo = getColumnTitle();
    const columnTitle = titleInfo.isDateColumn ? `${titleInfo.dayName} - ${titleInfo.dateString}` : column.title;
    
    let content = `${columnTitle}\n${'='.repeat(columnTitle.length)}\n\n`;
    content += `Aufgaben-Export vom ${format(new Date(), 'dd.MM.yyyy HH:mm')}\n\n`;
    
    if (tasks.length === 0) {
      content += 'Keine Aufgaben in dieser Spalte.\n';
    } else {
      content += `Anzahl Aufgaben: ${tasks.length}\n`;
      content += `Erledigte Aufgaben: ${tasks.filter(t => t.completed).length}\n`;
      
      if (totalColumnTime > 0) {
        content += `Gesamte Zeit (inkl. Termine): ${formatTime(totalColumnTime)}\n`;
        if (totalEstimatedTime > 0) {
          content += `  - Aufgaben: ${formatTime(totalEstimatedTime)}\n`;
        }
        if (totalEventTime > 0) {
          content += `  - Termine: ${formatTime(totalEventTime)}\n`;
        }
      }
      if (totalTrackedTime > 0) {
        content += `Gesamte getrackte Zeit: ${formatTime(totalTrackedTime)}\n`;
      }
      
      content += '\n--- AUFGABEN ---\n\n';
      
      const openTasks = tasks.filter(t => !t.completed);
      const completedTasks = tasks.filter(t => t.completed);
      
      if (openTasks.length > 0) {
        content += `OFFENE AUFGABEN (${openTasks.length}):\n`;
        openTasks.forEach((task, index) => {
          content += `${index + 1}. ${task.title}\n`;
          if (task.description) {
            content += `   Beschreibung: ${task.description}\n`;
          }
          if (task.priority !== 'medium') {
            const priorityLabel = task.priority === 'high' ? 'Hoch' : 'Niedrig';
            content += `   Priorität: ${priorityLabel}\n`;
          }
          if (task.tags.length > 0) {
            content += `   Tags: ${task.tags.join(', ')}\n`;
          }
          if (task.estimatedTime) {
            content += `   Geschätzte Zeit: ${formatTime(task.estimatedTime)}\n`;
          }
          if (task.subtasks.length > 0) {
            content += `   Unteraufgaben:\n`;
            task.subtasks.forEach(subtask => {
              content += `     ${subtask.completed ? '✓' : '○'} ${subtask.title}\n`;
            });
          }
          content += '\n';
        });
      }
      
      if (completedTasks.length > 0) {
        content += `\nERLEDIGTE AUFGABEN (${completedTasks.length}):\n`;
        completedTasks.forEach((task, index) => {
          content += `${index + 1}. ✓ ${task.title}\n`;
          if (task.description) {
            content += `   Beschreibung: ${task.description}\n`;
          }
          if (task.tags.length > 0) {
            content += `   Tags: ${task.tags.join(', ')}\n`;
          }
          if (task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(st => st.completed).length;
            content += `   Unteraufgaben: ${completedSubtasks}/${task.subtasks.length} erledigt\n`;
          }
          content += '\n';
        });
      }
    }
    
    content += `\n--- Export generiert mit TaskFuchs ---\n`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${column.title.replace(/[^a-zA-Z0-9]/g, '_')}-aufgaben.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportTasksAsCSV = () => {
    const titleInfo = getColumnTitle();
    const columnTitle = titleInfo.isDateColumn ? `${titleInfo.dayName} - ${titleInfo.dateString}` : column.title;

    let content = `Titel,Status,Priorität,Tags,Geschätzte Zeit,Gesamte Zeit,Getrackte Zeit,Beschreibung,Unteraufgaben\n`;
    content += `"${columnTitle}","Aufgaben","","","","","","",""\n`;
    content += `"","","","","","","","","\n`;

    if (tasks.length === 0) {
      content += `"Keine Aufgaben in dieser Spalte","","","","","","","",""\n`;
    } else {
      tasks.forEach((task, index) => {
        const subtasksContent = task.subtasks.map(subtask => 
          `${subtask.completed ? '✓' : '○'} ${subtask.title}`
        ).join('; ');

        content += `"${task.title}","${task.completed ? 'Erledigt' : 'Offen'}","${task.priority === 'high' ? 'Hoch' : task.priority === 'low' ? 'Niedrig' : 'Medium'}","${task.tags.join(', ')}","${task.estimatedTime ? formatTime(task.estimatedTime) : ''}","${formatTime(totalColumnTime)}","${formatTime(totalTrackedTime)}","${task.description || ''}","${subtasksContent}"\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${column.title.replace(/[^a-zA-Z0-9]/g, '_')}-aufgaben.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Check if this column is being dragged over
  const isDraggedOver = isOver && active;
  const isBasicDropTarget = isDraggedOver && active?.id !== column.id;
  
  // ✨ COLUMN BORDER: Only show border for cross-column drops
  const isValidDropTarget = (() => {
    if (!isBasicDropTarget) return false;
    
    // If dragging a task, check if it's from a different column
    if (activeTask) {
      let taskCurrentColumn: string | undefined;
      let thisColumnId: string;
      
      if (isProjectColumn) {
        // For project columns: compare kanbanColumnId
        taskCurrentColumn = activeTask.kanbanColumnId;
        thisColumnId = column.id; // This is the kanbanColumnId
      } else {
        // For planner columns: compare columnId
        taskCurrentColumn = activeTask.columnId;
        thisColumnId = column.id; // This is the columnId
      }
      
      // Only show border if coming from different column
      return taskCurrentColumn !== thisColumnId;
    }
    
    return true; // For other draggable items (like columns)
  })();
  
  // ✨ BOTTOM DROP: Allow bottom drops for both internal and cross-column
  const allowBottomDrop = isBasicDropTarget;

  // ✨ CLEAN DROP INDICATOR: Only show where card will actually land
  const getStableDropIndicator = (taskId: string, index: number, tasks: any[]) => {
    if (!activeTask) return false;
    
    // Don't show indicator if dragging the same task
    if (activeTask.id === taskId) return false;
    
    // Check if we have any active drag operation in this column
    const hasActiveDrag = Boolean(activeTask && (stableOverId || allowBottomDrop));
    if (!hasActiveDrag) return false;
    
    // Only show when hovering directly over a task - no fallbacks
    return stableOverId === taskId;
  };

  const titleInfo = getColumnTitle();

  return (
    <>
      <div 
        ref={setNodeRef}
        onContextMenu={handleContextMenu}
        onDragOver={handleEmailDragOver}
        onDragLeave={handleEmailDragLeave}
        onDrop={handleEmailDrop}
        className={`group flex-1 min-w-0 h-auto flex flex-col relative ${
          isMinimalDesign
                ? 'px-4'
            : 'glass-effect rounded-lg'
        } overflow-hidden ${
          isFocusMode
            ? 'border border-gray-300 dark:border-gray-600'
            : isMinimalDesign
              ? ''
              : 'border border-white/20 dark:border-gray-600/20'
        } ${isEmailDragOver ? 'ring-2 ring-dashed' : ''}`}
                  style={{
            // ✨ Column background - use style instead of className for guaranteed color
            backgroundColor: isMinimalDesign
              ? (isDarkMode ? '#111827' : '#FFFFFF')
              : undefined,
            // Email drag highlight
            ...(isEmailDragOver && {
              borderColor: state.preferences.accentColor,
              ringColor: state.preferences.accentColor,
              boxShadow: `0 0 0 2px ${state.preferences.accentColor}40`
            }),
            // ✨ ULTRA-STABLE: No transitions during any drag for projects
            transition: (activeTask && isProjectColumn) ? 'none' : activeTask ? 'none' : 'border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'translateZ(0)', // GPU acceleration
            willChange: 'auto', // Let browser optimize
            contain: 'layout style', // Prevent layout thrashing
            zIndex: 0,
            // ✨ ANTI-FLICKER: Conditional border styling without transitions
            ...(isValidDropTarget && !activeTask && {
               borderColor: 'var(--accent-color, #3B82F6)',
               borderLeftWidth: '2px',
               borderRightWidth: '2px',
             })
            ,
            // ✨ TODAY AURA: Removed background tint to keep same glass as others
            ...((() => {
              const info = getColumnTitle();
              if (!info.isDateColumn || !info.isCurrentDay || isProjectColumn) return {} as React.CSSProperties;
              const accent = state.preferences.accentColor;
              return {
                boxShadow: `inset 0 0 0 1px ${accent}30`,
                background: undefined
              } as React.CSSProperties;
            })())
          }}
      >
        {/* Drag Handle - Positioned at top edge, visible only on hover */}
        {dragListeners && (
          <div 
            {...dragListeners}
            data-drag-handle
            className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 cursor-grab active:cursor-grabbing bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-full shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDragging ? 'opacity-50' : ''}`}
            style={{ zIndex: 0 }}
            title="Spalte ziehen um zu sortieren"
          >
            <GripVertical className="w-3 h-3 text-gray-600 dark:text-gray-300 transition-colors" />
          </div>
        )}
        

        
        {/* Column Header */}
        <div className={`flex-shrink-0 relative no-text-select ${
        isMinimalDesign 
          ? (isDarkMode
              ? 'bg-[#111827] py-3 border-b border-gray-800'
              : 'bg-white py-3 border-b border-gray-200')
          : 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200/20 dark:border-gray-200/20 p-3'
      } ${
          isValidDropTarget ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
        }`} 
        style={{ 
          zIndex: 10,
          transition: 'none', // No transitions on header during any operations
          transform: 'translateZ(0)', // GPU acceleration
          contain: 'layout style', // Prevent layout thrashing
        }}>
          <div className={`flex items-center mb-1 ${isCurrentlyEditing ? 'justify-center' : 'justify-between'}`}>
            {titleInfo.isDateColumn ? (
              <div className="flex items-center justify-between w-full">
              <div className="flex flex-col flex-1">
                <span className={`text-xs font-medium ${isProjectColumn ? '' : 'transition-all duration-300'} ${
                  isValidDropTarget 
                    ? `text-accent/80 ${isProjectColumn ? '' : 'animate-pulse'}` 
                      : (isDarkMode
                          ? 'text-white/80'
                          : 'text-gray-600')
                }`}>
                  {titleInfo.dateString}
                </span>
                <h3 className={`font-bold text-base ${isProjectColumn ? '' : 'transition-all duration-300'} ${
                  titleInfo.isCurrentDay || isFocusMode || isValidDropTarget
                    ? ''
                      : (isDarkMode
                          ? 'text-white/95 drop-shadow-md'
                          : 'text-gray-900')
                }`}
                style={(titleInfo.isCurrentDay || isFocusMode || isValidDropTarget) ? { 
                  color: state.preferences.accentColor,
                  textShadow: isValidDropTarget ? `0 0 8px ${state.preferences.accentColor}40` : 'none'
                } : {}}>
                  {titleInfo.dayName}
                  {titleInfo.isCurrentDay && (
                    <span className="ml-2 inline-flex items-center align-middle">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: state.preferences.accentColor }} />
                    </span>
                  )}
                </h3>
                </div>

                {/* Three Dots Menu for Date Columns (Planner) */}
                <button
                  onClick={handleOpenContextMenu}
                  className="p-2 text-gray-400 hover:text-accent transition-all duration-200 ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                  title={i18n.language === 'en' ? 'Open column menu' : 'Spaltenmenü öffnen'}
                  type="button"
                  tabIndex={0}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ) : (
              isCurrentlyEditing ? (
                <div className="flex items-center space-x-2 w-full">
                  <input
                    type="text"
                    value={currentEditTitle}
                    onChange={(e) => {
                      if (externalEditingTitle !== undefined && externalOnTitleChange) {
                        externalOnTitleChange(column.id, e.target.value);
                      } else {
                        setEditTitle(e.target.value);
                      }
                    }}
                    onKeyDown={handleKeyPress}
                    onBlur={handleSaveTitle}
                    className="w-full px-3 py-1.5 text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={i18n.language === 'en' ? 'Enter column title...' : 'Spaltentitel eingeben...'}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="flex-shrink-0 p-1.5 text-green-600 hover:text-green-700 transition-colors"
                    title={taskColumnAny.titleConfirm?.()}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 flex-1" onContextMenu={handleContextMenu}>
                  <h3 className={`font-semibold text-base ${isProjectColumn ? '' : 'transition-all duration-300'} flex-1 ${
                    isValidDropTarget 
                      ? 'text-accent scale-105' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                  style={{
                    textShadow: isValidDropTarget ? `0 0 8px ${state.preferences.accentColor}40` : 'none'
                  }}>
                    <span className="truncate">{column.title}</span>
                  </h3>
                  
                  {/* Three Dots Menu */}
                    <button
                    onClick={handleOpenContextMenu}
                className="p-2 text-gray-400 hover:text-accent transition-all duration-200 ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title={i18n.language === 'en' ? 'Open column menu' : 'Spaltenmenü öffnen'}
                type="button"
                tabIndex={0}
              >
                    <MoreHorizontal className="w-4 h-4" />
              </button>

                </div>
              )
            )}
            

            
            {/* Time and Task Count - Hidden during editing */}
            {!isCurrentlyEditing && (
              <div className="flex items-center space-x-2 ml-2">
                {/* Time estimate (includes events) */}
                {totalColumnTime > 0 && (
                  <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded whitespace-nowrap ${isProjectColumn ? '' : 'transition-all duration-300'} ${
                    isValidDropTarget
                      ? `text-accent bg-accent/20 ${isProjectColumn ? '' : 'animate-pulse'} scale-105`
                      : 'text-gray-500 bg-gray-200'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(totalColumnTime)}</span>
                  </div>
                )}
                
                {/* Task count: only count open (not completed) tasks */}
                {tasks.filter(t => !t.completed).length > 0 && (
                  <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${isProjectColumn ? '' : 'transition-all duration-300'} ${
                    isValidDropTarget
                      ? `text-accent bg-accent/20 ${isProjectColumn ? '' : 'animate-pulse'} scale-105`
                      : 'text-gray-500 bg-gray-200'
                  }`}>
                    {tasks.filter(t => !t.completed).length}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* (Removed day progress bar) */}
        </div>

        {/* Tasks Drop Zone */}
        <div 
          className={`px-2 pt-2 pb-2 ${(isProjectColumn || isPinColumn) ? '' : 'transition-all duration-300'} flex-1 hidden-scrollbar ${
            isValidDropTarget 
              ? 'bg-gradient-to-b from-accent/10 to-accent/5 border-2 border-accent/30 border-dashed rounded-lg mx-1' 
              : ''
          }`}
          style={{ 
            gap: '0px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'none', // No transitions on container to prevent layout thrashing
            transform: 'translateZ(0)', // GPU acceleration
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            contain: 'layout style', // Optimize browser rendering
            // ✨ ULTRA-STABLE: Force immediate rendering for projects and pins
            willChange: (isProjectColumn || isPinColumn) ? 'auto' : 'transform',
          }}
        >
          
          {/* Events Section */}
          {events.length > 0 && (
            <div className="space-y-2 mb-4">
              {events.map((event) => {
                const hiddenEvents = (state.preferences.calendars as any)?.hiddenEvents || [];
                const collapsedEvents = (state.preferences.calendars as any)?.collapsedEvents || [];
                const isVisible = !hiddenEvents.includes(event.id);
                const isCollapsed = collapsedEvents.includes(event.id);
                
                return (
                  <EventCard 
                    key={event.id}
                    event={event}
                    isVisible={isVisible}
                    isCollapsed={isCollapsed}
                    onToggleVisibility={onToggleEventVisibility}
                    onToggleCollapse={onToggleEventCollapse}
                  />
                );
              })}
            </div>
          )}
          
          {/* Top Drop Zone for Planner columns */}
          {!isProjectColumn && activeTask && (
            <TopDropZone columnId={column.id} accentColor={state.preferences.accentColor} />
          )}
          
          {/* Email drop indicator at top when hovering at position 0 */}
          {isEmailDragOver && emailDropIndex === 0 && (
            <DropIndicator isVisible={true} position="top" />
          )}
          
          {isProjectColumn ? (
            // 🎯 PROJECTS: No SortableContext to avoid double context
            <div ref={taskListRef}>
            {tasks
              .filter(task => {
                return showCompletedTasks || !task.completed;
              })
              .sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return (a.position || 0) - (b.position || 0);
              })
              .map((task, index, filteredTasks) => {
                const isFirstTask = index === 0;
                const isLastTask = index === filteredTasks.length - 1;
                
                // ✨ STABLE: Use stable drop indicator logic for projects
                const showDropIndicatorAbove = getStableDropIndicator(task.id, index, filteredTasks);
                const isThisTaskBeingDragged = activeTask?.id === task.id;
                
                return (
                  <div key={task.id} data-task-index={index}>
                    {/* ✨ Drop Space - Only show if this task is NOT being dragged */}
                    {!isThisTaskBeingDragged && (
                      <DropIndicator 
                        isVisible={showDropIndicatorAbove}
                        position="top"
                      />
                    )}
                    
                    {/* Task Card */}
                    <TaskCard 
                      task={task} 
                      isNewTask={false}
                      isFirst={isFirstTask}
                      isLast={isLastTask}
                      isDragging={isThisTaskBeingDragged}
                      isFocusMode={isFocusMode}
                      currentColumn={column}
                      isDeadlineReminder={deadlineReminderTaskIds.includes(task.id)}
                    />
                    
                    {/* Email drop indicator AFTER this task (between this and next) */}
                    {isEmailDragOver && emailDropIndex === index + 1 && (
                      <DropIndicator isVisible={true} position="between" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 🎯 PLANNER: With SortableContext for existing functionality
            <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {/* 🚀 Performance Boost: Use OptimizedTaskList for large task lists */}
              {tasks.length > 50 ? (
                <OptimizedTaskList
                  tasks={tasks.filter(task => {
                    return showCompletedTasks || !task.completed;
                  }).sort((a, b) => {
                    if (a.completed && !b.completed) return 1;
                    if (!a.completed && b.completed) return -1;
                    return (a.position || 0) - (b.position || 0);
                  })}
                  enableVirtualization={tasks.length > 100}
                  itemHeight={80}
                  containerHeight={600}
                />
              ) : (
                // 🎯 PLANNER: DropIndicators with SortableContext
                <div ref={taskListRef}>
                {tasks
                  .filter(task => {
                    return showCompletedTasks || !task.completed;
                  })
                  .sort((a, b) => {
                    if (a.completed && !b.completed) return 1;
                    if (!a.completed && b.completed) return -1;
                    return (a.position || 0) - (b.position || 0);
                  })
                  .map((task, index, filteredTasks) => {
                    const isFirstTask = index === 0;
                    const isLastTask = index === filteredTasks.length - 1;
                    
                    // ✨ STABLE: Use stable drop indicator logic for planner
                    const filteredTasksPlanner = tasks.filter(task => showCompletedTasks || !task.completed);
                    const showDropIndicatorAbove = getStableDropIndicator(task.id, index, filteredTasksPlanner);
                    const isThisTaskBeingDragged = activeTask?.id === task.id;
                    
                    return (
                      <div key={task.id} data-task-index={index}>
                        {/* ✨ Drop Space - Only show if this task is NOT being dragged */}
                        {!isThisTaskBeingDragged && (
                          <DropIndicator 
                            isVisible={showDropIndicatorAbove}
                            position="top"
                          />
                        )}
                        
                        {/* Task Card */}
                        <TaskCard 
                          task={task} 
                          isNewTask={false}
                          isFirst={isFirstTask}
                          isLast={isLastTask}
                          isDragging={isThisTaskBeingDragged}
                          isFocusMode={isFocusMode}
                          currentColumn={column}
                          isDeadlineReminder={deadlineReminderTaskIds.includes(task.id)}
                        />
                        
                        {/* Email drop indicator AFTER this task (between this and next) */}
                        {isEmailDragOver && emailDropIndex === index + 1 && (
                          <DropIndicator isVisible={true} position="between" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SortableContext>
          )}

          {/* ✨ Drop indicator at end of column - anti-flicker logic */}
          <DropIndicator 
            isVisible={allowBottomDrop && stableOverId === column.id && activeTask !== null}
            position="bottom"
          />
          
          {/* Add Task Button at bottom of column - only show when onSmartTaskAdd is available */}
          {onSmartTaskAdd && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddTask();
              }}
              className={`mt-2 w-8 h-8 mx-auto rounded-full ${isProjectColumn ? '' : 'transition-all duration-300'} flex items-center justify-center hover:scale-110 ${
                isValidDropTarget ? 'opacity-50 scale-95' : ''
              }`}
              style={{
                backgroundColor: state.preferences.accentColor,
                color: 'white'
              }}
              title={taskColumnAny.addTask?.()}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Animated background effect when dragging over */}
        {isValidDropTarget && (
          <>
            {/* Radial gradient background */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                background: `radial-gradient(ellipse at center top, ${state.preferences.accentColor}15, transparent 60%)`,
                animation: 'gentle-pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Glowing border effect */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                boxShadow: `inset 0 0 0 2px ${state.preferences.accentColor}40`,
                animation: 'drop-zone-pulse 1.5s ease-in-out infinite',
              }}
            />
          </>
        )}
      </div>

      {/* Smart Task Modal */}
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={() => setShowSmartTaskModal(false)}
        targetColumn={column}
                  placeholder={forms.createTaskFor({ title: column.title })}
        projectId={projectId}
        kanbanColumnId={kanbanColumnId}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteColumn}
          title={taskColumnAny.deleteColumn?.()}
          message={tasks.length > 0 
            ? taskColumnAny.deleteConfirmWithTasks?.(column.title, tasks.length)
            : taskColumnAny.deleteConfirmEmpty?.(column.title)
          }
          itemName={column.title}
          warningText={tasks.length > 0 ? taskColumnAny.deleteWarning?.() : undefined}
        />,
        document.body
      )}

      {/* Project Manager Modal */}
      {showProjectManager && createPortal(
        <ProjectManager
          isOpen={showProjectManager}
          onClose={() => setShowProjectManager(false)}
          sourceColumnId={column.id}
        />,
        document.body
      )}

      {/* Export Dropdown Portal */}
      {showExportMenu && exportButtonRef.current && createPortal(
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setShowExportMenu(false)}
        >
          <div 
            className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[140px] animate-in slide-in-from-top-2 duration-200"
            style={{
              top: `${exportButtonRef.current.getBoundingClientRect().bottom + 4}px`,
              left: `${exportButtonRef.current.getBoundingClientRect().right - 140}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={exportTasksAsPDF}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Als PDF</span>
            </button>
            <button
              onClick={exportTasksAsCSV}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Als CSV</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && archiveModalData && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ 
                backgroundColor: `${state.preferences.accentColor}20` 
              }}>
                <div className="text-3xl">🦊</div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-3">
              Aufgaben archivieren
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
              Möchten Sie alle {archiveModalData.completedCount} abgehakten Aufgaben aus "{archiveModalData.columnTitle}" ins Archiv verschieben?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowArchiveModal(false);
                  setArchiveModalData(null);
                }}
                className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all hover:shadow-lg"
                style={{ 
                  backgroundColor: state.preferences.accentColor,
                  boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Column Context Menu */}
      <ColumnContextMenu
        column={column}
        isOpen={showContextMenu}
        onClose={handleCloseContextMenu}
        onEditColumn={() => {
          if (externalOnStartEdit) {
            externalOnStartEdit(column.id, column.title);
          } else {
            setIsEditing(true);
          }
        }}
        onDeleteColumn={() => {
          if (externalOnDeleteColumn) {
            externalOnDeleteColumn(column.id);
          } else {
            handleDeleteColumn();
          }
        }}
        onArchiveCompleted={() => handleArchiveCompletedTasks()}
        onFocusColumn={handleFocusColumn}
        onSmartTaskAdd={onSmartTaskAdd ? () => handleAddTask() : undefined}
        onExportTasks={() => handleExportTasks()}
        onColumnManager={onColumnManager}
        mousePosition={contextMenuPosition}
        isProjectColumn={isProjectColumn}
        isPlanner={!isProjectColumn && column.type === 'date'}
        isPinColumn={isPinColumn}
      />
    </>
  );
});

TaskColumn.displayName = 'TaskColumn';

export { TaskColumn };