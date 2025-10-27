export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'none' | 'low' | 'medium' | 'high';
  estimatedTime?: number; // in minutes
  trackedTime?: number; // in minutes
  tags: string[];
  subtasks: Subtask[];
  columnId: string;
  projectId?: string; // NEW: Project assignment (independent of columnId)
  kanbanColumnId?: string; // For project Kanban columns
  reminderDate?: string; // ISO date string for reminder (legacy - kept for backward compatibility)
  reminderTime?: string; // Time in HH:mm format (24h) for reminder (legacy - kept for backward compatibility)
  reminders?: TaskReminder[]; // NEW: Flexible reminder system for multiple independent reminders
  deadline?: string; // ISO date string for deadline - task appears on this date with "!" marker
  completedAt?: string; // ISO date string when task was completed
  createdAt: string;
  updatedAt: string;

  timerState?: TimerState;
  actualTime?: number;
  position: number;
  attachments?: Attachment[];
  linkedNotes?: string[]; // Note IDs linked to this task
  pinned?: boolean; // Whether task is pinned to dashboard (kept for backward compatibility)
  pinColumnId?: string; // NEW: ID of the pin column this task is assigned to
  archived?: boolean; // Whether task is archived
  recurrenceRuleId?: string; // ID of the recurrence rule for recurring tasks
  
  // New properties for recurring tasks
  dueDate?: string; // ISO date string for when task is due
  color?: string; // Color for task visualization
  recurring?: RecurringTaskConfig; // Configuration for recurring tasks
    parentSeriesId?: string; // ID of the parent series task (for generated instances)
  isSeriesTemplate?: boolean; // Whether this task is a series template
  
  // CalDAV synchronization fields
  caldavUid?: string;
  caldavEtag?: string;
  caldavUrl?: string;
  caldavLastSync?: string;
  caldavSyncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
  
  // Todoist synchronization fields
  todoistId?: string; // Todoist task ID for tracking sync
  todoistLastSync?: string; // ISO date string of last sync with Todoist
  todoistSyncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
  
  // Microsoft To Do synchronization fields
  microsoftTodoId?: string; // Microsoft To Do task ID for tracking sync
  microsoftTodoEtag?: string; // ETag for conflict detection
  microsoftTodoLastSync?: string; // ISO date string of last sync with Microsoft To Do
  microsoftTodoSyncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
}

