import { notificationService } from './notificationService';

// ===== TYPES =====

export interface NextcloudConfig {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password: string; // Encrypted in storage
  syncFolder: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync: string | null;
  totalSyncs: number;
}

export interface NextcloudSyncResult {
  success: boolean;
  message: string;
  details?: string;
  timestamp: string;
  dataSize?: number;
  conflicts?: number;
}

export interface NextcloudStatus {
  connected: boolean;
  syncing: boolean;
  lastSync: string | null;
  nextSync: string | null;
  message: string;
  totalSyncs: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

// ===== ENCRYPTION HELPER =====

class EncryptionHelper {
  private static key = 'taskfuchs_nextcloud_security_2024';

  // Generate a key from the master key using PBKDF2
  private static async deriveKey(salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(this.key),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Generate random salt and IV
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Derive encryption key
      const key = await this.deriveKey(Array.from(salt).map(b => String.fromCharCode(b)).join(''));
      
      // Encrypt the data
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback to basic obfuscation for backwards compatibility
      return btoa(text + this.key).split('').reverse().join('');
    }
  }

  static async decrypt(encrypted: string): Promise<string> {
    try {
      // Try new encryption format first
      if (encrypted.length > 60) { // Minimum length for AES-GCM encrypted data
        try {
          // Decode from base64
          const combined = new Uint8Array(
            atob(encrypted)
              .split('')
              .map(char => char.charCodeAt(0))
          );

          // Extract salt, IV, and encrypted data
          const salt = combined.slice(0, 16);
          const iv = combined.slice(16, 28);
          const encryptedData = combined.slice(28);

          // Derive decryption key
          const saltString = Array.from(salt).map(b => String.fromCharCode(b)).join('');
          const key = await this.deriveKey(saltString);

          // Decrypt the data
          const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
          );

          const decoder = new TextDecoder();
          return decoder.decode(decrypted);
        } catch (aesError) {
          // If AES decryption fails, try fallback
          console.warn('AES decryption failed, trying fallback:', aesError);
        }
      }

      // Fallback to old obfuscation method for backwards compatibility
      return atob(encrypted.split('').reverse().join('')).replace(this.key, '');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}

// ===== MAIN NEXTCLOUD MANAGER =====

export class NextcloudManager {
  private static instance: NextcloudManager;
  private config: NextcloudConfig | null = null;
  private syncLog: SyncLogEntry[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private statusCallbacks: Array<(status: NextcloudStatus) => void> = [];

  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    await this.loadConfig();
    this.loadSyncLog();
    this.setupAutoSync();
  }

  static getInstance(): NextcloudManager {
    if (!NextcloudManager.instance) {
      NextcloudManager.instance = new NextcloudManager();
    }
    return NextcloudManager.instance;
  }

  // ===== CONFIGURATION MANAGEMENT =====

  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('nextcloud_config');
      if (stored) {
        const config = JSON.parse(stored);
        if (config.password) {
          config.password = await EncryptionHelper.decrypt(config.password);
        }
        this.config = config;
      }
    } catch (error) {
      console.error('Failed to load Nextcloud config:', error);
      this.config = null;
    }
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;
    
    try {
      const configToSave = {
        ...this.config,
        password: this.config.password ? await EncryptionHelper.encrypt(this.config.password) : ''
      };
      localStorage.setItem('nextcloud_config', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Failed to save Nextcloud config:', error);
    }
  }

  // ===== PUBLIC CONFIGURATION API =====

  getConfig(): NextcloudConfig | null {
    return this.config;
  }

