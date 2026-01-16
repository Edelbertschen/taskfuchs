import React, { useState } from 'react';
import { X, FolderOpen, ChevronRight, Check, Search, FolderX } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';

interface ProjectColumnSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string, columnId?: string) => void;
  taskId?: string;
  currentProjectId?: string;
  currentColumnId?: string;
}

export function ProjectColumnSelector({
  isOpen,
  onClose,
  onSelect,
  taskId,
  currentProjectId,
  currentColumnId
}: ProjectColumnSelectorProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get all projects
  const projects = state.columns
    .filter(col => col.type === 'project')
    .sort((a, b) => a.order - b.order);

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get project kanban columns for selected project
  const getProjectKanbanColumns = (projectId: string) => {
    return state.viewState.projectKanban.columns
      .filter(col => col.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  };

  // Direct assignment: project without columns OR first column of project with columns
  const handleDirectProjectAssign = (project: Column) => {
    const kanbanColumns = getProjectKanbanColumns(project.id);
    
    if (kanbanColumns.length === 0) {
      // No columns exist - assign directly to project (no column)
      handleColumnSelect(project.id);
    } else {
      // Columns exist - assign to first column
      handleColumnSelect(project.id, kanbanColumns[0].id);
    }
  };

  // Toggle column visibility
  const toggleProjectExpand = (projectId: string) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(projectId);
    }
  };

  const handleColumnSelect = (projectId: string | null, columnId?: string) => {
    if (projectId === null) {
      // Special case: remove from all projects - move to inbox
      onSelect('inbox', undefined);
    } else {
      onSelect(projectId, columnId);
    }
    onClose();
  };

  const getAccentColor = () => {
    return state.preferences.accentColor || '#0ea5e9';
  };

  const getCurrentLocation = () => {
    if (!currentProjectId) return 'Keine Zuordnung';
    
    const currentProject = projects.find(p => p.id === currentProjectId);
    if (!currentProject) return 'Unbekanntes Projekt';
    
    if (currentColumnId && currentColumnId !== currentProjectId) {
      const currentColumn = getProjectKanbanColumns(currentProjectId)
        .find(col => col.id === currentColumnId);
      if (currentColumn) {
        return `${currentProject.title} › ${currentColumn.title}`;
      }
    }
    
    return currentProject.title;
  };

  return (
    <div 
              className="fixed inset-0 sm:left-80 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000000]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" style={{ zIndex: 10000001 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Projekt auswählen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Aktuell: {getCurrentLocation()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Projekt suchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? t('projects.no_projects_found') : t('projects.no_projects_title')}</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {/* "Kein Projekt" Option */}
              <div className="mb-3">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 h-16 ${
                    !currentProjectId
                      ? 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                  onClick={() => handleColumnSelect(null)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FolderX 
                      className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium truncate ${
                          !currentProjectId 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {t('projects.no_project')}
                        </span>
                        {!currentProjectId && (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('projects.remove_from_projects')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <hr className="border-gray-200 dark:border-gray-600 my-2" />
              
              {filteredProjects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                const isCurrent = currentProjectId === project.id;
                const kanbanColumns = getProjectKanbanColumns(project.id);
                
                return (
                  <div key={project.id} className="space-y-1">
                    {/* Project Row */}
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 h-16 ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {/* Project name - click to assign directly */}
                      <button
                        className="flex items-center space-x-3 flex-1 cursor-pointer text-left"
                        onClick={() => handleDirectProjectAssign(project)}
                        title={kanbanColumns.length > 0 
                          ? `Zur Spalte "${kanbanColumns[0].title}" zuweisen`
                          : 'Projekt zuweisen'
                        }
                      >
                        <FolderOpen 
                          className="w-5 h-5 flex-shrink-0"
                          style={{ 
                            color: project.color || (isCurrent ? getAccentColor() : undefined)
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium truncate ${
                              isCurrent 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {project.title}
                            </span>
                            {isCurrent && (
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          {kanbanColumns.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              → {kanbanColumns[0].title} (von {kanbanColumns.length} Spalten)
                            </p>
                          )}
                        </div>
                      </button>
                      
                      {/* Chevron to expand columns - only if there are columns */}
                      {kanbanColumns.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectExpand(project.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Andere Spalte wählen"
                        >
                          <ChevronRight 
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                              isSelected ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Kanban Columns (if project is selected and has columns) */}
                    {isSelected && kanbanColumns.length > 0 && (
                      <div className="ml-8 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                        {/* Kanban Columns - no more "Hauptspalte", show actual columns */}
                        {kanbanColumns.map((column) => {
                          const isCurrentColumn = currentColumnId === column.id;
                          
                          return (
                            <button
                              key={column.id}
                              onClick={() => handleColumnSelect(project.id, column.id)}
                              className={`w-full text-left p-2 rounded-lg transition-colors duration-200 flex items-center justify-between group h-10 ${
                                isCurrentColumn
                                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: column.color || '#6b7280' }}
                                />
                                <span className={`text-sm ${
                                  isCurrentColumn 
                                    ? 'text-green-800 dark:text-green-200 font-medium' 
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {column.title}
                                </span>
                              </div>
                              {isCurrentColumn && (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
} 