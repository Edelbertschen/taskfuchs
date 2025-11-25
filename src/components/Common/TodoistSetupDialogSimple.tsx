import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader, Plus, Settings, ArrowRight, Link, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  todoistSyncManager, 
  TodoistSyncConfig, 
  TodoistProjectMapping
} from '../../utils/todoistSyncManagerNew';
import type { TodoistProject } from '../../types';
import { TodoistSafetyModal } from './TodoistSafetyModal';
import { SyncSafetyManager, SafetySyncConfig, defaultSafetyConfig } from '../../utils/todoistSyncSafety';

interface TodoistSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncConfigured: () => void;
  editMode?: boolean; // Neu: Bearbeitungsmodus
}

type SetupStep = 'token' | 'projects' | 'settings' | 'complete';

export const TodoistSetupDialog: React.FC<TodoistSetupDialogProps> = ({
  isOpen,
  onClose,
  onSyncConfigured,
  editMode = false
}) => {
  const { state } = useApp();
  
  // Get accent color for consistent theming
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  // States
  const [currentStep, setCurrentStep] = useState<SetupStep>('token');
  const [apiToken, setApiToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [todoistProjects, setTodoistProjects] = useState<TodoistProject[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<TodoistProjectMapping[]>([]);
  const [autoSyncInterval, setAutoSyncInterval] = useState(15);
  const [syncInbox, setSyncInbox] = useState(false); // NEW: Inbox sync option
  const [isSaving, setIsSaving] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyConfig, setSafetyConfig] = useState<SafetySyncConfig>(defaultSafetyConfig);

  // Load existing config on open
  useEffect(() => {
    if (isOpen) {
      const config = todoistSyncManager.getConfig();
      if (config) {
        setApiToken(config.apiToken || '');
        setSelectedMappings(config.projectMappings || []);
        setAutoSyncInterval(config.autoSyncInterval || 15);
        setSyncInbox(config.syncInbox || false);
        
        // Im Bearbeitungsmodus direkt zu Projekten gehen, wenn Token vorhanden
        if (editMode && config.apiToken) {
          setCurrentStep('projects');
          setConnectionStatus('success');
          // Projekte direkt laden (schneller als Connection-Test)
          loadTodoistProjects();
          // Zusätzlich Connection-Test für Validierung
          testConnection();
        } else if (config.apiToken && config.projectMappings.length > 0) {
          setCurrentStep('settings');
        } else if (config.apiToken) {
          setCurrentStep('projects');
        }
      }
    }
  }, [isOpen, editMode]);

  // Load projects directly (for edit mode)
  const loadTodoistProjects = async () => {
    try {
      console.log('🔄 Loading Todoist projects directly...');
      const projects = await todoistSyncManager.getTodoistProjects();
      console.log('✅ Todoist projects loaded directly:', projects.length, projects);
      setTodoistProjects(projects);
    } catch (error) {
      console.error('❌ Failed to load Todoist projects directly:', error);
    }
  };

  // Test Todoist connection
  const testConnection = async () => {
    if (!apiToken.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('Bitte geben Sie einen API-Token ein');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Update config temporarily for testing
      todoistSyncManager.updateConfig({ apiToken: apiToken.trim() });
      
      const result = await todoistSyncManager.testConnection();
      
      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage(result.message);
        console.log('🔍 Todoist Projects loaded:', result.projects?.length || 0, result.projects);
        setTodoistProjects(result.projects || []);
        setCurrentStep('projects');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get available TaskFuchs projects (columns with type 'project')
  const getTaskFuchsProjects = () => {
    return state.columns.filter(col => col.type === 'project');
  };

  // Toggle project mapping
  const toggleProjectMapping = (taskFuchsProject: typeof state.columns[0], todoistProject: TodoistProject) => {
    const existingIndex = selectedMappings.findIndex(
      mapping => mapping.taskFuchsProjectId === taskFuchsProject.id
    );

    if (existingIndex >= 0) {
      // Remove mapping
      setSelectedMappings(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add mapping
      const newMapping: TodoistProjectMapping = {
        taskFuchsProjectId: taskFuchsProject.id,
        todoistProjectId: todoistProject.id,
        taskFuchsProjectName: taskFuchsProject.title || 'Unbenanntes Projekt',
        todoistProjectName: todoistProject.name,
        enabled: true
      };
      setSelectedMappings(prev => [...prev, newMapping]);
    }
  };

  // Check if project is mapped
  const isProjectMapped = (taskFuchsProjectId: string) => {
    return selectedMappings.some(mapping => mapping.taskFuchsProjectId === taskFuchsProjectId);
  };

  // Get mapped Todoist project for a TaskFuchs project
  const getMappedTodoistProject = (taskFuchsProjectId: string) => {
    const mapping = selectedMappings.find(m => m.taskFuchsProjectId === taskFuchsProjectId);
    return mapping ? todoistProjects.find(p => p.id === mapping.todoistProjectId) : null;
  };

  // Remove a specific mapping (für Bearbeitungsmodus)
  const removeMapping = (taskFuchsProjectId: string) => {
    setSelectedMappings(prev => prev.filter(m => m.taskFuchsProjectId !== taskFuchsProjectId));
  };

  // Save configuration
  const saveConfiguration = async () => {
    setIsSaving(true);
    
    try {
      const config: Partial<TodoistSyncConfig> = {
        enabled: true,
        apiToken: apiToken.trim(),
        projectMappings: selectedMappings,
        autoSyncInterval: autoSyncInterval,
        syncInbox: syncInbox, // NEW: Include inbox sync setting
        syncSettings: {
          syncTasks: true,
          syncDescriptions: true,
          syncDueDates: true,
          syncPriorities: true,
          syncLabels: true,
          autoCreateSections: true, // Key feature: automatic section/column sync
          conflictResolution: 'local-wins'
        }
      };

      todoistSyncManager.updateConfig(config);
      
      setCurrentStep('complete');
      
      // Call onSyncConfigured after a short delay to show completion
      setTimeout(() => {
        onSyncConfigured();
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error saving Todoist configuration:', error);
      alert('Fehler beim Speichern der Konfiguration');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to first step
  const resetSetup = () => {
    setCurrentStep('token');
    setConnectionStatus('idle');
    setConnectionMessage('');
    setSelectedMappings([]);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
               style={{ 
                 borderLeftColor: state.preferences.accentColor,
                 borderLeftWidth: '4px'
               }}>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editMode ? 'Todoist-Synchronisation bearbeiten' : 'Todoist-Synchronisation einrichten'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {editMode ? 'Projektverknüpfungen verwalten' : `Schritt ${currentStep === 'token' ? '1' : currentStep === 'projects' ? '2' : currentStep === 'settings' ? '3' : '4'} von 4`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              {[
                { key: 'token', label: 'API-Token', icon: Settings },
                { key: 'projects', label: 'Projekte', icon: Plus },
                { key: 'settings', label: 'Einstellungen', icon: Settings },
                { key: 'complete', label: 'Abschluss', icon: Check }
              ].map((step, index) => {
                const isActive = currentStep === step.key;
                const isCompleted = ['token', 'projects', 'settings'].slice(0, ['token', 'projects', 'settings', 'complete'].indexOf(currentStep)).includes(step.key);
                const StepIcon = step.icon;
                
                return (
                  <div key={step.key} className="flex items-center">
                    <div 
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isCompleted ? 'border-green-500 bg-green-500 text-white' :
                        isActive ? 'border-2 text-white' :
                        'border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}
                      style={isActive ? { 
                        borderColor: accentColor, 
                        backgroundColor: accentColor 
                      } : {}}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span 
                      className={`ml-3 text-sm font-medium ${
                        isActive ? '' :
                        isCompleted ? 'text-green-600 dark:text-green-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}
                      style={isActive ? { color: accentColor } : {}}
                    >
                      {step.label}
                    </span>
                    {index < 3 && (
                      <ArrowRight className="w-4 h-4 mx-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            {/* Step 1: API Token */}
            {currentStep === 'token' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: state.preferences.accentColor + '20' }}>
                    <Settings className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Todoist API-Token eingeben
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Geben Sie Ihren Todoist API-Token ein, um die Verbindung herzustellen.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API-Token
                    </label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Ihren Todoist API-Token hier eingeben..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      style={{
                        '--tw-ring-color': `${accentColor}40`
                      } as React.CSSProperties}
                      onKeyDown={(e) => e.key === 'Enter' && testConnection()}
                    />
                  </div>

                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: `${accentColor}10`,
                      borderColor: `${accentColor}40`
                    }}
                  >
                    <p 
                      className="text-sm"
                      style={{ color: accentColor }}
                    >
                      <strong>💡 So finden Sie Ihren API-Token:</strong><br />
                      Todoist → Einstellungen → Integrationen → Entwickler → API-Token
                    </p>
                  </div>

                  {/* Connection Status */}
                  {connectionMessage && (
                    <div className={`p-4 rounded-lg border ${
                      connectionStatus === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                      connectionStatus === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                      'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                    }`}>
                      <div className="flex items-center">
                        {connectionStatus === 'success' && <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />}
                        {connectionStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />}
                        <p className={`text-sm ${
                          connectionStatus === 'success' ? 'text-green-800 dark:text-green-200' :
                          connectionStatus === 'error' ? 'text-red-800 dark:text-red-200' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {connectionMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={testConnection}
                    disabled={isTestingConnection || !apiToken.trim()}
                    className="w-full px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    {isTestingConnection ? (
                      <div className="flex items-center justify-center">
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        Verbindung testen...
                      </div>
                    ) : (
                      'Verbindung testen'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Project Mapping - Modern & Intuitive */}
            {currentStep === 'projects' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: state.preferences.accentColor + '20' }}>
                    <Link className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Projekte intelligent verknüpfen
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Verbinden Sie Ihre TaskFuchs-Projekte mit Todoist-Projekten. 
                    <strong> Spalten und Bereiche synchronisieren sich automatisch.</strong>
                  </p>
                </div>

                <div className="max-w-5xl mx-auto">
                  {/* Progress Status */}
                  <div className="mb-6 p-4 rounded-xl border"
                       style={{
                         backgroundColor: selectedMappings.length > 0 ? `${state.preferences.accentColor}10` : '#f9fafb',
                         borderColor: selectedMappings.length > 0 ? `${state.preferences.accentColor}30` : '#e5e7eb'
                       }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                             style={{ backgroundColor: selectedMappings.length > 0 ? state.preferences.accentColor : '#9ca3af' }}>
                          {selectedMappings.length}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {selectedMappings.length === 0 
                              ? 'Keine Projekte verknüpft' 
                              : `${selectedMappings.length} Projekt${selectedMappings.length > 1 ? 'e' : ''} verknüpft`
                            }
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedMappings.length === 0 
                              ? 'Wählen Sie unten Projektpaare aus' 
                              : 'Perfekt! Alle ausgewählten Projekte werden synchronisiert'
                            }
                          </p>
                        </div>
                      </div>
                      {selectedMappings.length > 0 && (
                        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                          <Check className="w-6 h-6" />
                          <span className="text-sm font-medium">Bereit für Sync</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Mappings Display */}
                  {selectedMappings.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <div className="w-2 h-2 rounded-full mr-3 bg-green-500 animate-pulse"></div>
                        Aktive Verknüpfungen
                      </h4>
                      {selectedMappings.map((mapping, index) => (
                        <div key={index} 
                             className="group flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:shadow-sm transition-all duration-200">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                                style={{ backgroundColor: state.preferences.accentColor }}
                              >
                                {mapping.taskFuchsProjectName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {mapping.taskFuchsProjectName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">TaskFuchs</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 px-3">
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                {mapping.todoistProjectName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {mapping.todoistProjectName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Todoist</div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => removeMapping(mapping.taskFuchsProjectId)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors duration-200 opacity-0 group-hover:opacity-100"
                            title="Verknüpfung entfernen"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project Pairing Interface */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2" style={{ color: state.preferences.accentColor }} />
                      Neue Verknüpfungen erstellen
                    </h4>
                    
                    {getTaskFuchsProjects().filter(p => !isProjectMapped(p.id)).length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Alle Projekte verknüpft!</h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Perfekt! Sie können nun mit den Synchronisations-Einstellungen fortfahren.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getTaskFuchsProjects().filter(p => !isProjectMapped(p.id)).map((tfProject) => (
                          <div key={tfProject.id} 
                               className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-sm transition-all duration-200">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                <div 
                                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
                                  style={{ backgroundColor: state.preferences.accentColor }}
                                >
                                  {tfProject.title.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white text-lg">
                                    {tfProject.title}
                                  </h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    TaskFuchs-Projekt • Wählen Sie ein Todoist-Projekt aus
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {todoistProjects.length === 0 && (
                                <div className="col-span-full p-4 text-center text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <p className="text-sm">⚠️ Keine Todoist-Projekte gefunden. Prüfen Sie die Verbindung.</p>
                                  <p className="text-xs mt-1">Debug: {todoistProjects.length} Projekte geladen</p>
                                  <button
                                    onClick={loadTodoistProjects}
                                    className="mt-2 px-3 py-1 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors"
                                  >
                                    🔄 Projekte neu laden
                                  </button>
                                </div>
                              )}
                              {todoistProjects.map((todoistProject) => (
                                <button
                                  key={`${tfProject.id}-${todoistProject.id}`}
                                  onClick={() => toggleProjectMapping(tfProject, todoistProject)}
                                  className="group flex items-center space-x-3 p-4 border-2 border-dashed border-red-300 dark:border-red-600 rounded-xl hover:border-solid hover:bg-red-50 dark:hover:bg-red-900/10 hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    {todoistProject.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="font-medium text-gray-900 dark:text-white text-sm flex items-center">
                                      {todoistProject.name}
                                      {todoistProject.is_inbox_project && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                                          Inbox
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      Todoist-Projekt
                                    </div>
                                  </div>
                                  <Plus className="w-5 h-5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pro Tips */}
                  <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">🚀</span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Intelligente Synchronisation
                        </h5>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                          <li className="flex items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></span>
                            <strong>Automatische Spalten:</strong> TaskFuchs-Spalten werden als Todoist-Bereiche erstellt
                          </li>
                          <li className="flex items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></span>
                            <strong>Bidirektional:</strong> Änderungen in beiden Apps werden synchronisiert
                          </li>
                          <li className="flex items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></span>
                            <strong>Intelligent:</strong> Duplikate werden automatisch erkannt und vermieden
                          </li>
                          <li className="flex items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></span>
                            <strong>Sicher:</strong> Ihre lokalen Daten haben immer Vorrang bei Konflikten
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {editMode && (
                  <div className="text-center mt-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Änderungen werden automatisch gespeichert
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Settings */}
            {currentStep === 'settings' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: state.preferences.accentColor + '20' }}>
                    <Settings className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Synchronisations-Einstellungen
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Konfigurieren Sie die Details der Synchronisation.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Auto-Sync Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Automatische Synchronisation (Minuten)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        min="0"
                        value={autoSyncInterval}
                        onChange={(e) => setAutoSyncInterval(parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (0 = deaktiviert)
                      </span>
                    </div>
                  </div>

                  {/* Inbox Sync Option */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Inbox-Synchronisation</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        TaskFuchs Inbox mit Todoist Eingang synchronisieren
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncInbox}
                        onChange={(e) => setSyncInbox(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-opacity-20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                        style={{
                          '--tw-ring-color': `${accentColor}`,
                          backgroundColor: syncInbox ? accentColor : undefined
                        } as React.CSSProperties}
                      ></div>
                    </label>
                  </div>

                  {/* Automatic Features Info */}
                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: `${accentColor}10`,
                      borderColor: `${accentColor}40`
                    }}
                  >
                    <h5 
                      className="font-medium mb-2"
                      style={{ color: accentColor }}
                    >
                      🚀 Automatische Features
                    </h5>
                    <ul 
                      className="text-sm space-y-1"
                      style={{ color: accentColor }}
                    >
                      <li>✅ Bidirektionale Synchronisation (TaskFuchs ↔ Todoist)</li>
                      <li>✅ Automatische Erstellung fehlender Spalten/Bereiche</li>
                      <li>✅ Synchronisation von Titel, Beschreibung, Terminen</li>
                      <li>✅ Übertragung von Prioritäten und Tags</li>
                      <li>✅ Konflikterkennung (lokale Änderungen haben Vorrang)</li>
                      {syncInbox && (
                        <li>📥 Inbox-Synchronisation (TaskFuchs Inbox ↔ Todoist Eingang)</li>
                      )}
                    </ul>
                  </div>

                  {/* Project Mappings Summary */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                      Verknüpfte Projekte ({selectedMappings.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedMappings.map((mapping, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded border">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: state.preferences.accentColor }} />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {mapping.taskFuchsProjectName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <ArrowRight className="w-3 h-3 mx-2" />
                                {mapping.todoistProjectName}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 'complete' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Todoist-Synchronisation erfolgreich eingerichtet!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Ihre Projekte sind jetzt mit Todoist verknüpft. Spalten und Bereiche werden automatisch synchron gehalten.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>🎉 Was passiert jetzt?</strong><br />
                    • Aufgaben werden alle {autoSyncInterval} Minuten automatisch synchronisiert<br />
                    • Fehlende Spalten/Bereiche werden automatisch erstellt<br />
                    • Sie können auch jederzeit manuell synchronisieren
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Safety Section */}
          {currentStep === 'projects' && (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Datenschutz & Sicherheit
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Ihre Daten sind durch automatische Backups und Bestätigungen geschützt
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSafetyModalOpen(true)}
                  className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  Konfigurieren
                </button>
              </div>
              
              {/* Quick safety status */}
              <div className="mt-3 flex flex-wrap gap-2">
                {safetyConfig.autoBackupBeforeSync && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Auto-Backup
                  </span>
                )}
                {safetyConfig.confirmationRequired.taskDeletions && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    ✓ Lösch-Bestätigung
                  </span>
                )}
                {safetyConfig.safeMode && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Safe Mode
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              {currentStep !== 'token' && currentStep !== 'complete' && (
                <button
                  onClick={resetSetup}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Neu beginnen
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {currentStep === 'complete' ? 'Schließen' : editMode ? 'Abbrechen' : 'Abbrechen'}
              </button>
              
              {currentStep === 'projects' && !editMode && (
                <button
                  onClick={() => setCurrentStep('settings')}
                  disabled={selectedMappings.length === 0}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  Weiter zu Einstellungen
                </button>
              )}
              
              {/* Bearbeitungsmodus: Direkt speichern */}
              {editMode && currentStep === 'projects' && (
                <button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Speichern...
                    </div>
                  ) : (
                    'Änderungen speichern'
                  )}
                </button>
              )}
              
              {currentStep === 'settings' && !editMode && (
                <button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Speichern...
                    </div>
                  ) : (
                    'Einrichtung abschließen'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Safety Configuration Modal */}
      <TodoistSafetyModal
        isOpen={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
        onConfirmSync={(config) => {
          setSafetyConfig(config);
          setSafetyModalOpen(false);
        }}
        mode="settings"
      />
    </>
  );
}; 