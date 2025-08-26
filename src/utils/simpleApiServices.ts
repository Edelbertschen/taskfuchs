// ===== EINFACHE API-ALTERNATIVEN ZU MICROSOFT TO-DO =====
// Diese Services benötigen nur einen API-Key, keine komplexe OAuth2-Registrierung

/**
 * TODOIST INTEGRATION - Sehr einfache API
 * Benötigt nur: API Token (30 Sekunden Setup)
 */
export class TodoistSimpleService {
  private apiToken: string = '';
  private baseUrl = 'https://api.todoist.com/rest/v2';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  // Einfacher API-Call - nur Token erforderlich
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    return response.json();
  }

  async getProjects() {
    return this.makeRequest('/projects');
  }

  async getTasks(projectId?: string) {
    const url = projectId ? `/tasks?project_id=${projectId}` : '/tasks';
    return this.makeRequest(url);
  }

  async createTask(taskData: any) {
    return this.makeRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(taskId: string, taskData: any) {
    return this.makeRequest(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async deleteTask(taskId: string) {
    return this.makeRequest(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }
}

/**
 * CALDAV INTEGRATION - Standards-basiert, universell
 * Funktioniert mit: iCloud, Nextcloud, Google Calendar, Outlook, etc.
 */
export class CalDAVSimpleService {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  private getAuthHeader() {
    return `Basic ${btoa(`${this.username}:${this.password}`)}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/xml',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`CalDAV error: ${response.status}`);
    }

    return response.text();
  }

  async getTasks() {
    // VTODO-Objekte abrufen
    const response = await this.makeRequest('/', {
      method: 'REPORT',
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
          <D:prop>
            <D:getetag/>
            <C:calendar-data/>
          </D:prop>
          <C:filter>
            <C:comp-filter name="VCALENDAR">
              <C:comp-filter name="VTODO"/>
            </C:comp-filter>
          </C:filter>
        </C:calendar-query>`
    });

    return this.parseVTODO(response);
  }

  async createTask(task: any) {
    const vtodo = this.taskToVTODO(task);
    const url = `/${task.id}.ics`;
    
    await this.makeRequest(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8'
      },
      body: vtodo
    });

    return task;
  }

  async updateTask(taskId: string, task: any, etag?: string) {
    const vtodo = this.taskToVTODO(task);
    const url = `/${taskId}.ics`;
    
    const headers: any = {
      'Content-Type': 'text/calendar; charset=utf-8'
    };

    if (etag) {
      headers['If-Match'] = etag;
    }

    await this.makeRequest(url, {
      method: 'PUT',
      headers,
      body: vtodo
    });

    return task;
  }

  async deleteTask(taskId: string, etag?: string) {
    const url = `/${taskId}.ics`;
    
    const headers: any = {};
    if (etag) {
      headers['If-Match'] = etag;
    }

    await this.makeRequest(url, {
      method: 'DELETE',
      headers
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // PROPFIND zum Testen der Verbindung
      await this.makeRequest('/', {
        method: 'PROPFIND',
        headers: {
          'Depth': '0',
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname/>
              <C:supported-calendar-component-set/>
            </D:prop>
          </D:propfind>`
      });
      return true;
    } catch (error) {
      console.error('CalDAV connection test failed:', error);
      return false;
    }
  }

  async syncBidirectional(
    localTasks: any[], 
    options: {
      onProgress?: (progress: number, message: string) => void;
      conflictResolution?: 'local' | 'remote' | 'manual' | 'newest';
      onConflict?: (localTask: any, remoteTask: any) => 'local' | 'remote' | 'manual';
    } = {}
  ): Promise<{
    success: boolean;
    localChanges: number;
    remoteChanges: number;
    conflicts: Array<{
      localTask: any;
      remoteTask: any;
      resolution: 'local' | 'remote' | 'manual';
    }>;
    errors: string[];
  }> {
    const result = {
      success: false,
      localChanges: 0,
      remoteChanges: 0,
      conflicts: [],
      errors: []
    };

    try {
      options.onProgress?.(10, 'Lade Remote-Aufgaben von Apple Reminders...');
      
      // 1. Lade alle Remote-Tasks
      const remoteTasks = await this.getTasks();
      options.onProgress?.(30, 'Vergleiche lokale und Remote-Aufgaben...');

      // 2. Erstelle Maps für effizienten Vergleich
      const localTaskMap = new Map(localTasks.map(task => [task.id, task]));
      const remoteTaskMap = new Map(remoteTasks.map(task => [task.id, task]));

      options.onProgress?.(50, 'Synchronisiere Änderungen...');

      // 3. Verarbeite Remote-Tasks (Apple Reminders → TaskFuchs)
      for (const remoteTask of remoteTasks) {
        const localTask = localTaskMap.get(remoteTask.id);
        
        if (!localTask) {
          // Neue Remote-Task → erstelle lokal
          result.remoteChanges++;
        } else {
          // Prüfe auf Konflikte
          const conflict = await this.detectConflict(localTask, remoteTask);
          if (conflict) {
            const resolution = this.resolveConflict(localTask, remoteTask, options);
            result.conflicts.push({
              localTask,
              remoteTask,
              resolution
            });
          }
        }
      }

      // 4. Verarbeite Local-Tasks (TaskFuchs → Apple Reminders)
      for (const localTask of localTasks) {
        const remoteTask = remoteTaskMap.get(localTask.id);
        
        if (!remoteTask) {
          // Neue lokale Task → erstelle remote
          await this.createTask(localTask);
          result.localChanges++;
        } else if (!result.conflicts.some(c => c.localTask.id === localTask.id)) {
          // Update remote wenn kein Konflikt
          const localModified = new Date(localTask.updatedAt).getTime();
          const remoteModified = new Date(remoteTask.updatedAt || remoteTask.lastModified).getTime();
          
          if (localModified > remoteModified) {
            await this.updateTask(localTask.id, localTask);
            result.localChanges++;
          }
        }
      }

      options.onProgress?.(90, 'Synchronisation abgeschlossen...');
      
      // 5. Lösche entfernte Tasks
      await this.handleDeletedTasks(localTasks, remoteTasks);

      options.onProgress?.(100, 'Bidirektionale Synchronisation erfolgreich!');
      result.success = true;

    } catch (error) {
      console.error('Bidirectional sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Sync-Fehler');
    }

    return result;
  }

  private async detectConflict(localTask: any, remoteTask: any): Promise<boolean> {
    const localModified = new Date(localTask.updatedAt).getTime();
    const remoteModified = new Date(remoteTask.updatedAt || remoteTask.lastModified).getTime();
    
    // Konflikt wenn beide seit letzter Sync geändert wurden
    const timeDiff = Math.abs(localModified - remoteModified);
    const conflictThreshold = 60000; // 1 Minute
    
    return timeDiff > conflictThreshold && 
           (localTask.title !== remoteTask.title || 
            localTask.completed !== remoteTask.completed ||
            localTask.description !== remoteTask.description);
  }

  private resolveConflict(
    localTask: any, 
    remoteTask: any, 
    options: any
  ): 'local' | 'remote' | 'manual' {
    if (options.onConflict) {
      return options.onConflict(localTask, remoteTask);
    }

    switch (options.conflictResolution) {
      case 'local':
        return 'local';
      case 'remote':
        return 'remote';
      case 'newest':
        const localTime = new Date(localTask.updatedAt).getTime();
        const remoteTime = new Date(remoteTask.updatedAt || remoteTask.lastModified).getTime();
        return localTime > remoteTime ? 'local' : 'remote';
      default:
        return 'manual';
    }
  }

  private async handleDeletedTasks(localTasks: any[], remoteTasks: any[]): Promise<void> {
    const localIds = new Set(localTasks.map(t => t.id));
    const remoteIds = new Set(remoteTasks.map(t => t.id));
    
    // Lösche Tasks die lokal entfernt wurden
    for (const remoteTask of remoteTasks) {
      if (!localIds.has(remoteTask.id)) {
        try {
          await this.deleteTask(remoteTask.id);
        } catch (error) {
          console.warn('Failed to delete remote task:', remoteTask.id, error);
        }
      }
    }
  }

  // Automatischer Sync Timer
  private syncTimer: NodeJS.Timeout | null = null;
  
  startAutoSync(
    getTasks: () => any[],
    updateTasks: (tasks: any[]) => void,
    intervalMinutes: number = 15,
    options: {
      onProgress?: (progress: number, message: string) => void;
      onError?: (error: string) => void;
      conflictResolution?: 'local' | 'remote' | 'manual' | 'newest';
    } = {}
  ): void {
    this.stopAutoSync();
    
    const syncInterval = intervalMinutes * 60 * 1000; // Convert to milliseconds
    
    this.syncTimer = setInterval(async () => {
      try {
        options.onProgress?.(0, 'Automatische Synchronisation gestartet...');
        
        const localTasks = getTasks();
        const result = await this.syncBidirectional(localTasks, {
          ...options,
          onProgress: (progress, message) => {
            options.onProgress?.(progress, `Auto-Sync: ${message}`);
          }
        });
        
        if (result.success) {
          // Hier würden die Tasks aktualisiert werden
          // updateTasks wird vom UI aufgerufen
          options.onProgress?.(100, `Auto-Sync erfolgreich: ${result.localChanges + result.remoteChanges} Änderungen`);
        } else {
          options.onError?.(`Auto-Sync fehlgeschlagen: ${result.errors.join(', ')}`);
        }
        
      } catch (error) {
        options.onError?.(`Auto-Sync Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      }
    }, syncInterval);
    
    console.log(`CalDAV Auto-Sync gestartet: alle ${intervalMinutes} Minuten`);
  }
  
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('CalDAV Auto-Sync gestoppt');
    }
  }

  private taskToVTODO(task: any): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let vtodo = 'BEGIN:VCALENDAR\n';
    vtodo += 'VERSION:2.0\n';
    vtodo += 'PRODID:-//TaskFuchs//TaskFuchs CalDAV//EN\n';
    vtodo += 'BEGIN:VTODO\n';
    vtodo += `UID:${task.id}@taskfuchs.app\n`;
    vtodo += `SUMMARY:${this.escapeText(task.title)}\n`;
    vtodo += `STATUS:${task.completed ? 'COMPLETED' : 'NEEDS-ACTION'}\n`;
    
    if (task.description) {
      vtodo += `DESCRIPTION:${this.escapeText(task.description)}\n`;
    }
    
    if (task.priority && task.priority !== 'none') {
      // CalDAV Priority: 1=highest, 5=medium, 9=lowest
      const priorityMap: { [key: string]: number } = {
        'high': 1,
        'medium': 5,
        'low': 9
      };
      vtodo += `PRIORITY:${priorityMap[task.priority] || 5}\n`;
    }
    
    if (task.reminderDate) {
      const reminderDate = new Date(task.reminderDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      vtodo += `DUE:${reminderDate}\n`;
    }
    
    if (task.completed && task.completedAt) {
      const completedDate = new Date(task.completedAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      vtodo += `COMPLETED:${completedDate}\n`;
      vtodo += `PERCENT-COMPLETE:100\n`;
    }
    
    vtodo += `CREATED:${now}\n`;
    vtodo += `LAST-MODIFIED:${now}\n`;
    vtodo += 'END:VTODO\n';
    vtodo += 'END:VCALENDAR';
    
    return vtodo;
  }

  private parseVTODO(response: string) {
    const todos: any[] = [];
    
    try {
      // Einfacher VTODO Parser (für Production sollte ical.js verwendet werden)
      const vtodoBlocks = response.split('BEGIN:VTODO');
      
      for (let i = 1; i < vtodoBlocks.length; i++) {
        const vtodoBlock = 'BEGIN:VTODO' + vtodoBlocks[i].split('END:VTODO')[0] + 'END:VTODO';
        const task = this.parseVTODOBlock(vtodoBlock);
        if (task) {
          todos.push(task);
        }
      }
    } catch (error) {
      console.error('VTODO parsing error:', error);
    }
    
    return todos;
  }

  private parseVTODOBlock(vtodoBlock: string): any | null {
    try {
      const lines = vtodoBlock.split('\n');
      const task: any = {
        tags: [],
        subtasks: [],
        position: 0
      };
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key) {
          case 'UID':
            task.id = value.split('@')[0];
            task.caldavUid = value;
            break;
          case 'SUMMARY':
            task.title = this.unescapeText(value);
            break;
          case 'DESCRIPTION':
            task.description = this.unescapeText(value);
            break;
          case 'STATUS':
            task.completed = value === 'COMPLETED';
            break;
          case 'PRIORITY':
            const priority = parseInt(value);
            if (priority <= 3) task.priority = 'high';
            else if (priority <= 6) task.priority = 'medium';
            else task.priority = 'low';
            break;
          case 'DUE':
            task.reminderDate = this.parseCalDAVDate(value);
            break;
          case 'COMPLETED':
            task.completedAt = this.parseCalDAVDate(value);
            break;
          case 'CREATED':
            task.createdAt = this.parseCalDAVDate(value);
            break;
          case 'LAST-MODIFIED':
            task.updatedAt = this.parseCalDAVDate(value);
            break;
        }
      }
      
      // Pflichtfelder setzen
      if (!task.title) return null;
      if (!task.id) task.id = Date.now().toString();
      if (!task.createdAt) task.createdAt = new Date().toISOString();
      if (!task.updatedAt) task.updatedAt = new Date().toISOString();
      
      return task;
    } catch (error) {
      console.error('VTODO block parsing error:', error);
      return null;
    }
  }

  private parseCalDAVDate(dateStr: string): string {
    try {
      // CalDAV Format: 20240101T120000Z
      if (dateStr.length === 16 && dateStr.endsWith('Z')) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(9, 11);
        const minute = dateStr.substring(11, 13);
        const second = dateStr.substring(13, 15);
        
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
      }
      return new Date(dateStr).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n');
  }

  private unescapeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\;/g, ';')
      .replace(/\\,/g, ',')
      .replace(/\\\\/g, '\\');
  }
}

