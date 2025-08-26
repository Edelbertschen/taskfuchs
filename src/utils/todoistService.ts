import type { 
  Task, 
  UserPreferences, 
  TodoistProject, 
  TodoistTask, 
  TodoistLabel, 
  TodoistSyncOptions, 
  TodoistSyncResult 
} from '../types';

class TodoistService {
  private baseUrl = 'https://api.todoist.com/rest/v2';
  private preferences: UserPreferences | null = null;

  constructor() {
    this.loadPreferences();
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem('taskfuchs-preferences');
      if (saved) {
        this.preferences = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading Todoist preferences:', error);
    }
  }

  updatePreferences(preferences: UserPreferences) {
    this.preferences = preferences;
  }

  private getHeaders(): Record<string, string> {
    if (!this.preferences?.todoist?.apiToken) {
      throw new Error('Todoist API token not configured');
    }

    return {
      'Authorization': `Bearer ${this.preferences.todoist.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.preferences?.todoist?.enabled) {
      throw new Error('Todoist integration is not enabled');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('Todoist API-Token ungültig. Bitte überprüfen Sie Ihren API-Token.');
        }
        
        if (response.status === 403) {
          throw new Error('Zugriff auf Todoist verweigert. Überprüfen Sie Ihre Berechtigung.');
        }
        
        throw new Error(
          `Todoist API error: ${response.status} ${response.statusText}${
            errorData.error ? ` - ${errorData.error}` : ''
          }`
        );
      }

      return response.json();
    } catch (error) {
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Verbindung zur Todoist API fehlgeschlagen. Dies kann aufgrund von CORS-Einschränkungen auftreten. Die Todoist-Integration funktioniert möglicherweise nur in der Desktop-Version der App.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Test API connection (bypasses enabled check)
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const projects = await this.makeTestRequest<TodoistProject[]>('/projects');
      return {
        success: true,
        message: `Erfolgreich verbunden! ${projects.length} Projekt(e) gefunden.`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen',
      };
    }
  }

  // Special request method for testing that bypasses enabled check
  private async makeTestRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.preferences?.todoist?.apiToken) {
      throw new Error('Kein API-Token konfiguriert');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.preferences.todoist.apiToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('API-Token ungültig. Bitte überprüfen Sie Ihren Todoist API-Token.');
        }
        
        if (response.status === 403) {
          throw new Error('Zugriff verweigert. Bitte überprüfen Sie Ihre Todoist-Berechtigung.');
        }
        
        throw new Error(
          `Todoist API-Fehler: ${response.status} ${response.statusText}${
            errorData.error ? ` - ${errorData.error}` : ''
          }`
        );
      }

      return response.json();
    } catch (error) {
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Verbindung zur Todoist API fehlgeschlagen. Dies kann aufgrund von CORS-Einschränkungen auftreten. Die Todoist-Integration funktioniert möglicherweise nur in der Desktop-Version der App.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Get all projects
  async getProjects(): Promise<TodoistProject[]> {
    return this.makeRequest<TodoistProject[]>('/projects');
  }

  // Get all labels
  async getLabels(): Promise<TodoistLabel[]> {
    return this.makeRequest<TodoistLabel[]>('/labels');
  }

  // Get tasks with optional filtering
  async getTasks(filter?: string): Promise<TodoistTask[]> {
    const endpoint = filter ? `/tasks?filter=${encodeURIComponent(filter)}` : '/tasks';
    return this.makeRequest<TodoistTask[]>(endpoint);
  }

  // Create a new task
  async createTask(task: Partial<TodoistTask>): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  // Update a task
  async updateTask(taskId: string, task: Partial<TodoistTask>): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  // Close/complete a task
  async closeTask(taskId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/tasks/${taskId}/close`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Error closing Todoist task:', error);
      return false;
    }
  }

