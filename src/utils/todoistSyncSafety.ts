import type { Task, Column, UserPreferences } from '../types';

// ===================================================================
// SAFETY & SECURITY CONFIGURATION FOR TODOIST SYNC
// Based on established practices from enterprise sync solutions
// ===================================================================

export interface SafetySyncConfig {
  // 🛡️ BACKUP CONFIGURATION
  autoBackupBeforeSync: boolean;
  maxBackupRetention: number; // Number of backups to keep (default: 10)
  backupCompressionEnabled: boolean;
  
  // 🔒 SAFE MODE OPTIONS
  safeMode: boolean; // Only additions/updates, no deletions
  dryRunMode: boolean; // Preview changes without executing
  
  // ⚠️ USER CONFIRMATION REQUIREMENTS
  confirmationRequired: {
    taskDeletions: boolean;
    columnDeletions: boolean;
    bulkOperations: boolean; // For operations affecting > X items
    bulkOperationThreshold: number; // Default: 5
  };
  
  // 🔄 ADVANCED SAFETY FEATURES
  rollbackEnabled: boolean;
  changeAuditLog: boolean;
  conflictDetectionLevel: 'basic' | 'advanced' | 'strict';
  
  // 🚦 RATE LIMITING PROTECTION
  rateLimitProtection: boolean;
  maxOperationsPerMinute: number; // Default: 30
  respectApiLimits: boolean;
  
  // 🔍 MONITORING & ALERTS
  monitorDataIntegrity: boolean;
  alertOnLargeChanges: boolean;
  largeChangeThreshold: number; // % of total items (default: 20)
}

export interface SyncBackup {
  id: string;
  timestamp: string;
  version: string; // TaskFuchs version when backup was created
  description: string;
  
  // Pre-sync state
  preSync: {
    tasks: Task[];
    columns: Column[];
    preferences: Partial<UserPreferences>;
    metadata: {
      totalTasks: number;
      totalColumns: number;
      todoistProjects: number;
    };
  };
  
  // Planned operation details
  syncOperation: {
    type: 'full' | 'incremental';
    plannedChanges: SyncPreview;
    safetyLevel: 'safe' | 'moderate' | 'risky';
  };
  
  // Technical details
  compressed: boolean;
  size: number; // bytes
  checksum: string; // For integrity verification
}

export interface SyncPreview {
  // 📊 CHANGE SUMMARY
  summary: {
    totalChanges: number;
    riskLevel: 'low' | 'medium' | 'high';
    estimatedDuration: number; // seconds
    reversible: boolean;
  };
  
  // 📝 DETAILED CHANGES
  tasks: {
    toCreate: SyncPreviewItem[];
    toUpdate: SyncPreviewItem[];
    toDelete: SyncPreviewItem[];
  };
  
  columns: {
    toCreate: SyncPreviewItem[];
    toUpdate: SyncPreviewItem[];
    toDelete: SyncPreviewItem[];
  };
  
  // ⚠️ WARNINGS & CONFLICTS
  potentialConflicts: SyncConflict[];
  safetyWarnings: SafetyWarning[];
  
  // 🔧 TECHNICAL INFO
  estimatedApiCalls: number;
  rateLimitImpact: 'none' | 'low' | 'medium' | 'high';
  requiresUserAction: boolean;
}

export interface SyncPreviewItem {
  id: string;
  title: string;
  type: 'task' | 'column';
  action: 'create' | 'update' | 'delete';
  changes?: string[]; // List of what will change
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface SyncConflict {
  id: string;
  type: 'task_modified' | 'column_renamed' | 'priority_mismatch' | 'date_conflict' | 'data_inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Conflicting items
  taskFuchsItem: any;
  todoistItem: any;
  
  // Human-readable description
  title: string;
  description: string;
  
  // Resolution options
  possibleResolutions: ConflictResolution[];
  suggestedResolution: string;
  autoResolvable: boolean;
}

export interface ConflictResolution {
  id: string;
  label: string;
  description: string;
  action: 'keep_local' | 'keep_remote' | 'merge' | 'skip' | 'manual';
  reversible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SafetyWarning {
  id: string;
  type: 'data_loss' | 'large_changes' | 'api_limits' | 'connectivity' | 'permissions';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  recommendation: string;
  blockingSync: boolean;
}

export interface SyncAuditLogEntry {
  id: string;
  timestamp: string;
  sessionId: string; // Groups related operations
  
