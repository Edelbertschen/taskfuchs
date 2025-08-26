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
  Palette
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
import type { PinColumn } from '../../types';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';

interface PinColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SortablePinColumnItemProps {
  column: PinColumn;
  isEditing: boolean;
  editingTitle: string;
  onStartEdit: (columnId: string, title: string) => void;
  onSaveEdit: (columnId: string, title: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

function SortablePinColumnItem({ 
  column, 
  isEditing, 
  editingTitle, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onTitleChange, 
  onDeleteColumn 
}: SortablePinColumnItemProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit(column.id, editingTitle);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Column Title */}
          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => onSaveEdit(column.id, editingTitle)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Spaltentitel eingeben..."
              autoFocus
            />
          ) : (
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">{column.title}</h3>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {isEditing ? (
            <>
              <button
                onClick={() => onSaveEdit(column.id, editingTitle)}
                className="p-2 text-green-600 hover:text-green-700 transition-colors"
                title="Speichern"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Abbrechen"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onStartEdit(column.id, column.title)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Bearbeiten"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteColumn(column.id)}
                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PinColumnManager({ isOpen, onClose }: PinColumnManagerProps) {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<PinColumn | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.pinColumns.findIndex(col => col.id === active.id);
      const newIndex = state.pinColumns.findIndex(col => col.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedColumns = arrayMove(state.pinColumns, oldIndex, newIndex);
        
        // Update order property for each column
        const updatedColumns = reorderedColumns.map((column, index) => ({
          ...column,
          order: index,
          updatedAt: new Date().toISOString()
        }));

        // Dispatch individual updates to maintain data integrity
        updatedColumns.forEach(column => {
          dispatch({
            type: 'UPDATE_PIN_COLUMN',
            payload: column
          });
        });
      }
    }
  };

  const handleStartEdit = (columnId: string, title: string) => {
    setEditingColumnId(columnId);
    setEditingTitle(title);
  };

  const handleSaveEdit = (columnId: string, title: string) => {
    const finalTitle = title.trim();
    if (finalTitle) {
      const column = state.pinColumns.find(col => col.id === columnId);
      if (column) {
        dispatch({
          type: 'UPDATE_PIN_COLUMN',
          payload: {
            ...column,
            title: finalTitle,
            updatedAt: new Date().toISOString()
          }
        });
      }
    }
    setEditingColumnId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingColumnId(null);
    setEditingTitle('');
  };

  const handleAddColumn = () => {
    const newColumn: PinColumn = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: i18n.language === 'en' ? 'New Column' : 'Neue Spalte',
      order: state.pinColumns.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch({
      type: 'ADD_PIN_COLUMN',
      payload: newColumn
    });

    // Start editing the new column
    setEditingColumnId(newColumn.id);
    setEditingTitle(newColumn.title);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = state.pinColumns.find(col => col.id === columnId);
    if (column) {
      setColumnToDelete(column);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteColumn = () => {
    if (columnToDelete) {
      // Remove column
      dispatch({ type: 'DELETE_PIN_COLUMN', payload: columnToDelete.id });
      
      // Unpin all tasks from this column
      const updatedTasks = state.tasks.map(task => {
        if (task.pinColumnId === columnToDelete.id) {
          return {
            ...task,
            pinColumnId: undefined,
            pinned: false,
            updatedAt: new Date().toISOString()
          };
        }
        return task;
      });
      
      dispatch({
        type: 'SET_TASKS',
        payload: updatedTasks
      });
    }
    
    setShowDeleteModal(false);
    setColumnToDelete(null);
  };

  if (!isOpen) return null;

  const sortedColumns = [...state.pinColumns].sort((a, b) => a.order - b.order);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${state.preferences.accentColor}20` }}
            >
              <Columns 
                className="w-5 h-5"
                style={{ color: state.preferences.accentColor }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {i18n.language === 'en' ? 'Organize Pin Columns' : 'Pin-Spalten organisieren'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {i18n.language === 'en' 
                  ? 'Drag to reorder, click to edit titles'
                  : 'Ziehen zum Sortieren, Klicken zum Bearbeiten'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedColumns} strategy={verticalListSortingStrategy}>
              {sortedColumns.map((column) => (
                <SortablePinColumnItem
                  key={column.id}
                  column={column}
                  isEditing={editingColumnId === column.id}
                  editingTitle={editingTitle}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onTitleChange={setEditingTitle}
                  onDeleteColumn={handleDeleteColumn}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Column Button */}
          <button
            onClick={handleAddColumn}
            className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{i18n.language === 'en' ? 'Add new column' : 'Neue Spalte hinzufügen'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all font-medium"
          >
            {i18n.language === 'en' ? 'Done' : 'Fertig'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && columnToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteColumn}
          title={i18n.language === 'en' ? 'Delete Column' : 'Spalte löschen'}
          message={i18n.language === 'en' 
            ? `Are you sure you want to delete the column "${columnToDelete.title}"? All pinned tasks in this column will be unpinned.`
            : `Möchten Sie die Spalte "${columnToDelete.title}" wirklich löschen? Alle gepinnten Aufgaben in dieser Spalte werden entpinnt.`
          }
          itemName={columnToDelete.title}
          warningText={i18n.language === 'en' 
            ? 'This action cannot be undone.'
            : 'Diese Aktion kann nicht rückgängig gemacht werden.'
          }
        />
      )}
    </div>,
    document.body
  );
} 
 
 
 