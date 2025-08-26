import type { 
  Task, 
  MicrosoftToDoAuth, 
  MicrosoftToDoTask, 
  MicrosoftToDoList, 
  MicrosoftToDoSection,
  MicrosoftToDoProjectMapping,
  MicrosoftToDoSyncOptions, 
  MicrosoftToDoSyncResult,
  MicrosoftToDoSyncConflict
} from '../types';

// Microsoft Graph API Configuration
// NOTE: For production, ensure your app runs on HTTPS to enable crypto.subtle API
// The current implementation includes a fallback for development environments

// ⚠️ WICHTIG: Sie müssen eine Azure App Registration erstellen und die echte Client ID hier einfügen!
// 📋 Anleitung: Siehe MICROSOFT-TODO-QUICKSTART.md für Schritt-für-Schritt Anweisungen
const MICROSOFT_GRAPH_CONFIG = {
  clientId: 'YOUR_AZURE_CLIENT_ID_HERE', // ⚠️ ERSETZEN SIE DIESE PLACEHOLDER MIT IHRER ECHTEN CLIENT ID!
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/microsoft` : 'http://localhost:5173/auth/microsoft',
  scope: 'https://graph.microsoft.com/Tasks.ReadWrite offline_access',
  authority: 'https://login.microsoftonline.com/common',
  graphApiUrl: 'https://graph.microsoft.com/v1.0'
};

interface GraphApiResponse<T> {
  value?: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

export class MicrosoftToDoService {
  private auth: MicrosoftToDoAuth | null = null;
  private syncInProgress = false;

  constructor() {
    this.loadAuthFromStorage();
  }

  // ===== AUTHENTICATION METHODS =====

  /**
   * Initialize OAuth2 authentication flow
   */
  async initiateAuth(): Promise<string> {
    // Check if user has configured their own Azure App Registration
    if (MICROSOFT_GRAPH_CONFIG.clientId === 'YOUR_AZURE_CLIENT_ID_HERE') {
      throw new Error(
        'Azure App Registration nicht konfiguriert! ' +
        'Bitte erstellen Sie eine Azure App Registration und ersetzen Sie die Client ID in src/utils/microsoftTodoService.ts. ' +
        'Anleitung: Siehe MICROSOFT-TODO-QUICKSTART.md Schritt 0.'
      );
    }

    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(128);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store code verifier for later use
    sessionStorage.setItem('msToDoCodeVerifier', codeVerifier);
    sessionStorage.setItem('msToDoState', state);

    const params = new URLSearchParams({
      client_id: MICROSOFT_GRAPH_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: MICROSOFT_GRAPH_CONFIG.redirectUri,
      scope: MICROSOFT_GRAPH_CONFIG.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_mode: 'query'
    });

    const authUrl = `${MICROSOFT_GRAPH_CONFIG.authority}/oauth2/v2.0/authorize?${params.toString()}`;
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<MicrosoftToDoAuth> {
    const storedState = sessionStorage.getItem('msToDoState');
    const codeVerifier = sessionStorage.getItem('msToDoCodeVerifier');

    if (!storedState || !codeVerifier || storedState !== state) {
      throw new Error('Invalid state or missing code verifier');
    }

    const tokenUrl = `${MICROSOFT_GRAPH_CONFIG.authority}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: MICROSOFT_GRAPH_CONFIG.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: MICROSOFT_GRAPH_CONFIG.redirectUri,
      code_verifier: codeVerifier,
      scope: MICROSOFT_GRAPH_CONFIG.scope
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${error.error_description || error.error}`);
    }

    const tokenData = await response.json();
    const auth: MicrosoftToDoAuth = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope
    };

    this.auth = auth;
    this.saveAuthToStorage();

    // Clean up session storage
    sessionStorage.removeItem('msToDoCodeVerifier');
    sessionStorage.removeItem('msToDoState');

    return auth;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<MicrosoftToDoAuth> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = `${MICROSOFT_GRAPH_CONFIG.authority}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: MICROSOFT_GRAPH_CONFIG.clientId,
      grant_type: 'refresh_token',
      refresh_token: this.auth.refreshToken,
      scope: MICROSOFT_GRAPH_CONFIG.scope
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const tokenData = await response.json();
    const newAuth: MicrosoftToDoAuth = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || this.auth.refreshToken,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope
    };

    this.auth = newAuth;
    this.saveAuthToStorage();
    return newAuth;
  }

  /**
   * Check if authenticated and token is valid
   */
  isAuthenticated(): boolean {
    return !!(this.auth?.accessToken && this.auth.expiresAt > Date.now());
  }

  /**
   * Sign out and clear authentication
   */
  signOut(): void {
    this.auth = null;
    this.clearAuthFromStorage();
  }

  // ===== API METHODS =====

  /**
   * Get all To Do lists
   */
  async getLists(): Promise<MicrosoftToDoList[]> {
    await this.ensureValidToken();
    
    const response = await this.makeApiCall<GraphApiResponse<MicrosoftToDoList>>('/me/todo/lists');
    return response.value || [];
  }

  /**
   * Get all sections (groups/areas) from Microsoft To Do
   */
  async getSections(): Promise<MicrosoftToDoSection[]> {
    await this.ensureValidToken();
    
    const response = await this.makeApiCall<GraphApiResponse<MicrosoftToDoSection>>('/me/todo/lists/tasks/sections');
    return response.value || [];
  }

  /**
   * Get lists within a specific section
   */
  async getListsInSection(sectionId: string): Promise<MicrosoftToDoList[]> {
    await this.ensureValidToken();
    
    const response = await this.makeApiCall<GraphApiResponse<MicrosoftToDoList>>(
      `/me/todo/lists?$filter=@odata.context contains '${sectionId}'`
    );
    return response.value || [];
  }

  /**
   * Create a new section
   */
  async createSection(name: string): Promise<MicrosoftToDoSection> {
    await this.ensureValidToken();
    
    return await this.makeApiCall<MicrosoftToDoSection>(
      `/me/todo/lists/tasks/sections`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: name
        })
      }
    );
  }

  /**
   * Create a new list in a section
   */
  async createListInSection(sectionId: string, name: string): Promise<MicrosoftToDoList> {
    await this.ensureValidToken();
    
    return await this.makeApiCall<MicrosoftToDoList>(
      `/me/todo/lists`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: name,
          parentFolderId: sectionId
        })
      }
    );
  }

  /**
   * Get tasks from a specific list
   */
  async getTasks(listId: string): Promise<MicrosoftToDoTask[]> {
    await this.ensureValidToken();
    
    const response = await this.makeApiCall<GraphApiResponse<MicrosoftToDoTask>>(
      `/me/todo/lists/${listId}/tasks?$expand=attachments`
    );
    return response.value || [];
  }

  /**
   * Create a new task
   */
  async createTask(listId: string, task: Partial<MicrosoftToDoTask>): Promise<MicrosoftToDoTask> {
    await this.ensureValidToken();
    
    return await this.makeApiCall<MicrosoftToDoTask>(
      `/me/todo/lists/${listId}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(task)
      }
    );
  }

  /**
   * Update an existing task
   */
  async updateTask(listId: string, taskId: string, task: Partial<MicrosoftToDoTask>, etag?: string): Promise<MicrosoftToDoTask> {
    await this.ensureValidToken();
    
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }

    return await this.makeApiCall<MicrosoftToDoTask>(
      `/me/todo/lists/${listId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(task),
        headers
      }
    );
  }

  /**
   * Delete a task
   */
  async deleteTask(listId: string, taskId: string, etag?: string): Promise<void> {
    await this.ensureValidToken();
    
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }

    await this.makeApiCall<void>(
      `/me/todo/lists/${listId}/tasks/${taskId}`,
      {
        method: 'DELETE',
        headers
      }
    );
  }

  // ===== SYNC METHODS =====

  /**
   * Sync tasks using project mappings
   */
  async syncTasksWithProjectMappings(
    localTasks: Task[],
    projectMappings: MicrosoftToDoProjectMapping[],
    options: MicrosoftToDoSyncOptions = {}
  ): Promise<MicrosoftToDoSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronisation bereits in Bearbeitung');
    }

    this.syncInProgress = true;
    const result: MicrosoftToDoSyncResult = {
      success: false,
      added: 0,
      updated: 0,
      deleted: 0,
      conflicts: [],
      errors: []
    };

    try {
      options.onProgress?.(10, 'Starte Projekt-basierte Synchronisation...');

      // Filter enabled mappings
      const enabledMappings = projectMappings.filter(mapping => mapping.enabled);
      
      for (const [index, projectMapping] of enabledMappings.entries()) {
        const progress = 20 + (index / enabledMappings.length) * 70;
        options.onProgress?.(progress, `Synchronisiere Projekt: ${projectMapping.taskFuchsProjectName}`);

        // Get tasks for this project
        const projectTasks = localTasks.filter(task => task.projectId === projectMapping.taskFuchsProjectId);
        
        // Sync each column mapping
        for (const columnMapping of projectMapping.columnMappings) {
          if (!columnMapping.enabled) continue;
          
          const columnTasks = projectTasks.filter(task => task.columnId === columnMapping.taskFuchsColumnId);
          
          // Use existing sync method for this specific list
          const columnResult = await this.syncTasks(columnTasks, columnMapping.microsoftListId, {
            ...options,
            onProgress: (prog, msg) => options.onProgress?.(progress, `${projectMapping.taskFuchsProjectName}: ${msg}`)
          });

          // Merge results
          result.added += columnResult.added;
          result.updated += columnResult.updated;
          result.deleted += columnResult.deleted;
          result.conflicts.push(...columnResult.conflicts);
          result.errors.push(...columnResult.errors);
        }
      }

      options.onProgress?.(100, 'Projekt-Synchronisation abgeschlossen');
      result.success = result.errors.length === 0;

    } catch (error) {
      console.error('Microsoft To Do project sync error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync local tasks with Microsoft To Do (single list method)
   */
  async syncTasks(
    localTasks: Task[], 
    listId: string, 
    options: MicrosoftToDoSyncOptions = {}
  ): Promise<MicrosoftToDoSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronisation bereits in Bearbeitung');
    }

    this.syncInProgress = true;
    const result: MicrosoftToDoSyncResult = {
      success: false,
      added: 0,
      updated: 0,
      deleted: 0,
      conflicts: [],
      errors: []
    };

    try {
      options.onProgress?.(10, 'Verbindung zu Microsoft To Do...');
      
      // Get remote tasks
      const remoteTasks = await this.getTasks(listId);
      options.onProgress?.(30, 'Remote-Aufgaben geladen...');

      // Create maps for easier lookup
      const localTaskMap = new Map(
        localTasks
          .filter(task => task.microsoftTodoId)
          .map(task => [task.microsoftTodoId!, task])
      );
      const remoteTaskMap = new Map(remoteTasks.map(task => [task.id, task]));

      options.onProgress?.(50, 'Synchronisation wird durchgeführt...');

      // Process remote tasks
      for (const remoteTask of remoteTasks) {
        const localTask = localTaskMap.get(remoteTask.id);
        
        if (!localTask) {
          // New remote task - create local task
          result.added++;
        } else {
          // Check for conflicts
          const localModified = new Date(localTask.updatedAt).getTime();
          const remoteModified = new Date(remoteTask.lastModifiedDateTime).getTime();
          
          if (localModified > remoteModified) {
            // Local is newer - update remote
            const microsoftTask = this.taskToMicrosoftTodo(localTask);
            await this.updateTask(listId, remoteTask.id, microsoftTask, remoteTask['@odata.etag']);
            result.updated++;
          } else if (remoteModified > localModified) {
            // Remote is newer - update local (handled by calling code)
            result.updated++;
          }
        }
      }

      // Process local tasks that don't exist remotely
      for (const localTask of localTasks) {
        if (!localTask.microsoftTodoId) {
          // New local task - create remote
          const microsoftTask = this.taskToMicrosoftTodo(localTask);
          const createdTask = await this.createTask(listId, microsoftTask);
          
          // Update local task with Microsoft IDs (handled by calling code)
          result.added++;
        }
      }

      options.onProgress?.(100, 'Synchronisation abgeschlossen');
      result.success = true;

    } catch (error) {
      console.error('Microsoft To Do sync error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // ===== CONVERSION METHODS =====

  /**
   * Convert TaskFuchs task to Microsoft To Do task
   */
  taskToMicrosoftTodo(task: Task): Partial<MicrosoftToDoTask> {
    const microsoftTask: Partial<MicrosoftToDoTask> = {
      title: task.title,
      status: task.completed ? 'completed' : 'notStarted'
    };

    if (task.description) {
      microsoftTask.body = {
        content: task.description,
        contentType: 'text'
      };
    }

    if (task.priority && task.priority !== 'none') {
      microsoftTask.importance = task.priority === 'high' ? 'high' : 
                                 task.priority === 'medium' ? 'normal' : 'low';
    }

    if (task.reminderDate) {
      microsoftTask.isReminderOn = true;
      microsoftTask.reminderDateTime = {
        dateTime: task.reminderDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    return microsoftTask;
  }

  /**
   * Convert Microsoft To Do task to TaskFuchs task
   */
  microsoftTodoToTask(microsoftTask: MicrosoftToDoTask, existingTask?: Task): Partial<Task> {
    const task: Partial<Task> = {
      title: microsoftTask.title,
      description: microsoftTask.body?.content || '',
      completed: microsoftTask.status === 'completed',
      microsoftTodoId: microsoftTask.id,
      microsoftTodoEtag: microsoftTask['@odata.etag'],
      microsoftTodoLastSync: new Date().toISOString(),
      microsoftTodoSyncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };

    if (microsoftTask.importance) {
      task.priority = microsoftTask.importance === 'high' ? 'high' : 
                     microsoftTask.importance === 'normal' ? 'medium' : 'low';
    }

    if (microsoftTask.reminderDateTime) {
      task.reminderDate = microsoftTask.reminderDateTime.dateTime;
    }

    if (microsoftTask.completedDateTime) {
      task.completedAt = microsoftTask.completedDateTime.dateTime;
    }

    // Preserve existing properties if updating
    if (existingTask) {
      task.id = existingTask.id;
      task.columnId = existingTask.columnId;
      task.projectId = existingTask.projectId;
      task.tags = existingTask.tags;
      task.subtasks = existingTask.subtasks;
      task.position = existingTask.position;
      task.createdAt = existingTask.createdAt;
    }

    return task;
  }

  // ===== HELPER METHODS =====

  private async makeApiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${MICROSOFT_GRAPH_CONFIG.graphApiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.auth?.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshToken();
        
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.auth?.accessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers
        });

        if (!retryResponse.ok) {
          throw new Error(`API call failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return retryResponse.status === 204 ? {} as T : await retryResponse.json();
      }

      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.status === 204 ? {} as T : await response.json();
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.auth) {
      throw new Error('Nicht authentifiziert');
    }

    if (this.auth.expiresAt <= Date.now() + 60000) { // Refresh if expires within 1 minute
      await this.refreshToken();
    }
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    // Check if crypto.subtle is available (requires HTTPS in production)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      } catch (error) {
        console.warn('crypto.subtle failed, falling back to simple hash:', error);
      }
    }
    
    // Fallback for development environments without crypto.subtle
    // This is less secure but allows development on HTTP
    console.warn('crypto.subtle not available, using fallback hash (development only)');
    return this.simpleHash(verifier);
  }

  private simpleHash(input: string): string {
    // Simple hash function for development only
    // NOT cryptographically secure - only for development
    // Microsoft requires exactly 43 characters for code challenge
    
    // Create a pseudo-random but deterministic hash
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Create additional entropy from input
    const seed = Math.abs(hash).toString(36) + input.length.toString(36);
    
    // Generate a 32-byte equivalent (256 bits) as hex, then convert to base64url
    let hexHash = '';
    for (let i = 0; i < 64; i++) { // 64 hex chars = 32 bytes
      const charCode = (seed.charCodeAt(i % seed.length) + i) % 256;
      hexHash += charCode.toString(16).padStart(2, '0');
    }
    
    // Convert hex to bytes and then to base64url
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexHash.substr(i * 2, 2), 16);
    }
    
    // Convert to base64 and then to base64url format
    const base64 = btoa(String.fromCharCode(...bytes));
    const codeChallenge = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, ''); // This should result in exactly 43 characters
    
    // Ensure exactly 43 characters (Microsoft requirement)
    if (codeChallenge.length !== 43) {
      console.warn(`Code challenge length is ${codeChallenge.length}, expected 43. Padding/truncating.`);
      return (codeChallenge + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_').substring(0, 43);
    }
    
    return codeChallenge;
  }

  private saveAuthToStorage(): void {
    if (this.auth) {
      localStorage.setItem('microsoftToDoAuth', JSON.stringify(this.auth));
    }
  }

  private loadAuthFromStorage(): void {
    const stored = localStorage.getItem('microsoftToDoAuth');
    if (stored) {
      try {
        this.auth = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load Microsoft To Do auth from storage:', error);
        this.clearAuthFromStorage();
      }
    }
  }

  private clearAuthFromStorage(): void {
    localStorage.removeItem('microsoftToDoAuth');
  }
}

// Export singleton instance
export const microsoftToDoService = new MicrosoftToDoService(); 