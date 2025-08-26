import React from 'react';
import { useTranslation } from 'react-i18next';

interface ProjectTaskBoardProps {
  project: any;
}

export function ProjectTaskBoard({ project }: ProjectTaskBoardProps) {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Project: {project.title}</h2>
      <div className="text-gray-600">
        {t('projects.navigation_loading')}
        <br />
        <small>{t('projects.board_under_repair')}</small>
      </div>
    </div>
  );
} 