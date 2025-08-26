import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { ProjectManager } from './ProjectManager';

interface ProjectToggleProps {
  iconOnly?: boolean;
  sourceColumnId?: string; // The column ID where projects should be created/belong to
}

export function ProjectToggle({ iconOnly = false, sourceColumnId }: ProjectToggleProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  const openProjectManager = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProjectManagerOpen(true);
  };

  return (
    <>
      {iconOnly ? (
        // Only Settings Button for sidebar
        <button
          onClick={openProjectManager}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
          title={t('projects.manage_projects')}
        >
          <Settings className="w-4 h-4" />
        </button>
      ) : (
        // Full Label with Settings for standalone use
        <div className="group flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <span className="font-medium text-sm">{t('projects.title')}</span>
          
          {/* Settings Button - always visible */}
          <button
            onClick={openProjectManager}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            title={t('projects.manage_projects')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Project Manager Modal */}
      <ProjectManager
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        sourceColumnId={sourceColumnId}
      />
    </>
  );
} 