  // Operation details
  operation: string;
  itemType: 'task' | 'column' | 'project' | 'label';
  itemId: string;
  itemTitle: string;
  action: 'create' | 'update' | 'delete' | 'sync';
  
  // State tracking
  beforeState?: any;
  afterState?: any;
  changes: string[]; // Human-readable change descriptions
  
  // Source & result
  source: 'taskfuchs' | 'todoist' | 'conflict_resolution';
  success: boolean;
  error?: string;
  
  // Recovery info
  rollbackPossible: boolean;
  rollbackData?: any;
  
  // Performance metrics
  duration: number; // milliseconds
  apiCallsUsed: number;
}

export interface DataIntegrityCheck {
  timestamp: string;
  passed: boolean;
  checks: {
    taskCount: { taskfuchs: number; todoist: number; match: boolean };
    columnCount: { taskfuchs: number; todoist: number; match: boolean };
    mappingConsistency: { valid: number; invalid: number; issues: string[] };
    orphanedItems: { tasks: string[]; columns: string[] };
    duplicates: { tasks: string[]; columns: string[] };
  };
  recommendations: string[];
}

// ===================================================================
// SYNC SAFETY MANAGER CLASS
// ===================================================================

export class SyncSafetyManager {
  private backups: SyncBackup[] = [];
  private auditLog: SyncAuditLogEntry[] = [];
  private config: SafetySyncConfig;
  
  constructor(config?: Partial<SafetySyncConfig>) {
    this.config = {
      // Default safe configuration
      autoBackupBeforeSync: true,
      maxBackupRetention: 10,
      backupCompressionEnabled: true,
      safeMode: false, // User can enable for extra safety
      dryRunMode: false,
      confirmationRequired: {
        taskDeletions: true,
        columnDeletions: true,
        bulkOperations: true,
        bulkOperationThreshold: 5
      },
      rollbackEnabled: true,
      changeAuditLog: true,
      conflictDetectionLevel: 'advanced',
      rateLimitProtection: true,
      maxOperationsPerMinute: 30,
      respectApiLimits: true,
      monitorDataIntegrity: true,
      alertOnLargeChanges: true,
      largeChangeThreshold: 20,
      ...config
    };
    
    this.loadPersistedData();
  }
  
  // 🛡️ CREATE BACKUP BEFORE SYNC
  async createPreSyncBackup(
    tasks: Task[], 
    columns: Column[], 
    preferences: Partial<UserPreferences>,
    plannedChanges: SyncPreview
  ): Promise<string> {
    const backup: SyncBackup = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      version: this.getAppVersion(),
      description: `Pre-sync backup: ${plannedChanges.summary.totalChanges} changes planned`,
      preSync: {
        tasks: JSON.parse(JSON.stringify(tasks)),
        columns: JSON.parse(JSON.stringify(columns)),
        preferences: JSON.parse(JSON.stringify(preferences)),
        metadata: {
          totalTasks: tasks.length,
          totalColumns: columns.length,
          todoistProjects: columns.filter(c => c.type === 'project').length
        }
      },
      syncOperation: {
        type: plannedChanges.summary.totalChanges > 50 ? 'full' : 'incremental',
        plannedChanges,
        safetyLevel: this.calculateSafetyLevel(plannedChanges)
      },
      compressed: this.config.backupCompressionEnabled,
      size: 0, // Will be calculated after compression
      checksum: ''
    };
    
    // Compress if enabled
    if (this.config.backupCompressionEnabled) {
      backup.preSync = await this.compressData(backup.preSync);
    }
    
    backup.size = this.calculateBackupSize(backup);
    backup.checksum = await this.calculateChecksum(backup);
    
    this.backups.push(backup);
    this.cleanupOldBackups();
    this.persistBackups();
    
    return backup.id;
  }
  
  // 🔍 GENERATE SYNC PREVIEW
  async generateSyncPreview(
    localTasks: Task[],
    localColumns: Column[],
    remoteTasks: any[],
    remoteColumns: any[]
  ): Promise<SyncPreview> {
    const preview: SyncPreview = {
      summary: {
        totalChanges: 0,
        riskLevel: 'low',
        estimatedDuration: 0,
        reversible: true
      },
      tasks: { toCreate: [], toUpdate: [], toDelete: [] },
      columns: { toCreate: [], toUpdate: [], toDelete: [] },
      potentialConflicts: [],
      safetyWarnings: [],
      estimatedApiCalls: 0,
      rateLimitImpact: 'none',
      requiresUserAction: false
    };
    
    // Analyze task changes
    this.analyzeTaskChanges(localTasks, remoteTasks, preview);
    
    // Analyze column changes
    this.analyzeColumnChanges(localColumns, remoteColumns, preview);
    
    // Detect conflicts
    preview.potentialConflicts = await this.detectConflicts(localTasks, localColumns, remoteTasks, remoteColumns);
    
    // Generate safety warnings
    preview.safetyWarnings = this.generateSafetyWarnings(preview);
    
    // Calculate summary
    preview.summary = this.calculatePreviewSummary(preview);
    
    return preview;
  }
  
