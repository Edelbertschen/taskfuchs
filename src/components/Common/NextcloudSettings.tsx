import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  getNextcloudService, 
  NextcloudConfig, 
  NextcloudVersion, 
  NextcloudSyncResult,
  NextcloudFileInfo,
  NextcloudConfigManager,
  downloadVersionAsFile
} from '../../utils/nextcloudService';
import { validateImportData } from '../../utils/importExport';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Cloud, 
  CloudOff, 
  Download, 
  Upload, 
  Settings, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Loader, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Calendar, 
  Clock, 
  HardDrive,
  Shield,
  FileCheck,
  CloudDrizzle,
  Archive
} from 'lucide-react';

interface NextcloudSettingsProps {
  onClose?: () => void;
}

export const NextcloudSettings: React.FC<NextcloudSettingsProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();

  // ===== STATE MANAGEMENT =====
  
  // Connection Config mit neuem ConfigManager
  const [config, setConfig] = useState<NextcloudConfig>(() => {
    // Migration alter Keys beim ersten Laden
    NextcloudConfigManager.migrateOldKeys();
    return NextcloudConfigManager.loadConfig();
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'connection' | 'sync' | 'versions' | 'advanced'>('connection');
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncResult, setLastSyncResult] = useState<NextcloudSyncResult | null>(null);

  // Versions State
  const [versions, setVersions] = useState<NextcloudVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<NextcloudVersion | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Existing Files State
  const [existingFiles, setExistingFiles] = useState<NextcloudFileInfo[]>([]);
  const [isLoadingExistingFiles, setIsLoadingExistingFiles] = useState(false);
  const [showExistingFilesModal, setShowExistingFilesModal] = useState(false);
  const [selectedExistingFile, setSelectedExistingFile] = useState<NextcloudFileInfo | null>(null);

  // ===== EFFECTS =====

  useEffect(() => {
    if (config.enabled && connectionStatus === 'connected') {
      loadVersions();
    }
  }, [config.enabled, connectionStatus]);

  // ===== CONNECTION METHODS =====

  const loadExistingFiles = async () => {
    setIsLoadingExistingFiles(true);
    try {
      const service = getNextcloudService(config);
      const files = await service.listRemoteFiles();
      
      // Filter für JSON-Dateien, die wie TaskFuchs-Exports aussehen
      const taskFuchsFiles = files.filter(file => 
        file.name.endsWith('.json') && 
        (file.name.startsWith('TaskFuchs_') || 
         file.name.toLowerCase().includes('taskfuchs') ||
         file.name.toLowerCase().includes('backup') ||
         file.name.toLowerCase().includes('export'))
      );
      
      setExistingFiles(taskFuchsFiles);
    } catch (error) {
      console.error('Failed to load existing files:', error);
      setExistingFiles([]);
    } finally {
      setIsLoadingExistingFiles(false);
    }
  };

  const adoptExistingFile = async (file: NextcloudFileInfo) => {
    try {
      const service = getNextcloudService(config);
      const fileContent = await service.downloadFile(file.name);
      const data = JSON.parse(fileContent);
      
      // Validate the file
      const validation = validateImportData(data);
      if (!validation.isComplete) {
        setConnectionMessage(`Datei ${file.name} ist unvollständig: ${validation.warnings.join(', ')}`);
        return;
      }
      
      setSelectedExistingFile(file);
      setConnectionMessage(`Datei ${file.name} als Sync-Basis ausgewählt. Diese wird bei der nächsten Synchronisation berücksichtigt.`);
      
      // Mark this file as the current baseline
      localStorage.setItem('nextcloud_baselineFile', file.name);
      localStorage.setItem('nextcloud_lastSync', file.lastModified);
      
    } catch (error) {
      setConnectionMessage(`Fehler beim Überprüfen der Datei ${file.name}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const saveConfig = () => {
    NextcloudConfigManager.saveConfig(config);
  };

  // ===== SYNC METHODS =====

  const performSync = async (forceUpload = false) => {
    if (connectionStatus !== 'connected') {
      setConnectionMessage('Bitte testen Sie zuerst die Verbindung');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Synchronisation wird gestartet...');

    try {
      const service = getNextcloudService(config);
      
      const appData = {
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes,
        tags: state.tags,
        boards: (state as any).boards || [],
        preferences: state.preferences,
        archivedTasks: (state as any).archivedTasks || [],
        noteLinks: (state.notes as any).noteLinks || [],
        viewState: (state as any).viewState || {},
        projectKanbanColumns: (state as any).projectKanbanColumns || [],
        projectKanbanState: (state as any).projectKanbanState || {}
      };

      const result = await service.syncData(appData, {
        forceUpload,
        onProgress: (progress, message) => {
          setSyncProgress(progress);
          setSyncMessage(message);
        }
      });

      setLastSyncResult(result);
      
      if (result.success) {
        setSyncMessage(
          result.uploaded 
            ? `Synchronisation erfolgreich! Neue Version erstellt: ${result.versionCreated?.filename}` 
            : 'Synchronisation erfolgreich! Keine Änderungen hochgeladen.'
        );
        
        // Versions-Liste aktualisieren
        await loadVersions();
        
      } else {
        setSyncMessage(`Synchronisation fehlgeschlagen: ${result.errors.join(', ')}`);
      }
      
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      
      // Message nach 5 Sekunden ausblenden
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // ===== VERSION METHODS =====

  const loadVersions = async () => {
    if (connectionStatus !== 'connected') return;

    setIsLoadingVersions(true);
    try {
      const service = getNextcloudService(config);
      const loadedVersions = await service.getAvailableVersions();
      setVersions(loadedVersions);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const restoreVersion = async (version: NextcloudVersion) => {
    if (!version) return;

    try {
      setIsSyncing(true);
      setSyncMessage(`Version wird wiederhergestellt: ${version.filename}`);

      const service = getNextcloudService(config);
      const restoredData = await service.restoreVersion(version.id);

      // Daten in App importieren
      dispatch({
        type: 'IMPORT_DATA_REPLACE',
        payload: {
          tasks: restoredData.tasks || [],
          boards: (restoredData as any).boards || [],
          columns: restoredData.columns || [],
          tags: restoredData.tags || [],
          notes: restoredData.notes || [],
          preferences: restoredData.preferences || {},
          viewState: (restoredData as any).viewState || {},
          projectKanbanColumns: (restoredData as any).projectKanbanColumns || [],
          projectKanbanState: (restoredData as any).projectKanbanState || {},
          pinColumns: (restoredData as any).pinColumns || []
        } as any
      });

      setSyncMessage(`Version erfolgreich wiederhergestellt: ${format(new Date(version.date), 'dd.MM.yyyy HH:mm')}`);
      setShowRestoreConfirm(false);
      setSelectedVersion(null);

    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const createManualVersion = async () => {
    if (connectionStatus !== 'connected') return;

    try {
      setIsSyncing(true);
      setSyncMessage('Manuelle Version wird erstellt...');

      const service = getNextcloudService(config);
      const appData = {
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes,
        tags: state.tags,
        boards: (state as any).boards || [],
        preferences: state.preferences,
        archivedTasks: (state as any).archivedTasks || [],
        noteLinks: (state.notes as any).noteLinks || [],
        viewState: (state as any).viewState || {},
        projectKanbanColumns: (state as any).projectKanbanColumns || [],
        projectKanbanState: (state as any).projectKanbanState || {}
      };

      const version = await service.createManualVersion(appData);
      setSyncMessage(`Manuelle Version erstellt: ${version.filename}`);
      
      // Versions-Liste aktualisieren
      await loadVersions();

    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Erstellung fehlgeschlagen');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // Download einer Version
  const downloadVersion = async (version: NextcloudVersion) => {
    try {
      setIsSyncing(true);
      setSyncMessage(`Version wird heruntergeladen: ${version.filename}`);

      const service = getNextcloudService(config);
      const data = await service.downloadData(version.id);
      
      downloadVersionAsFile(version, data);
      setSyncMessage(`Version erfolgreich heruntergeladen: ${version.filename}`);

    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Download fehlgeschlagen');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // ===== HELPER METHODS =====

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'testing':
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <CloudOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getVersionStatusBadge = (version: NextcloudVersion) => {
    const isToday = format(new Date(version.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isAutomatic = version.isAutomatic;

    if (isToday) {
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${
          isAutomatic 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
        }`}>
          {isAutomatic ? 'Heute (Auto)' : 'Heute (Manuell)'}
        </span>
      );
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        isAutomatic 
          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' 
          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
      }`}>
        {isAutomatic ? 'Automatisch' : 'Manuell'}
      </span>
    );
  };

  const testConnection = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      setConnectionMessage('Bitte füllen Sie alle Pflichtfelder aus');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('Verbindung wird getestet...');

    try {
      // Passwort in Session speichern für zukünftige Zugriffe
      NextcloudConfigManager.setSessionPassword(config.password);
      
      const service = getNextcloudService(config);
      
      // Test mit einem einfachen Sync ohne Upload
      await service.syncData({
        tasks: [],
        columns: [],
        notes: [],
        tags: [],
        boards: [],
        preferences: state.preferences
      }, { forceUpload: false });

      setConnectionStatus('connected');
      setConnectionMessage('Verbindung erfolgreich! ✓');
      
      // Konfiguration speichern (ohne Passwort)
      saveConfig();
      
      // Load existing files if connection is successful
      await loadExistingFiles();
      
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen');
    }
  };

  // ===== RENDER =====

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Cloud className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Nextcloud Synchronisation
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'connection', label: 'Verbindung', icon: CloudOff },
            { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
            { id: 'versions', label: 'Versionen', icon: History },
            { id: 'advanced', label: 'Erweitert', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          
          {/* CONNECTION TAB */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Transparente Datensicherung
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Ihre Daten werden als lesbare JSON-Dateien in Ihrer Nextcloud gespeichert. 
                      Sie können diese jederzeit herunterladen und manuell importieren.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connection Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Nextcloud-Verbindung
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Server-URL *
                    </label>
                    <input
                      type="url"
                      value={config.serverUrl}
                      onChange={(e) => setConfig({...config, serverUrl: e.target.value})}
                      placeholder="https://cloud.example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Benutzername *
                    </label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => setConfig({...config, username: e.target.value})}
                      placeholder="ihr-benutzername"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Passwort / App-Passwort *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={config.password}
                        onChange={(e) => setConfig({...config, password: e.target.value})}
                        placeholder="Ihr Passwort oder App-Passwort"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Empfohlen: Erstellen Sie ein App-Passwort in Ihren Nextcloud-Einstellungen
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync-Ordner
                    </label>
                    <input
                      type="text"
                      value={config.syncFolder}
                      onChange={(e) => setConfig({...config, syncFolder: e.target.value})}
                      placeholder="/TaskFuchs"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={testConnection}
                    disabled={connectionStatus === 'testing'}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                      connectionStatus === 'testing'
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {connectionStatus === 'testing' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>
                      {connectionStatus === 'testing' ? 'Verbindung testen...' : 'Verbindung testen'}
                    </span>
                  </button>
                </div>

                {/* Connection Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Verbindungsstatus
                  </h3>

                  <div className={`p-4 rounded-lg border-2 ${
                    connectionStatus === 'connected' 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : connectionStatus === 'error'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {getConnectionStatusIcon()}
                      <div>
                        <p className={`font-medium ${
                          connectionStatus === 'connected' ? 'text-green-800 dark:text-green-200'
                          : connectionStatus === 'error' ? 'text-red-800 dark:text-red-200'
                          : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {connectionStatus === 'connected' && 'Verbunden'}
                          {connectionStatus === 'testing' && 'Verbindung wird getestet...'}
                          {connectionStatus === 'error' && 'Verbindung fehlgeschlagen'}
                          {connectionStatus === 'idle' && 'Nicht verbunden'}
                        </p>
                        {connectionMessage && (
                          <p className={`text-sm mt-1 ${
                            connectionStatus === 'connected' ? 'text-green-600 dark:text-green-300'
                            : connectionStatus === 'error' ? 'text-red-600 dark:text-red-300'
                            : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {connectionMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {connectionStatus === 'connected' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Synchronisation aktiviert</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => {
                              const newConfig = {...config, enabled: e.target.checked};
                              setConfig(newConfig);
                              if (e.target.checked) saveConfig();
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing Files Section */}
                {connectionStatus === 'connected' && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Vorhandene Dateien
                    </h3>

                    {isLoadingExistingFiles ? (
                      <div className="text-center py-4">
                        <Loader className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Suche nach vorhandenen Dateien...
                        </p>
                      </div>
                    ) : existingFiles.length > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                {existingFiles.length} vorhandene Datei(en) gefunden
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Sie können eine dieser Dateien als Ausgangspunkt für die Synchronisation auswählen.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {existingFiles.map((file) => (
                            <div
                              key={file.name}
                              className={`border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-colors ${
                                selectedExistingFile?.name === file.name
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {file.name}
                                  </p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>{format(new Date(file.lastModified), 'dd.MM.yyyy HH:mm')}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => adoptExistingFile(file)}
                                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                    selectedExistingFile?.name === file.name
                                      ? 'bg-green-500 text-white'
                                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {selectedExistingFile?.name === file.name ? 'Ausgewählt' : 'Auswählen'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={loadExistingFiles}
                          disabled={isLoadingExistingFiles}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <RefreshCw className={`w-4 h-4 ${isLoadingExistingFiles ? 'animate-spin' : ''}`} />
                          <span>Aktualisieren</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Keine TaskFuchs-Dateien im Sync-Ordner gefunden
                        </p>
                        <button
                          onClick={loadExistingFiles}
                          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Erneut suchen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SYNC TAB */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {connectionStatus !== 'connected' ? (
                <div className="text-center py-8">
                  <CloudOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Bitte stellen Sie zuerst eine Verbindung her
                  </p>
                </div>
              ) : (
                <>
                  {/* Sync Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Manuelle Synchronisation
                      </h3>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => performSync(false)}
                          disabled={isSyncing}
                          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                            isSyncing
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {isSyncing ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span>Synchronisieren</span>
                        </button>

                        <button
                          onClick={() => performSync(true)}
                          disabled={isSyncing}
                          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                            isSyncing
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {isSyncing ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>Backup erstellen</span>
                        </button>
                      </div>

                      {/* Progress */}
                      {isSyncing && (
                        <div className="space-y-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${syncProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{syncMessage}</p>
                        </div>
                      )}

                      {/* Last Sync Result */}
                      {!isSyncing && syncMessage && (
                        <div className={`p-3 rounded-lg ${
                          lastSyncResult?.success 
                            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                        }`}>
                          <p className="text-sm">{syncMessage}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Sync-Einstellungen
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Automatische Synchronisation</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.autoSync}
                              onChange={(e) => {
                                const newConfig = {...config, autoSync: e.target.checked};
                                setConfig(newConfig);
                                saveConfig();
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sync-Intervall (Minuten)
                          </label>
                          <select
                            value={config.syncInterval}
                            onChange={(e) => {
                              const newConfig = {...config, syncInterval: parseInt(e.target.value)};
                              setConfig(newConfig);
                              saveConfig();
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value={15}>15 Minuten</option>
                            <option value={30}>30 Minuten</option>
                            <option value={60}>1 Stunde</option>
                            <option value={120}>2 Stunden</option>
                            <option value={360}>6 Stunden</option>
                            <option value={720}>12 Stunden</option>
                            <option value={1440}>24 Stunden</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Konfliktlösung
                          </label>
                          <select
                            value={config.conflictResolution}
                            onChange={(e) => {
                              const newConfig = {...config, conflictResolution: e.target.value as any};
                              setConfig(newConfig);
                              saveConfig();
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="manual">Manuell entscheiden</option>
                            <option value="local">Lokale Version bevorzugen</option>
                            <option value="remote">Remote-Version bevorzugen</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sync Statistics */}
                  {lastSyncResult && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Letzte Synchronisation
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`ml-2 font-medium ${
                            lastSyncResult.success ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lastSyncResult.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Upload:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {lastSyncResult.uploaded ? 'Ja' : 'Nein'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Größe:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {lastSyncResult.stats.uploadedSize ? formatFileSize(lastSyncResult.stats.uploadedSize) : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Versionen:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {lastSyncResult.stats.totalVersions}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* VERSIONS TAB */}
          {activeTab === 'versions' && (
            <div className="space-y-6">
              {connectionStatus !== 'connected' ? (
                <div className="text-center py-8">
                  <CloudOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Bitte stellen Sie zuerst eine Verbindung her
                  </p>
                </div>
              ) : (
                <>
                  {/* Version Controls */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Verfügbare Versionen
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={createManualVersion}
                        disabled={isSyncing}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                          isSyncing
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <Archive className="w-4 h-4" />
                        <span>Manuelle Version</span>
                      </button>
                      <button
                        onClick={loadVersions}
                        disabled={isLoadingVersions}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {isLoadingVersions ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>Aktualisieren</span>
                      </button>
                    </div>
                  </div>

                  {/* Version List */}
                  {isLoadingVersions ? (
                    <div className="text-center py-8">
                      <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Versionen werden geladen...</p>
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Noch keine Versionen gefunden
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Erstellen Sie Ihr erstes Backup über die Synchronisation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileCheck className="w-5 h-5 text-blue-500" />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {format(new Date(version.date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                  </p>
                                  {getVersionStatusBadge(version)}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="flex items-center space-x-1">
                                    <HardDrive className="w-3 h-3" />
                                    <span>{formatFileSize(version.size)}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{version.metadata.totalTasks} Aufgaben</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{version.metadata.totalNotes} Notizen</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => downloadVersion(version)}
                                disabled={isSyncing}
                                className="p-2 text-green-500 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Version als JSON herunterladen"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVersion(version);
                                  setShowVersionDetails(true);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Details anzeigen"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVersion(version);
                                  setShowRestoreConfirm(true);
                                }}
                                className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                                title="Version in App wiederherstellen"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Erweiterte Einstellungen
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anzahl Versionen pro Tag
                  </label>
                  <select
                    value={config.keepVersions}
                    onChange={(e) => {
                      const newConfig = {...config, keepVersions: parseInt(e.target.value)};
                      setConfig(newConfig);
                      saveConfig();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>1 Version (Standard)</option>
                    <option value={2}>2 Versionen</option>
                    <option value={3}>3 Versionen</option>
                    <option value={5}>5 Versionen</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Pro Tag wird nur die neueste Version(en) behalten. Ältere werden automatisch gelöscht.
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                        Datenschutz & Sicherheit
                      </h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                        <li>• Passwörter werden niemals lokal gespeichert</li>
                        <li>• Alle Daten werden unverschlüsselt als JSON übertragen</li>
                        <li>• Verwenden Sie HTTPS für sichere Übertragung</li>
                        <li>• App-Passwörter sind sicherer als Hauptpasswörter</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Manueller Dateizugriff
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Sie können Ihre Backup-Dateien jederzeit über den Nextcloud-Webclient oder die 
                        Mobile App herunterladen und manuell in TaskFuchs importieren. Die Dateien sind 
                        im Format <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">TaskFuchs_YYYY-MM-DD_HH-mm-ss_auto.json</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Version Details Modal */}
        {showVersionDetails && selectedVersion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Version Details
                </h3>
                <button
                  onClick={() => {
                    setShowVersionDetails(false);
                    setSelectedVersion(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dateiname</label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    {selectedVersion.filename}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Erstellt</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {format(new Date(selectedVersion.date), 'dd. MMMM yyyy, HH:mm', { locale: de })}
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({formatDistanceToNow(new Date(selectedVersion.date), { addSuffix: true, locale: de })})
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Größe</label>
                  <p className="text-sm text-gray-900 dark:text-white">{formatFileSize(selectedVersion.size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Inhalt</label>
                  <div className="text-sm text-gray-900 dark:text-white space-y-1">
                    <p>📋 {selectedVersion.metadata.totalTasks} Aufgaben</p>
                    <p>📝 {selectedVersion.metadata.totalNotes} Notizen</p>
                    <p>🏷️ {selectedVersion.metadata.totalTags} Tags</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Typ</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedVersion.isAutomatic ? 'Automatisch erstellt' : 'Manuell erstellt'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gerät</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedVersion.metadata.deviceName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Modal */}
        {showRestoreConfirm && selectedVersion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Version wiederherstellen
                </h3>
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setSelectedVersion(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      Möchten Sie diese Version wirklich wiederherstellen?
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <strong>Warnung:</strong> Alle aktuellen Daten werden durch die Version vom{' '}
                      {format(new Date(selectedVersion.date), 'dd.MM.yyyy HH:mm')} ersetzt.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setSelectedVersion(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => restoreVersion(selectedVersion)}
                    disabled={isSyncing}
                    className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                      isSyncing
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {isSyncing ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NextcloudSettings; 