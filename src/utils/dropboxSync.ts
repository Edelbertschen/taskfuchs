/**
 * Dropbox Sync Engine - Following Super Productivity principles
 * 
 * Key principles:
 * 1. Local-first: Local JSON is the single source of truth
 * 2. Uses existing import/export JSON format unchanged
 * 3. Revision-based conflict detection
 * 4. Optional E2EE encryption
 * 5. Hash-based change detection
 */

import { DropboxClient, getDropboxClient, resetDropboxClient, DropboxFileMetadata } from './dropboxClient';
import { exportToJSON, ExportData, importFromJSON } from './importExport';
import { encryptJson, decryptJson, isEncryptedBlob, EncryptedBlob } from './e2ee';

// Sync metadata stored separately from JSON data
export interface DropboxSyncMetadata {
  lastSyncTimestamp: number;
  lastLocalHash: string;
  lastRemoteRev: string | null;
  lastSyncStatus: 'success' | 'error' | 'conflict';
  lastSyncError?: string;
}

export interface SyncResult {
  status: 'success' | 'no-change' | 'pulled' | 'pushed' | 'conflict' | 'error';
  message: string;
  timestamp: number;
  localChanges?: boolean;
  remoteChanges?: boolean;
}

export interface SyncOptions {
  folderPathOverride?: string;
  passphraseOverride?: string;
  forcePush?: boolean;
  forcePull?: boolean;
}

const SYNC_FILENAME = 'taskfuchs-data.json';
const METADATA_KEY = 'taskfuchs_dropbox_sync_metadata';

// ==================== HASH UTILITIES ====================

/**
 * Generate a hash of the JSON data for change detection
 * Using simple string hash for performance
 */
function hashJson(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Generate a more secure hash using crypto API
 */
async function secureHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ==================== METADATA MANAGEMENT ====================

function loadSyncMetadata(): DropboxSyncMetadata | null {
  try {
    const stored = localStorage.getItem(METADATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load sync metadata:', e);
  }
  return null;
}

function saveSyncMetadata(metadata: DropboxSyncMetadata): void {
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

function clearSyncMetadata(): void {
  localStorage.removeItem(METADATA_KEY);
}

// ==================== DATA PREPARATION ====================

/**
 * Prepare local data for sync using existing export logic
 */
function prepareLocalData(state: any): ExportData {
  return {
    tasks: state.tasks || [],
    archivedTasks: state.archivedTasks || [],
    columns: state.columns || [],
    tags: state.tags || [],
    boards: state.boards || [],
    pinColumns: state.pinColumns || [],
    preferences: state.preferences || {},
    viewState: state.viewState || {},
    projectKanbanColumns: state.viewState?.projectKanban?.columns || [],
    projectKanbanState: state.viewState?.projectKanban || {},
    events: state.events || [],
    calendarSources: state.calendarSources || [],
    exportDate: new Date().toISOString(),
    version: '3.0',
  };
}

/**
 * Apply remote data to local state using existing import logic
 */
function applyRemoteData(data: ExportData, dispatch: any): void {
  // Validate the data first
  if (!data || !Array.isArray(data.tasks)) {
    throw new Error('Invalid data format');
  }

  // Import tasks
  if (data.tasks) {
    dispatch({ type: 'SET_TASKS', payload: data.tasks });
  }
  
  // Import archived tasks
  if (data.archivedTasks) {
    dispatch({ type: 'SET_ARCHIVED_TASKS', payload: data.archivedTasks });
  }
  
  // Import columns
  if (data.columns) {
    dispatch({ type: 'SET_COLUMNS', payload: data.columns });
  }
  
  // Import tags
  if (data.tags) {
    dispatch({ type: 'SET_TAGS', payload: data.tags });
  }
  
  // Import pin columns
  if (data.pinColumns) {
    dispatch({ type: 'SET_PIN_COLUMNS', payload: data.pinColumns });
  }
  
  // Import boards
  if (data.boards) {
    dispatch({ type: 'SET_BOARDS', payload: data.boards });
  }
  
  // Import preferences (merge, don't overwrite completely)
  if (data.preferences) {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: data.preferences });
  }
  
  // Import view state if needed
  if (data.viewState) {
    dispatch({ type: 'SET_VIEW_STATE', payload: data.viewState });
  }
}

// ==================== ENCRYPTION HELPERS ====================

async function encryptData(data: string, passphrase: string): Promise<string> {
  const encrypted = await encryptJson(JSON.parse(data), passphrase);
  return JSON.stringify(encrypted);
}

async function decryptData(data: string, passphrase: string): Promise<string> {
  // Check if data is encrypted
  try {
    const parsed = JSON.parse(data);
    if (parsed.data && isEncryptedBlob(parsed.data)) {
      const decrypted = await decryptJson(parsed as EncryptedBlob, passphrase);
      return JSON.stringify(decrypted);
    }
  } catch {
    // Not JSON or not encrypted, return as-is
  }
  return data;
}

function isDataEncrypted(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.data && isEncryptedBlob(parsed.data);
  } catch {
    return false;
  }
}

