import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Settings, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Loader, 
  AlertCircle, 
  Plus,
  ChevronRight,
  Clock,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Check,
  ArrowRight,
  Folder
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MicrosoftAuthModal } from '../Common/MicrosoftAuthModal';
import { MicrosoftToDoProjectMapping } from './MicrosoftToDoProjectMapping';
import { microsoftToDoService } from '../../utils/microsoftTodoService';
import type { MicrosoftToDoAuth, MicrosoftToDoList, MicrosoftToDoSettings } from '../../types';

interface MicrosoftToDoSettingsSectionProps {
  onShowSaved: () => void;
}

export function MicrosoftToDoSettingsSection({ onShowSaved }: MicrosoftToDoSettingsSectionProps) {
  const { state, dispatch } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableLists, setAvailableLists] = useState<MicrosoftToDoList[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);

  const settings = state.preferences.microsoftTodo || {
    enabled: false,
    selectedListId: '',
    selectedListName: '',
    autoSync: true,
    syncInterval: 30,
    syncOnStart: true,
    syncOnTaskChange: true,
    bidirectionalSync: true,
    conflictResolution: 'manual',
    projectMappings: [],
    useSectionMapping: true,
  } as MicrosoftToDoSettings;

  // Check authentication status on mount
  useEffect(() => {
    if (settings.enabled && microsoftToDoService.isAuthenticated()) {
      loadAvailableLists();
    }
  }, [settings.enabled]);

  // Toggle component
  const Toggle = ({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        backgroundColor: enabled 
          ? state.preferences.accentColor
          : disabled 
            ? '#9ca3af' 
            : '#d1d5db'
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
      }`}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-lg"
        style={{
          transform: enabled ? 'translateX(20px)' : 'translateX(4px)'
        }}
      />
    </button>
  );

  const handleAuthSuccess = async (auth: MicrosoftToDoAuth) => {
    setIsConnecting(true);
    try {
      // Load available lists
      await loadAvailableLists();
      
      // Update settings
      updateSettings({ enabled: true });
      setConnectionStatus('success');
      setConnectionMessage('Erfolgreich mit Microsoft To Do verbunden!');
      onShowSaved();
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Fehler beim Laden der Listen');
    } finally {
      setIsConnecting(false);
      setShowAuthModal(false);
    }
  };

  const loadAvailableLists = async () => {
    if (!microsoftToDoService.isAuthenticated()) return;
    
    setIsLoading(true);
    try {
      const lists = await microsoftToDoService.getLists();
      setAvailableLists(lists);
      
      // Auto-select default list if none selected
      if (!settings.selectedListId && lists.length > 0) {
        const defaultList = lists.find(list => list.wellknownListName === 'defaultList') || lists[0];
        updateSettings({
          selectedListId: defaultList.id,
          selectedListName: defaultList.displayName
        });
      }
    } catch (error) {
      console.error('Failed to load Microsoft To Do lists:', error);
      setConnectionStatus('error');
      setConnectionMessage('Fehler beim Laden der Listen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('Teste Verbindung...');
    
    try {
      if (!microsoftToDoService.isAuthenticated()) {
        throw new Error('Nicht authentifiziert');
      }
      
      await loadAvailableLists();
      setConnectionStatus('success');
      setConnectionMessage('Verbindung erfolgreich!');
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen');
    }
  };

  const handleSync = async () => {
    // Check if using project mapping or single list mode
    const useProjectMapping = settings.useSectionMapping && 
                             settings.projectMappings && 
                             settings.projectMappings.length > 0 &&
                             settings.projectMappings.some(m => m.enabled);

    if (!useProjectMapping && !settings.selectedListId) {
      setConnectionMessage('Bitte konfigurieren Sie zuerst Projekt-Mappings oder wählen Sie eine Liste aus');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Synchronisation wird gestartet...');
    setSyncProgress(0);

    try {
      let result;
      
      if (useProjectMapping) {
        // Use new project-based sync
        result = await microsoftToDoService.syncTasksWithProjectMappings(
          state.tasks,
          settings.projectMappings,
          {
            onProgress: (progress, message) => {
              setSyncProgress(progress);
              setSyncMessage(message);
            }
          }
        );
        setSyncMessage(`Projekt-Synchronisation erfolgreich! ${result.added} hinzugefügt, ${result.updated} aktualisiert`);
      } else {
        // Use traditional single-list sync
        result = await microsoftToDoService.syncTasks(
          state.tasks,
          settings.selectedListId,
          {
            onProgress: (progress, message) => {
              setSyncProgress(progress);
              setSyncMessage(message);
            }
          }
        );
        setSyncMessage(`Liste-Synchronisation erfolgreich! ${result.added} hinzugefügt, ${result.updated} aktualisiert`);
      }

      if (result.success) {
        updateSettings({
          lastSync: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastSyncError: undefined
        });
      } else {
        throw new Error(result.errors.join(', '));
      }
    } catch (error) {
      setSyncMessage(`Synchronisation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      updateSettings({
        lastSyncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleSignOut = () => {
    microsoftToDoService.signOut();
    updateSettings({
      enabled: false,
      selectedListId: '',
      selectedListName: '',
      lastSync: undefined,
      lastSyncStatus: undefined,
      lastSyncError: undefined
    });
    setAvailableLists([]);
    setConnectionStatus('idle');
    setConnectionMessage('');
    onShowSaved();
  };

  const updateSettings = (updates: Partial<MicrosoftToDoSettings>) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        microsoftTodo: {
          ...settings,
          ...updates
        }
      }
    });
  };

  const isAuthenticated = microsoftToDoService.isAuthenticated();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Microsoft To Do Integration</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Synchronisieren Sie Ihre TaskFuchs-Aufgaben mit Microsoft To Do für nahtlosen Zugriff über alle Geräte.
        </p>

        {/* Main Toggle */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                settings.enabled && isAuthenticated
                  ? 'bg-blue-100 dark:bg-blue-900' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Cloud className={`w-6 h-6 ${
                  settings.enabled && isAuthenticated
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Microsoft To Do Synchronisation
                </h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    connectionStatus === 'success' && isAuthenticated
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : connectionStatus === 'testing'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : connectionStatus === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {connectionStatus === 'success' && isAuthenticated ? 'Verbunden' : 
                     connectionStatus === 'testing' ? 'Teste...' : 
                     connectionStatus === 'error' ? 'Fehler' : 'Nicht verbunden'}
                  </span>
                  {settings.lastSync && (
                    <span className="text-gray-500 dark:text-gray-400">
                      Letzte Sync: {new Date(settings.lastSync).toLocaleString('de-DE')}
                    </span>
                  )}
                </div>
                {connectionMessage && (
                  <p className={`text-sm mt-1 ${
                    connectionStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                    connectionStatus === 'error' ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {connectionMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Toggle 
                enabled={settings.enabled && isAuthenticated} 
                onChange={() => {
                  if (settings.enabled && isAuthenticated) {
                    handleSignOut();
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                disabled={isConnecting}
              />
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated && (
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Microsoft-Konto Anmeldung erforderlich
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Um TaskFuchs mit Microsoft To Do zu synchronisieren, melden Sie sich mit Ihrem Microsoft-Konto an.
                  Ihre Anmeldedaten werden sicher über OAuth2 verwaltet.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isConnecting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  <span>{isConnecting ? 'Verbinde...' : 'Mit Microsoft anmelden'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List Selection */}
        {settings.enabled && isAuthenticated && (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                To Do-Liste auswählen
              </h4>
              
              {isLoading ? (
                <div className="flex items-center space-x-2 py-4">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-gray-500 dark:text-gray-400">Listen werden geladen...</span>
                </div>
              ) : availableLists.length > 0 ? (
                <div className="space-y-3">
                  {availableLists.map((list) => (
                    <div
                      key={list.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        settings.selectedListId === list.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => updateSettings({
                        selectedListId: list.id,
                        selectedListName: list.displayName
                      })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            settings.selectedListId === list.id ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {list.displayName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {list.wellknownListName === 'defaultList' ? 'Standard-Liste' : 
                               list.isShared ? 'Geteilte Liste' : 'Private Liste'}
                            </div>
                          </div>
                        </div>
                        {settings.selectedListId === list.id && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Keine To Do-Listen gefunden
                  </p>
                  <button
                    onClick={loadAvailableLists}
                    className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Erneut laden
                  </button>
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={loadAvailableLists}
                  disabled={isLoading}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Listen aktualisieren</span>
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={connectionStatus === 'testing'}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {connectionStatus === 'testing' ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span>{connectionStatus === 'testing' ? 'Teste...' : 'Verbindung testen'}</span>
                </button>
              </div>
            </div>

            {/* Sync Controls */}
            {(settings.selectedListId || (settings.projectMappings && settings.projectMappings.length > 0)) && (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    Synchronisation
                  </h4>
                  {settings.projectMappings && settings.projectMappings.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${settings.useSectionMapping ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {settings.useSectionMapping ? 'Projekt-basiert' : 'Einzelne Liste'}
                      </span>
                      <Toggle 
                        enabled={settings.useSectionMapping} 
                        onChange={() => updateSettings({ useSectionMapping: !settings.useSectionMapping })}
                      />
                    </div>
                  )}
                </div>

                {/* Sync Status Info */}
                {settings.useSectionMapping && settings.projectMappings && settings.projectMappings.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Projekt-basierte Synchronisation aktiv
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {settings.projectMappings.filter(m => m.enabled).length} von {settings.projectMappings.length} Projekten aktiviert, {' '}
                      {settings.projectMappings.reduce((total, project) => 
                        total + project.columnMappings.filter(c => c.enabled).length, 0
                      )} Spalten-Mappings konfiguriert
                    </div>
                  </div>
                )}

                {/* Manual Sync */}
                <div className="mb-6">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Synchronisiere... ({syncProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        <span>Jetzt synchronisieren</span>
                      </>
                    )}
                  </button>

                  {syncMessage && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                      {syncMessage}
                    </div>
                  )}

                  {isSyncing && syncProgress > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${syncProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sync Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Automatisch alle {settings.syncInterval} Minuten synchronisieren
                      </div>
                    </div>
                    <Toggle 
                      enabled={settings.autoSync} 
                      onChange={() => updateSettings({ autoSync: !settings.autoSync })}
                    />
                  </div>

                  {settings.autoSync && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sync-Intervall (Minuten)
                      </label>
                      <select
                        value={settings.syncInterval}
                        onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={5}>5 Minuten</option>
                        <option value={15}>15 Minuten</option>
                        <option value={30}>30 Minuten</option>
                        <option value={60}>1 Stunde</option>
                        <option value={180}>3 Stunden</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Beim Start synchronisieren</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Automatisch synchronisieren wenn TaskFuchs gestartet wird
                      </div>
                    </div>
                    <Toggle 
                      enabled={settings.syncOnStart} 
                      onChange={() => updateSettings({ syncOnStart: !settings.syncOnStart })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Bei Änderungen synchronisieren</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Automatisch synchronisieren wenn Aufgaben bearbeitet werden
                      </div>
                    </div>
                    <Toggle 
                      enabled={settings.syncOnTaskChange} 
                      onChange={() => updateSettings({ syncOnTaskChange: !settings.syncOnTaskChange })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Bidirektionale Synchronisation</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Änderungen in beide Richtungen synchronisieren
                      </div>
                    </div>
                    <Toggle 
                      enabled={settings.bidirectionalSync} 
                      onChange={() => updateSettings({ bidirectionalSync: !settings.bidirectionalSync })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Konfliktauflösung
                    </label>
                    <select
                      value={settings.conflictResolution}
                      onChange={(e) => updateSettings({ conflictResolution: e.target.value as 'local' | 'remote' | 'manual' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="manual">Manuell entscheiden</option>
                      <option value="local">Lokale Version bevorzugen</option>
                      <option value="remote">Microsoft To Do-Version bevorzugen</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Konto-Informationen
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Status:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">Verbunden</span>
                </div>
                
                {settings.selectedListName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Ausgewählte Liste:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{settings.selectedListName}</span>
                  </div>
                )}
                
                {settings.lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Letzte Synchronisation:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(settings.lastSync).toLocaleString('de-DE')}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Microsoft-Konto trennen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Mapping Section */}
        {settings.enabled && isAuthenticated && (
          <div className="mt-8">
            <MicrosoftToDoProjectMapping onShowSaved={onShowSaved} />
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <MicrosoftAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
} 