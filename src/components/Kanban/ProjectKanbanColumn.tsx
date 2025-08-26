import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  GripVertical,
  Hash,
  Plus
} from 'lucide-react';
import { TaskCard } from '../Tasks/TaskCard';
import { SmartTaskInput } from '../Tasks/SmartTaskInput';
import { useApp } from '../../context/AppContext';
import type { Task, ProjectKanbanColumn as ProjectKanbanColumnType } from '../../types';

// Top Drop Zone component for inserting tasks at position 0 in Kanban columns
function TopDropZone({ columnId }: { columnId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${columnId}-top`,
    data: { type: 'column-top', columnId }
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-4 transition-all duration-200 -mx-2 mb-1 ${
        isOver 
          ? 'bg-gradient-to-r from-accent/20 to-accent/10 border-2 border-accent/50 border-dashed rounded-lg' 
          : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-lg'
      }`}
      style={{ 
        minHeight: '16px',
        position: 'relative'
      }}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs font-medium text-accent opacity-80">
            An oberster Position einfügen
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectKanbanColumnProps {
  column: ProjectKanbanColumnType;
  tasks: Task[];
  onEditColumn: (columnId: string, newTitle: string) => void;
  onDeleteColumn: (column: ProjectKanbanColumnType) => void;
  isEditing: boolean;
  editingTitle: string;
  onStartEdit: (columnId: string, title: string) => void;
  onCancelEdit: () => void;
  isDragging?: boolean;
  activeTask?: Task | null;
  projectId?: string;
}

export function ProjectKanbanColumn({
  column,
  tasks,
  onEditColumn,
  onDeleteColumn,
  isEditing,
  editingTitle,
  onStartEdit,
  onCancelEdit,
  isDragging = false,
  activeTask,
  projectId
}: ProjectKanbanColumnProps) {
  const { state, dispatch } = useApp();
  const { preferences } = state;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: column.id,
    disabled: isEditing
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const [showTaskInput, setShowTaskInput] = useState(false);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      onEditColumn(column.id, editingTitle);
    }
  };

  const handleAddTask = () => {
    if (!projectId) return;

    const newPosition = Math.max(...tasks.map(t => t.position), 0) + 1;
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: Task = {
      id: taskId,
      title: '',
      description: '',
      completed: false,
      priority: 'medium',
      estimatedTime: undefined,
      trackedTime: 0,
      tags: [],
      subtasks: [],
      columnId: undefined, // Für Projekt-Aufgaben wird columnId nicht verwendet
      projectId: projectId, // Automatische Zuordnung zum Projekt
      kanbanColumnId: column.id, // Zuordnung zur Projekt-Spalte
      position: newPosition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({
      type: 'ADD_TASK',
      payload: newTask
    });
  };

  const sortedTasks = tasks.sort((a, b) => a.position - b.position);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={(node) => {
        setSortableNodeRef(node);
        setDropNodeRef(node);
      }}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isOver ? `0 0 0 2px ${preferences.accentColor}50` : undefined
      }}
      className={`group w-80 p-4 transition-all duration-200 ${
        isMinimalDesign 
          ? 'bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700'
          : 'bg-gray-50 dark:bg-gray-700/50 rounded-lg'
      } ${
        isOver ? 'ring-2 ring-opacity-50' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 flex-1">
          <div 
            {...attributes}
            {...listeners}
            data-drag-handle
            className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-500 dark:hover:bg-gray-400 transition-colors"
          >
            <GripVertical className="w-3 h-3 text-white" />
          </div>
          
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onStartEdit(column.id, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
              />
              <button
                type="submit"
                className="p-1 text-green-600 hover:text-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancelEdit();
                }}
                className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {column.title}
            </h3>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
              {tasks.length}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTaskInput(!showTaskInput);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartEdit(column.id, column.title);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {!column.isDefault && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteColumn(column);
                }}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task Input */}
      {showTaskInput && (
        <div className="mb-4">
          <SmartTaskInput
            placeholder="Neue Aufgabe hinzufügen..."
            autoFocus={true}
            projectId={projectId}
            kanbanColumnId={column.id}
            onTaskCreated={() => {
              // Keep input open for next task like in planner
              // Don't close the input automatically
            }}
          />
        </div>
      )}

      {/* Tasks */}
      <div 
        className="space-y-2 min-h-[100px] hidden-scrollbar"
        style={{
          maxHeight: 'calc(100vh - 300px)', // Dynamic max height for kanban columns  
          overflowY: 'auto',
        }}
      >
        {/* Top Drop Zone for inserting at position 0 */}
        <TopDropZone columnId={column.id} />
        
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={activeTask?.id === task.id}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <div className="text-sm">Keine Aufgaben</div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddTask();
              }}
              className="mt-2 text-xs hover:opacity-80 transition-colors"
              style={{ color: preferences.accentColor }}
            >
              Erste Aufgabe hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 