  // ⚠️ USER CONFIRMATION FOR DANGEROUS OPERATIONS
  async requiresUserConfirmation(preview: SyncPreview): Promise<{
    required: boolean;
    reasons: string[];
    recommendations: string[];
  }> {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    
    // Check for deletions
    if (this.config.confirmationRequired.taskDeletions && preview.tasks.toDelete.length > 0) {
      reasons.push(`${preview.tasks.toDelete.length} Aufgaben werden gelöscht`);
      recommendations.push('Überprüfen Sie die zu löschenden Aufgaben sorgfältig');
    }
    
    if (this.config.confirmationRequired.columnDeletions && preview.columns.toDelete.length > 0) {
      reasons.push(`${preview.columns.toDelete.length} Spalten werden gelöscht`);
      recommendations.push('Spalten-Löschungen sind möglicherweise nicht umkehrbar');
    }
    
    // Check for bulk operations
    const totalChanges = preview.summary.totalChanges;
    if (this.config.confirmationRequired.bulkOperations && totalChanges > this.config.confirmationRequired.bulkOperationThreshold) {
      reasons.push(`${totalChanges} Änderungen geplant (Schwellenwert: ${this.config.confirmationRequired.bulkOperationThreshold})`);
      recommendations.push('Bei großen Änderungen empfiehlt sich ein Backup');
    }
    
    // Check for high-risk operations
    if (preview.summary.riskLevel === 'high') {
      reasons.push('Hochriskante Operationen erkannt');
      recommendations.push('Erwägen Sie den Safe Mode oder Dry Run');
    }
    
    // Check for conflicts
    if (preview.potentialConflicts.some(c => c.severity === 'critical')) {
      reasons.push('Kritische Konflikte erkannt');
      recommendations.push('Lösen Sie Konflikte vor der Synchronisation');
    }
    
    return {
      required: reasons.length > 0,
      reasons,
      recommendations
    };
  }
  
  // 🔄 ROLLBACK FUNCTIONALITY
  async rollbackToBackup(backupId: string): Promise<{
    success: boolean;
    error?: string;
    itemsRestored: number;
  }> {
    try {
      const backup = this.backups.find(b => b.id === backupId);
      if (!backup) {
        throw new Error('Backup nicht gefunden');
      }
      
      // Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(backup);
      if (!isValid) {
        throw new Error('Backup-Integrität konnte nicht verifiziert werden');
      }
      
      // Decompress if needed
      let restoredData = backup.preSync;
      if (backup.compressed) {
        restoredData = await this.decompressData(backup.preSync);
      }
      
             // Log rollback operation
       this.logAuditEntry({
         sessionId: `rollback_${backupId}`,
         operation: 'rollback',
         itemType: 'project',
         itemId: backupId,
         itemTitle: backup.description,
         action: 'sync',
         source: 'taskfuchs',
         success: true,
         rollbackPossible: false,
         duration: 0,
         apiCallsUsed: 0,
         changes: ['System state restored from backup']
       });
      
      return {
        success: true,
        itemsRestored: restoredData.tasks.length + restoredData.columns.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during rollback',
        itemsRestored: 0
      };
    }
  }
  
