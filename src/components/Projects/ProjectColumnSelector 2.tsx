import React, { useState } from 'react';
import { Check, FolderOpen, X, Calendar, Columns, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
  const [selectedSection, setSelectedSection] = useState<'projects' | 'dates'>('projects');

  if (!isOpen) return null;

  // Get all projects
  const projects = state.columns
    .filter(col => col.type === 'project')
    .sort((a, b) => a.order - b.order);

  // Get all date columns
  const dateColumns = state.columns
    .filter(col => col.type === 'date')
    .sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return 0;
    });

  // Get project kanban columns for selected project
  const getProjectKanbanColumns = (projectId: string) => {
    return state.viewState.projectKanban.columns
      .filter(col => col.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  };

  const getAccentColor = () => {
    return state.preferences.accentColor || '#0ea5e9';
  };

  const handleProjectSelect = (projectId: string, columnId?: string) => {
    onSelect(projectId, columnId);
    onClose();
  };

  const handleDateSelect = (columnId: string) => {
    onSelect(columnId);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Aufgabe verschieben
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedSection('projects')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              selectedSection === 'projects'
                ? 'text-white border-b-2'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            style={selectedSection === 'projects' ? {
              backgroundColor: getAccentColor(),
              borderBottomColor: getAccentColor()
            } : {}}
          >
            <div className="flex items-center justify-center space-x-2">
              <FolderOpen className="w-4 h-4" />
              <span>Projekte</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedSection('dates')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              selectedSection === 'dates'
                ? 'text-white border-b-2'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            style={selectedSection === 'dates' ? {
              backgroundColor: getAccentColor(),
              borderBottomColor: getAccentColor()
            } : {}}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Termine</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {selectedSection === 'projects' ? (
            <div className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Projekte vorhanden</p>
                </div>
              ) : (
                projects.map((project) => {
                  const kanbanColumns = getProjectKanbanColumns(project.id);
                  const isCurrentProject = currentProjectId === project.id;
                  
                  return (
                    <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Project Header */}
                      <div
                        className={`p-4 cursor-pointer transition-colors h-20 ${
                          isCurrentProject && !currentColumnId
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={isCurrentProject && !currentColumnId ? {
                          borderLeftColor: getAccentColor()
                        } : {}}
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FolderOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {project.title}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Hauptspalte des Projekts
                              </p>
                            </div>
                          </div>
                          {isCurrentProject && !currentColumnId && (
                            <Check className="w-5 h-5" style={{ color: getAccentColor() }} />
                          )}
                        </div>
                      </div>

                      {/* Project Kanban Columns */}
                      {kanbanColumns.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          {kanbanColumns.map((column, index) => {
                            const isCurrentColumn = currentColumnId === column.id;
                            
                            return (
                              <div
                                key={column.id}
                                className={`p-4 cursor-pointer transition-colors flex items-center space-x-3 h-16 ${
                                  index < kanbanColumns.length - 1 ? 'border-b border-gray-100 dark:border-gray-600' : ''
                                } ${
                                  isCurrentColumn
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                style={isCurrentColumn ? {
                                  borderLeftColor: getAccentColor()
                                } : {}}
                                onClick={() => handleProjectSelect(project.id, column.id)}
                              >
                                <ChevronRight className="w-4 h-4 text-gray-400 ml-4" />
                                <Columns className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {column.title}
                                  </span>
                                </div>
                                {isCurrentColumn && (
                                  <Check className="w-4 h-4" style={{ color: getAccentColor() }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {dateColumns.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Termine vorhanden</p>
                  <p className="text-sm mt-2">Erstellen Sie Termine, indem Sie Aufgaben einem Datum zuweisen</p>
                </div>
              ) : (
                dateColumns.map((column) => {
                  const isCurrentColumn = currentColumnId === column.id;
                  const date = column.date ? new Date(column.date) : null;
                  
                  return (
                    <div
                      key={column.id}
                      className={`p-4 rounded-lg cursor-pointer transition-colors border h-16 ${
                        isCurrentColumn
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleDateSelect(column.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {column.title}
                            </span>
                            {date && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {format(date, 'EEEE, dd. MMMM yyyy', { locale: de })}
                              </p>
                            )}
                          </div>
                        </div>
                        {isCurrentColumn && (
                          <Check className="w-5 h-5" style={{ color: getAccentColor() }} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 