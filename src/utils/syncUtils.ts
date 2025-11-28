import { SyncStatus, SyncLogEntry, SyncStats, SyncConflict, WebDAVConfig } from '../types';
import { notificationService } from './notificationService';

// Proxy-Services für Web-App CORS-Probleme
const PROXY_SERVICES = [
  {
    name: 'AllOrigins',
    url: 'https://api.allorigins.win/raw?url=',
    method: 'GET',
    headers: (auth: string) => ({
      'X-Requested-With': 'XMLHttpRequest',
      'X-Custom-Authorization': auth
    }),
    transformUrl: (url: string) => encodeURIComponent(url)
  },
  {
    name: 'CorsProxy',
    url: 'https://corsproxy.io/?',
    method: 'GET',
    headers: (auth: string) => ({
      'Authorization': auth,
      'X-Requested-With': 'XMLHttpRequest'
    }),
    transformUrl: (url: string) => encodeURIComponent(url)
  },
  {
    name: 'CrossOrigin',
    url: 'https://cors-anywhere.herokuapp.com/',
    method: 'GET',
    headers: (auth: string) => ({
      'Authorization': auth,
      'X-Requested-With': 'XMLHttpRequest'
    }),
    transformUrl: (url: string) => url
  }
];

// Detect if we're in a web environment vs desktop
const isWebApp = (): boolean => {
  return typeof window !== 'undefined' && 
         !window.location.protocol.includes('file:') && 
         !('__TAURI__' in window) && 
         !process.env.ELECTRON;
};

// Enhanced WebDAV client with proxy support
class WebDAVClient {
  private config: WebDAVConfig;
  private proxyIndex: number = 0;
  private maxRetries: number = 3;

