import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Check,
  GripVertical, 
  Edit2, 
  Trash2, 
  Columns,
  AlertTriangle,
  CheckCircle,
  Palette,
  ArrowLeft,
  ArrowRight
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
import { useTranslation } from 'react-i18next';
import type { ProjectKanbanColumn } from '../../types';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

interface SortableColumnItemProps {
  column: ProjectKanbanColumn;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  taskCount: number;
}

// Predefined colors for columns
const COLUMN_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet  
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280', // Gray
  '#8b5a3c', // Brown
  '#dc2626', // Dark Red
];

// Color Picker Component
function ColorPicker({ selectedColor, onColorChange, onClose }: { 
  selectedColor: string; 
  onColorChange: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-12 left-0 z-50 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-6 gap-2 mb-3">
        {COLUMN_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              onColorChange(color);
              onClose();
            }}
            className={`w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-300' : ''
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-full px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        Schließen
      </button>
    </div>
  );
}

// New AddColumnItem component
interface AddColumnItemProps {
  onAddColumn: (title: string) => void;
}

function AddColumnItem({ onAddColumn }: AddColumnItemProps) {
  const { state } = useApp();
  const { i18n } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const accentColor = state.preferences.accentColor || '#f97316';

  const handleSubmit = () => {
    if (newTitle.trim()) {
      onAddColumn(newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewTitle('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 shadow-sm transition-all duration-300 animate-in slide-in-from-bottom-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)] }}
            />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
          }}
              className="flex-1 px-4 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
          placeholder={i18n.language === 'en' ? 'Enter column name...' : 'Spaltenname eingeben...'}
          autoFocus
        />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center space-x-1">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs font-mono">Enter</kbd>
                <span>speichern</span>
            <span>•</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs font-mono">Esc</kbd>
                <span>abbrechen</span>
          </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: newTitle.trim() ? accentColor : '#9ca3af' }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsAdding(true)}
      className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700/70 dark:hover:to-gray-800/70 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="text-center">
        <div 
          className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-white rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="w-6 h-6" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mb-2">
          {i18n.language === 'en' ? 'Add New Column' : 'Neue Spalte hinzufügen'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          {i18n.language === 'en' ? 'Click to create a new column' : 'Klicken um neue Spalte zu erstellen'}
        </p>
      </div>
    </div>
  );
}

function SortableColumnItem({
  column,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onColorChange,
  taskCount
}: SortableColumnItemProps) {
  const { state } = useApp();
  const { i18n } = useTranslation();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Generate colors from accent color
  const accentColor = state.preferences.accentColor || '#f97316';
  
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
      className={`group relative flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300 ${
        isDragging ? 'opacity-70 scale-105 shadow-2xl rotate-2 z-50' : 'hover:scale-[1.02]'
      }`}
    >
      {/* Drag Handle */}
                <div 
            {...attributes}
            {...listeners}
            data-drag-handle
        className="flex items-center justify-center w-10 h-10 mr-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
          >
        <GripVertical className="w-5 h-5" />
          </div>

      {/* Column Color Indicator */}
      <div className="relative mr-4">
        <button
          onClick={() => !isEditing && setShowColorPicker(!showColorPicker)}
          disabled={isEditing}
          className="w-6 h-6 rounded-full border-3 border-white dark:border-gray-800 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-default"
        style={{ backgroundColor: column.color || '#6b7280' }}
          title="Farbe ändern"
        />
        
        {showColorPicker && (
          <ColorPicker
            selectedColor={column.color || '#6b7280'}
            onColorChange={onColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>

      {/* Column Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
              placeholder={i18n.language === 'en' ? 'Enter column name...' : 'Spaltenname eingeben...'}
              autoFocus
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs font-mono">Enter</kbd>
                  <span>speichern</span>
                  <span>•</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs font-mono">Esc</kbd>
                  <span>abbrechen</span>
                </span>
              </div>
            
            <div className="flex items-center space-x-2">
                <button
                  onClick={onCancelEdit}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-500 hover:scale-105"
                >
                  <X className="w-4 h-4" />
                  <span>Abbrechen</span>
                </button>
                
              <button
                onClick={onSaveEdit}
                disabled={!editTitle.trim()}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: editTitle.trim() ? colors.success : '#9ca3af'
                }}
              >
                  <CheckCircle className="w-4 h-4" />
                <span>Speichern</span>
              </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate mb-1">
                {column.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                <span>{taskCount} {taskCount === 1 ? 'Aufgabe' : 'Aufgaben'}</span>
                {taskCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Aktiv
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ml-4 animate-in slide-in-from-right-2">
          <button
            onClick={onStartEdit}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-500 hover:scale-105"
            title="Spalte bearbeiten"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Bearbeiten</span>
          </button>
          <button
            onClick={onDelete}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: colors.danger
            }}
            title="Spalte löschen"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Löschen</span>
          </button>
        </div>
      )}
    </div>
  );
}


export function ColumnManager({ isOpen, onClose, projectId, projectTitle }: ColumnManagerProps) {
  const { state, dispatch } = useApp();
  const { i18n } = useTranslation();
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    columnId: '',
    columnTitle: ''
  });
  const [newlyAddedColumnId, setNewlyAddedColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate colors from accent color
  const accentColor = state.preferences.accentColor || '#f97316';

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

  // Get columns for this project
  const projectColumns = state.viewState.projectKanban.columns
    .filter(col => col.projectId === projectId)
    .sort((a, b) => a.order - b.order);

  const getTaskCountForColumn = (columnId: string) => {
    return state.tasks.filter(task => task.kanbanColumnId === columnId).length;
  };

  const handleStartEdit = (column: ProjectKanbanColumn) => {
    setEditingColumn(column.id);
    setEditTitle(column.title);
  };

  const handleSaveEdit = () => {
    if (editingColumn && editTitle.trim()) {
      dispatch({
        type: 'UPDATE_PROJECT_KANBAN_COLUMN',
        payload: {
          columnId: editingColumn,
          title: editTitle.trim()
        }
      });
    }
    setEditingColumn(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingColumn(null);
    setEditTitle('');
  };

  const handleColorChange = (columnId: string, color: string) => {
    const column = projectColumns.find(col => col.id === columnId);
    if (column) {
      dispatch({
        type: 'UPDATE_PROJECT_KANBAN_COLUMN',
        payload: {
          columnId: columnId,
          title: column.title,
          color: color
        }
      });
    }
  };

  const handleDeleteColumn = (column: ProjectKanbanColumn) => {
    setDeleteModal({
      isOpen: true,
      columnId: column.id,
      columnTitle: column.title
    });
  };

  const handleConfirmDelete = () => {
    if (projectColumns.length <= 1) {
      alert('Mindestens eine Spalte muss vorhanden bleiben. Ein Projekt ohne Spalten ist nicht möglich.');
      return;
    }

    dispatch({ type: 'DELETE_PROJECT_KANBAN_COLUMN', payload: deleteModal.columnId });
    setDeleteModal({ isOpen: false, columnId: '', columnTitle: '' });
  };

  const handleAddColumn = (title: string = 'Neue Spalte') => {
    // Generate a unique ID for the new column to track it
    const tempId = 'temp_' + Date.now();
    setNewlyAddedColumnId(tempId);
    
    // Get a random color for the new column
    const randomColor = COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)];
    
    dispatch({
      type: 'ADD_PROJECT_KANBAN_COLUMN',
      payload: {
        title: title,
        projectId: projectId,
        color: randomColor
      }
    });
  };

  const handleAddColumnClick = () => {
    handleAddColumn();
  };

  // Auto-edit newly added columns
  useEffect(() => {
    if (newlyAddedColumnId && projectColumns.length > 0) {
      // Find the newest column (by order - highest order number)
      const newestColumn = projectColumns
        .filter(col => col.projectId === projectId)
        .sort((a, b) => b.order - a.order)[0];
      
      if (newestColumn) {
        setEditingColumn(newestColumn.id);
        setEditTitle(newestColumn.title);
        setNewlyAddedColumnId(null);
      }
    }
  }, [projectColumns, newlyAddedColumnId, projectId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = projectColumns.findIndex(col => col.id === active.id);
      const newIndex = projectColumns.findIndex(col => col.id === over?.id);

      const reorderedColumns = arrayMove(projectColumns, oldIndex, newIndex);
      
      dispatch({
        type: 'REORDER_PROJECT_KANBAN_COLUMNS',
        payload: {
          projectId: projectId,
          columnIds: reorderedColumns.map(col => col.id)
        }
      });
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingColumn && !deleteModal.isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, editingColumn, deleteModal.isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !editingColumn && !deleteModal.isOpen) {
            onClose();
          }
        }}
      >
        <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          
          {/* Header */}
          <div className="relative p-8 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-2xl text-white shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <Columns className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Spalten organisieren
              </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {projectTitle} • {projectColumns.length} {projectColumns.length === 1 ? 'Spalte' : 'Spalten'}
              </p>
            </div>
              </div>
              
            <button
              onClick={onClose}
                disabled={editingColumn !== null}
                className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <X className="w-5 h-5" />
            </button>
            </div>
            
            {/* Progress indicator */}
            <div className="mt-6 flex items-center space-x-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min((projectColumns.length / 10) * 100, 100)}%`,
                    backgroundColor: accentColor 
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {projectColumns.length}/10
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {projectColumns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <Columns className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Keine Spalten vorhanden
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Erstellen Sie Ihre erste Spalte, um mit der Organisation Ihres Projekts zu beginnen.
                </p>
                <button
                  onClick={handleAddColumnClick}
                  className="flex items-center space-x-2 px-6 py-3 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Erste Spalte erstellen</span>
                </button>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="p-8 space-y-4">
                  <SortableContext 
                    items={projectColumns.map(col => col.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {projectColumns.map((column, index) => (
                      <div 
                        key={column.id}
                        className="animate-in slide-in-from-left-4 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <SortableColumnItem
                        column={column}
                        isEditing={editingColumn === column.id}
                        editTitle={editTitle}
                        onEditTitleChange={setEditTitle}
                        onStartEdit={() => handleStartEdit(column)}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onDelete={() => handleDeleteColumn(column)}
                          onColorChange={(color) => handleColorChange(column.id, color)}
                        taskCount={getTaskCountForColumn(column.id)}
                      />
                      </div>
                    ))}
                  </SortableContext>
                  
                  <div className="animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${projectColumns.length * 50}ms` }}>
                  <AddColumnItem onAddColumn={handleAddColumn} />
                  </div>
                </div>
              </DndContext>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{projectColumns.length}</span> von <span className="font-medium">10</span> Spalten verwendet
              </div>
              {projectColumns.length >= 8 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Limit fast erreicht</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-all duration-200 hover:scale-105"
              >
                Schließen
              </button>
              <button
                onClick={handleAddColumnClick}
                disabled={projectColumns.length >= 10}
                className="flex items-center space-x-2 px-6 py-3 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{ backgroundColor: projectColumns.length >= 10 ? '#9ca3af' : accentColor }}
              >
                <Plus className="w-5 h-5" />
                <span>Spalte hinzufügen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, columnId: '', columnTitle: '' })}
        onConfirm={handleConfirmDelete}
        title="Spalte löschen"
        message={`Möchten Sie die Spalte "${deleteModal.columnTitle}" wirklich löschen? Alle Aufgaben in dieser Spalte werden zur ersten verfügbaren Spalte verschoben.`}
        itemName={deleteModal.columnTitle}
        warningText="Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </>,
    document.body
  );
} 