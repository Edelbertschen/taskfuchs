import { format, startOfDay, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { ExportData, exportToJSON, validateImportData } from './importExport';
import type { Task, Note, Tag, KanbanBoard, UserPreferences, Column } from '../types';

// ===== CONFIGURATION MANAGER =====

export class NextcloudConfigManager {
  private static readonly STORAGE_PREFIX = 'nextcloud_';
  private static sessionPassword: string | null = null;

  static saveConfig(config: Partial<NextcloudConfig>): void {
    if (config.serverUrl !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}serverUrl`, config.serverUrl);
    }
    if (config.username !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}username`, config.username);
    }
    if (config.syncFolder !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}syncFolder`, config.syncFolder);
    }
    if (config.enabled !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}enabled`, config.enabled.toString());
    }
    if (config.autoSync !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}autoSync`, config.autoSync.toString());
    }
    if (config.syncInterval !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}syncInterval`, config.syncInterval.toString());
    }
    if (config.keepVersions !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}keepVersions`, config.keepVersions.toString());
    }
    if (config.conflictResolution !== undefined) {
      localStorage.setItem(`${this.STORAGE_PREFIX}conflictResolution`, config.conflictResolution);
    }
  }

  static loadConfig(): NextcloudConfig {
    return {
      serverUrl: localStorage.getItem(`${this.STORAGE_PREFIX}serverUrl`) || '',
      username: localStorage.getItem(`${this.STORAGE_PREFIX}username`) || '',
      password: this.sessionPassword || '',
      syncFolder: localStorage.getItem(`${this.STORAGE_PREFIX}syncFolder`) || '/TaskFuchs',
      enabled: localStorage.getItem(`${this.STORAGE_PREFIX}enabled`) === 'true',
      autoSync: localStorage.getItem(`${this.STORAGE_PREFIX}autoSync`) === 'true',
      syncInterval: parseInt(localStorage.getItem(`${this.STORAGE_PREFIX}syncInterval`) || '60'),
      keepVersions: parseInt(localStorage.getItem(`${this.STORAGE_PREFIX}keepVersions`) || '1'),
      conflictResolution: (localStorage.getItem(`${this.STORAGE_PREFIX}conflictResolution`) as any) || 'manual'
    };
  }

  static setSessionPassword(password: string): void {
    this.sessionPassword = password;
    // Speichere Passwort für diese Session (wird bei Reload verloren)
    sessionStorage.setItem(`${this.STORAGE_PREFIX}session_password`, password);
  }

  static getSessionPassword(): string | null {
    if (this.sessionPassword) return this.sessionPassword;
    
    // Versuche aus sessionStorage zu laden
    const sessionPwd = sessionStorage.getItem(`${this.STORAGE_PREFIX}session_password`);
    if (sessionPwd) {
      this.sessionPassword = sessionPwd;
      return sessionPwd;
    }
    
    return null;
  }

  static clearSession(): void {
    this.sessionPassword = null;
    sessionStorage.removeItem(`${this.STORAGE_PREFIX}session_password`);
  }

  static isConfigComplete(): boolean {
    // Migration ausführen bevor Config geprüft wird
    this.migrateOldKeys();
    
    const config = this.loadConfig();
    const isNewSystemComplete = !!(config.serverUrl && config.username && config.enabled);
    
    // Prüfe auch alte localStorage Keys als Fallback
    const oldServerUrl = localStorage.getItem('nextcloudUrl');
    const oldUsername = localStorage.getItem('nextcloudUsername');
    const oldSyncEnabled = localStorage.getItem('syncEnabled') === 'true';
    const oldConnectionStatus = localStorage.getItem('connectionStatus') === 'connected';
    
    const isOldSystemComplete = !!(oldServerUrl && oldUsername && (oldSyncEnabled || oldConnectionStatus));
    
    return isNewSystemComplete || isOldSystemComplete;
  }

  static hasValidSession(): boolean {
    return !!(this.isConfigComplete() && this.getSessionPassword());
  }

  static migrateOldKeys(): void {
    // Migriere alte localStorage-Keys zur neuen Struktur
    const oldKeys = [
      'nextcloudUrl', 'nextcloudUsername', 'nextcloudFolder', 
      'syncEnabled', 'autoSync', 'syncInterval'
    ];
    
    const newKeys = [
      'serverUrl', 'username', 'syncFolder', 
      'enabled', 'autoSync', 'syncInterval'
    ];

    let migrated = false;
    oldKeys.forEach((oldKey, index) => {
      const value = localStorage.getItem(oldKey);
      if (value && !localStorage.getItem(`${this.STORAGE_PREFIX}${newKeys[index]}`)) {
        localStorage.setItem(`${this.STORAGE_PREFIX}${newKeys[index]}`, value);
        migrated = true;
        console.log(`[NextcloudConfigManager] Migrated ${oldKey} -> ${this.STORAGE_PREFIX}${newKeys[index]}: ${value}`);
      }
    });

    // Prüfe auch den connectionStatus
    const connectionStatus = localStorage.getItem('connectionStatus');
    if (connectionStatus === 'connected' && migrated) {
      // Wenn die Verbindung als "connected" markiert war, aktiviere den neuen Sync
      localStorage.setItem(`${this.STORAGE_PREFIX}enabled`, 'true');
      console.log('[NextcloudConfigManager] Migrated connectionStatus=connected -> enabled=true');
    }

    if (migrated) {
      console.log('[NextcloudConfigManager] Migration completed, removing old keys');
      // Alte Keys nur entfernen wenn erfolgreich migriert
      oldKeys.forEach(oldKey => localStorage.removeItem(oldKey));
      localStorage.removeItem('connectionStatus'); // Auch den alten connectionStatus entfernen
    }
  }
}

// ===== TYPES =====

export interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  syncFolder: string; // z.B. '/TaskFuchs'
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // Minuten
  keepVersions: number; // Anzahl Versionen pro Tag (Standard: 1)
  conflictResolution: 'local' | 'remote' | 'manual';
}

export interface NextcloudVersion {
  id: string;
  date: string; // ISO Date
  filename: string;
  size: number;
  metadata: {
    totalTasks: number;
    totalNotes: number;
    totalTags: number;
    appVersion: string;
    deviceName: string;
  };
  isAutomatic: boolean; // Automatisch vs. manuell erstellt
}

export interface NextcloudSyncResult {
  success: boolean;
  uploaded?: boolean;
  downloaded?: boolean;
  versionCreated?: NextcloudVersion;
  errors: string[];
  warnings: string[];
  stats: {
    uploadedSize?: number;
    downloadedSize?: number;
    totalVersions: number;
    lastSync: string;
  };
}

export interface NextcloudFileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  isVersion: boolean;
  versionInfo?: {
    date: string;
    isToday: boolean;
    isAutomatic: boolean;
  };
}

// ===== NEXTCLOUD SYNC SERVICE =====

export class NextcloudSyncService {
  private config: NextcloudConfig;
  private syncInProgress = false;
  
  constructor(config: NextcloudConfig) {
    this.config = config;
  }

  // ===== CORE SYNC METHODS =====

  /**
   * Vollständige Synchronisation mit Versionierung
   */
  async syncData(appData: {
    tasks: Task[];
    columns: Column[];
    notes: Note[];
    tags: Tag[];
    boards: KanbanBoard[];
    preferences: UserPreferences;
    [key: string]: any;
  }, options: {
    onProgress?: (progress: number, message: string) => void;
    forceUpload?: boolean;
    createVersion?: boolean;
  } = {}): Promise<NextcloudSyncResult> {
    
    if (this.syncInProgress) {
      throw new Error('Synchronisation bereits aktiv');
    }

    this.syncInProgress = true;
    const result: NextcloudSyncResult = {
      success: false,
      errors: [],
      warnings: [],
      stats: {
        totalVersions: 0,
        lastSync: new Date().toISOString()
      }
    };

    try {
      options.onProgress?.(10, 'Verbindung zu Nextcloud wird aufgebaut...');
      
      // 1. Verbindung testen
      await this.testConnection();
      
      options.onProgress?.(20, 'Prüfe bestehende Dateien...');
      
      // 2. Bestehende Dateien und Versionen auflisten
      const remoteFiles = await this.listRemoteFiles();
      const versions = this.parseVersionFiles(remoteFiles);
      result.stats.totalVersions = versions.length;

      options.onProgress?.(30, 'Erstelle Export-Daten...');
      
      // 3. App-Daten für Export vorbereiten
      const exportData = this.prepareExportData(appData);
      
      options.onProgress?.(50, 'Prüfe ob Upload erforderlich ist...');
      
      // 4. Prüfen ob Upload nötig ist (bei automatischer Sync)
      const shouldUpload = options.forceUpload || 
                          options.createVersion || 
                          await this.shouldCreateNewVersion(versions, exportData);
      
      if (shouldUpload) {
        options.onProgress?.(70, 'Lade Daten zu Nextcloud hoch...');
        
        // 5. Upload mit Versionierung
        const version = await this.uploadWithVersioning(exportData);
        result.versionCreated = version;
        result.uploaded = true;
        result.stats.uploadedSize = JSON.stringify(exportData).length;
      } else {
        result.warnings.push('Keine neuen Änderungen - Upload übersprungen');
      }

      options.onProgress?.(90, 'Bereinige alte Versionen...');
      
      // 6. Alte Versionen bereinigen (behalte nur die neueste pro Tag)
      await this.cleanupOldVersions();
      
      options.onProgress?.(100, 'Synchronisation abgeschlossen');
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Daten von Nextcloud herunterladen
   */
  async downloadData(versionId?: string): Promise<ExportData> {
    await this.testConnection();
    
    const filename = versionId ? 
      await this.getVersionFilename(versionId) : 
      await this.getLatestVersionFilename();
    
    const fileContent = await this.downloadFile(filename);
    
    try {
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error('Heruntergeladene Datei ist kein gültiges JSON');
    }
  }

  /**
   * Verfügbare Versionen auflisten
   */
  async getAvailableVersions(): Promise<NextcloudVersion[]> {
    await this.testConnection();
    const remoteFiles = await this.listRemoteFiles();
    return this.parseVersionFiles(remoteFiles);
  }

  /**
   * Spezifische Version wiederherstellen
   */
  async restoreVersion(versionId: string): Promise<ExportData> {
    const data = await this.downloadData(versionId);
    
    // Validierung der wiederhergestellten Daten
    const validation = validateImportData(data);
    if (!validation.isComplete) {
      throw new Error(`Unvollständige Daten in Version: ${validation.warnings.join(', ')}`);
    }
    
    return data;
  }

  // ===== VERSION MANAGEMENT =====

  private prepareExportData(appData: any): ExportData {
    return {
      // Hauptdaten
      tasks: appData.tasks || [],
      columns: appData.columns || [],
      notes: appData.notes || [],
      tags: appData.tags || [],
      boards: appData.boards || [],
      preferences: appData.preferences || {},
      
      // Zusätzliche Daten
      archivedTasks: appData.archivedTasks || [],
      noteLinks: appData.noteLinks || [],
      viewState: appData.viewState || {},
      projectKanbanColumns: appData.projectKanbanColumns || [],
      projectKanbanState: appData.projectKanbanState || {},
      
      // Metadaten
      exportDate: new Date().toISOString(),
      version: '2.0',
      metadata: {
        totalTasks: (appData.tasks || []).length,
        totalNotes: (appData.notes || []).length,
        totalTags: (appData.tags || []).length,
        totalBoards: (appData.boards || []).length,
        dataSize: 0, // Wird später berechnet
        exportTime: Date.now(),
        totalArchivedTasks: (appData.archivedTasks || []).length,
        totalColumns: (appData.columns || []).length,
        totalNoteLinks: (appData.noteLinks || []).length,
      }
    };
  }

  private async shouldCreateNewVersion(existingVersions: NextcloudVersion[], newData: ExportData): Promise<boolean> {
    // Check if there's a baseline file selected
    const baselineFile = localStorage.getItem('nextcloud_baselineFile');
    if (baselineFile) {
      // If a baseline file is selected, always create a new version on first sync
      const lastSync = localStorage.getItem('nextcloud_lastSync');
      if (!lastSync || lastSync === 'baseline') {
        // Mark that we've now synced from the baseline
        localStorage.setItem('nextcloud_lastSync', new Date().toISOString());
        return true;
      }
    }

    // Prüfe ob heute bereits eine Version existiert
    const today = startOfDay(new Date());
    const todayVersions = existingVersions.filter(v => {
      const versionDate = startOfDay(new Date(v.date));
      return versionDate.getTime() === today.getTime();
    });

    // Wenn keine Version für heute existiert, erstelle eine
    if (todayVersions.length === 0) {
      return true;
    }

    // Wenn manuelle Version gewünscht oder wesentliche Änderungen
    const latestVersion = todayVersions[0];
    const hasSignificantChanges = await this.hasSignificantChanges(latestVersion, newData);
    
    return hasSignificantChanges;
  }

  private async hasSignificantChanges(version: NextcloudVersion, newData: ExportData): Promise<boolean> {
    // Vergleiche Metadaten für schnelle Überprüfung
    const newTaskCount = (newData.tasks || []).length;
    const newNoteCount = (newData.notes || []).length;
    
    const taskDiff = Math.abs(newTaskCount - version.metadata.totalTasks);
    const noteDiff = Math.abs(newNoteCount - version.metadata.totalNotes);
    
    // Signifikante Änderung: >5% Änderung oder >10 neue Items
    const significantChange = taskDiff > 10 || noteDiff > 5 || 
                             taskDiff > version.metadata.totalTasks * 0.05 ||
                             noteDiff > version.metadata.totalNotes * 0.05;
    
    return significantChange;
  }

  private async uploadWithVersioning(data: ExportData): Promise<NextcloudVersion> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const dateLabel = format(new Date(), 'dd. MMMM yyyy', { locale: de });
    const deviceName = this.getDeviceName();
    
    // Filename: TaskFuchs_2024-01-15_14-30-00_auto.json
    const isAutomatic = true; // Erstmal alle als automatisch markieren
    const filename = `TaskFuchs_${timestamp}_${isAutomatic ? 'auto' : 'manual'}.json`;
    
    // JSON vorbereiten
    const jsonContent = exportToJSON(data);
    data.metadata!.dataSize = jsonContent.length;
    
    // Upload
    await this.uploadFile(filename, jsonContent);
    
    // Version-Objekt erstellen
    const version: NextcloudVersion = {
      id: `version_${timestamp}`,
      date: new Date().toISOString(),
      filename: filename,
      size: jsonContent.length,
      metadata: {
        totalTasks: data.metadata!.totalTasks,
        totalNotes: data.metadata!.totalNotes,
        totalTags: data.metadata!.totalTags,
        appVersion: data.version,
        deviceName: deviceName
      },
      isAutomatic: isAutomatic
    };
    
    return version;
  }

  private async cleanupOldVersions(): Promise<void> {
    const versions = await this.getAvailableVersions();
    
    // Gruppiere Versionen nach Tag
    const versionsByDay = new Map<string, NextcloudVersion[]>();
    
    versions.forEach(version => {
      const dayKey = format(startOfDay(new Date(version.date)), 'yyyy-MM-dd');
      if (!versionsByDay.has(dayKey)) {
        versionsByDay.set(dayKey, []);
      }
      versionsByDay.get(dayKey)!.push(version);
    });
    
    // Für jeden Tag: behalte nur die neueste Version
    const filesToDelete: string[] = [];
    
    versionsByDay.forEach((dayVersions, day) => {
      if (dayVersions.length > this.config.keepVersions) {
        // Sortiere nach Datum (neueste zuerst)
        dayVersions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Markiere alte Versionen zum Löschen
        for (let i = this.config.keepVersions; i < dayVersions.length; i++) {
          filesToDelete.push(dayVersions[i].filename);
        }
      }
    });
    
    // Lösche alte Dateien
    for (const filename of filesToDelete) {
      try {
        await this.deleteFile(filename);
      } catch (error) {
        console.warn(`Konnte alte Version nicht löschen: ${filename}`, error);
      }
    }
  }

  // ===== NEXTCLOUD API METHODS =====

  private async testConnection(): Promise<void> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}`;
    
    try {
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Depth': '1',
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:resourcetype/>
            </D:prop>
          </D:propfind>`
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Ordner existiert nicht - erstelle ihn
          await this.createSyncFolder();
        } else if (response.status === 401) {
          throw new Error('Benutzername oder Passwort ungültig');
        } else {
          throw new Error(`Verbindung fehlgeschlagen: ${response.statusText}`);
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Nextcloud-Server nicht erreichbar. Prüfen Sie die URL.');
      }
      throw error;
    }
  }

  private async createSyncFolder(): Promise<void> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}`;
    
    const response = await fetch(url, {
      method: 'MKCOL',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok && response.status !== 405) { // 405 = bereits vorhanden
      throw new Error(`Sync-Ordner konnte nicht erstellt werden: ${response.statusText}`);
    }
  }

  async listRemoteFiles(): Promise<NextcloudFileInfo[]> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}`;
    
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Depth': '1',
        'Content-Type': 'application/xml'
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <D:propfind xmlns:D="DAV:">
          <D:prop>
            <D:displayname/>
            <D:getcontentlength/>
            <D:getlastmodified/>
            <D:resourcetype/>
          </D:prop>
        </D:propfind>`
    });

    if (!response.ok) {
      throw new Error(`Dateien konnten nicht aufgelistet werden: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return this.parseWebDAVResponse(xmlText);
  }

  private parseWebDAVResponse(xmlText: string): NextcloudFileInfo[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const responses = doc.querySelectorAll('d\\:response, response');
    
    const files: NextcloudFileInfo[] = [];
    
    responses.forEach(response => {
      const href = response.querySelector('d\\:href, href')?.textContent || '';
      const name = response.querySelector('d\\:displayname, displayname')?.textContent || '';
      const size = parseInt(response.querySelector('d\\:getcontentlength, getcontentlength')?.textContent || '0');
      const lastModified = response.querySelector('d\\:getlastmodified, getlastmodified')?.textContent || '';
      
      // Nur JSON-Dateien mit TaskFuchs-Prefix
      if (name && name.startsWith('TaskFuchs_') && name.endsWith('.json')) {
        const isVersion = this.isVersionFile(name);
        files.push({
          name,
          path: href,
          size,
          lastModified,
          isVersion,
          versionInfo: isVersion ? this.parseVersionInfo(name) : undefined
        });
      }
    });
    
    return files;
  }

  private isVersionFile(filename: string): boolean {
    // TaskFuchs_2024-01-15_14-30-00_auto.json
    const versionPattern = /^TaskFuchs_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_(auto|manual)\.json$/;
    return versionPattern.test(filename);
  }

  private parseVersionInfo(filename: string): { date: string; isToday: boolean; isAutomatic: boolean } {
    const match = filename.match(/TaskFuchs_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_(auto|manual)\.json/);
    if (!match) {
      throw new Error(`Ungültiger Dateiname: ${filename}`);
    }
    
    const [, dateStr, timeStr, type] = match;
    const date = new Date(`${dateStr}T${timeStr.replace(/-/g, ':')}:00`);
    const isToday = differenceInDays(new Date(), date) === 0;
    
    return {
      date: date.toISOString(),
      isToday,
      isAutomatic: type === 'auto'
    };
  }

  private parseVersionFiles(files: NextcloudFileInfo[]): NextcloudVersion[] {
    return files
      .filter(file => file.isVersion && file.versionInfo)
      .map(file => {
        const versionInfo = file.versionInfo!;
        return {
          id: file.name.replace('.json', ''),
          date: versionInfo.date,
          filename: file.name,
          size: file.size,
          metadata: {
            totalTasks: 0, // Wird bei Bedarf geladen
            totalNotes: 0,
            totalTags: 0,
            appVersion: '2.0',
            deviceName: 'unknown'
          },
          isAutomatic: versionInfo.isAutomatic
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Neueste zuerst
  }

  private async uploadFile(filename: string, content: string): Promise<void> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}/${filename}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: content
    });

    if (!response.ok) {
      throw new Error(`Upload fehlgeschlagen: ${response.statusText}`);
    }
  }

  async downloadFile(filename: string): Promise<string> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}/${filename}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen: ${response.statusText}`);
    }

    return await response.text();
  }

  private async deleteFile(filename: string): Promise<void> {
    const url = `${this.config.serverUrl}/remote.php/dav/files/${this.config.username}${this.config.syncFolder}/${filename}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Löschen fehlgeschlagen: ${response.statusText}`);
    }
  }

  private async getLatestVersionFilename(): Promise<string> {
    const versions = await this.getAvailableVersions();
    if (versions.length === 0) {
      throw new Error('Keine Versionen auf Nextcloud gefunden');
    }
    return versions[0].filename;
  }

  private async getVersionFilename(versionId: string): Promise<string> {
    const versions = await this.getAvailableVersions();
    const version = versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version ${versionId} nicht gefunden`);
    }
    return version.filename;
  }

  // ===== HELPER METHODS =====

  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return `Basic ${credentials}`;
  }

  private getDeviceName(): string {
    if (typeof window !== 'undefined') {
      return `${navigator.platform} - ${navigator.userAgent.includes('Electron') ? 'Desktop' : 'Web'}`;
    }
    return 'Desktop App';
  }

  // ===== PUBLIC UTILITY METHODS =====

  /**
   * Manuelle Version erstellen
   */
  async createManualVersion(appData: any, description?: string): Promise<NextcloudVersion> {
    const exportData = this.prepareExportData(appData);
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `TaskFuchs_${timestamp}_manual.json`;
    
    const jsonContent = exportToJSON(exportData);
    await this.uploadFile(filename, jsonContent);
    
    return {
      id: `version_${timestamp}`,
      date: new Date().toISOString(),
      filename: filename,
      size: jsonContent.length,
      metadata: {
        totalTasks: exportData.metadata!.totalTasks,
        totalNotes: exportData.metadata!.totalNotes,
        totalTags: exportData.metadata!.totalTags,
        appVersion: exportData.version,
        deviceName: this.getDeviceName()
      },
      isAutomatic: false
    };
  }

  /**
   * Konfiguration aktualisieren
   */
  updateConfig(newConfig: Partial<NextcloudConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Sync-Status prüfen
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

// ===== SINGLETON INSTANCE =====

let nextcloudServiceInstance: NextcloudSyncService | null = null;

export function getNextcloudService(config?: NextcloudConfig): NextcloudSyncService {
  // Automatische Migration alter localStorage-Keys
  NextcloudConfigManager.migrateOldKeys();
  
  const finalConfig = config || NextcloudConfigManager.loadConfig();
  
  // Passwort aus Session holen wenn nicht vorhanden
  if (!finalConfig.password) {
    finalConfig.password = NextcloudConfigManager.getSessionPassword() || '';
  }
  
  if (!nextcloudServiceInstance) {
    nextcloudServiceInstance = new NextcloudSyncService(finalConfig);
  } else {
    nextcloudServiceInstance.updateConfig(finalConfig);
  }
  return nextcloudServiceInstance;
}

/**
 * Download-Helper für JSON-Dateien
 */
export function downloadVersionAsFile(version: NextcloudVersion, data: ExportData): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = version.filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function resetNextcloudService(): void {
  nextcloudServiceInstance = null;
} 