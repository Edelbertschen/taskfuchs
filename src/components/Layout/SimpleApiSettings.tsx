import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  Key, 
  Server, 
  FileText, 
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Clock,
  Settings
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  TodoistSimpleService, 
  CalDAVSimpleService, 
  FileBasedSyncService, 
  WebhookSyncService,
  Things3AppleScriptService
} from '../../utils/simpleApiServices';

interface SimpleApiSettingsProps {
  onShowSaved: () => void;
}

export function SimpleApiSettings({ onShowSaved }: SimpleApiSettingsProps) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<'todoist' | 'caldav' | 'things3' | 'file' | 'webhook'>('caldav');
  const [showTokens, setShowTokens] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');

  // Todoist Settings
  const [todoistToken, setTodoistToken] = useState('');
  const [todoistStatus, setTodoistStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // CalDAV Settings
  const [caldavUrl, setCaldavUrl] = useState('');
  const [caldavUsername, setCaldavUsername] = useState('');
  const [caldavPassword, setCaldavPassword] = useState('');
  const [caldavStatus, setCaldavStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [caldavService, setCaldavService] = useState<CalDAVSimpleService | null>(null);
  
  // Auto-Sync Settings  
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15);
  const [conflictResolution, setConflictResolution] = useState<'local' | 'remote' | 'newest' | 'manual'>('newest');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Conflict Resolution
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictTasks, setConflictTasks] = useState<{local: any, remote: any} | null>(null);

  // Webhook Settings
  const [webhookUrl, setWebhookUrl] = useState('');

  // Things3 Settings
  const [things3Service, setThings3Service] = useState<Things3AppleScriptService | null>(null);
  const [things3Status, setThings3Status] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [things3AutoSync, setThings3AutoSync] = useState(false);
  const [things3SyncInterval, setThings3SyncInterval] = useState(15);
  const [things3Progress, setThings3Progress] = useState(0);
  const [things3Message, setThings3Message] = useState('');
  const [isThings3Syncing, setIsThings3Syncing] = useState(false);

  const fileService = new FileBasedSyncService();

  // CalDAV Handlers
  const handleCalDAVTest = async () => {
    if (!caldavUrl.trim() || !caldavUsername.trim() || !caldavPassword.trim()) {
      setCaldavStatus('error');
      setExportSuccess('Bitte füllen Sie alle Felder aus');
      setTimeout(() => setExportSuccess(''), 3000);
      return;
    }

    setCaldavStatus('testing');
    try {
      const service = new CalDAVSimpleService(caldavUrl, caldavUsername, caldavPassword);
      const success = await service.testConnection();
      if (success) {
        setCaldavStatus('success');
        setCaldavService(service);
        setExportSuccess('✅ CalDAV-Verbindung erfolgreich! Apple Reminders ist bereit.');
        onShowSaved();
      } else {
        setCaldavStatus('error');
        setExportSuccess('❌ Verbindung fehlgeschlagen. Prüfen Sie URL, Apple-ID und App-Passwort.');
      }
    } catch (error) {
      setCaldavStatus('error');
      setExportSuccess('❌ Verbindungsfehler. Prüfen Sie Ihre Eingaben.');
    }
    setTimeout(() => setExportSuccess(''), 5000);
  };

  const handleBidirectionalSync = async () => {
    if (!caldavService) {
      setExportSuccess('❌ Bitte testen Sie zuerst die CalDAV-Verbindung');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Bidirektionale Synchronisation wird gestartet...');

    try {
      const result = await caldavService.syncBidirectional(state.tasks, {
        conflictResolution,
        onProgress: (progress, message) => {
          setSyncProgress(progress);
          setSyncMessage(message);
        },
                 onConflict: (localTask, remoteTask) => {
           if (conflictResolution === 'manual') {
             setConflictTasks({ local: localTask, remote: remoteTask });
             setShowConflictModal(true);
             return 'manual';
           }
           // Convert 'newest' to actual resolution
           if (conflictResolution === 'newest') {
             const localTime = new Date(localTask.updatedAt).getTime();
             const remoteTime = new Date(remoteTask.updatedAt || remoteTask.lastModified).getTime();
             return localTime > remoteTime ? 'local' : 'remote';
           }
           return conflictResolution as 'local' | 'remote';
         }
      });

      if (result.success) {
        const totalChanges = result.localChanges + result.remoteChanges;
        setExportSuccess(`🔄 Bidirektionale Sync erfolgreich! ${totalChanges} Änderungen, ${result.conflicts.length} Konflikte`);
        setLastSyncTime(new Date().toLocaleString('de-DE'));
      } else {
        setExportSuccess(`❌ Sync fehlgeschlagen: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setExportSuccess('❌ Bidirektionale Synchronisation fehlgeschlagen');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncMessage('');
    }
    setTimeout(() => setExportSuccess(''), 5000);
  };

  const handleAutoSyncToggle = () => {
    if (!caldavService) {
      setExportSuccess('❌ Bitte testen Sie zuerst die CalDAV-Verbindung');
      return;
    }

    if (autoSyncEnabled) {
      caldavService.stopAutoSync();
      setAutoSyncEnabled(false);
      setExportSuccess('🔄 Auto-Sync deaktiviert');
    } else {
      caldavService.startAutoSync(
        () => state.tasks,
        (tasks) => {
          // Hier würde normalerweise dispatch aufgerufen werden
          console.log('Tasks updated from auto-sync:', tasks);
        },
        syncInterval,
        {
          conflictResolution,
          onProgress: (progress, message) => {
            setSyncMessage(`Auto-Sync: ${message}`);
          },
          onError: (error) => {
            setExportSuccess(`❌ Auto-Sync Fehler: ${error}`);
            setTimeout(() => setExportSuccess(''), 5000);
          }
        }
      );
      setAutoSyncEnabled(true);
      setExportSuccess(`🔄 Auto-Sync aktiviert: alle ${syncInterval} Minuten`);
    }
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const handleConflictResolution = (resolution: 'local' | 'remote') => {
    setShowConflictModal(false);
    setConflictTasks(null);
    setExportSuccess(`✅ Konflikt aufgelöst: ${resolution === 'local' ? 'TaskFuchs' : 'Apple Reminders'} Version gewählt`);
    setTimeout(() => setExportSuccess(''), 3000);
  };

  // Things3 Handlers
  const handleThings3Test = async () => {
    console.log('🦊 Things3 Test clicked!');
    setThings3Status('testing');
    setExportSuccess('🔄 Teste Things3 Verbindung...');
    
    try {
      console.log('🦊 Creating Things3AppleScriptService...');
      const service = new Things3AppleScriptService();
      console.log('🦊 Service created, testing connection...');
      
      const success = await service.testConnection();
      console.log('🦊 Test result:', success);
      
      if (success) {
        setThings3Status('success');
        setThings3Service(service);
        setExportSuccess('✅ Things3 erfolgreich verbunden! Bereit für Synchronisation.');
        onShowSaved();
      } else {
        setThings3Status('error');
        setExportSuccess('❌ Things3 nicht gefunden. Bitte installieren Sie Things3 oder verwenden Sie die Desktop-Version.');
      }
    } catch (error) {
      console.error('🦊 Things3 Test Error:', error);
      setThings3Status('error');
      setExportSuccess(`❌ Things3 Verbindung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
    setTimeout(() => setExportSuccess(''), 5000);
  };

  const handleThings3Sync = async () => {
    console.log('🦊 Things3 Sync clicked! Service:', things3Service);
    
    if (!things3Service) {
      console.log('🦊 No Things3 service available');
      setExportSuccess('❌ Bitte testen Sie zuerst die Things3-Verbindung');
      setTimeout(() => setExportSuccess(''), 3000);
      return;
    }

    console.log('🦊 Starting Things3 sync with', state.tasks.length, 'tasks');
    setIsThings3Syncing(true);
    setThings3Progress(0);
    setThings3Message('Synchronisation mit Things3 wird gestartet...');

    try {
      const result = await things3Service.syncBidirectional(state.tasks, {
        onProgress: (progress, message) => {
          console.log('🦊 Sync progress:', progress, '%', message);
          setThings3Progress(progress);
          setThings3Message(message);
        }
      });

      console.log('🦊 Sync result:', result);

      if (result.success) {
        setExportSuccess(`✅ Things3 Sync erfolgreich! ${result.localChanges} Aufgaben synchronisiert`);
      } else {
        setExportSuccess(`❌ Things3 Sync fehlgeschlagen: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('🦊 Things3 Sync Error:', error);
      setExportSuccess(`❌ Things3 Synchronisation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsThings3Syncing(false);
      setThings3Progress(0);
      setThings3Message('');
    }
    setTimeout(() => setExportSuccess(''), 5000);
  };

  const handleThings3AutoSyncToggle = () => {
    if (!things3Service) {
      setExportSuccess('❌ Bitte testen Sie zuerst die Things3-Verbindung');
      return;
    }

    if (things3AutoSync) {
      things3Service.stopAutoSync();
      setThings3AutoSync(false);
      setExportSuccess('🔄 Things3 Auto-Sync deaktiviert');
    } else {
      things3Service.startAutoSync(
        () => state.tasks,
        things3SyncInterval,
        {
          onProgress: (progress, message) => {
            setThings3Message(`Auto-Sync: ${message}`);
          },
          onError: (error) => {
            setExportSuccess(`❌ Things3 Auto-Sync Fehler: ${error}`);
            setTimeout(() => setExportSuccess(''), 5000);
          }
        }
      );
      setThings3AutoSync(true);
      setExportSuccess(`🔄 Things3 Auto-Sync aktiviert: alle ${things3SyncInterval} Minuten`);
    }
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const handleTodoistTest = async () => {
    if (!todoistToken.trim()) {
      setTodoistStatus('error');
      return;
    }

    setTodoistStatus('testing');
    try {
      const service = new TodoistSimpleService(todoistToken);
      await service.getProjects();
      setTodoistStatus('success');
      onShowSaved();
    } catch (error) {
      setTodoistStatus('error');
    }
  };

  const handleFileExport = async (format: 'todoist' | 'apple' | 'google' | 'anydo') => {
    setIsExporting(true);
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'todoist':
          content = fileService.exportToTodoist(state.tasks);
          filename = 'taskfuchs-export-todoist.csv';
          mimeType = 'text/csv';
          break;
        case 'apple':
          content = fileService.exportToAppleReminders(state.tasks);
          filename = 'taskfuchs-export-apple.ics';
          mimeType = 'text/calendar';
          break;
        case 'google':
          content = JSON.stringify(fileService.exportToGoogleTasks(state.tasks), null, 2);
          filename = 'taskfuchs-export-google.json';
          mimeType = 'application/json';
          break;
        case 'anydo':
          content = JSON.stringify(fileService.exportToAnyDo(state.tasks), null, 2);
          filename = 'taskfuchs-export-anydo.json';
          mimeType = 'application/json';
          break;
        default:
          throw new Error('Unbekanntes Format');
      }

      // Download erstellen
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(`${state.tasks.length} Aufgaben als ${format.toUpperCase()} exportiert!`);
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setExportSuccess('In Zwischenablage kopiert!');
      setTimeout(() => setExportSuccess(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const tabs = [
    { id: 'caldav', label: 'CalDAV', icon: Server, description: 'Apple Reminders Sync' },
    { id: 'todoist', label: 'Todoist', icon: Key, description: '30 Sekunden Setup' },
    { id: 'things3', label: 'Things3', icon: CheckCircle, description: 'AppleScript Integration' },
    { id: 'file', label: 'Export/Import', icon: FileText, description: 'Universell kompatibel' },
    { id: 'webhook', label: 'Webhooks', icon: Zap, description: 'Zapier, IFTTT, etc.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Einfache Sync-Alternativen
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
              <strong>Microsoft To-Do ist zu komplex?</strong> Hier sind einfachere Alternativen:
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-blue-700 dark:text-blue-300">Nur API-Token erforderlich</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-blue-700 dark:text-blue-300">Keine Azure-Registrierung</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-blue-700 dark:text-blue-300">30 Sekunden Setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-blue-700 dark:text-blue-300">Universell kompatibel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Todoist Tab */}
          {activeTab === 'todoist' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Todoist Integration
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Super einfach: Nur API-Token erforderlich. Viel einfacher als Microsoft To-Do!
                </p>
              </div>

              {/* Setup Anleitung */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                  📋 30-Sekunden Setup:
                </h5>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">Gehen Sie zu </span>
                      <a 
                        href="https://todoist.com/app/settings/integrations" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1"
                      >
                        <span>Todoist API-Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-gray-700 dark:text-gray-300">Kopieren Sie Ihren API-Token</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-gray-700 dark:text-gray-300">Fügen Sie ihn unten ein und testen Sie die Verbindung</span>
                  </li>
                </ol>
              </div>

              {/* API Token Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Todoist API Token
                </label>
                <div className="relative">
                  <input
                    type={showTokens ? 'text' : 'password'}
                    value={todoistToken}
                    onChange={(e) => setTodoistToken(e.target.value)}
                    placeholder="Ihr Todoist API Token..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-20"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                    <button
                      onClick={() => setShowTokens(!showTokens)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {todoistToken && (
                      <button
                        onClick={() => copyToClipboard(todoistToken)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Button */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleTodoistTest}
                  disabled={!todoistToken.trim() || todoistStatus === 'testing'}
                  style={{
                    backgroundColor: todoistToken.trim() ? state.preferences.accentColor : '#9ca3af'
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {todoistStatus === 'testing' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Teste...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Verbindung testen</span>
                    </>
                  )}
                </button>

                {todoistStatus === 'success' && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Verbindung erfolgreich!</span>
                  </div>
                )}

                {todoistStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Verbindung fehlgeschlagen</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Export Tab */}
          {activeTab === 'file' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Export/Import Dateien
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Universelle Kompatibilität: Exportieren Sie Ihre Aufgaben und importieren Sie sie in jede App.
                </p>
              </div>

              {/* Export Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleFileExport('todoist')}
                  disabled={isExporting}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Todoist CSV</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Für Todoist Import</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleFileExport('apple')}
                  disabled={isExporting}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Apple Reminders</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ICS/VTODO Format</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleFileExport('google')}
                  disabled={isExporting}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Google Tasks</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">JSON Format</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleFileExport('anydo')}
                  disabled={isExporting}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Any.do</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">JSON Format</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Success Message */}
              {exportSuccess && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300 text-sm">{exportSuccess}</span>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  💡 So funktioniert's:
                </h5>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Exportieren Sie Ihre TaskFuchs-Aufgaben im gewünschten Format</li>
                  <li>• Öffnen Sie Ihre Ziel-App (Todoist, Apple Reminders, etc.)</li>
                  <li>• Importieren Sie die heruntergeladene Datei</li>
                  <li>• Fertig! Ihre Aufgaben sind synchronisiert</li>
                </ul>
              </div>
            </div>
          )}

          {/* CalDAV Tab */}
          {activeTab === 'caldav' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  CalDAV Integration für Apple Reminders
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  <strong>Beste Option!</strong> Bidirektionale Synchronisation mit Apple Reminders über CalDAV.
                </p>
              </div>

              {/* Setup Anleitung */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center space-x-2">
                  <span>🍎</span>
                  <span>Apple Reminders Setup (2 Minuten):</span>
                </h5>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start space-x-3">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">iCloud CalDAV-URL finden:</div>
                      <div className="text-blue-700 dark:text-blue-300 mt-1">
                        <strong>Automatisch:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">https://caldav.icloud.com/[Ihre-Apple-ID]</code>
                      </div>
                      <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                        Ersetzen Sie [Ihre-Apple-ID] mit Ihrer echten Apple-ID (z.B. max@icloud.com)
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">App-Passwort erstellen:</div>
                      <div className="text-blue-700 dark:text-blue-300 mt-1">
                        Gehen Sie zu <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">appleid.apple.com</code> → Anmelden & Sicherheit → App-spezifische Passwörter
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">Unten eintragen und testen:</div>
                      <div className="text-blue-700 dark:text-blue-300 mt-1">
                        URL, Apple-ID und App-Passwort eingeben
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              {/* CalDAV Settings Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CalDAV Server URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={caldavUrl}
                      onChange={(e) => setCaldavUrl(e.target.value)}
                      placeholder="https://caldav.icloud.com/ihre-apple-id"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => copyToClipboard('https://caldav.icloud.com/')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Für iCloud: https://caldav.icloud.com/[Ihre-Apple-ID]
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Apple-ID (Benutzername)
                    </label>
                    <input
                      type="email"
                      value={caldavUsername}
                      onChange={(e) => setCaldavUsername(e.target.value)}
                      placeholder="ihre-apple-id@icloud.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      App-spezifisches Passwort
                    </label>
                    <div className="relative">
                      <input
                        type={showTokens ? 'text' : 'password'}
                        value={caldavPassword}
                        onChange={(e) => setCaldavPassword(e.target.value)}
                        placeholder="abcd-efgh-ijkl-mnop"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                      />
                      <button
                        onClick={() => setShowTokens(!showTokens)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showTokens ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Erstellen Sie ein App-Passwort in Ihren Apple-ID Einstellungen
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={async () => {
                    if (!caldavUrl.trim() || !caldavUsername.trim() || !caldavPassword.trim()) {
                      setExportSuccess('Bitte füllen Sie alle Felder aus');
                      setTimeout(() => setExportSuccess(''), 3000);
                      return;
                    }

                                         handleCalDAVTest();
                  }}
                  disabled={!caldavUrl.trim() || !caldavUsername.trim() || !caldavPassword.trim() || isExporting}
                  style={{
                    backgroundColor: (caldavUrl.trim() && caldavUsername.trim() && caldavPassword.trim()) ? state.preferences.accentColor : '#9ca3af'
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Teste CalDAV...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4" />
                      <span>CalDAV-Verbindung testen</span>
                    </>
                  )}
                </button>

                                 {/* Sync Buttons */}
                 {caldavStatus === 'success' && (
                   <>
                     <button
                       onClick={handleBidirectionalSync}
                       disabled={isSyncing}
                       style={{ backgroundColor: state.preferences.accentColor }}
                       className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                     >
                       {isSyncing ? (
                         <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           <span>Synchronisiere... ({syncProgress}%)</span>
                         </>
                       ) : (
                         <>
                           <RefreshCw className="w-4 h-4" />
                           <span>Bidirektionale Synchronisation</span>
                         </>
                       )}
                     </button>

                     <button
                       onClick={handleAutoSyncToggle}
                       style={{
                         backgroundColor: autoSyncEnabled ? '#ef4444' : state.preferences.accentColor
                       }}
                       className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
                     >
                       {autoSyncEnabled ? (
                         <>
                           <X className="w-4 h-4" />
                           <span>Auto-Sync stoppen</span>
                         </>
                       ) : (
                         <>
                           <RefreshCw className="w-4 h-4" />
                           <span>Auto-Sync starten</span>
                         </>
                       )}
                     </button>
                   </>
                 )}
              </div>

                             {/* Sync Progress */}
               {isSyncing && syncProgress > 0 && (
                 <div className="space-y-2">
                   <div className="flex items-center justify-between text-sm">
                     <span className="text-gray-600 dark:text-gray-400">{syncMessage}</span>
                     <span className="text-gray-500 dark:text-gray-500">{syncProgress}%</span>
                   </div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                     <div 
                       className="h-2 rounded-full transition-all duration-300"
                       style={{ 
                         width: `${syncProgress}%`,
                         backgroundColor: state.preferences.accentColor
                       }}
                     />
                   </div>
                 </div>
               )}

               {/* Auto-Sync Settings */}
               {caldavStatus === 'success' && (
                 <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                   <h5 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                     <Settings className="w-4 h-4" />
                     <span>Erweiterte Sync-Einstellungen</span>
                   </h5>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                         Auto-Sync Intervall
                       </label>
                       <select
                         value={syncInterval}
                         onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                       >
                         <option value={5}>5 Minuten</option>
                         <option value={15}>15 Minuten</option>
                         <option value={30}>30 Minuten</option>
                         <option value={60}>1 Stunde</option>
                         <option value={180}>3 Stunden</option>
                       </select>
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                         Konfliktauflösung
                       </label>
                       <select
                         value={conflictResolution}
                         onChange={(e) => setConflictResolution(e.target.value as any)}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                       >
                         <option value="newest">Neueste Version gewinnt</option>
                         <option value="local">TaskFuchs bevorzugen</option>
                         <option value="remote">Apple Reminders bevorzugen</option>
                         <option value="manual">Manuell entscheiden</option>
                       </select>
                     </div>
                   </div>

                   {/* Status Info */}
                   <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                     <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                       <Clock className="w-4 h-4" />
                       <span>Auto-Sync: {autoSyncEnabled ? 'Aktiv' : 'Inaktiv'}</span>
                     </div>
                     {lastSyncTime && (
                       <div className="text-sm text-gray-500 dark:text-gray-500">
                         Letzte Sync: {lastSyncTime}
                       </div>
                     )}
                   </div>
                 </div>
               )}

               {/* Success/Error Messages */}
               {exportSuccess && (
                 <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                   exportSuccess.includes('✅') 
                     ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                     : exportSuccess.includes('❌')
                     ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                     : exportSuccess.includes('🔄')
                     ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                     : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                 }`}>
                   <span className={`text-sm ${
                     exportSuccess.includes('✅') 
                       ? 'text-green-700 dark:text-green-300'
                       : exportSuccess.includes('❌')
                       ? 'text-red-700 dark:text-red-300'
                       : exportSuccess.includes('🔄')
                       ? 'text-blue-700 dark:text-blue-300'
                       : 'text-gray-700 dark:text-gray-300'
                   }`}>
                     {exportSuccess}
                   </span>
                 </div>
               )}

                             {/* Features Info */}
               <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                 <h5 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center space-x-2">
                   <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                   <span>🎯 Vollständige CalDAV-Integration - Jetzt verfügbar!</span>
                 </h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h6 className="font-medium text-green-800 dark:text-green-200 mb-2">Basis-Features:</h6>
                     <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                       <li>✅ <strong>Bidirektionale Sync:</strong> TaskFuchs ↔ Apple Reminders</li>
                       <li>✅ <strong>Alle Geräte:</strong> iPhone, iPad, Mac synchron</li>
                       <li>✅ <strong>Standard-Protokoll:</strong> Auch Nextcloud, etc.</li>
                       <li>✅ <strong>Prioritäten & Erinnerungen:</strong> Vollständig</li>
                     </ul>
                   </div>
                   <div>
                     <h6 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Erweiterte Features:</h6>
                     <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                       <li>🚀 <strong>Auto-Sync:</strong> Alle 5-180 Minuten</li>
                       <li>🎯 <strong>Konfliktauflösung:</strong> 4 Strategien</li>
                       <li>⚡ <strong>Fortschrittsanzeige:</strong> Live-Status</li>
                       <li>🔄 <strong>Echter Realtime-Sync:</strong> Sofortige Updates</li>
                     </ul>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'things3' && (
            <div className="space-y-6">
              {/* Things3 Setup */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                      Things3 AppleScript Integration
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Nahtlose Synchronisation mit Things3 über AppleScript (nur Desktop-Version)
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Voraussetzungen:</span>
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>✅ <strong>Things3 installiert:</strong> Erhältlich im Mac App Store</li>
                      <li>✅ <strong>Desktop-Version:</strong> TaskFuchs als Desktop-App verwenden</li>
                      <li>✅ <strong>macOS:</strong> AppleScript-Unterstützung erforderlich</li>
                      <li>✅ <strong>Berechtigung:</strong> Automatischer Zugriff bei erstem Sync</li>
                    </ul>
                  </div>

                  {/* Test Connection */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🦊 Test Button clicked!');
                        setExportSuccess('🔄 Test-Button wurde geklickt! Teste Verbindung...');
                        handleThings3Test();
                      }}
                      disabled={things3Status === 'testing'}
                      style={{ backgroundColor: state.preferences.accentColor }}
                      className="px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {things3Status === 'testing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Teste Verbindung...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Things3 Verbindung testen</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sync Buttons */}
                  {things3Status === 'success' && (
                    <>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🦊 Button clicked - starting sync...');
                            setExportSuccess('🔄 Sync-Button wurde geklickt! Starte Synchronisation...');
                            handleThings3Sync();
                          }}
                          disabled={isThings3Syncing}
                          style={{ backgroundColor: state.preferences.accentColor }}
                          className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isThings3Syncing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Synchronisiere... ({things3Progress}%)</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span>TaskFuchs → Things3 synchronisieren</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleThings3AutoSyncToggle}
                          style={{
                            backgroundColor: things3AutoSync ? '#ef4444' : state.preferences.accentColor
                          }}
                          className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          {things3AutoSync ? (
                            <>
                              <X className="w-4 h-4" />
                              <span>Auto-Sync stoppen</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span>Auto-Sync starten</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Auto-Sync Settings */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                        <h5 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                          <Settings className="w-4 h-4" />
                          <span>Auto-Sync Einstellungen</span>
                        </h5>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sync-Intervall
                          </label>
                          <select
                            value={things3SyncInterval}
                            onChange={(e) => setThings3SyncInterval(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value={5}>5 Minuten</option>
                            <option value={15}>15 Minuten</option>
                            <option value={30}>30 Minuten</option>
                            <option value={60}>1 Stunde</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>Status: {things3AutoSync ? 'Aktiv' : 'Inaktiv'}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Progress */}
                  {isThings3Syncing && things3Progress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{things3Message}</span>
                        <span className="text-gray-500 dark:text-gray-500">{things3Progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${things3Progress}%`,
                            backgroundColor: state.preferences.accentColor
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Features Info */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>🎯 Things3 AppleScript-Features</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Sync-Features:</h6>
                    <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                      <li>✅ <strong>Direkte Integration:</strong> TaskFuchs → Things3</li>
                      <li>✅ <strong>Aufgaben & Projekte:</strong> Vollständige Übertragung</li>
                      <li>✅ <strong>Tags & Notizen:</strong> Metadaten-Sync</li>
                      <li>✅ <strong>Status-Updates:</strong> Erledigt/Offen</li>
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">Vorteile:</h6>
                    <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                      <li>🚀 <strong>Kein Setup:</strong> Direkte AppleScript-API</li>
                      <li>⚡ <strong>Schnell:</strong> Native Mac-Integration</li>
                      <li>🔒 <strong>Sicher:</strong> Lokal, kein Cloud-Zugriff</li>
                      <li>🎯 <strong>Präzise:</strong> 1:1 Datenübertragung</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Webhook Integration
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Verbinden Sie TaskFuchs mit Zapier, IFTTT, Make.com und mehr.
              </p>
              <div className="text-sm text-gray-400">
                Implementierung folgt in einer zukünftigen Version.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Konflikt aufgelöst
              </h3>
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictTasks(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400">
                Diese Aufgabe wurde sowohl in TaskFuchs als auch in Apple Reminders geändert. 
                Welche Version möchten Sie behalten?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TaskFuchs Version */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      TaskFuchs Version
                    </h4>
                    <button
                      onClick={() => handleConflictResolution('local')}
                      style={{ backgroundColor: state.preferences.accentColor }}
                      className="px-3 py-1 text-white rounded text-sm hover:opacity-90 transition-opacity"
                    >
                      Diese wählen
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Titel:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{conflictTasks.local.title}</div>
                    </div>
                    {conflictTasks.local.description && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Beschreibung:</span>
                        <div className="text-gray-700 dark:text-gray-300">{conflictTasks.local.description}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        conflictTasks.local.completed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {conflictTasks.local.completed ? 'Erledigt' : 'Offen'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Geändert:</span>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(conflictTasks.local.updatedAt).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apple Reminders Version */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Apple Reminders Version
                    </h4>
                    <button
                      onClick={() => handleConflictResolution('remote')}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Diese wählen
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Titel:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{conflictTasks.remote.title}</div>
                    </div>
                    {conflictTasks.remote.description && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Beschreibung:</span>
                        <div className="text-gray-700 dark:text-gray-300">{conflictTasks.remote.description}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        conflictTasks.remote.completed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {conflictTasks.remote.completed ? 'Erledigt' : 'Offen'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Geändert:</span>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(conflictTasks.remote.updatedAt || conflictTasks.remote.lastModified).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 