// ==================== MAIN SYNC FUNCTIONS ====================

/**
 * Get the file path in Dropbox
 */
function getFilePath(folderPath: string): string {
  const folder = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
  return `${folder}/${SYNC_FILENAME}`;
}

/**
 * Main sync function - following Super Productivity logic
 * 
 * Compare local vs remote and decide action:
 * - No remote file → upload
 * - Remote unchanged + local unchanged → do nothing
 * - Remote unchanged + local changed → upload
 * - Remote changed + local unchanged → download
 * - Remote changed + local changed → CONFLICT
 */
export async function dropboxSync(
  state: any,
  dispatch: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const prefs = state.preferences?.dropbox;
  if (!prefs?.appKey) {
    return { status: 'error', message: 'Dropbox not configured', timestamp: Date.now() };
  }

  const passphrase = options.passphraseOverride || localStorage.getItem('taskfuchs_dropbox_passphrase') || '';
  const folderPath = options.folderPathOverride || prefs.folderPath || '/Apps/TaskFuchs';
  const filePath = getFilePath(folderPath);

  try {
    const client = getDropboxClient(prefs.appKey);
    
    // Ensure authenticated
    if (!client.isAuthenticated()) {
      return { status: 'error', message: 'Not authenticated with Dropbox', timestamp: Date.now() };
    }

    // Prepare local data
    const localData = prepareLocalData(state);
    const localJson = exportToJSON(localData);
    const localHash = await secureHash(localJson);

    // Load sync metadata
    const metadata = loadSyncMetadata();
    const lastLocalHash = metadata?.lastLocalHash || '';
    const lastRemoteRev = metadata?.lastRemoteRev || null;

    // Check if local data changed since last sync
    const localChanged = localHash !== lastLocalHash;

    // Get remote file info
    let remoteMetadata: DropboxFileMetadata | null = null;
    let remoteData: string | null = null;
    
    try {
      const result = await client.download(filePath);
      if (result) {
        remoteMetadata = result.metadata;
        remoteData = result.data;
        
        // Decrypt if needed
        if (passphrase && isDataEncrypted(remoteData)) {
          remoteData = await decryptData(remoteData, passphrase);
        }
      }
    } catch (e: any) {
      // If download fails for other reasons, throw
      if (!e.message?.includes('not_found')) {
        throw e;
      }
    }

    const remoteRev = remoteMetadata?.rev || null;
    const remoteChanged = lastRemoteRev !== null && remoteRev !== lastRemoteRev;

    // Force push/pull handling
    if (options.forcePush) {
      return await forcePushToDropbox(client, filePath, localJson, passphrase, localHash);
    }
    
    if (options.forcePull) {
      if (!remoteData) {
        return { status: 'error', message: 'No remote file to pull', timestamp: Date.now() };
      }
      return await forcePullFromDropbox(remoteData, remoteRev!, dispatch, localHash);
    }

    // Decision logic
    if (!remoteMetadata) {
      // No remote file → create folder and upload
      await client.createFolder(folderPath);
      return await pushToDropbox(client, filePath, localJson, passphrase, localHash, null);
    }

    if (!localChanged && !remoteChanged) {
      // Nothing changed
      return {
        status: 'no-change',
        message: 'Already in sync',
        timestamp: Date.now(),
        localChanges: false,
        remoteChanges: false,
      };
    }

    if (localChanged && !remoteChanged) {
      // Only local changed → push
      return await pushToDropbox(client, filePath, localJson, passphrase, localHash, remoteRev);
    }

    if (!localChanged && remoteChanged) {
      // Only remote changed → pull
      return await pullFromDropbox(remoteData!, remoteRev!, dispatch, localHash);
    }

    // Both changed → conflict!
    return {
      status: 'conflict',
      message: 'Conflict: Both local and remote have changes. Use Force Push or Force Pull.',
      timestamp: Date.now(),
      localChanges: true,
      remoteChanges: true,
    };

  } catch (e: any) {
    console.error('Dropbox sync error:', e);
    
    // Update metadata with error
    const metadata = loadSyncMetadata() || {
      lastSyncTimestamp: 0,
      lastLocalHash: '',
      lastRemoteRev: null,
      lastSyncStatus: 'error' as const,
    };
    metadata.lastSyncStatus = 'error';
    metadata.lastSyncError = e.message;
    saveSyncMetadata(metadata);

    return {
      status: 'error',
      message: e.message || 'Sync failed',
      timestamp: Date.now(),
    };
  }
}

