import React, { createContext, useContext, useReducer, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import type { Task, Column, Tag, UserPreferences, TimerState, KanbanBoard, ViewState, KanbanGroupingMode, Note, NotesState, NoteLink, ActiveTimerContext, Notification, ProjectKanbanColumn, ProjectKanbanState, TaskPriority, ImageStorageState, StoredImage, RecurrenceState, RecurrenceRule, CalendarEvent, CalendarSource, PinColumn, ChecklistItem, PersonalCapacity, RecurringTask } from '../types';
import { format, addDays, startOfDay } from 'date-fns';
import { sampleTasks } from '../utils/sampleData';
import { timerService } from '../utils/timerService';
import { notificationService } from '../utils/notificationService';
import { loadImageStorage, saveImageStorage, updateImageUsage, cleanupUnusedImages, parseImageReferences } from '../utils/imageStorage';
import { recurrenceService } from '../utils/recurrenceService';
import { initializeRecurringTaskMaintenance } from '../utils/recurringTaskService';
import { syncAPI, preferencesAPI, viewStateAPI, tasksAPI, columnsAPI, tagsAPI, notesAPI, pinColumnsAPI, calendarAPI } from '../services/apiService';
import { showGlobalError } from './ToastContext';

// Check if we're in online mode (has JWT token)
function isOnlineMode(): boolean {
  return !!sessionStorage.getItem('taskfuchs_jwt');
}


interface AppState {
  tasks: Task[];
  archivedTasks: Task[];
  columns: Column[];
  tags: Tag[];
  kanbanBoards: KanbanBoard[];
  viewState: ViewState;
  activeTimer: ActiveTimerContext | null;
  preferences: UserPreferences;
  searchQuery: string;
  activeTagFilters: string[];
  activePriorityFilters: string[];
  isLoading: boolean;
  error: string | null;
  currentDate: Date;
  projectColumnOffset: number;
  focusMode: boolean;
  focusedColumnId: string | null;
  showCompletedTasks: boolean;
  // Bulk operations
  selectedTaskIds: string[];
  isBulkMode: boolean;
  // Notes functionality
  notes: NotesState;
  noteLinks: NoteLink[];
  notifications: Notification[];
  // Fullscreen functionality
  isNoteEditorFullScreen: boolean;
  // Image storage
  imageStorage: ImageStorageState;
  // Recurring tasks
  recurrence: RecurrenceState;
  // Calendar events
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  // Pin system
  pinColumns: PinColumn[];
  // Checklist
  checklistItems: ChecklistItem[];
  // Personal Capacity Planning
  personalCapacity: PersonalCapacity | null;
}

type AppAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'MOVE_TASK'; payload: { taskId: string; columnId: string } }
  | { type: 'SET_COLUMNS'; payload: Column[] }
  | { type: 'ADD_COLUMN'; payload: Column }
  | { type: 'UPDATE_COLUMN'; payload: Column }
  | { type: 'DELETE_COLUMN'; payload: string }
  | { type: 'REORDER_COLUMNS'; payload: Column[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'UPDATE_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'TOGGLE_TAG_FILTER'; payload: string }
  | { type: 'CLEAR_TAG_FILTERS' }
  | { type: 'TOGGLE_PRIORITY_FILTER'; payload: string }
  | { type: 'CLEAR_PRIORITY_FILTERS' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_TAG_FILTERS'; payload: string[] }
  | { type: 'SET_PRIORITY_FILTERS'; payload: string[] }
  | { type: 'SET_ACTIVE_TIMER'; payload: ActiveTimerContext | null }
  | { type: 'START_TIMER'; payload: { taskId: string } }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' }
  | { type: 'STOP_TIMER' }
  | { type: 'UPDATE_TIMER_CONTEXT'; payload: ActiveTimerContext }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'NAVIGATE_DATE'; payload: 'prev' | 'next' | 'today' }
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'NAVIGATE_PROJECTS'; payload: 'prev' | 'next' }
  | { type: 'SET_VIEW_MODE'; payload: 'columns' | 'kanban' }
  | { type: 'SET_KANBAN_GROUPING'; payload: KanbanGroupingMode }
  | { type: 'SET_TASK_VIEW'; payload: 'board' | 'list' }
  | { type: 'SET_ACTIVE_KANBAN_BOARD'; payload: string }
  | { type: 'SET_KANBAN_BOARDS'; payload: KanbanBoard[] }
  | { type: 'CREATE_KANBAN_BOARD'; payload: KanbanBoard }
  | { type: 'UPDATE_KANBAN_BOARD'; payload: KanbanBoard }
  | { type: 'DELETE_KANBAN_BOARD'; payload: string }
  | { type: 'MOVE_TASK_KANBAN'; payload: { taskId: string; groupValue: string; groupingMode: KanbanGroupingMode } }
  | { type: 'IMPORT_TASKS'; payload: Task[] }
  | { type: 'IMPORT_BOARDS'; payload: KanbanBoard[] }
  | { type: 'IMPORT_TAGS'; payload: Tag[] }
  | { type: 'IMPORT_DATA_REPLACE'; payload: { tasks?: Task[]; archivedTasks?: Task[]; boards?: KanbanBoard[]; columns?: Column[]; tags?: Tag[]; notes?: Note[]; noteLinks?: NoteLink[]; preferences?: Partial<UserPreferences>; viewState?: Partial<ViewState>; projectKanbanColumns?: ProjectKanbanColumn[]; projectKanbanState?: Partial<ProjectKanbanState>; pinColumns?: PinColumn[]; checklistItems?: ChecklistItem[]; notesViewState?: Partial<NotesState>; events?: CalendarEvent[]; calendarSources?: CalendarSource[]; searchQuery?: string; activeTagFilters?: string[]; activePriorityFilters?: string[]; focusMode?: boolean; focusedColumnId?: string; showCompletedTasks?: boolean; projectColumnOffset?: number; notifications?: Notification[]; isNoteEditorFullScreen?: boolean; recurrence?: Partial<RecurrenceState>; imageStorage?: Partial<ImageStorageState>; personalCapacity?: any; projectTimebudgets?: any; } }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'SET_FOCUS_MODE'; payload: boolean }
  | { type: 'SET_FOCUSED_COLUMN'; payload: string | null }
  | { type: 'TOGGLE_SHOW_COMPLETED_TASKS' }
  | { type: 'ARCHIVE_TASK'; payload: string }
  | { type: 'RESTORE_TASK'; payload: string }
  | { type: 'ARCHIVE_COMPLETED_TASKS_IN_COLUMN'; payload: string }
  | { type: 'DELETE_ARCHIVED_TASK'; payload: string }
  | { type: 'CLEAR_ARCHIVE' }
  | { type: 'SET_ARCHIVED_TASKS'; payload: Task[] }
  // Notes actions
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SELECT_NOTE'; payload: Note | null }
  | { type: 'SET_NOTES_EDITING'; payload: boolean }
  | { type: 'SET_NOTES_SEARCH'; payload: string }
  | { type: 'SET_NOTES_TAG_FILTERS'; payload: string[] }
  | { type: 'TOGGLE_NOTE_TAG_FILTER'; payload: string }
  | { type: 'CLEAR_NOTES_TAG_FILTERS' }
  | { type: 'SET_NOTES_VIEW'; payload: 'grid' | 'list' | 'editor' }
  | { type: 'SET_NOTES_SORT'; payload: { sortBy: 'updated' | 'created' | 'title' | 'tags'; sortOrder: 'asc' | 'desc' } }
  | { type: 'TOGGLE_NOTES_ARCHIVED' }
  | { type: 'TOGGLE_LINK_PREVIEWS' }
  | { type: 'SET_EDITOR_MODE'; payload: 'markdown' | 'wysiwyg' | 'split' }
  | { type: 'SET_DAILY_NOTES_MODE'; payload: boolean }
  | { type: 'SET_EMAIL_MODE'; payload: boolean }
  | { type: 'SET_SELECTED_DAILY_NOTE_DATE'; payload: string | null }
  | { type: 'ARCHIVE_NOTE'; payload: string }
  | { type: 'PIN_NOTE'; payload: string }
  | { type: 'UNPIN_NOTE'; payload: string }
  // Note linking actions
  | { type: 'ADD_NOTE_LINK'; payload: NoteLink }
  | { type: 'REMOVE_NOTE_LINK'; payload: string }
  | { type: 'LINK_NOTE_TO_TASK'; payload: { noteId: string; taskId: string } }
  | { type: 'UNLINK_NOTE_FROM_TASK'; payload: { noteId: string; taskId: string } }
  | { type: 'LINK_NOTE_TO_NOTE'; payload: { noteId: string; linkedNoteId: string } }
  | { type: 'UNLINK_NOTE_FROM_NOTE'; payload: { noteId: string; linkedNoteId: string } }
  | { type: 'LINK_TASK_TO_NOTE'; payload: { taskId: string; noteId: string } }
  | { type: 'UNLINK_TASK_FROM_NOTE'; payload: { taskId: string; noteId: string } }
  | { type: 'LINK_NOTES'; payload: { fromNoteId: string; toNoteId: string } }
  | { type: 'UNLINK_NOTES'; payload: { fromNoteId: string; toNoteId: string } }
  | { type: 'LINK_NOTE_TO_PROJECT'; payload: { noteId: string; projectId: string } }
  | { type: 'UNLINK_NOTE_FROM_PROJECT'; payload: { noteId: string; projectId: string } }
  | { type: 'PIN_NOTE_TO_PROJECT'; payload: { noteId: string; projectId: string } }
  | { type: 'UNPIN_NOTE_FROM_PROJECT'; payload: { noteId: string; projectId: string } }

  // Notification actions
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  // Project Kanban actions
  | { type: 'SET_PROJECT_KANBAN_SELECTED_PROJECT'; payload: string | null }
  | { type: 'SET_PROJECT_KANBAN_SEARCH'; payload: string }
  | { type: 'SET_PROJECT_KANBAN_PRIORITY_FILTERS'; payload: TaskPriority[] }
  | { type: 'SET_PROJECT_KANBAN_TAG_FILTERS'; payload: string[] }
  | { type: 'SET_PROJECT_KANBAN_SHOW_COMPLETED'; payload: boolean }
  | { type: 'SET_PROJECT_KANBAN_VIEW_TYPE'; payload: 'board' | 'list' }
  | { type: 'ADD_PROJECT_KANBAN_COLUMN'; payload: { projectId: string; title: string; color?: string } }
  | { type: 'ADD_PROJECT_KANBAN_COLUMN_WITH_ID'; payload: { id: string; projectId: string; title: string; color: string; order: number } }
  | { type: 'SET_PROJECT_KANBAN_COLUMNS'; payload: ProjectKanbanColumn[] }
  | { type: 'UPDATE_PROJECT_KANBAN_COLUMN'; payload: { columnId: string; title: string; color?: string } }
  | { type: 'DELETE_PROJECT_KANBAN_COLUMN'; payload: string }
  | { type: 'REORDER_PROJECT_KANBAN_COLUMNS'; payload: { projectId: string; columnIds: string[] } }
  | { type: 'MOVE_TASK_TO_KANBAN_COLUMN'; payload: { taskId: string; kanbanColumnId: string | null; newPosition: number } }
  | { type: 'REORDER_PROJECTS'; payload: { projectIds: string[] } }
  | { type: 'UPDATE_PROJECT_TITLE'; payload: { projectId: string; title: string } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'PIN_PROJECT'; payload: string }
  | { type: 'UNPIN_PROJECT'; payload: string }

  // Fullscreen actions
  | { type: 'SET_NOTE_EDITOR_FULLSCREEN'; payload: boolean }
  
  // Date column actions
  | { type: 'ENSURE_DATE_COLUMN'; payload: string }
  
  // Image storage actions
  | { type: 'SET_IMAGE_STORAGE'; payload: ImageStorageState }
  | { type: 'ADD_IMAGE'; payload: StoredImage }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'UPDATE_IMAGE_USAGE'; payload: { imageId: string; noteId: string; isUsed: boolean } }
  | { type: 'CLEANUP_UNUSED_IMAGES' }
  
  // Recurring tasks actions
  | { type: 'SET_RECURRENCE_RULES'; payload: RecurrenceRule[] }
  | { type: 'ADD_RECURRENCE_RULE'; payload: RecurrenceRule }
  | { type: 'UPDATE_RECURRENCE_RULE'; payload: RecurrenceRule }
  | { type: 'DELETE_RECURRENCE_RULE'; payload: string }
  | { type: 'SET_ACTIVE_RECURRENCE_RULE'; payload: RecurrenceRule | null }
  | { type: 'GENERATE_RECURRING_TASKS'; payload: { ruleId: string; tasks: RecurringTask[] } }
  | { type: 'UPDATE_RECURRING_TASK'; payload: RecurringTask }
  | { type: 'COMPLETE_RECURRING_TASK'; payload: string }
  | { type: 'SKIP_RECURRING_TASK'; payload: string }
  | { type: 'RESCHEDULE_RECURRING_TASK'; payload: { taskId: string; newDate: string } }
  | { type: 'SET_RECURRENCE_SHOW_COMPLETED'; payload: boolean }
  | { type: 'SET_RECURRENCE_SHOW_SKIPPED'; payload: boolean }
  | { type: 'SET_RECURRENCE_TIMEFRAME'; payload: 'week' | 'month' | '3months' | 'year' }
  | { type: 'SET_RECURRENCE_SORT'; payload: { sortBy: 'date' | 'name' | 'completion_rate' | 'created'; sortOrder: 'asc' | 'desc' } }
  | { type: 'CLEANUP_RECURRING_TASKS' }
  
  // Calendar events actions
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_EVENTS'; payload: CalendarEvent[] }
  | { type: 'SYNC_EVENTS'; payload: { events: CalendarEvent[], sourceId: string } }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'SET_CALENDAR_SOURCES'; payload: CalendarSource[] }
  | { type: 'ADD_CALENDAR_SOURCE'; payload: CalendarSource }
  | { type: 'UPDATE_CALENDAR_SOURCE'; payload: CalendarSource }
  | { type: 'DELETE_CALENDAR_SOURCE'; payload: string }
  | { type: 'SYNC_CALENDAR'; payload: string }
  | { type: 'TOGGLE_EVENT_VISIBILITY'; payload: string }
  | { type: 'TOGGLE_EVENT_COLLAPSE'; payload: string }
  
  // Planned column actions
  | { type: 'ENSURE_PLANNED_COLUMN'; payload: string }
  // Bulk operations actions
  | { type: 'TOGGLE_BULK_MODE' }
  | { type: 'SELECT_TASK'; payload: string }
  | { type: 'DESELECT_TASK'; payload: string }
  | { type: 'SELECT_ALL_TASKS'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'BULK_DELETE_TASKS'; payload: string[] }
  | { type: 'BULK_UPDATE_PRIORITY'; payload: { taskIds: string[]; priority: TaskPriority } }
  | { type: 'BULK_ADD_TAG'; payload: { taskIds: string[]; tagId: string } }
  | { type: 'BULK_REMOVE_TAG'; payload: { taskIds: string[]; tagId: string } }
  | { type: 'BULK_COMPLETE_TASKS'; payload: string[] }
  | { type: 'BULK_UNCOMPLETE_TASKS'; payload: string[] }
  | { type: 'BULK_ARCHIVE_TASKS'; payload: string[] }
  | { type: 'BULK_MOVE_TASKS'; payload: { taskIds: string[]; columnId: string } }
  
  // Pin system actions
  | { type: 'SET_PIN_COLUMNS'; payload: PinColumn[] }
  | { type: 'ADD_PIN_COLUMN'; payload: PinColumn }
  | { type: 'UPDATE_PIN_COLUMN'; payload: PinColumn }
  | { type: 'DELETE_PIN_COLUMN'; payload: string }
  | { type: 'REORDER_PIN_COLUMNS'; payload: PinColumn[] }
  | { type: 'ASSIGN_TASK_TO_PIN'; payload: { taskId: string; pinColumnId: string } }
  | { type: 'UNPIN_TASK'; payload: string }
  
  // Checklist actions
  | { type: 'ADD_CHECKLIST_ITEM'; payload: ChecklistItem }
  | { type: 'UPDATE_CHECKLIST_ITEM'; payload: ChecklistItem }
  | { type: 'DELETE_CHECKLIST_ITEM'; payload: string }
  | { type: 'SET_CHECKLIST_ITEMS'; payload: ChecklistItem[] }
  
  // Personal Capacity actions
  | { type: 'SET_PERSONAL_CAPACITY'; payload: PersonalCapacity }
  | { type: 'UPDATE_PERSONAL_CAPACITY'; payload: PersonalCapacity };