  constructor(config: WebDAVConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`;
  }

  private async tryDirectRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async tryProxyRequest(url: string, options: RequestInit): Promise<Response> {
    const errors: string[] = [];
    
    for (let i = 0; i < PROXY_SERVICES.length; i++) {
      const proxy = PROXY_SERVICES[(this.proxyIndex + i) % PROXY_SERVICES.length];
      
      try {
        const proxyUrl = `${proxy.url}${proxy.transformUrl(url)}`;
        const authHeader = this.getAuthHeader();
        
        const proxyOptions: RequestInit = {
          method: proxy.method,
          headers: {
            ...proxy.headers(authHeader),
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: options.body
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(proxyUrl, {
          ...proxyOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Rotate to successful proxy for next request
          this.proxyIndex = (this.proxyIndex + i) % PROXY_SERVICES.length;
          return response;
        } else {
          errors.push(`${proxy.name}: ${response.status}`);
        }
      } catch (error) {
        errors.push(`${proxy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error(`All proxy services failed: ${errors.join(', ')}`);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    if (!isWebApp()) {
      // Desktop app - use direct requests
      return this.tryDirectRequest(url, options);
    }

    // Web app - try direct first, then proxies
    try {
      return await this.tryDirectRequest(url, options);
    } catch (directError) {
      // Check if it's a CORS error
      if (directError instanceof TypeError && directError.message.includes('Failed to fetch')) {
        console.log('CORS error detected, trying proxy services...');
        return await this.tryProxyRequest(url, options);
      }
      throw directError;
    }
  }

  async propfind(url: string, depth: string = '0'): Promise<Response> {
    return this.request(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'text/xml',
        'Depth': depth
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:displayname/>
            <d:resourcetype/>
            <d:getcontentlength/>
            <d:getlastmodified/>
          </d:prop>
        </d:propfind>`
    });
  }

  async put(url: string, data: string): Promise<Response> {
    return this.request(url, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: data
    });
  }

  async get(url: string): Promise<Response> {
    return this.request(url, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });
  }

  async mkcol(url: string): Promise<Response> {
    return this.request(url, {
      method: 'MKCOL',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });
  }
}

class NextcloudSyncManager {
  private config: WebDAVConfig | null = null;
  private syncLog: SyncLogEntry[] = [];
  private isSyncing = false;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private statusCallbacks: ((status: SyncStatus) => void)[] = [];
  private webdavClient: WebDAVClient | null = null;

  constructor() {
    this.loadConfig();
    this.loadSyncLog();
  }

  private loadConfig(): void {
    try {
      const config = localStorage.getItem('webdav-config');
      if (config) {
        this.config = JSON.parse(config);
        if (this.config) {
          this.webdavClient = new WebDAVClient(this.config);
        }
      }
    } catch (error) {
      console.error('Error loading WebDAV config:', error);
    }
  }

  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem('webdav-config', JSON.stringify(this.config));
    }
  }

  private loadSyncLog(): void {
    try {
      const log = localStorage.getItem('sync-log');
      if (log) {
        this.syncLog = JSON.parse(log);
      }
    } catch (error) {
      console.error('Error loading sync log:', error);
    }
  }

  private saveSyncLog(): void {
    localStorage.setItem('sync-log', JSON.stringify(this.syncLog.slice(-100))); // Keep last 100 entries
  }

  private addLogEntry(type: 'info' | 'success' | 'error', message: string, details?: any): void {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };
    
    this.syncLog.push(entry);
    this.saveSyncLog();
    
    if (type === 'error') {
      console.error('Sync Error:', message, details);
    } else {
      console.log(`Sync ${type}:`, message, details);
    }
  }

  private cleanServerUrl(url: string): string {
    return url.replace(/\/+$/, '').replace(/\/+/g, '/').replace(/:\/{3,}/, '://');
  }

  private notifyStatusUpdate(status: Partial<SyncStatus>): void {
    this.statusCallbacks.forEach(callback => {
      callback({ 
        connected: this.config !== null,
        isActive: false,
        lastSync: '',
        status: 'idle',
        ...status 
      });
    });
  }

  // Enhanced connection test with better error handling
  public async testConnection(config: WebDAVConfig): Promise<{ success: boolean; message: string; details?: any }> {
    let response: Response;
    
    try {
      this.addLogEntry('info', `Testing connection to ${config.serverUrl}...`);
      
      // Create temporary client for testing
      const testClient = new WebDAVClient(config);
      const cleanUrl = this.cleanServerUrl(config.serverUrl);
      const webdavUrl = `${cleanUrl}/remote.php/dav/files/${config.username}`;

      response = await testClient.propfind(webdavUrl);

      if (response.ok) {
        this.addLogEntry('success', 'Connection test successful');
        return { 
          success: true, 
          message: 'Verbindung erfolgreich! Nextcloud-Server ist erreichbar.',
          details: {
            serverUrl: config.serverUrl,
            username: config.username,
            webdavEndpoint: webdavUrl
          }
        };
      }

      // Handle HTTP errors
      if (response.status === 401) {
        this.addLogEntry('error', 'Authentication failed - check username and password');
        return { 
          success: false, 
          message: 'Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Benutzername und Passwort.',
          details: {
            suggestion: 'Verwenden Sie ein App-Passwort für zusätzliche Sicherheit.'
          }
        };
      } else if (response.status === 404) {
        this.addLogEntry('error', 'WebDAV endpoint not found');
        return { 
          success: false, 
          message: 'WebDAV-Endpunkt nicht gefunden. Überprüfen Sie die Server-URL.',
          details: {
            suggestion: 'Stellen Sie sicher, dass die URL korrekt ist und "/remote.php/dav" verfügbar ist.'
          }
        };
      } else if (response.status === 403) {
        this.addLogEntry('error', 'Access forbidden - check permissions');
        return { 
          success: false, 
          message: 'Zugriff verweigert. Überprüfen Sie die Berechtigungen oder verwenden Sie ein App-Passwort.',
          details: {
            suggestion: 'Erstellen Sie ein App-Passwort in Ihren Nextcloud-Einstellungen.'
          }
        };
      } else if (response.status === 405) {
        this.addLogEntry('error', 'Method not allowed - WebDAV might be disabled');
        return { 
          success: false, 
          message: 'WebDAV ist möglicherweise deaktiviert. Überprüfen Sie die Nextcloud-Konfiguration.',
          details: {
            suggestion: 'Aktivieren Sie WebDAV in Ihren Nextcloud-Einstellungen.'
          }
        };
      } else {
        this.addLogEntry('error', `HTTP Error: ${response.status}`);
        return { 
          success: false, 
          message: `Server-Fehler: ${response.status} ${response.statusText}`,
          details: { 
            httpStatus: response.status,
            isWebApp: isWebApp(),
            suggestedAction: isWebApp() ? 'Versuchen Sie es mit einem anderen Browser oder aktivieren Sie CORS auf Ihrem Server.' : 'Überprüfen Sie Ihre Server-Konfiguration.'
          }
        };
      }
    } catch (fetchError) {
      this.addLogEntry('error', 'Network request failed', fetchError);
      
      // Enhanced error handling for web apps
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          message: isWebApp() 
            ? 'CORS-Fehler: Direkte Verbindung blockiert. Verwende Proxy-Services...'
            : 'Netzwerkfehler: Server nicht erreichbar.',
          details: {
            error: 'CORS_ERROR',
            isWebApp: isWebApp(),
            suggestion: isWebApp() 
              ? 'Die App verwendet automatisch Proxy-Services. Bitte stellen Sie sicher, dass Ihr Server HTTPS verwendet.'
              : 'Überprüfen Sie Ihre Netzwerkverbindung und Server-URL.'
          }
        };
      }
      
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return { 
          success: false, 
          message: 'Verbindung unterbrochen: Timeout. Überprüfen Sie die Server-URL und Netzwerkverbindung.',
          details: { 
            error: 'TIMEOUT_ERROR',
            suggestion: 'Stellen Sie sicher, dass der Server erreichbar ist und HTTPS verwendet.'
          }
        };
      }

      return { 
        success: false, 
        message: `Netzwerkfehler: ${fetchError instanceof Error ? fetchError.message : 'Unbekannter Fehler'}`,
        details: { 
          error: 'NETWORK_ERROR', 
          originalError: fetchError,
          isWebApp: isWebApp()
        }
      };
    }
  }

  // Enhanced configuration with better validation
  public async configure(config: WebDAVConfig): Promise<boolean> {
    try {
      // Validate configuration
      if (!config.serverUrl || !config.username || !config.password) {
        this.addLogEntry('error', 'Invalid configuration: missing required fields');
        return false;
      }

      // Normalize server URL
      config.serverUrl = this.cleanServerUrl(config.serverUrl);
      
      // Ensure folder starts with /
      if (!config.folder.startsWith('/')) {
        config.folder = '/' + config.folder;
      }

      // Test connection before saving
      const testResult = await this.testConnection(config);
      if (!testResult.success) {
        this.addLogEntry('error', 'Configuration failed: connection test failed', testResult);
        return false;
      }

      // Save configuration
      this.config = config;
      this.webdavClient = new WebDAVClient(config);
      this.saveConfig();

      // Ensure remote folder exists
      await this.ensureRemoteFolder();

      this.addLogEntry('success', 'Configuration saved successfully');
      this.notifyStatusUpdate({ connected: true, status: 'idle' });
      
      return true;
    } catch (error) {
      this.addLogEntry('error', 'Configuration failed', error);
      return false;
    }
  }

  // Enhanced folder creation with better error handling
  private async ensureRemoteFolder(): Promise<boolean> {
    if (!this.config || !this.webdavClient) return false;

    try {
      const cleanUrl = this.cleanServerUrl(this.config.serverUrl);
      const folderUrl = `${cleanUrl}/remote.php/dav/files/${this.config.username}${this.config.folder}`;
      
      // Check if folder exists
      const response = await this.webdavClient.propfind(folderUrl);
      
      if (response.ok) {
        this.addLogEntry('success', 'Remote folder exists');
        return true;
      } else if (response.status === 404) {
        // Create folder
        const createResponse = await this.webdavClient.mkcol(folderUrl);
        if (createResponse.ok || createResponse.status === 201) {
          this.addLogEntry('success', 'Remote folder created');
          return true;
        } else {
          this.addLogEntry('error', `Failed to create remote folder: ${createResponse.status}`);
          return false;
        }
      } else {
        this.addLogEntry('error', `Failed to check remote folder: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.addLogEntry('error', 'Error ensuring remote folder', error);
      return false;
    }
  }

  // Enhanced upload with retry logic
  private async uploadData(filename: string, data: string): Promise<boolean> {
    if (!this.config || !this.webdavClient) return false;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const cleanUrl = this.cleanServerUrl(this.config.serverUrl);
        const fileUrl = `${cleanUrl}/remote.php/dav/files/${this.config.username}${this.config.folder}/${filename}`;
        
        const response = await this.webdavClient.put(fileUrl, data);

        if (response.ok || response.status === 201) {
          this.addLogEntry('success', `Uploaded: ${filename}`);
          return true;
        } else {
          this.addLogEntry('error', `Upload failed for ${filename}: ${response.status}`);
          attempts++;
          
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
          }
        }
      } catch (error) {
        this.addLogEntry('error', `Upload error for ${filename} (attempt ${attempts + 1})`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
    }

    return false;
  }