  async updateConfig(updates: Partial<NextcloudConfig>): Promise<void> {
    if (!this.config && updates.enabled) {
      // Initialize new config
      this.config = {
        enabled: false,
        serverUrl: '',
        username: '',
        password: '',
        syncFolder: '/TaskFuchs',
        autoSync: true,
        syncInterval: 60, // 1 hour default
        lastSync: null,
        totalSyncs: 0,
        ...updates
      };
    } else if (this.config) {
      this.config = { ...this.config, ...updates };
    }

    await this.saveConfig();
    this.setupAutoSync();
    this.notifyStatusChange();
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  isConfigured(): boolean {
    return !!(this.config?.serverUrl && this.config?.username && this.config?.password);
  }

  // ===== CONNECTION TESTING =====

  async testConnection(serverUrl: string, username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanUrl = this.cleanServerUrl(serverUrl);
      const testUrl = `${cleanUrl}/status.php`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.installed === true) {
          return { 
            success: true, 
            message: `✅ Verbindung erfolgreich! Nextcloud ${data.version || 'Server'} erkannt.` 
          };
        } else {
          return { 
            success: false, 
            message: '❌ Server gefunden, aber keine gültige Nextcloud-Installation.' 
          };
        }
      } else if (response.status === 401) {
        return { 
          success: false, 
          message: '🔒 Anmeldedaten ungültig. Bitte überprüfen Sie Benutzername und Passwort.' 
        };
      } else {
        return { 
          success: false, 
          message: `❌ Server antwortet nicht (Status: ${response.status})` 
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          return { 
            success: false, 
            message: '🌐 CORS-Fehler. Server erlaubt keine Verbindung von dieser Domain.' 
          };
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          return { 
            success: false, 
            message: '🌐 Netzwerkfehler. Überprüfen Sie die Server-URL und Internetverbindung.' 
          };
        }
      }
      return { 
        success: false, 
        message: `❌ Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` 
      };
    }
  }

  // ===== SYNC FUNCTIONALITY =====

  async performSync(appData: any, force = false): Promise<NextcloudSyncResult> {
    if (!this.config || !this.isConfigured()) {
      return {
        success: false,
        message: '❌ Nextcloud ist nicht konfiguriert',
        timestamp: new Date().toISOString()
      };
    }

    if (this.isSyncing && !force) {
      return {
        success: false,
        message: 'ℹ️ Synchronisation bereits aktiv',
        timestamp: new Date().toISOString()
      };
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      const result = await this.uploadData(appData);
      
      if (result.success) {
        this.config.lastSync = new Date().toISOString();
        this.config.totalSyncs = (this.config.totalSyncs || 0) + 1;
        await this.saveConfig();
        
        this.addLogEntry('success', result.message, result.details);
        
        // Show success notification
        notificationService.showNotification({
          title: '✅ Nextcloud Sync',
          body: result.message,
          icon: '/3d_fox.png',
          tag: 'nextcloud-success'
        });
      } else {
        this.addLogEntry('error', result.message, result.details);
        
        // Show error notification
        notificationService.showNotification({
          title: '❌ Nextcloud Sync',
          body: result.message,
          icon: '/3d_fox.png',
          tag: 'nextcloud-error',
          requireInteraction: true
        });
      }

      return result;

    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  private async uploadData(appData: any): Promise<NextcloudSyncResult> {
    if (!this.config) throw new Error('No config');

    try {
      const cleanUrl = this.cleanServerUrl(this.config.serverUrl);
      const filename = `TaskFuchs_${new Date().toISOString().split('T')[0]}.json`;
      const uploadUrl = `${cleanUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}/${filename}`;

      // Extrahiere Integration-Einstellungen für vollständigen Export
      const extractIntegrationSettings = (preferences: any) => {
        const integrations: any = {};

        // Microsoft To-Do Integration
        if (preferences?.microsoftTodo) {
          integrations.microsoftTodo = {
            enabled: preferences.microsoftTodo.enabled || false,
            selectedListId: preferences.microsoftTodo.selectedListId,
            selectedListName: preferences.microsoftTodo.selectedListName,
            autoSync: preferences.microsoftTodo.autoSync,
            syncInterval: preferences.microsoftTodo.syncInterval,
            lastSync: preferences.microsoftTodo.lastSync,
            lastSyncStatus: preferences.microsoftTodo.lastSyncStatus,
          };
        }

        // Toggl Integration (ohne API-Token aus Sicherheitsgründen)
        if (preferences?.toggl) {
          integrations.toggl = {
            enabled: preferences.toggl.enabled || false,
            workspaceId: preferences.toggl.workspaceId,
            defaultProjectId: preferences.toggl.defaultProjectId,
            autoSync: preferences.toggl.autoSync,
            createProjectsAutomatically: preferences.toggl.createProjectsAutomatically,
          };
        }

        // CalDAV Integration (ohne Passwort aus Sicherheitsgründen)
        if (preferences?.caldav) {
          integrations.caldav = {
            enabled: preferences.caldav.enabled || false,
            serverUrl: preferences.caldav.serverUrl,
            username: preferences.caldav.username,
            calendarUrl: preferences.caldav.calendarUrl,
            autoSync: preferences.caldav.autoSync,
            syncInterval: preferences.caldav.syncInterval,
            lastSync: preferences.caldav.lastSync,
            lastSyncStatus: preferences.caldav.lastSyncStatus,
          };
        }

        return integrations;
      };

      const integrations = extractIntegrationSettings(appData.preferences);

      // Prepare complete export data with all new features
      const exportData = {
        app: 'TaskFuchs',
        version: '2.3', // ✨ Version für Zeitbudget-Features
        exportDate: new Date().toISOString(),
        data: {
          tasks: appData.tasks || [],
          archivedTasks: appData.archivedTasks || [],
          columns: appData.columns || [],
          tags: appData.tags || [],
          notes: appData.notes?.notes || [],
          preferences: appData.preferences || {},
          kanbanBoards: appData.kanbanBoards || [],
          noteLinks: appData.noteLinks || [],
          events: appData.events || [],
          calendarSources: appData.calendarSources || [],
          imageStorage: appData.imageStorage || { images: [], currentSize: 0 },
          // 🎯 PIN SYSTEM - NEU!
          pinColumns: appData.pinColumns || [],
          // 📧 NOTES VIEW STATE mit E-Mail Modus
          notesViewState: {
            selectedNote: appData.notes?.selectedNote,
            isEditing: appData.notes?.isEditing,
            searchQuery: appData.notes?.searchQuery,
            selectedTags: appData.notes?.selectedTags,
            view: appData.notes?.view,
            sortBy: appData.notes?.sortBy,
            sortOrder: appData.notes?.sortOrder,
            showArchived: appData.notes?.showArchived,
            showLinkPreviews: appData.notes?.showLinkPreviews,
            editorMode: appData.notes?.editorMode,
            dailyNotesMode: appData.notes?.dailyNotesMode,
            emailMode: appData.notes?.emailMode, // ✨ E-MAIL MODUS
            selectedDailyNoteDate: appData.notes?.selectedDailyNoteDate,
          },
          // Vollständige App-State Daten
          viewState: appData.viewState || {},
          // 📋 Projekt-Kanban-Spalten explizit für Rückwärtskompatibilität
          projectKanbanColumns: appData.viewState?.projectKanban?.columns || [],
          searchQuery: appData.searchQuery,
          activeTagFilters: appData.activeTagFilters || [],
          activePriorityFilters: appData.activePriorityFilters || [],
          focusMode: appData.focusMode,
          focusedColumnId: appData.focusedColumnId,
          showCompletedTasks: appData.showCompletedTasks,
          projectColumnOffset: appData.projectColumnOffset,
          notifications: appData.notifications || [],
          activeTimer: appData.activeTimer,
          isNoteEditorFullScreen: appData.isNoteEditorFullScreen,
          recurrence: appData.recurrence || {},
          // 🕒 Zeitbudget-Features
          personalCapacity: appData.personalCapacity || null,
          integrations: integrations // ✅ Integration-Einstellungen explizit hinzufügen
        },
        metadata: {
          totalTasks: (appData.tasks || []).length,
          totalArchivedTasks: (appData.archivedTasks || []).length,
          totalNotes: (appData.notes?.notes || []).length,
          totalDailyNotes: (appData.notes?.notes || []).filter(note => note.dailyNote).length,
          totalEmailNotes: (appData.notes?.notes || []).filter(note => note.metadata?.emailMetadata).length,
          totalTags: (appData.tags || []).length,
          totalPinColumns: (appData.pinColumns || []).length, // 🎯 PIN STATISTIK
          totalNoteLinks: (appData.noteLinks || []).length,
          totalIntegrations: Object.keys(integrations).filter(key => integrations[key]?.enabled).length,
          // 🕒 Zeitbudget-Metadaten
          hasPersonalCapacity: !!appData.personalCapacity,
          projectsWithTimebudgets: (appData.columns || []).filter(col => col.type === 'project' && col.timebudget).length,
          deviceInfo: navigator.userAgent,
          syncMethod: 'nextcloud'
        }
      };

      const dataJson = JSON.stringify(exportData, null, 2);
      const dataSize = new Blob([dataJson]).size;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`,
          'Content-Type': 'application/json'
        },
        body: dataJson
      });

      if (response.ok || response.status === 201) {
        return {
          success: true,
          message: `📤 Daten erfolgreich synchronisiert (${this.formatFileSize(dataSize)})`,
          details: `Datei: ${filename}`,
          timestamp: new Date().toISOString(),
          dataSize
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      return {
        success: false,
        message: `❌ Synchronisation fehlgeschlagen`,
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== AUTO SYNC =====

  private setupAutoSync(): void {
    // Clear existing timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Setup new timer if enabled
    if (this.config?.enabled && this.config?.autoSync && this.isConfigured()) {
      const intervalMs = this.config.syncInterval * 60 * 1000;
      this.syncTimer = setInterval(() => {
        // Get current app data from global state if available
        if (typeof window !== 'undefined' && (window as any).getAppDataForSync) {
          const appData = (window as any).getAppDataForSync();
          this.performSync(appData);
        }
      }, intervalMs);
    }
  }

  // ===== SYNC LOG =====

  private loadSyncLog(): void {
    try {
      const stored = localStorage.getItem('nextcloud_sync_log');
      if (stored) {
        this.syncLog = JSON.parse(stored);
        // Keep only last 50 entries
        this.syncLog = this.syncLog.slice(-50);
      }
    } catch (error) {
      this.syncLog = [];
    }
  }

  private saveSyncLog(): void {
    try {
      localStorage.setItem('nextcloud_sync_log', JSON.stringify(this.syncLog));
    } catch (error) {
      console.error('Failed to save sync log:', error);
    }
  }

  private addLogEntry(type: SyncLogEntry['type'], message: string, details?: string): void {
    const entry: SyncLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    this.syncLog.push(entry);
    
    // Keep only last 50 entries
    this.syncLog = this.syncLog.slice(-50);
    
    this.saveSyncLog();
  }

  getSyncLog(): SyncLogEntry[] {
    return [...this.syncLog];
  }

  clearSyncLog(): void {
    this.syncLog = [];
    this.saveSyncLog();
  }

  // ===== STATUS MANAGEMENT =====

  getStatus(): NextcloudStatus {
    return {
      connected: this.isConfigured(),
      syncing: this.isSyncing,
      lastSync: this.config?.lastSync || null,
      nextSync: this.getNextSyncTime(),
      message: this.getStatusMessage(),
      totalSyncs: this.config?.totalSyncs || 0
    };
  }

  private getStatusMessage(): string {
    if (!this.config?.enabled) return 'Deaktiviert';
    if (!this.isConfigured()) return 'Nicht konfiguriert';
    if (this.isSyncing) return 'Synchronisierung läuft...';
    if (this.config.autoSync) return 'Automatische Synchronisation aktiv';
    return 'Bereit für manuelle Synchronisation';
  }

  private getNextSyncTime(): string | null {
    if (!this.config?.enabled || !this.config?.autoSync || !this.config?.lastSync) return null;
    
    const lastSync = new Date(this.config.lastSync);
    const nextSync = new Date(lastSync.getTime() + (this.config.syncInterval * 60 * 1000));
    return nextSync.toISOString();
  }

  onStatusChange(callback: (status: NextcloudStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  // ===== UTILITY METHODS =====

  private cleanServerUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===== CLEANUP =====

  async disable(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.config) {
      this.config.enabled = false;
      await this.saveConfig();
    }
    
    this.notifyStatusChange();
  }

  async destroy(): Promise<void> {
    await this.disable();
    this.statusCallbacks = [];
  }
}

// ===== GLOBAL INSTANCE =====

export const nextcloudManager = NextcloudManager.getInstance();

// ===== GLOBAL HELPER FOR AUTO-SYNC =====

if (typeof window !== 'undefined') {
  (window as any).getAppDataForSync = () => {
    // This will be called by auto-sync to get current app data
    // Will be implemented when integrating with app context
    return {};
  };
} 