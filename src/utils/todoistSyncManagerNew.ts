import type { 
  Task, 
  Subtask,
  TaskReminder,
  UserPreferences, 
  Column,
  TodoistProject, 
  TodoistTask, 
  TodoistLabel,
  TodoistSection
} from '../types';

// Import debug utility
import { TodoistSyncDebugger } from './todoistSyncDebug';

// Error Recovery and Retry Types
export type SyncErrorType = 
  | 'network'        // Network connectivity issues
  | 'auth'           // Authentication/authorization errors
  | 'ratelimit'      // API rate limiting
  | 'validation'     // Data validation errors
  | 'conflict'       // Sync conflicts
  | 'server'         // Server errors (5xx)
  | 'client'         // Client errors (4xx, excluding auth/ratelimit)
  | 'unknown';       // Unclassified errors

export interface SyncError {
  type: SyncErrorType;
  message: string;
  operation: string;
  retryable: boolean;
  timestamp: string;
  attempt: number;
  originalError?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // milliseconds
  backoffMultiplier: number;
  retryableErrors: SyncErrorType[];
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: string;
  successCount: number;
  nextRetryTime?: string;
}

// Enhanced types for automatic column/section sync
export interface TodoistProjectMapping {
  taskFuchsProjectId: string; // TaskFuchs project column ID
  todoistProjectId: string;    // Todoist project ID
  taskFuchsProjectName: string; // Display name
  todoistProjectName: string;   // Display name
  enabled: boolean;             // Whether this mapping is active
}

export interface TodoistSyncConfig {
  enabled: boolean;
  apiToken: string;
  bidirectionalSync: boolean;
  autoSyncInterval: number; // minutes, 0 = disabled
  lastSync?: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  projectMappings: TodoistProjectMapping[];
  // No more sectionMappings - columns/sections are automatically synced
  syncInbox: boolean; // NEW: Sync TaskFuchs Inbox with Todoist Inbox
  syncSettings: {
    syncTasks: boolean;
    syncDescriptions: boolean;
    syncDueDates: boolean;
    syncPriorities: boolean;
    syncLabels: boolean;
    autoCreateSections: boolean; // Automatically create missing sections/columns
    conflictResolution: 'local-wins' | 'remote-wins' | 'manual';
  };
  // NEW: Deletion sync tracking & incremental sync
  lastSyncState?: {
    todoistTaskIds: string[];  // Task IDs that existed in Todoist at last sync
    taskFuchsTaskIds: string[]; // Task IDs that existed in TaskFuchs at last sync
    todoistSectionIds: string[]; // Section IDs that existed in Todoist at last sync
    taskFuchsColumnIds: string[]; // Column IDs that existed in TaskFuchs at last sync
    timestamp: string;
    // NEW: Incremental sync optimization
    lastFullSyncTimestamp?: string; // Last time a full sync was performed
    lastIncrementalSyncTimestamp?: string; // Last time an incremental sync was performed
    syncType?: 'full' | 'incremental'; // Type of last sync
    changesSinceLastSync?: {
      todoistChanges: number; // Number of changes detected in Todoist
      taskFuchsChanges: number; // Number of changes detected in TaskFuchs
    };
  };
  // NEW: Task metadata for conflict detection
  taskMetadata?: {
    [taskId: string]: {
      lastSyncTimestamp: string;
      todoistLastModified?: string;
      taskFuchsLastModified?: string;
      lastSyncedContent: {
        title: string;
        description?: string;
        dueDate?: string;
        deadline?: string;
        tags?: string[];
        completed?: boolean;
        priority?: number;
      };
    };
  };
  // NEW: Bidirectional ID mapping for proper deletion sync
  idMappings?: {
    todoistToTaskFuchs: Record<string, string>; // Todoist ID -> TaskFuchs ID
    taskFuchsToTodoist: Record<string, string>; // TaskFuchs ID -> Todoist ID
    // NEW: Section/Column mappings
    todoistSectionToTaskFuchsColumn: Record<string, string>; // Todoist Section ID -> TaskFuchs Column ID
    taskFuchsColumnToTodoistSection: Record<string, string>; // TaskFuchs Column ID -> Todoist Section ID
  };
  // NEW: Error Recovery and Retry Configuration
  retryConfig?: RetryConfig;
  circuitBreaker?: CircuitBreakerState;
  errorLog?: SyncError[]; // Keep track of recent errors for analysis
}

export interface TodoistSyncResult {
  success: boolean;
  tasksCreated: number;
  tasksUpdated: number;
  tasksDeleted: number;
  // NEW: Incremental sync information
  syncType: 'full' | 'incremental';
  syncDuration: number; // in milliseconds
  itemsProcessed: number;
  itemsSkipped: number;
  sectionsCreated: number;     // NEW: Track auto-created sections
  sectionsUpdated: number;     // NEW: Track updated sections
  sectionsDeleted: number;     // NEW: Track deleted sections
  columnsCreated: number;      // NEW: Track auto-created columns
  columnsUpdated: number;      // NEW: Track updated columns
  columnsDeleted: number;      // NEW: Track deleted columns
  // NEW: Label/Tag tracking
  labelsCreated: number;       // NEW: Track auto-created Todoist labels
  labelsUpdated: number;       // NEW: Track updated Todoist labels
  tagsCreated: string[];       // NEW: Track auto-created TaskFuchs tags
  localTasksAdded: Task[];
  localTasksUpdated: Task[];
  localTasksDeleted: string[]; // NEW: Task IDs that were deleted from TaskFuchs
  localColumnsAdded: Column[]; // NEW: Track added columns
  localColumnsUpdated: Column[]; // NEW: Track updated columns
  localColumnsDeleted: string[]; // NEW: Track deleted column IDs
  dateColumnsNeeded: string[]; // NEW: Track date columns that need to be created
  conflicts: Array<{
    taskId: string;
    title: string;
    conflictType: 'content' | 'deletion' | 'creation';
    localData: {
      task: Task;
      lastModified: string;
    };
    remoteData: {
      task: TodoistTask;
      lastModified: string;
    };
    resolution?: 'local' | 'remote' | 'merge' | 'skip';
  }>;
  errors: string[];
  // NEW: Enhanced error tracking
  detailedErrors: SyncError[];
  partialFailures: Array<{
    operation: string;
    entityId?: string;
    entityName?: string;
    error: SyncError;
    recovered: boolean;
  }>;
  retryAttempts: number;
  circuitBreakerTriggered: boolean;
  summary: string;
}