  // Reopen a task
  async reopenTask(taskId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/tasks/${taskId}/reopen`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Error reopening Todoist task:', error);
      return false;
    }
  }

  // Delete a task
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Error deleting Todoist task:', error);
      return false;
    }
  }

  // Normalize tags - remove # or @ prefix and convert to lowercase
  private normalizeTag(tag: string): string {
    return tag.replace(/^[#@]/, '').toLowerCase().trim();
  }

  // Check if task should be synced based on tags
  shouldSyncTask(task: Task): boolean {
    if (!this.preferences?.todoist?.enabled) return false;
    
    const syncTags = this.preferences.todoist.syncTags;
    if (!syncTags || syncTags.length === 0) return false;

    // Check if task has any of the required sync tags (normalize for comparison)
    return syncTags.some(syncTag => 
      task.tags.some(taskTag => 
        this.normalizeTag(taskTag) === this.normalizeTag(syncTag)
      )
    );
  }

  // Convert TaskFuchs task to Todoist task
  taskToTodoist(task: Task): Partial<TodoistTask> {
    // Convert ALL TaskFuchs tags (#tag) to Todoist labels (tag) - including sync tags
    const todoistLabels = task.tags.map(tag => this.normalizeTag(tag));
    
    console.log(`🏷️ Converting TaskFuchs tags to Todoist labels for "${task.title}":`, 
      task.tags, '→', todoistLabels);

    // Determine project based on task column and date
    let projectId = this.preferences?.todoist?.defaultProjectId;
    
    // If task is in a date column (planner), use default project
    // If task is in inbox or no date, use inbox project (will be determined later)
    if (task.columnId === 'inbox' || !task.columnId?.startsWith('date-')) {
      // Will be set to Todoist inbox project
      projectId = undefined; // Let Todoist use default inbox
    }

    const todoistTask: Partial<TodoistTask> = {
      content: task.title,
      description: task.description || '',
      labels: todoistLabels,
      project_id: projectId,
    };

    // Convert priority (TaskFuchs: none, low, medium, high -> Todoist: 1, 2, 3, 4)
    let todoistPriority = 1; // Default
    switch (task.priority) {
      case 'high':
        todoistPriority = 4;
        break;
      case 'medium':
        todoistPriority = 3;
        break;
      case 'low':
        todoistPriority = 2;
        break;
      default:
        todoistPriority = 1;
    }
    todoistTask.priority = todoistPriority;
    
    console.log(`🔥 Priority conversion for "${task.title}": TaskFuchs "${task.priority}" → Todoist ${todoistPriority}`);

    // Add due date - prioritize column date, then explicit dates, then dueDate
    let dueDate = task.deadline || task.reminderDate || task.dueDate;
    
    // If task is in a date column, extract date from column ID
    if (task.columnId?.startsWith('date-')) {
      const columnDate = task.columnId.replace('date-', '');
      if (columnDate && columnDate !== 'undefined') {
        dueDate = columnDate; // Format: YYYY-MM-DD
        console.log(`📅 Extracted date from column ${task.columnId}: ${dueDate}`);
      }
    }
    
    // If no date found but task has explicit date fields, use those
    if (!dueDate && (task.deadline || task.reminderDate || task.dueDate)) {
      dueDate = task.deadline || task.reminderDate || task.dueDate;
      console.log(`📅 Using explicit date field for "${task.title}": ${dueDate}`);
    }
    
    if (dueDate) {
      todoistTask.due = {
        date: dueDate,
        is_recurring: false,
        string: dueDate,
      };
      console.log(`📅 Setting Todoist due date: ${dueDate} for task "${task.title}" (from column: ${task.columnId})`);
    } else {
      console.log(`📅 No due date set for task "${task.title}" (column: ${task.columnId})`);
    }

    return todoistTask;
  }

  // Convert Todoist task to TaskFuchs task
  todoistToTask(todoistTask: TodoistTask, existingTask?: Task): Partial<Task> {
    // Convert ALL Todoist labels to TaskFuchs tags (add # prefix)
    const allLabelsAsTags = todoistTask.labels.map(label => `#${label}`);
    
    // Ensure sync tags are present (but avoid duplicates)
    const syncTags = (this.preferences?.todoist?.syncTags || []).map(syncTag => 
      syncTag.startsWith('#') ? syncTag : `#${syncTag}`
    );
    
    // Combine all labels and sync tags, removing duplicates
    const taskfuchsTags = [...new Set([...allLabelsAsTags, ...syncTags])];
    
    console.log(`🏷️ Converting Todoist labels to TaskFuchs tags for "${todoistTask.content}":`, 
      todoistTask.labels, '→', taskfuchsTags);

    const task: Partial<Task> = {
      title: todoistTask.content,
      description: todoistTask.description,
      completed: todoistTask.is_completed,
      tags: taskfuchsTags,
    };

    // Convert priority (Todoist: 1, 2, 3, 4 -> TaskFuchs: none, low, medium, high)
    let taskfuchsPriority: 'none' | 'low' | 'medium' | 'high' = 'none'; // Default
    switch (todoistTask.priority) {
      case 4:
        taskfuchsPriority = 'high';
        break;
      case 3:
        taskfuchsPriority = 'medium';
        break;
      case 2:
        taskfuchsPriority = 'low';
        break;
      default:
        taskfuchsPriority = 'none';
    }
    task.priority = taskfuchsPriority;
    
    console.log(`🔥 Priority conversion for "${todoistTask.content}": Todoist ${todoistTask.priority} → TaskFuchs "${taskfuchsPriority}"`);

    // Determine column placement based on Todoist due date (but don't set deadline/reminder)
    if (todoistTask.due && todoistTask.due.date) {
      const dueDate = todoistTask.due.date;
      
      // Place task in appropriate date column for planner (but no deadline/reminder)
      task.columnId = `date-${dueDate}`;
      console.log(`📅 Placing Todoist task "${todoistTask.content}" in date column: ${task.columnId} (no deadline set)`);
    } else {
      // No date - place in inbox
      task.columnId = 'inbox';
      console.log(`📥 Placing Todoist task "${todoistTask.content}" in inbox (no date)`);
    }

    // Preserve existing properties if updating (but keep the new columnId for date changes)
    if (existingTask) {
      task.id = existingTask.id;
      // DON'T override columnId - keep the newly calculated one based on Todoist due date
      task.createdAt = existingTask.createdAt;
      task.position = existingTask.position;
      task.trackedTime = existingTask.trackedTime;
      task.estimatedTime = existingTask.estimatedTime;
      task.subtasks = existingTask.subtasks;
      
      // Preserve existing date fields if they exist (for compatibility)
      task.deadline = existingTask.deadline;
      task.reminderDate = existingTask.reminderDate;
      task.dueDate = existingTask.dueDate;
      
      console.log(`📅 Updated column placement for "${existingTask.title}": ${existingTask.columnId} → ${task.columnId}`);
    }

    return task;
  }