// NEW: Interface for pin columns in the pins board
export interface PinColumn {
  id: string;
  title: string;
  color?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTaskConfig {
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  endDate?: string; // ISO date string when recurrence should end
  maxOccurrences?: number; // Maximum number of occurrences
  daysOfWeek?: number[]; // For weekly: 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // For monthly: 1-31
  lastGenerated?: string; // ISO date string of last generated instance
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  estimatedTime?: number;
  trackedTime?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskReminder {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD) - when the reminder should trigger
  time: string; // Time in HH:mm format (24h) - when on that date
  message?: string; // Optional custom reminder message
  type: 'todoist' | 'manual' | 'auto'; // Source of the reminder
  dismissed?: boolean; // Whether this reminder has been dismissed by user
  snoozedUntil?: string; // ISO datetime string if reminder was snoozed
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  type: 'date' | 'project';
  date?: string; // ISO date string for date columns
  order: number;
  tasks: Task[];
  isPinned?: boolean; // For pinned projects
  parentColumnId?: string; // For projects: which column they were created in/belong to
  linkedNotes?: string[]; // Note IDs linked to this project (for project columns)
  timebudget?: ProjectTimebudget; // Time budget configuration for projects
  
  // Helper properties for Microsoft To Do integration
  isProject?: boolean; // Computed from type === 'project'
  projectId?: string; // For columns that belong to a project
}

// NEW: Time budget management for projects
export interface ProjectTimebudget {
  id: string;
  projectId: string;
  yearlyBudgets: Record<number, YearlyTimebudget>; // year -> YearlyTimebudget
  createdAt: string;
  updatedAt: string;
}

export interface YearlyTimebudget {
  year: number;
  totalHours?: number; // Total hours for the year (optional)
  monthlyBudgets: Record<number, MonthlyTimebudget>; // month (1-12) -> MonthlyTimebudget
  distributionMode?: 'manual' | 'equal' | 'weighted'; // How to distribute yearly hours
}

export interface MonthlyTimebudget {
  month: number; // 1-12
  year: number;
  budgetedHours: number; // Planned hours for this month
  trackedHours?: number; // Actually tracked hours (can be manually adjusted)
  autoTrackedHours?: number; // Hours automatically tracked from tasks
}

export interface TimerState {
  isActive: boolean;
  isPaused: boolean;
  startTime?: number;
  pausedTime?: number;
  elapsedTime?: number;
  remainingTime?: number;
  mode: 'normal' | 'pomodoro';
  pomodoroSettings?: PomodoroSettings;
}

export interface ActiveTimerContext {
  taskId: string;
  taskTitle: string;
  estimatedTime: number;
  elapsedTime: number;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  isOvertime?: boolean;
  mode: 'normal' | 'pomodoro';
  pomodoroSession?: {
    type: 'work' | 'shortBreak' | 'longBreak';
    sessionNumber: number;
    totalSessions: number;
    sessionStartTime: number;
    sessionElapsedTime: number;
    sessionRemainingTime: number;
  };
}

export interface PomodoroSettings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // after how many work sessions
  currentSession: number;
  totalSessions: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
  profiles: Profile[];
  activeProfileId: string;
  preferences: UserPreferences;
  syncConfig?: SyncConfig;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'de';
  accentColor: string;
  minimalDesign?: boolean; // Minimalistic design without glass effects
  backgroundImage?: string; // URL für Hintergrundbild im Aufgaben-Bereich
  backgroundType?: 'image' | 'color' | 'gradient'; // Art des Hintergrunds
  backgroundColor?: string; // Einfarbiger Hintergrund
  gradientFrom?: string; // Startfarbe für Farbverlauf
  gradientTo?: string; // Endfarbe für Farbverlauf
  gradientDirection?: string; // Richtung des Farbverlaufs
  recentBackgroundImages?: string[]; // Die letzten 5 verwendeten Hintergrundbilder
  greetingText?: string; // Konfigurierbarer Begrüßungstext für das Dashboard
  backgroundEffects?: {
    blur: boolean;
    overlay: boolean;
    overlayOpacity: number;
  };
  notifications: {
    email: boolean;
    push: boolean;
    timerReminders: boolean;
    deadlineReminders: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
  dateFormat: string;
  sounds: boolean;
  soundVolume: number;
  completionSound: 'bell' | 'chime' | 'yeah' | 'none';
  completionSoundEnabled?: boolean;
  enableCelebration: boolean; // Fuchs-Animation und Konfetti beim Abhaken
  timerDisplayMode: 'topBar' | 'floatingWidget' | 'separateWindow';
  celebrationText: string; // Text der bei der Celebration angezeigt wird
  celebrationDuration: number; // Dauer der Animation in Millisekunden
  columns: {
    visible: number; // default fallback
    plannerVisible?: number; // Task planner columns
    projectsVisible?: number; // Project Kanban columns
    pinsVisible?: number; // Pins view columns
    showProjects: boolean;
    dateColumnOrder?: string[]; // Array of date column IDs in custom order
  };
  showPriorities: boolean; // Ob Prioritäten angezeigt werden sollen
  // Sidebar customization
  sidebar: {
    hiddenItems: string[]; // Array of hidden sidebar item IDs
    itemOrder: string[]; // Array of sidebar item IDs in custom order
    moreItems?: string[]; // Items that should appear under "Mehr"
  };
  // End-of-day feature
  enableEndOfDay: boolean;
  // Onboarding
  hasCompletedOnboarding?: boolean;
  // Focus mode setting
  enableFocusMode: boolean; // Whether focus mode is enabled
  // Timer and Pomodoro settings
  pomodoro: {
    enabled: boolean;
    workDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    longBreakInterval: number; // after how many work sessions
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    soundEnabled: boolean;
    pomodoroSound: 'bell' | 'chime' | 'yeah' | 'none';
    breakSound: 'bell' | 'chime' | 'yeah' | 'none';
    taskSound: 'bell' | 'chime' | 'yeah' | 'none';
    // White noise settings
    whiteNoiseEnabled: boolean;
    whiteNoiseType: 'clock' | 'none';
    whiteNoiseVolume: number; // 0-1
  };
  timer: {
    showOverlay: boolean;
    overlayPosition: { x: number; y: number };
    overlayMinimized: boolean;
    autoOpenTaskOnStart: boolean;
    showRemainingTime: boolean;
    dimControlsWhenNoTask: boolean;
  };
  // Daily Notes template
  dailyNoteTemplate?: string; // Template content for new daily notes
  
  // Glass effects settings
  glassEffects?: {
    enabled: boolean;
    primarySidebar: boolean;
    secondarySidebar: boolean;
  };
  
  // Integration settings
  toggl?: {
    enabled: boolean;
    apiToken: string;
    workspaceId: string;
    defaultProjectId?: string;
    autoSync: boolean;
    syncOnStart: boolean;
    syncOnPause: boolean;
    syncOnStop: boolean;
    createProjectsAutomatically: boolean;
    useTaskDescriptions: boolean;
    roundTimeToMinutes: boolean;
  };
  
  // Dropbox E2EE sync settings
  dropbox?: DropboxSettings;
  
  caldav?: {
    enabled: boolean;
    serverUrl: string;
    username: string;
    password: string;
    calendarUrl: string;
    autoSync: boolean;
    syncInterval: number;
    syncOnStart: boolean;
    syncOnTaskChange: boolean;
    bidirectionalSync: boolean;
    conflictResolution: 'local' | 'remote' | 'manual';
    lastSync?: string; // ISO date string of last sync
    lastSyncStatus?: 'success' | 'error' | 'pending';
    lastSyncError?: string; // Error message from last failed sync
  };
  
  calendars?: {
    showInPlanner: boolean;
    hiddenEvents?: string[];
    collapsedEvents?: string[];
  };
  
  todoist?: {
    enabled: boolean;
    apiToken: string;
    syncTags: string[]; // Tags that trigger sync (e.g., ['todoist', 'sync'])
    autoSync: boolean;
    syncInterval: number;
    syncOnStart: boolean;
    syncOnTaskChange: boolean;
    bidirectionalSync: boolean;
    syncCompletedTasks: boolean;
    defaultProjectId?: string;
    conflictResolution: 'local' | 'remote' | 'manual';
    lastSync?: string; // ISO date string of last sync
    lastSyncStatus?: 'success' | 'error' | 'pending';
    lastSyncError?: string; // Error message from last failed sync
  };
  // Microsoft To Do Integration Settings
  microsoftTodo?: MicrosoftToDoSettings;

  // Local JSON backup settings
  backup?: {
    enabled: boolean;
    intervalMinutes: number; // how often to write backup automatically
    notify?: boolean; // show 2s toast after backup
    lastSuccess?: string; // ISO timestamp of last successful backup
  };
}

export interface Statistics {
  totalTasks: number;
  completedTasks: number;
  totalTime: number;
  pomodoroSessions: number;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
}

export interface DailyStats {
  date: string;
  tasksCompleted: number;
  timeTracked: number;
  pomodoroSessions: number;
}

export interface WeeklyStats {
  weekStart: string;
  tasksCompleted: number;
  timeTracked: number;
  pomodoroSessions: number;
}

export interface MonthlyStats {
  month: string;
  tasksCompleted: number;
  timeTracked: number;
  pomodoroSessions: number;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Kanban Board Types
export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  groupingMode: KanbanGroupingMode;
  columns: KanbanColumnConfig[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumnConfig {
  id: string;
  title: string;
  color?: string;
  order: number;
  groupValue: string; // The value this column represents (e.g., 'high', 'medium', 'low' for priority)
}

export type KanbanGroupingMode = 'status' | 'priority' | 'tags' | 'date' | 'projects' | 'deadlines' | 'custom';

export type ViewMode = 'columns' | 'kanban';

export interface ViewState {
  currentMode: ViewMode;
  activeKanbanBoard?: string;
  kanbanGrouping: KanbanGroupingMode;
  taskView: 'board' | 'list';
  projectKanban: ProjectKanbanState;
}

// Account & Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  token?: string;
}

// Sync & WebDAV Types
export interface SyncConfig {
  enabled: boolean;
  provider: 'nextcloud' | 'webdav';
  serverUrl: string;
  username: string;
  password?: string; // encrypted
  syncInterval: number; // minutes
  lastSync?: string;
  autoSync: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
}

// ===== Dropbox E2EE Sync Types =====
export interface DropboxSettings {
  enabled: boolean;
  appKey: string; // Dropbox App Key (no secret needed for PKCE)
  accessToken?: string; // stored securely locally
  refreshToken?: string; // long-lived refresh token
  expiresAt?: number; // epoch ms
  accountEmail?: string;
  accountName?: string;
  folderPath: string; // e.g., "/Apps/TaskFuchs"
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync?: string;
  lastSyncStatus?: 'success' | 'error' | 'pending';
  lastSyncError?: string;
  conflictResolution?: 'local' | 'remote' | 'manual';
  rememberPassphrase?: boolean; // whether to persist passphrase
  passphraseHint?: string; // optional hint for user
  pullBeforeAutoSync?: boolean; // if true, Auto-Sync performs Pull -> Push
}

export interface SyncStatus {
  isActive: boolean;
  lastSync?: string;
  nextSync?: string;
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  error?: string;
  conflicts?: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  type: 'task' | 'column' | 'tag';
  localItem: any;
  remoteItem: any;
  resolution?: 'local' | 'remote';
}

// Quick Input Parsing Types
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface ParsedTask {
  title: string;
  description?: string;
  estimatedTime?: number;
  dueDate?: string;
  priority?: TaskPriority;
  tags: string[];
  columnId?: string;
  projectId?: string; // NEW: Project assignment via smart parsing
  openProjectSelector?: boolean; // NEW: Signal to open project selector when @ is used alone
}

export interface ParseResult {
  success: boolean;
  task?: ParsedTask;
  errors: string[];
  suggestions?: string[];
}

// Notes Types
export interface Note {
  id: string;
  title: string;
  content: string; // Markdown content
  tags: string[];
  linkedTasks: string[]; // Task IDs linked to this note
  linkedNotes: string[]; // Other note IDs linked to this note
  linkedProjects: string[]; // Project IDs linked to this note
  pinnedToProjects?: string[]; // Project IDs where this note is pinned
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: NoteMetadata;
  dailyNote?: boolean; // Whether this is a daily note
  dailyNoteDate?: string; // Date for daily notes (YYYY-MM-DD format)
}

export interface NoteMetadata {
  wordCount?: number;
  readingTime?: number;
  lastViewedAt?: string;
  viewCount?: number;
  contentType?: 'markdown' | 'html'; // Support different content types
  emailMetadata?: {
    from: { email: string; name?: string };
    to: { email: string; name?: string }[];
    cc?: { email: string; name?: string }[];
    date: Date;
    messageId: string;
    originalSubject: string;
    headers: Record<string, string>;
  };
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  cached?: boolean;
  cachedAt?: string;
}

export interface NoteLink {
  id: string;
  fromId: string; // Note, Task, or Project ID
  toId: string; // Note, Task, or Project ID
  fromType: 'note' | 'task' | 'project';
  toType: 'note' | 'task' | 'project';
  context?: string; // Context where the link was created
  createdAt: string;
}

export interface NotesState {
  notes: Note[];
  selectedNote: Note | null;
  isEditing: boolean;
  searchQuery: string;
  selectedTags: string[];
  view: 'grid' | 'list' | 'editor';
  sortBy: 'updated' | 'created' | 'title' | 'tags';
  sortOrder: 'asc' | 'desc';
  showArchived: boolean;
  showLinkPreviews: boolean;
  editorMode: 'markdown' | 'wysiwyg' | 'split';
  dailyNotesMode: boolean; // Whether we're in daily notes mode
  emailMode: boolean; // Whether we're in email mode
  selectedDailyNoteDate: string | null; // Currently selected daily note date (YYYY-MM-DD)
}

export interface Notification {
  id: string;
  taskId?: string;
  title: string;
  message: string;
  timestamp: string; // ISO datetime string
  type: 'reminder' | 'deadline' | 'overdue' | 'success';
  read: boolean;
}

// Project-based Kanban Types
export interface ProjectKanbanColumn {
  id: string;
  title: string;
  projectId: string;
  color?: string;
  order: number;
  isDefault?: boolean; // True for the default "Aufgaben" column
}

export interface ProjectKanbanState {
  selectedProjectId: string | null;
  columns: ProjectKanbanColumn[];
  searchQuery: string;
  priorityFilters: TaskPriority[];
  tagFilters: string[];
  showCompleted: boolean;
  viewType: 'board' | 'list'; // Toggle between board and list view
}

export interface ProjectKanbanFilter {
  type: 'priority' | 'tags' | 'completion';
  value: string;
  active: boolean;
}

// Image Storage System
export interface StoredImage {
  id: string;
  filename: string;
  originalName?: string;
  data: string; // Base64 encoded image data
  mimeType: string;
  size: number; // File size in bytes
  width?: number;
  height?: number;
  createdAt: string;
  lastUsedAt: string;
  usageCount: number; // How many notes reference this image
  referencingNotes: string[]; // Note IDs that reference this image
}

export interface ImageStorageState {
  images: StoredImage[];
  totalSize: number; // Total storage size in bytes
  maxSize: number; // Maximum allowed storage size in bytes (default 100MB)
  autoCleanup: boolean; // Whether to automatically remove unused images
  cleanupAfterDays: number; // Remove unused images after X days (default 30)
  compressionQuality: number; // JPEG compression quality 0-1 (default 0.8)
  maxImageSize: number; // Maximum image size in bytes (default 10MB)
}

export interface ImageReference {
  imageId: string;
  noteId: string;
  markdownSrc: string; // The src path used in markdown (e.g., 'storage://image-id')
  createdAt: string;
}

// Recurrence-related types
export interface RecurrenceRule {
  id: string;
  pattern: RecurrencePattern;
  interval: number; // Every X days/weeks/months/years
  end: RecurrenceEnd;
  weekdays?: WeekDay[]; // For weekly recurrence
  monthDay?: number; // For monthly recurrence (1-31)
  yearDay?: number; // For yearly recurrence (1-366)
  exceptions?: string[]; // Dates (ISO format) to skip
  createdAt: string;
  updatedAt: string;
  // Optional runtime flags/stats used by reducer/UI
  isActive?: boolean;
  stats?: {
    totalGenerated: number;
    lastGenerated?: string;
    completionRate?: number;
  };
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface RecurrenceEnd {
  type: 'never' | 'after' | 'on';
  count?: number; // For 'after' type
  date?: string; // ISO date string for 'on' type
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface RecurringTask extends Task {
  scheduledDate?: string;
  rescheduledFrom?: string;
}

export interface RecurrenceState {
  rules: RecurrenceRule[];
  activeRule: RecurrenceRule | null;
  generatedTasks: RecurringTask[];
  upcomingTasks: RecurringTask[];
  completedTasks: RecurringTask[];
  skippedTasks: RecurringTask[];
  showCompleted: boolean;
  showSkipped: boolean;
  selectedTimeframe: 'week' | 'month' | '3months' | 'year';
  sortBy: 'date' | 'name' | 'completion_rate' | 'created';
  sortOrder: 'asc' | 'desc';
  overallStats: {
    totalRules: number;
    activeRules: number;
    totalTasks: number;
    completedTasks: number;
    averageCompletionRate: number;
  };
}

export interface TaskInstance {
  id: string;
  originalTaskId: string;
  recurrenceRuleId: string;
  instanceDate: string; // ISO date string for this instance
  overrides?: Partial<Task>; // Any overrides for this specific instance
  generated: boolean;
  createdAt: string;
}

// Recurrence constants
export const RECURRENCE_CONSTANTS = {
  MAX_PREVIEW_ITEMS: 10,
  DEFAULT_GENERATE_AHEAD: 30,
  DEFAULT_CLEANUP_AFTER: 90
};

// Calendar integration types
export interface CalendarSource {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
  syncInterval?: number; // in minutes
  autoSync?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  url?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  lastModified?: string;
  created?: string;
  recurrence?: string;
  calendarUrl: string;
  uid?: string;
} 

// CalDAV integration types
export interface CalDAVConnection {
  serverUrl: string;
  username: string;
  password: string;
  calendarUrl?: string;
  connected: boolean;
}

export interface CalDAVCalendar {
  name: string;
  displayName: string;
  url: string;
  description?: string;
  color?: string;
  todoCount?: number;
  lastModified?: string;
  ctag?: string;
  supportedComponents?: string[];
}

export interface CalDAVTodo {
  uid: string;
  summary: string;
  description?: string;
  status: 'NEEDS-ACTION' | 'IN-PROCESS' | 'COMPLETED' | 'CANCELLED';
  priority?: number;
  percentComplete?: number;
  created?: string;
  lastModified?: string;
  dueDate?: string;
  completedDate?: string;
  categories?: string[];
  url?: string;
  etag?: string;
  href?: string;
}

// Todoist integration types
export interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
  order: number;
  comment_count: number;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
}

export interface TodoistTask {
  id: string;
  project_id: string;
  section_id?: string;
  parent_id?: string; // For subtasks - ID of parent task
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  priority: number; // 1-4 where 4 is highest
  comment_count: number;
  creator_id: string;
  created_at: string;
  due?: {
    date: string;
    is_recurring: boolean;
    datetime?: string;
    string: string;
    timezone?: string;
  };
  url: string;
  duration?: {
    amount: number;
    unit: string;
  };
}

export interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface TodoistSyncOptions {
  syncOnlyTagged?: boolean;
  requiredTags?: string[];
  includeCompleted?: boolean;
  targetProjectId?: string;
}

export interface TodoistSyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  conflicts: Array<{
    taskId: string;
    type: 'content' | 'completion' | 'due_date';
    localValue: any;
    remoteValue: any;
  }>;
}

export interface CalDAVSyncResult {
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  conflicts: CalDAVConflict[];
  errors: string[];
}

export interface CalDAVConflict {
  localTask: Task;
  remoteTodo: CalDAVTodo;
  reason: string;
  resolution?: 'local' | 'remote' | 'manual';
}

export interface CalDAVSyncOptions {
  conflictResolution?: 'local' | 'remote' | 'manual';
  onProgress?: (progress: number, message: string) => void;
  dryRun?: boolean;
}

// Checklist Types
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  reminderDate?: string;
  reminderTime?: string;
}

export interface PersonalCapacity {
  yearlyCapacities: { [year: number]: YearlyCapacity };
  updatedAt: string;
}

export interface YearlyCapacity {
  monthlyCapacities: { [month: number]: MonthlyCapacity };
  distributionMode: 'manual' | 'equal';
  totalYearlyHours?: number;
}

export interface MonthlyCapacity {
  plannedHours: number; // Available working hours per month
}

// ===== MICROSOFT TO-DO INTEGRATION TYPES =====

export interface MicrosoftToDoAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

export interface MicrosoftToDoList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName?: string;
  '@odata.etag': string;
}

