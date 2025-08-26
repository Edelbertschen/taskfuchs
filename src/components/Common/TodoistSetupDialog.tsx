import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Settings, ArrowRight, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  todoistSyncManager, 
  TodoistSyncConfig, 
  TodoistProjectMapping, 
  TodoistSectionMapping 
} from '../../utils/newTodoistSyncManager';
import type { TodoistProject, TodoistSection, Column, ProjectKanbanColumn } from '../../types';

interface TodoistSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncConfigured: () => void;
}

export const TodoistSetupDialog: React.FC<TodoistSetupDialogProps> = ({
  isOpen,
  onClose,
  onSyncConfigured
}) => {
  const { t } = useTranslation();
  const { state } = useApp();
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [todoistProjects, setTodoistProjects] = useState<TodoistProject[]>([]);
  const [todoistSections, setTodoistSections] = useState<Record<string, TodoistSection[]>>({});
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  
  // Configuration state
  const [config, setConfig] = useState<TodoistSyncConfig>({
    enabled: false,
    apiToken: '',
    bidirectionalSync: true,
    autoSyncInterval: 15,
    projectMappings: [],
    sectionMappings: [],
    syncSettings: {
      syncTasks: true,
      syncDescriptions: true,
      syncDueDates: true,
      syncPriorities: true,
      syncLabels: true,
      conflictResolution: 'local-wins'
    }
  });

  // Get accent color
  const accentColor = state.preferences.accentColor || '#0ea5e9';

  // Load existing config on mount
  useEffect(() => {
    const existingConfig = todoistSyncManager.getConfig();
    if (existingConfig) {
      setConfig(existingConfig);
      setApiToken(existingConfig.apiToken);
      if (existingConfig.apiToken) {
        setCurrentStep(2); // Skip to project mapping if token exists
      }
    }
  }, [isOpen]);

  // Get TaskFuchs projects (columns with type 'project')
  const taskFuchsProjects = state.columns.filter(col => col.type === 'project');

  // Test API connection
  const testConnection = async () => {
    if (!apiToken.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('Bitte geben Sie einen API-Token ein');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('Verbindung wird getestet...');

    try {
      // Update config temporarily for testing
      todoistSyncManager.updateConfig({ apiToken: apiToken.trim() });
      
      const result = await todoistSyncManager.testConnection();
      
      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage(result.message);
        
        // Load projects
        await loadTodoistProjects();
        
        // Move to next step
        setTimeout(() => {
          setCurrentStep(2);
        }, 1500);
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen');
    }
  };

  // Load Todoist projects
  const loadTodoistProjects = async () => {
    setLoadingProjects(true);
    try {
      const projects = await todoistSyncManager.getProjects();
      setTodoistProjects(projects);
      console.log('📋 Loaded Todoist projects:', projects);
    } catch (error) {
      console.error('❌ Error loading Todoist projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load sections for a specific project
  const loadSectionsForProject = async (projectId: string) => {
    if (loadingSections[projectId]) return;
    
    setLoadingSections(prev => ({ ...prev, [projectId]: true }));
    try {
      const sections = await todoistSyncManager.getSections(projectId);
      setTodoistSections(prev => ({ ...prev, [projectId]: sections }));
      console.log(`📂 Loaded sections for project ${projectId}:`, sections);
    } catch (error) {
      console.error(`❌ Error loading sections for project ${projectId}:`, error);
    } finally {
      setLoadingSections(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // Add project mapping
  const addProjectMapping = () => {
    const newMapping: TodoistProjectMapping = {
      taskFuchsProjectId: '',
      todoistProjectId: '',
      taskFuchsProjectName: '',
      todoistProjectName: '',
      enabled: true
    };
    
    setConfig(prev => ({
      ...prev,
      projectMappings: [...prev.projectMappings, newMapping]
    }));
  };

  // Update project mapping
  const updateProjectMapping = (index: number, updates: Partial<TodoistProjectMapping>) => {
    setConfig(prev => ({
      ...prev,
      projectMappings: prev.projectMappings.map((mapping, i) => 
        i === index ? { ...mapping, ...updates } : mapping
      )
    }));

    // Load sections when Todoist project is selected
    if (updates.todoistProjectId) {
      loadSectionsForProject(updates.todoistProjectId);
    }
  };

  // Remove project mapping
  const removeProjectMapping = (index: number) => {
    const mappingToRemove = config.projectMappings[index];
    
    setConfig(prev => ({
      ...prev,
      projectMappings: prev.projectMappings.filter((_, i) => i !== index),
      sectionMappings: prev.sectionMappings.filter(
        section => section.projectMappingId !== mappingToRemove.taskFuchsProjectId
      )
    }));
  };

  // Add section mapping
  const addSectionMapping = (projectMappingId: string) => {
    const newMapping: TodoistSectionMapping = {
      taskFuchsColumnId: '',
      todoistSectionId: '',
      taskFuchsColumnName: '',
      todoistSectionName: '',
      projectMappingId,
      enabled: true
    };
    
    setConfig(prev => ({
      ...prev,
      sectionMappings: [...prev.sectionMappings, newMapping]
    }));
  };

  // Update section mapping
  const updateSectionMapping = (index: number, updates: Partial<TodoistSectionMapping>) => {
    setConfig(prev => ({
      ...prev,
      sectionMappings: prev.sectionMappings.map((mapping, i) => 
        i === index ? { ...mapping, ...updates } : mapping
      )
    }));
  };

  // Remove section mapping
  const removeSectionMapping = (index: number) => {
    setConfig(prev => ({
      ...prev,
      sectionMappings: prev.sectionMappings.filter((_, i) => i !== index)
    }));
  };

  // Get columns for a specific project
  const getProjectColumns = (projectId: string): ProjectKanbanColumn[] => {
    // Project kanban columns are stored in state.viewState.projectKanban.columns
    return state.viewState.projectKanban.columns
      .filter(col => col.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  };

  // Save configuration
  const saveConfiguration = async () => {
    try {
      const finalConfig = {
        ...config,
        apiToken: apiToken.trim(),
        enabled: true
      };
      
      todoistSyncManager.updateConfig(finalConfig);
      
      onSyncConfigured();
      onClose();
    } catch (error) {
      console.error('❌ Error saving Todoist configuration:', error);
    }
  };

  // Reset configuration
  const resetConfiguration = () => {
    todoistSyncManager.resetConfig();
    setConfig(todoistSyncManager.getConfig()!);
    setApiToken('');
    setCurrentStep(1);
    setConnectionStatus('idle');
    setConnectionMessage('');
    setTodoistProjects([]);
    setTodoistSections({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: accentColor + '20' }}
            >
              <Settings 
                className="w-5 h-5"
                style={{ color: accentColor }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Todoist-Synchronisation einrichten
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Schritt {currentStep} von 3: {
                  currentStep === 1 ? 'API-Verbindung' :
                  currentStep === 2 ? 'Projekt-Zuordnung' :
                  'Einstellungen & Fertigstellung'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step <= currentStep
                      ? 'text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                  style={{ backgroundColor: step <= currentStep ? accentColor : undefined }}
                >
                  {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                {step < 3 && (
                  <div 
                    className={`flex-1 h-1 rounded transition-colors duration-300 ${
                      step < currentStep ? '' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    style={{ backgroundColor: step < currentStep ? accentColor : undefined }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: API Connection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Todoist API-Token eingeben
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Holen Sie sich Ihren API-Token aus den Todoist-Einstellungen unter "Integrationen"
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API-Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Ihr Todoist API-Token"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                  <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                    connectionStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    connectionStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  }`}>
                    {connectionStatus === 'testing' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : connectionStatus === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{connectionMessage}</span>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                    So erhalten Sie Ihren API-Token:
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
                    <li>Gehen Sie zu <a href="https://todoist.com/app/settings/integrations" target="_blank" rel="noopener noreferrer" className="underline">Todoist Einstellungen → Integrationen</a></li>
                    <li>Scrollen Sie zu "API-Token" und kopieren Sie den Token</li>
                    <li>Fügen Sie den Token hier ein und klicken Sie auf "Verbindung testen"</li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={testConnection}
                  disabled={!apiToken.trim() || connectionStatus === 'testing'}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Teste Verbindung...
                    </>
                  ) : (
                    'Verbindung testen'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Project Mapping */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Projekte zuordnen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Verknüpfen Sie Ihre TaskFuchs-Projekte mit Todoist-Projekten
                </p>
              </div>

              {/* Project Mappings */}
              <div className="space-y-4">
                {config.projectMappings.map((mapping, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Projekt-Zuordnung {index + 1}
                      </h4>
                      <button
                        onClick={() => removeProjectMapping(index)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* TaskFuchs Project */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          TaskFuchs-Projekt
                        </label>
                        <select
                          value={mapping.taskFuchsProjectId}
                          onChange={(e) => {
                            const selectedProject = taskFuchsProjects.find(p => p.id === e.target.value);
                            updateProjectMapping(index, {
                              taskFuchsProjectId: e.target.value,
                              taskFuchsProjectName: selectedProject?.title || ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        >
                          <option value="">Projekt auswählen...</option>
                          {taskFuchsProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Todoist Project */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Todoist-Projekt
                        </label>
                        <select
                          value={mapping.todoistProjectId}
                          onChange={(e) => {
                            const selectedProject = todoistProjects.find(p => p.id === e.target.value);
                            updateProjectMapping(index, {
                              todoistProjectId: e.target.value,
                              todoistProjectName: selectedProject?.name || ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        >
                          <option value="">Projekt auswählen...</option>
                          {todoistProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Section Mappings for this project */}
                    {mapping.taskFuchsProjectId && mapping.todoistProjectId && (
                      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Spalten-Zuordnung (optional)
                          </h5>
                          <button
                            onClick={() => addSectionMapping(mapping.taskFuchsProjectId)}
                            className="text-sm px-3 py-1 rounded-md text-white transition-colors"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Spalte zuordnen
                          </button>
                        </div>

                        {config.sectionMappings
                          .filter(section => section.projectMappingId === mapping.taskFuchsProjectId)
                          .map((sectionMapping, sectionIndex) => {
                            const actualIndex = config.sectionMappings.findIndex(
                              sm => sm === sectionMapping
                            );
                            return (
                              <div key={actualIndex} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                {/* TaskFuchs Column */}
                                <select
                                  value={sectionMapping.taskFuchsColumnId}
                                  onChange={(e) => {
                                    const selectedColumn = getProjectColumns(mapping.taskFuchsProjectId).find(
                                      c => c.id === e.target.value
                                    );
                                    updateSectionMapping(actualIndex, {
                                      taskFuchsColumnId: e.target.value,
                                      taskFuchsColumnName: selectedColumn?.title || ''
                                    });
                                  }}
                                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:border-transparent dark:bg-gray-600 dark:text-white"
                                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                >
                                  <option value="">TaskFuchs-Spalte...</option>
                                  {getProjectColumns(mapping.taskFuchsProjectId).map((column) => (
                                    <option key={column.id} value={column.id}>
                                      {column.title}
                                    </option>
                                  ))}
                                </select>

                                {/* Todoist Section */}
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={sectionMapping.todoistSectionId}
                                    onChange={(e) => {
                                      const selectedSection = todoistSections[mapping.todoistProjectId]?.find(
                                        s => s.id === e.target.value
                                      );
                                      updateSectionMapping(actualIndex, {
                                        todoistSectionId: e.target.value,
                                        todoistSectionName: selectedSection?.name || ''
                                      });
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:border-transparent dark:bg-gray-600 dark:text-white"
                                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                  >
                                    <option value="">Todoist-Bereich...</option>
                                    {todoistSections[mapping.todoistProjectId]?.map((section) => (
                                      <option key={section.id} value={section.id}>
                                        {section.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => removeSectionMapping(actualIndex)}
                                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={addProjectMapping}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Weitere Projekt-Zuordnung hinzufügen
                </button>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={config.projectMappings.length === 0}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  Weiter
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Final Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Sync-Einstellungen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Konfigurieren Sie die Details der Synchronisation
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Grundeinstellungen</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bidirektionale Synchronisation
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Änderungen werden in beide Richtungen synchronisiert
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.bidirectionalSync}
                        onChange={(e) => setConfig(prev => ({ ...prev, bidirectionalSync: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Automatische Synchronisation (Minuten)
                    </label>
                    <select
                      value={config.autoSyncInterval}
                      onChange={(e) => setConfig(prev => ({ ...prev, autoSyncInterval: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    >
                      <option value={0}>Deaktiviert</option>
                      <option value={5}>Alle 5 Minuten</option>
                      <option value={15}>Alle 15 Minuten</option>
                      <option value={30}>Alle 30 Minuten</option>
                      <option value={60}>Stündlich</option>
                    </select>
                  </div>
                </div>

                {/* Sync Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Was synchronisieren?</h4>
                  
                  {[
                    { key: 'syncTasks' as const, label: 'Aufgaben', description: 'Aufgabentitel und Status' },
                    { key: 'syncDescriptions' as const, label: 'Beschreibungen', description: 'Detaillierte Aufgabenbeschreibungen' },
                    { key: 'syncDueDates' as const, label: 'Fälligkeitsdaten', description: 'Termine und Deadlines' },
                    { key: 'syncPriorities' as const, label: 'Prioritäten', description: 'Aufgaben-Prioritätsstufen' },
                    { key: 'syncLabels' as const, label: 'Tags/Labels', description: 'Kategorien und Schlagwörter' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {setting.label}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {setting.description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.syncSettings[setting.key]}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            syncSettings: { ...prev.syncSettings, [setting.key]: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Conflict Resolution */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Konfliktbehandlung</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'local-wins' as const, label: 'TaskFuchs gewinnt', description: 'Lokale Änderungen haben Vorrang' },
                      { value: 'remote-wins' as const, label: 'Todoist gewinnt', description: 'Todoist-Änderungen haben Vorrang' },
                      { value: 'manual' as const, label: 'Manuell entscheiden', description: 'Bei Konflikten nachfragen' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="radio"
                          name="conflictResolution"
                          value={option.value}
                          checked={config.syncSettings.conflictResolution === option.value}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            syncSettings: { ...prev.syncSettings, conflictResolution: e.target.value as any }
                          }))}
                          className="w-4 h-4"
                          style={{ accentColor }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {option.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="space-x-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={resetConfiguration}
                    className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <button
                  onClick={saveConfiguration}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200"
                  style={{ backgroundColor: accentColor }}
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Synchronisation aktivieren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 