  // Sync tasks with Todoist - Bidirectional sync
  async syncTasks(
    localTasks: Task[],
    archivedTasks: Task[] = [],
    options: TodoistSyncOptions = {}
  ): Promise<TodoistSyncResult & { localTasksToAdd: Task[]; localTasksToUpdate: Task[]; localTasksToSync: Task[] }> {
    const result = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      conflicts: [],
      localTasksToAdd: [] as Task[],
      localTasksToUpdate: [] as Task[],
      localTasksToSync: [] as Task[] // Tasks that need their Todoist ID updated
    };

    if (!this.preferences?.todoist?.enabled) {
      throw new Error('Todoist integration is not enabled');
    }

    try {
      // Get remote tasks from Todoist  
      const remoteTasks = await this.getTasks();
      console.log(`📥 Loaded ${remoteTasks.length} tasks from Todoist:`, remoteTasks.map(t => `"${t.content}" [${t.labels.join(', ')}]`));
      
      // Filter local tasks and archived tasks that should be synced
      const syncableTasks = localTasks.filter(task => this.shouldSyncTask(task));
      const syncableArchivedTasks = archivedTasks.filter(task => this.shouldSyncTask(task));
      
      console.log(`📤 Found ${syncableTasks.length} active local tasks to sync:`, syncableTasks.map(t => `"${t.title}" [${t.tags.join(', ')}]`));
      console.log(`📁 Found ${syncableArchivedTasks.length} archived tasks to sync:`, syncableArchivedTasks.map(t => `"${t.title}" [${t.tags.join(', ')}]`));
      console.log(`🏷️ Total unique tags/labels to be synchronized: ${new Set([...syncableTasks.flatMap(t => t.tags), ...syncableArchivedTasks.flatMap(t => t.tags), ...remoteTasks.flatMap(t => t.labels)]).size}`);
      
      // Priority distribution logging (including archived tasks)
      const allLocalTasks = [...syncableTasks, ...syncableArchivedTasks];
      const localPriorities = allLocalTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const remotePriorities = remoteTasks.reduce((acc, task) => {
        const priority = task.priority === 4 ? 'high' : task.priority === 3 ? 'medium' : task.priority === 2 ? 'low' : 'none';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`🔥 Local task priorities:`, localPriorities);
      console.log(`🔥 Remote task priorities:`, remotePriorities);
      
      console.log(`🔄 Syncing ${syncableTasks.length} local tasks with ${remoteTasks.length} Todoist tasks`);

      // Create maps for easier lookup - using both ID and title for robust matching
      const remoteTaskByIdMap = new Map<string, TodoistTask>();
      const remoteTaskByTitleMap = new Map<string, TodoistTask>();
      const localTaskByIdMap = new Map<string, Task>();
      const localTaskByTitleMap = new Map<string, Task>();
      
      // Map remote tasks by both ID and title
      remoteTasks.forEach(task => {
        remoteTaskByIdMap.set(task.id, task);
        remoteTaskByTitleMap.set(task.content.toLowerCase().trim(), task);
      });
      
      // Map local tasks by both Todoist ID (if available) and title
      [...syncableTasks, ...syncableArchivedTasks].forEach(task => {
        if (task.todoistId) {
          localTaskByIdMap.set(task.todoistId, task);
        }
        localTaskByTitleMap.set(task.title.toLowerCase().trim(), task);
      });

      // Phase 1: Sync local tasks to Todoist (active tasks)
      for (const localTask of syncableTasks) {
        try {
          // Try to find remote task by Todoist ID first, then by title
          let remoteTask = localTask.todoistId ? remoteTaskByIdMap.get(localTask.todoistId) : null;
          if (!remoteTask) {
            remoteTask = remoteTaskByTitleMap.get(localTask.title.toLowerCase().trim());
          }
          
          if (remoteTask) {
            // Task exists remotely - update if needed
            if (this.preferences.todoist.bidirectionalSync) {
              const todoistTaskData = this.taskToTodoist(localTask);
              
              // Check if update is needed (comparing local to remote)
              const localDueDate = todoistTaskData.due?.date || null;
              const remoteDueDate = remoteTask.due?.date || null;
              
              const needsUpdate = 
                remoteTask.description !== (todoistTaskData.description || '') ||
                remoteTask.is_completed !== localTask.completed ||
                remoteTask.priority !== (todoistTaskData.priority || 1) ||
                remoteDueDate !== localDueDate; // Include date comparison
              
              if (localDueDate !== remoteDueDate) {
                console.log(`📅 Date change detected for "${localTask.title}": Todoist "${remoteDueDate}" → TaskFuchs "${localDueDate}"`);
              }

              if (needsUpdate) {
                await this.updateTask(remoteTask.id, todoistTaskData);
                result.updated++;
                console.log(`📝 Updated Todoist task: ${localTask.title}`);
              }
              
              // Ensure local task has the Todoist ID for future syncs
              if (!localTask.todoistId) {
                const updatedLocalTask = {
                  ...localTask,
                  todoistId: remoteTask.id,
                  todoistLastSync: new Date().toISOString(),
                  todoistSyncStatus: 'synced' as const
                };
                result.localTasksToSync.push(updatedLocalTask);
                console.log(`🔗 Linked local task "${localTask.title}" with Todoist ID: ${remoteTask.id}`);
              }
            }
          } else {
            // Task doesn't exist remotely - create it
            const todoistTaskData = this.taskToTodoist(localTask);
            const createdTask = await this.createTask(todoistTaskData);
            result.created++;
            console.log(`➕ Created Todoist task: ${localTask.title}`);
            
            // Link the newly created Todoist task with the local task
            const updatedLocalTask = {
              ...localTask,
              todoistId: createdTask.id,
              todoistLastSync: new Date().toISOString(),
              todoistSyncStatus: 'synced' as const
            };
            result.localTasksToSync.push(updatedLocalTask);
            console.log(`🔗 Linked local task "${localTask.title}" with new Todoist ID: ${createdTask.id}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Error syncing task "${localTask.title}": ${errorMessage}`);
        }
      }

      // Phase 1.5: Sync archived tasks to Todoist (mark as completed)
      for (const archivedTask of syncableArchivedTasks) {
        try {
          // Try to find remote task by Todoist ID first, then by title
          let remoteTask = archivedTask.todoistId ? remoteTaskByIdMap.get(archivedTask.todoistId) : null;
          if (!remoteTask) {
            remoteTask = remoteTaskByTitleMap.get(archivedTask.title.toLowerCase().trim());
          }
          
          if (remoteTask) {
            // Archived task exists remotely - mark as completed if not already
            if (!remoteTask.is_completed) {
              await this.closeTask(remoteTask.id);
              result.updated++;
              console.log(`📁 Marked Todoist task as completed (archived): ${archivedTask.title}`);
            }
            
            // Ensure archived task has the Todoist ID
            if (!archivedTask.todoistId) {
              const updatedArchivedTask = {
                ...archivedTask,
                todoistId: remoteTask.id,
                todoistLastSync: new Date().toISOString(),
                todoistSyncStatus: 'synced' as const
              };
              result.localTasksToSync.push(updatedArchivedTask);
              console.log(`🔗 Linked archived task "${archivedTask.title}" with Todoist ID: ${remoteTask.id}`);
            }
          } else {
            // Archived task doesn't exist remotely - create it as completed
            const todoistTaskData = this.taskToTodoist(archivedTask);
            const createdTask = await this.createTask(todoistTaskData);
            // Immediately mark as completed
            await this.closeTask(createdTask.id);
            result.created++;
            console.log(`📁 Created and completed Todoist task (archived): ${archivedTask.title}`);
            
            // Link the newly created archived task
            const updatedArchivedTask = {
              ...archivedTask,
              todoistId: createdTask.id,
              todoistLastSync: new Date().toISOString(),
              todoistSyncStatus: 'synced' as const
            };
            result.localTasksToSync.push(updatedArchivedTask);
            console.log(`🔗 Linked archived task "${archivedTask.title}" with new Todoist ID: ${createdTask.id}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Error syncing archived task "${archivedTask.title}": ${errorMessage}`);
        }
      }

      // Phase 2: Import tasks from Todoist to TaskFuchs (bidirectional sync)
      if (this.preferences.todoist.bidirectionalSync) {
        console.log(`🔄 Phase 2: Checking ${remoteTasks.length} Todoist tasks for import`);
        console.log(`🏷️ Looking for sync tags:`, this.preferences.todoist.syncTags);
        
        for (const remoteTask of remoteTasks) {
          try {
            // Check if this remote task has sync tags
            console.log(`📋 Checking task "${remoteTask.content}" with labels:`, remoteTask.labels);
            
            const hasSyncTags = this.preferences.todoist.syncTags?.some(syncTag => 
              remoteTask.labels.some(label => 
                this.normalizeTag(label) === this.normalizeTag(syncTag)
              )
            );
            
            console.log(`🏷️ Task "${remoteTask.content}" has sync tags:`, hasSyncTags);

            if (!hasSyncTags) continue; // Skip tasks without sync tags

            // Try to find existing local task by Todoist ID first, then by title
            let existingLocalTask = localTaskByIdMap.get(remoteTask.id);
            if (!existingLocalTask) {
              existingLocalTask = localTaskByTitleMap.get(remoteTask.content.toLowerCase().trim());
            }
            
            if (existingLocalTask) {
              // Task exists locally - check if update needed
              const updatedTask = this.todoistToTask(remoteTask, existingLocalTask);
              
              const localNeedsUpdate = 
                existingLocalTask.description !== remoteTask.description ||
                existingLocalTask.completed !== remoteTask.is_completed ||
                existingLocalTask.columnId !== updatedTask.columnId ||
                existingLocalTask.priority !== updatedTask.priority;
                // Note: No deadline comparison for Todoist tasks - only column placement and priority matter

              if (localNeedsUpdate) {
                const mergedTask = {
                  ...existingLocalTask,
                  ...updatedTask,
                  todoistId: remoteTask.id,
                  todoistLastSync: new Date().toISOString(),
                  todoistSyncStatus: 'synced' as const,
                  // Preserve important existing fields that shouldn't be overwritten
                  id: existingLocalTask.id,
                  createdAt: existingLocalTask.createdAt,
                  position: existingLocalTask.position,
                  trackedTime: existingLocalTask.trackedTime,
                  estimatedTime: existingLocalTask.estimatedTime,
                  subtasks: existingLocalTask.subtasks
                } as Task;
                
                result.localTasksToUpdate.push(mergedTask);
                console.log(`📝 Updated local task from Todoist: ${remoteTask.content} → Column: ${updatedTask.columnId} (was: ${existingLocalTask.columnId})`);
                
                if (existingLocalTask.columnId !== updatedTask.columnId) {
                  console.log(`📅 Date-based column change: "${existingLocalTask.columnId}" → "${updatedTask.columnId}"`);
                }
              } else if (!existingLocalTask.todoistId) {
                // No content update needed, but ensure Todoist ID is set
                result.localTasksToSync.push({
                  ...existingLocalTask,
                  todoistId: remoteTask.id,
                  todoistLastSync: new Date().toISOString(),
                  todoistSyncStatus: 'synced' as const
                });
                console.log(`🔗 Linked existing local task "${existingLocalTask.title}" with Todoist ID: ${remoteTask.id}`);
              }
            } else {
              // Task doesn't exist locally - create it
              const newLocalTask = this.todoistToTask(remoteTask);
              const taskWithDefaults: Task = {
                id: `todoist-${remoteTask.id}-${Date.now()}`, // Unique ID
                title: newLocalTask.title || remoteTask.content,
                description: newLocalTask.description || '',
                completed: newLocalTask.completed || false,
                priority: newLocalTask.priority || 'medium',
                tags: newLocalTask.tags || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                position: 0,
                subtasks: [],
                columnId: newLocalTask.columnId || 'inbox', // Use determined column from todoistToTask
                dueDate: newLocalTask.dueDate,
                // No deadline or reminderDate for Todoist imports - only column placement
                estimatedTime: newLocalTask.estimatedTime,
                trackedTime: 0,
                // Todoist sync fields
                todoistId: remoteTask.id,
                todoistLastSync: new Date().toISOString(),
                todoistSyncStatus: 'synced' as const
              };
              
              result.localTasksToAdd.push(taskWithDefaults);
              console.log(`➕ Created local task from Todoist: ${remoteTask.content} → Column: ${taskWithDefaults.columnId}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Error importing task "${remoteTask.content}": ${errorMessage}`);
          }
        }
      }

      // Update last sync time
      this.updateLastSync();
      
      console.log('✅ Bidirectional Todoist sync completed:', {
        created: result.created,
        updated: result.updated,
        localTasksToAdd: result.localTasksToAdd.length,
        localTasksToUpdate: result.localTasksToUpdate.length,
        localTasksToSync: result.localTasksToSync.length,
        errors: result.errors.length
      });
      
      console.log('🔗 Todoist ID assignments:', {
        newlyLinked: result.localTasksToSync.map(t => ({ title: t.title, todoistId: t.todoistId })),
        alreadyLinked: [...syncableTasks, ...syncableArchivedTasks].filter(t => t.todoistId).length
      });
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Sync failed: ${errorMessage}`);
      throw error;
    }
  }

  // Update last sync timestamp
  private updateLastSync() {
    if (this.preferences?.todoist) {
      this.preferences.todoist.lastSync = new Date().toISOString();
      this.preferences.todoist.lastSyncStatus = 'success';
      this.preferences.todoist.lastSyncError = undefined;
      
      // Save to localStorage
      try {
        localStorage.setItem('taskfuchs-preferences', JSON.stringify(this.preferences));
      } catch (error) {
        console.error('Error saving Todoist sync status:', error);
      }
    }
  }

  // Run diagnostics
  async runDiagnostics(): Promise<{
    connection: { success: boolean; message: string };
    config: { valid: boolean; issues: string[] };
    permissions: { valid: boolean; message: string };
    recommendations: string[];
  }> {
    const diagnostics = {
      connection: { success: false, message: '' },
      config: { valid: false, issues: [] as string[] },
      permissions: { valid: false, message: '' },
      recommendations: [] as string[],
    };

    // Test connection
    diagnostics.connection = await this.testConnection();

    // Check configuration
    const configIssues: string[] = [];
    if (!this.preferences?.todoist?.apiToken) {
      configIssues.push('API-Token fehlt');
    }
    if (!this.preferences?.todoist?.syncTags || this.preferences.todoist.syncTags.length === 0) {
      configIssues.push('Keine Sync-Tags konfiguriert');
    }

    diagnostics.config = {
      valid: configIssues.length === 0,
      issues: configIssues,
    };

    // Check permissions (if connection successful)
    if (diagnostics.connection.success) {
      try {
        await this.getProjects();
        diagnostics.permissions = {
          valid: true,
          message: 'Alle erforderlichen Berechtigungen verfügbar',
        };
      } catch (error) {
        diagnostics.permissions = {
          valid: false,
          message: error instanceof Error ? error.message : 'Berechtigungsfehler',
        };
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!diagnostics.connection.success) {
      if (diagnostics.connection.message.includes('CORS')) {
        recommendations.push('🖥️ Verwenden Sie die Desktop-Version für volle Todoist-Kompatibilität');
        recommendations.push('🌐 Browser-CORS-Einschränkungen verhindern API-Zugriff');
      }
      if (diagnostics.connection.message.includes('401') || diagnostics.connection.message.includes('ungültig')) {
        recommendations.push('🔑 Überprüfen Sie Ihren Todoist API-Token in den Todoist-Einstellungen');
        recommendations.push('📝 Neuen API-Token generieren: Todoist → Einstellungen → Integrationen → API-Token');
      }
    }

    if (!diagnostics.config.valid) {
      recommendations.push('⚙️ Vervollständigen Sie die Todoist-Konfiguration in den Einstellungen');
    }

    if (!diagnostics.permissions.valid && diagnostics.connection.success) {
      recommendations.push('👥 Überprüfen Sie Ihre Todoist-Berechtigung');
    }

    if (diagnostics.connection.success && diagnostics.config.valid && diagnostics.permissions.valid) {
      recommendations.push('✅ Todoist-Integration ist vollständig konfiguriert und funktionsbereit');
      recommendations.push('🏷️ Fügen Sie Tags zu Aufgaben hinzu, um sie mit Todoist zu synchronisieren');
    }

    diagnostics.recommendations = recommendations;
    return diagnostics;
  }
}

export const todoistService = new TodoistService(); 