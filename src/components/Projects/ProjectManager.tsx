import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { 
  X, 
  Plus, 
  Check,
  GripVertical, 
  Edit2, 
  Trash2, 
  FolderOpen,
  FolderClosed,
  Hash,
  AlertTriangle,
  Package,
  Search,
  Star,
  Users,
  Clock,
  CheckCircle,
  MoreVertical,
  BarChart3
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../../context/AppContext';
import type { Column } from '../../types';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { ProjectTimebudgetModal } from './ProjectTimebudgetModal';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceColumnId?: string; // The column ID where this project should be created/belong to
}

interface SortableProjectItemProps {
  project: Column;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onOpenTimebudget: () => void;
  taskCount: number;
}

function SortableProjectItem({
  project,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onOpenTimebudget,
  taskCount
}: SortableProjectItemProps) {
  const { i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get accent color from parent context
  const accentColor = '#f97316'; // Will be passed from parent or context

  // Color generation functions
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return [h! * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const generateColors = () => {
    const [h, s, l] = hexToHsl(accentColor);
    return {
      primary: accentColor,
      danger: hslToHex(0, Math.min(s, 80), Math.min(l, 50)),
      success: hslToHex(142, Math.min(s, 80), Math.min(l, 50)),
      warning: hslToHex(48, Math.min(s, 80), Math.min(l, 50)),
      light: hslToHex(h, Math.max(s * 0.3, 20), Math.min(l + 40, 95)),
      dark: hslToHex(h, Math.min(s, 80), Math.max(l - 20, 10))
    };
  };

  const colors = generateColors();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-200 h-16 ${
        isDragging ? 'opacity-50 scale-105 shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
                  <div 
              {...attributes}
              {...listeners}
              data-drag-handle
              className="flex items-center justify-center w-6 h-6 mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <GripVertical className="w-3 h-3" />
            </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col space-y-3">
            {/* Input Field */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              className="w-full px-3 py-2 text-sm font-medium border-2 rounded-lg focus:outline-none focus:ring-0 bg-white dark:bg-gray-600 text-gray-900 dark:text-white transition-colors duration-200"
              style={{ 
                borderColor: colors.primary,
                boxShadow: `0 0 0 3px ${colors.primary}20`
              }}
              placeholder={i18n.language === 'en' ? 'Enter project name...' : 'Projektname eingeben...'}
              autoFocus
              autoComplete="off"
            />
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={onCancelEdit}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <X className="w-5 h-5" />
                <span>{i18n.language === 'en' ? 'Cancel' : 'Abbrechen'}</span>
              </button>
              
              <button
                onClick={onSaveEdit}
                disabled={!editTitle.trim()}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: editTitle.trim() ? colors.primary : '#9ca3af'
                }}
              >
                <CheckCircle className="w-5 h-5" />
                <span>{i18n.language === 'en' ? 'Save' : 'Speichern'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {project.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {taskCount} Aufgaben
                </p>
              </div>
              {/* Edit Button inline next to title */}
              <button
                onClick={onStartEdit}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                title={i18n.language === 'en' ? 'Rename Project' : 'Projekt umbenennen'}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              {/* Timebudget Button */}
              <button
                onClick={onOpenTimebudget}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                title={i18n.language === 'en' ? 'Capacity Planning' : 'Kapazitätsplanung'}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              {/* Delete Button */}
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                title={i18n.language === 'en' ? 'Delete Project' : 'Projekt löschen'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectManager({ isOpen, onClose, sourceColumnId }: ProjectManagerProps) {
  const { t, i18n } = useTranslation();
  // const { projects: projectsTranslations } = useAppTranslation();
  const { state, dispatch } = useApp();
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedProject, setSelectedProject] = useState<Column | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string; projectName: string }>({
    isOpen: false,
    projectId: '',
    projectName: ''
  });


  // Get accent color from settings
  const accentColor = state.preferences.accentColor || '#f97316';

  // Color generation functions
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return [h! * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const generateColors = () => {
    const [h, s, l] = hexToHsl(accentColor);
    return {
      primary: accentColor,
      danger: hslToHex(0, Math.min(s, 80), Math.min(l, 50)),
      success: hslToHex(142, Math.min(s, 80), Math.min(l, 50)),
      warning: hslToHex(48, Math.min(s, 80), Math.min(l, 50)),
      light: hslToHex(h, Math.max(s * 0.3, 20), Math.min(l + 40, 95)),
      dark: hslToHex(h, Math.min(s, 80), Math.max(l - 20, 10))
    };
  };

  const colors = generateColors();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const projectColumns = state.columns
    .filter(col => col.type === 'project')
    .sort((a, b) => a.order - b.order);

  const getTaskCountForProject = (columnId: string) => {
    return state.tasks.filter(task => task.columnId === columnId).length;
  };

  const handleStartEdit = (project: Column) => {
    setEditingProject(project.id);
    setEditTitle(project.title);
  };

  const handleSaveEdit = () => {
    if (editingProject && editTitle.trim()) {
      const project = projectColumns.find(p => p.id === editingProject);
      if (project) {
        dispatch({
          type: 'UPDATE_COLUMN',
          payload: { ...project, title: editTitle.trim() }
        });
      }
    }
    setEditingProject(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditTitle('');
  };

  const handleDeleteProject = (project: Column) => {
    const taskCount = getTaskCountForProject(project.id);
    
    if (taskCount > 0) {
      // Show confirmation modal if project has tasks
      setDeleteModal({
        isOpen: true,
        projectId: project.id,
        projectName: project.title
      });
    } else {
      // Delete immediately if no tasks
      dispatch({ type: 'DELETE_PROJECT', payload: project.id });
    }
  };

  const handleConfirmDelete = () => {
    dispatch({ type: 'DELETE_PROJECT', payload: deleteModal.projectId });
    setDeleteModal({ isOpen: false, projectId: '', projectName: '' });
  };

  const handleAddProject = () => {
    const newProjectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxOrder = projectColumns.length > 0 
      ? Math.max(...projectColumns.map(col => col.order)) 
      : 10;
    
    const newProject: Column = {
      id: newProjectId,
      title: i18n.language === 'en' ? 'New Project' : 'Neues Projekt',
      type: 'project',
      order: maxOrder + 1,
      tasks: [],
      parentColumnId: sourceColumnId // Assign to source column if provided
    };

    dispatch({ type: 'ADD_COLUMN', payload: newProject });
    
    // Prüfen, ob bereits Spalten für dieses Projekt existieren
    const existingColumns = state.viewState.projectKanban.columns.filter(col => col.projectId === newProjectId);
    
    if (existingColumns.length === 0) {
      // AUTOMATISCH STANDARD-KANBAN-SPALTEN ERSTELLEN (nur wenn noch keine vorhanden)
      const defaultColumns = [
        { title: 'To Do', color: '#6b7280' },
        { title: 'Doing', color: '#f59e0b' }, 
        { title: 'Done', color: '#10b981' }
      ];
      
      defaultColumns.forEach((colDef, index) => {
        dispatch({
          type: 'ADD_PROJECT_KANBAN_COLUMN',
          payload: {
            title: colDef.title,
            projectId: newProjectId,
            color: colDef.color
          }
        });
      });
    }
    
    // Start editing the new project immediately
    setTimeout(() => {
      setEditingProject(newProjectId);
      setEditTitle(i18n.language === 'en' ? 'New Project' : 'Neues Projekt');
    }, 100);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = projectColumns.findIndex(col => col.id === active.id);
      const newIndex = projectColumns.findIndex(col => col.id === over?.id);

      const reorderedColumns = arrayMove(projectColumns, oldIndex, newIndex);
      
      // Update the order values and dispatch all columns at once
      const columnsWithNewOrder = reorderedColumns.map((col, index) => ({
        ...col,
        order: index + 10
      }));
      
      // Include all other columns (non-project columns) to maintain their state
      const allColumns = state.columns.map(col => {
        if (col.type === 'project') {
          const updatedProjectCol = columnsWithNewOrder.find(pc => pc.id === col.id);
          return updatedProjectCol || col;
        }
        return col;
      });
      
      dispatch({
        type: 'REORDER_COLUMNS',
        payload: allColumns
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
        style={{ zIndex: 600 }}
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('projects.management_title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(projectColumns.length === 1 ? 'projects.project_count' : 'projects.project_count_plural', { count: projectColumns.length })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddProject}
                className="text-white p-2 rounded-md transition-colors duration-200 shadow-sm"
                style={{ backgroundColor: state.preferences.accentColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = state.preferences.accentColor + 'E6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = state.preferences.accentColor;
                }}
                title={t('projects.new_project_tooltip')}
              >
                <Plus className="w-4 h-4" />
              </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto max-h-[70vh]">
            {projectColumns.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FolderClosed className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                  {t('projects.no_projects_title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('projects.no_projects_description')}
                </p>
                <button
                  onClick={handleAddProject}
                  className="px-3 py-2 text-sm text-white rounded-lg transition-colors inline-flex items-center space-x-2"
                  style={{ backgroundColor: state.preferences.accentColor }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = state.preferences.accentColor + 'E6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = state.preferences.accentColor}
                >
                  <Check className="w-4 h-4" />
                  <span>{t('projects.create_first_project')}</span>
                </button>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="p-4 space-y-2">
                  <SortableContext 
                    items={projectColumns.map(col => col.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {projectColumns.map((project) => (
                      <SortableProjectItem
                        key={project.id}
                        project={project}
                        isEditing={editingProject === project.id}
                        editTitle={editTitle}
                        onEditTitleChange={setEditTitle}
                        onStartEdit={() => handleStartEdit(project)}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onDelete={() => handleDeleteProject(project)}
                        onOpenTimebudget={() => setSelectedProject(project)}
                        taskCount={getTaskCountForProject(project.id)}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </div>

          {/* Footer - nur anzeigen wenn mindestens 2 Projekte vorhanden sind für Drag & Drop Hinweis */}
          {projectColumns.length > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {t('projects.drag_to_sort')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
              <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, projectId: '', projectName: '' })}
          onConfirm={handleConfirmDelete}
          title={i18n.language === 'en' ? 'Delete Project' : 'Projekt löschen'}
          message={i18n.language === 'en' ? 'Do you really want to delete the project? All associated tasks will be moved to trash.' : 'Möchten Sie das Projekt wirklich löschen? Alle zugehörigen Aufgaben werden in den Papierkorb verschoben.'}
          itemName={deleteModal.projectName}
          warningText={i18n.language === 'en' ? 'This action cannot be undone.' : 'Diese Aktion kann nicht rückgängig gemacht werden.'}
        />

      {/* Project Timebudget Modal */}
      {selectedProject && (
        <ProjectTimebudgetModal
          isOpen={selectedProject !== null}
          onClose={() => setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </>,
    document.body
  );
} 