export interface MicrosoftToDoSection {
  id: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  '@odata.etag': string;
}

export interface MicrosoftToDoTask {
  id: string;
  title: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
  importance?: 'low' | 'normal' | 'high';
  isReminderOn?: boolean;
  reminderDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  completedDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  createdDateTime: string;
  lastModifiedDateTime: string;
  '@odata.etag': string;
}

export interface MicrosoftToDoSyncOptions {
  onProgress?: (progress: number, message: string) => void;
  conflictResolution?: 'local' | 'remote' | 'manual';
}

export interface MicrosoftToDoSyncResult {
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  conflicts: MicrosoftToDoSyncConflict[];
  errors: string[];
}

export interface MicrosoftToDoSyncConflict {
  taskId: string;
  localTask: Task;
  remoteTask: MicrosoftToDoTask;
  conflictType: 'modified' | 'deleted';
}

export interface MicrosoftToDoProjectMapping {
  taskFuchsProjectId: string;
  taskFuchsProjectName: string;
  microsoftSectionId: string;
  microsoftSectionName: string;
  enabled: boolean;
  columnMappings: MicrosoftToDoColumnMapping[];
}

export interface MicrosoftToDoColumnMapping {
  taskFuchsColumnId: string;
  taskFuchsColumnName: string;
  microsoftListId: string;
  microsoftListName: string;
  enabled: boolean;
}

export interface MicrosoftToDoSettings {
  enabled: boolean;
  selectedListId: string;
  selectedListName: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  syncOnStart: boolean;
  syncOnTaskChange: boolean;
  bidirectionalSync: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
  lastSync?: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  
  // NEW: Section/Project mapping
  projectMappings: MicrosoftToDoProjectMapping[];
  useSectionMapping: boolean; // Whether to use sections or single list
}