async function pushToDropbox(
  client: DropboxClient,
  filePath: string,
  localJson: string,
  passphrase: string,
  localHash: string,
  remoteRev: string | null
): Promise<SyncResult> {
  let dataToUpload = localJson;
  
  // Encrypt if passphrase provided
  if (passphrase) {
    dataToUpload = await encryptData(localJson, passphrase);
  }

  const result = await client.upload(filePath, dataToUpload, remoteRev || undefined);
  
  // Save metadata
  saveSyncMetadata({
    lastSyncTimestamp: Date.now(),
    lastLocalHash: localHash,
    lastRemoteRev: result.metadata.rev,
    lastSyncStatus: 'success',
  });

  return {
    status: 'pushed',
    message: 'Data uploaded to Dropbox',
    timestamp: Date.now(),
    localChanges: true,
    remoteChanges: false,
  };
}

async function pullFromDropbox(
  remoteData: string,
  remoteRev: string,
  dispatch: any,
  localHash: string
): Promise<SyncResult> {
  const parsed = importFromJSON(remoteData);
  if (!parsed) {
    throw new Error('Failed to parse remote data');
  }

  applyRemoteData(parsed, dispatch);

  // Calculate new local hash after applying remote data
  const newLocalJson = JSON.stringify(parsed);
  const newLocalHash = await secureHash(newLocalJson);

  // Save metadata
  saveSyncMetadata({
    lastSyncTimestamp: Date.now(),
    lastLocalHash: newLocalHash,
    lastRemoteRev: remoteRev,
    lastSyncStatus: 'success',
  });

  return {
    status: 'pulled',
    message: 'Data downloaded from Dropbox',
    timestamp: Date.now(),
    localChanges: false,
    remoteChanges: true,
  };
}

async function forcePushToDropbox(
  client: DropboxClient,
  filePath: string,
  localJson: string,
  passphrase: string,
  localHash: string
): Promise<SyncResult> {
  let dataToUpload = localJson;
  
  if (passphrase) {
    dataToUpload = await encryptData(localJson, passphrase);
  }

  // Upload without rev (overwrite mode)
  const result = await client.upload(filePath, dataToUpload);
  
  saveSyncMetadata({
    lastSyncTimestamp: Date.now(),
    lastLocalHash: localHash,
    lastRemoteRev: result.metadata.rev,
    lastSyncStatus: 'success',
  });

  return {
    status: 'pushed',
    message: 'Data force-pushed to Dropbox (overwrote remote)',
    timestamp: Date.now(),
    localChanges: true,
    remoteChanges: false,
  };
}