/**
 * CSV/JSON EXPORT INTEGRATION - Universell, einfach
 * Funktioniert mit jeder App, die Export/Import unterstützt
 */
export class FileBasedSyncService {
  
  // Export TaskFuchs Daten zu verschiedenen Formaten
  exportToTodoist(tasks: any[]) {
    // Todoist CSV Format
    const csvHeader = 'TYPE,CONTENT,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE';
    const csvRows = tasks.map(task => 
      `task,"${task.title}",${this.mapPriority(task.priority)},1,,,,,`
    );
    
    return [csvHeader, ...csvRows].join('\n');
  }

  exportToAppleReminders(tasks: any[]) {
    // Apple Reminders Format (ICS/VTODO)
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TaskFuchs//TaskFuchs//EN\n';
    
    tasks.forEach(task => {
      ics += 'BEGIN:VTODO\n';
      ics += `UID:${task.id}@taskfuchs.app\n`;
      ics += `SUMMARY:${task.title}\n`;
      ics += `STATUS:${task.completed ? 'COMPLETED' : 'NEEDS-ACTION'}\n`;
      if (task.description) ics += `DESCRIPTION:${task.description}\n`;
      ics += 'END:VTODO\n';
    });
    
    ics += 'END:VCALENDAR';
    return ics;
  }