  // Enhanced download with retry logic
  private async downloadData(filename: string): Promise<string | null> {
    if (!this.config || !this.webdavClient) return null;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const cleanUrl = this.cleanServerUrl(this.config.serverUrl);
        const fileUrl = `${cleanUrl}/remote.php/dav/files/${this.config.username}${this.config.folder}/${filename}`;
        
        const response = await this.webdavClient.get(fileUrl);

        if (response.ok) {
          const data = await response.text();
          this.addLogEntry('success', `Downloaded: ${filename}`);
          return data;
        } else if (response.status === 404) {
          this.addLogEntry('info', `File not found: ${filename}`);
          return null;
        } else {
          this.addLogEntry('error', `Download failed for ${filename}: ${response.status}`);
          attempts++;
          
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
          }
        }
      } catch (error) {
        this.addLogEntry('error', `Download error for ${filename} (attempt ${attempts + 1})`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
    }

    return null;
  }

  // Enhanced sync with better progress tracking
  public async syncData(appState: any): Promise<{ success: boolean; stats: SyncStats; conflicts: SyncConflict[] }> {
    if (this.isSyncing) {
      return { success: false, stats: this.createEmptyStats(), conflicts: [] };
    }

    this.isSyncing = true;
    const stats: SyncStats = this.createEmptyStats();
    const conflicts: SyncConflict[] = [];

    try {
      this.addLogEntry('info', `Starting synchronization... (${isWebApp() ? 'Web App' : 'Desktop App'})`);
      this.notifyStatusUpdate({ isActive: true, lastSync: '', status: 'syncing' });

      // Show user-friendly notification for web app users
      if (isWebApp()) {
        notificationService.showNotification({
          title: '🔄 Nextcloud Synchronisation',
          body: 'Synchronisation wird gestartet...',
          icon: '/3d_fox.png',
          tag: 'nextcloud-sync',
          requireInteraction: false
        });
      }

      // Upload current data
      const uploadSuccess = await this.uploadAppData(appState, stats);
      
      // Download remote data (if needed for conflict resolution)
      const downloadSuccess = await this.downloadAppData(stats);

      const success = uploadSuccess && downloadSuccess;
      
      if (success) {
        localStorage.setItem('lastSyncTime', new Date().toISOString());
        this.addLogEntry('success', 'Synchronization completed successfully', {
          ...stats,
          environment: isWebApp() ? 'web' : 'desktop'
        });
        this.notifyStatusUpdate({ 
          isActive: false,
          lastSync: new Date().toISOString(), 
          status: 'idle' 
        });

        // Show success notification for web app users
        if (isWebApp()) {
          notificationService.showNotification({
            title: '✅ Nextcloud Synchronisation',
            body: `Erfolgreich synchronisiert! ${stats.tasksUploaded} Aufgaben, ${stats.notesUploaded} Notizen`,
            icon: '/3d_fox.png',
            tag: 'nextcloud-sync-success',
            requireInteraction: false
          });
        }
      } else {
        this.addLogEntry('error', 'Synchronization completed with errors', {
          ...stats,
          environment: isWebApp() ? 'web' : 'desktop'
        });
        this.notifyStatusUpdate({ 
          isActive: false,
          lastSync: localStorage.getItem('lastSyncTime') || '', 
          status: 'error' 
        });

        // Show error notification for web app users
        if (isWebApp()) {
          notificationService.showNotification({
            title: '❌ Nextcloud Synchronisation',
            body: 'Synchronisation fehlgeschlagen. Bitte überprüfen Sie Ihre Verbindung.',
            icon: '/3d_fox.png',
            tag: 'nextcloud-sync-error',
            requireInteraction: true
          });
        }
      }

      return { success, stats, conflicts };
    } catch (error) {
      this.addLogEntry('error', 'Synchronization failed', error);
      this.notifyStatusUpdate({ 
        isActive: false,
        lastSync: localStorage.getItem('lastSyncTime') || '', 
        status: 'error' 
      });
      stats.errors++;

      // Show error notification for web app users
      if (isWebApp()) {
        notificationService.showNotification({
          title: '🚨 Nextcloud Synchronisation',
          body: `Synchronisation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          icon: '/3d_fox.png',
          tag: 'nextcloud-sync-critical',
          requireInteraction: true
        });
      }

      return { success: false, stats, conflicts };
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadAppData(appState: any, stats: SyncStats): Promise<boolean> {
    try {
      // Vollständige Synchronisation aller App-Daten
      const syncData = {
        // Aufgaben und Archiv
        tasks: appState.tasks || [],
        archivedTasks: appState.archivedTasks || [],
        
        // Strukturen
        columns: appState.columns || [],
        tags: appState.tags || [],
        kanbanBoards: appState.kanbanBoards || [],
        
        // Notizen (inkl. Daily Notes)
        notes: appState.notes?.notes || [],
        noteLinks: appState.noteLinks || [],
        notesState: {
          searchQuery: appState.notes?.searchQuery || '',
          selectedTags: appState.notes?.selectedTags || [],
          view: appState.notes?.view || 'grid',
          sortBy: appState.notes?.sortBy || 'updated',
          sortOrder: appState.notes?.sortOrder || 'desc',
          showArchived: appState.notes?.showArchived || false,
          showLinkPreviews: appState.notes?.showLinkPreviews || true,
          editorMode: appState.notes?.editorMode || 'split',
          dailyNotesMode: appState.notes?.dailyNotesMode || false,
          selectedDailyNoteDate: appState.notes?.selectedDailyNoteDate || null,
        },
        
        // Einstellungen und Ansichten
        preferences: appState.preferences || {},
        viewState: appState.viewState || {},
        
        // 🔗 Integration-Einstellungen explizit extrahiert
        integrations: {
          microsoftTodo: appState.preferences?.microsoftTodo ? {
            enabled: appState.preferences.microsoftTodo.enabled || false,
            selectedListId: appState.preferences.microsoftTodo.selectedListId,
            selectedListName: appState.preferences.microsoftTodo.selectedListName,
            autoSync: appState.preferences.microsoftTodo.autoSync,
            syncInterval: appState.preferences.microsoftTodo.syncInterval,
            lastSync: appState.preferences.microsoftTodo.lastSync,
            lastSyncStatus: appState.preferences.microsoftTodo.lastSyncStatus,
          } : { enabled: false },
          toggl: appState.preferences?.toggl ? {
            enabled: appState.preferences.toggl.enabled || false,
            workspaceId: appState.preferences.toggl.workspaceId,
            defaultProjectId: appState.preferences.toggl.defaultProjectId,
            autoSync: appState.preferences.toggl.autoSync,
            createProjectsAutomatically: appState.preferences.toggl.createProjectsAutomatically,
          } : { enabled: false },
          caldav: appState.preferences?.caldav ? {
            enabled: appState.preferences.caldav.enabled || false,
            serverUrl: appState.preferences.caldav.serverUrl,
            username: appState.preferences.caldav.username,
            calendarUrl: appState.preferences.caldav.calendarUrl,
            autoSync: appState.preferences.caldav.autoSync,
            syncInterval: appState.preferences.caldav.syncInterval,
            lastSync: appState.preferences.caldav.lastSync,
            lastSyncStatus: appState.preferences.caldav.lastSyncStatus,
          } : { enabled: false },
          nextcloud: (() => {
            try {
              const nextcloudConfig = localStorage.getItem('nextcloud_config');
              if (nextcloudConfig) {
                const config = JSON.parse(nextcloudConfig);
                return {
                  enabled: config.enabled || false,
                  serverUrl: config.serverUrl,
                  username: config.username,
                  syncFolder: config.syncFolder,
                  autoSync: config.autoSync,
                  syncInterval: config.syncInterval,
                  lastSync: config.lastSync,
                  totalSyncs: config.totalSyncs,
                };
              }
            } catch (error) {
              console.warn('Fehler beim Laden der Nextcloud-Konfiguration für Sync:', error);
            }
            return { enabled: false };
          })()
        },
        
        // Kalender-Daten
        events: appState.events || [],
        calendarSources: appState.calendarSources || [],
        
        // Bilder-Speicher
        imageStorage: appState.imageStorage || { images: [], currentSize: 0, maxSize: 104857600 },
        
        // 🎯 PIN SYSTEM
        pinColumns: appState.pinColumns || [],
        
        // Zusätzliche Daten
        searchQuery: appState.searchQuery || '',
        activeTagFilters: appState.activeTagFilters || [],
        activePriorityFilters: appState.activePriorityFilters || [],
        focusMode: appState.focusMode || false,
        focusedColumnId: appState.focusedColumnId || null,
        showCompletedTasks: appState.showCompletedTasks !== undefined ? appState.showCompletedTasks : true,
        projectColumnOffset: appState.projectColumnOffset || 0,
        notifications: appState.notifications || [],
        
        // Timer und Statusdaten
        activeTimer: appState.activeTimer || null,
        currentDate: appState.currentDate ? appState.currentDate.toISOString() : new Date().toISOString(),
        isNoteEditorFullScreen: appState.isNoteEditorFullScreen || false,
        
        // Wiederholungsregeln
        recurrence: appState.recurrence || { rules: [], lastProcessed: null },
        
        // 🕒 Zeitbudget-Features
        personalCapacity: appState.personalCapacity || null,
        
        // Metadaten
        timestamp: new Date().toISOString(),
        version: '2.1', // Vollständige Synchronisation mit allen AppState-Feldern
        metadata: {
          totalTasks: appState.tasks?.length || 0,
          totalArchivedTasks: appState.archivedTasks?.length || 0,
          totalNotes: appState.notes?.notes?.length || 0,
          totalDailyNotes: appState.notes?.notes?.filter((note: any) => note.dailyNote)?.length || 0,
          totalTags: appState.tags?.length || 0,
          totalBoards: appState.kanbanBoards?.length || 0,
          totalColumns: appState.columns?.length || 0,
          totalNoteLinks: appState.noteLinks?.length || 0,
          totalImages: appState.imageStorage?.images?.length || 0,
          totalNotifications: appState.notifications?.length || 0,
          totalEvents: appState.events?.length || 0,
          totalCalendarSources: appState.calendarSources?.length || 0,
          hasActiveTimer: !!(appState.activeTimer),
          hasRecurrenceRules: !!(appState.recurrence?.rules?.length),
          syncTime: Date.now(),
          appVersion: '2.1'
        }
      };

      const dataJson = JSON.stringify(syncData, null, 2);
      
      // Upload main data file
      const uploadSuccess = await this.uploadData('taskfuchs-data.json', dataJson);
      
      if (uploadSuccess) {
        stats.tasksUploaded = syncData.tasks.length;
        stats.notesUploaded = syncData.notes.length;
        
        // Create backup with timestamp
        const backupFilename = `taskfuchs-backup-${new Date().toISOString().split('T')[0]}.json`;
        await this.uploadData(backupFilename, dataJson);
        
        this.addLogEntry('success', `Uploaded complete data: ${syncData.tasks.length} tasks, ${syncData.notes.length} notes, ${syncData.metadata.totalDailyNotes} daily notes, ${syncData.tags.length} tags, ${syncData.kanbanBoards.length} boards, ${syncData.columns.length} columns, ${syncData.noteLinks.length} note links, ${syncData.imageStorage.images.length} images, ${syncData.events.length} calendar events, ${syncData.calendarSources.length} calendar sources, timer: ${syncData.activeTimer ? 'active' : 'inactive'}, recurrence rules: ${syncData.recurrence?.rules?.length || 0}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.addLogEntry('error', 'Upload failed', error);
      stats.errors++;
      return false;
    }
  }

  private async downloadAppData(stats: SyncStats): Promise<boolean> {
    try {
      // For now, we just verify the upload by downloading
      const data = await this.downloadData('taskfuchs-data.json');
      
      if (data) {
        const parsed = JSON.parse(data);
        stats.tasksDownloaded = parsed.tasks?.length || 0;
        stats.notesDownloaded = parsed.notes?.length || 0;
        return true;
      }
      
      return false;
    } catch (error) {
      this.addLogEntry('error', 'Download verification failed', error);
      stats.errors++;
      return false;
    }
  }

  private createEmptyStats(): SyncStats {
    return {
      tasksUploaded: 0,
      tasksDownloaded: 0,
      notesUploaded: 0,
      notesDownloaded: 0,
      conflictsResolved: 0,
      errors: 0
    };
  }

  // Public API
  public onStatusChange(callback: (status: SyncStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  public removeStatusCallback(callback: (status: SyncStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  public isSyncingNow(): boolean {
    return this.isSyncing;
  }

  public disconnect(): void {
    this.stopAutoSync();
    this.config = null;
    this.webdavClient = null;
    localStorage.removeItem('webdav-config');
    this.addLogEntry('info', 'Disconnected from server');
    this.notifyStatusUpdate({ connected: false, status: 'idle' });
  }

  // Test function for web app users
  public async testSync(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.config) {
      return { 
        success: false, 
        message: 'Keine Konfiguration gefunden. Bitte konfigurieren Sie zunächst Ihre Nextcloud-Verbindung.',
        details: { isWebApp: isWebApp() }
      };
    }

    try {
      this.addLogEntry('info', `Testing sync functionality... (${isWebApp() ? 'Web App' : 'Desktop App'})`);
      
      // Show test notification for web app users
      if (isWebApp()) {
        notificationService.showNotification({
          title: '🧪 Nextcloud Test',
          body: 'Teste Synchronisation...',
          icon: '/3d_fox.png',
          tag: 'nextcloud-test',
          requireInteraction: false
        });
      }

      // Test connection first
      const connectionTest = await this.testConnection(this.config);
      if (!connectionTest.success) {
        if (isWebApp()) {
          notificationService.showNotification({
            title: '❌ Nextcloud Test',
            body: `Verbindungstest fehlgeschlagen: ${connectionTest.message}`,
            icon: '/3d_fox.png',
            tag: 'nextcloud-test-fail',
            requireInteraction: true
          });
        }
        return connectionTest;
      }

      // Test file upload/download
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        environment: isWebApp() ? 'web' : 'desktop',
        userAgent: navigator.userAgent,
        message: 'TaskFuchs Synchronisation Test'
      };

      const testFilename = `test-${Date.now()}.json`;
      const uploadSuccess = await this.uploadData(testFilename, JSON.stringify(testData, null, 2));
      
      if (!uploadSuccess) {
        const message = 'Upload-Test fehlgeschlagen';
        if (isWebApp()) {
          notificationService.showNotification({
            title: '❌ Nextcloud Test',
            body: message,
            icon: '/3d_fox.png',
            tag: 'nextcloud-test-fail',
            requireInteraction: true
          });
        }
        return { success: false, message };
      }

      const downloadedData = await this.downloadData(testFilename);
      if (!downloadedData) {
        const message = 'Download-Test fehlgeschlagen';
        if (isWebApp()) {
          notificationService.showNotification({
            title: '❌ Nextcloud Test',
            body: message,
            icon: '/3d_fox.png',
            tag: 'nextcloud-test-fail',
            requireInteraction: true
          });
        }
        return { success: false, message };
      }

      // Verify data integrity
      const parsedData = JSON.parse(downloadedData);
      if (parsedData.test !== true || parsedData.message !== testData.message) {
        const message = 'Datenintegrität-Test fehlgeschlagen';
        if (isWebApp()) {
          notificationService.showNotification({
            title: '❌ Nextcloud Test',
            body: message,
            icon: '/3d_fox.png',
            tag: 'nextcloud-test-fail',
            requireInteraction: true
          });
        }
        return { success: false, message };
      }

      this.addLogEntry('success', 'Sync test completed successfully');
      
      // Show success notification for web app users
      if (isWebApp()) {
        notificationService.showNotification({
          title: '✅ Nextcloud Test',
          body: 'Synchronisation funktioniert einwandfrei! Upload, Download und Datenintegrität erfolgreich getestet.',
          icon: '/3d_fox.png',
          tag: 'nextcloud-test-success',
          requireInteraction: false
        });
      }

      return { 
        success: true, 
        message: 'Synchronisation erfolgreich getestet! Upload, Download und Datenintegrität funktionieren einwandfrei.',
        details: {
          environment: isWebApp() ? 'web' : 'desktop',
          testFile: testFilename,
          dataSize: downloadedData.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const message = `Sync-Test fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      this.addLogEntry('error', 'Sync test failed', error);
      
      if (isWebApp()) {
        notificationService.showNotification({
          title: '🚨 Nextcloud Test',
          body: message,
          icon: '/3d_fox.png',
          tag: 'nextcloud-test-error',
          requireInteraction: true
        });
      }
      
      return { 
        success: false, 
        message,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          isWebApp: isWebApp()
        }
      };
    }
  }

  public getSyncLog(): SyncLogEntry[] {
    return [...this.syncLog];
  }

  public clearSyncLog(): void {
    this.syncLog = [];
    this.saveSyncLog();
  }

  public isConfigured(): boolean {
    return this.config !== null;
  }

  public getConfig(): WebDAVConfig | null {
    return this.config;
  }



  public startAutoSync(intervalMinutes: number): void {
    this.stopAutoSync();
    
    this.syncIntervalId = setInterval(() => {
      // Auto-sync would need access to current app state
      // This would be implemented in the context where this manager is used
      this.addLogEntry('info', 'Auto-sync triggered');
    }, intervalMinutes * 60 * 1000);
    
    this.addLogEntry('info', `Auto-sync started with ${intervalMinutes} minute interval`);
  }

  public stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      this.addLogEntry('info', 'Auto-sync stopped');
    }
  }

  public getLastSyncTime(): string | null {
    return localStorage.getItem('lastSyncTime');
  }

  public async listRemoteFiles(): Promise<string[]> {
    if (!this.config || !this.webdavClient) return [];

    try {
      const cleanUrl = this.cleanServerUrl(this.config.serverUrl);
      const folderUrl = `${cleanUrl}/remote.php/dav/files/${this.config.username}${this.config.folder}`;
      
      const response = await this.webdavClient.propfind(folderUrl, '1');

      if (response.ok) {
        const xmlText = await response.text();
        // Parse XML response to extract file names
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const displayNames = xmlDoc.querySelectorAll('d\\:displayname, displayname');
        
        return Array.from(displayNames)
          .map(node => node.textContent)
          .filter(name => name && name.endsWith('.json'))
          .map(name => name!);
      }
      
      return [];
    } catch (error) {
      this.addLogEntry('error', 'Failed to list remote files', error);
      return [];
    }
  }
}

// Create and export the singleton instance
export const syncManager = new NextcloudSyncManager(); 

// Export types for use in components
export type { SyncLogEntry, SyncStats } from '../types'; 