const initialState: AppState = {
  tasks: [],
  archivedTasks: [],
  columns: [],
  tags: [],
  kanbanBoards: [],
  viewState: {
    currentMode: 'columns',
    kanbanGrouping: 'status',
    taskView: 'board',
    projectKanban: {
      selectedProjectId: null,
      columns: [],
      searchQuery: '',
      priorityFilters: [],
      tagFilters: [],
      showCompleted: false,
      viewType: 'board',
    },
  },
  activeTimer: null,
  preferences: {
    theme: 'light',
    language: 'de',
    accentColor: '#f97316',
    backgroundImage: '/backgrounds/bg12.webp',
    backgroundType: 'image',
    dateFormat: 'dd.MM.yyyy',
    recentBackgroundImages: [],
    notifications: {
      email: true,
      push: true,
      timerReminders: true,
      deadlineReminders: true,
    },
    privacy: {
      analytics: false,
      crashReports: true,
    },
    sounds: true,
    soundVolume: 0.8,
    completionSound: 'yeah',
    completionSoundEnabled: true,
    enableCelebration: true,
    celebrationText: 'Gut gemacht!',
    celebrationDuration: 3000,
    timerDisplayMode: 'topBar',
    columns: {
      visible: 5,
      plannerVisible: 5,
      projectsVisible: 5,
      pinsVisible: 5,
      showProjects: true,
    },
    showPriorities: true,
    // Sidebar customization
    sidebar: {
      hiddenItems: [],
      itemOrder: ['today', 'inbox', 'tasks', 'kanban', 'notes', 'tags', 'statistics', 'archive'],
    },
    // End-of-day feature
    enableEndOfDay: true,
    // Focus mode setting
    enableFocusMode: false,
    // Timer settings
    timer: {
      showOverlay: true,
      overlayPosition: { x: window.innerWidth - 350, y: 80 },
      overlayMinimized: false,
      autoOpenTaskOnStart: true,
      showRemainingTime: true,
      dimControlsWhenNoTask: false,
      soundEnabled: true,
      taskSound: 'yeah',
      whiteNoiseEnabled: false,
      whiteNoiseType: 'clock',
      whiteNoiseVolume: 0.3,
    },
    // Toggl integration settings
    toggl: {
      enabled: false,
      apiToken: '',
      workspaceId: '',
      defaultProjectId: '',
      autoSync: true,
      syncOnStart: true,
      syncOnPause: true,
      syncOnStop: true,
      createProjectsAutomatically: true,
      useTaskDescriptions: true,
      roundTimeToMinutes: true,
    },
    // CalDAV integration settings
    caldav: {
      enabled: false,
      serverUrl: '',
      username: '',
      password: '',
      calendarUrl: '',
      autoSync: true,
      syncInterval: 30,
      syncOnStart: true,
      syncOnTaskChange: true,
      bidirectionalSync: true,
      lastSync: undefined,
      lastSyncStatus: undefined,
      lastSyncError: undefined,
      conflictResolution: 'manual',
    },
    // Microsoft To Do integration settings
    microsoftTodo: {
      enabled: false,
      selectedListId: '',
      selectedListName: '',
      autoSync: true,
      syncInterval: 30,
      syncOnStart: true,
      syncOnTaskChange: true,
      bidirectionalSync: true,
      conflictResolution: 'manual',
      lastSync: undefined,
      lastSyncStatus: undefined,
      lastSyncError: undefined,
      projectMappings: [],
      useSectionMapping: false,
    },
    // Todoist integration settings
    todoist: {
      enabled: false,
      apiToken: '',
      syncTags: ['todoist'],
      autoSync: true,
      syncInterval: 30,
      syncOnStart: true,
      syncOnTaskChange: true,
      bidirectionalSync: true,
      syncCompletedTasks: false,
      defaultProjectId: '',
      conflictResolution: 'manual',
      lastSync: undefined,
      lastSyncStatus: undefined,
      lastSyncError: undefined,
    },
    // Dropbox E2EE sync settings
    dropbox: {
      enabled: false,
      appKey: '',
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
      accountEmail: '',
      accountName: '',
      folderPath: '/Apps/TaskFuchs',
      autoSync: true,
      syncInterval: 30,
      lastSync: undefined,
      lastSyncStatus: undefined,
      lastSyncError: undefined,
      conflictResolution: 'manual',
      rememberPassphrase: false,
      passphraseHint: ''
    },
    // Background effects
    backgroundEffects: {
      blur: false,
      overlay: false,
      overlayOpacity: 0.4,
    },
  },
  searchQuery: '',
  activeTagFilters: [],
  activePriorityFilters: [],
  isLoading: false,
  error: null,
  currentDate: new Date(),
  projectColumnOffset: 0,
  focusMode: false,
  focusedColumnId: null,
  showCompletedTasks: true,
  // Bulk operations
  selectedTaskIds: [],
  isBulkMode: false,
  // Notes functionality
  notes: {
    notes: [],
    selectedNote: null,
    isEditing: false,
    searchQuery: '',
    selectedTags: [],
    view: 'grid',
    sortBy: 'updated',
    sortOrder: 'desc',
    showArchived: false,
    showLinkPreviews: true,
    editorMode: 'split' as const,
    dailyNotesMode: false,
    emailMode: false,
    selectedDailyNoteDate: null,
  },
  noteLinks: [],
  notifications: [],
  isNoteEditorFullScreen: false,
  imageStorage: loadImageStorage(),
  // Recurring tasks
  recurrence: {
    rules: [],
    activeRule: null,
    generatedTasks: [],
    upcomingTasks: [],
    completedTasks: [],
    skippedTasks: [],
    showCompleted: false,
    showSkipped: false,
    selectedTimeframe: 'month',
    sortBy: 'date',
    sortOrder: 'asc',
    overallStats: {
      totalRules: 0,
      activeRules: 0,
      totalTasks: 0,
      completedTasks: 0,
      averageCompletionRate: 0,
    },
  },
  // Calendar events
  events: [],
  calendarSources: [],
  // Pin system
  pinColumns: [
    {
      id: 'default-pin',
      title: 'Fokus',
      color: '#64748b',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  // Checklist
  checklistItems: [],
  // Personal Capacity
  personalCapacity: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    
        case 'ADD_TASK': {
      return { ...state, tasks: [...state.tasks, action.payload] };
    }
    
              case 'UPDATE_TASK': {
      const updatedTask = action.payload;
      
      // Get the original task to compare estimatedTime changes
      const originalTask = state.tasks.find(task => task.id === updatedTask.id);
      
      const updatedTasks = state.tasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      );
    
      // Stop task timer automatically when task is completed
      let newActiveTimer = state.activeTimer;
      if (updatedTask.completed && state.activeTimer?.taskId === updatedTask.id) {
        try {
          timerService.stopTimer('completed');
          newActiveTimer = null;
        } catch (error) {
          console.error('Error stopping timer on task completion:', error);
          newActiveTimer = null;
        }
      }
      
      // Adjust running timer if estimated time changed for active task
      if (originalTask && 
          state.activeTimer?.taskId === updatedTask.id && 
          !updatedTask.completed && 
          originalTask.estimatedTime !== updatedTask.estimatedTime) {
        
        const oldEstimatedTime = originalTask.estimatedTime || 0;
        const newEstimatedTime = updatedTask.estimatedTime || 0;
        const timeDifference = newEstimatedTime - oldEstimatedTime;
        
        console.log('🎯 Timer-Anpassung erkannt:', {
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          oldEstimatedTime,
          newEstimatedTime,
          timeDifference
        });
        
        try {
          // Adjust the running timer with the time difference
          if (timeDifference !== 0) {
            const success = timerService.adjustTimerTime(timeDifference);
            if (success) {
              console.log('✅ Timer erfolgreich angepasst um', timeDifference, 'Minuten');
            } else {
              console.warn('❌ Timer-Anpassung fehlgeschlagen');
            }
          }
        } catch (error) {
          console.error('Error adjusting timer time:', error);
        }
      }
    
      return {
        ...state,
        tasks: updatedTasks,
        activeTimer: newActiveTimer
      };
    }
    
    case 'DELETE_TASK':
      // Ensure we have a valid task ID
      if (!action.payload || typeof action.payload !== 'string') {
        return state;
      }
      
      // Check if task exists before deletion
      const taskToDelete = state.tasks.find(task => task.id === action.payload);
      if (!taskToDelete) {
        return state;
      }
      
      const filteredTasks = state.tasks.filter(task => task.id !== action.payload);
      
      // Stop any active timer for this task
      let newActiveTimer = state.activeTimer;
      if (state.activeTimer?.taskId === action.payload) {
        newActiveTimer = null;
      }
      
      return {
        ...state,
        tasks: filteredTasks,
        activeTimer: newActiveTimer,
      };
    
    case 'MOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id === action.payload.taskId) {
            const updatedTask = { ...task, columnId: action.payload.columnId };
            
            // If moving to a date column, also set reminderDate for consistency
            if (action.payload.columnId.startsWith('date-')) {
              const dateStr = action.payload.columnId.replace('date-', '');
              updatedTask.reminderDate = dateStr;
            }
            
            // IMPORTANT: projectId and kanbanColumnId are automatically preserved via ...task spread
            return updatedTask;
          }
          return task;
        }),
      };
    
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };
    
    case 'ADD_COLUMN':
      return { ...state, columns: [...state.columns, action.payload] };
    
    case 'UPDATE_COLUMN':
      return {
        ...state,
        columns: state.columns.map(column =>
          column.id === action.payload.id ? action.payload : column
        ),
      };
    
    case 'DELETE_COLUMN':
      // When deleting a column, permanently delete all tasks that belong to it
      const columnToDelete = state.columns.find(col => col.id === action.payload);
      if (columnToDelete) {
        const remainingTasks = state.tasks.filter(task => task.columnId !== action.payload);
        
        return {
          ...state,
          columns: state.columns.filter(column => column.id !== action.payload),
          tasks: remainingTasks,
        };
      }
      return {
        ...state,
        columns: state.columns.filter(column => column.id !== action.payload),
      };
    
    case 'REORDER_COLUMNS':
      return {
        ...state,
        columns: action.payload,
      };
    
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    
    case 'UPDATE_TAG':
      return {
        ...state,
        tags: state.tags.map(tag =>
          tag.id === action.payload.id ? action.payload : tag
        ),
      };
    
    case 'DELETE_TAG':
      return {
        ...state,
        tags: state.tags.filter(tag => tag.id !== action.payload),
        activeTagFilters: state.activeTagFilters.filter(filter => filter !== action.payload),
      };
    
    case 'TOGGLE_TAG_FILTER':
      const tagName = action.payload;
      const isActive = state.activeTagFilters.includes(tagName);
      return {
        ...state,
        activeTagFilters: isActive
          ? state.activeTagFilters.filter(filter => filter !== tagName)
          : [...state.activeTagFilters, tagName],
      };
    
    case 'CLEAR_TAG_FILTERS':
      return { ...state, activeTagFilters: [] };
    
    case 'TOGGLE_PRIORITY_FILTER':
      const priorityName = action.payload;
      const isPriorityActive = state.activePriorityFilters.includes(priorityName);
      return {
        ...state,
        activePriorityFilters: isPriorityActive
          ? state.activePriorityFilters.filter(filter => filter !== priorityName)
          : [...state.activePriorityFilters, priorityName],
      };
    
    case 'CLEAR_PRIORITY_FILTERS':
      return { ...state, activePriorityFilters: [] };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_TAG_FILTERS':
      return { ...state, activeTagFilters: action.payload };
    
    case 'SET_PRIORITY_FILTERS':
      return { ...state, activePriorityFilters: action.payload };
    
    case 'SET_ACTIVE_TIMER':
      return { ...state, activeTimer: action.payload };

    case 'START_TIMER': {
      try {
        const task = state.tasks.find(t => t.id === action.payload.taskId);
        if (!task) {
          console.warn('Cannot start timer: task not found', action.payload.taskId);
          return { ...state, error: 'Aufgabe nicht gefunden' };
        }
        
        // Create timer context immediately for instant UI response
        const trackedTime = task.trackedTime || 0;
        const effectiveEstimated = Math.max(0, task.estimatedTime || 0);
        const immediateTimerContext = {
          taskId: task.id,
          taskTitle: task.title,
          estimatedTime: effectiveEstimated,
          elapsedTime: trackedTime,
          remainingTime: effectiveEstimated > 0 ? (effectiveEstimated - trackedTime) : 0,
          isActive: true,
          isPaused: false
        };

        // Start timer service asynchronously to avoid blocking UI
        setTimeout(() => {
          timerService.startTimer(
            task.id,
            task.title,
            effectiveEstimated,
            trackedTime
          );
        }, 0);

        // Notify UI to show focus prompt (3s auto-hide handled by listener)
        try {
          window.dispatchEvent(new CustomEvent('show-focus-prompt', { detail: { taskId: task.id } }));
        } catch {}

        return { ...state, activeTimer: immediateTimerContext, error: null };
      } catch (error) {
        console.error('Error starting timer:', error);
        return { ...state, error: 'Fehler beim Starten des Timers: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') };
      }
    }

    case 'PAUSE_TIMER': {
      try {
        const timerContext = timerService.pauseTimer();
        return { ...state, activeTimer: timerContext, error: null };
      } catch (error) {
        console.error('Error pausing timer:', error);
        return { ...state, error: 'Fehler beim Pausieren des Timers' };
      }
    }

    case 'RESUME_TIMER': {
      try {
        const timerContext = timerService.resumeTimer();
        return { ...state, activeTimer: timerContext, error: null };
      } catch (error) {
        console.error('Error resuming timer:', error);
        return { ...state, error: 'Fehler beim Fortsetzen des Timers' };
      }
    }

    case 'STOP_TIMER': {
      try {
        // Save tracked time to task before stopping
        if (state.activeTimer) {
          const task = state.tasks.find(t => t.id === state.activeTimer.taskId);
          if (task) {
            const previousTrackedTime = task.trackedTime || 0;
            const currentElapsedTime = Math.round(state.activeTimer.elapsedTime);
            const newTrackedTime = Math.max(0, currentElapsedTime);
            
            console.log(`🛑 Stopping timer for "${task.title}":`, {
              previousTrackedTime,
              currentElapsedTime,
              newTrackedTime,
              sessionDuration: newTrackedTime - previousTrackedTime
            });

            const updatedTask = {
              ...task,
              trackedTime: newTrackedTime
            };
            
            // Update the task with new tracked time
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? updatedTask : t
            );
            
            timerService.stopTimer();
            return { ...state, tasks: updatedTasks, activeTimer: null, error: null };
          }
        }
        
        timerService.stopTimer();
        return { ...state, activeTimer: null, error: null };
      } catch (error) {
        console.error('Error stopping timer:', error);
        return { ...state, activeTimer: null, error: 'Fehler beim Stoppen des Timers' };
      }
    }

    case 'UPDATE_TIMER_CONTEXT':
      return { ...state, activeTimer: action.payload };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { 
          ...state.preferences, 
          ...action.payload,
          // Ensure timer preferences structure is maintained
          timer: action.payload.timer ? {
            showOverlay: true,
            overlayPosition: { x: 20, y: 20 },
            overlayMinimized: false,
            autoOpenTaskOnStart: true,
            showRemainingTime: true,
            ...state.preferences?.timer,
            ...action.payload.timer
          } : state.preferences?.timer,
          // Ensure background effects structure is maintained
          backgroundEffects: {
            blur: false,
            overlay: false,
            overlayOpacity: 0.4,
            ...state.preferences?.backgroundEffects,
            ...action.payload.backgroundEffects
          }
        },
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'NAVIGATE_DATE':
      const currentDate = new Date(state.currentDate);
      switch (action.payload) {
        case 'prev':
          currentDate.setDate(currentDate.getDate() - 1);
          break;
        case 'next':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'today':
          return { ...state, currentDate: new Date() };
      }
      return { ...state, currentDate };
    
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    
    case 'NAVIGATE_PROJECTS':
      // Calculate the maximum allowed offset (don't scroll past "Add Column" button)
      const projectColumns = state.viewState.projectKanban.columns.filter(col => 
        col.projectId === state.viewState.projectKanban.selectedProjectId
      );
      // Use projectsVisible if set, otherwise fall back to visible
      const projectVisibleColumnCount = state.preferences.columns.projectsVisible ?? state.preferences.columns.visible;
      const totalProjectColumns = projectColumns.length + 1; // +1 for "Add Column" button
      const maxAllowedOffset = Math.max(0, totalProjectColumns - projectVisibleColumnCount);
      
      const newOffset = action.payload === 'next' 
        ? Math.min(state.projectColumnOffset + 1, maxAllowedOffset)
        : Math.max(0, state.projectColumnOffset - 1);
      return { ...state, projectColumnOffset: newOffset };
    
    case 'SET_VIEW_MODE':
      return { ...state, viewState: { ...state.viewState, currentMode: action.payload } };
    
    case 'SET_KANBAN_GROUPING':
      return { ...state, viewState: { ...state.viewState, kanbanGrouping: action.payload } };
    
    case 'SET_TASK_VIEW':
      return { ...state, viewState: { ...state.viewState, taskView: action.payload } };
    
    case 'SET_ACTIVE_KANBAN_BOARD':
      return { ...state, viewState: { ...state.viewState, activeKanbanBoard: action.payload } };
    
    case 'SET_KANBAN_BOARDS':
      return { ...state, kanbanBoards: action.payload };
    
    case 'CREATE_KANBAN_BOARD':
      return { ...state, kanbanBoards: [...state.kanbanBoards, action.payload] };
    
    case 'UPDATE_KANBAN_BOARD':
      return {
        ...state,
        kanbanBoards: state.kanbanBoards.map(board =>
          board.id === action.payload.id ? action.payload : board
        ),
      };
    
    case 'DELETE_KANBAN_BOARD':
      return {
        ...state,
        kanbanBoards: state.kanbanBoards.filter(board => board.id !== action.payload),
      };
    
    case 'MOVE_TASK_KANBAN':
      console.log('MOVE_TASK_KANBAN action:', action.payload);
      const updatedTasksKanban = state.tasks.map(task => {
        if (task.id === action.payload.taskId) {
          const updatedTask = { 
            ...task, 
            groupValue: action.payload.groupValue,
            groupingMode: action.payload.groupingMode
          };
          console.log('Updated task:', updatedTask);
          return updatedTask;
        }
        return task;
      });
      console.log('All tasks after move:', updatedTasksKanban);
      return {
        ...state,
        tasks: updatedTasksKanban,
      };
    
    case 'IMPORT_TASKS':
      return { ...state, tasks: [...state.tasks, ...action.payload] };
    
    case 'IMPORT_BOARDS':
      return { ...state, kanbanBoards: [...state.kanbanBoards, ...action.payload] };
    
    case 'IMPORT_TAGS':
      const existingTagNames = state.tags.map(tag => tag.name);
      const newImportedTags = action.payload.filter(tag => !existingTagNames.includes(tag.name));
      return { ...state, tags: [...state.tags, ...newImportedTags] };
    
    // Entfernt - wird weiter unten ersetzt durch erweiterte Version
    case 'IMPORT_DATA_REPLACE':
      const baseState = {
        ...state,
        tasks: action.payload.tasks || [],
        archivedTasks: action.payload.archivedTasks || state.archivedTasks,
        columns: action.payload.columns || [],
        kanbanBoards: action.payload.boards || [],
        tags: action.payload.tags || [],
        // 🎯 PIN SYSTEM - Import
        pinColumns: action.payload.pinColumns || state.pinColumns,
        // Checklist items
        checklistItems: action.payload.checklistItems || state.checklistItems,
        // Notes mit vollständiger State-Integration
        notes: {
          ...state.notes,
          notes: action.payload.notes || [],
          // 📧 Import NotesViewState wenn verfügbar
          ...(action.payload.notesViewState ? {
            selectedNote: action.payload.notesViewState.selectedNote || state.notes.selectedNote,
            isEditing: action.payload.notesViewState.isEditing || state.notes.isEditing,
            searchQuery: action.payload.notesViewState.searchQuery || state.notes.searchQuery,
            selectedTags: action.payload.notesViewState.selectedTags || state.notes.selectedTags,
            view: action.payload.notesViewState.view || state.notes.view,
            sortBy: action.payload.notesViewState.sortBy || state.notes.sortBy,
            sortOrder: action.payload.notesViewState.sortOrder || state.notes.sortOrder,
            showArchived: action.payload.notesViewState.showArchived !== undefined ? action.payload.notesViewState.showArchived : state.notes.showArchived,
            showLinkPreviews: action.payload.notesViewState.showLinkPreviews !== undefined ? action.payload.notesViewState.showLinkPreviews : state.notes.showLinkPreviews,
            editorMode: action.payload.notesViewState.editorMode || state.notes.editorMode,
            dailyNotesMode: action.payload.notesViewState.dailyNotesMode !== undefined ? action.payload.notesViewState.dailyNotesMode : state.notes.dailyNotesMode,
            emailMode: action.payload.notesViewState.emailMode !== undefined ? action.payload.notesViewState.emailMode : state.notes.emailMode, // ✨ E-Mail Modus
            selectedDailyNoteDate: action.payload.notesViewState.selectedDailyNoteDate || state.notes.selectedDailyNoteDate,
          } : {})
        },
        noteLinks: action.payload.noteLinks || [],
        events: action.payload.events || [],
        calendarSources: action.payload.calendarSources || [],
        // Vollständige App-State Daten importieren falls verfügbar
        searchQuery: action.payload.searchQuery || state.searchQuery,
        activeTagFilters: action.payload.activeTagFilters || state.activeTagFilters,
        activePriorityFilters: action.payload.activePriorityFilters || state.activePriorityFilters,
        focusMode: action.payload.focusMode !== undefined ? action.payload.focusMode : state.focusMode,
        focusedColumnId: action.payload.focusedColumnId !== undefined ? action.payload.focusedColumnId : state.focusedColumnId,
        showCompletedTasks: action.payload.showCompletedTasks !== undefined ? action.payload.showCompletedTasks : state.showCompletedTasks,
        projectColumnOffset: action.payload.projectColumnOffset !== undefined ? action.payload.projectColumnOffset : state.projectColumnOffset,
        notifications: action.payload.notifications || state.notifications,
        isNoteEditorFullScreen: action.payload.isNoteEditorFullScreen !== undefined ? action.payload.isNoteEditorFullScreen : state.isNoteEditorFullScreen,
        recurrence: action.payload.recurrence ? { ...state.recurrence, ...action.payload.recurrence } : state.recurrence,
        imageStorage: action.payload.imageStorage ? { ...state.imageStorage, ...action.payload.imageStorage } : state.imageStorage,
        // Preferences und ViewState wie bisher
        preferences: action.payload.preferences ? { ...state.preferences, ...action.payload.preferences } : state.preferences,
        viewState: action.payload.viewState ? {
          ...state.viewState,
          ...action.payload.viewState,
          projectKanban: action.payload.projectKanbanState ? {
            ...state.viewState.projectKanban,
            ...action.payload.projectKanbanState,
            columns: action.payload.projectKanbanColumns || state.viewState.projectKanban.columns
          } : state.viewState.projectKanban
        } : state.viewState,
        // 🕒 Zeitbudget-Features importieren (mit Struktur-Sicherheit)
        personalCapacity: action.payload.personalCapacity ? 
          {
            ...action.payload.personalCapacity,
            yearlyCapacities: action.payload.personalCapacity.yearlyCapacities || {}
          } : state.personalCapacity,
      };
    
      // 🕒 ProjectTimebudgets zu Projekten zuordnen
      if (action.payload.projectTimebudgets && Array.isArray(action.payload.projectTimebudgets)) {
        console.log('🔄 Importing project timebudgets:', action.payload.projectTimebudgets);
        
        const updatedColumns = baseState.columns.map(column => {
          if (column.type === 'project') {
            // Finde das entsprechende timebudget für dieses Projekt
            const timebudget = action.payload.projectTimebudgets.find((tb: any) => 
              tb.projectId === column.id
            );
            
            if (timebudget) {
              console.log(`✅ Assigning timebudget to project ${column.title}:`, timebudget);
              return {
                ...column,
                timebudget
              };
            }
          }
          return column;
        });
        
        return {
          ...baseState,
          columns: updatedColumns
        };
      }
      
      return baseState;
    
    case 'CLEAR_ALL_DATA':
      // Complete factory reset - clear ALL data including localStorage
      try {
        // Clear all TaskFuchs localStorage entries
        const keysToRemove = [
          'taskfuchs-tasks',
          'taskfuchs-archived-tasks',
          'taskfuchs-columns',
          'taskfuchs-tags',
          'taskfuchs-boards',
          'taskfuchs-preferences',
          'taskfuchs-notes',
          'taskfuchs-note-links',
          'taskfuchs-view-state',
          'taskfuchs-show-completed',
          'taskfuchs-events',
          'taskfuchs-calendar-sources',
          'taskfuchs-image-storage',
          'taskfuchs-recurrence-rules',
          'taskfuchs-recurring-tasks',
          'taskfuchs-notifications',
          'taskfuchs-timer-state',
          'taskfuchs-timer-settings',
          'taskfuchs-sync-settings',
          'taskfuchs-microsoft-todo',
          'taskfuchs-toggl-settings',
          'taskfuchs-caldav-settings',
          'taskfuchs-nextcloud-settings',
          'backgroundImageGallery',
          'taskfuchs-auth-token',
          'taskfuchs-user-data'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Also clear any other potential TaskFuchs-related keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('taskfuchs-') || key.includes('TaskFuchs'))) {
            localStorage.removeItem(key);
          }
        }
        
        // Stop any active task timer
        if (timerService) {
          try {
            timerService.stopTimer('stopped');
          } catch {}
        }
        
        console.log('All TaskFuchs data cleared - factory reset complete');
      } catch (error) {
        console.error('Error during factory reset:', error);
      }
      
      // Return completely clean initial state (factory condition)
      return {
        ...initialState,
        currentDate: new Date(), // Reset to current date
        // Do NOT preserve preferences - complete reset
      };
    
    case 'SET_FOCUS_MODE':
      return { ...state, focusMode: action.payload };
    
    case 'SET_FOCUSED_COLUMN':
      return { ...state, focusedColumnId: action.payload };
    
    case 'TOGGLE_SHOW_COMPLETED_TASKS':
      return { ...state, showCompletedTasks: !state.showCompletedTasks };
    
    case 'ARCHIVE_TASK':
      const taskToArchive = state.tasks.find(task => task.id === action.payload);
      if (!taskToArchive) return state;
      
      // Check if this task has an active timer and stop it
      let archiveActiveTimer = state.activeTimer;
      if (state.activeTimer && state.activeTimer.taskId === action.payload) {
        console.log('⏱️ Stopping timer for task being archived:', action.payload);
        try {
          timerService.stopTimer('completed');
          archiveActiveTimer = null;
        } catch (error) {
          console.error('Error stopping timer during single task archive:', error);
          archiveActiveTimer = null;
        }
      }
      
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        archivedTasks: [...state.archivedTasks, { ...taskToArchive, completed: true }],
        activeTimer: archiveActiveTimer,
      };
    
    case 'RESTORE_TASK':
      const taskToRestore = state.archivedTasks.find(task => task.id === action.payload);
      if (!taskToRestore) return state;
      
      // Find the inbox column or create one if it doesn't exist
      const inboxColumn = state.columns.find(col => col.title === 'Inbox' || col.title === 'Eingang');
      const targetColumnId = inboxColumn ? inboxColumn.id : 'inbox';
      
      return {
        ...state,
        archivedTasks: state.archivedTasks.filter(task => task.id !== action.payload),
        tasks: [...state.tasks, { ...taskToRestore, columnId: targetColumnId, completed: false }],
      };
    
    case 'ARCHIVE_COMPLETED_TASKS_IN_COLUMN':
      console.log('🎯 ARCHIVE_COMPLETED_TASKS_IN_COLUMN action received');
      console.log('📂 Payload (column ID):', action.payload);
      console.log('📊 All tasks:', state.tasks.length);
      
      const completedTasksInColumn = state.tasks.filter(
        task => task.completed && (
          task.columnId === action.payload || // Normal columns
          task.kanbanColumnId === action.payload // Project kanban columns
        )
      );
      
      console.log('✅ Found completed tasks in column:', completedTasksInColumn.length);
      console.log('📋 Tasks to archive:', completedTasksInColumn);
      
      // Check if any of the tasks to be archived have an active timer
      let updatedActiveTimer = state.activeTimer;
      if (state.activeTimer) {
        const hasActiveTimerTask = completedTasksInColumn.some(task => task.id === state.activeTimer?.taskId);
        if (hasActiveTimerTask) {
          console.log('⏱️ Stopping timer for task being archived:', state.activeTimer.taskId);
          try {
            timerService.stopTimer('completed');
            updatedActiveTimer = null;
          } catch (error) {
            console.error('Error stopping timer during archive:', error);
            updatedActiveTimer = null;
          }
        }
      }
      
      const remainingTasks = state.tasks.filter(task => !(
        task.completed && (
          task.columnId === action.payload || 
          task.kanbanColumnId === action.payload
        )
      ));
      
      console.log('📊 Remaining tasks after archive:', remainingTasks.length);
      console.log('📁 Current archived tasks:', state.archivedTasks.length);
      console.log('📁 New archived tasks total:', state.archivedTasks.length + completedTasksInColumn.length);
      
      const newState = {
        ...state,
        tasks: remainingTasks,
        archivedTasks: [...state.archivedTasks, ...completedTasksInColumn],
        activeTimer: updatedActiveTimer,
      };
      
      console.log('✅ Archive action completed successfully');
      return newState;
    
    case 'DELETE_ARCHIVED_TASK':
      return {
        ...state,
        archivedTasks: state.archivedTasks.filter(task => task.id !== action.payload),
      };
    
    case 'CLEAR_ARCHIVE':
      return { ...state, archivedTasks: [] };
    
    case 'SET_ARCHIVED_TASKS':
      return { ...state, archivedTasks: action.payload };
    
    // Notes cases
    case 'SET_NOTES':
      return { 
        ...state, 
        notes: { ...state.notes, notes: action.payload } 
      };
    
    case 'ADD_NOTE':
      return { 
        ...state, 
        notes: { ...state.notes, notes: [...state.notes.notes, action.payload] } 
      };
    
    case 'UPDATE_NOTE': {
      const oldNote = state.notes.notes.find(note => note.id === action.payload.id);
      const newNote = action.payload;
      
      // Update image references if content changed
      let updatedImageStorage = state.imageStorage;
      if (oldNote && oldNote.content !== newNote.content) {
        // Parse old and new image references
        const oldImageRefs = parseImageReferences(oldNote.content);
        const newImageRefs = parseImageReferences(newNote.content);
        
        // Remove old references
        oldImageRefs.forEach(ref => {
          updatedImageStorage = updateImageUsage(
            ref.imageId,
            oldNote.id,
            updatedImageStorage,
            false
          );
        });
        
        // Add new references
        newImageRefs.forEach(ref => {
          updatedImageStorage = updateImageUsage(
            ref.imageId,
            newNote.id,
            updatedImageStorage,
            true
          );
        });
        
        // Save updated image storage
        if (updatedImageStorage !== state.imageStorage) {
          saveImageStorage(updatedImageStorage);
        }
      }
      
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.id ? action.payload : note
          ),
          selectedNote: state.notes.selectedNote?.id === action.payload.id 
            ? action.payload 
            : state.notes.selectedNote
        },
        imageStorage: updatedImageStorage
      };
    }
    
    case 'DELETE_NOTE': {
      const noteToDelete = state.notes.notes.find(note => note.id === action.payload);
      
      // Update image references when note is deleted
      let updatedImageStorage = state.imageStorage;
      if (noteToDelete) {
        const imageRefs = parseImageReferences(noteToDelete.content);
        imageRefs.forEach(ref => {
          updatedImageStorage = updateImageUsage(
            ref.imageId,
            noteToDelete.id,
            updatedImageStorage,
            false
          );
        });
        
        // Save updated image storage
        if (updatedImageStorage !== state.imageStorage) {
          saveImageStorage(updatedImageStorage);
        }
      }
      
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.filter(note => note.id !== action.payload),
          selectedNote: state.notes.selectedNote?.id === action.payload 
            ? null 
            : state.notes.selectedNote
        },
        noteLinks: state.noteLinks.filter(link => 
          link.fromId !== action.payload && link.toId !== action.payload
        ),
        imageStorage: updatedImageStorage
      };
    }
    
    case 'SELECT_NOTE':
      return { 
        ...state, 
        notes: { ...state.notes, selectedNote: action.payload } 
      };
    
    case 'SET_NOTES_EDITING':
      return { 
        ...state, 
        notes: { ...state.notes, isEditing: action.payload } 
      };
    
    case 'SET_NOTES_SEARCH':
      return { 
        ...state, 
        notes: { ...state.notes, searchQuery: action.payload } 
      };
    
    case 'SET_NOTES_TAG_FILTERS':
      return { 
        ...state, 
        notes: { ...state.notes, selectedTags: action.payload } 
      };
    
    case 'TOGGLE_NOTE_TAG_FILTER':
      const currentNoteTags = state.notes.selectedTags;
      const newNoteTags = currentNoteTags.includes(action.payload)
        ? currentNoteTags.filter(tag => tag !== action.payload)
        : [...currentNoteTags, action.payload];
      return { 
        ...state, 
        notes: { ...state.notes, selectedTags: newNoteTags } 
      };
    
    case 'CLEAR_NOTES_TAG_FILTERS':
      return { 
        ...state, 
        notes: { ...state.notes, selectedTags: [] } 
      };
    
    case 'SET_NOTES_VIEW':
      return { 
        ...state, 
        notes: { ...state.notes, view: action.payload } 
      };
    
    case 'SET_NOTES_SORT':
      return { 
        ...state, 
        notes: { 
          ...state.notes, 
          sortBy: action.payload.sortBy,
          sortOrder: action.payload.sortOrder
        } 
      };
    
    case 'TOGGLE_NOTES_ARCHIVED':
      return { 
        ...state, 
        notes: { ...state.notes, showArchived: !state.notes.showArchived } 
      };
    
    case 'TOGGLE_LINK_PREVIEWS':
      return { 
        ...state, 
        notes: { ...state.notes, showLinkPreviews: !state.notes.showLinkPreviews } 
      };
    
    case 'SET_EDITOR_MODE':
      return { 
        ...state, 
        notes: { ...state.notes, editorMode: action.payload } 
      };
    
    case 'ARCHIVE_NOTE':
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload ? { ...note, archived: true } : note
          )
        }
      };
    
    case 'PIN_NOTE':
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload ? { ...note, pinned: true } : note
          )
        }
      };
    
    case 'UNPIN_NOTE':
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload ? { ...note, pinned: false } : note
          )
        }
      };
    
    case 'SET_DAILY_NOTES_MODE':
      return {
        ...state,
        notes: {
          ...state.notes,
          dailyNotesMode: action.payload
        }
      };

    case 'SET_EMAIL_MODE':
      return {
        ...state,
        notes: {
          ...state.notes,
          emailMode: action.payload
        }
      };
    

    
    // Deprecated: SET_DAILY_NOTE_DATE (replaced by SET_SELECTED_DAILY_NOTE_DATE)
    
    // Note linking cases
    case 'ADD_NOTE_LINK':
      return { 
        ...state, 
        noteLinks: [...state.noteLinks, action.payload] 
      };
    
    case 'REMOVE_NOTE_LINK':
      return { 
        ...state, 
        noteLinks: state.noteLinks.filter(link => link.id !== action.payload) 
      };
    
    case 'LINK_NOTE_TO_TASK':
      const noteToLinkToTask = state.notes.notes.find(note => note.id === action.payload.noteId);
      const taskToLinkToNote = state.tasks.find(task => task.id === action.payload.taskId);
      if (!noteToLinkToTask || !taskToLinkToNote) return state;
      
      // Check if already linked
      const isAlreadyLinkedInNote = noteToLinkToTask.linkedTasks.includes(action.payload.taskId);
      const isAlreadyLinkedInTask = (taskToLinkToNote.linkedNotes || []).includes(action.payload.noteId);
      
      if (isAlreadyLinkedInNote && isAlreadyLinkedInTask) return state;
      
      const newTaskLink: NoteLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: action.payload.noteId,
        toId: action.payload.taskId,
        fromType: 'note',
        toType: 'task',
        createdAt: new Date().toISOString()
      };
      
      return {
        ...state,
        noteLinks: [...state.noteLinks, newTaskLink],
        // Update note
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, linkedTasks: [...(new Set([...note.linkedTasks, action.payload.taskId]))] }
              : note
          )
        },
        // Update task (bidirectional)
        tasks: state.tasks.map(task =>
          task.id === action.payload.taskId
            ? { ...task, linkedNotes: [...(new Set([...(task.linkedNotes || []), action.payload.noteId]))] }
            : task
        )
      };
    
    case 'UNLINK_NOTE_FROM_TASK':
      return {
        ...state,
        noteLinks: state.noteLinks.filter(link => 
          !(link.fromId === action.payload.noteId && 
            link.toId === action.payload.taskId &&
            link.fromType === 'note' &&
            link.toType === 'task')
        ),
        // Update note
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, linkedTasks: note.linkedTasks.filter(taskId => taskId !== action.payload.taskId) }
              : note
          )
        },
        // Update task (bidirectional)
        tasks: state.tasks.map(task =>
          task.id === action.payload.taskId
            ? { ...task, linkedNotes: (task.linkedNotes || []).filter(noteId => noteId !== action.payload.noteId) }
            : task
        )
      };
    
    case 'LINK_TASK_TO_NOTE':
      // Same as LINK_NOTE_TO_TASK but with swapped parameters
      return appReducer(state, { 
        type: 'LINK_NOTE_TO_TASK', 
        payload: { noteId: action.payload.noteId, taskId: action.payload.taskId } 
      });
    
    case 'UNLINK_TASK_FROM_NOTE':
      // Same as UNLINK_NOTE_FROM_TASK but with swapped parameters
      return appReducer(state, { 
        type: 'UNLINK_NOTE_FROM_TASK', 
        payload: { noteId: action.payload.noteId, taskId: action.payload.taskId } 
      });

    case 'LINK_NOTE_TO_NOTE':
      const sourceNote = state.notes.notes.find(note => note.id === action.payload.noteId);
      const targetNote = state.notes.notes.find(note => note.id === action.payload.linkedNoteId);
      if (!sourceNote || !targetNote) return state;
      
      // Check if already linked
      const isAlreadyLinkedSourceToTarget = sourceNote.linkedNotes.includes(action.payload.linkedNoteId);
      const isAlreadyLinkedTargetToSource = targetNote.linkedNotes.includes(action.payload.noteId);
      
      if (isAlreadyLinkedSourceToTarget && isAlreadyLinkedTargetToSource) return state;
      
      const newNoteToNoteLink: NoteLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: action.payload.noteId,
        toId: action.payload.linkedNoteId,
        fromType: 'note',
        toType: 'note',
        createdAt: new Date().toISOString()
      };
      
      return {
        ...state,
        noteLinks: [...state.noteLinks, newNoteToNoteLink],
        // Update both notes (bidirectional)
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note => {
            if (note.id === action.payload.noteId) {
              return { ...note, linkedNotes: [...(new Set([...note.linkedNotes, action.payload.linkedNoteId]))] };
            }
            if (note.id === action.payload.linkedNoteId) {
              return { ...note, linkedNotes: [...(new Set([...note.linkedNotes, action.payload.noteId]))] };
            }
            return note;
          })
        }
      };
    
    case 'UNLINK_NOTE_FROM_NOTE':
      return {
        ...state,
        noteLinks: state.noteLinks.filter(link => 
          !(link.fromId === action.payload.noteId && 
            link.toId === action.payload.linkedNoteId &&
            link.fromType === 'note' &&
            link.toType === 'note') &&
          !(link.fromId === action.payload.linkedNoteId && 
            link.toId === action.payload.noteId &&
            link.fromType === 'note' &&
            link.toType === 'note')
        ),
        // Update both notes (bidirectional)
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note => {
            if (note.id === action.payload.noteId) {
              return { ...note, linkedNotes: note.linkedNotes.filter(noteId => noteId !== action.payload.linkedNoteId) };
            }
            if (note.id === action.payload.linkedNoteId) {
              return { ...note, linkedNotes: note.linkedNotes.filter(noteId => noteId !== action.payload.noteId) };
            }
            return note;
          })
        }
      };
    
    case 'LINK_NOTES':
      const fromNote = state.notes.notes.find(note => note.id === action.payload.fromNoteId);
      const toNote = state.notes.notes.find(note => note.id === action.payload.toNoteId);
      if (!fromNote || !toNote) return state;
      
      const noteLinkExists = state.noteLinks.some(link => 
        link.fromId === action.payload.fromNoteId && 
        link.toId === action.payload.toNoteId &&
        link.fromType === 'note' &&
        link.toType === 'note'
      );
      
      if (noteLinkExists) return state;
      
      const newNoteLink: NoteLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: action.payload.fromNoteId,
        toId: action.payload.toNoteId,
        fromType: 'note',
        toType: 'note',
        createdAt: new Date().toISOString()
      };
      
      return {
        ...state,
        noteLinks: [...state.noteLinks, newNoteLink],
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note => {
            if (note.id === action.payload.fromNoteId) {
              return { ...note, linkedNotes: [...note.linkedNotes, action.payload.toNoteId] };
            }
            if (note.id === action.payload.toNoteId) {
              return { ...note, linkedNotes: [...note.linkedNotes, action.payload.fromNoteId] };
            }
            return note;
          })
        }
      };
    
    case 'UNLINK_NOTES':
      return {
        ...state,
        noteLinks: state.noteLinks.filter(link => 
          !(link.fromId === action.payload.fromNoteId && 
            link.toId === action.payload.toNoteId &&
            link.fromType === 'note' &&
            link.toType === 'note')
        ),
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note => {
            if (note.id === action.payload.fromNoteId) {
              return { ...note, linkedNotes: note.linkedNotes.filter(noteId => noteId !== action.payload.toNoteId) };
            }
            if (note.id === action.payload.toNoteId) {
              return { ...note, linkedNotes: note.linkedNotes.filter(noteId => noteId !== action.payload.fromNoteId) };
            }
            return note;
          })
        }
      };

    case 'LINK_NOTE_TO_PROJECT':
      const noteToLinkToProject = state.notes.notes.find(note => note.id === action.payload.noteId);
      const projectToLinkToNote = state.columns.find(col => col.id === action.payload.projectId && col.type === 'project');
      if (!noteToLinkToProject || !projectToLinkToNote) return state;
      
      // Check if already linked
      const isAlreadyLinkedNoteToProject = (noteToLinkToProject.linkedProjects || []).includes(action.payload.projectId);
      const isAlreadyLinkedProjectToNote = (projectToLinkToNote.linkedNotes || []).includes(action.payload.noteId);
      
      if (isAlreadyLinkedNoteToProject && isAlreadyLinkedProjectToNote) return state;
      
      const newProjectLink: NoteLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: action.payload.noteId,
        toId: action.payload.projectId,
        fromType: 'note',
        toType: 'project',
        createdAt: new Date().toISOString()
      };
      
      return {
        ...state,
        noteLinks: [...state.noteLinks, newProjectLink],
        // Update note
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, linkedProjects: [...(new Set([...(note.linkedProjects || []), action.payload.projectId]))] }
              : note
          )
        },
        // Update project (bidirectional)
        columns: state.columns.map(col =>
          col.id === action.payload.projectId
            ? { ...col, linkedNotes: [...(new Set([...(col.linkedNotes || []), action.payload.noteId]))] }
            : col
        )
      };
    
    case 'UNLINK_NOTE_FROM_PROJECT':
      return {
        ...state,
        noteLinks: state.noteLinks.filter(link => 
          !(link.fromId === action.payload.noteId && 
            link.toId === action.payload.projectId &&
            link.fromType === 'note' &&
            link.toType === 'project')
        ),
        // Update note
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, linkedProjects: (note.linkedProjects || []).filter(projectId => projectId !== action.payload.projectId) }
              : note
          )
        },
        // Update project (bidirectional)
        columns: state.columns.map(col =>
          col.id === action.payload.projectId
            ? { ...col, linkedNotes: (col.linkedNotes || []).filter(noteId => noteId !== action.payload.noteId) }
            : col
        )
      };

    case 'PIN_NOTE_TO_PROJECT':
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, pinnedToProjects: [...(new Set([...(note.pinnedToProjects || []), action.payload.projectId]))] }
              : note
          )
        }
      };

    case 'UNPIN_NOTE_FROM_PROJECT':
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: state.notes.notes.map(note =>
            note.id === action.payload.noteId 
              ? { ...note, pinnedToProjects: (note.pinnedToProjects || []).filter(projectId => projectId !== action.payload.projectId) }
              : note
          )
        }
      };

    
    // Notification actions
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload ? { ...notification, read: true } : notification
        ),
      };
    
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return { ...state, notifications: [] };
    
    // Project Kanban actions
    case 'SET_PROJECT_KANBAN_SELECTED_PROJECT':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            selectedProjectId: action.payload,
          },
        },
      };
    
    case 'SET_PROJECT_KANBAN_SEARCH':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            searchQuery: action.payload,
          },
        },
      };
    
    case 'SET_PROJECT_KANBAN_PRIORITY_FILTERS':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            priorityFilters: action.payload,
          },
        },
      };
    
    case 'SET_PROJECT_KANBAN_TAG_FILTERS':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            tagFilters: action.payload,
          },
        },
      };
    
    case 'SET_PROJECT_KANBAN_SHOW_COMPLETED':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            showCompleted: action.payload,
          },
        },
      };
    
    case 'SET_PROJECT_KANBAN_VIEW_TYPE':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            viewType: action.payload,
          },
        },
      };
    
    case 'ADD_PROJECT_KANBAN_COLUMN': {
      // Generate a truly unique ID with timestamp + random component
      const uniqueId = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newColumn: ProjectKanbanColumn = {
        id: uniqueId,
        title: action.payload.title,
        projectId: action.payload.projectId,
        color: action.payload.color,
        order: state.viewState.projectKanban.columns.filter(col => col.projectId === action.payload.projectId).length,
        isDefault: state.viewState.projectKanban.columns.filter(col => col.projectId === action.payload.projectId).length === 0,
      };
      
      console.log(`✅ Creating kanban column: "${newColumn.title}" with ID: ${uniqueId} for project: ${action.payload.projectId}`);
      
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: [...state.viewState.projectKanban.columns, newColumn],
          },
        },
      };
    }
    
    case 'ADD_PROJECT_KANBAN_COLUMN_WITH_ID': {
      const newColumn: ProjectKanbanColumn = {
        id: action.payload.id,
        title: action.payload.title,
        projectId: action.payload.projectId,
        color: action.payload.color,
        order: action.payload.order,
        isDefault: false,
      };
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: [...state.viewState.projectKanban.columns, newColumn],
          },
        },
      };
    }
    
    case 'SET_PROJECT_KANBAN_COLUMNS': {
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: action.payload,
          },
        },
      };
    }
    
    case 'UPDATE_PROJECT_KANBAN_COLUMN':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: state.viewState.projectKanban.columns.map(col =>
              col.id === action.payload.columnId
                ? { ...col, title: action.payload.title, color: action.payload.color }
                : col
            ),
          },
        },
      };
    
    case 'DELETE_PROJECT_KANBAN_COLUMN':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: state.viewState.projectKanban.columns.filter(col => col.id !== action.payload),
          },
        },
      };
    
    case 'REORDER_PROJECT_KANBAN_COLUMNS':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: state.viewState.projectKanban.columns.map(col => {
              if (col.projectId === action.payload.projectId) {
                const newOrder = action.payload.columnIds.indexOf(col.id);
                return { ...col, order: newOrder };
              }
              return col;
            }),
          },
        },
      };
    
    case 'MOVE_TASK_TO_KANBAN_COLUMN':
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id === action.payload.taskId) {
            return {
              ...task,
              kanbanColumnId: action.payload.kanbanColumnId,
              position: action.payload.newPosition
            };
          }
          // Adjust positions of other tasks in the same column
          if (action.payload.kanbanColumnId && task.kanbanColumnId === action.payload.kanbanColumnId && task.position >= action.payload.newPosition && task.id !== action.payload.taskId) {
            return {
              ...task,
              position: task.position + 1
            };
          }
          return task;
        }),
      };
    
    case 'REORDER_PROJECTS':
      return {
        ...state,
        columns: state.columns.map(col => {
          if (col.type === 'project') {
            const newOrder = action.payload.projectIds.indexOf(col.id);
            return newOrder >= 0 ? { ...col, order: newOrder } : col;
          }
          return col;
        }),
      };
    
    case 'UPDATE_PROJECT_TITLE':
      return {
        ...state,
        columns: state.columns.map(col => {
          if (col.id === action.payload.projectId) {
            return { ...col, title: action.payload.title };
          }
          return col;
        }),
      };
    
    case 'DELETE_PROJECT':
      // Delete the project column and permanently delete all tasks in it
      return {
        ...state,
        columns: state.columns.filter(col => col.id !== action.payload),
        tasks: state.tasks.filter(task => 
          task.columnId !== action.payload && 
          !state.viewState.projectKanban.columns.some(col => 
            col.projectId === action.payload && col.id === task.kanbanColumnId
          )
        ),
        // Also clear the project from project kanban state if it was selected
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            selectedProjectId: state.viewState.projectKanban.selectedProjectId === action.payload 
              ? null 
              : state.viewState.projectKanban.selectedProjectId,
            columns: state.viewState.projectKanban.columns.filter(col => col.projectId !== action.payload)
          }
        },
      };
    
    case 'PIN_PROJECT':
      return {
        ...state,
        columns: state.columns.map(col =>
          col.id === action.payload ? { ...col, isPinned: true } : col
        ),
      };
    
    case 'UNPIN_PROJECT':
      return {
        ...state,
        columns: state.columns.map(col =>
          col.id === action.payload ? { ...col, isPinned: false } : col
        ),
      };
    
    case 'SET_NOTE_EDITOR_FULLSCREEN':
      return {
        ...state,
        isNoteEditorFullScreen: action.payload,
      };

    case 'ENSURE_DATE_COLUMN': {
      const dateStr = action.payload;
      const columnId = `date-${dateStr}`;
      
      // Check if column already exists
      if (state.columns.some(col => col.id === columnId)) {
        return state;
      }
      
      // Create new date column
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateStr);
        return state;
      }
      
      const newColumn: Column = {
        id: columnId,
        title: format(date, 'dd.MM.yyyy'),
        type: 'date',
        date: dateStr,
        order: state.columns.filter(col => col.type === 'date').length + 1,
        tasks: [],
      };
      
      const updatedColumns = [...state.columns, newColumn];
      
      // Sort date columns by date to maintain chronological order
      const dateColumns = updatedColumns.filter(col => col.type === 'date');
      const projectColumns = updatedColumns.filter(col => col.type === 'project');
      
      dateColumns.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Update order for sorted date columns
      dateColumns.forEach((col, index) => {
        col.order = index + 1;
      });
      
      return {
        ...state,
        columns: [...dateColumns, ...projectColumns]
      };
    }
    
    // Image storage actions
    case 'SET_IMAGE_STORAGE':
      return {
        ...state,
        imageStorage: action.payload
      };
    
    case 'ADD_IMAGE': {
      const updatedImageStorage = {
        ...state.imageStorage,
        images: [...state.imageStorage.images, action.payload],
        totalSize: state.imageStorage.totalSize + action.payload.size
      };
      saveImageStorage(updatedImageStorage);
      return {
        ...state,
        imageStorage: updatedImageStorage
      };
    }
    
    case 'REMOVE_IMAGE': {
      const imageToRemove = state.imageStorage.images.find(img => img.id === action.payload);
      if (!imageToRemove) return state;
      
      const updatedImageStorage = {
        ...state.imageStorage,
        images: state.imageStorage.images.filter(img => img.id !== action.payload),
        totalSize: state.imageStorage.totalSize - imageToRemove.size
      };
      saveImageStorage(updatedImageStorage);
      return {
        ...state,
        imageStorage: updatedImageStorage
      };
    }
    
    case 'UPDATE_IMAGE_USAGE': {
      const updatedImageStorage = updateImageUsage(
        action.payload.imageId,
        action.payload.noteId,
        state.imageStorage,
        action.payload.isUsed
      );
      saveImageStorage(updatedImageStorage);
      return {
        ...state,
        imageStorage: updatedImageStorage
      };
    }
    
    case 'CLEANUP_UNUSED_IMAGES': {
      const updatedImageStorage = cleanupUnusedImages(state.imageStorage);
      if (updatedImageStorage.images.length !== state.imageStorage.images.length) {
        saveImageStorage(updatedImageStorage);
      }
      return {
        ...state,
        imageStorage: updatedImageStorage
      };
    }
    
    // Recurring tasks actions
    case 'SET_RECURRENCE_RULES':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          rules: action.payload
        }
      };
    
    case 'ADD_RECURRENCE_RULE':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          rules: [...state.recurrence.rules, action.payload]
        }
      };
    
    case 'UPDATE_RECURRENCE_RULE':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          rules: state.recurrence.rules.map(rule =>
            rule.id === action.payload.id ? action.payload : rule
          )
        }
      };
    
    case 'DELETE_RECURRENCE_RULE':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          rules: state.recurrence.rules.filter(rule => rule.id !== action.payload),
          activeRule: state.recurrence.activeRule?.id === action.payload ? null : state.recurrence.activeRule
        }
      };
    
    case 'SET_ACTIVE_RECURRENCE_RULE':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          activeRule: action.payload
        }
      };
    
    case 'GENERATE_RECURRING_TASKS': {
      const { ruleId, tasks } = action.payload;
      const rule = state.recurrence.rules.find(r => r.id === ruleId);
      if (!rule) return state;
      
      // Update rule stats
      const updatedRule = {
        ...rule,
        stats: {
          ...rule.stats,
          totalGenerated: rule.stats.totalGenerated + tasks.length,
          lastGenerated: new Date().toISOString()
        }
      };
      
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          rules: state.recurrence.rules.map(r => r.id === ruleId ? updatedRule : r),
          generatedTasks: [...state.recurrence.generatedTasks, ...tasks],
          upcomingTasks: [...state.recurrence.upcomingTasks, ...tasks]
        }
      };
    }
    
    case 'UPDATE_RECURRING_TASK':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          generatedTasks: state.recurrence.generatedTasks.map(task =>
            task.id === action.payload.id ? action.payload : task
          ),
          upcomingTasks: state.recurrence.upcomingTasks.map(task =>
            task.id === action.payload.id ? action.payload : task
          )
        }
      };
    
    case 'COMPLETE_RECURRING_TASK': {
      const taskId = action.payload;
      const task = state.recurrence.generatedTasks.find(t => t.id === taskId);
      if (!task) return state;
      
      const completedTask = { ...task, completed: true, completedAt: new Date().toISOString() };
      
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          generatedTasks: state.recurrence.generatedTasks.map(t =>
            t.id === taskId ? completedTask : t
          ),
          upcomingTasks: state.recurrence.upcomingTasks.filter(t => t.id !== taskId),
          completedTasks: [...state.recurrence.completedTasks, completedTask]
        }
      };
    }
    
    case 'SKIP_RECURRING_TASK': {
      const taskId = action.payload;
      const task = state.recurrence.generatedTasks.find(t => t.id === taskId);
      if (!task) return state;
      
      const skippedTask = { ...task, completed: false };
      
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          upcomingTasks: state.recurrence.upcomingTasks.filter(t => t.id !== taskId),
          skippedTasks: [...state.recurrence.skippedTasks, skippedTask]
        }
      };
    }
    
    case 'RESCHEDULE_RECURRING_TASK': {
      const { taskId, newDate } = action.payload;
      const task = state.recurrence.generatedTasks.find(t => t.id === taskId);
      if (!task) return state;
      
      const rescheduledTask = { 
        ...task, 
        scheduledDate: newDate,
        rescheduledFrom: task.scheduledDate,
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          generatedTasks: state.recurrence.generatedTasks.map(t =>
            t.id === taskId ? rescheduledTask : t
          ),
          upcomingTasks: state.recurrence.upcomingTasks.map(t =>
            t.id === taskId ? rescheduledTask : t
          )
        }
      };
    }
    
    case 'SET_RECURRENCE_SHOW_COMPLETED':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          showCompleted: action.payload
        }
      };
    
    case 'SET_RECURRENCE_SHOW_SKIPPED':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          showSkipped: action.payload
        }
      };
    
    case 'SET_RECURRENCE_TIMEFRAME':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          selectedTimeframe: action.payload
        }
      };
    
    case 'SET_RECURRENCE_SORT':
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          sortBy: action.payload.sortBy,
          sortOrder: action.payload.sortOrder
        }
      };
    
    case 'CLEANUP_RECURRING_TASKS': {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      return {
        ...state,
        recurrence: {
          ...state.recurrence,
          completedTasks: state.recurrence.completedTasks.filter(task => 
            task.completedAt ? new Date(task.completedAt) > cutoffDate : true
          ),
          skippedTasks: state.recurrence.skippedTasks.filter(task => 
            task.createdAt ? new Date(task.createdAt) > cutoffDate : true
          )
        }
      };
    }
    
    // Calendar events actions
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload
      };
    
    case 'ADD_EVENTS':
      return {
        ...state,
        events: [...state.events, ...action.payload]
      };
    
    case 'SYNC_EVENTS': {
      const { events: newEvents, sourceId } = action.payload;
      
      // Remove existing events from this source
      const sourceUrl = state.calendarSources.find(s => s.id === sourceId)?.url;
      const filteredEvents = state.events.filter(event => 
        event.calendarUrl !== sourceUrl
      );
      
      // Add new events, but check for duplicates by UID or ID within the same source
      const uniqueNewEvents = newEvents.filter((newEvent, index, arr) => {
        if (newEvent.uid) {
          const firstUidIndex = arr.findIndex(e => e.uid === newEvent.uid);
          return index === firstUidIndex;
        }
        const firstIdIndex = arr.findIndex(e => e.id === newEvent.id);
        return index === firstIdIndex;
      });
      
      return {
        ...state,
        events: [...filteredEvents, ...uniqueNewEvents]
      };
    }
    
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event => 
          event.id === action.payload.id ? action.payload : event
        )
      };
    
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      };
    
    case 'CLEAR_EVENTS':
      return {
        ...state,
        events: []
      };
    
    case 'SET_CALENDAR_SOURCES':
      return {
        ...state,
        calendarSources: action.payload
      };
    
    case 'ADD_CALENDAR_SOURCE':
      return {
        ...state,
        calendarSources: [...state.calendarSources, action.payload]
      };
    
    case 'UPDATE_CALENDAR_SOURCE':
      return {
        ...state,
        calendarSources: state.calendarSources.map(source => 
          source.id === action.payload.id ? action.payload : source
        )
      };
    
    case 'DELETE_CALENDAR_SOURCE':
      return {
        ...state,
        calendarSources: state.calendarSources.filter(source => source.id !== action.payload),
        events: state.events.filter(event => !state.calendarSources.find(s => s.id === action.payload)?.url || event.calendarUrl !== state.calendarSources.find(s => s.id === action.payload)?.url)
      };
    
    case 'SYNC_CALENDAR':
      // This will be handled by the sync service
      return state;
    
    case 'TOGGLE_EVENT_VISIBILITY': {
      const eventId = action.payload;
      const currentHiddenEvents = state.preferences.calendars?.hiddenEvents || [];
      
      let newHiddenEvents: string[];
      if (currentHiddenEvents.includes(eventId)) {
        // Remove from hidden (show event)
        newHiddenEvents = currentHiddenEvents.filter(id => id !== eventId);
      } else {
        // Add to hidden (hide event)
        newHiddenEvents = [...currentHiddenEvents, eventId];
      }
      
      return {
        ...state,
        preferences: {
          ...state.preferences,
          calendars: {
            ...state.preferences.calendars,
            hiddenEvents: newHiddenEvents
          }
        }
      };
    }

    case 'TOGGLE_EVENT_COLLAPSE': {
      const eventId = action.payload;
      const currentCollapsedEvents = state.preferences.calendars?.collapsedEvents || [];
      
      let newCollapsedEvents: string[];
      if (currentCollapsedEvents.includes(eventId)) {
        // Remove from collapsed (expand event)
        newCollapsedEvents = currentCollapsedEvents.filter(id => id !== eventId);
      } else {
        // Add to collapsed (collapse event)
        newCollapsedEvents = [...currentCollapsedEvents, eventId];
      }
      
      return {
        ...state,
        preferences: {
          ...state.preferences,
          calendars: {
            ...state.preferences.calendars,
            collapsedEvents: newCollapsedEvents
          }
        }
      };
    }
    
    case 'ENSURE_PLANNED_COLUMN': {
      const projectId = action.payload;
      const plannedColumnTitle = 'Geplant';
      
      // Check if a "Geplant" column already exists for this project
      const existingPlannedColumn = state.viewState.projectKanban.columns.find(
        col => col.projectId === projectId && col.title === plannedColumnTitle
      );
      
      if (existingPlannedColumn) {
        // Column already exists, no need to create it
        return state;
      }
      
      // Create new "Geplant" column
      const uniqueId = `planned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newPlannedColumn: ProjectKanbanColumn = {
        id: uniqueId,
        title: plannedColumnTitle,
        projectId: projectId,
        color: '#3B82F6', // Blue color for planning
        order: state.viewState.projectKanban.columns.filter(col => col.projectId === projectId).length,
        isDefault: false,
      };
      
      console.log(`✅ Auto-creating "Geplant" column with ID: ${uniqueId} for project: ${projectId}`);
      
      return {
        ...state,
        viewState: {
          ...state.viewState,
          projectKanban: {
            ...state.viewState.projectKanban,
            columns: [...state.viewState.projectKanban.columns, newPlannedColumn],
          },
        },
      };
    }
    
    // Bulk operations actions
    case 'TOGGLE_BULK_MODE':
      return { 
        ...state, 
        isBulkMode: !state.isBulkMode,
        // Clear selection when toggling off
        selectedTaskIds: !state.isBulkMode ? state.selectedTaskIds : []
      };
    
    case 'SELECT_TASK':
      // Don't add duplicates
      if (state.selectedTaskIds.includes(action.payload)) {
        return state;
      }
      return { 
        ...state, 
        selectedTaskIds: [...state.selectedTaskIds, action.payload],
        isBulkMode: true
      };
    
    case 'DESELECT_TASK':
      return { 
        ...state, 
        selectedTaskIds: state.selectedTaskIds.filter(id => id !== action.payload)
      };
    
    case 'SELECT_ALL_TASKS':
      return { 
        ...state, 
        selectedTaskIds: action.payload,
        isBulkMode: true
      };
    
    case 'CLEAR_SELECTION':
      return { 
        ...state, 
        selectedTaskIds: []
      };
    
    case 'BULK_DELETE_TASKS':
      return { 
        ...state, 
        tasks: state.tasks.filter(task => !action.payload.includes(task.id)),
        selectedTaskIds: [],
        isBulkMode: false
      };
    
    case 'BULK_UPDATE_PRIORITY':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          (action.payload.taskIds || []).includes(task.id) 
            ? { ...task, priority: action.payload.priority } 
            : task
        )
      };
    
    case 'BULK_ADD_TAG':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          (action.payload.taskIds || []).includes(task.id) 
            ? { 
                ...task, 
                tags: (task.tags || []).includes(action.payload.tagId) 
                  ? task.tags 
                  : [...(task.tags || []), action.payload.tagId]
              } 
            : task
        )
      };
    
    case 'BULK_REMOVE_TAG':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          (action.payload.taskIds || []).includes(task.id) 
            ? { 
                ...task, 
                tags: (task.tags || []).filter(tagId => tagId !== action.payload.tagId)
              } 
            : task
        )
      };
    
    case 'BULK_COMPLETE_TASKS':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          (action.payload || []).includes(task.id) 
            ? { ...task, completed: true, completedDate: new Date().toISOString() } 
            : task
        )
      };
    
    case 'BULK_UNCOMPLETE_TASKS':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          (action.payload || []).includes(task.id) 
            ? { ...task, completed: false, completedDate: undefined } 
            : task
        )
      };
    
    case 'BULK_ARCHIVE_TASKS':
      const tasksToArchive = state.tasks.filter(task => (action.payload || []).includes(task.id));
      return { 
        ...state, 
        tasks: state.tasks.filter(task => !(action.payload || []).includes(task.id)),
        archivedTasks: [...state.archivedTasks, ...tasksToArchive],
        selectedTaskIds: [],
        isBulkMode: false
      };
    
    case 'BULK_MOVE_TASKS':
      return { 
        ...state, 
        tasks: state.tasks.map(task => {
          if (!(action.payload.taskIds || []).includes(task.id)) {
            return task;
          }
          
          const targetColumnId = action.payload.columnId;
          const updatedTask = { ...task };
          
          // Clear all location-specific fields first
          updatedTask.columnId = undefined;
          updatedTask.projectId = undefined;
          updatedTask.kanbanColumnId = undefined;
          updatedTask.reminderDate = undefined;
          
          // Set appropriate fields based on target column type
          if (targetColumnId.startsWith('date-')) {
            // Moving to date column - set columnId and reminderDate
            const dateString = targetColumnId.replace('date-', '');
            updatedTask.columnId = targetColumnId;
            updatedTask.reminderDate = dateString;
          } else if (targetColumnId === 'inbox') {
            // Moving to inbox
            updatedTask.columnId = 'inbox';
          } else {
            // Moving to regular column (project or custom)
            const targetColumn = state.columns.find(col => col.id === targetColumnId);
            if (targetColumn?.type === 'project') {
              updatedTask.projectId = targetColumnId;
            } else {
              updatedTask.columnId = targetColumnId;
            }
          }
          
          updatedTask.updatedAt = new Date().toISOString();
          return updatedTask;
        })
      };

    // Pin system cases
    case 'SET_PIN_COLUMNS':
      return { ...state, pinColumns: action.payload };

    case 'ADD_PIN_COLUMN':
      return { 
        ...state, 
        pinColumns: [...state.pinColumns, action.payload]
      };

    case 'UPDATE_PIN_COLUMN':
      return { 
        ...state, 
        pinColumns: state.pinColumns.map(col => 
          col.id === action.payload.id ? action.payload : col
        )
      };

    case 'DELETE_PIN_COLUMN':
      return { 
        ...state, 
        pinColumns: state.pinColumns.filter(col => col.id !== action.payload),
        // Remove pin assignments from tasks when column is deleted
        tasks: state.tasks.map(task => 
          task.pinColumnId === action.payload 
            ? { ...task, pinColumnId: undefined, pinned: false, updatedAt: new Date().toISOString() }
            : task
        )
      };

    case 'REORDER_PIN_COLUMNS':
      return { ...state, pinColumns: action.payload };

    case 'ASSIGN_TASK_TO_PIN':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          task.id === action.payload.taskId 
            ? { 
                ...task, 
                pinColumnId: action.payload.pinColumnId, 
                pinned: true, // Keep backward compatibility
                updatedAt: new Date().toISOString() 
              }
            : task
        )
      };

    case 'UNPIN_TASK':
      return { 
        ...state, 
        tasks: state.tasks.map(task => 
          task.id === action.payload 
            ? { 
                ...task, 
                pinColumnId: undefined, 
                pinned: false, 
                updatedAt: new Date().toISOString() 
              }
            : task
        )
      };

    // Checklist cases
    case 'ADD_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: [action.payload, ...state.checklistItems]
      };

    case 'UPDATE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.map(item =>
          item.id === action.payload.id ? action.payload : item
        )
      };

    case 'DELETE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.filter(item => item.id !== action.payload)
      };

    case 'SET_CHECKLIST_ITEMS':
      return {
        ...state,
        checklistItems: action.payload
      };

    case 'SET_PERSONAL_CAPACITY':
      return {
        ...state,
        personalCapacity: action.payload
      };

    case 'UPDATE_PERSONAL_CAPACITY':
      return {
        ...state,
        personalCapacity: action.payload
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoize task provider to prevent unnecessary re-creations
  const taskProvider = useCallback((taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return null;
    
    return {
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      tags: task.tags
    };
  }, [state.tasks]);

  // Initialize timer service with preferences (optimized)
  useEffect(() => {
    timerService.initialize(state.preferences);
    timerService.setTaskProvider(taskProvider);
  }, [state.preferences, taskProvider]);

  // Function to repair duplicate kanban column IDs
  const repairDuplicateKanbanColumnIds = (currentState: AppState) => {
    console.log('🔧 Checking for duplicate kanban column IDs...');
    
    const columns = currentState.viewState.projectKanban.columns;
    const idCounts = new Map<string, ProjectKanbanColumn[]>();
    
    // Group columns by ID
    columns.forEach(column => {
      if (!idCounts.has(column.id)) {
        idCounts.set(column.id, []);
      }
      idCounts.get(column.id)!.push(column);
    });
    
    // Find duplicates
    const duplicates = Array.from(idCounts.entries()).filter(([id, cols]) => cols.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate kanban column IDs found');
      return;
    }
    
    console.log(`🚨 Found ${duplicates.length} duplicate kanban column ID(s) - need to rebuild columns`);
    
    // Create a completely new column list with unique IDs
    const newColumns: ProjectKanbanColumn[] = [];
    const processedIds = new Set<string>();
    
    columns.forEach(column => {
      if (!processedIds.has(column.id)) {
        // First occurrence - keep original ID
        newColumns.push(column);
        processedIds.add(column.id);
      } else {
        // Duplicate - generate new unique ID
        const newId = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${newColumns.length}`;
        console.log(`  📋 Renaming "${column.title}" from ${column.id} to ${newId}`);
        
        newColumns.push({
          ...column,
          id: newId
        });
      }
    });
    
    // Update all columns at once
    dispatch({
      type: 'SET_PROJECT_KANBAN_COLUMNS',
      payload: newColumns
    });
    
    console.log('✅ Duplicate kanban column IDs repair completed');
  };

  // Function to repair orphaned kanban column references
  const repairOrphanedKanbanReferences = (currentState: AppState) => {
    console.log('🔧 Checking for orphaned kanban references...');
    
    // Find all tasks with kanbanColumnId
    const tasksWithKanbanId = currentState.tasks.filter(task => task.kanbanColumnId);
    
    if (tasksWithKanbanId.length === 0) {
      console.log('✅ No tasks with kanbanColumnId found');
      return;
    }
    
    console.log(`🔍 Found ${tasksWithKanbanId.length} tasks with kanbanColumnId`);
    
    // Group tasks by project and their missing kanban columns
    const projectColumnsMap = new Map<string, Set<string>>();
    
    tasksWithKanbanId.forEach(task => {
      if (!task.kanbanColumnId) return;
      
      // Determine the project ID for this task
      let projectId = task.projectId || task.columnId;
      
      // Skip if we can't determine the project
      if (!projectId) return;
      
      // Check if the kanban column exists
      const columnExists = currentState.viewState.projectKanban.columns.some(
        col => col.id === task.kanbanColumnId
      );
      
      if (!columnExists) {
        if (!projectColumnsMap.has(projectId)) {
          projectColumnsMap.set(projectId, new Set());
        }
        projectColumnsMap.get(projectId)!.add(task.kanbanColumnId);
      }
    });
    
    if (projectColumnsMap.size === 0) {
      console.log('✅ All kanban column references are valid');
      return;
    }
    
    console.log('🚨 Found orphaned kanban references for projects:', Array.from(projectColumnsMap.keys()));
    
    // Create missing columns for each project
    projectColumnsMap.forEach((missingColumns, projectId) => {
      console.log(`🔧 Repairing project ${projectId}: creating ${missingColumns.size} missing columns`);
      
      // Find the project
      const project = currentState.columns.find(col => col.id === projectId && col.type === 'project');
      if (!project) {
        console.warn(`Project ${projectId} not found, skipping repair`);
        return;
      }
      
      let order = 0;
      const existingColumns = currentState.viewState.projectKanban.columns.filter(col => col.projectId === projectId);
      if (existingColumns.length > 0) {
        order = Math.max(...existingColumns.map(col => col.order)) + 1;
      }
      
      // Create standard columns based on common names
      const standardColumnMappings: Record<string, { title: string; color: string }> = {
        'to-do': { title: 'To Do', color: '#6b7280' },
        'doing': { title: 'Doing', color: '#f59e0b' },
        'done': { title: 'Done', color: '#10b981' },
        'todo': { title: 'To Do', color: '#6b7280' },
        'inprogress': { title: 'In Progress', color: '#f59e0b' },
        'completed': { title: 'Completed', color: '#10b981' },
        'backlog': { title: 'Backlog', color: '#8b5cf6' },
        'review': { title: 'Review', color: '#06b6d4' },
        'testing': { title: 'Testing', color: '#84cc16' }
      };
      
      // Create a sorted array of missing columns for consistent ordering
      const sortedMissingColumns = Array.from(missingColumns).sort();
      let columnCounter = 1;
      
      sortedMissingColumns.forEach(columnId => {
        // Try to infer column details from the ID
        const normalizedId = columnId.toLowerCase().replace(/[-_\s]/g, '');
        const mapping = standardColumnMappings[normalizedId];
        
        let title = mapping?.title;
        let color = mapping?.color || '#6b7280';
        
        // If we can't map it, create a generic but meaningful name
        if (!mapping) {
          // Check if it's a generated ID (contains numbers and random strings)
          if (/col-\d+-.+/.test(columnId)) {
            title = `Spalte ${columnCounter}`;
            // Use different colors for different columns
            const colors = ['#6b7280', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444'];
            color = colors[(columnCounter - 1) % colors.length];
            columnCounter++;
          } else {
            // Try to extract from the original ID
          title = columnId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        }
        
        console.log(`  📋 Creating column: ${title} (${columnId})`);
        
        // Create the column immediately with the correct ID
        const newColumn = {
          id: columnId,
          projectId: projectId,
          title: title,
          color: color,
          order: order
        };
        
        // Dispatch immediately - no timeout needed
        dispatch({
          type: 'ADD_PROJECT_KANBAN_COLUMN_WITH_ID',
          payload: newColumn
        });
        
        order++;
      });
    });
    
    console.log('✅ Orphaned kanban references repair completed');
  };

  // Repair missing Pin columns referenced by tasks
  const repairOrphanedPinColumns = (currentState: AppState) => {
    try {
      const existingPinIds = new Set(currentState.pinColumns.map(c => c.id));
      const referencedPinIds = new Set(
        currentState.tasks
          .filter(t => !!t.pinColumnId)
          .map(t => t.pinColumnId as string)
      );

      const missing: string[] = [];
      referencedPinIds.forEach(id => {
        if (!existingPinIds.has(id)) missing.push(id);
      });

      if (missing.length === 0) return;

      let order = currentState.pinColumns.length > 0
        ? Math.max(...currentState.pinColumns.map(c => c.order)) + 1
        : 0;

      missing.forEach((id) => {
        const newCol = {
          id,
          title: 'Pin',
          color: currentState.preferences.accentColor,
          order: order++,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as PinColumn;
        dispatch({ type: 'ADD_PIN_COLUMN', payload: newCol });
      });
    } catch (e) {
      console.warn('Error repairing orphaned pin columns', e);
    }
  };

  // Load data from localStorage OR database on initialization and setup columns
  useEffect(() => {
    let loadedColumns: Column[] = [];
    let isNewUser = false;
    
    // If online mode, fetch from API
    if (isOnlineMode()) {
      console.log('[AppContext] Online mode detected, fetching from database...');
      syncAPI.getFullData()
        .then((data) => {
          console.log('[AppContext] Data loaded from database:', data);
          
          if (data.tasks) {
            dispatch({ type: 'SET_TASKS', payload: data.tasks });
          }
          if (data.archivedTasks) {
            dispatch({ type: 'SET_ARCHIVED_TASKS', payload: data.archivedTasks });
          }
          if (data.columns) {
            loadedColumns = data.columns;
          }
          if (data.tags) {
            dispatch({ type: 'SET_TAGS', payload: data.tags });
          }
          if (data.notes) {
            dispatch({ type: 'SET_NOTES', payload: data.notes });
          }
          if (data.pinColumns) {
            dispatch({ type: 'SET_PIN_COLUMNS', payload: data.pinColumns });
          }
          if (data.calendarSources) {
            dispatch({ type: 'SET_CALENDAR_SOURCES', payload: data.calendarSources });
          }
          if (data.events) {
            dispatch({ type: 'SET_EVENTS', payload: data.events });
          }
          if (data.preferences) {
            dispatch({ type: 'UPDATE_PREFERENCES', payload: data.preferences });
          }
          if (data.viewState) {
            // Direct state update for viewState
            state.viewState = { ...state.viewState, ...data.viewState };
          }
          
          // Generate and merge columns
          const today = startOfDay(new Date());
          const dateColumns: Column[] = [];
          for (let i = 0; i < 30; i++) {
            const date = addDays(today, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            dateColumns.push({
              id: `date-${dateStr}`,
              title: format(date, 'dd.MM.yyyy'),
              type: 'date',
              date: dateStr,
              order: i + 1,
              tasks: [],
            });
          }
          
          const existingProjectColumns = loadedColumns.filter(col => col.type === 'project');
          const finalColumns = [...dateColumns, ...existingProjectColumns];
          dispatch({ type: 'SET_COLUMNS', payload: finalColumns });
          
          // Mark that we just loaded from DB - delay to let state settle
          justLoadedFromDB.current = true;
          setTimeout(() => {
            // Initialize refs with loaded data and enable sync
            prevTaskIds.current = new Set(data.tasks?.map((t: any) => t.id) || []);
            prevArchivedTaskIds.current = new Set(data.archivedTasks?.map((t: any) => t.id) || []);
            prevColumnIds.current = new Set(existingProjectColumns.map(c => c.id));
            prevTagIds.current = new Set(data.tags?.map((t: any) => t.id) || []);
            prevNoteIds.current = new Set(data.notes?.map((n: any) => n.id) || []);
            prevPinColumnIds.current = new Set(data.pinColumns?.map((p: any) => p.id) || []);
            
            // Initialize JSON snapshots to track content changes
            prevColumnsJson.current = JSON.stringify(existingProjectColumns.map(c => ({
              id: c.id,
              title: c.title,
              type: c.type,
              order: c.order,
              linkedNotes: c.linkedNotes,
              timebudget: c.timebudget
            })));
            prevPinColumnsJson.current = JSON.stringify((data.pinColumns || []).map((p: any) => ({
              id: p.externalId || p.id,
              title: p.title,
              color: p.color,
              order: p.order
            })));
            prevTagsJson.current = JSON.stringify((data.tags || []).map((t: any) => ({
              id: t.externalId || t.id,
              name: t.name,
              color: t.color,
              count: t.count
            })));
            prevNotesJson.current = JSON.stringify((data.notes || []).map((n: any) => ({
              id: n.externalId || n.id,
              title: n.title,
              content: n.content,
              tags: n.tags,
              linkedTasks: n.linkedTasks,
              linkedNotes: n.linkedNotes,
              linkedProjects: n.linkedProjects,
              pinned: n.pinned,
              archived: n.archived,
              dailyNote: n.dailyNote,
              dailyNoteDate: n.dailyNoteDate
            })));
            
            initialLoadComplete.current = true;
            justLoadedFromDB.current = false;
            console.log('[AppContext] DB load complete, sync effects enabled');
            
            // Signal to AuthContext that data is loaded
            window.dispatchEvent(new Event('app:data-loaded'));
          }, 500);
        })
        .catch((error) => {
          console.error('[AppContext] Error loading from database:', error);
          showGlobalError(`Failed to load data from server: ${error.message || 'Connection error'}`);
          // Still mark as complete on error so app isn't stuck
          initialLoadComplete.current = true;
          // Still signal data loaded even on error so app isn't stuck on loading screen
          window.dispatchEvent(new Event('app:data-loaded'));
        });
      
      return; // Exit early for online mode
    }
    
    // Guest mode: Load from localStorage
    console.log('[AppContext] Guest mode, loading from localStorage...');
    try {
      const savedTasks = localStorage.getItem('taskfuchs-tasks');
      const savedArchivedTasks = localStorage.getItem('taskfuchs-archived-tasks');
      const savedBoards = localStorage.getItem('taskfuchs-boards');
      const savedTags = localStorage.getItem('taskfuchs-tags');
      const savedPreferences = localStorage.getItem('taskfuchs-preferences');
      const savedShowCompleted = localStorage.getItem('taskfuchs-show-completed');
      const savedNotes = localStorage.getItem('taskfuchs-notes');
      const savedNoteLinks = localStorage.getItem('taskfuchs-note-links');
      const savedColumns = localStorage.getItem('taskfuchs-columns');
      const savedViewState = localStorage.getItem('taskfuchs-view-state');
      const savedEvents = localStorage.getItem('taskfuchs-events');
      const savedCalendarSources = localStorage.getItem('taskfuchs-calendar-sources');
      const savedPinColumns = localStorage.getItem('taskfuchs-pin-columns');
      const savedChecklistItems = localStorage.getItem('taskfuchs-checklist-items');

      // Check if this is a new user (no saved data at all)
      isNewUser = !savedColumns && !savedTasks && !savedBoards;

      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        dispatch({ type: 'SET_TASKS', payload: tasks });
      }

      if (savedArchivedTasks) {
        const archivedTasks = JSON.parse(savedArchivedTasks);
        dispatch({ type: 'SET_ARCHIVED_TASKS', payload: archivedTasks });
      }

      if (savedBoards) {
        const boards = JSON.parse(savedBoards);
        dispatch({ type: 'SET_KANBAN_BOARDS', payload: boards });
      }

      if (savedTags) {
        const tags = JSON.parse(savedTags);
        dispatch({ type: 'SET_TAGS', payload: tags });
      }

      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        
        // Migration: replace legacy remote background URLs with local default
        let migratedPreferences = { ...preferences };
        if (
          typeof migratedPreferences.backgroundImage === 'string' &&
          migratedPreferences.backgroundImage &&
          !migratedPreferences.backgroundImage.startsWith('/')
        ) {
          migratedPreferences.backgroundImage = '/backgrounds/bg12.webp';
        }

        // Sanitize gallery in localStorage: keep only local paths and ensure defaults are present
        try {
          const savedGallery = localStorage.getItem('backgroundImageGallery');
          if (savedGallery) {
            const parsed: string[] = JSON.parse(savedGallery);
            const localOnly = (parsed || []).filter((u) => typeof u === 'string' && u.startsWith('/'));
            const defaults = Array.from({ length: 12 }, (_, i) => `/backgrounds/bg${i + 1}.jpg`);
            const merged = [
              ...defaults,
              ...localOnly.filter((u) => !defaults.includes(u))
            ].slice(0, 12);
            localStorage.setItem('backgroundImageGallery', JSON.stringify(merged));
          }
        } catch (e) {
          // ignore gallery migration errors
        }

        // Ensure calendar preferences have defaults
        const preferencesWithDefaults = {
          ...migratedPreferences,
          calendars: {
            sources: [],
            showInPlanner: true,
            defaultDuration: 60,
            hiddenEvents: [],
            ...migratedPreferences.calendars
          }
        };

        // Persist migrated preferences back to storage
        try {
          localStorage.setItem('taskfuchs-preferences', JSON.stringify(preferencesWithDefaults));
        } catch (_err) {}

        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferencesWithDefaults });
      }

      if (savedShowCompleted) {
        const showCompleted = JSON.parse(savedShowCompleted);
        if (!showCompleted) {
          dispatch({ type: 'TOGGLE_SHOW_COMPLETED_TASKS' });
        }
      }

      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        dispatch({ type: 'SET_NOTES', payload: notes });
      }

      if (savedNoteLinks) {
        const noteLinks = JSON.parse(savedNoteLinks);
        state.noteLinks = noteLinks;
      }

      if (savedColumns) {
        loadedColumns = JSON.parse(savedColumns);
      }

      if (savedViewState) {
        const viewState = JSON.parse(savedViewState);
        state.viewState = { ...state.viewState, ...viewState };
      }

      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        dispatch({ type: 'SET_EVENTS', payload: events });
      }

      if (savedCalendarSources) {
        const calendarSources = JSON.parse(savedCalendarSources);
        dispatch({ type: 'SET_CALENDAR_SOURCES', payload: calendarSources });
      }
      if (savedPinColumns) {
        const pinColumns = JSON.parse(savedPinColumns);
        dispatch({ type: 'SET_PIN_COLUMNS', payload: pinColumns });
      }
      if (savedChecklistItems) {
        const checklistItems = JSON.parse(savedChecklistItems);
        dispatch({ type: 'SET_CHECKLIST_ITEMS', payload: checklistItems });
      }

    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }

    // Generate date columns
    const today = startOfDay(state.currentDate);
    const dateColumns: Column[] = [];
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      dateColumns.push({
        id: `date-${dateStr}`,
        title: format(date, 'dd.MM.yyyy'),
        type: 'date',
        date: dateStr,
        order: i + 1,
        tasks: [],
      });
    }

    // Merge saved titles for date columns (so renamed planner column titles persist across sync/devices)
    const savedDateColumnsMap = new Map<string, Column>();
    try {
      (loadedColumns || [])
        .filter((c) => c && c.type === 'date' && typeof c.id === 'string')
        .forEach((c) => savedDateColumnsMap.set(c.id, c));
    } catch {}

    const mergedDateColumns: Column[] = dateColumns.map((dc) => {
      const saved = savedDateColumnsMap.get(dc.id);
      if (!saved) return dc;
      // Preserve custom title (and future custom props) from saved state
      return { ...dc, title: saved.title || dc.title };
    });

    let finalColumns: Column[] = [];

    if (isNewUser) {
      // For new users: NO DEFAULT PROJECTS - start with empty project list
      finalColumns = [...mergedDateColumns];
      
      // Set sample tasks for new users
      if (state.tasks.length === 0) {
        dispatch({ type: 'SET_TASKS', payload: sampleTasks });
      }
      
      // Create default board for new users
      if (state.kanbanBoards.length === 0) {
        const defaultBoard: KanbanBoard = {
          id: 'default-status-board',
          name: 'Status Board',
          description: 'Standardboard für Aufgabenstatus',
          groupingMode: 'status',
          columns: [
            { id: 'todo', title: 'Zu erledigen', color: '#3b82f6', order: 1, groupValue: 'todo' },
            { id: 'done', title: 'Erledigt', color: '#10b981', order: 2, groupValue: 'done' }
          ],
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dispatch({ type: 'CREATE_KANBAN_BOARD', payload: defaultBoard });
      }
    } else {
      // For existing users, preserve saved project columns and update date columns
      const existingProjectColumns = loadedColumns.filter(col => col.type === 'project');
      finalColumns = [...mergedDateColumns, ...existingProjectColumns];
    }

    dispatch({ type: 'SET_COLUMNS', payload: finalColumns });
    
    // For guest mode, mark initial load complete after a delay
    if (!isOnlineMode()) {
      setTimeout(() => {
        prevTaskIds.current = new Set(state.tasks.map(t => t.id));
        prevArchivedTaskIds.current = new Set(state.archivedTasks.map(t => t.id));
        prevColumnIds.current = new Set(finalColumns.filter(c => c.type === 'project').map(c => c.id));
        prevTagIds.current = new Set(state.tags.map(t => t.id));
        prevNoteIds.current = new Set(state.notes.notes.map(n => n.id));
        prevPinColumnIds.current = new Set(state.pinColumns.map(p => p.id));
        
        initialLoadComplete.current = true;
        console.log('[AppContext] Guest mode load complete, save effects enabled');
      }, 500);
    }
    
    // Initialize recurring task maintenance after a delay to ensure all data is loaded
    setTimeout(() => {
      initializeRecurringTaskMaintenance(state.tasks, (updatedTasks) => {
        dispatch({ type: 'SET_TASKS', payload: updatedTasks });
      });
    }, 1500);
    
    // Repair orphaned kanban references after a delay to ensure all data is loaded
    setTimeout(() => {
      repairOrphanedKanbanReferences(state);
    }, 1000);
  }, []);

  // Track if initial load is complete to avoid saving during load
  const initialLoadComplete = useRef(false);
  
  // Track if we just loaded from database to prevent re-syncing
  const justLoadedFromDB = useRef(false);
  
  // Track previous state for content-aware change detection (for online mode)
  // Using JSON strings to detect ANY changes, not just ID additions/removals
  const prevTasksJson = useRef<string>('');
  const prevArchivedTasksJson = useRef<string>('');
  const prevColumnsJson = useRef<string>('');
  const prevTagsJson = useRef<string>('');
  const prevNotesJson = useRef<string>('');
  const prevPinColumnsJson = useRef<string>('');
  // Also track IDs separately for deletion detection
  const prevTaskIds = useRef<Set<string>>(new Set());
  const prevArchivedTaskIds = useRef<Set<string>>(new Set());
  const prevColumnIds = useRef<Set<string>>(new Set());
  const prevTagIds = useRef<Set<string>>(new Set());
  const prevNoteIds = useRef<Set<string>>(new Set());
  const prevPinColumnIds = useRef<Set<string>>(new Set());
  

  // Save data to localStorage OR database whenever state changes
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (justLoadedFromDB.current) return; // Don't re-sync data we just loaded
    
    if (isOnlineMode()) {
      const currentTaskIds = new Set(state.tasks.map(t => t.id));
      
      // Find deleted tasks (were in previous state but not in current)
      const deletedTaskIds = [...prevTaskIds.current].filter(id => !currentTaskIds.has(id));
      
      // Delete removed tasks from database
      if (deletedTaskIds.length > 0) {
        console.log('[AppContext] Deleting tasks from database:', deletedTaskIds);
        Promise.all(deletedTaskIds.map(id => 
          tasksAPI.delete(id).catch(err => {
            // Ignore 404 errors (task may not exist in DB yet)
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting task ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      // This detects ANY changes including completed status, title, etc.
      const currentTasksJson = JSON.stringify(state.tasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        completedAt: t.completedAt,
        updatedAt: t.updatedAt,
        description: t.description,
        priority: t.priority,
        tags: t.tags,
        columnId: t.columnId,
        projectId: t.projectId,
        pinColumnId: t.pinColumnId,
        reminderDate: t.reminderDate,
        dueDate: t.dueDate,
        estimatedTime: t.estimatedTime,
        trackedTime: t.trackedTime,
        subtasks: t.subtasks,
        position: t.position,
        archived: t.archived
      })));
      
      // Detect actual content changes, not just ID changes
      const hasContentChanges = currentTasksJson !== prevTasksJson.current;
      
      if ((hasContentChanges || deletedTaskIds.length > 0) && state.tasks.length > 0) {
        console.log('[AppContext] Syncing tasks to database (content changed)...');
        tasksAPI.bulkSync(state.tasks.map(t => ({ ...t, externalId: t.id }))).catch(err => {
          console.error('[AppContext] Error syncing tasks to database:', err);
          showGlobalError(`Failed to save tasks: ${err.message || 'Connection error'}`);
        });
      }
      
      // Update previous state trackers
      prevTaskIds.current = currentTaskIds;
      prevTasksJson.current = currentTasksJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-tasks', JSON.stringify(state.tasks));
      } catch (error) {
        console.error('Error saving tasks to localStorage:', error);
      }
    }
  }, [state.tasks]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (justLoadedFromDB.current) return;
    
    if (isOnlineMode()) {
      const currentArchivedIds = new Set(state.archivedTasks.map(t => t.id));
      
      // Find deleted archived tasks
      const deletedArchivedIds = [...prevArchivedTaskIds.current].filter(id => !currentArchivedIds.has(id));
      
      // Delete removed archived tasks from database
      if (deletedArchivedIds.length > 0) {
        console.log('[AppContext] Deleting archived tasks from database:', deletedArchivedIds);
        Promise.all(deletedArchivedIds.map(id => 
          tasksAPI.delete(id).catch(err => {
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting archived task ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      const currentArchivedJson = JSON.stringify(state.archivedTasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        completedAt: t.completedAt,
        updatedAt: t.updatedAt,
        archived: t.archived
      })));
      
      // Detect actual content changes
      const hasContentChanges = currentArchivedJson !== prevArchivedTasksJson.current;
      
      if ((hasContentChanges || deletedArchivedIds.length > 0) && state.archivedTasks.length > 0) {
        tasksAPI.bulkSync(state.archivedTasks.map(t => ({ ...t, externalId: t.id, archived: true }))).catch(err => {
          console.error('[AppContext] Error syncing archived tasks to database:', err);
          showGlobalError(`Failed to save archived tasks: ${err.message || 'Connection error'}`);
        });
      }
      
      prevArchivedTaskIds.current = currentArchivedIds;
      prevArchivedTasksJson.current = currentArchivedJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-archived-tasks', JSON.stringify(state.archivedTasks));
      } catch (error) {
        console.error('Error saving archived tasks to localStorage:', error);
      }
    }
  }, [state.archivedTasks]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    try {
      localStorage.setItem('taskfuchs-show-completed', JSON.stringify(state.showCompletedTasks));
    } catch (error) {
      console.error('Error saving show completed setting to localStorage:', error);
    }
  }, [state.showCompletedTasks]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    // Kanban boards not yet synced to database, only localStorage
    try {
      localStorage.setItem('taskfuchs-boards', JSON.stringify(state.kanbanBoards));
    } catch (error) {
      console.error('Error saving boards to localStorage:', error);
    }
  }, [state.kanbanBoards]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (justLoadedFromDB.current) return;
    
    if (isOnlineMode()) {
      const currentTagIds = new Set(state.tags.map(t => t.id));
      
      // Find deleted tags
      const deletedTagIds = [...prevTagIds.current].filter(id => !currentTagIds.has(id));
      
      // Delete removed tags from database
      if (deletedTagIds.length > 0) {
        console.log('[AppContext] Deleting tags from database:', deletedTagIds);
        Promise.all(deletedTagIds.map(id => 
          tagsAPI.delete(id).catch(err => {
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting tag ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      const currentTagsJson = JSON.stringify(state.tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: t.count
      })));
      
      // Detect actual content changes
      const hasContentChanges = currentTagsJson !== prevTagsJson.current;
      
      // Sync tags if content changed
      if ((hasContentChanges || deletedTagIds.length > 0) && state.tags.length > 0) {
        tagsAPI.bulkSync(state.tags.map(t => ({ ...t, externalId: t.id }))).catch(err => {
          console.error('[AppContext] Error syncing tags to database:', err);
          showGlobalError(`Failed to save tags: ${err.message || 'Connection error'}`);
        });
      }
      
      prevTagIds.current = currentTagIds;
      prevTagsJson.current = currentTagsJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-tags', JSON.stringify(state.tags));
      } catch (error) {
        console.error('Error saving tags to localStorage:', error);
      }
    }
  }, [state.tags]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    if (isOnlineMode()) {
      preferencesAPI.update(state.preferences).catch(err => {
        console.error('[AppContext] Error syncing preferences to database:', err);
        showGlobalError(`Failed to save settings: ${err.message || 'Connection error'}`);
      });
    } else {
      try {
        localStorage.setItem('taskfuchs-preferences', JSON.stringify(state.preferences));
      } catch (error) {
        console.error('Error saving preferences to localStorage:', error);
      }
    }
  }, [state.preferences]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (justLoadedFromDB.current) return;
    
    if (isOnlineMode()) {
      const currentNoteIds = new Set(state.notes.notes.map(n => n.id));
      
      // Find deleted notes
      const deletedNoteIds = [...prevNoteIds.current].filter(id => !currentNoteIds.has(id));
      
      // Delete removed notes from database
      if (deletedNoteIds.length > 0) {
        console.log('[AppContext] Deleting notes from database:', deletedNoteIds);
        Promise.all(deletedNoteIds.map(id => 
          notesAPI.delete(id).catch(err => {
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting note ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      const currentNotesJson = JSON.stringify(state.notes.notes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        tags: n.tags,
        pinned: n.pinned,
        archived: n.archived,
        updatedAt: n.updatedAt
      })));
      
      // Detect actual content changes
      const hasContentChanges = currentNotesJson !== prevNotesJson.current;
      
      // Sync notes if content changed
      if ((hasContentChanges || deletedNoteIds.length > 0) && state.notes.notes.length > 0) {
        notesAPI.bulkSync(state.notes.notes.map(n => ({ ...n, externalId: n.id }))).catch(err => {
          console.error('[AppContext] Error syncing notes to database:', err);
          showGlobalError(`Failed to save notes: ${err.message || 'Connection error'}`);
        });
      }
      
      prevNoteIds.current = currentNoteIds;
      prevNotesJson.current = currentNotesJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-notes', JSON.stringify(state.notes.notes));
      } catch (error) {
        console.error('Error saving notes to localStorage:', error);
      }
    }
  }, [state.notes.notes]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    // Note links stored as part of notes, no separate API
    try {
      localStorage.setItem('taskfuchs-note-links', JSON.stringify(state.noteLinks));
    } catch (error) {
      console.error('Error saving note links to localStorage:', error);
    }
  }, [state.noteLinks]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    if (justLoadedFromDB.current) return;
    
    if (isOnlineMode()) {
      // Only sync project columns to database (date columns are generated)
      const projectColumns = state.columns.filter(c => c.type === 'project');
      const currentColumnIds = new Set(projectColumns.map(c => c.id));
      
      // Find deleted columns
      const deletedColumnIds = [...prevColumnIds.current].filter(id => !currentColumnIds.has(id));
      
      // Delete removed columns from database
      if (deletedColumnIds.length > 0) {
        console.log('[AppContext] Deleting columns from database:', deletedColumnIds);
        Promise.all(deletedColumnIds.map(id => 
          columnsAPI.delete(id).catch(err => {
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting column ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      const currentColumnsJson = JSON.stringify(projectColumns.map(c => ({
        id: c.id,
        title: c.title,
        type: c.type,
        order: c.order,
        linkedNotes: c.linkedNotes,
        timebudget: c.timebudget
      })));
      
      // Detect actual content changes
      const hasContentChanges = currentColumnsJson !== prevColumnsJson.current;
      
      // Sync columns if content changed
      if ((hasContentChanges || deletedColumnIds.length > 0) && projectColumns.length > 0) {
        columnsAPI.bulkSync(projectColumns.map(c => ({ ...c, externalId: c.id }))).catch(err => {
          console.error('[AppContext] Error syncing columns to database:', err);
          showGlobalError(`Failed to save projects: ${err.message || 'Connection error'}`);
        });
      }
      
      prevColumnIds.current = currentColumnIds;
      prevColumnsJson.current = currentColumnsJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-columns', JSON.stringify(state.columns));
      } catch (error) {
        console.error('Error saving columns to localStorage:', error);
      }
    }
  }, [state.columns]);

  // Persist pin columns separately to avoid loss of names/order
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (justLoadedFromDB.current) return;
    
    if (isOnlineMode()) {
      const currentPinColumnIds = new Set(state.pinColumns.map(p => p.id));
      
      // Find deleted pin columns
      const deletedPinColumnIds = [...prevPinColumnIds.current].filter(id => !currentPinColumnIds.has(id));
      
      // Delete removed pin columns from database
      if (deletedPinColumnIds.length > 0) {
        console.log('[AppContext] Deleting pin columns from database:', deletedPinColumnIds);
        Promise.all(deletedPinColumnIds.map(id => 
          pinColumnsAPI.delete(id).catch(err => {
            if (!err.message?.includes('not found')) {
              console.error(`[AppContext] Error deleting pin column ${id}:`, err);
            }
          })
        ));
      }
      
      // Create JSON snapshot for content-aware change detection
      const currentPinColumnsJson = JSON.stringify(state.pinColumns.map(p => ({
        id: p.id,
        title: p.title,
        color: p.color,
        order: p.order
      })));
      
      // Detect actual content changes
      const hasContentChanges = currentPinColumnsJson !== prevPinColumnsJson.current;
      
      // Sync pin columns if content changed
      if ((hasContentChanges || deletedPinColumnIds.length > 0) && state.pinColumns.length > 0) {
        pinColumnsAPI.bulkSync(state.pinColumns.map(p => ({ ...p, externalId: p.id }))).catch(err => {
          console.error('[AppContext] Error syncing pin columns to database:', err);
          showGlobalError(`Failed to save pin columns: ${err.message || 'Connection error'}`);
        });
      }
      
      prevPinColumnIds.current = currentPinColumnIds;
      prevPinColumnsJson.current = currentPinColumnsJson;
    } else {
      try {
        localStorage.setItem('taskfuchs-pin-columns', JSON.stringify(state.pinColumns));
      } catch (error) {
        console.error('Error saving pin columns to localStorage:', error);
      }
    }
  }, [state.pinColumns]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    if (isOnlineMode()) {
      viewStateAPI.update(state.viewState).catch(err => {
        console.error('[AppContext] Error syncing view state to database:', err);
        showGlobalError(`Failed to save view state: ${err.message || 'Connection error'}`);
      });
    } else {
      try {
        localStorage.setItem('taskfuchs-view-state', JSON.stringify(state.viewState));
      } catch (error) {
        console.error('Error saving view state to localStorage:', error);
      }
    }
  }, [state.viewState]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    if (isOnlineMode()) {
      calendarAPI.syncEvents(state.events).catch(err => {
        console.error('[AppContext] Error syncing events to database:', err);
        showGlobalError(`Failed to save calendar events: ${err.message || 'Connection error'}`);
      });
    } else {
      try {
        localStorage.setItem('taskfuchs-events', JSON.stringify(state.events));
      } catch (error) {
        console.error('Error saving calendar events to localStorage:', error);
      }
    }
  }, [state.events]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    if (isOnlineMode()) {
      calendarAPI.bulkSyncSources(state.calendarSources).catch(err => {
        console.error('[AppContext] Error syncing calendar sources to database:', err);
        showGlobalError(`Failed to save calendar sources: ${err.message || 'Connection error'}`);
      });
    } else {
      try {
        localStorage.setItem('taskfuchs-calendar-sources', JSON.stringify(state.calendarSources));
      } catch (error) {
        console.error('Error saving calendar sources to localStorage:', error);
      }
    }
  }, [state.calendarSources]);

  useEffect(() => {
    if (!initialLoadComplete.current) return;
    
    // Checklist items - localStorage only for now
    try {
      localStorage.setItem('taskfuchs-checklist-items', JSON.stringify(state.checklistItems));
    } catch (error) {
      console.error('Error saving checklist items to localStorage:', error);
    }
  }, [state.checklistItems]);

  // Auto-sync iCal calendar sources periodically and on focus
  useEffect(() => {
    let isDisposed = false;
    const inProgress = new Set<string>();

    const syncDueSources = async () => {
      if (isDisposed) return;
      if (!state?.preferences?.calendars?.showInPlanner) return;

      const enabledSources = (state.calendarSources || []).filter(s => s.enabled !== false);
      if (enabledSources.length === 0) return;

      try {
        const { ICalService } = await import('../utils/icalService');
        const service = ICalService.getInstance();

        const now = Date.now();
        for (const source of enabledSources) {
          if (isDisposed) break;
          const intervalMin = typeof source.syncInterval === 'number' ? source.syncInterval : 30;
          const last = source.lastSync ? new Date(source.lastSync).getTime() : 0;
          const due = now - last >= intervalMin * 60_000;
          if (!due) continue;
          if (inProgress.has(source.id)) continue;

          inProgress.add(source.id);
          service.fetchCalendar(source)
            .then((events) => {
              if (isDisposed) return;
              dispatch({ type: 'SYNC_EVENTS', payload: { events, sourceId: source.id } });
              const updatedSource = { ...source, lastSync: new Date().toISOString() } as any;
              dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
            })
            .catch((e) => {
              console.warn('iCal auto-sync failed for source', source.name || source.id, e);
            })
            .finally(() => {
              inProgress.delete(source.id);
            });
        }
      } catch (e) {
        console.warn('iCal auto-sync setup error:', e);
      }
    };

    // Run once shortly after mount/changes, and on window focus
    const initialTimer = window.setTimeout(syncDueSources, 1500);
    const onFocus = () => syncDueSources();
    window.addEventListener('focus', onFocus);

    // Periodic check (every minute)
    const intervalId = window.setInterval(syncDueSources, 60_000);

    return () => {
      isDisposed = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [state.calendarSources, state.preferences?.calendars?.showInPlanner, dispatch]);

  // Initialize timer service ONCE
  useEffect(() => {
    try {
      timerService.initialize(state.preferences);
      
      timerService.setCallbacks({
        onTick: (context) => {
          try {
            // Throttle updates to every 500ms for better performance
            const now = Date.now();
            if (!timerService.lastUIUpdate || now - timerService.lastUIUpdate > 500) {
              dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: context });
              timerService.lastUIUpdate = now;
            }
          } catch (error) {
            console.error('Error in timer onTick callback:', error);
          }
        },
        onTaskTimeEnd: (context) => {
          try {
            console.log('Task time completed:', context.taskTitle);
            
            // Show desktop notification for timer completion
            notificationService.showTimerCompletion(context.taskTitle, context.elapsedTime, () => {
              // Focus window when notification is clicked
              window.focus();
            });
            
            // Update the timer context to show overtime
            dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: context });
          } catch (error) {
            console.error('Error in onTaskTimeEnd callback:', error);
          }
        },
        onPause: (context) => {
          try {
            dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: context });
          } catch (error) {
            console.error('Error in onPause callback:', error);
          }
        },
        onResume: (context) => {
          try {
            dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: context });
          } catch (error) {
            console.error('Error in onResume callback:', error);
          }
        },
        onStop: (context, reason) => {
          try {
            const task = state.tasks.find(t => t.id === context.taskId);
            if (task) {
              const previousTrackedTime = task.trackedTime || 0;
              const finalElapsedTime = Math.round(context.elapsedTime);
              
              console.log(`🔄 Timer onStop callback for "${task.title}":`, {
                reason,
                previousTrackedTime,
                finalElapsedTime,
                totalSessionDuration: finalElapsedTime - previousTrackedTime
              });

              // Update task with final tracked time and clear timer state
              dispatch({
                type: 'UPDATE_TASK',
                payload: {
                  ...task,
                  trackedTime: context.elapsedTime,
                  timerState: undefined,
                  updatedAt: new Date().toISOString()
                }
              });
            }
            dispatch({ type: 'SET_ACTIVE_TIMER', payload: null });
          } catch (error) {
            console.error('Error in onStop callback:', error);
          }
        },
        onTimerPersisted: (taskId, elapsedTime) => {
          // Timer persistence is now handled by the 30-second interval above
          // This callback can remain empty or be used for special cases
        },
        onTimeAdded: (taskId, addedMinutes, newEstimatedTime) => {
          try {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
              dispatch({
                type: 'UPDATE_TASK',
                payload: {
                  ...task,
                  estimatedTime: newEstimatedTime,
                  updatedAt: new Date().toISOString()
                }
              });
              
              // Show success notification
              notificationService.showTaskCompleted(
                `⏰ +${addedMinutes} Min hinzugefügt zu "${task.title}"`,
                () => window.focus()
              );
            }
          } catch (error) {
            console.error('Error in onTimeAdded callback:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing timer service:', error);
    }

    return () => {
      try {
        timerService.destroy();
      } catch (error) {
        console.error('Error destroying timer service:', error);
      }
    };
  }, []); // No dependencies to prevent re-initialization

  // Separate effect for periodic task updates (every 30 seconds)
  // Uses useRef to avoid restarting interval when tasks change
  const tasksRef = useRef(state.tasks);
  const dispatchRef = useRef(dispatch);
  
  // Update refs when values change
  useEffect(() => {
    tasksRef.current = state.tasks;
    dispatchRef.current = dispatch;
  }, [state.tasks, dispatch]);

  useEffect(() => {
    const taskUpdateInterval = setInterval(() => {
      const activeTimer = timerService.getActiveTimer();
      if (activeTimer && activeTimer.isActive && !activeTimer.isPaused) {
        const task = tasksRef.current.find(t => t.id === activeTimer.taskId);
        if (task) {
          const previousTrackedTime = task.trackedTime || 0;
          const currentElapsedTime = Math.round(activeTimer.elapsedTime);
          
          console.log(`💾 Auto-save timer progress for "${task.title}":`, {
            previousTrackedTime,
            currentElapsedTime,
            sessionDuration: currentElapsedTime - previousTrackedTime
          });

          dispatchRef.current({
            type: 'UPDATE_TASK',
            payload: {
              ...task,
              trackedTime: activeTimer.elapsedTime,
              updatedAt: new Date().toISOString()
            }
          });
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(taskUpdateInterval);
  }, []); // No dependencies to prevent restarting

  // Update timer service preferences when they change (optimized single update)
  useEffect(() => {
    try {
      timerService.initialize(state.preferences);
    } catch (error) {
      console.error('Error updating timer service preferences:', error);
    }
  }, [state.preferences]);

  // Repair orphaned kanban references after data loads
  useEffect(() => {
    // Only run repair if we have tasks and have initialized the app
    if (state.tasks.length > 0 && state.columns.length > 0) {
      console.log('🔧 Running orphaned kanban references repair...');
      
      // DEBUGGING: Let's see what tasks we actually have
      console.log('📊 Current task analysis:');
      console.log(`  Total tasks: ${state.tasks.length}`);
      
      const tasksWithColumnId = state.tasks.filter(task => task.columnId);
      console.log(`  Tasks with columnId: ${tasksWithColumnId.length}`);
      
      const tasksWithKanbanColumnId = state.tasks.filter(task => task.kanbanColumnId);
      console.log(`  Tasks with kanbanColumnId: ${tasksWithKanbanColumnId.length}`);
      
      const projectTasks = state.tasks.filter(task => task.columnId?.startsWith('project-'));
      console.log(`  Tasks in projects: ${projectTasks.length}`);
      
      if (projectTasks.length > 0) {
        console.log('  Project task details:');
        projectTasks.forEach(task => {
          console.log(`    - "${task.title}": columnId="${task.columnId}", kanbanColumnId="${task.kanbanColumnId}"`);
        });
      }
      
      console.log('📋 Current columns:');
      console.log(`  Total columns: ${state.columns.length}`);
      const projectColumns = state.columns.filter(col => col.type === 'project');
      console.log(`  Project columns: ${projectColumns.length}`);
      
      console.log('🎯 Kanban columns:');
      console.log(`  Total kanban columns: ${state.viewState.projectKanban.columns.length}`);
      state.viewState.projectKanban.columns.forEach(col => {
        console.log(`    - "${col.title}" (${col.id}) for project ${col.projectId}`);
      });
      
      // Run both repair functions
      repairDuplicateKanbanColumnIds(state);
      repairOrphanedKanbanReferences(state);
    }
  }, [state.tasks, state.columns, state.viewState.projectKanban.columns]);

  // After loading initial data and on task/pin changes, ensure referenced pin columns exist
  useEffect(() => {
    repairOrphanedPinColumns(state);
  }, [state.tasks.length, state.pinColumns.length]);

  // Update date columns when currentDate changes (preserve project columns)
  useEffect(() => {
    // Skip if columns haven't been initialized yet
    if (state.columns.length === 0) return;
    
    const today = startOfDay(state.currentDate);
    
    // Generate new date columns
    const dateColumns: Column[] = [];
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      dateColumns.push({
        id: `date-${dateStr}`,
        title: format(date, 'dd.MM.yyyy'),
        type: 'date',
        date: dateStr,
        order: i + 1,
        tasks: [],
      });
    }

    // Preserve existing project columns
    const existingProjectColumns = state.columns.filter(col => col.type === 'project');
    
    // Combine date columns with preserved project columns
    const allColumns: Column[] = [
      ...dateColumns,
      ...existingProjectColumns,
    ];

    dispatch({ type: 'SET_COLUMNS', payload: allColumns });
  }, [state.currentDate]);

  // Generate recurring tasks automatically
  useEffect(() => {
    if (state.recurrence.rules.length === 0) return;

    const today = new Date();
    const endDate = addDays(today, 30); // Generate for next 30 days

    // Get all existing recurring tasks to avoid duplicates
    const existingRecurringTasks = state.tasks.filter(task => task.recurrenceRuleId);
    const existingTaskDates = new Set(
      existingRecurringTasks.map(task => `${task.recurrenceRuleId}-${task.reminderDate}`)
    );

    const newTasks: RecurringTask[] = [];

    state.recurrence.rules.forEach(rule => {
      if (!rule.isActive) return;

      try {
        // Generate occurrences for this rule
        const occurrences = recurrenceService.generateOccurrences(rule, today, 30);
        
        occurrences.forEach((dateStr, index) => {
          const taskKey = `${rule.id}-${dateStr}`;
          
          // Skip if task already exists
          if (existingTaskDates.has(taskKey)) return;

          // Skip if date is beyond our 30-day window
          const occurrenceDate = new Date(dateStr);
          if (occurrenceDate > endDate) return;

          // Generate recurring task
          const recurringTask = recurrenceService.generateTask(rule, occurrenceDate, index + 1);
          
          // Ensure the task is assigned to the correct date column
          recurringTask.columnId = `date-${dateStr}`;
          
          newTasks.push(recurringTask);
        });
      } catch (error) {
        console.error('Error generating recurring tasks for rule:', rule.id, error);
      }
    });

    // Add new recurring tasks to the state
    if (newTasks.length > 0) {
      newTasks.forEach(task => {
        // Ensure date column exists
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: task.reminderDate! });
        
        // Add the task (cast to Task since RecurringTask extends Task)
        dispatch({ type: 'ADD_TASK', payload: task as Task });
      });
    }
  }, [state.recurrence.rules, state.currentDate]);

  // Ensure tasks with reminderDate are in the correct date columns (only for newly created tasks)
  useEffect(() => {
    // Only run this effect for tasks that don't have a columnId set yet (newly created tasks)
    // This prevents interference with manual drag & drop operations
    const tasksNeedingReassignment = state.tasks.filter(task => {
      if (!task.reminderDate) return false;
      
      // Skip if task already has a columnId (manually assigned)
      if (task.columnId && task.columnId !== 'inbox') return false;
      
      const expectedColumnId = `date-${task.reminderDate}`;
      return task.columnId !== expectedColumnId;
    });

    if (tasksNeedingReassignment.length > 0) {
      console.log('📋 Auto-assigning newly created tasks to date columns:', tasksNeedingReassignment.map(t => ({ id: t.id, reminderDate: t.reminderDate })));
      
      tasksNeedingReassignment.forEach(task => {
        const dateStr = task.reminderDate!;
        const columnId = `date-${dateStr}`;
        
        // Ensure the date column exists
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
        
        // Move the task to the correct date column
        dispatch({
          type: 'MOVE_TASK',
          payload: { taskId: task.id, columnId: columnId }
        });
      });
    }
  }, [state.tasks.length]); // Only trigger when tasks are added/removed, not when modified

  // Cleanup old recurring tasks (daily cleanup)
  useEffect(() => {
    const cleanupOldRecurringTasks = () => {
      const today = new Date();
      const cutoffDate = addDays(today, -7); // Remove completed/overdue tasks older than 7 days
      
      const tasksToRemove = state.tasks.filter(task => {
        // Only process recurring tasks
        if (!task.recurrenceRuleId) return false;
        
        // Skip if task is not completed and not overdue
        if (!task.completed && task.reminderDate && new Date(task.reminderDate) >= cutoffDate) {
          return false;
        }
        
        // Remove if completed or overdue beyond cutoff
        return task.completed || (task.reminderDate && new Date(task.reminderDate) < cutoffDate);
      });

      if (tasksToRemove.length > 0) {
        tasksToRemove.forEach(task => {
          dispatch({ type: 'DELETE_TASK', payload: task.id });
        });
      }
    };

    // Run cleanup once on mount and then daily
    cleanupOldRecurringTasks();
    
    const cleanupInterval = setInterval(cleanupOldRecurringTasks, 24 * 60 * 60 * 1000); // Daily
    
    return () => clearInterval(cleanupInterval);
  }, [state.tasks.length]); // Only depend on tasks length to avoid too frequent runs

  // Extract and update tags from tasks
  useEffect(() => {
    const tagMap = new Map<string, { count: number; color: string }>();
    
    // Count tag occurrences and generate colors
    state.tasks.forEach(task => {
      task.tags.forEach(tagName => {
        const existing = tagMap.get(tagName);
        if (existing) {
          existing.count++;
        } else {
          // Dezente graue Farbe für alle Tags
          const color = '#6b7280';
          
          tagMap.set(tagName, { count: 1, color });
        }
      });
    });

    // Convert to Tag array
    const tags = Array.from(tagMap.entries()).map(([name, { count, color }]) => ({
      id: `tag-${name}`,
      name,
      color,
      count
    }));

    // Always update tags, even if empty (this cleans up unused tags)
    dispatch({ type: 'SET_TAGS', payload: tags });

    // Clean up active tag filters - remove filters for tags that no longer exist
    const existingTagNames = new Set(tags.map(tag => tag.name));
    const cleanedActiveTagFilters = state.activeTagFilters.filter(tagName => 
      existingTagNames.has(tagName)
    );
    
    if (cleanedActiveTagFilters.length !== state.activeTagFilters.length) {
      dispatch({ type: 'SET_TAG_FILTERS', payload: cleanedActiveTagFilters });
    }
  }, [state.tasks]);

  // Apply theme and accent color immediately on mount - BEFORE preferences are loaded
  useLayoutEffect(() => {
    const root = document.documentElement;
    // Set accent color immediately
    root.style.setProperty('--accent-color', state.preferences.accentColor);
    
    // Apply light mode immediately on first mount to prevent dark mode flash
    // The actual theme will be applied later when preferences are loaded
    root.classList.remove('dark');
  }, []);

  // Heartbeat: ensure UI updates even if browser throttles intervals or loses focus
  useEffect(() => {
    const forceRefresh = () => {
      try {
        const active = timerService.getActiveTimer();
        if (active) {
          dispatch({ type: 'UPDATE_TIMER_CONTEXT', payload: active });
        }
      } catch {}
    };

    const onVisibility = () => {
      if (!document.hidden) {
        forceRefresh();
      }
    };

    const interval = window.setInterval(() => {
      // If we haven't pushed a UI update for a while but a timer is active, push a fresh context
      const now = Date.now();
      if (timerService.isTimerActive() && (!timerService.lastUIUpdate || now - timerService.lastUIUpdate > 1500)) {
        forceRefresh();
        timerService.lastUIUpdate = now;
      }
    }, 1000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', forceRefresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', forceRefresh);
    };
  }, [dispatch]);

  // Apply theme - use useLayoutEffect for instant updates without flicker
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (state.preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (state.preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Set accent color
    root.style.setProperty('--accent-color', state.preferences.accentColor);
  }, [state.preferences.theme, state.preferences.accentColor]);

  // Auto-sync with Todoist when triggered by interval (disabled - Todoist integration removed)
  useEffect(() => {
    const handleAutoSync = async () => {
      // Todoist integration has been removed - this is a no-op placeholder
      // The todoistSyncManager stub always returns enabled: false
    };

    // Listen for auto-sync trigger events (kept for potential future re-integration)
    window.addEventListener('todoist-auto-sync-trigger', handleAutoSync);
    
    return () => {
      window.removeEventListener('todoist-auto-sync-trigger', handleAutoSync);
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    state,
    dispatch
  }), [state, dispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    // During hot reloads in development, provide a helpful error message
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? 'useApp must be used within an AppProvider. This error often occurs during hot reloads - try refreshing the page.'
      : 'useApp must be used within an AppProvider';
    throw new Error(errorMessage);
  }
  return context;
} 