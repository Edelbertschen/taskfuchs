import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Plus, 
  X, 
  RefreshCw, 
  Loader, 
  CheckCircle,
  AlertCircle,
  Folder,
  List,
  Settings,
  Save,
  RotateCcw,
  Link
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { microsoftToDoService } from '../../utils/microsoftTodoService';
import type { 
  MicrosoftToDoSection, 
  MicrosoftToDoList, 
  MicrosoftToDoProjectMapping,
  MicrosoftToDoColumnMapping 
} from '../../types';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface MicrosoftToDoProjectMappingProps {
  onShowSaved: () => void;
}

export function MicrosoftToDoProjectMapping({ onShowSaved }: MicrosoftToDoProjectMappingProps) {
  const { state, dispatch } = useApp();
  const t = useAppTranslation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [availableSections, setAvailableSections] = useState<MicrosoftToDoSection[]>([]);
  const [availableLists, setAvailableLists] = useState<MicrosoftToDoList[]>([]);
  const [sectionListMap, setSectionListMap] = useState<Map<string, MicrosoftToDoList[]>>(new Map());
  const [mappings, setMappings] = useState<MicrosoftToDoProjectMapping[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  const settings = state.preferences.microsoftTodo || {
    enabled: false,
    projectMappings: [],
    useSectionMapping: true
  };

  // Load sections and lists on mount
  useEffect(() => {
    if (settings.enabled && microsoftToDoService.isAuthenticated()) {
      loadMicrosoftData();
    }
  }, [settings.enabled]);

  // Initialize mappings from settings
  useEffect(() => {
    setMappings(settings.projectMappings || []);
  }, [settings.projectMappings]);

  const loadMicrosoftData = async () => {
    setIsLoading(true);
    try {
      // Load sections and lists in parallel
      const [sections, lists] = await Promise.all([
        microsoftToDoService.getSections(),
        microsoftToDoService.getLists()
      ]);
      
      setAvailableSections(sections);
      setAvailableLists(lists);
      
      // Group lists by section (this is a simplified approach - 
      // Microsoft Graph API doesn't directly support sections as folders)
      // For now, we'll show all lists as available for any section
      const sectionMap = new Map<string, MicrosoftToDoList[]>();
      sections.forEach(section => {
        sectionMap.set(section.id, lists);
      });
      setSectionListMap(sectionMap);
      
    } catch (error) {
      console.error('Failed to load Microsoft To Do data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addProjectMapping = () => {
    const unmappedProjects = state.columns.filter(project => 
      project.type === 'project' && !mappings.some(m => m.taskFuchsProjectId === project.id)
    );
    
    if (unmappedProjects.length === 0) return;
    
    const project = unmappedProjects[0];
    const newMapping: MicrosoftToDoProjectMapping = {
      taskFuchsProjectId: project.id,
      taskFuchsProjectName: project.title,
      microsoftSectionId: '',
      microsoftSectionName: '',
      enabled: false,
      columnMappings: []
    };
    
    setMappings([...mappings, newMapping]);
    setExpandedProjects(new Set([...expandedProjects, project.id]));
  };

  const removeProjectMapping = (projectId: string) => {
    setMappings(mappings.filter(m => m.taskFuchsProjectId !== projectId));
    setExpandedProjects(new Set([...expandedProjects].filter(id => id !== projectId)));
  };

  const updateProjectMapping = (projectId: string, updates: Partial<MicrosoftToDoProjectMapping>) => {
    setMappings(mappings.map(mapping => 
      mapping.taskFuchsProjectId === projectId 
        ? { ...mapping, ...updates }
        : mapping
    ));
  };

  const addColumnMapping = (projectId: string) => {
    const project = state.columns.find(col => col.id === projectId);
    if (!project) return;
    
    const projectMapping = mappings.find(m => m.taskFuchsProjectId === projectId);
    if (!projectMapping) return;
    
    const projectColumns = state.columns.filter(col => col.projectId === projectId);
    const unmappedColumns = projectColumns.filter(col => 
      !projectMapping.columnMappings.some(cm => cm.taskFuchsColumnId === col.id)
    );
    
    if (unmappedColumns.length === 0) return;
    
    const column = unmappedColumns[0];
    const newColumnMapping: MicrosoftToDoColumnMapping = {
      taskFuchsColumnId: column.id,
      taskFuchsColumnName: column.title,
      microsoftListId: '',
      microsoftListName: '',
      enabled: false
    };
    
    updateProjectMapping(projectId, {
      columnMappings: [...projectMapping.columnMappings, newColumnMapping]
    });
  };

  const removeColumnMapping = (projectId: string, columnId: string) => {
    const projectMapping = mappings.find(m => m.taskFuchsProjectId === projectId);
    if (!projectMapping) return;
    
    updateProjectMapping(projectId, {
      columnMappings: projectMapping.columnMappings.filter(cm => cm.taskFuchsColumnId !== columnId)
    });
  };

  const updateColumnMapping = (projectId: string, columnId: string, updates: Partial<MicrosoftToDoColumnMapping>) => {
    const projectMapping = mappings.find(m => m.taskFuchsProjectId === projectId);
    if (!projectMapping) return;
    
    updateProjectMapping(projectId, {
      columnMappings: projectMapping.columnMappings.map(mapping => 
        mapping.taskFuchsColumnId === columnId 
          ? { ...mapping, ...updates }
          : mapping
      )
    });
  };

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const saveMappings = async () => {
    setIsSaving(true);
    try {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: {
          microsoftTodo: {
            ...settings,
            projectMappings: mappings,
            useSectionMapping: true
          }
        }
      });
      onShowSaved();
    } catch (error) {
      console.error('Failed to save mappings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetMappings = () => {
    setMappings([]);
    setExpandedProjects(new Set());
  };

  const getAvailableProjects = () => {
    return state.columns.filter(project => 
      project.type === 'project' && !mappings.some(m => m.taskFuchsProjectId === project.id)
    );
  };

  const getProjectColumns = (projectId: string) => {
    return state.columns.filter(col => col.projectId === projectId);
  };

  const getAvailableColumnsForProject = (projectId: string) => {
    const projectMapping = mappings.find(m => m.taskFuchsProjectId === projectId);
    if (!projectMapping) return [];
    
    const projectColumns = getProjectColumns(projectId);
    return projectColumns.filter(col => 
      !projectMapping.columnMappings.some(cm => cm.taskFuchsColumnId === col.id)
    );
  };

  if (!settings.enabled || !microsoftToDoService.isAuthenticated()) {
    return (
      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Microsoft To Do Verbindung erforderlich
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Bitte verbinden Sie sich zuerst mit Microsoft To Do, um Projekt-Mappings zu konfigurieren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Projekt-Mapping Konfiguration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Ordnen Sie TaskFuchs-Projekte zu Microsoft To Do-Bereichen und Spalten zu Listen zu.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadMicrosoftData}
            disabled={isLoading}
            className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mapping Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Projekt-Zuordnungen
            </h4>
            <div className="flex items-center space-x-3">
              <button
                onClick={resetMappings}
                disabled={mappings.length === 0}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Zurücksetzen</span>
              </button>
              <button
                onClick={addProjectMapping}
                disabled={getAvailableProjects().length === 0}
                style={{
                  backgroundColor: getAvailableProjects().length > 0 ? state.preferences.accentColor : '#9ca3af'
                }}
                className="px-3 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Projekt hinzufügen</span>
              </button>
            </div>
          </div>

          {/* Project Mappings */}
          <div className="space-y-4">
            {mappings.map((mapping) => {
              const isExpanded = expandedProjects.has(mapping.taskFuchsProjectId);
              const availableColumns = getAvailableColumnsForProject(mapping.taskFuchsProjectId);
              const sectionLists = sectionListMap.get(mapping.microsoftSectionId) || [];
              
              return (
                <div key={mapping.taskFuchsProjectId} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  {/* Project Header */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleProjectExpanded(mapping.taskFuchsProjectId)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        <Folder className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {mapping.taskFuchsProjectName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            TaskFuchs Projekt
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeProjectMapping(mapping.taskFuchsProjectId)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Section Selection */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Microsoft To Do Bereich
                        </label>
                        <select
                          value={mapping.microsoftSectionId}
                          onChange={(e) => {
                            const sectionId = e.target.value;
                            const section = availableSections.find(s => s.id === sectionId);
                            updateProjectMapping(mapping.taskFuchsProjectId, {
                              microsoftSectionId: sectionId,
                              microsoftSectionName: section?.displayName || ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Bereich auswählen...</option>
                          {availableSections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={mapping.enabled}
                            onChange={(e) => updateProjectMapping(mapping.taskFuchsProjectId, {
                              enabled: e.target.checked
                            })}
                            style={{
                              accentColor: state.preferences.accentColor
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Synchronisation aktiviert
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Column Mappings */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Spalten-Zuordnungen
                        </h5>
                        <button
                          onClick={() => addColumnMapping(mapping.taskFuchsProjectId)}
                          disabled={availableColumns.length === 0}
                          style={{
                            backgroundColor: availableColumns.length > 0 ? state.preferences.accentColor : '#9ca3af'
                          }}
                          className="px-2 py-1 text-white text-sm rounded transition-colors disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Spalte</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {mapping.columnMappings.map((columnMapping) => (
                          <div key={columnMapping.taskFuchsColumnId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                              <div className="flex items-center space-x-2">
                                <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {columnMapping.taskFuchsColumnName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    TaskFuchs Spalte
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <select
                                  value={columnMapping.microsoftListId}
                                  onChange={(e) => {
                                    const listId = e.target.value;
                                    const list = sectionLists.find(l => l.id === listId);
                                    updateColumnMapping(mapping.taskFuchsProjectId, columnMapping.taskFuchsColumnId, {
                                      microsoftListId: listId,
                                      microsoftListName: list?.displayName || ''
                                    });
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                                >
                                  <option value="">Liste auswählen...</option>
                                  {sectionLists.map((list) => (
                                    <option key={list.id} value={list.id}>
                                      {list.displayName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={columnMapping.enabled}
                                    onChange={(e) => updateColumnMapping(mapping.taskFuchsProjectId, columnMapping.taskFuchsColumnId, {
                                      enabled: e.target.checked
                                    })}
                                    style={{
                                      accentColor: state.preferences.accentColor
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-gray-700 dark:text-gray-300">
                                    Aktiv
                                  </span>
                                </label>
                                <button
                                  onClick={() => removeColumnMapping(mapping.taskFuchsProjectId, columnMapping.taskFuchsColumnId)}
                                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {mapping.columnMappings.length === 0 && (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                            Keine Spalten-Zuordnungen konfiguriert
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {mappings.length === 0 && (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Noch keine Projekt-Zuordnungen konfiguriert
                </p>
                <button
                  onClick={addProjectMapping}
                  disabled={getAvailableProjects().length === 0}
                  style={{
                    backgroundColor: getAvailableProjects().length > 0 ? state.preferences.accentColor : '#9ca3af'
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Erstes Projekt hinzufügen</span>
                </button>
              </div>
            )}
          </div>

          {/* Save Controls */}
          {mappings.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-3">
              <button
                onClick={resetMappings}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                                 {t.actions.cancel()}
              </button>
              <button
                onClick={saveMappings}
                disabled={isSaving}
                style={{
                  backgroundColor: state.preferences.accentColor
                }}
                className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                                 <span>{isSaving ? 'Speichere...' : t.actions.save()}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Info */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader className="w-6 h-6 animate-spin text-gray-400 mr-3" />
          <span className="text-gray-500 dark:text-gray-400">
            Microsoft To Do Daten werden geladen...
          </span>
        </div>
      )}
    </div>
  );
} 