async function forcePullFromDropbox(
  remoteData: string,
  remoteRev: string,
  dispatch: any,
  _localHash: string
): Promise<SyncResult> {
  const parsed = importFromJSON(remoteData);
  if (!parsed) {
    throw new Error('Failed to parse remote data');
  }

  applyRemoteData(parsed, dispatch);

  const newLocalJson = JSON.stringify(parsed);
  const newLocalHash = await secureHash(newLocalJson);

  saveSyncMetadata({
    lastSyncTimestamp: Date.now(),
    lastLocalHash: newLocalHash,
    lastRemoteRev: remoteRev,
    lastSyncStatus: 'success',
  });

  return {
    status: 'pulled',
    message: 'Data force-pulled from Dropbox (overwrote local)',
    timestamp: Date.now(),
    localChanges: false,
    remoteChanges: true,
  };
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Upload current state to Dropbox (legacy API compatibility)
 */
export async function dropboxUpload(
  state: any,
  dispatch: any,
  options: SyncOptions = {}
): Promise<void> {
  const result = await dropboxSync(state, dispatch, { ...options, forcePush: true });
  if (result.status === 'error') {
    throw new Error(result.message);
  }
}

/**
 * Download from Dropbox and apply to local state (legacy API compatibility)
 */
export async function dropboxDownload(
  state: any,
  dispatch: any,
  _mode: 'remote' | 'local' = 'remote',
  options: SyncOptions = {}
): Promise<boolean> {
  const result = await dropboxSync(state, dispatch, { ...options, forcePull: true });
  if (result.status === 'error') {
    throw new Error(result.message);
  }
  return result.status === 'pulled';
}

/**
 * Reset local Dropbox settings
 */
export function dropboxResetLocal(dispatch: any): void {
  resetDropboxClient();
  clearSyncMetadata();
  
  dispatch({
    type: 'UPDATE_PREFERENCES',
    payload: {
      dropbox: {
        enabled: false,
        appKey: '',
        accessToken: undefined,
        refreshToken: undefined,
        expiresAt: undefined,
        accountEmail: undefined,
        accountName: undefined,
        folderPath: '/Apps/TaskFuchs',
        autoSync: true,
        syncInterval: 5,
        lastSync: undefined,
        lastSyncStatus: undefined,
        lastSyncError: undefined,
        conflictResolution: 'manual',
        rememberPassphrase: false,
        passphraseHint: undefined,
      },
    },
  });
}

/**
 * Get sync status
 */
export function getDropboxSyncStatus(): DropboxSyncMetadata | null {
  return loadSyncMetadata();
}

/**
 * Check if sync is needed (local changes detected)
 */
export async function hasLocalChanges(state: any): Promise<boolean> {
  const metadata = loadSyncMetadata();
  if (!metadata) return true;
  
  const localData = prepareLocalData(state);
  const localJson = exportToJSON(localData);
  const localHash = await secureHash(localJson);
  
  return localHash !== metadata.lastLocalHash;
}

// ==================== AUTO-SYNC SCHEDULER ====================

let autoSyncIntervalId: number | null = null;

export function startAutoSync(
  state: any,
  dispatch: any,
  intervalMinutes: number = 5
): void {
  stopAutoSync();
  
  const intervalMs = intervalMinutes * 60 * 1000;
  
  autoSyncIntervalId = window.setInterval(async () => {
    try {
      // Re-read state from window for latest values
      const currentState = (window as any).__taskfuchs_state__;
      if (!currentState) return;
      
      const prefs = currentState.preferences?.dropbox;
      if (!prefs?.enabled || !prefs?.autoSync) {
        stopAutoSync();
        return;
      }
      
      console.log('[Dropbox] Auto-sync triggered');
      const result = await dropboxSync(currentState, dispatch);
      console.log('[Dropbox] Auto-sync result:', result.status, result.message);
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('dropbox-sync-complete', { detail: result }));
    } catch (e) {
      console.error('[Dropbox] Auto-sync error:', e);
    }
  }, intervalMs);
  
  console.log(`[Dropbox] Auto-sync started (every ${intervalMinutes} minutes)`);
}

export function stopAutoSync(): void {
  if (autoSyncIntervalId !== null) {
    window.clearInterval(autoSyncIntervalId);
    autoSyncIntervalId = null;
    console.log('[Dropbox] Auto-sync stopped');
  }
}

export function isAutoSyncRunning(): boolean {
  return autoSyncIntervalId !== null;
}
