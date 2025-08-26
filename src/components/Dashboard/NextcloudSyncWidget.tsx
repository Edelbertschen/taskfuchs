import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  getNextcloudService, 
  NextcloudConfig, 
  NextcloudVersion,
  NextcloudConfigManager
} from '../../utils/nextcloudService';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import NextcloudSettings from '../Common/NextcloudSettings';
import NextcloudImportHelper from '../Common/NextcloudImportHelper';
import {
  Cloud,
  CloudOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  Loader,
  Shield,
  FileText,
  CloudDrizzle,
  Download
} from 'lucide-react';

interface NextcloudSyncWidgetProps {
  showTitle?: boolean;
}

export const NextcloudSyncWidget: React.FC<NextcloudSyncWidgetProps> = ({ 
  showTitle = true 
}) => {
  const { t } = useTranslation();
  const { state } = useApp();
  
  // ===== STATE =====
  
  const [config, setConfig] = useState<NextcloudConfig>(() => {
    // Migration alter Keys und Config laden
    NextcloudConfigManager.migrateOldKeys();
    return NextcloudConfigManager.loadConfig();
  });

  const [syncStatus, setSyncStatus] = useState<{
    status: 'disconnected' | 'connected' | 'syncing' | 'error';
    message: string;
    lastSync?: string;
    nextSync?: string;
    versions: number;
  }>({
    status: 'disconnected',
    message: 'Nicht konfiguriert',
    versions: 0
  });

  const [recentVersions, setRecentVersions] = useState<NextcloudVersion[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportHelper, setShowImportHelper] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  // ===== EFFECTS =====

  useEffect(() => {
    updateSyncStatus();
    
    // Automatische Sync-Prüfung alle 30 Sekunden
    const interval = setInterval(updateSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [config]);

  useEffect(() => {
    // Auto-Sync wenn aktiviert
    if (config.enabled && config.autoSync && NextcloudConfigManager.hasValidSession()) {
      const interval = setInterval(performAutoSync, config.syncInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [config.enabled, config.autoSync, config.syncInterval, syncStatus.status]);

  // ===== METHODS =====

  const updateSyncStatus = async () => {
    // Prüfe Grundkonfiguration
    if (!NextcloudConfigManager.isConfigComplete()) {
      setSyncStatus({
        status: 'disconnected',
        message: 'Nicht konfiguriert',
        versions: 0
      });
      return;
    }

    // Prüfe ob Session vorhanden ist
    if (!NextcloudConfigManager.hasValidSession()) {
      setSyncStatus({
        status: 'disconnected',
        message: 'Passwort erforderlich - Bitte in Einstellungen eingeben',
        versions: 0
      });
      return;
    }

    try {
      const service = getNextcloudService();
      const versions = await service.getAvailableVersions();
      
      // Lade die letzten 3 Versionen für die Anzeige im Widget
      setRecentVersions(versions.slice(0, 3));
      
      const lastSync = localStorage.getItem('nextcloud_lastSync');
      const nextSyncTime = lastSync 
        ? new Date(new Date(lastSync).getTime() + config.syncInterval * 60 * 1000)
        : null;

      setSyncStatus({
        status: 'connected',
        message: 'Verbunden',
        lastSync,
        nextSync: nextSyncTime?.toISOString(),
        versions: versions.length
      });

    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Verbindungsfehler',
        versions: 0
      });
    }
  };

  const performAutoSync = async () => {
    if (isSyncing || !NextcloudConfigManager.hasValidSession()) return;

    try {
      setIsSyncing(true);
      const service = getNextcloudService();
      
      const appData = {
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes || [],
        tags: state.tags,
        boards: (state as any).boards || [],
        preferences: state.preferences,
        archivedTasks: (state as any).archivedTasks || [],
        noteLinks: (state.notes as any).noteLinks || [],
        viewState: (state as any).viewState || {},
        projectKanbanColumns: (state as any).projectKanbanColumns || [],
        projectKanbanState: (state as any).projectKanbanState || {}
      };

      const result = await service.syncData(appData, { forceUpload: false });
      
      if (result.success) {
        localStorage.setItem('nextcloud_lastSync', new Date().toISOString());
        setLastSyncAttempt(new Date());
        await updateSyncStatus();
      }

    } catch (error) {
      console.error('Auto-sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const performManualSync = async () => {
    if (isSyncing || !NextcloudConfigManager.hasValidSession()) return;

    try {
      setIsSyncing(true);
      const service = getNextcloudService();
      
      const appData = {
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes || [],
        tags: state.tags,
        boards: (state as any).boards || [],
        preferences: state.preferences,
        archivedTasks: (state as any).archivedTasks || [],
        noteLinks: (state.notes as any).noteLinks || [],
        viewState: (state as any).viewState || {},
        projectKanbanColumns: (state as any).projectKanbanColumns || [],
        projectKanbanState: (state as any).projectKanbanState || {}
      };

      const result = await service.syncData(appData, { forceUpload: true });
      
      if (result.success) {
        localStorage.setItem('nextcloud_lastSync', new Date().toISOString());
        setLastSyncAttempt(new Date());
        await updateSyncStatus();
      }

    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ===== HELPER METHODS =====

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }

    switch (syncStatus.status) {
      case 'connected':
        return <Cloud className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'syncing':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <CloudOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'syncing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSync) return 'Noch nie';
    
    const lastSyncDate = new Date(syncStatus.lastSync);
    const now = new Date();
    const diffHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'Vor wenigen Minuten';
    } else if (diffHours < 24) {
      return `Vor ${Math.round(diffHours)} Stunden`;
    } else {
      return format(lastSyncDate, 'dd.MM.yyyy HH:mm');
    }
  };

  const formatNextSync = () => {
    if (!syncStatus.nextSync || !config.autoSync) return null;
    
    const nextSyncDate = new Date(syncStatus.nextSync);
    const now = new Date();
    
    if (nextSyncDate.getTime() <= now.getTime()) {
      return 'Überfällig';
    }
    
    return formatDistanceToNow(nextSyncDate, { addSuffix: true, locale: de });
  };

  // ===== RENDER =====

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        {showTitle && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Nextcloud Backup</span>
            </h3>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Einstellungen"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {syncStatus.message}
              </p>
              {syncStatus.status === 'connected' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {syncStatus.versions} Versionen verfügbar
                </p>
              )}
            </div>
          </div>

          {/* Sync Times */}
          {syncStatus.status === 'connected' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Letzte Sync:</span>
                </span>
                <span>{formatLastSync()}</span>
              </div>
              
              {config.autoSync && formatNextSync() && (
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Nächste Sync:</span>
                  <span>{formatNextSync()}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {syncStatus.status === 'connected' && (
            <div className="flex space-x-2">
              <button
                onClick={performManualSync}
                disabled={isSyncing}
                className={`flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  isSyncing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                }`}
                title="Manuell synchronisieren"
              >
                {isSyncing ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Sync</span>
              </button>

              <button
                onClick={() => setShowImportHelper(true)}
                className="flex items-center justify-center space-x-1 px-3 py-1.5 text-xs rounded-md bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                title="JSON-Datei importieren"
              >
                <Download className="w-3 h-3" />
                <span>Import</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center space-x-1 px-3 py-1.5 text-xs rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors"
                title="Versionen verwalten"
              >
                <FileText className="w-3 h-3" />
                <span>Versionen</span>
              </button>
            </div>
          )}

          {/* Setup Button */}
          {syncStatus.status === 'disconnected' && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md transition-colors"
            >
              <CloudDrizzle className="w-4 h-4" />
              <span>Nextcloud einrichten</span>
            </button>
          )}

          {/* Error State */}
          {syncStatus.status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
              <p className="text-xs text-red-600 dark:text-red-400">
                {syncStatus.message}
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-red-700 dark:text-red-300 hover:underline mt-1"
              >
                Einstellungen prüfen
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {syncStatus.status === 'connected' && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {state.tasks.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aufgaben</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {state.notes.notes.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notizen</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {syncStatus.versions}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Backups</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Versions */}
        {syncStatus.status === 'connected' && recentVersions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Letzte Backups
              </h4>
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Alle anzeigen
              </button>
            </div>
            <div className="space-y-1">
              {recentVersions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between text-xs p-1.5 rounded bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {format(new Date(version.date), 'dd.MM.yy HH:mm')}
                    </span>
                    <span className={`px-1 py-0.5 text-xs rounded ${
                      version.isAutomatic 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {version.isAutomatic ? 'Auto' : 'Manuell'}
                    </span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                    {(version.size / 1024).toFixed(0)}KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <NextcloudSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Import Helper Modal */}
      {showImportHelper && (
        <NextcloudImportHelper onClose={() => setShowImportHelper(false)} />
      )}
    </>
  );
};

export default NextcloudSyncWidget; 