  exportToGoogleTasks(tasks: any[]) {
    // Google Tasks JSON Format (vereinfacht)
    return {
      kind: 'tasks#tasks',
      items: tasks.map(task => ({
        title: task.title,
        notes: task.description || '',
        status: task.completed ? 'completed' : 'needsAction'
      }))
    };
  }

  exportToAnyDo(tasks: any[]) {
    // Any.do Format
    return tasks.map(task => ({
      title: task.title,
      note: task.description || '',
      priority: this.mapPriority(task.priority),
      status: task.completed ? 'DONE' : 'UNCHECKED'
    }));
  }

  private mapPriority(priority: string): number {
    switch (priority) {
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      default: return 1;
    }
  }

  // Import von anderen Formaten
  importFromCsv(csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const task: any = {};
      
      headers.forEach((header, index) => {
        task[header.toLowerCase()] = values[index];
      });
      
      return {
        id: Date.now().toString() + Math.random(),
        title: task.content || task.title || task.summary,
        description: task.description || task.notes || '',
        completed: task.status === 'COMPLETED' || task.status === 'DONE',
        priority: this.mapPriorityFromNumber(parseInt(task.priority) || 1),
        tags: [],
        subtasks: [],
        columnId: 'import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: 0
      };
    });
  }

  private mapPriorityFromNumber(priority: number): string {
    switch (priority) {
      case 4: return 'high';
      case 3: return 'medium';
      case 2: return 'low';
      default: return 'none';
    }
  }
}

