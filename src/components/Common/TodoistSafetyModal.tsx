import React, { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Eye, Download, RotateCcw, Settings, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  SyncSafetyManager, 
  SafetySyncConfig, 
  SyncPreview, 
  defaultSafetyConfig,
  SyncBackup,
  SyncConflict,
  SafetyWarning 
} from '../../utils/todoistSyncSafety';

interface TodoistSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSync: (safetyConfig: SafetySyncConfig) => void;
  syncPreview?: SyncPreview;
  mode: 'settings' | 'preview' | 'backups';
}

export const TodoistSafetyModal: React.FC<TodoistSafetyModalProps> = ({
  isOpen,
  onClose,
  onConfirmSync,
  syncPreview,
  mode = 'settings'
}) => {
  const { state } = useApp();
  const [safetyConfig, setSafetyConfig] = useState<SafetySyncConfig>(defaultSafetyConfig);
  const [safetyManager] = useState(() => new SyncSafetyManager());
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'backups' | 'audit'>('config');
  const [statistics, setStatistics] = useState(safetyManager.getSafetyStatistics());
  
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  useEffect(() => {
    if (isOpen && mode === 'preview') {
      setActiveTab('preview');
    } else if (isOpen && mode === 'backups') {
      setActiveTab('backups');
    } else {
      setActiveTab('config');
    }
    
    // Update statistics when modal opens
    if (isOpen) {
      setStatistics(safetyManager.getSafetyStatistics());
    }
  }, [isOpen, mode]);
  
  if (!isOpen) return null;
  
  const handleConfigChange = (key: keyof SafetySyncConfig, value: any) => {
    setSafetyConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleConfirmationChange = (key: keyof SafetySyncConfig['confirmationRequired'], value: boolean) => {
    setSafetyConfig(prev => ({
      ...prev,
      confirmationRequired: {
        ...prev.confirmationRequired,
        [key]: value
      }
    }));
  };
  
  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    }
  };
  
  const getSeverityColor = (severity: 'info' | 'warning' | 'error' | 'critical') => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30 font-bold';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
             style={{ backgroundColor: `${accentColor}10` }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: accentColor }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Todoist-Sync Sicherheit
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ihre Daten sind geschützt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'config', label: 'Sicherheitseinstellungen', icon: Settings },
              { id: 'preview', label: 'Sync-Vorschau', icon: Eye },
              { id: 'backups', label: 'Backups', icon: Download },
              { id: 'audit', label: 'Audit-Log', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-current text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  style={activeTab === tab.id ? { borderColor: accentColor, color: accentColor } : {}}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          
          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Backup Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Download className="w-5 h-5 mr-2" style={{ color: accentColor }} />
                  Backup-Einstellungen
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Automatische Backups
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Backup vor jedem Sync
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safetyConfig.autoBackupBeforeSync}
                        onChange={(e) => handleConfigChange('autoBackupBeforeSync', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                        style={safetyConfig.autoBackupBeforeSync ? { backgroundColor: accentColor } : {}}
                      />
                    </label>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Backup-Aufbewahrung
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={safetyConfig.maxBackupRetention}
                      onChange={(e) => handleConfigChange('maxBackupRetention', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        '--tw-ring-color': accentColor,
                        borderColor: `${accentColor}40`
                      } as React.CSSProperties}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Anzahl der aufbewahrten Backups
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Safe Mode Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" style={{ color: accentColor }} />
                  Sicherheitsmodi
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Safe Mode
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Nur Hinzufügungen und Updates
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safetyConfig.safeMode}
                        onChange={(e) => handleConfigChange('safeMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                        style={safetyConfig.safeMode ? { backgroundColor: accentColor } : {}}
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Dry Run Modus
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Nur Vorschau, keine Änderungen
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safetyConfig.dryRunMode}
                        onChange={(e) => handleConfigChange('dryRunMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                        style={safetyConfig.dryRunMode ? { backgroundColor: accentColor } : {}}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Confirmation Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" style={{ color: accentColor }} />
                  Bestätigungsanfragen
                </h3>
                
                <div className="space-y-3">
                  {[
                    { key: 'taskDeletions', label: 'Aufgaben-Löschungen', desc: 'Bestätigung bei gelöschten Aufgaben' },
                    { key: 'columnDeletions', label: 'Spalten-Löschungen', desc: 'Bestätigung bei gelöschten Spalten' },
                    { key: 'bulkOperations', label: 'Massenoperationen', desc: 'Bestätigung bei vielen Änderungen' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {setting.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {setting.desc}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                                                 <input
                           type="checkbox"
                           checked={safetyConfig.confirmationRequired[setting.key as keyof SafetySyncConfig['confirmationRequired']] as boolean}
                           onChange={(e) => handleConfirmationChange(setting.key as keyof SafetySyncConfig['confirmationRequired'], e.target.checked)}
                           className="sr-only peer"
                         />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                                                     style={(safetyConfig.confirmationRequired[setting.key as keyof SafetySyncConfig['confirmationRequired']] as boolean) ? { backgroundColor: accentColor } : {}}
                         />
                      </label>
                    </div>
                  ))}
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schwellenwert für Massenoperationen
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={safetyConfig.confirmationRequired.bulkOperationThreshold}
                      onChange={(e) => setSafetyConfig(prev => ({
                        ...prev,
                        confirmationRequired: {
                          ...prev.confirmationRequired,
                          bulkOperationThreshold: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        '--tw-ring-color': accentColor,
                        borderColor: `${accentColor}40`
                      } as React.CSSProperties}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Bestätigung ab dieser Anzahl von Änderungen
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Sync Preview Tab */}
          {activeTab === 'preview' && syncPreview && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-6 rounded-xl border"
                   style={{
                     background: `linear-gradient(to right, ${accentColor}10, ${accentColor}20)`,
                     borderColor: `${accentColor}40`
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sync-Vorschau
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(syncPreview.summary.riskLevel)}`}>
                    {syncPreview.summary.riskLevel === 'low' ? 'Sicher' :
                     syncPreview.summary.riskLevel === 'medium' ? 'Moderat' : 'Riskant'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white"
                         style={{ color: accentColor }}>
                      {syncPreview.summary.totalChanges}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Änderungen
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white"
                         style={{ color: accentColor }}>
                      {syncPreview.summary.estimatedDuration}s
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Geschätzte Dauer
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white"
                         style={{ color: accentColor }}>
                      {syncPreview.estimatedApiCalls}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      API-Aufrufe
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white"
                         style={{ color: accentColor }}>
                      {syncPreview.summary.reversible ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Umkehrbar
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Safety Warnings */}
              {syncPreview.safetyWarnings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Sicherheitswarnungen</h4>
                  {syncPreview.safetyWarnings.map((warning, index) => (
                    <div key={index} className={`p-4 rounded-lg ${getSeverityColor(warning.severity)}`}>
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5" />
                        <div>
                          <div className="font-medium">{warning.title}</div>
                          <div className="text-sm mt-1">{warning.message}</div>
                          <div className="text-sm mt-2 italic">{warning.recommendation}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Changes Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Aufgaben-Änderungen</h4>
                  <div className="space-y-2">
                    {syncPreview.tasks.toCreate.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-green-800 dark:text-green-200">Erstellen</span>
                        <span className="font-medium">{syncPreview.tasks.toCreate.length}</span>
                      </div>
                    )}
                    {syncPreview.tasks.toUpdate.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-blue-800 dark:text-blue-200">Aktualisieren</span>
                        <span className="font-medium">{syncPreview.tasks.toUpdate.length}</span>
                      </div>
                    )}
                    {syncPreview.tasks.toDelete.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-red-800 dark:text-red-200">Löschen</span>
                        <span className="font-medium">{syncPreview.tasks.toDelete.length}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Spalten-Änderungen</h4>
                  <div className="space-y-2">
                    {syncPreview.columns.toCreate.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-green-800 dark:text-green-200">Erstellen</span>
                        <span className="font-medium">{syncPreview.columns.toCreate.length}</span>
                      </div>
                    )}
                    {syncPreview.columns.toUpdate.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-blue-800 dark:text-blue-200">Aktualisieren</span>
                        <span className="font-medium">{syncPreview.columns.toUpdate.length}</span>
                      </div>
                    )}
                    {syncPreview.columns.toDelete.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-red-800 dark:text-red-200">Löschen</span>
                        <span className="font-medium">{syncPreview.columns.toDelete.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Backup-Verwaltung
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {statistics.backups.count} Backups • {Math.round(statistics.backups.totalSize / 1024)}KB
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-center py-8">
                  <Download className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Noch keine Backups
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Backups werden automatisch vor jeder Synchronisation erstellt
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Audit-Protokoll
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {statistics.auditLog.entries} Einträge • {statistics.auditLog.errorRate}% Fehlerrate
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Protokoll ist leer
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Alle Sync-Operationen werden hier protokolliert
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {safetyConfig.safeMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mr-2">
                  Safe Mode aktiv
                </span>
              )}
              {safetyConfig.dryRunMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Dry Run aktiv
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Abbrechen
              </button>
              
              {mode === 'preview' && syncPreview && (
                <button
                  onClick={() => onConfirmSync(safetyConfig)}
                  className="px-6 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  {safetyConfig.dryRunMode ? 'Dry Run starten' : 'Sync bestätigen'}
                </button>
              )}
              
              {mode === 'settings' && (
                <button
                  onClick={() => onConfirmSync(safetyConfig)}
                  className="px-6 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  Einstellungen speichern
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 