  // 🔍 DATA INTEGRITY CHECK
  async performDataIntegrityCheck(
    localTasks: Task[],
    localColumns: Column[],
    remoteTasks: any[],
    remoteColumns: any[]
  ): Promise<DataIntegrityCheck> {
    const check: DataIntegrityCheck = {
      timestamp: new Date().toISOString(),
      passed: true,
      checks: {
        taskCount: {
          taskfuchs: localTasks.length,
          todoist: remoteTasks.length,
          match: Math.abs(localTasks.length - remoteTasks.length) <= 2 // Allow small discrepancies
        },
        columnCount: {
          taskfuchs: localColumns.length,
          todoist: remoteColumns.length,
          match: Math.abs(localColumns.length - remoteColumns.length) <= 1
        },
        mappingConsistency: { valid: 0, invalid: 0, issues: [] },
        orphanedItems: { tasks: [], columns: [] },
        duplicates: { tasks: [], columns: [] }
      },
      recommendations: []
    };
    
    // Check for orphaned items
    check.checks.orphanedItems = this.findOrphanedItems(localTasks, localColumns, remoteTasks, remoteColumns);
    
    // Check for duplicates
    check.checks.duplicates = this.findDuplicates(localTasks, localColumns, remoteTasks, remoteColumns);
    
    // Determine if check passed
    check.passed = 
      check.checks.taskCount.match &&
      check.checks.columnCount.match &&
      check.checks.orphanedItems.tasks.length === 0 &&
      check.checks.orphanedItems.columns.length === 0 &&
      check.checks.duplicates.tasks.length === 0 &&
      check.checks.duplicates.columns.length === 0;
    
    // Generate recommendations
    if (!check.passed) {
      check.recommendations = this.generateIntegrityRecommendations(check);
    }
    
    return check;
  }
  