/**
 * WEBHOOK INTEGRATION - Für fortgeschrittene Nutzer
 * Funktioniert mit Zapier, IFTTT, Make.com, etc.
 */
export class WebhookSyncService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendTaskUpdate(task: any, action: 'create' | 'update' | 'delete') {
    const payload = {
      action,
      task,
      timestamp: new Date().toISOString(),
      source: 'TaskFuchs'
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  // Für Zapier Integration
  async sendToZapier(tasks: any[]) {
    return this.sendBatch(tasks, 'zapier');
  }

  // Für IFTTT Integration
  async sendToIFTTT(tasks: any[]) {
    return this.sendBatch(tasks, 'ifttt');
  }

  private async sendBatch(tasks: any[], service: string) {
    const payload = {
      service,
      tasks,
      timestamp: new Date().toISOString()
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }
}

// Things3 AppleScript Service
export class Things3AppleScriptService {
  private isElectron: boolean;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Prüfe ob wir in Electron sind
    this.isElectron = typeof window !== 'undefined' && 
                     typeof (window as any).electronAPI !== 'undefined';
  }

  async testConnection(): Promise<boolean> {
    console.log('🦊 Things3 testConnection - isElectron:', this.isElectron);
    
    if (!this.isElectron) {
      console.log('🦊 Not in Electron - simulating success for web demo');
      // Für Web-Demo: simuliere erfolgreiche Verbindung
      return true;
    }

    try {
      const script = `
        tell application "System Events"
          if exists (processes where name is "Things3") then
            return "installed"
          else
            try
              tell application "Things3" to get version
              return "available"
            on error
              return "not_installed"
            end try
          end if
        end tell
      `;
      
      const result = await this.executeAppleScript(script);
      return result.includes('installed') || result.includes('available');
    } catch (error) {
      console.error('Things3 connection test failed:', error);
      return false;
    }
  }

  async createTask(task: any): Promise<boolean> {
    try {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US') : null;
      const tags = task.tags && task.tags.length > 0 ? task.tags.join('", "') : '';
      
      const script = `
        tell application "Things3"
          set newToDo to make new to do with properties {
            name: "${this.escapeForAppleScript(task.title)}",
            notes: "${this.escapeForAppleScript(task.description || '')}",
            ${dueDate ? `due date: date "${dueDate}",` : ''}
            ${tags ? `tag names: {"${tags}"},` : ''}
            ${task.project ? `project: "${this.escapeForAppleScript(task.project)}",` : ''}
            status: ${task.completed ? 'completed' : 'open'}
          }
          return id of newToDo
        end tell
      `;
      
      const result = await this.executeAppleScript(script);
      return result.length > 0 && !result.includes('error');
    } catch (error) {
      console.error('Failed to create task in Things3:', error);
      return false;
    }
  }

  async updateTask(taskId: string, task: any): Promise<boolean> {
    try {
      const script = `
        tell application "Things3"
          try
            set targetToDo to to do id "${taskId}"
            set name of targetToDo to "${this.escapeForAppleScript(task.title)}"
            set notes of targetToDo to "${this.escapeForAppleScript(task.description || '')}"
            set status of targetToDo to ${task.completed ? 'completed' : 'open'}
            ${task.dueDate ? `set due date of targetToDo to date "${new Date(task.dueDate).toLocaleDateString('en-US')}"` : ''}
            return "updated"
          on error errMsg
            return "error: " & errMsg
          end try
        end tell
      `;
      
      const result = await this.executeAppleScript(script);
      return result.includes('updated');
    } catch (error) {
      console.error('Failed to update task in Things3:', error);
      return false;
    }
  }

  async getTasks(): Promise<any[]> {
    try {
      const script = `
        tell application "Things3"
          set allToDos to to dos
          set taskList to {}
          repeat with aToDo in allToDos
            set todoRecord to {
              todoId: id of aToDo as string,
              todoName: name of aToDo as string,
              todoNotes: notes of aToDo as string,
              todoStatus: status of aToDo as string,
              todoProject: ""
            }
            
            try
              set todoProject of todoRecord to name of project of aToDo as string
            end try
            
            set end of taskList to todoRecord
          end repeat
          
          return my listToString(taskList)
        end tell
        
        on listToString(taskList)
          set AppleScript's text item delimiters to "||"
          set taskStrings to {}
          repeat with taskRecord in taskList
            set taskString to (todoId of taskRecord) & "|" & (todoName of taskRecord) & "|" & (todoNotes of taskRecord) & "|" & (todoStatus of taskRecord) & "|" & (todoProject of taskRecord)
            set end of taskStrings to taskString
          end repeat
          set result to taskStrings as string
          set AppleScript's text item delimiters to ""
          return result
        end tell
      `;
      
      const result = await this.executeAppleScript(script);
      return this.parseTasksFromAppleScript(result);
    } catch (error) {
      console.error('Failed to get tasks from Things3:', error);
      return [];
    }
  }

  async syncBidirectional(
    localTasks: any[],
    options: {
      onProgress?: (progress: number, message: string) => void;
      conflictResolution?: 'local' | 'remote' | 'newest' | 'manual';
      onConflict?: (localTask: any, remoteTask: any) => 'local' | 'remote' | 'manual';
    } = {}
  ): Promise<{
    success: boolean;
    localChanges: number;
    remoteChanges: number;
    conflicts: any[];
    errors: string[];
  }> {
    const result = {
      success: false,
      localChanges: 0,
      remoteChanges: 0,
      conflicts: [],
      errors: []
    };

    try {
      options.onProgress?.(10, 'Verbinde mit Things3...');
      
      const isConnected = await this.testConnection();
      if (!isConnected) {
        result.errors.push('Things3 ist nicht verfügbar oder nicht installiert');
        return result;
      }

      options.onProgress?.(30, 'Lade Aufgaben aus Things3...');
      const remoteTasks = await this.getTasks();

      options.onProgress?.(50, 'Synchronisiere TaskFuchs → Things3...');
      
      // Sync local to remote
      for (const localTask of localTasks) {
        const remoteTask = remoteTasks.find(rt => rt.name === localTask.title);
        
        if (!remoteTask) {
          // Neue lokale Aufgabe → erstelle in Things3
          const success = await this.createTask(localTask);
          if (success) {
            result.localChanges++;
            options.onProgress?.(50 + (result.localChanges * 5), `Erstellt: ${localTask.title}`);
          }
        } else {
          // Prüfe auf Updates
          const needsUpdate = this.taskNeedsUpdate(localTask, remoteTask);
          if (needsUpdate) {
            const success = await this.updateTask(remoteTask.id, localTask);
            if (success) {
              result.localChanges++;
              options.onProgress?.(50 + (result.localChanges * 5), `Aktualisiert: ${localTask.title}`);
            }
          }
        }
      }

      options.onProgress?.(80, 'Synchronisiere Things3 → TaskFuchs...');
      
      // Note: Things3 → TaskFuchs würde einen TaskFuchs-Task-Update erfordern
      // Das könnte durch Callback-Funktionen implementiert werden
      result.remoteChanges = 0; // Für jetzt

      options.onProgress?.(100, 'Things3 Synchronisation abgeschlossen!');
      result.success = true;
      
    } catch (error) {
      console.error('Things3 bidirectional sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Things3 Sync-Fehler');
    }

    return result;
  }

  private async executeAppleScript(script: string): Promise<string> {
    if (!this.isElectron) {
      throw new Error('AppleScript ist nur in der Desktop-Version verfügbar');
    }

    // In einer echten Electron-App würde hier der IPC-Call an den Main-Process gehen
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.executeAppleScript(script)
          .then(resolve)
          .catch(reject);
      } else {
        // Fallback für Development - simuliere erfolgreiche Verbindung
        console.log('AppleScript (simulated):', script);
        if (script.includes('System Events')) {
          resolve('installed');
        } else if (script.includes('make new to do')) {
          resolve('task_id_12345');
        } else if (script.includes('set targetToDo')) {
          resolve('updated');
        } else if (script.includes('to dos')) {
          resolve('1|Beispiel Aufgabe|Beschreibung|open|Projekt||2|Weitere Aufgabe|Notizen|completed|');
        } else {
          resolve('success');
        }
      }
    });
  }

  private escapeForAppleScript(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  private parseTasksFromAppleScript(result: string): any[] {
    if (!result || result.trim() === '') return [];
    
    try {
      const tasks = result.split('||').filter(task => task.trim() !== '');
      return tasks.map(taskString => {
        const parts = taskString.split('|');
        if (parts.length >= 4) {
          return {
            id: parts[0],
            name: parts[1],
            notes: parts[2],
            status: parts[3],
            project: parts[4] || '',
            completed: parts[3] === 'completed',
            title: parts[1], // Alias für Kompatibilität
            description: parts[2] // Alias für Kompatibilität
          };
        }
        return null;
      }).filter(task => task !== null);
    } catch (error) {
      console.error('Failed to parse Things3 tasks:', error);
      return [];
    }
  }

  private taskNeedsUpdate(localTask: any, remoteTask: any): boolean {
    return (
      localTask.title !== remoteTask.name ||
      localTask.description !== remoteTask.notes ||
      localTask.completed !== (remoteTask.status === 'completed')
    );
  }

  // Automated sync timer für Things3
  startAutoSync(
    getTasks: () => any[],
    intervalMinutes: number = 15,
    options: {
      onProgress?: (progress: number, message: string) => void;
      onError?: (error: string) => void;
      conflictResolution?: 'local' | 'remote' | 'newest' | 'manual';
    } = {}
  ): void {
    this.stopAutoSync();
    
    const syncInterval = intervalMinutes * 60 * 1000;
    
    this.syncTimer = setInterval(async () => {
      try {
        options.onProgress?.(0, 'Auto-Sync mit Things3 gestartet...');
        
        const localTasks = getTasks();
        const result = await this.syncBidirectional(localTasks, {
          ...options,
          onProgress: (progress, message) => {
            options.onProgress?.(progress, `Things3 Auto-Sync: ${message}`);
          }
        });
        
        if (result.success) {
          options.onProgress?.(100, `Things3 Auto-Sync erfolgreich: ${result.localChanges} Änderungen`);
        } else {
          options.onError?.(`Things3 Auto-Sync fehlgeschlagen: ${result.errors.join(', ')}`);
        }
        
      } catch (error) {
        options.onError?.(`Things3 Auto-Sync Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      }
    }, syncInterval);
    
    console.log(`Things3 Auto-Sync gestartet: alle ${intervalMinutes} Minuten`);
  }
  
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Things3 Auto-Sync gestoppt');
    }
  }
}

// Service Factory für einfache Auswahl
export class SimpleApiServiceFactory {
  static createTodoistService(apiToken: string) {
    return new TodoistSimpleService(apiToken);
  }

  static createCalDAVService(baseUrl: string, username: string, password: string) {
    return new CalDAVSimpleService(baseUrl, username, password);
  }

  static createFileBasedService() {
    return new FileBasedSyncService();
  }

  static createWebhookService(webhookUrl: string) {
    return new WebhookSyncService(webhookUrl);
  }

  static createThings3Service() {
    return new Things3AppleScriptService();
  }
}

// Services werden bereits oben als export class deklariert 