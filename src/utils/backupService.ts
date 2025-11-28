/**
 * BackupService - Zentraler Backup-Dienst für TaskFuchs
 * 
 * Hauptfunktionen:
 * - Persistierung des Ordner-Handles in IndexedDB
 * - Automatische Wiederherstellung des Handles nach Browser-Neustart
 * - Zuverlässige Auto-Backup Funktion
 * - Einheitlicher Status für alle UI-Komponenten
 */

import { format } from 'date-fns';
import { exportToJSON } from './importExport';

// IndexedDB Name und Store
const DB_NAME = 'taskfuchs-backup-db';
const STORE_NAME = 'backup-handles';
const HANDLE_KEY = 'backup-directory-handle';

export interface BackupStatus {
  isConfigured: boolean;
  directoryName: string | null;
  lastBackup: string | null;
  isBackupRunning: boolean;
  lastError: string | null;
  supportsFileSystemAPI: boolean;
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  timestamp?: string;
  error?: string;
}

class BackupService {
  private handle: FileSystemDirectoryHandle | null = null;
  private isRunning = false;
  private lastError: string | null = null;
  private listeners: Set<() => void> = new Set();
  private autoBackupIntervalId: number | null = null;

  constructor() {
    // Check browser support
    if (!this.supportsFileSystemAPI()) {
      console.warn('BackupService: File System Access API not supported');
    }
  }

  /**
   * Check if browser supports File System Access API
   */
  supportsFileSystemAPI(): boolean {
    return typeof window !== 'undefined' && 
           'showDirectoryPicker' in window &&
           typeof (window as any).showDirectoryPicker === 'function';
  }

  /**
   * Initialize the service - restore handle from IndexedDB
   */
  async initialize(): Promise<boolean> {
    if (!this.supportsFileSystemAPI()) return false;
    
    try {
      const storedHandle = await this.loadHandleFromDB();
      if (storedHandle) {
        // Verify the handle is still valid and has permission
        const permission = await this.verifyPermission(storedHandle);
        if (permission) {
          this.handle = storedHandle;
          (window as any).__taskfuchs_backup_dir__ = storedHandle;
          this.notifyListeners();
          console.log('BackupService: Restored directory handle:', storedHandle.name);
          return true;
        } else {
          console.log('BackupService: Stored handle lost permission, needs re-authorization');
        }
      }
    } catch (e) {
      console.warn('BackupService: Failed to restore handle:', e);
    }
    return false;
  }