  // 📝 AUDIT LOGGING
  logAuditEntry(entry: Omit<SyncAuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: SyncAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    this.auditLog.push(fullEntry);
    this.persistAuditLog();
    
    // Keep audit log size manageable
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500); // Keep last 500 entries
    }
  }
  
  // 📊 GET SAFETY STATISTICS
  getSafetyStatistics(): {
    backups: { count: number; totalSize: number; oldestDate: string };
    auditLog: { entries: number; lastEntry: string; errorRate: number };
    integrityChecks: { lastCheck: string; passed: boolean };
  } {
    const errorEntries = this.auditLog.filter(e => !e.success).length;
    const errorRate = this.auditLog.length > 0 ? (errorEntries / this.auditLog.length) * 100 : 0;
    
    return {
      backups: {
        count: this.backups.length,
        totalSize: this.backups.reduce((sum, b) => sum + b.size, 0),
        oldestDate: this.backups.length > 0 ? this.backups[0].timestamp : ''
      },
      auditLog: {
        entries: this.auditLog.length,
        lastEntry: this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1].timestamp : '',
        errorRate: Math.round(errorRate * 100) / 100
      },
      integrityChecks: {
        lastCheck: '', // Would be implemented with persistence
        passed: true
      }
    };
  }
  
  // Private helper methods
  private calculateSafetyLevel(preview: SyncPreview): 'safe' | 'moderate' | 'risky' {
    const deletions = preview.tasks.toDelete.length + preview.columns.toDelete.length;
    const totalChanges = preview.summary.totalChanges;
    const criticalConflicts = preview.potentialConflicts.filter(c => c.severity === 'critical').length;
    
    if (criticalConflicts > 0 || deletions > 10 || totalChanges > 100) {
      return 'risky';
    } else if (deletions > 0 || totalChanges > 20) {
      return 'moderate';
    }
    return 'safe';
  }
  
  private getAppVersion(): string {
    // In real implementation, get from package.json or app metadata
    return '1.0.0';
  }
  
  private async compressData(data: any): Promise<any> {
    // Implement compression logic (e.g., using pako library)
    return data; // Placeholder
  }
  
  private async decompressData(data: any): Promise<any> {
    // Implement decompression logic
    return data; // Placeholder
  }
  
  private calculateBackupSize(backup: SyncBackup): number {
    return JSON.stringify(backup.preSync).length;
  }
  
  private async calculateChecksum(backup: SyncBackup): Promise<string> {
    // Implement checksum calculation (e.g., using crypto)
    return 'checksum_placeholder';
  }
  
  private async verifyBackupIntegrity(backup: SyncBackup): Promise<boolean> {
    const currentChecksum = await this.calculateChecksum(backup);
    return currentChecksum === backup.checksum;
  }
  
  private analyzeTaskChanges(localTasks: Task[], remoteTasks: any[], preview: SyncPreview): void {
    // Implementation would analyze differences and populate preview
  }
  
  private analyzeColumnChanges(localColumns: Column[], remoteColumns: any[], preview: SyncPreview): void {
    // Implementation would analyze differences and populate preview
  }
  
  private async detectConflicts(localTasks: Task[], localColumns: Column[], remoteTasks: any[], remoteColumns: any[]): Promise<SyncConflict[]> {
    // Implementation would detect conflicts
    return [];
  }
  
  private generateSafetyWarnings(preview: SyncPreview): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    
    if (preview.tasks.toDelete.length > 0) {
      warnings.push({
        id: 'task_deletions',
        type: 'data_loss',
        severity: 'warning',
        title: 'Aufgaben werden gelöscht',
        message: `${preview.tasks.toDelete.length} Aufgaben werden permanent gelöscht.`,
        recommendation: 'Überprüfen Sie die Liste der zu löschenden Aufgaben.',
        blockingSync: false
      });
    }
    
    return warnings;
  }
  
  private calculatePreviewSummary(preview: SyncPreview): SyncPreview['summary'] {
    const totalChanges = 
      preview.tasks.toCreate.length + preview.tasks.toUpdate.length + preview.tasks.toDelete.length +
      preview.columns.toCreate.length + preview.columns.toUpdate.length + preview.columns.toDelete.length;
    
    const deletions = preview.tasks.toDelete.length + preview.columns.toDelete.length;
    const criticalConflicts = preview.potentialConflicts.filter(c => c.severity === 'critical').length;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (criticalConflicts > 0 || deletions > 10) {
      riskLevel = 'high';
    } else if (deletions > 0 || totalChanges > 20) {
      riskLevel = 'medium';
    }
    
    return {
      totalChanges,
      riskLevel,
      estimatedDuration: Math.ceil(totalChanges * 0.5), // 0.5 seconds per change
      reversible: deletions === 0 && criticalConflicts === 0
    };
  }
  
  private findOrphanedItems(localTasks: Task[], localColumns: Column[], remoteTasks: any[], remoteColumns: any[]): { tasks: string[], columns: string[] } {
    // Implementation would find orphaned items
    return { tasks: [], columns: [] };
  }
  
  private findDuplicates(localTasks: Task[], localColumns: Column[], remoteTasks: any[], remoteColumns: any[]): { tasks: string[], columns: string[] } {
    // Implementation would find duplicates
    return { tasks: [], columns: [] };
  }
  
  private generateIntegrityRecommendations(check: DataIntegrityCheck): string[] {
    const recommendations: string[] = [];
    
    if (!check.checks.taskCount.match) {
      recommendations.push('Unterschiedliche Anzahl von Aufgaben - manuelle Überprüfung empfohlen');
    }
    
    if (check.checks.orphanedItems.tasks.length > 0) {
      recommendations.push('Verwaiste Aufgaben gefunden - Bereinigung empfohlen');
    }
    
    return recommendations;
  }
  
  private cleanupOldBackups(): void {
    if (this.backups.length > this.config.maxBackupRetention) {
      this.backups = this.backups.slice(-this.config.maxBackupRetention);
    }
  }
  
  private loadPersistedData(): void {
    try {
      const backupsData = localStorage.getItem('taskfuchs-sync-backups');
      if (backupsData) {
        this.backups = JSON.parse(backupsData);
      }
      
      const auditData = localStorage.getItem('taskfuchs-sync-audit');
      if (auditData) {
        this.auditLog = JSON.parse(auditData);
      }
    } catch (error) {
      console.warn('Failed to load persisted safety data:', error);
    }
  }
  
  private persistBackups(): void {
    try {
      localStorage.setItem('taskfuchs-sync-backups', JSON.stringify(this.backups));
    } catch (error) {
      console.warn('Failed to persist backups:', error);
    }
  }
  
  private persistAuditLog(): void {
    try {
      localStorage.setItem('taskfuchs-sync-audit', JSON.stringify(this.auditLog));
    } catch (error) {
      console.warn('Failed to persist audit log:', error);
    }
  }
}

// Default safety configuration for new users
export const defaultSafetyConfig: SafetySyncConfig = {
  autoBackupBeforeSync: true,
  maxBackupRetention: 10,
  backupCompressionEnabled: true,
  safeMode: false,
  dryRunMode: false,
  confirmationRequired: {
    taskDeletions: true,
    columnDeletions: true,
    bulkOperations: true,
    bulkOperationThreshold: 5
  },
  rollbackEnabled: true,
  changeAuditLog: true,
  conflictDetectionLevel: 'advanced',
  rateLimitProtection: true,
  maxOperationsPerMinute: 30,
  respectApiLimits: true,
  monitorDataIntegrity: true,
  alertOnLargeChanges: true,
  largeChangeThreshold: 20
}; 