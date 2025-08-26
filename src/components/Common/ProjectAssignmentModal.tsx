import React, { useState, useEffect } from 'react';
import { X, Search, FolderOpen, Folder } from 'lucide-react';
import type { Column } from '../../types';

interface ProjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignProject: (columnId: string) => void;
  availableProjects: Column[];
  title?: string;
  currentProject?: string;
}

export function ProjectAssignmentModal({ 
  isOpen, 
  onClose, 
  onAssignProject, 
  availableProjects, 
  title = "Projekt zuweisen",
  currentProject 
}: ProjectAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState(availableProjects);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProjects(availableProjects);
    } else {
      setFilteredProjects(
        availableProjects.filter(project =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, availableProjects]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleAssign = (columnId: string) => {
    onAssignProject(columnId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Projekt suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Project List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Keine Projekte gefunden' : 'Keine Projekte verfügbar'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleAssign(project.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 group ${
                      currentProject === project.id
                        ? 'bg-accent/10 border-2 border-accent/30'
                        : 'border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          currentProject === project.id
                            ? 'bg-accent'
                            : 'bg-gray-300 dark:bg-gray-500 group-hover:bg-gray-400 dark:group-hover:bg-gray-400'
                        }`}></div>
                                                 <div>
                           <h3 className="font-medium text-gray-900 dark:text-white">
                             {project.title}
                           </h3>
                         </div>
                      </div>
                      {currentProject === project.id && (
                        <div className="text-accent font-medium text-sm">
                          Aktuell
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 