export class TodoistSyncManager {
  private baseUrl = 'https://api.todoist.com/rest/v2';
  private config: TodoistSyncConfig | null = null;
  private syncInProgress = false;
  private dateColumnsNeeded: Set<string> = new Set(); // Track date columns that need to be created
  private autoSyncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadConfig();
    this.setupAutoSync();
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('taskfuchs-todoist-sync-config');
      if (saved) {
        this.config = JSON.parse(saved);
        console.log('📋 Loaded Todoist sync config:', this.config);
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.error('❌ Error loading Todoist sync config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      if (this.config) {
        localStorage.setItem('taskfuchs-todoist-sync-config', JSON.stringify(this.config));
        console.log('💾 Saved Todoist sync config');
      }
    } catch (error) {
      console.error('❌ Error saving Todoist sync config:', error);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): TodoistSyncConfig {
    return {
      enabled: false,
      apiToken: '',
      bidirectionalSync: true,
      autoSyncInterval: 15, // 15 minutes default
      projectMappings: [],
      syncInbox: false, // Default: Inbox sync disabled
      syncSettings: {
        syncTasks: true,
        syncDescriptions: true,
        syncDueDates: true,
        syncPriorities: true,
        syncLabels: true,
        autoCreateSections: true, // Enable automatic section/column creation
        conflictResolution: 'local-wins'
      },
      retryConfig: this.getDefaultRetryConfig(),
      circuitBreaker: this.getDefaultCircuitBreakerState(),
      errorLog: []
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TodoistSyncConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<TodoistSyncConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates };
      this.saveConfig();
      this.setupAutoSync(); // Restart auto-sync if interval changed
    }
  }

  /**
   * Reset configuration to defaults
   */
  public resetConfig(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
    this.setupAutoSync();
  }

  // ============================================================================
  // ERROR RECOVERY AND RETRY MECHANISMS
  // ============================================================================

  /**
   * Get default retry configuration
   */
  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      baseDelay: 1000,      // 1 second
      maxDelay: 30000,      // 30 seconds
      backoffMultiplier: 2,
      retryableErrors: ['network', 'ratelimit', 'server']
    };
  }

  /**
   * Get default circuit breaker state
   */
  private getDefaultCircuitBreakerState(): CircuitBreakerState {
    return {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    };
  }

  /**
   * Classify error type for retry logic
   */
  private classifyError(error: any): SyncErrorType {
    if (!error) return 'unknown';
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || 
        error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      return 'network';
    }
    
    // HTTP status code based classification
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;
      
      if (status === 401 || status === 403) return 'auth';
      if (status === 429) return 'ratelimit';
      if (status >= 400 && status < 500) return 'client';
      if (status >= 500) return 'server';
    }
    
    // Validation errors
    if (error.message?.includes('validation') || 
        error.message?.includes('invalid') ||
        error.name === 'ValidationError') {
      return 'validation';
    }
    
    // Conflict errors
    if (error.message?.includes('conflict') ||
        error.message?.includes('version') ||
        error.status === 409) {
      return 'conflict';
    }
    
    return 'unknown';
  }

  /**
   * Create a SyncError object
   */
  private createSyncError(
    error: any, 
    operation: string, 
    attempt: number = 1
  ): SyncError {
    const errorType = this.classifyError(error);
    const retryConfig = this.config?.retryConfig || this.getDefaultRetryConfig();
    
    return {
      type: errorType,
      message: error.message || error.toString(),
      operation,
      retryable: retryConfig.retryableErrors.includes(errorType),
      timestamp: new Date().toISOString(),
      attempt,
      originalError: error
    };
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number, multiplier: number): number {
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    const jitter = delay * 0.1 * Math.random(); // Add 10% jitter
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): boolean {
    if (!this.config?.circuitBreaker) {
      this.config!.circuitBreaker = this.getDefaultCircuitBreakerState();
    }
    
    const cb = this.config.circuitBreaker;
    const now = Date.now();
    
    switch (cb.state) {
      case 'closed':
        return true; // Allow operation
        
      case 'open':
        if (cb.nextRetryTime && now >= new Date(cb.nextRetryTime).getTime()) {
          // Try to transition to half-open
          cb.state = 'half-open';
          cb.successCount = 0;
          console.log('🔄 Circuit breaker transitioning to half-open state');
          return true;
        }
        return false; // Block operation
        
      case 'half-open':
        return true; // Allow limited operations
        
      default:
        return true;
    }
  }

  /**
   * Update circuit breaker on operation result
   */
  private updateCircuitBreaker(success: boolean): void {
    if (!this.config?.circuitBreaker) return;
    
    const cb = this.config.circuitBreaker;
    const now = new Date().toISOString();
    
    if (success) {
      cb.successCount++;
      cb.failureCount = 0;
      
      if (cb.state === 'half-open' && cb.successCount >= 3) {
        console.log('✅ Circuit breaker closed - operations restored');
        cb.state = 'closed';
        cb.successCount = 0;
      }
    } else {
      cb.failureCount++;
      cb.lastFailureTime = now;
      cb.successCount = 0;
      
      // Open circuit breaker after 5 consecutive failures
      if (cb.failureCount >= 5 && cb.state !== 'open') {
        console.log('🚫 Circuit breaker opened - blocking operations for 5 minutes');
        cb.state = 'open';
        cb.nextRetryTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
      }
    }
    
    this.saveConfig();
  }

  /**
   * Retry wrapper for async operations with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    result?: TodoistSyncResult
  ): Promise<T> {
    const retryConfig = this.config?.retryConfig || this.getDefaultRetryConfig();
    let lastError: any;
    
    // Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      const error = new Error('Circuit breaker is open - operation blocked');
      if (result) {
        result.circuitBreakerTriggered = true;
        result.detailedErrors.push(this.createSyncError(error, operationName));
      }
      throw error;
    }
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
      try {
        const operationResult = await operation();
        
        // Success - update circuit breaker
        this.updateCircuitBreaker(true);
        
        if (result && attempt > 1) {
          result.retryAttempts += attempt - 1;
          console.log(`✅ Operation "${operationName}" succeeded after ${attempt - 1} retries`);
        }
        
        return operationResult;
        
      } catch (error) {
        lastError = error;
        const syncError = this.createSyncError(error, operationName, attempt);
        
        if (result) {
          result.detailedErrors.push(syncError);
        }
        
        // Log error details
        console.warn(`⚠️ Attempt ${attempt} of "${operationName}" failed:`, syncError.message);
        
        // Don't retry if error is not retryable or we've exhausted retries
        if (!syncError.retryable || attempt > retryConfig.maxRetries) {
          console.error(`❌ Operation "${operationName}" failed permanently after ${attempt} attempts`);
          this.updateCircuitBreaker(false);
          break;
        }
        
        // Calculate delay and wait before retry
        const delay = this.calculateBackoffDelay(
          attempt, 
          retryConfig.baseDelay, 
          retryConfig.maxDelay, 
          retryConfig.backoffMultiplier
        );
        
        console.log(`⏱️ Retrying "${operationName}" in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted - update circuit breaker and throw
    this.updateCircuitBreaker(false);
    throw lastError;
  }

  /**
   * Add error to error log
   */
  private logError(error: SyncError): void {
    if (!this.config) return;
    
    if (!this.config.errorLog) {
      this.config.errorLog = [];
    }
    
    // Add new error
    this.config.errorLog.push(error);
    
    // Keep only last 50 errors
    if (this.config.errorLog.length > 50) {
      this.config.errorLog = this.config.errorLog.slice(-50);
    }
    
    this.saveConfig();
  }

  /**
   * Get recent errors for analysis
   */
  public getRecentErrors(): SyncError[] {
    return this.config?.errorLog || [];
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    if (this.config) {
      this.config.errorLog = [];
      this.saveConfig();
    }
  }

  /**
   * Test Todoist API connection
   */
  public async testConnection(): Promise<{ success: boolean; message: string; projects?: TodoistProject[] }> {
    if (!this.config?.apiToken) {
      return { success: false, message: 'API Token fehlt' };
    }

    try {
      const projects = await this.getTodoistProjects();
      return { 
        success: true, 
        message: `Verbindung erfolgreich - ${projects.length} Projekt(e) gefunden`,
        projects 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' 
      };
    }
  }

  /**
   * Get Todoist projects
   */
  public async getTodoistProjects(): Promise<TodoistProject[]> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/projects`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get Todoist sections for a project
   */
  public async getTodoistSections(projectId: string): Promise<TodoistSection[]> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/sections?project_id=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create new section in Todoist
   */
  public async createTodoistSection(name: string, projectId: string): Promise<TodoistSection> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/sections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        project_id: projectId
      })
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update Todoist section
   */
  public async updateTodoistSection(sectionId: string, name: string): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/sections/${sectionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name
      })
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Delete Todoist section
   */
  public async deleteTodoistSection(sectionId: string): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/sections/${sectionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Find or create section in Todoist based on TaskFuchs column
   */
  private async ensureTodoistSection(columnName: string, todoistProjectId: string): Promise<string | null> {
    try {
      // First, get all existing sections for this project
      const sections = await this.getTodoistSections(todoistProjectId);
      
      // Check if section already exists (case-insensitive)
      const existingSection = sections.find(
        section => section.name.toLowerCase() === columnName.toLowerCase()
      );
      
      if (existingSection) {
        return existingSection.id;
      }
      
      // Create new section if autoCreateSections is enabled
      if (this.config?.syncSettings.autoCreateSections) {
        const newSection = await this.createTodoistSection(columnName, todoistProjectId);
        console.log(`✅ Created new Todoist section: ${columnName} in project ${todoistProjectId}`);
        return newSection.id;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error ensuring Todoist section:', error);
      return null;
    }
  }

  /**
   * Find TaskFuchs column ID by name in a specific project
   */
  private findTaskFuchsColumnByName(columnName: string, projectId: string, localColumns: Column[]): string | null {
    const column = localColumns.find(
      col => col.projectId === projectId && 
             col.title?.toLowerCase() === columnName.toLowerCase() // Use title instead of name
    );
    return column?.id || null;
  }

  /**
   * Map Todoist section to TaskFuchs column ID based on section name
   */
  private async mapTodoistSectionToColumn(
    sectionId: string | undefined, 
    taskFuchsProjectId: string, 
    localColumns: Column[],
    todoistProjectId: string
  ): Promise<string> {
    if (!sectionId) {
      // No section - use first available project column
      const projectColumns = localColumns.filter(col => col.projectId === taskFuchsProjectId);
      return projectColumns.length > 0 ? projectColumns[0].id : localColumns[0]?.id || 'default';
    }

    try {
      // Get the section name from Todoist
      const sections = await this.getTodoistSections(todoistProjectId);
      const section = sections.find(s => s.id === sectionId);
      
      if (section) {
        // Find matching column by name
        const matchingColumn = localColumns.find(col => 
          col.projectId === taskFuchsProjectId && 
          col.title?.toLowerCase() === section.name.toLowerCase()
        );
        
        if (matchingColumn) {
          console.log(`✅ Mapped Todoist section "${section.name}" to TaskFuchs column "${matchingColumn.title}"`);
          return matchingColumn.id;
        } else {
          console.warn(`⚠️ No matching TaskFuchs column found for Todoist section "${section.name}"`);
        }
      }
    } catch (error) {
      console.warn('Failed to map Todoist section to column:', error);
    }

    // Fallback: use first available project column
    const projectColumns = localColumns.filter(col => col.projectId === taskFuchsProjectId);
    console.log(`🔄 Fallback: Using first project column for TaskFuchs project ${taskFuchsProjectId}`);
    return projectColumns.length > 0 ? projectColumns[0].id : localColumns[0]?.id || 'default';
  }

  /**
   * Map TaskFuchs column to Todoist section ID based on column name
   */
  private async mapTaskFuchsColumnToTodoistSection(
    taskFuchsColumnId: string,
    localColumns: Column[],
    todoistProjectId: string
  ): Promise<string | undefined> {
    // Find the TaskFuchs column
    const column = localColumns.find(col => col.id === taskFuchsColumnId);
    if (!column?.title) {
      return undefined;
    }

    try {
      // Get Todoist sections for this project
      const sections = await this.getTodoistSections(todoistProjectId);
      
      // Find matching section by name
      const matchingSection = sections.find(section => 
        section.name.toLowerCase() === column.title?.toLowerCase()
      );
      
      if (matchingSection) {
        console.log(`✅ Mapped TaskFuchs column "${column.title}" to Todoist section "${matchingSection.name}"`);
        return matchingSection.id;
      } else {
        console.warn(`⚠️ No matching Todoist section found for TaskFuchs column "${column.title}"`);
      }
    } catch (error) {
      console.warn('Failed to map TaskFuchs column to Todoist section:', error);
    }

    return undefined;
  }

  /**
   * Map Todoist due date to TaskFuchs column (Datum → Spaltenzuordnung)
   */
  private mapTodoistDueDateToColumn(dueDate: string | undefined, projectId: string, localColumns: Column[]): string {
    const projectColumns = localColumns.filter(col => col.projectId === projectId);
    
    console.log(`🔍 Mapping due date "${dueDate}" for project ${projectId}`);
    console.log(`📋 Available columns:`, projectColumns.map(c => ({ id: c.id, title: c.title })));
    
    if (!dueDate) {
      // Kein Datum → "Backlog" oder "Später" Spalte oder "Ohne Termin"
      const backlogColumn = projectColumns.find(col => 
        col.title?.toLowerCase().includes('backlog') || 
        col.title?.toLowerCase().includes('später') ||
        col.title?.toLowerCase().includes('someday') ||
        col.title?.toLowerCase().includes('ohne termin') ||
        col.title?.toLowerCase().includes('no date')
      );
      const result = backlogColumn?.id || projectColumns[0]?.id || projectId;
      console.log(`📅 No date → Column: ${backlogColumn?.title || 'fallback'} (${result})`);
      return result;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Normalize to start of day
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`📅 Due date: ${dueDate}, Days diff: ${diffDays}`);

    // Heute oder überfällig
    if (diffDays <= 0) {
      const todayColumn = projectColumns.find(col => 
        col.title?.toLowerCase().includes('heute') || 
        col.title?.toLowerCase().includes('today') ||
        col.title?.toLowerCase().includes('überfällig') ||
        col.title?.toLowerCase().includes('overdue')
      );
      const result = todayColumn?.id || projectColumns[0]?.id || projectId;
      console.log(`📅 Today/Overdue → Column: ${todayColumn?.title || 'fallback'} (${result})`);
      return result;
    }
    
    // Morgen
    if (diffDays === 1) {
      const tomorrowColumn = projectColumns.find(col => 
        col.title?.toLowerCase().includes('morgen') || 
        col.title?.toLowerCase().includes('tomorrow')
      );
      const result = tomorrowColumn?.id || projectColumns[0]?.id || projectId;
      console.log(`📅 Tomorrow → Column: ${tomorrowColumn?.title || 'fallback'} (${result})`);
      return result;
    }
    
    // Diese Woche (2-7 Tage)
    if (diffDays <= 7) {
      const weekColumn = projectColumns.find(col => 
        col.title?.toLowerCase().includes('woche') || 
        col.title?.toLowerCase().includes('week') ||
        col.title?.toLowerCase().includes('diese woche') ||
        col.title?.toLowerCase().includes('this week')
      );
      const result = weekColumn?.id || projectColumns[0]?.id || projectId;
      console.log(`📅 This week → Column: ${weekColumn?.title || 'fallback'} (${result})`);
      return result;
    }
    
    // Nächste Woche oder später
    const laterColumn = projectColumns.find(col => 
      col.title?.toLowerCase().includes('später') || 
      col.title?.toLowerCase().includes('later') ||
      col.title?.toLowerCase().includes('nächste') ||
      col.title?.toLowerCase().includes('next') ||
      col.title?.toLowerCase().includes('future')
    );
    const result = laterColumn?.id || projectColumns[0]?.id || projectId;
    console.log(`📅 Later → Column: ${laterColumn?.title || 'fallback'} (${result})`);
    return result;
  }

  /**
   * Extract deadline from Todoist task (from labels or description)
   */
  private extractDeadlineFromTodoist(todoistTask: TodoistTask, existingDeadline?: string): string | undefined {
    // Deadline aus Label extrahieren: #deadline:2024-01-15
    const deadlineLabel = todoistTask.labels.find(label => 
      label.toLowerCase().startsWith('deadline:') || 
      label.toLowerCase().startsWith('frist:')
    );
    
    if (deadlineLabel) {
      const deadlineDate = deadlineLabel.split(':')[1];
      if (deadlineDate && this.isValidDate(deadlineDate)) {
        return deadlineDate;
      }
    }
    
    // Deadline aus Beschreibung extrahieren: "Deadline: 2024-01-15"
    if (todoistTask.description) {
      const deadlineMatch = todoistTask.description.match(/(?:deadline|frist):\s*(\d{4}-\d{2}-\d{2})/i);
      if (deadlineMatch && deadlineMatch[1]) {
        return deadlineMatch[1];
      }
    }
    
    // Fallback auf existierende Deadline
    return existingDeadline;
  }

  /**
   * Convert Todoist subtasks to TaskFuchs subtasks
   */
  private convertTodoistSubtasks(todoistTaskId: string, existingSubtasks: any[]): any[] {
    // TODO: Implement subtask conversion when we have access to Todoist subtasks API
    // For now, preserve existing subtasks
    return existingSubtasks;
  }

  /**
   * Check if a string is a valid date
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Synchronize columns/sections between TaskFuchs and Todoist
   */
  private async syncColumnsAndSections(
    localColumns: Column[], 
    mapping: TodoistProjectMapping
  ): Promise<{ 
    sectionsCreated: number; 
    columnsCreated: number; 
    newColumns: Column[] 
  }> {
    let sectionsCreated = 0;
    let columnsCreated = 0;
    const newColumns: Column[] = [];

    if (!this.config?.syncSettings.autoCreateSections) {
      return { sectionsCreated, columnsCreated, newColumns };
    }

    try {
      // 1. Get existing Todoist sections
      const todoistSections = await this.getTodoistSections(mapping.todoistProjectId);
      
      // 2. Get existing TaskFuchs columns for this project
      const projectColumns = localColumns.filter(col => col.projectId === mapping.taskFuchsProjectId);
      
      // 3. Create missing sections in Todoist (TaskFuchs -> Todoist)
      for (const column of projectColumns) {
        if (column.title) {
          const existingSection = todoistSections.find(
            section => section.name.toLowerCase() === column.title?.toLowerCase()
          );
          
          if (!existingSection) {
            try {
              const newSection = await this.createTodoistSection(column.title, mapping.todoistProjectId);
              sectionsCreated++;
              
              // Store section/column ID mapping
              this.updateSectionColumnMapping(newSection.id, column.id);
              
              console.log(`✅ Created Todoist section: ${column.title} (mapped to column ${column.id})`);
            } catch (error) {
              console.error(`❌ Failed to create Todoist section ${column.title}:`, error);
            }
          } else {
            // Update mapping for existing section
            this.updateSectionColumnMapping(existingSection.id, column.id);
          }
        }
      }
      
      // 4. Create missing columns in TaskFuchs (Todoist -> TaskFuchs)
      for (const section of todoistSections) {
        const existingColumn = projectColumns.find(
          col => col.title?.toLowerCase() === section.name.toLowerCase()
        );
        
        if (!existingColumn) {
          // Create new column in TaskFuchs
          const newColumn: Column = {
            id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: section.name,
            type: 'project',
            order: projectColumns.length + columnsCreated,
            tasks: [],
            projectId: mapping.taskFuchsProjectId
          };
          
          newColumns.push(newColumn);
          columnsCreated++;
          
          // Store section/column ID mapping
          this.updateSectionColumnMapping(section.id, newColumn.id);
          
          console.log(`✅ Will create TaskFuchs column: ${section.name} (mapped to section ${section.id})`);
        } else {
          // Update mapping for existing column
          this.updateSectionColumnMapping(section.id, existingColumn.id);
        }
      }
      
      // Note: We only create columns based on actual Todoist sections, no standard date columns
      console.log(`📋 Sync restricted to actual Todoist sections only (no generic date columns)`);
      
    } catch (error) {
      console.error('❌ Error syncing columns and sections:', error);
    }

    return { sectionsCreated, columnsCreated, newColumns };
  }

  /**
   * Convert TaskFuchs task to Todoist task
   */
  private async convertToTodoistTask(task: Task, mapping: TodoistProjectMapping, localColumns: Column[], allLabels?: TodoistLabel[], result?: TodoistSyncResult): Promise<Partial<TodoistTask>> {
    const todoistTask: Partial<TodoistTask> = {
      content: task.title,
      description: this.config?.syncSettings.syncDescriptions ? task.description : undefined,
      project_id: mapping.todoistProjectId,
      is_completed: task.completed
    };

    // Set section_id based on TaskFuchs column (Spalte → Section)
    if (task.kanbanColumnId) {
      const sectionId = await this.mapTaskFuchsColumnToTodoistSection(
        task.kanbanColumnId,
        localColumns,
        mapping.todoistProjectId
      );
      if (sectionId) {
        todoistTask.section_id = sectionId;
      }
    }

    // Set due date if enabled (TaskFuchs reminderDate OR dueDate → Todoist due.date)
    // Prioritize reminderDate as it's the primary field for user-set reminders
    if (this.config?.syncSettings.syncDueDates) {
      const dueDateToSync = task.reminderDate || task.dueDate;
      if (dueDateToSync) {
        const sourceField = task.reminderDate ? 'reminderDate' : 'dueDate';
        console.log(`📅 Due Date Mapping: TaskFuchs task "${task.title}" has ${sourceField} "${dueDateToSync}" → Todoist due.date`);
        todoistTask.due = {
          date: dueDateToSync,
          is_recurring: false,
          string: dueDateToSync
        };
      } else {
        // Clear due date if no reminderDate or dueDate is set
        console.log(`📅 Due Date Clearing: TaskFuchs task "${task.title}" has no reminder/due date → clearing Todoist due.date`);
        todoistTask.due = null;
      }
    }

    // Set priority if enabled
    if (this.config?.syncSettings.syncPriorities) {
      const priorityMap = {
        none: 1,
        low: 2,
        medium: 3,
        high: 4
      };
      todoistTask.priority = priorityMap[task.priority] || 1;
    }

    // Set labels if enabled - with auto-creation
    if (this.config?.syncSettings.syncLabels && task.tags?.length > 0) {
      // Auto-create labels if we have the label array and result tracking
      if (allLabels && result) {
        const labelIds: string[] = [];
        
        for (const tagName of task.tags) {
          const cleanTagName = tagName.replace(/^[#@]/, ''); // Remove # or @ prefix
          
          try {
            const labelId = await this.ensureTodoistLabel(cleanTagName, allLabels);
            labelIds.push(labelId);
            
            // Track if we created a new label (check if it's the newest in array)
            const wasCreated = allLabels[allLabels.length - 1]?.name === cleanTagName;
            if (wasCreated) {
              result.labelsCreated++;
              console.log(`🏷️ Auto-created Todoist label: "${cleanTagName}"`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to ensure label "${cleanTagName}": ${error}`);
            // Continue with other labels, don't fail the entire sync
          }
        }
        
        todoistTask.labels = labelIds;
      } else {
        // Fallback: use tag names directly (legacy behavior)
        todoistTask.labels = task.tags.map(tag => tag.replace(/^[#@]/, ''));
      }
    }
    
    // Add deadline as label if it exists (TaskFuchs deadline → Todoist label)
    if (task.deadline) {
      if (!todoistTask.labels) todoistTask.labels = [];
      todoistTask.labels.push(`deadline:${task.deadline}`);
    }

    return todoistTask;
  }

  /**
   * Create/update Todoist subtasks from TaskFuchs subtasks
   */
  private async syncTaskFuchsSubtasksToTodoist(
    taskFuchsTask: Task, 
    todoistParentTaskId: string, 
    mapping: TodoistProjectMapping,
    allTodoistTasks: TodoistTask[]
  ): Promise<void> {
    if (!taskFuchsTask.subtasks || taskFuchsTask.subtasks.length === 0) {
      // Delete existing Todoist subtasks if TaskFuchs has no subtasks
      const existingSubtasks = allTodoistTasks.filter(t => t.parent_id === todoistParentTaskId);
      for (const subtask of existingSubtasks) {
        try {
          await this.deleteTodoistTask(subtask.id);
          console.log(`🗑️ Deleted Todoist subtask: ${subtask.content}`);
        } catch (error) {
          console.warn(`Failed to delete Todoist subtask ${subtask.id}:`, error);
        }
      }
      return;
    }

    // Get existing Todoist subtasks for this parent
    const existingTodoistSubtasks = allTodoistTasks.filter(t => t.parent_id === todoistParentTaskId);

    // Create/update subtasks
    for (const subtask of taskFuchsTask.subtasks) {
      try {
        // Find existing Todoist subtask by title match
        const existingSubtask = existingTodoistSubtasks.find(
          t => t.content.toLowerCase() === subtask.title.toLowerCase()
        );

        const todoistSubtaskData: Partial<TodoistTask> = {
          content: subtask.title,
          description: this.config?.syncSettings.syncDescriptions ? (subtask.description || '') : undefined,
          project_id: mapping.todoistProjectId,
          parent_id: todoistParentTaskId,
          is_completed: subtask.completed,
          labels: this.config?.syncSettings.syncLabels ? 
            subtask.tags.map(tag => tag.replace('#', '')) : []
        };

        if (existingSubtask) {
          // Update existing subtask
          await this.updateTodoistTask(existingSubtask.id, todoistSubtaskData);
          console.log(`✏️ Updated Todoist subtask: ${subtask.title}`);
        } else {
          // Create new subtask
          await this.createTodoistTask(todoistSubtaskData);
          console.log(`➕ Created Todoist subtask: ${subtask.title}`);
        }
      } catch (error) {
        console.warn(`Failed to sync subtask "${subtask.title}":`, error);
      }
    }

    // Delete Todoist subtasks that no longer exist in TaskFuchs
    for (const todoistSubtask of existingTodoistSubtasks) {
      const stillExists = taskFuchsTask.subtasks.some(
        ts => ts.title.toLowerCase() === todoistSubtask.content.toLowerCase()
      );
      
      if (!stillExists) {
        try {
          await this.deleteTodoistTask(todoistSubtask.id);
          console.log(`🗑️ Deleted obsolete Todoist subtask: ${todoistSubtask.content}`);
        } catch (error) {
          console.warn(`Failed to delete obsolete Todoist subtask ${todoistSubtask.id}:`, error);
        }
      }
    }
  }

  /**
   * Convert TaskFuchs inbox task to Todoist task
   */
  private convertInboxTaskToTodoist(task: Task, allLabels?: TodoistLabel[], result?: TodoistSyncResult): Partial<TodoistTask> {
    const todoistTask: Partial<TodoistTask> = {
      content: task.title,
      description: this.config?.syncSettings.syncDescriptions ? task.description : undefined,
      is_completed: task.completed
      // project_id will be set to inbox project ID when creating the task
    };

    // Set due date if enabled (TaskFuchs reminderDate OR dueDate → Todoist due.date)
    // Prioritize reminderDate as it's the primary field for user-set reminders
    if (this.config?.syncSettings.syncDueDates) {
      const dueDateToSync = task.reminderDate || task.dueDate;
      if (dueDateToSync) {
        const sourceField = task.reminderDate ? 'reminderDate' : 'dueDate';
        console.log(`📅 Due Date Mapping (Inbox): TaskFuchs task "${task.title}" has ${sourceField} "${dueDateToSync}" → Todoist due.date`);
        todoistTask.due = {
          date: dueDateToSync,
          is_recurring: false,
          string: dueDateToSync
        };
      } else {
        // Clear due date if no reminderDate or dueDate is set
        console.log(`📅 Due Date Clearing (Inbox): TaskFuchs task "${task.title}" has no reminder/due date → clearing Todoist due.date`);
        todoistTask.due = null;
      }
    }

    // Set priority if enabled
    if (this.config?.syncSettings.syncPriorities) {
      const priorityMap = {
        none: 1,
        low: 2,
        medium: 3,
        high: 4
      };
      todoistTask.priority = priorityMap[task.priority] || 1;
    }

    // Set labels if enabled
    if (this.config?.syncSettings.syncLabels && task.tags?.length > 0) {
      todoistTask.labels = task.tags.map(tag => tag.replace(/^[#@]/, '')); // Remove # or @ prefix
    }
    
    // Add deadline as label if it exists (TaskFuchs deadline → Todoist label)
    if (task.deadline) {
      if (!todoistTask.labels) todoistTask.labels = [];
      todoistTask.labels.push(`deadline:${task.deadline}`);
    }

    return todoistTask;
  }

  /**
   * Convert Todoist tasks (parent + children) to TaskFuchs task with subtasks
   */
  private async convertToTaskFuchsTask(
    todoistTask: TodoistTask, 
    mapping: TodoistProjectMapping,
    localColumns: Column[],
    existingTask?: Task,
    allTodoistTasks?: TodoistTask[], // All tasks for finding subtasks
    allTaskFuchsTags?: string[], // All existing TaskFuchs tags for auto-creation tracking
    result?: TodoistSyncResult
  ): Promise<Task> {
    // Find the appropriate column based on Todoist section (Section → Spalte)
    let columnId = await this.mapTodoistSectionToColumn(
      todoistTask.section_id, 
      mapping.taskFuchsProjectId, 
      localColumns, 
      mapping.todoistProjectId
    );
    
    // Find subtasks (TodoistTasks with parent_id === this task's id)
    const subtasks: Subtask[] = [];
    if (allTodoistTasks && !todoistTask.parent_id) { // Only for parent tasks
      const childTasks = allTodoistTasks.filter(t => t.parent_id === todoistTask.id);
      
      for (const childTask of childTasks) {
        const subtask: Subtask = {
          id: `todoist-${childTask.id}`,
          title: childTask.content,
          description: childTask.description || undefined,
          completed: childTask.is_completed,
          estimatedTime: undefined, // Todoist doesn't have this
          trackedTime: undefined, // Todoist doesn't have this
          tags: childTask.labels.map(label => `#${label}`),
          createdAt: childTask.created_at,
          updatedAt: new Date().toISOString()
        };
        subtasks.push(subtask);
      }
    }
    
    // Log Due Date Mapping for debugging
    if (todoistTask.due?.date) {
      console.log(`📅 Due Date Mapping: Todoist task "${todoistTask.content}" has due date "${todoistTask.due.date}"`);
      console.log(`⚙️ syncDueDates setting: ${this.config?.syncSettings.syncDueDates}`);
      
      if (this.config?.syncSettings.syncDueDates) {
        console.log(`✅ Setting TaskFuchs dueDate AND reminderDate to "${todoistTask.due.date}" for Planer integration`);
        console.log(`📋 Task will appear in project column AND planner date column`);
      } else {
        console.log(`❌ syncDueDates disabled - not setting dueDate or reminderDate`);
      }
    } else {
      console.log(`📅 Todoist task "${todoistTask.content}" has NO due date`);
    }

    // Determine correct columnId for tasks with both project and date
    let finalColumnId = columnId;
    let finalKanbanColumnId = columnId;
    
    // If task has both project and reminderDate, use date column as primary storage
    // This makes the task visible in BOTH project view AND planner
    if (this.config?.syncSettings.syncDueDates && todoistTask.due?.date) {
      finalColumnId = `date-${todoistTask.due.date}`; // Primary location: date column
      finalKanbanColumnId = columnId; // Keep section-based column for project kanban
      
      console.log(`🔄 Dual assignment: Task will be in date column "${finalColumnId}" and project kanban column "${finalKanbanColumnId}"`);
      
      // Note: We DON'T automatically create date columns anymore
      // Date columns should only exist if they're manually created or come from Todoist sections
      // this.dateColumnsNeeded.add(todoistTask.due.date);
    }

    const task: Task = {
      id: existingTask?.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: todoistTask.content,
      description: this.config?.syncSettings.syncDescriptions ? todoistTask.description || '' : (existingTask?.description || ''),
      completed: todoistTask.is_completed,
      projectId: mapping.taskFuchsProjectId,
      columnId: finalColumnId,
      kanbanColumnId: finalKanbanColumnId, // For project kanban boards
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: this.config?.syncSettings.syncDueDates ? todoistTask.due?.date : existingTask?.dueDate, // Todoist due.date → TaskFuchs dueDate (für Planer)
      ...this.extractReminderFromTodoist(todoistTask), // Simplified: Extract reminderDate & reminderTime from Todoist
      deadline: this.extractDeadlineFromTodoist(todoistTask, existingTask?.deadline), // Deadline aus Labels extrahieren
      priority: 'none',
      tags: [],
      trackedTime: existingTask?.trackedTime || 0, // Time Tracking NICHT synchronisieren
      estimatedTime: existingTask?.estimatedTime,  // Time Tracking NICHT synchronisieren
      subtasks: subtasks.length > 0 ? subtasks : (existingTask?.subtasks || []), // Todoist subtasks → TaskFuchs subtasks
      position: existingTask?.position || 0
    };

    // Set priority if enabled
    if (this.config?.syncSettings.syncPriorities) {
      const priorityMap = {
        1: 'none',
        2: 'low',
        3: 'medium',
        4: 'high'
      };
      task.priority = priorityMap[todoistTask.priority] as any || 'none';
    }

    // Add labels as tags if enabled (filter out deadline labels) - with auto-creation tracking
    if (this.config?.syncSettings.syncLabels && todoistTask.labels.length > 0) {
      const filteredLabels = todoistTask.labels.filter(label => 
        !label.startsWith('deadline:') && !label.startsWith('frist:')
      );
      
      const newTags: string[] = [];
      
      for (const label of filteredLabels) {
        const tagName = `#${label}`;
        newTags.push(tagName);
        
        // Track if this is a new tag for TaskFuchs
        if (allTaskFuchsTags && result && !allTaskFuchsTags.includes(tagName)) {
          result.tagsCreated.push(tagName);
          allTaskFuchsTags.push(tagName); // Add to cache for this sync
          console.log(`🏷️ Auto-created TaskFuchs tag: "${tagName}"`);
        }
      }
      
      task.tags = newTags;
    }

    return task;
  }

  /**
   * Convert Todoist inbox task to TaskFuchs task
   */
  private convertTodoistInboxToTaskFuchs(todoistTask: TodoistTask, existingTask?: Task): Task {
    // Note: We DON'T automatically create date columns anymore
    // Date columns should only exist if they're manually created or come from Todoist sections
    // if (this.config?.syncSettings.syncDueDates && todoistTask.due?.date) {
    //   this.dateColumnsNeeded.add(todoistTask.due.date);
    //   console.log(`📥 Inbox task "${todoistTask.content}" needs date column: ${todoistTask.due.date}`);
    // }
    
    const task: Task = {
      id: existingTask?.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: todoistTask.content,
      description: this.config?.syncSettings.syncDescriptions ? todoistTask.description || '' : (existingTask?.description || ''),
      completed: todoistTask.is_completed,
      projectId: 'inbox', // Set to inbox
      columnId: 'inbox', // Set to inbox
      kanbanColumnId: 'inbox', // For project kanban boards
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: this.config?.syncSettings.syncDueDates ? todoistTask.due?.date : existingTask?.dueDate, // Todoist due.date → TaskFuchs dueDate (für Planer)
      ...this.extractReminderFromTodoist(todoistTask), // Simplified: Extract reminderDate & reminderTime from Todoist
      deadline: this.extractDeadlineFromTodoist(todoistTask, existingTask?.deadline), // Deadline aus Labels extrahieren
      priority: 'none',
      tags: [],
      trackedTime: existingTask?.trackedTime || 0, // Time Tracking NICHT synchronisieren
      estimatedTime: existingTask?.estimatedTime,  // Time Tracking NICHT synchronisieren
      subtasks: this.convertTodoistSubtasks(todoistTask.id, existingTask?.subtasks || []),
      position: existingTask?.position || 0
    };

    // Set priority if enabled
    if (this.config?.syncSettings.syncPriorities) {
      const priorityMap = {
        1: 'none',
        2: 'low',
        3: 'medium',
        4: 'high'
      };
      task.priority = priorityMap[todoistTask.priority] as any || 'none';
    }

    // Add labels as tags if enabled (filter out deadline labels)
    if (this.config?.syncSettings.syncLabels && todoistTask.labels.length > 0) {
      const filteredLabels = todoistTask.labels.filter(label => 
        !label.startsWith('deadline:') && !label.startsWith('frist:')
      );
      task.tags = filteredLabels.map(label => `#${label}`);
    }

    return task;
  }

  /**
   * Get all tasks that should be synced (have project mappings OR inbox tasks)
   */
  private getSyncableTasks(tasks: Task[]): Task[] {
    if (!this.config) return [];
    
    const mappedProjectIds = this.config.projectMappings
      .filter(mapping => mapping.enabled)
      .map(mapping => mapping.taskFuchsProjectId);
    
    let syncableTasks = tasks.filter(task => 
      task.projectId && mappedProjectIds.includes(task.projectId)
    );
    
    // Add inbox tasks if inbox sync is enabled
    if (this.config.syncInbox) {
      const inboxTasks = tasks.filter(task => 
        task.columnId === 'inbox' || 
        task.projectId === 'inbox' ||
        !task.projectId // Tasks without project are considered inbox tasks
      );
      syncableTasks = [...syncableTasks, ...inboxTasks];
    }
    
    return syncableTasks;
  }

  /**
   * Find project mapping by TaskFuchs project ID
   */
  private findProjectMapping(taskFuchsProjectId?: string): TodoistProjectMapping | null {
    if (!taskFuchsProjectId || !this.config) return null;
    return this.config.projectMappings.find(
      mapping => mapping.taskFuchsProjectId === taskFuchsProjectId && mapping.enabled
    ) || null;
  }

  /**
   * Find project mapping by Todoist project ID
   */
  private findProjectMappingByTodoistId(todoistProjectId: string): TodoistProjectMapping | null {
    if (!this.config) return null;
    return this.config.projectMappings.find(
      mapping => mapping.todoistProjectId === todoistProjectId && mapping.enabled
    ) || null;
  }

  /**
   * Perform bidirectional synchronization with automatic column/section sync
   */
  /**
   * Convert ProjectKanbanColumns to Column format for sync
   */
  private convertToColumns(columns: any[]): Column[] {
    return columns.map(col => ({
      id: col.id,
      title: col.title || col.name,
      type: 'project' as const,
      order: col.order || 0,
      tasks: [],
      projectId: col.projectId
    }));
  }

  public async performSync(localTasks: Task[], localColumns: Column[] | any[], forceFullSync: boolean = false): Promise<TodoistSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronisation bereits in Bearbeitung');
    }

    if (!this.config?.enabled) {
      throw new Error('Todoist-Synchronisation ist nicht aktiviert');
    }

    // Convert ProjectKanbanColumns to Column format if needed
    const columns: Column[] = localColumns.length > 0 && !('tasks' in localColumns[0]) 
      ? this.convertToColumns(localColumns)
      : localColumns as Column[];

    this.syncInProgress = true;
    
    // Clear previous date columns needed
    this.dateColumnsNeeded.clear();
    
    const syncStartTime = Date.now();
    
    const result: TodoistSyncResult = {
      success: false,
      tasksCreated: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      // NEW: Incremental sync information
      syncType: 'full', // Will be determined based on logic
      syncDuration: 0,
      itemsProcessed: 0,
      itemsSkipped: 0,
      sectionsCreated: 0,
      sectionsUpdated: 0,
      sectionsDeleted: 0,
      columnsCreated: 0,
      columnsUpdated: 0,
      columnsDeleted: 0,
      // NEW: Label/Tag tracking
      labelsCreated: 0,
      labelsUpdated: 0,
      tagsCreated: [],
      localTasksAdded: [],
      localTasksUpdated: [],
      localTasksDeleted: [],
      localColumnsAdded: [],
      localColumnsUpdated: [],
      localColumnsDeleted: [],
      dateColumnsNeeded: [],
      conflicts: [],
      errors: [],
      // NEW: Enhanced error tracking
      detailedErrors: [],
      partialFailures: [],
      retryAttempts: 0,
      circuitBreakerTriggered: false,
      summary: ''
    };

    try {
      console.log('🔄 Starting Todoist synchronization...');

      // 🚀 NEW: Determine sync strategy (incremental vs full)
      const incrementalCheck = this.canPerformIncrementalSync();
      let filteredTasks = localTasks;
      let incrementalTodoistTasks: TodoistTask[] = [];
      let useIncrementalSync = false;

      if (incrementalCheck.canIncremental && incrementalCheck.lastSyncTime && !forceFullSync) {
        try {
          console.log(`🔄 Attempting incremental sync since ${incrementalCheck.lastSyncTime}`);
          
          // Filter TaskFuchs tasks modified since last sync
          const modifiedTaskFuchsTasks = this.getModifiedTasksSinceLastSync(localTasks, incrementalCheck.lastSyncTime);
          
          // Get Todoist tasks modified since last sync
          incrementalTodoistTasks = await this.getTodoistTasksSinceLastSync(incrementalCheck.lastSyncTime);
          
          console.log(`📊 Incremental sync analysis:`);
          console.log(`  - TaskFuchs modified tasks: ${modifiedTaskFuchsTasks.length}`);
          console.log(`  - Todoist modified tasks: ${incrementalTodoistTasks.length}`);
          
          // Use incremental sync if there are relatively few changes
          const totalChanges = modifiedTaskFuchsTasks.length + incrementalTodoistTasks.length;
          const totalTasks = localTasks.length;
          const changePercentage = totalTasks > 0 ? (totalChanges / totalTasks) * 100 : 0;
          
          if (changePercentage < 30) { // If less than 30% of tasks changed, use incremental
            filteredTasks = modifiedTaskFuchsTasks;
            useIncrementalSync = true;
            result.syncType = 'incremental';
            result.itemsSkipped = totalTasks - totalChanges;
            
            console.log(`✅ Using incremental sync (${changePercentage.toFixed(1)}% of tasks changed)`);
          } else {
            console.log(`⚠️ Too many changes (${changePercentage.toFixed(1)}%), falling back to full sync`);
          }
          
        } catch (error) {
          console.log(`❌ Incremental sync failed, falling back to full sync: ${error}`);
          // Continue with full sync
        }
      } else {
        const reason = forceFullSync ? 'Manual full sync requested' : incrementalCheck.reason;
        console.log(`📥 Full sync required: ${reason}`);
      }

      if (!useIncrementalSync) {
        result.syncType = 'full';
        console.log(`🔄 Performing full synchronization`);
      }

      // 1. First, sync columns and sections for all mapped projects
      let updatedLocalColumns = [...columns]; // Kopie für Updates
      const allTodoistSections: TodoistSection[] = [];
      
      for (const mapping of this.config.projectMappings.filter(m => m.enabled)) {
        const syncResult = await this.syncColumnsAndSections(updatedLocalColumns, mapping);
        result.sectionsCreated += syncResult.sectionsCreated;
        result.columnsCreated += syncResult.columnsCreated;
        result.localColumnsAdded.push(...syncResult.newColumns);
        
        // WICHTIG: Neue Spalten sofort hinzufügen für weitere Verarbeitung
        updatedLocalColumns = [...updatedLocalColumns, ...syncResult.newColumns];
        console.log(`📂 Added ${syncResult.newColumns.length} new columns for project ${mapping.taskFuchsProjectName}`);
        
        // Collect all Todoist sections for later column operations sync
        try {
          const projectSections = await this.getTodoistSections(mapping.todoistProjectId);
          allTodoistSections.push(...projectSections);
        } catch (error) {
          result.errors.push(`Failed to fetch Todoist sections for project ${mapping.todoistProjectName}: ${error}`);
        }
      }

      // 1b. Sync column/section operations (rename, delete, reorder)
      for (const mapping of this.config.projectMappings.filter(m => m.enabled)) {
        await this.syncColumnSectionOperations(updatedLocalColumns, allTodoistSections, mapping, result);
      }

      // 2. Get syncable tasks (only from mapped projects - use filtered tasks for incremental sync)
      const syncableTasks = this.getSyncableTasks(filteredTasks);
      console.log(`📋 Found ${syncableTasks.length} syncable tasks (${result.syncType} sync)`);
      result.itemsProcessed = syncableTasks.length;

      // 3. Get all Todoist tasks from mapped projects
      let allTodoistTasks: TodoistTask[] = [];
      
      if (useIncrementalSync && incrementalTodoistTasks.length > 0) {
        // Use previously fetched incremental tasks
        allTodoistTasks = incrementalTodoistTasks;
        console.log(`📊 Using ${allTodoistTasks.length} incremental Todoist tasks`);
      } else {
        // Fetch all tasks for full sync
        for (const mapping of this.config.projectMappings.filter(m => m.enabled)) {
          try {
            const todoistTasks = await this.getTodoistTasks(mapping.todoistProjectId, result);
            allTodoistTasks.push(...todoistTasks);
          } catch (error) {
            result.errors.push(`Failed to fetch Todoist tasks for project ${mapping.todoistProjectName}: ${error}`);
          }
        }
        console.log(`📊 Fetched ${allTodoistTasks.length} tasks from all mapped projects`);
      }

      // 3a. Get all Todoist labels for auto-creation
      let allTodoistLabels: TodoistLabel[] = [];
      try {
        allTodoistLabels = await this.getTodoistLabels();
        console.log(`🏷️ Fetched ${allTodoistLabels.length} Todoist labels`);
      } catch (error) {
        result.errors.push(`Failed to fetch Todoist labels: ${error}`);
        console.warn('⚠️ Continuing without label auto-creation due to fetch error');
      }

      // 3a2. Collect all existing TaskFuchs tags for auto-creation tracking
      const allTaskFuchsTags: string[] = [];
      for (const task of syncableTasks) {
        if (task.tags && task.tags.length > 0) {
          for (const tag of task.tags) {
            if (!allTaskFuchsTags.includes(tag)) {
              allTaskFuchsTags.push(tag);
            }
          }
        }
      }
      console.log(`🏷️ Found ${allTaskFuchsTags.length} existing TaskFuchs tags`);

      // 3b. Get Todoist Inbox tasks if inbox sync is enabled
      if (this.config.syncInbox) {
        try {
          const todoistProjects = await this.getTodoistProjects();
          const inboxProject = todoistProjects.find(p => p.is_inbox_project);
          
          if (inboxProject) {
            const inboxTasks = await this.getTodoistTasks(inboxProject.id);
            allTodoistTasks.push(...inboxTasks);
            console.log(`📥 Found ${inboxTasks.length} tasks in Todoist Inbox`);
          } else {
            console.warn('⚠️ Todoist Inbox project not found');
          }
        } catch (error) {
          result.errors.push(`Failed to fetch Todoist Inbox tasks: ${error}`);
        }
      }

      // 4. Sync tasks: TaskFuchs -> Todoist
      for (const task of syncableTasks) {
        try {
          // Check if this is an inbox task
          const isInboxTask = task.columnId === 'inbox' || task.projectId === 'inbox' || !task.projectId;
          
          if (isInboxTask && this.config.syncInbox) {
            // Handle inbox task sync
            const todoistProjects = await this.getTodoistProjects();
            const inboxProject = todoistProjects.find(p => p.is_inbox_project);
            
            if (inboxProject) {
              // Check if task already exists in Todoist Inbox
              const existingTodoistTask = allTodoistTasks.find(
                t => t.content.toLowerCase() === task.title.toLowerCase() && 
                     t.project_id === inboxProject.id
              );

              const todoistTaskData = this.convertInboxTaskToTodoist(task);

              if (existingTodoistTask) {
                console.log(`🔄 Updating Todoist inbox task "${task.title}" with data:`, JSON.stringify(todoistTaskData, null, 2));
                await this.updateTodoistTask(existingTodoistTask.id, todoistTaskData);
                result.tasksUpdated++;
                
                // Store/update ID mapping for deletion sync
                this.updateIdMapping(existingTodoistTask.id, task.id);
                
                // Sync subtasks for updated inbox task (note: inbox tasks typically don't have subtasks, but for completeness)
                if (task.subtasks && task.subtasks.length > 0) {
                  console.warn('⚠️ Inbox task with subtasks detected - subtasks will be synced but this is unusual');
                  const tempMapping = { todoistProjectId: inboxProject.id, taskFuchsProjectId: 'inbox' } as TodoistProjectMapping;
                  await this.syncTaskFuchsSubtasksToTodoist(task, existingTodoistTask.id, tempMapping, allTodoistTasks);
                }
              } else {
                const newTodoistTask = await this.createTodoistTask({ ...todoistTaskData, project_id: inboxProject.id }, result);
                result.tasksCreated++;
                
                // Store ID mapping for deletion sync
                if (newTodoistTask && newTodoistTask.id) {
                  this.updateIdMapping(newTodoistTask.id, task.id);
                  
                  // Sync subtasks for new inbox task
                  if (task.subtasks && task.subtasks.length > 0) {
                    console.warn('⚠️ Inbox task with subtasks detected - subtasks will be synced but this is unusual');
                    const tempMapping = { todoistProjectId: inboxProject.id, taskFuchsProjectId: 'inbox' } as TodoistProjectMapping;
                    await this.syncTaskFuchsSubtasksToTodoist(task, newTodoistTask.id, tempMapping, allTodoistTasks);
                  }
                }
              }
            }
          } else {
            // Handle regular project task sync
            const mapping = this.findProjectMapping(task.projectId);
            if (!mapping) continue;

            // Check if task already exists in Todoist (by title match)
            const existingTodoistTask = allTodoistTasks.find(
              t => t.content.toLowerCase() === task.title.toLowerCase() && 
                   t.project_id === mapping.todoistProjectId
            );

            const todoistTaskData = await this.convertToTodoistTask(task, mapping, updatedLocalColumns, allTodoistLabels, result);

            if (existingTodoistTask) {
              // Check for conflicts before updating
              const conflictCheck = this.detectConflict(task, existingTodoistTask, mapping);
              
              if (conflictCheck.hasConflict) {
                // Add to conflicts list for user resolution
                result.conflicts.push(conflictCheck.conflictData);
                console.log(`⚠️ Conflict detected for task "${task.title}" - requiring user resolution`);
              } else {
                // No conflict, proceed with update
                console.log(`🔄 Updating Todoist task "${task.title}" with data:`, JSON.stringify(todoistTaskData, null, 2));
                await this.updateTodoistTask(existingTodoistTask.id, todoistTaskData);
                result.tasksUpdated++;
                
                // Store/update ID mapping for deletion sync
                this.updateIdMapping(existingTodoistTask.id, task.id);
                
                // Update task metadata
                this.updateTaskMetadata(task.id, task, existingTodoistTask);
                
                // Sync subtasks for updated task
                await this.syncTaskFuchsSubtasksToTodoist(task, existingTodoistTask.id, mapping, allTodoistTasks);
              }
            } else {
              // Create new task
                              const newTodoistTask = await this.createTodoistTask(todoistTaskData, result);
              result.tasksCreated++;
              
              // Store ID mapping for deletion sync
              if (newTodoistTask && newTodoistTask.id) {
                this.updateIdMapping(newTodoistTask.id, task.id);
                
                // Update task metadata for new task
                this.updateTaskMetadata(task.id, task, newTodoistTask);
                
                // Sync subtasks for new task
                await this.syncTaskFuchsSubtasksToTodoist(task, newTodoistTask.id, mapping, allTodoistTasks);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to sync task "${task.title}":`, error);
          
          // Create detailed error for tracking
          const syncError = this.createSyncError(error, `sync-taskfuchs-task-${task.id}`);
          result.detailedErrors.push(syncError);
          result.errors.push(`Failed to sync task "${task.title}": ${error}`);
          
          // Track as partial failure
          result.partialFailures.push({
            operation: 'sync-taskfuchs-task',
            entityId: task.id,
            entityName: task.title,
            error: syncError,
            recovered: false
          });
          
          // Log error for analysis
          this.logError(syncError);
          
          // Continue with next task - don't fail entire sync
        }
      }

      // 5. Sync tasks: Todoist -> TaskFuchs (exclude subtasks from main sync)
      const parentTodoistTasks = allTodoistTasks.filter(t => !t.parent_id); // Only parent tasks
      for (const todoistTask of parentTodoistTasks) {
        try {
          // Check if this is an inbox task from Todoist
          const todoistProjects = await this.getTodoistProjects();
          const inboxProject = todoistProjects.find(p => p.is_inbox_project);
          const isInboxTask = inboxProject && todoistTask.project_id === inboxProject.id;

          if (isInboxTask && this.config.syncInbox) {
            // Handle inbox task from Todoist
            const existingLocalTask = syncableTasks.find(
              t => t.title.toLowerCase() === todoistTask.content.toLowerCase() && 
                   (t.columnId === 'inbox' || t.projectId === 'inbox' || !t.projectId)
            );

            const taskFuchsTask = this.convertTodoistInboxToTaskFuchs(todoistTask, existingLocalTask);

            if (existingLocalTask) {
              // Update existing task
              result.localTasksUpdated.push({ ...existingLocalTask, ...taskFuchsTask, id: existingLocalTask.id });
              
              // Store/update ID mapping for deletion sync
              this.updateIdMapping(todoistTask.id, existingLocalTask.id);
            } else {
              // Add new task
              result.localTasksAdded.push(taskFuchsTask);
              
              // Store ID mapping for deletion sync
              this.updateIdMapping(todoistTask.id, taskFuchsTask.id);
            }
          } else {
            // Handle regular project task
            const mapping = this.findProjectMappingByTodoistId(todoistTask.project_id);
            if (!mapping) continue;

            // Check if task already exists in TaskFuchs (by title match)
            const existingLocalTask = syncableTasks.find(
              t => t.title.toLowerCase() === todoistTask.content.toLowerCase() && 
                   t.projectId === mapping.taskFuchsProjectId
            );

            const taskFuchsTask = await this.convertToTaskFuchsTask(todoistTask, mapping, updatedLocalColumns, existingLocalTask, allTodoistTasks, allTaskFuchsTags, result);

            if (existingLocalTask) {
              // Check for conflicts before updating (reverse direction)
              const conflictCheck = this.detectConflict(existingLocalTask, todoistTask, mapping);
              
              if (conflictCheck.hasConflict) {
                // Conflict already detected in forward direction, skip to avoid duplicates
                console.log(`⚠️ Conflict already detected for task "${existingLocalTask.title}" - skipping reverse update`);
              } else {
                // No conflict, proceed with update
                result.localTasksUpdated.push({ ...existingLocalTask, ...taskFuchsTask, id: existingLocalTask.id });
                
                // Store/update ID mapping for deletion sync
                this.updateIdMapping(todoistTask.id, existingLocalTask.id);
                
                // Update task metadata
                this.updateTaskMetadata(existingLocalTask.id, existingLocalTask, todoistTask);
              }
            } else {
              // Add new task
              result.localTasksAdded.push(taskFuchsTask);
              
              // Store ID mapping for deletion sync
              this.updateIdMapping(todoistTask.id, taskFuchsTask.id);
              
              // Update task metadata for new task
              this.updateTaskMetadata(taskFuchsTask.id, taskFuchsTask, todoistTask);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to import Todoist task "${todoistTask.content}":`, error);
          
          // Create detailed error for tracking
          const syncError = this.createSyncError(error, `import-todoist-task-${todoistTask.id}`);
          result.detailedErrors.push(syncError);
          result.errors.push(`Failed to import Todoist task "${todoistTask.content}": ${error}`);
          
          // Track as partial failure
          result.partialFailures.push({
            operation: 'import-todoist-task',
            entityId: todoistTask.id,
            entityName: todoistTask.content,
            error: syncError,
            recovered: false
          });
          
          // Log error for analysis
          this.logError(syncError);
          
          // Continue with next task - don't fail entire sync
        }
      }

      // 6. Sync deletions (bidirectional)
      await this.syncDeletions(allTodoistTasks, syncableTasks, result);

      // 7. Update sync state tracking for future deletion detection
      if (result.errors.length === 0) {
        this.updateSyncState(allTodoistTasks, syncableTasks, allTodoistSections, updatedLocalColumns, result.syncType);
      }

      // Add collected date columns to result
      result.dateColumnsNeeded = Array.from(this.dateColumnsNeeded);
      if (result.dateColumnsNeeded.length > 0) {
        console.log(`📅 Date columns needed: ${result.dateColumnsNeeded.join(', ')}`);
      }

      result.success = result.errors.length === 0;
      result.syncDuration = Date.now() - syncStartTime;
      result.summary = this.generateSyncSummary(result);

      // Update last sync info
      this.updateConfig({
        lastSync: new Date().toISOString(),
        lastSyncStatus: result.success ? 'success' : 'error',
        lastSyncError: result.errors.join('; ') || undefined
      });

      console.log('✅ Todoist synchronization completed:', result.summary);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.summary = `Synchronisation fehlgeschlagen: ${result.errors[0]}`;
      
      this.updateConfig({
        lastSync: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncError: result.errors.join('; ')
      });
      
      console.error('❌ Todoist synchronization failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Get Todoist tasks for a project (with retry mechanism)
   */
  private async getTodoistTasks(projectId: string, result?: TodoistSyncResult): Promise<TodoistTask[]> {
    return this.retryOperation(async () => {
      if (!this.config?.apiToken) {
        throw new Error('Todoist API Token fehlt');
      }

      const response = await fetch(`${this.baseUrl}/tasks?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = new Error(`Todoist API Error: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    }, `get-tasks-${projectId}`, result);
  }

  /**
   * Create Todoist task (with retry mechanism)
   */
  private async createTodoistTask(taskData: Partial<TodoistTask>, result?: TodoistSyncResult): Promise<TodoistTask> {
    return this.retryOperation(async () => {
      if (!this.config?.apiToken) {
        throw new Error('Todoist API Token fehlt');
      }

      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const error = new Error(`Todoist API Error: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    }, `create-task-${taskData.content}`, result);
  }

  /**
   * Update Todoist task
   */
  private async updateTodoistTask(taskId: string, taskData: Partial<TodoistTask>): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Delete a Todoist task
   */
  private async deleteTodoistTask(taskId: string): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Get all Todoist labels
   */
  private async getTodoistLabels(): Promise<TodoistLabel[]> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/labels`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new Todoist label
   */
  private async createTodoistLabel(name: string, color?: string): Promise<TodoistLabel> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const labelData = {
      name: name,
      color: color || 'blue', // Default color
      order: 0,
      is_favorite: false
    };

    const response = await fetch(`${this.baseUrl}/labels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(labelData)
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update a Todoist label
   */
  private async updateTodoistLabel(labelId: string, name: string, color?: string): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const labelData: any = { name };
    if (color) {
      labelData.color = color;
    }

    const response = await fetch(`${this.baseUrl}/labels/${labelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(labelData)
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Delete a Todoist label
   */
  private async deleteTodoistLabel(labelId: string): Promise<void> {
    if (!this.config?.apiToken) {
      throw new Error('Todoist API Token fehlt');
    }

    const response = await fetch(`${this.baseUrl}/labels/${labelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API Error: ${response.status}`);
    }
  }

  /**
   * Ensure a Todoist label exists, create if not found
   */
  private async ensureTodoistLabel(labelName: string, allLabels: TodoistLabel[]): Promise<string> {
    // Check if label already exists
    const existingLabel = allLabels.find(label => 
      label.name.toLowerCase() === labelName.toLowerCase()
    );

    if (existingLabel) {
      return existingLabel.id;
    }

    // Create new label
    console.log(`🏷️ Creating new Todoist label: "${labelName}"`);
    const newLabel = await this.createTodoistLabel(labelName);
    
    // Add to cache for future lookups in this sync
    allLabels.push(newLabel);
    
    return newLabel.id;
  }

  /**
   * Detect tasks that were deleted in Todoist since last sync
   */
  private detectTodoistDeletedTasks(currentTodoistTasks: TodoistTask[]): string[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    const currentTaskIds = new Set(currentTodoistTasks.map(t => t.id));
    const previousTaskIds = this.config.lastSyncState.todoistTaskIds;
    
    return previousTaskIds.filter(id => !currentTaskIds.has(id));
  }

  /**
   * Detect tasks that were deleted in TaskFuchs since last sync
   */
  private detectTaskFuchsDeletedTasks(currentTaskFuchsTasks: Task[]): string[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    const currentTaskIds = new Set(currentTaskFuchsTasks.map(t => t.id));
    const previousTaskIds = this.config.lastSyncState.taskFuchsTaskIds;
    
    return previousTaskIds.filter(id => !currentTaskIds.has(id));
  }

  /**
   * Detect sections that were deleted in Todoist since last sync
   */
  private detectTodoistDeletedSections(currentTodoistSections: TodoistSection[]): string[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    const currentSectionIds = new Set(currentTodoistSections.map(s => s.id));
    const previousSectionIds = this.config.lastSyncState.todoistSectionIds;
    
    return previousSectionIds.filter(id => !currentSectionIds.has(id));
  }

  /**
   * Detect columns that were deleted in TaskFuchs since last sync
   */
  private detectTaskFuchsDeletedColumns(currentColumns: Column[]): string[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    const currentColumnIds = new Set(currentColumns.map(c => c.id));
    const previousColumnIds = this.config.lastSyncState.taskFuchsColumnIds;
    
    return previousColumnIds.filter(id => !currentColumnIds.has(id));
  }

  /**
   * Detect sections that were renamed/updated in Todoist
   */
  private detectTodoistUpdatedSections(currentSections: TodoistSection[], previousSync: any): TodoistSection[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    // For now, we'll detect updates by comparing with stored state
    // In future, we could store section metadata (name, order) to detect specific changes
    return currentSections.filter(section => {
      const mappedColumnId = this.getTaskFuchsColumnFromTodoistSection(section.id);
      return !!mappedColumnId; // Only return sections that have mappings (indicating they were synced before)
    });
  }

  /**
   * Detect columns that were renamed/updated in TaskFuchs
   */
  private detectTaskFuchsUpdatedColumns(currentColumns: Column[]): Column[] {
    if (!this.config?.lastSyncState) {
      return []; // No previous sync state to compare
    }

    // For now, we'll detect updates by comparing with stored state
    // In future, we could store column metadata (title, order) to detect specific changes
    return currentColumns.filter(column => {
      const mappedSectionId = this.getTodoistSectionFromTaskFuchsColumn(column.id);
      return !!mappedSectionId; // Only return columns that have mappings (indicating they were synced before)
    });
  }

  /**
   * Add or update ID mapping for bidirectional sync
   */
  private updateIdMapping(todoistId: string, taskFuchsId: string): void {
    if (!this.config) return;
    
    if (!this.config.idMappings) {
      this.config.idMappings = {
        todoistToTaskFuchs: {},
        taskFuchsToTodoist: {},
        todoistSectionToTaskFuchsColumn: {},
        taskFuchsColumnToTodoistSection: {}
      };
    }
    
    this.config.idMappings.todoistToTaskFuchs[todoistId] = taskFuchsId;
    this.config.idMappings.taskFuchsToTodoist[taskFuchsId] = todoistId;
    
    // Save config to persist mappings
    this.saveConfig();
  }

  /**
   * Get TaskFuchs ID from Todoist ID
   */
  private getTaskFuchsIdFromTodoist(todoistId: string): string | undefined {
    return this.config?.idMappings?.todoistToTaskFuchs[todoistId];
  }

  /**
   * Get Todoist ID from TaskFuchs ID
   */
  private getTodoistIdFromTaskFuchs(taskFuchsId: string): string | undefined {
    return this.config?.idMappings?.taskFuchsToTodoist[taskFuchsId];
  }

  /**
   * Remove ID mapping when task is deleted
   */
  private removeIdMapping(todoistId?: string, taskFuchsId?: string): void {
    if (!this.config?.idMappings) return;
    
    if (todoistId) {
      const correspondingTaskFuchsId = this.config.idMappings.todoistToTaskFuchs[todoistId];
      delete this.config.idMappings.todoistToTaskFuchs[todoistId];
      if (correspondingTaskFuchsId) {
        delete this.config.idMappings.taskFuchsToTodoist[correspondingTaskFuchsId];
      }
    }
    
    if (taskFuchsId) {
      const correspondingTodoistId = this.config.idMappings.taskFuchsToTodoist[taskFuchsId];
      delete this.config.idMappings.taskFuchsToTodoist[taskFuchsId];
      if (correspondingTodoistId) {
        delete this.config.idMappings.todoistToTaskFuchs[correspondingTodoistId];
      }
    }
    
    this.saveConfig();
  }

  /**
   * Add or update section/column ID mapping
   */
  private updateSectionColumnMapping(todoistSectionId: string, taskFuchsColumnId: string): void {
    if (!this.config) return;
    
    if (!this.config.idMappings) {
      this.config.idMappings = {
        todoistToTaskFuchs: {},
        taskFuchsToTodoist: {},
        todoistSectionToTaskFuchsColumn: {},
        taskFuchsColumnToTodoistSection: {}
      };
    }
    
    this.config.idMappings.todoistSectionToTaskFuchsColumn[todoistSectionId] = taskFuchsColumnId;
    this.config.idMappings.taskFuchsColumnToTodoistSection[taskFuchsColumnId] = todoistSectionId;
    
    // Save config to persist mappings
    this.saveConfig();
  }

  /**
   * Get TaskFuchs column ID from Todoist section ID
   */
  private getTaskFuchsColumnFromTodoistSection(todoistSectionId: string): string | undefined {
    return this.config?.idMappings?.todoistSectionToTaskFuchsColumn[todoistSectionId];
  }

  /**
   * Get Todoist section ID from TaskFuchs column ID
   */
  private getTodoistSectionFromTaskFuchsColumn(taskFuchsColumnId: string): string | undefined {
    return this.config?.idMappings?.taskFuchsColumnToTodoistSection[taskFuchsColumnId];
  }

  /**
   * Remove section/column ID mapping when deleted
   */
  private removeSectionColumnMapping(todoistSectionId?: string, taskFuchsColumnId?: string): void {
    if (!this.config?.idMappings) return;
    
    if (todoistSectionId) {
      const correspondingColumnId = this.config.idMappings.todoistSectionToTaskFuchsColumn[todoistSectionId];
      delete this.config.idMappings.todoistSectionToTaskFuchsColumn[todoistSectionId];
      if (correspondingColumnId) {
        delete this.config.idMappings.taskFuchsColumnToTodoistSection[correspondingColumnId];
      }
    }
    
    if (taskFuchsColumnId) {
      const correspondingSectionId = this.config.idMappings.taskFuchsColumnToTodoistSection[taskFuchsColumnId];
      delete this.config.idMappings.taskFuchsColumnToTodoistSection[taskFuchsColumnId];
      if (correspondingSectionId) {
        delete this.config.idMappings.todoistSectionToTaskFuchsColumn[correspondingSectionId];
      }
    }
    
    this.saveConfig();
  }

  /**
   * Sync column/section operations: rename, delete, reorder
   */
  private async syncColumnSectionOperations(
    localColumns: Column[],
    allTodoistSections: TodoistSection[],
    mapping: TodoistProjectMapping,
    result: TodoistSyncResult
  ): Promise<void> {
    try {
      // Get only sections for this specific project
      const projectSections = allTodoistSections.filter(s => s.project_id === mapping.todoistProjectId);
      const projectColumns = localColumns.filter(c => c.projectId === mapping.taskFuchsProjectId);

      console.log(`🔄 Syncing columns/sections for project mapping: ${mapping.taskFuchsProjectName} ↔ ${mapping.todoistProjectName}`);

      // 1. Detect and sync deletions
      const deletedTodoistSections = this.detectTodoistDeletedSections(projectSections);
      const deletedTaskFuchsColumns = this.detectTaskFuchsDeletedColumns(projectColumns);

      // Delete TaskFuchs columns that were deleted in Todoist
      for (const deletedSectionId of deletedTodoistSections) {
        const columnId = this.getTaskFuchsColumnFromTodoistSection(deletedSectionId);
        if (columnId) {
          console.log(`🗑️ Section ${deletedSectionId} was deleted in Todoist, marking TaskFuchs column ${columnId} for deletion`);
          result.localColumnsDeleted.push(columnId);
          result.columnsDeleted++;
          
          // Remove mapping
          this.removeSectionColumnMapping(deletedSectionId);
        }
      }

      // Delete Todoist sections that were deleted in TaskFuchs
      for (const deletedColumnId of deletedTaskFuchsColumns) {
        const sectionId = this.getTodoistSectionFromTaskFuchsColumn(deletedColumnId);
        if (sectionId) {
          try {
            console.log(`🗑️ Column ${deletedColumnId} was deleted in TaskFuchs, deleting Todoist section ${sectionId}`);
            await this.deleteTodoistSection(sectionId);
            result.sectionsDeleted++;
            
            // Remove mapping
            this.removeSectionColumnMapping(undefined, deletedColumnId);
            
            console.log(`✅ Successfully deleted Todoist section ${sectionId}`);
          } catch (error) {
            result.errors.push(`Failed to delete Todoist section ${sectionId}: ${error}`);
          }
        }
      }

      // 2. Detect and sync updates (renames)
      const updatedTodoistSections = this.detectTodoistUpdatedSections(projectSections, null);
      const updatedTaskFuchsColumns = this.detectTaskFuchsUpdatedColumns(projectColumns);

      // Update TaskFuchs columns from Todoist section renames
      for (const section of updatedTodoistSections) {
        const columnId = this.getTaskFuchsColumnFromTodoistSection(section.id);
        if (columnId) {
          const column = projectColumns.find(c => c.id === columnId);
          if (column && column.title !== section.name) {
            console.log(`📝 Section ${section.id} was renamed in Todoist from "${column.title}" to "${section.name}"`);
            
            // Update column with new name
            const updatedColumn = { ...column, title: section.name };
            result.localColumnsUpdated.push(updatedColumn);
            result.columnsUpdated++;
          }
        }
      }

      // Update Todoist sections from TaskFuchs column renames
      for (const column of updatedTaskFuchsColumns) {
        const sectionId = this.getTodoistSectionFromTaskFuchsColumn(column.id);
        if (sectionId) {
          const section = projectSections.find(s => s.id === sectionId);
          if (section && section.name !== column.title) {
            try {
              console.log(`📝 Column ${column.id} was renamed in TaskFuchs from "${section.name}" to "${column.title}"`);
              await this.updateTodoistSection(sectionId, column.title || 'Untitled');
              result.sectionsUpdated++;
              
              console.log(`✅ Successfully updated Todoist section ${sectionId} to "${column.title}"`);
            } catch (error) {
              result.errors.push(`Failed to update Todoist section ${sectionId}: ${error}`);
            }
          }
        }
      }

      // 3. Create section/column mappings for new items (already handled in existing sync logic)
      // This is done in the existing syncColumnsAndSections method in performSync

    } catch (error) {
      result.errors.push(`Column/Section sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync deletions: remove tasks that were deleted on one side from the other side
   */
  private async syncDeletions(
    allTodoistTasks: TodoistTask[], 
    syncableTasks: Task[], 
    result: TodoistSyncResult
  ): Promise<void> {
    try {
      // 1. Detect tasks deleted in Todoist -> delete from TaskFuchs
      const deletedInTodoist = this.detectTodoistDeletedTasks(allTodoistTasks);
      
      for (const deletedTodoistTaskId of deletedInTodoist) {
        console.log(`🗑️ Task ${deletedTodoistTaskId} was deleted in Todoist, deleting from TaskFuchs`);
        
        // Find corresponding TaskFuchs task using ID mapping
        const taskFuchsId = this.getTaskFuchsIdFromTodoist(deletedTodoistTaskId);
        
        if (taskFuchsId) {
          console.log(`🗑️ Found TaskFuchs task ${taskFuchsId} corresponding to deleted Todoist task ${deletedTodoistTaskId}`);
          result.localTasksDeleted.push(taskFuchsId); // Store TaskFuchs ID for deletion
          
          // Remove the ID mapping since task will be deleted
          this.removeIdMapping(deletedTodoistTaskId);
          
          result.tasksDeleted++;
        } else {
          console.warn(`⚠️ No TaskFuchs task found for deleted Todoist task ${deletedTodoistTaskId}`);
        }
      }

      // 2. Detect tasks deleted in TaskFuchs -> delete from Todoist
      const deletedInTaskFuchs = this.detectTaskFuchsDeletedTasks(syncableTasks);
      
      for (const deletedTaskFuchsTaskId of deletedInTaskFuchs) {
        console.log(`🗑️ Task ${deletedTaskFuchsTaskId} was deleted in TaskFuchs, deleting from Todoist`);
        
        // Find corresponding Todoist task using ID mapping
        const todoistId = this.getTodoistIdFromTaskFuchs(deletedTaskFuchsTaskId);
        
        if (todoistId) {
          try {
            console.log(`🗑️ Deleting Todoist task ${todoistId} corresponding to deleted TaskFuchs task ${deletedTaskFuchsTaskId}`);
            await this.deleteTodoistTask(todoistId);
            
            // Remove the ID mapping since task was deleted
            this.removeIdMapping(undefined, deletedTaskFuchsTaskId);
            
            result.tasksDeleted++;
            console.log(`✅ Successfully deleted Todoist task ${todoistId}`);
          } catch (error) {
            result.errors.push(`Failed to delete Todoist task ${todoistId}: ${error}`);
          }
        } else {
          console.warn(`⚠️ No Todoist task found for deleted TaskFuchs task ${deletedTaskFuchsTaskId}`);
        }
      }

    } catch (error) {
      result.errors.push(`Deletion sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create task fingerprint for conflict detection
   */
  private createTaskFingerprint(task: Task | TodoistTask): any {
    if ('content' in task) {
      // Todoist task
      const todoistTask = task as TodoistTask;
      return {
        title: todoistTask.content,
        description: todoistTask.description || '',
        dueDate: todoistTask.due?.date || '',
        completed: todoistTask.is_completed || false,
        priority: todoistTask.priority || 1,
        tags: todoistTask.labels || []
      };
    } else {
      // TaskFuchs task
      const taskFuchsTask = task as Task;
      return {
        title: taskFuchsTask.title,
        description: taskFuchsTask.description || '',
        dueDate: taskFuchsTask.dueDate || '',
        reminderDate: taskFuchsTask.reminderDate || '', // Fix: Include reminderDate in fingerprint
        deadline: taskFuchsTask.deadline || '',
        completed: taskFuchsTask.completed || false,
        priority: taskFuchsTask.priority || 1,
        tags: taskFuchsTask.tags || []
      };
    }
  }

  /**
   * Check if task content has changed since last sync
   */
  private hasTaskChanged(currentFingerprint: any, lastSyncedContent: any): boolean {
    const keys = ['title', 'description', 'dueDate', 'reminderDate', 'deadline', 'completed', 'priority'];
    
    for (const key of keys) {
      if (currentFingerprint[key] !== lastSyncedContent[key]) {
        return true;
      }
    }
    
    // Check tags array
    const currentTags = (currentFingerprint.tags || []).sort();
    const lastTags = (lastSyncedContent.tags || []).sort();
    
    if (currentTags.length !== lastTags.length) {
      return true;
    }
    
    return currentTags.some((tag, index) => tag !== lastTags[index]);
  }

  /**
   * Detect conflicts between local and remote tasks
   */
  private detectConflict(
    localTask: Task, 
    remoteTask: TodoistTask, 
    mapping: TodoistProjectMapping
  ): { hasConflict: boolean; conflictData?: any } {
    if (!this.config?.taskMetadata) {
      return { hasConflict: false };
    }

    const localTaskId = localTask.id;
    const remoteTaskId = remoteTask.id;
    
    // Try to find metadata by either ID (could be mapped)
    let metadata = this.config.taskMetadata[localTaskId] || this.config.taskMetadata[remoteTaskId];
    
    if (!metadata) {
      // No previous sync metadata, no conflict
      return { hasConflict: false };
    }

    const currentLocalFingerprint = this.createTaskFingerprint(localTask);
    const currentRemoteFingerprint = this.createTaskFingerprint(remoteTask);
    
    const localChanged = this.hasTaskChanged(currentLocalFingerprint, metadata.lastSyncedContent);
    const remoteChanged = this.hasTaskChanged(currentRemoteFingerprint, metadata.lastSyncedContent);
    
    if (localChanged && remoteChanged) {
      // Both sides have changes - conflict detected
      return {
        hasConflict: true,
        conflictData: {
          taskId: localTaskId,
          title: localTask.title,
          conflictType: 'content' as const,
          localData: {
            task: localTask,
            lastModified: metadata.taskFuchsLastModified || new Date().toISOString()
          },
          remoteData: {
            task: remoteTask,
            lastModified: metadata.todoistLastModified || new Date().toISOString()
          }
        }
      };
    }
    
    return { hasConflict: false };
  }

  /**
   * Update task metadata after sync
   */
  private updateTaskMetadata(taskId: string, localTask?: Task, remoteTask?: TodoistTask): void {
    if (!this.config) return;
    
    if (!this.config.taskMetadata) {
      this.config.taskMetadata = {};
    }
    
    const fingerprint = localTask ? this.createTaskFingerprint(localTask) : this.createTaskFingerprint(remoteTask!);
    
    this.config.taskMetadata[taskId] = {
      lastSyncTimestamp: new Date().toISOString(),
      todoistLastModified: remoteTask ? new Date().toISOString() : this.config.taskMetadata[taskId]?.todoistLastModified,
      taskFuchsLastModified: localTask ? new Date().toISOString() : this.config.taskMetadata[taskId]?.taskFuchsLastModified,
      lastSyncedContent: fingerprint
    };
    
    this.saveConfig();
  }

  /**
   * Determine if incremental sync is possible and beneficial
   */
  private canPerformIncrementalSync(): { canIncremental: boolean; reason?: string; lastSyncTime?: string } {
    if (!this.config?.lastSyncState?.timestamp) {
      return { canIncremental: false, reason: 'No previous sync found' };
    }

    const lastSyncTime = this.config.lastSyncState.timestamp;
    const timeSinceLastSync = Date.now() - new Date(lastSyncTime).getTime();
    const hoursSinceLastSync = timeSinceLastSync / (1000 * 60 * 60);

    // Perform full sync if more than 24 hours since last sync
    if (hoursSinceLastSync > 24) {
      return { canIncremental: false, reason: 'More than 24 hours since last sync', lastSyncTime };
    }

    // Perform full sync if last sync was not successful
    if (this.config.lastSyncState.syncType === undefined) {
      return { canIncremental: false, reason: 'Previous sync status unknown', lastSyncTime };
    }

    // Check if there were any errors in the last sync that might require full sync
    const lastFullSync = this.config.lastSyncState.lastFullSyncTimestamp;
    if (lastFullSync) {
      const hoursSinceFullSync = (Date.now() - new Date(lastFullSync).getTime()) / (1000 * 60 * 60);
      if (hoursSinceFullSync > 168) { // 7 days
        return { canIncremental: false, reason: 'More than 7 days since last full sync', lastSyncTime };
      }
    }

    return { canIncremental: true, lastSyncTime };
  }

  /**
   * Filter TaskFuchs tasks that have been modified since last sync
   */
  private getModifiedTasksSinceLastSync(tasks: Task[], lastSyncTime: string): Task[] {
    const lastSyncDate = new Date(lastSyncTime);
    
    return tasks.filter(task => {
      // Check if task was created after last sync
      if (task.createdAt && new Date(task.createdAt) > lastSyncDate) {
        return true;
      }
      
      // Check if task was updated after last sync
      if (task.updatedAt && new Date(task.updatedAt) > lastSyncDate) {
        return true;
      }
      
      // Check if we have metadata indicating the task was changed
      const metadata = this.config?.taskMetadata?.[task.id];
      if (metadata?.taskFuchsLastModified) {
        const taskLastModified = new Date(metadata.taskFuchsLastModified);
        if (taskLastModified > lastSyncDate) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * Get Todoist tasks modified since last sync using API parameters
   */
  private async getTodoistTasksSinceLastSync(lastSyncTime: string): Promise<TodoistTask[]> {
    try {
      // Todoist API supports `since` parameter for incremental sync
      const sinceParam = new Date(lastSyncTime).toISOString();
      
      const response = await fetch(`${this.baseUrl}/tasks?since=${encodeURIComponent(sinceParam)}`, {
        headers: {
          'Authorization': `Bearer ${this.config?.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch modified Todoist tasks: ${response.statusText}`);
      }

      const tasks = await response.json();
      console.log(`📊 Todoist incremental fetch: ${tasks.length} tasks modified since ${sinceParam}`);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching incremental Todoist tasks, falling back to full sync:', error);
      // Throw error to force full sync in calling method
      throw new Error(`Incremental sync failed: ${error}. Full sync required.`);
    }
  }

  /**
   * Update sync state tracking after successful sync
   */
  private updateSyncState(allTodoistTasks: TodoistTask[], syncableTasks: Task[], allTodoistSections?: TodoistSection[], syncableColumns?: Column[], syncType?: 'full' | 'incremental'): void {
    const currentTimestamp = new Date().toISOString();
    const currentSyncType = syncType || 'full';
    
    const newSyncState = {
      todoistTaskIds: allTodoistTasks.map(t => t.id),
      taskFuchsTaskIds: syncableTasks.map(t => t.id),
      todoistSectionIds: allTodoistSections?.map(s => s.id) || [],
      taskFuchsColumnIds: syncableColumns?.map(c => c.id) || [],
      timestamp: currentTimestamp,
      // NEW: Track incremental sync information
      lastFullSyncTimestamp: currentSyncType === 'full' ? currentTimestamp : this.config?.lastSyncState?.lastFullSyncTimestamp,
      lastIncrementalSyncTimestamp: currentSyncType === 'incremental' ? currentTimestamp : this.config?.lastSyncState?.lastIncrementalSyncTimestamp,
      syncType: currentSyncType,
      changesSinceLastSync: {
        todoistChanges: allTodoistTasks.length,
        taskFuchsChanges: syncableTasks.length
      }
    };

    this.updateConfig({
      lastSyncState: newSyncState
    });

    console.log(`📊 Updated sync state tracking: ${newSyncState.todoistTaskIds.length} Todoist tasks, ${newSyncState.taskFuchsTaskIds.length} TaskFuchs tasks, ${newSyncState.todoistSectionIds.length} Todoist sections, ${newSyncState.taskFuchsColumnIds.length} TaskFuchs columns`);
  }

  /**
   * Generate sync summary
   */
  private generateSyncSummary(result: TodoistSyncResult): string {
    const parts = [];
    
    if (result.sectionsCreated > 0) {
      parts.push(`${result.sectionsCreated} Bereich(e) erstellt`);
    }
    
    if (result.sectionsUpdated > 0) {
      parts.push(`${result.sectionsUpdated} Bereich(e) aktualisiert`);
    }
    
    if (result.sectionsDeleted > 0) {
      parts.push(`${result.sectionsDeleted} Bereich(e) gelöscht`);
    }
    
    if (result.columnsCreated > 0) {
      parts.push(`${result.columnsCreated} Spalte(n) erstellt`);
    }
    
    if (result.columnsUpdated > 0) {
      parts.push(`${result.columnsUpdated} Spalte(n) aktualisiert`);
    }
    
    if (result.columnsDeleted > 0) {
      parts.push(`${result.columnsDeleted} Spalte(n) gelöscht`);
    }
    
    if (result.tasksCreated > 0) {
      parts.push(`${result.tasksCreated} Aufgabe(n) erstellt`);
    }
    
    if (result.tasksUpdated > 0) {
      parts.push(`${result.tasksUpdated} Aufgabe(n) aktualisiert`);
    }
    
    if (result.localTasksAdded.length > 0) {
      parts.push(`${result.localTasksAdded.length} Aufgabe(n) importiert`);
    }
    
    if (result.localTasksUpdated.length > 0) {
      parts.push(`${result.localTasksUpdated.length} lokale Aufgabe(n) aktualisiert`);
    }
    
    if (result.tasksDeleted > 0) {
      parts.push(`${result.tasksDeleted} Aufgabe(n) gelöscht`);
    }
    
    if (result.localTasksDeleted.length > 0) {
      parts.push(`${result.localTasksDeleted.length} lokale Aufgabe(n) zum Löschen markiert`);
    }
    
    if (result.localColumnsUpdated.length > 0) {
      parts.push(`${result.localColumnsUpdated.length} lokale Spalte(n) aktualisiert`);
    }
    
    if (result.localColumnsDeleted.length > 0) {
      parts.push(`${result.localColumnsDeleted.length} lokale Spalte(n) zum Löschen markiert`);
    }
    
    // NEW: Label/Tag creation tracking
    if (result.labelsCreated > 0) {
      parts.push(`${result.labelsCreated} Label erstellt`);
    }
    
    if (result.tagsCreated.length > 0) {
      parts.push(`${result.tagsCreated.length} Tag(s) erstellt`);
    }

    if (parts.length === 0) {
      return 'Keine Änderungen erforderlich';
    }

    let summary = parts.join(', ');
    
    // Add performance and sync type information
    const durationSeconds = (result.syncDuration / 1000).toFixed(1);
    const syncTypeDisplay = result.syncType === 'incremental' ? 'Inkrementell' : 'Vollständig';
    
    if (parts.length > 0) {
      summary += ` | ${syncTypeDisplay} (${durationSeconds}s)`;
    } else {
      summary = `${syncTypeDisplay} synchronisiert (${durationSeconds}s)`;
    }
    
    // Add performance metrics for incremental sync
    if (result.syncType === 'incremental' && result.itemsSkipped > 0) {
      summary += `, ${result.itemsSkipped} übersprungen`;
    }
    
    if (result.errors.length > 0) {
      summary += ` (${result.errors.length} Fehler)`;
    }

    return summary;
  }

  /**
   * Setup automatic synchronization
   */
  private setupAutoSync(): void {
    // Clear existing timer
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    // Setup new timer if enabled
    if (this.config?.enabled && this.config.autoSyncInterval > 0) {
      const intervalMs = this.config.autoSyncInterval * 60 * 1000; // Convert minutes to milliseconds
      
      this.autoSyncTimer = setInterval(() => {
        console.log('⏰ Auto-sync triggered');
        // Emit event for the main app context to handle
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('todoist-auto-sync-trigger'));
        }
      }, intervalMs);
      
      console.log(`⏰ Auto-sync setup: every ${this.config.autoSyncInterval} minutes`);
    }
  }

  /**
   * Extract reminders from Todoist due date/time and convert to TaskFuchs reminders
   */
  private extractReminderFromTodoist(todoistTask: TodoistTask): { reminderDate?: string; reminderTime?: string } {
    // Extract reminder from Todoist due date/time (simplified)
    if (!this.config?.syncSettings.syncDueDates || !todoistTask.due) {
      return {};
    }
    
    const reminderDate = todoistTask.due.date;
    
    // Check if Todoist due has time component
    let reminderTime = '09:00'; // Default time if no time specified
    
    // Todoist due.string often contains time information
    if (todoistTask.due.string) {
      // Try to extract time from due.string (e.g., "Jan 15 at 2:30 PM")
      const timeMatch = todoistTask.due.string.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        reminderTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      } else {
        // Try 24h format (e.g., "14:30")
        const time24Match = todoistTask.due.string.match(/(\d{1,2}):(\d{2})/);
        if (time24Match) {
          const hours = parseInt(time24Match[1]);
          const minutes = time24Match[2];
          if (hours >= 0 && hours <= 23) {
            reminderTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
          }
        }
      }
    }
    
    console.log(`📅 ⏰ Extracted simplified Todoist reminder: ${reminderDate} ${reminderTime} for task "${todoistTask.content}"`);
    return { reminderDate, reminderTime };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }
}

// Create singleton instance
export const todoistSyncManager = new TodoistSyncManager(); 