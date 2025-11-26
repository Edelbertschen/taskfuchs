// Todoist Sync Safety Types and Defaults

export interface SafetySyncConfig {
  enabled: boolean;
  maxTasksPerSync: number;
  requirePreview: boolean;
  autoBackup: boolean;
  confirmLargeSyncs: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
}

export interface SyncPreview {
  tasksToCreate: any[];
  tasksToUpdate: any[];
  tasksToDelete: any[];
  conflicts: SyncConflict[];
  warnings: SafetyWarning[];
}

export interface SyncConflict {
  id: string;
  localTask: any;
  remoteTask: any;
  type: 'modified' | 'deleted';
}

export interface SafetyWarning {
  type: 'large_sync' | 'deletion' | 'conflict';
  message: string;
  count?: number;
}

export interface SyncBackup {
  id: string;
  timestamp: string;
  taskCount: number;
  data: any;
}

export const defaultSafetyConfig: SafetySyncConfig = {
  enabled: true,
  maxTasksPerSync: 100,
  requirePreview: false,
  autoBackup: true,
  confirmLargeSyncs: true,
  conflictResolution: 'manual'
};

export class SyncSafetyManager {
  private config: SafetySyncConfig;
  private backups: SyncBackup[] = [];

  constructor(config: SafetySyncConfig = defaultSafetyConfig) {
    this.config = config;
  }

  getConfig(): SafetySyncConfig {
    return this.config;
  }

  setConfig(config: Partial<SafetySyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  createBackup(tasks: any[]): SyncBackup {
    const backup: SyncBackup = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      taskCount: tasks.length,
      data: JSON.parse(JSON.stringify(tasks))
    };
    this.backups.unshift(backup);
    // Keep only last 10 backups
    if (this.backups.length > 10) {
      this.backups = this.backups.slice(0, 10);
    }
    return backup;
  }

  getBackups(): SyncBackup[] {
    return this.backups;
  }

  restoreBackup(backupId: string): any[] | null {
    const backup = this.backups.find(b => b.id === backupId);
    return backup ? backup.data : null;
  }

  generatePreview(localTasks: any[], remoteTasks: any[]): SyncPreview {
    return {
      tasksToCreate: [],
      tasksToUpdate: [],
      tasksToDelete: [],
      conflicts: [],
      warnings: []
    };
  }

  shouldConfirmSync(preview: SyncPreview): boolean {
    if (!this.config.enabled) return false;
    const totalChanges = preview.tasksToCreate.length + 
                         preview.tasksToUpdate.length + 
                         preview.tasksToDelete.length;
    return this.config.confirmLargeSyncs && totalChanges > this.config.maxTasksPerSync;
  }
}

export default SyncSafetyManager;
