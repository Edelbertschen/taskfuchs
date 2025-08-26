import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MaterialIcon } from './MaterialIcon';
import { todoistSyncManager } from '../../utils/todoistSyncManagerNew';

interface TodoistSyncStatusWidgetProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const TodoistSyncStatusWidget: React.FC<TodoistSyncStatusWidgetProps> = ({ 
  compact = false, 
  showDetails = false 
}) => {
  const { state } = useApp();
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [syncType, setSyncType] = useState<string>('');
  const [hasConflicts, setHasConflicts] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [circuitBreakerState, setCircuitBreakerState] = useState<string>('closed');

  useEffect(() => {
    const config = todoistSyncManager.getConfig();
    setIsConfigured(config?.enabled && config?.apiToken ? true : false);
    
    if (config?.lastSyncState) {
      setLastSyncTimestamp(config.lastSyncState.timestamp || null);
      setSyncType(config.lastSyncState.syncType || '');
    }
    
    // Check circuit breaker state
    if (config?.circuitBreaker) {
      setCircuitBreakerState(config.circuitBreaker.state);
    }
    
    // Check for conflicts in localStorage or context
    const conflicts = JSON.parse(localStorage.getItem('todoistConflicts') || '[]');
    setHasConflicts(conflicts.length > 0);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Format relative time
  const getRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Nie';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Gerade eben';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  // Get status color
  const getStatusColor = () => {
    if (!isConfigured) return '#6b7280'; // gray
    if (!isOnline) return '#ef4444'; // red
    if (circuitBreakerState === 'open') return '#dc2626'; // dark red - circuit breaker open
    if (circuitBreakerState === 'half-open') return '#f59e0b'; // amber - circuit breaker testing
    if (hasConflicts) return '#f59e0b'; // amber
    
    const timeSince = lastSyncTimestamp ? Date.now() - new Date(lastSyncTimestamp).getTime() : 0;
    const hoursSince = timeSince / (1000 * 60 * 60);
    
    if (hoursSince < 1) return '#22c55e'; // green - recent sync
    if (hoursSince < 6) return '#3b82f6'; // blue - somewhat recent
    if (hoursSince < 24) return '#f59e0b'; // amber - old sync
    return '#ef4444'; // red - very old sync
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isConfigured) return 'sync_disabled';
    if (!isOnline) return 'cloud_off';
    if (circuitBreakerState === 'open') return 'block';
    if (circuitBreakerState === 'half-open') return 'sync_problem';
    if (hasConflicts) return 'warning';
    return 'sync';
  };

  // Get status text
  const getStatusText = () => {
    if (!isConfigured) return 'Nicht konfiguriert';
    if (!isOnline) return 'Offline';
    if (circuitBreakerState === 'open') return 'Circuit Breaker offen';
    if (circuitBreakerState === 'half-open') return 'Circuit Breaker testet';
    if (hasConflicts) return `${JSON.parse(localStorage.getItem('todoistConflicts') || '[]').length} Konflikte`;
    return getRelativeTime(lastSyncTimestamp);
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getStatusColor() }}
          title={`Todoist Sync: ${getStatusText()}`}
        />
        {showDetails && (
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {getRelativeTime(lastSyncTimestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center space-x-1">
        <MaterialIcon 
          name={getStatusIcon()} 
          className="w-4 h-4" 
          style={{ color: getStatusColor() }} 
        />
        <span 
          className="text-xs font-medium"
          style={{ color: getStatusColor() }}
        >
          Todoist
        </span>
      </div>
      
      {showDetails && (
        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
          <span>{getStatusText()}</span>
          {syncType && (
            <span 
              className="px-1 py-0.5 rounded text-xs"
              style={{ 
                backgroundColor: syncType === 'incremental' ? '#dbeafe' : '#dcfce7',
                color: syncType === 'incremental' ? '#1e40af' : '#166534'
              }}
            >
              {syncType === 'incremental' ? 'Inc' : 'Full'}
            </span>
          )}
          {hasConflicts && (
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}; 