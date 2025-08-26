import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  nextcloudManager, 
  NextcloudStatus, 
  SyncLogEntry, 
  NextcloudConfig 
} from '../../utils/nextcloudManager';
import { 
  NextcloudConfigManager,
  type NextcloudConfig as NewNextcloudConfig
} from '../../utils/nextcloudService';
import {
  Cloud,
  CloudOff,
  Zap,
  ZapOff,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Activity,
  Clock,
  Check,
  X,
  AlertTriangle,
  Info,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
  WifiOff
} from 'lucide-react';

interface NextcloudDashboardProps {
  onOpenSetup: () => void;
}

export const NextcloudDashboard: React.FC<NextcloudDashboardProps> = ({ onOpenSetup }) => {
  const { t } = useTranslation();
  const { state } = useApp();
  
  // ===== STATE =====
  
  const [status, setStatus] = useState<NextcloudStatus | null>(null);
  const [config, setConfig] = useState<NextcloudConfig | null>(null);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [isPerformingSync, setIsPerformingSync] = useState(false);
  const [expandedLogEntry, setExpandedLogEntry] = useState<string | null>(null);

  // ===== EFFECTS =====

  useEffect(() => {
    // Migrate old keys to new system and check both systems
    NextcloudConfigManager.migrateOldKeys();
    
    // Check both config systems - prefer new over old
    const newConfig = NextcloudConfigManager.loadConfig();
    const oldConfig = nextcloudManager.getConfig();
    
    // If new system is configured but old isn't, migrate from new to old
    if (newConfig.enabled && newConfig.serverUrl && newConfig.username && !oldConfig?.enabled) {
      // Migrate new config to old system
      nextcloudManager.updateConfig({
        enabled: true,
        serverUrl: newConfig.serverUrl,
        username: newConfig.username,
        password: NextcloudConfigManager.getSessionPassword() || '',
        syncFolder: newConfig.syncFolder,
        autoSync: newConfig.autoSync,
        syncInterval: newConfig.syncInterval,
        lastSync: null,
        totalSyncs: 0
      });
    }
    
    // Initial load
    setConfig(nextcloudManager.getConfig());
    setSyncLog(nextcloudManager.getSyncLog());
    setStatus(nextcloudManager.getStatus());

    // Subscribe to status updates
    const unsubscribe = nextcloudManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      // Refresh log when sync completes
      if (!newStatus.syncing) {
        setSyncLog(nextcloudManager.getSyncLog());
      }
    });

    return unsubscribe;
  }, []);

  // ===== HANDLERS =====

  const handleManualSync = async () => {
    setIsPerformingSync(true);
    try {
      await nextcloudManager.performSync(state, true);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsPerformingSync(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (config) {
      await nextcloudManager.updateConfig({
        autoSync: !config.autoSync
      });
      setConfig(nextcloudManager.getConfig());
    }
  };

  const handleDisableSync = async () => {
    await nextcloudManager.disable();
    setConfig(nextcloudManager.getConfig());
  };

  const handleClearLog = () => {
    nextcloudManager.clearSyncLog();
    setSyncLog([]);
  };

  // ===== UTILITY FUNCTIONS =====

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Gerade eben';
      if (diffMins < 60) return `vor ${diffMins} Min.`;
      if (diffHours < 24) return `vor ${diffHours} Std.`;
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
      
      return formatDate(dateString);
    } catch {
      return 'Unbekannt';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <CloudOff className="w-5 h-5 text-gray-400" />;
    
    if (status.syncing || isPerformingSync) {
      return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
    
    if (status.connected) {
      return <Cloud className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    
    return <CloudOff className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  const getStatusMessage = () => {
    if (!config?.enabled) return 'Nextcloud-Sync ist deaktiviert';
    if (!status?.connected) return 'Nicht verbunden - Konfiguration prüfen';
    if (status.syncing || isPerformingSync) return 'Synchronisation läuft...';
    if (config.autoSync) return `Automatisch (alle ${config.syncInterval / 60}h)`;
    return 'Bereit für manuelle Synchronisation';
  };

  const getLogEntryIcon = (type: SyncLogEntry['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'error':
        return <X className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getLogEntryBgColor = (type: SyncLogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  // ===== RENDER =====

  // Check both config systems for setup state
  const newConfig = NextcloudConfigManager.loadConfig();
  const isConfigured = config?.enabled || (newConfig.enabled && newConfig.serverUrl && newConfig.username);

  if (!isConfigured) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <CloudOff className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nextcloud-Synchronisation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Synchronisieren Sie Ihre TaskFuchs-Daten sicher mit Ihrer Nextcloud
            </p>
            <button
              onClick={onOpenSetup}
              className="px-6 py-2 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              style={{ 
                backgroundColor: state.preferences.accentColor,
                boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
              }}
            >
              Jetzt einrichten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nextcloud-Synchronisation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getStatusMessage()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSetup}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Details */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {status.totalSyncs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Synchronisationen
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {status.lastSync ? formatRelativeTime(status.lastSync) : 'Noch nie'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Letzte Sync
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {config.autoSync ? `${config.syncInterval / 60}h` : 'Manuell'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Intervall
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleManualSync}
            disabled={!status?.connected || status?.syncing || isPerformingSync}
            className="px-4 py-2 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
            style={{ 
              backgroundColor: state.preferences.accentColor,
              boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
            }}
          >
            {status?.syncing || isPerformingSync ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synchronisiert...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Jetzt synchronisieren</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleAutoSync}
            className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
              config.autoSync
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {config.autoSync ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            <span>{config.autoSync ? 'Auto-Sync AN' : 'Auto-Sync AUS'}</span>
          </button>

          <button
            onClick={() => setShowLog(!showLog)}
            className="px-4 py-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>Protokoll {showLog ? 'ausblenden' : 'anzeigen'}</span>
          </button>
        </div>
      </div>

      {/* Sync Log */}
      {showLog && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Synchronisations-Protokoll
            </h3>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {syncLog.length} Einträge
              </span>
              {syncLog.length > 0 && (
                <button
                  onClick={handleClearLog}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Protokoll löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {syncLog.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Noch keine Synchronisations-Aktivitäten
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncLog.slice().reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${getLogEntryBgColor(entry.type)}`}
                  onClick={() => setExpandedLogEntry(
                    expandedLogEntry === entry.id ? null : entry.id
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {getLogEntryIcon(entry.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.message}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(entry.timestamp)}
                          </span>
                          {entry.details && (
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {expandedLogEntry === entry.id ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {expandedLogEntry === entry.id && entry.details && (
                        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                          {entry.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Schnellaktionen
        </h4>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              if (config) {
                await nextcloudManager.updateConfig({ syncInterval: 15 });
                setConfig(nextcloudManager.getConfig());
              }
            }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              config.syncInterval === 15
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            15 Min
          </button>
          
          <button
            onClick={async () => {
              if (config) {
                await nextcloudManager.updateConfig({ syncInterval: 60 });
                setConfig(nextcloudManager.getConfig());
              }
            }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              config.syncInterval === 60
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            1 Std
          </button>
          
          <button
            onClick={async () => {
              if (config) {
                await nextcloudManager.updateConfig({ syncInterval: 1440 });
                setConfig(nextcloudManager.getConfig());
              }
            }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              config.syncInterval === 1440
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Täglich
          </button>

          <div className="ml-auto">
            <button
              onClick={handleDisableSync}
              className="px-3 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Deaktivieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 