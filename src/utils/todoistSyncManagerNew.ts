// Stub for removed Todoist integration
// These methods are called in Settings.tsx but Todoist integration has been removed

interface SyncConfig {
  enabled: boolean;
  projectMappings: any[];
  lastSyncState?: {
    timestamp: string | null;
    lastFullSyncTimestamp: string | null;
  };
  lastSync?: string;
  lastSyncStatus?: 'success' | 'error';
  autoSyncInterval?: number;
  apiToken?: string;
}

const defaultConfig: SyncConfig = {
  enabled: false,
  projectMappings: [],
  lastSyncState: {
    timestamp: null,
    lastFullSyncTimestamp: null
  }
};

export const todoistSyncManager = {
  getConfig(): SyncConfig { 
    return defaultConfig; 
  },
  setConfig(_config: Partial<SyncConfig>) { /* no-op */ },
  updateConfig(_config: Partial<SyncConfig>) { /* no-op */ },
  resetConfig() { /* no-op */ },
  async runSync() { 
    throw new Error('Todoist integration removed'); 
  },
  async performSync(_tasks: any[], _columns: any[], _forceFullSync?: boolean) {
    return {
      success: false,
      summary: 'Todoist integration removed',
      errors: ['Todoist integration has been removed'],
      conflicts: [],
      localTasksAdded: [],
      localTasksUpdated: [],
      localTasksDeleted: [],
      localColumnsAdded: [],
      localColumnsUpdated: [],
      localColumnsDeleted: [],
    };
  },
  clearErrorLog() { /* no-op */ },
};