  /**
   * Open IndexedDB
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Save handle to IndexedDB
   */
  private async saveHandleToDB(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, HANDLE_KEY);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Load handle from IndexedDB
   */
  private async loadHandleFromDB(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(HANDLE_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
        
        transaction.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  /**
   * Clear handle from IndexedDB
   */
  private async clearHandleFromDB(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(HANDLE_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        
        transaction.oncomplete = () => db.close();
      });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Verify if we still have permission to write to the directory
   */
  private async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      // @ts-ignore - experimental API
      const permission = await handle.queryPermission?.({ mode: 'readwrite' });
      if (permission === 'granted') {
        return true;
      }
      
      // Try to request permission (might show prompt)
      // @ts-ignore
      const newPermission = await handle.requestPermission?.({ mode: 'readwrite' });
      return newPermission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Let user pick a directory for backups
   */
  async pickDirectory(): Promise<boolean> {
    if (!this.supportsFileSystemAPI()) {
      this.lastError = 'Browser unterstützt keine lokalen Backups';
      this.notifyListeners();
      return false;
    }

    try {
      // @ts-ignore - experimental API
      const handle = await window.showDirectoryPicker({
        id: 'taskfuchs-backup',
        mode: 'readwrite',
        startIn: 'documents'
      });

      if (!handle) {
        return false;
      }

      // Request write permission
      // @ts-ignore
      const permission = await handle.requestPermission?.({ mode: 'readwrite' });
      if (permission !== 'granted' && permission !== undefined) {
        this.lastError = 'Keine Schreibberechtigung für den Ordner';
        this.notifyListeners();
        return false;
      }

      // Save handle
      this.handle = handle;
      (window as any).__taskfuchs_backup_dir__ = handle;
      
      // Persist to IndexedDB
      await this.saveHandleToDB(handle);
      
      this.lastError = null;
      this.notifyListeners();
      
      // Dispatch event for legacy components
      window.dispatchEvent(new CustomEvent('backup-dir-selected', { 
        detail: { name: handle.name } 
      }));
      
      console.log('BackupService: Directory selected:', handle.name);
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // User cancelled - not an error
        return false;
      }
      this.lastError = e.message || 'Ordnerauswahl fehlgeschlagen';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Create a backup of the given data
   */
  async createBackup(data: any): Promise<BackupResult> {
    if (!this.handle) {
      return {
        success: false,
        error: 'Kein Backup-Ordner konfiguriert'
      };
    }

    // Verify we still have permission
    const hasPermission = await this.verifyPermission(this.handle);
    if (!hasPermission) {
      this.handle = null;
      (window as any).__taskfuchs_backup_dir__ = undefined;
      this.notifyListeners();
      return {
        success: false,
        error: 'Zugriffsberechtigung verloren. Bitte Ordner erneut auswählen.'
      };
    }

    this.isRunning = true;
    this.notifyListeners();

    try {
      const json = exportToJSON(data);
      const timestamp = new Date();
      const filename = `TaskFuchs_${format(timestamp, 'yyyy-MM-dd_HH-mm-ss')}.json`;
      
      // @ts-ignore
      const fileHandle = await this.handle.getFileHandle(filename, { create: true });
      // @ts-ignore
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();

      this.isRunning = false;
      this.lastError = null;
      this.notifyListeners();

      console.log('BackupService: Backup created:', filename);

      return {
        success: true,
        filename,
        timestamp: timestamp.toISOString()
      };
    } catch (e: any) {
      this.isRunning = false;
      this.lastError = e.message || 'Backup fehlgeschlagen';
      this.notifyListeners();

      return {
        success: false,
        error: this.lastError
      };
    }
  }

  /**
   * Clear the backup configuration
   */
  async clearConfiguration(): Promise<void> {
    this.handle = null;
    (window as any).__taskfuchs_backup_dir__ = undefined;
    await this.clearHandleFromDB();
    this.lastError = null;
    this.notifyListeners();
    console.log('BackupService: Configuration cleared');
  }

  /**
   * Get current backup status
   */
  getStatus(lastBackupTime?: string): BackupStatus {
    return {
      isConfigured: !!this.handle,
      directoryName: this.handle?.name || null,
      lastBackup: lastBackupTime || null,
      isBackupRunning: this.isRunning,
      lastError: this.lastError,
      supportsFileSystemAPI: this.supportsFileSystemAPI()
    };
  }

  /**
   * Get the directory name (or null if not configured)
   */
  getDirectoryName(): string | null {
    return this.handle?.name || null;
  }

  /**
   * Check if backup is configured
   */
  isConfigured(): boolean {
    return !!this.handle;
  }

  /**
   * Start auto-backup with given interval
   */
  startAutoBackup(intervalMinutes: number, getDataFn: () => any, onSuccess?: (result: BackupResult) => void): void {
    this.stopAutoBackup();
    
    if (!this.handle || intervalMinutes < 1) return;

    const runBackup = async () => {
      if (!this.handle) {
        this.stopAutoBackup();
        return;
      }
      
      const data = getDataFn();
      const result = await this.createBackup(data);
      
      if (result.success && onSuccess) {
        onSuccess(result);
      }
    };

    // Schedule recurring backups (no immediate backup - wait for first interval)
    this.autoBackupIntervalId = window.setInterval(runBackup, intervalMinutes * 60 * 1000);
    
    console.log('BackupService: Auto-backup started, interval:', intervalMinutes, 'minutes. Next backup in', intervalMinutes, 'minutes.');
  }

  /**
   * Stop auto-backup
   */
  stopAutoBackup(): void {
    if (this.autoBackupIntervalId !== null) {
      clearInterval(this.autoBackupIntervalId);
      this.autoBackupIntervalId = null;
      console.log('BackupService: Auto-backup stopped');
    }
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const backupService = new BackupService();

// Initialize on module load (async)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      backupService.initialize();
    });
  } else {
    backupService.initialize();
  }
}

