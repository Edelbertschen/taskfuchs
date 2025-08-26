import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cloud, CloudOff, RefreshCw, Check, X, Clock, WifiOff, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SyncStatusWidgetProps {
  showTitle?: boolean;
}

export function SyncStatusWidget({ showTitle = true }: SyncStatusWidgetProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Check if sync is enabled and configured
  const syncEnabled = localStorage.getItem('syncEnabled') === 'true';
  const hasValidConfig = localStorage.getItem('nextcloudUrl') && 
                        localStorage.getItem('nextcloudUsername') && 
                        localStorage.getItem('nextcloudPassword');

  useEffect(() => {
    // Load sync status from localStorage
    const storedLastSync = localStorage.getItem('lastSync');
    const storedStatus = localStorage.getItem('connectionStatus') as 'connected' | 'disconnected' | 'error';
    
    setLastSync(storedLastSync || null);
    setSyncStatus(storedStatus || 'disconnected');
  }, []);

  const handleManualSync = async () => {
    if (!syncEnabled || !hasValidConfig || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      // Import syncManager dynamically
      const { syncManager } = await import('../../utils/syncUtils');
      
      const result = await syncManager.syncData({
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes,
        preferences: state.preferences
      });
      
      if (result.success) {
        const now = new Date().toLocaleString('de-DE');
        setLastSync(now);
        setSyncStatus('connected');
        setSyncMessage('Synchronisation erfolgreich!');
        localStorage.setItem('lastSync', now);
        localStorage.setItem('connectionStatus', 'connected');
      } else {
        setSyncStatus('error');
        setSyncMessage('Synchronisation fehlgeschlagen');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Fehler beim Synchronisieren');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      // Clear message after 3 seconds
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) return <Loader className="w-4 h-4 animate-spin" />;
    if (!syncEnabled || !hasValidConfig) return <CloudOff className="w-4 h-4" />;
    
    switch (syncStatus) {
      case 'connected':
        return <Cloud className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-500 dark:text-blue-400';
    if (!syncEnabled || !hasValidConfig) return 'text-gray-400';
    
    switch (syncStatus) {
      case 'connected':
        return 'text-green-500 dark:text-green-400';
      case 'error':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    if (isSyncing) return 'Synchronisiere...';
    if (!syncEnabled) return 'Sync deaktiviert';
    if (!hasValidConfig) return 'Nicht konfiguriert';
    
    switch (syncStatus) {
      case 'connected':
        return 'Verbunden';
      case 'error':
        return 'Fehler';
      default:
        return 'Getrennt';
    }
  };

  // Don't render if sync is disabled
  if (!syncEnabled) return null;

  return (
    <div className="glass-effect rounded-2xl p-4 min-h-[400px] flex flex-col transition-all duration-300">
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-white flex items-center" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>
            <Cloud className="w-5 h-5 mr-2" style={{ color: state.preferences.accentColor }} />
            Nextcloud Sync
          </h3>
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !hasValidConfig}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Manuell synchronisieren"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={getStatusColor()}>
              {getStatusIcon()}
            </div>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {hasValidConfig && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: isSyncing ? 'gray' : state.preferences.accentColor,
                color: 'white'
              }}
            >
              {isSyncing ? 'Sync...' : 'Sync'}
            </button>
          )}
        </div>

        {/* Last sync time */}
        {lastSync && (
          <div className="flex items-center space-x-2 text-sm text-white/80" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
            <Clock className="w-4 h-4" />
            <span>Letzte Sync: {lastSync}</span>
          </div>
        )}

        {/* Sync message */}
        {syncMessage && (
          <div className={`p-2 rounded-lg text-sm ${
            syncMessage.includes('erfolgreich') 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Configuration hint */}
        {!hasValidConfig && (
          <div className="text-sm text-white/70" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
            Sync in den Einstellungen konfigurieren
          </div>
        )}
      </div>
    </div>
  );
} 