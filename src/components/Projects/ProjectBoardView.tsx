import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  rectIntersection,
  pointerWithin
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { TaskColumn } from '../Tasks/TaskColumn';
import { TaskCard } from '../Tasks/TaskCard';
import { TaskModal } from '../Tasks/TaskModal';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import type { Task, Column } from '../../types';
import { format } from 'date-fns';

interface ProjectBoardViewProps {
  project: Column;
}

interface DeleteColumnModalProps {
  isOpen: boolean;
  columnTitle: string;
  taskCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteColumnModal({ isOpen, columnTitle, taskCount, onClose, onConfirm }: DeleteColumnModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const isConfirmValid = confirmText === t('projects.delete_placeholder');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmValid) {
      onConfirm();
      setConfirmText('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Spalte löschen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Diese Aktion kann nicht rückgängig gemacht werden
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {t('projects.delete_column_confirm', { title: columnTitle })}
          </p>
          {taskCount > 0 && (
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">
              {t('projects.delete_column_warning', { count: taskCount })}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('projects.delete_confirmation_prompt')}
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={t('projects.delete_placeholder')}
              autoFocus
            />
          </form>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('projects.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isConfirmValid}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              isConfirmValid
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('projects.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectBoardView() {
  return <div>ProjectBoardView</div>;
} 